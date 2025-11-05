# LAN File Share — Hybrid Local Network File Sharing (Frontend + Backend)

A complete hybrid LAN-based file sharing application.

- Frontend: React + Vite (deploy to Netlify)
- Backend: Node.js + Express (runs locally in your LAN)
- Upload huge files (tested pattern supports very large sizes, up to multi‑TB) without loading them fully in memory
- Share link + QR code for instant downloads on phones over the same Wi‑Fi
- 24‑hour auto‑expiry with hourly cleanup

---

## Architecture

- Frontend (Netlify): Static React app that calls your local backend using `VITE_API_URL`.
- Backend (LAN): Express server with streaming downloads, `multer` disk storage, and hourly cleanup.

Endpoints:

- `POST /upload` — upload a file; returns `{ id, shareUrl, expiresAt }`
- `GET /share/:id` — streams file to the client with `Content-Disposition: attachment` header
- `GET /health` — simple health check
- `GET /info` — helpful base URL and LAN IP info
- `GET /bootstrap` — redirects to your frontend with `?api=<baseUrl>` prefilled
- `GET /boot-qr` — PNG QR for the same pairing URL

---

## Folder Structure

```
copy-paste-text-file-tool-app/
├── backend/
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── ENV.example             # Copy to .env locally; set VITE_API_URL
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       └── styles.css
└── README.md
```

---

## Backend — Run Locally on LAN

Requirements:

- Node.js 18+ recommended

Setup & run:

```bash
cd backend
npm install
npm start
# Server listens on 0.0.0.0:3000 and stores files in backend/uploads
```

Optional environment variables:

- `PORT` (default `3000`)
- `HOST` (default `0.0.0.0`)
- `PUBLIC_BASE_URL` (e.g., `http://192.168.1.10:3000`) — overrides auto-detected LAN IP in returned share links

Notes:

- Uploads are stored on disk with a UUID filename and sidecar metadata `{id}.meta.json` containing `expiresAt` (24h).
- Hourly cleanup removes expired files and metadata.
- Downloads use streaming (`fs.createReadStream`) to support very large files efficiently.

Finding your LAN IP (examples):

- macOS: `ipconfig getifaddr en0` (Wi‑Fi) or `ipconfig getifaddr en1` (Ethernet)
- Linux: `hostname -I` or `ip addr`
- Windows: `ipconfig` (find IPv4 Address for your active adapter)

---

## Frontend — React + Vite (Deploy to Netlify)

Requirements:

- Node.js 18+ recommended

Local development:

```bash
cd frontend
cp ENV.example .env   # edit VITE_API_URL with your LAN backend, e.g. http://192.168.1.10:3000
npm install
npm run dev
```

Production build:

```bash
npm run build
# Outputs to frontend/dist
```

Netlify deployment options:

- Option A: Drag-and-drop `frontend/dist` into Netlify deploys
- Option B: Connect the repo and set a build command + environment var
  - Build command: `npm run build`
  - Publish directory: `frontend/dist`
  - Environment variable: `VITE_API_URL` = `http://<your-lan-ip>:3000`

At runtime, the app also lets users change and save the Backend URL in the UI. This helps when people forget the IP.

Pairing helpers (easiest onboarding):

- Share `http://<lan-ip>:3000/bootstrap` — it opens your Netlify site with the Backend URL prefilled.
- Or display/scan `http://<lan-ip>:3000/boot-qr` — a QR that opens the same prefilled link.
- Frontend also accepts `?api=<baseUrl>` manually.

---

## Local Development Setup

Quick start for local development (both frontend and backend on your machine):

### Prerequisites

- Node.js 18+ installed
- Both `backend` and `frontend` folders present

### Step 1: Start Backend (HTTP mode)

Open a terminal and run:

```bash
cd backend
npm install
PORT=3200 HOST=127.0.0.1 node server.js
```

You should see:
```
LAN File Share backend on http://127.0.0.1:3200
```

Test it: Open `http://127.0.0.1:3200/health` in your browser — should return `{"status":"ok",...}`

### Step 2: Start Frontend (Vite dev server)

Open a **second terminal** and run:

```bash
cd frontend
npm install
npm run dev -- --host
```

Vite will start on `http://127.0.0.1:5173` (or next available port).

### Step 3: Pair Frontend with Backend

Open your browser to:

```
http://127.0.0.1:5173/?api=http://127.0.0.1:3200
```

The app will:
1. Read `?api=http://127.0.0.1:3200` from the URL
2. Store it in `localStorage`
3. Hide the backend URL input field (since it's preconfigured)
4. Allow you to upload files immediately

### Step 4: Test Upload & Download

1. Click "Choose File" and select any file
2. Click "Upload"
3. You'll see a share link like `http://127.0.0.1:3200/share/<id>`
4. Copy the link or scan the QR code
5. Open the link in another tab/window → file downloads

### How It Works Locally

- **Backend**: Stores files in `backend/uploads/` with UUID filenames
- **Metadata**: Each file has a `.meta.json` sidecar with expiration (24h)
- **Cleanup**: Runs hourly to remove expired files
- **Streaming**: Large files are streamed (not loaded into memory)

### Local Development Tips

- **Change backend port**: Set `PORT=4000` when starting backend
- **Change frontend port**: Vite auto-detects; or set in `vite.config.js`
- **Auto-reload**: Frontend hot-reloads on code changes (Vite)
- **Backend restart**: Restart `node server.js` after backend code changes
- **Persist backend URL**: Once paired, refresh the page — it remembers from `localStorage`

### Troubleshooting Local Setup

| Issue | Solution |
|-------|----------|
| Backend not starting | Check if port is in use: `lsof -iTCP:3200` |
| Frontend can't connect | Verify backend is running: `curl http://127.0.0.1:3200/health` |
| Upload fails | Check browser console for CORS errors (shouldn't happen locally) |
| Files not appearing | Check `backend/uploads/` directory exists and is writable |

### Local HTTPS Mode (optional)

To test HTTPS locally (matching Netlify setup):

1. Generate certs:
   ```bash
   cd backend
   mkdir -p certs
   mkcert -key-file certs/key.pem -cert-file certs/cert.pem localhost 127.0.0.1
   ```

2. Start HTTPS backend:
   ```bash
   DISABLE_HTTP=1 \
   FRONTEND_URL=http://127.0.0.1:5173 \
   PUBLIC_BASE_URL=https://127.0.0.1:3443 \
   HTTPS_PORT=3443 \
   npm run start:https
   ```

3. Open frontend with: `http://127.0.0.1:5173/?api=https://127.0.0.1:3443`

4. Trust the certificate when browser prompts (mkcert installs CA automatically on macOS)

---

## Testing

Backend API tests use Jest and Supertest.

```bash
cd backend
npm install
npm test
```

Covered checks:

- `GET /health` returns status
- `GET /bootstrap` issues a redirect with `?api=`
- `GET /boot-qr` returns a PNG image
- `POST /upload` then `GET /share/:id` streams the uploaded content

Uploads created during tests are small and stored under `backend/uploads`.

---

## Using with Netlify (HTTPS backend recommended)

Netlify serves your frontend over HTTPS. Browsers block requests from HTTPS → HTTP.

Use an HTTPS backend on the LAN:

1. Generate a local certificate (mkcert example on macOS):
   ```bash
   brew install mkcert nss
   mkcert -install
   mkdir -p backend/certs
   # Include hostnames or IPs you will use
   mkcert -key-file backend/certs/key.pem -cert-file backend/certs/cert.pem "lan-share.local" 192.168.1.10
   ```
2. Start HTTPS server (HTTP disabled):
   ```bash
   cd backend
   DISABLE_HTTP=1 \
   FRONTEND_URL=https://<your-site>.netlify.app \
   PUBLIC_BASE_URL=https://lan-share.local:3443 \
   HTTPS_PORT=3443 \
   npm run start:https
   ```
3. Pair the frontend with the backend (any of):
   - Open: `https://<your-site>.netlify.app/?api=https://lan-share.local:3443`
   - Or visit: `http://<lan-ip>:3000/bootstrap` (redirects to your Netlify site with `?api=`)
   - Or scan: `http://<lan-ip>:3000/boot-qr`

Note: clients must trust the certificate authority you used (mkcert installs it on the host; other devices may need additional trust steps).

---

## Automatic pairing on Netlify (no manual entry)

This repository includes a Netlify Function that injects the backend URL automatically.

Files:

- `frontend/netlify/functions/auto-pair.js`
- `frontend/netlify.toml`

What it does:

- Requests to `/` are routed to the function which redirects to `/?api=<API_BASE_URL>`
- The frontend reads and stores `?api=`, so users don’t enter anything.

Netlify settings:

- Base directory: `frontend`
- Build command: `npm run build` (or `npm ci && npm run build`)
- Publish directory: `dist`
- Functions directory: `frontend/netlify/functions`
- Environment variables:
  - `API_BASE_URL` = `https://lan-share.local:3443` (or `https://<LAN-IP>:3443`)
  - `NODE_VERSION` = `18`

Backend settings:

- Start HTTPS backend and set:
  - `FRONTEND_URL=https://<your-site>.netlify.app`
  - `PUBLIC_BASE_URL=https://lan-share.local:3443`

After deploy, opening the site root will auto-pair and no manual backend entry is needed.

---

## Usage Flow

1. Start the backend on your LAN computer (`node backend/server.js`).
2. Deploy the frontend to Netlify and open your public URL.
3. In the UI, set Backend URL to your LAN IP (e.g., `http://192.168.1.10:3000`) and click Save.
4. Choose a file and click Upload.
5. The app returns a share link (e.g., `http://192.168.1.10:3000/share/<id>`) and displays a QR code.
6. Any device on the same Wi‑Fi can open the link/QR to download at LAN speeds.

---

## End‑User Guide (what users will see)

Requirements:

- Be on the same Wi‑Fi/LAN as the computer running the file server.
- Use the site link you’re given (for example: `https://temp-files.netlify.app`).

Steps:

1. Open the site link.
2. The app tries to pair with the local server automatically.
   - If paired, the input field hides. You can upload immediately.
   - If not paired, you’ll see a small helper panel:
     - “Try lan-share.local (HTTPS)” — use this if your IT or laptop advertises the server name on the LAN.
     - “Your LAN IP (e.g., 192.168.1.10) → Use IP on 3443” — type the server’s IP and click the button.
     - “Open” — opens the server address in a new tab so you can trust/allow the connection if your browser asks.
3. Choose a file and click “Upload”.
4. You’ll get a share link and a QR code. Share either with others on the same Wi‑Fi.
5. Links expire automatically after 24 hours.

Troubleshooting:

- “Local server not reachable”: Make sure you’re on the same Wi‑Fi as the server. Click “Open” and allow/continue if the browser asks about the connection; then click “Save” again.
- If the server name doesn’t work, try the IP address with port 3443 (for example `https://192.168.1.10:3443`).
- If you still can’t connect, ask the person hosting the server for the correct address or scan their QR pairing code.

Privacy note:

- Files move only inside your local network. The website itself is hosted on Netlify, but uploads and downloads are served by your local server.

---

## Pain Points & Solutions

| Pain Point                             | Solution                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------- |
| Upload fails if internet not available | The frontend shows a clear message: “Local server not reachable — connect to same Wi‑Fi.”   |
| Browser timeouts on huge files         | Downloads are streamed; you can later upgrade to resumable chunked uploads (tus) if needed. |
| Storage fills up                       | Hourly cleanup removes files after 24 hours.                                                |
| Users forget backend IP                | The frontend exposes a Backend URL field (also persisted to localStorage).                  |
| Mobile access                          | QR code provided for instant open on phones.                                                |

---

## Security & Operational Notes

- This is a LAN tool by design; do not expose the backend to the public internet without additional controls.
- Ensure your filesystem has enough space for large uploads.
- Consider dedicated storage disks for very large files (multi‑TB).

---

## Testing Across Devices

- Confirm all devices are on the same Wi‑Fi/LAN as the backend machine.
- From a second device, open the share link or scan the QR code; the file should download immediately.
- Verify the link stops working after ~24 hours (or run the cleanup job manually by waiting or restarting the server, which triggers cleanup on boot).

---

## Optional Future Upgrades

- Resumable/chunked uploads (e.g., tus protocol) for unstable networks and ultra‑large files.
- Authentication and access control for shared links.
- Per‑link TTL configuration and manual revoke.
- Simple front‑end health indicator that pings `/health`.

---

## Expected Output (When Done)

- Backend running on LAN (`node backend/server.js`) serving uploads and streaming downloads.
- Frontend deployed on Netlify (public URL) and pointing to LAN backend via `VITE_API_URL`.
- Share link + QR visible after upload; transfers at LAN speeds; auto‑expire after 24 hours.

---

## Quick Commands Recap

```bash
# Create folders (already present in this repo)
mkdir -p backend frontend

# Backend
cd backend
npm install
npm start

# Frontend
cd ../frontend
cp ENV.example .env   # set VITE_API_URL=http://<lan-ip>:3000
npm install
npm run build
# Deploy the generated dist/ to Netlify
```
