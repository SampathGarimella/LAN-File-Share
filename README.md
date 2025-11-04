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

## Usage Flow

1. Start the backend on your LAN computer (`node backend/server.js`).
2. Deploy the frontend to Netlify and open your public URL.
3. In the UI, set Backend URL to your LAN IP (e.g., `http://192.168.1.10:3000`) and click Save.
4. Choose a file and click Upload.
5. The app returns a share link (e.g., `http://192.168.1.10:3000/share/<id>`) and displays a QR code.
6. Any device on the same Wi‑Fi can open the link/QR to download at LAN speeds.

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
