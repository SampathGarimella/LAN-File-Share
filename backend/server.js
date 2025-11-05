const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://your-site.netlify.app';
const UPLOAD_DIR = path.resolve(__dirname, 'uploads');

function ensureUploadsDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
ensureUploadsDir();

function getLanIpv4() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}
const LAN_IP = getLanIpv4();

app.use(cors());
app.use((req, res, next) => {
  res.setHeader('X-Powered-By', 'LAN File Share');
  next();
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const id = uuidv4();
    req.fileId = id;
    cb(null, id);
  }
});

const upload = multer({ storage });

function getShareBaseUrl(req) {
  if (process.env.PUBLIC_BASE_URL) {
    return process.env.PUBLIC_BASE_URL.replace(/\/+$/, '');
  }
  if (LAN_IP) {
    return `http://${LAN_IP}:${PORT}`;
  }
  const host = req.headers.host || `localhost:${PORT}`;
  return `http://${host}`;
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', port: PORT, host: HOST, lanIp: LAN_IP });
});

app.get('/info', (req, res) => {
  res.json({
    baseUrl: getShareBaseUrl(req),
    lanIp: LAN_IP,
    port: PORT,
    uploadsDir: UPLOAD_DIR
  });
});

// Redirect to frontend with prefilled ?api=<baseUrl>
app.get('/bootstrap', (req, res) => {
  const base = getShareBaseUrl(req);
  const url = `${FRONTEND_URL}?api=${encodeURIComponent(base)}`;
  res.redirect(url);
});

app.get('/boot-qr', async (req, res) => {
  try {
    const base = getShareBaseUrl(req);
    const url = `${FRONTEND_URL}?api=${encodeURIComponent(base)}`;
    const png = await QRCode.toBuffer(url, { width: 320, margin: 1 });
    res.setHeader('Content-Type', 'image/png');
    res.send(png);
  } catch (e) {
    console.error('QR generation error:', e);
    res.status(500).json({ error: 'QR failed' });
  }
});

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const id = req.fileId || req.file.filename;
    const meta = {
      id,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      uploadedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
    const metaPath = path.join(UPLOAD_DIR, `${id}.meta.json`);
    await fsp.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf8');

    const shareUrl = `${getShareBaseUrl(req)}/share/${id}`;
    res.json({ id, shareUrl, expiresAt: meta.expiresAt });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.get('/share/:id', async (req, res) => {
  const id = req.params.id;
  const filePath = path.join(UPLOAD_DIR, id);
  const metaPath = path.join(UPLOAD_DIR, `${id}.meta.json`);
  try {
    const metaRaw = await fsp.readFile(metaPath, 'utf8');
    const meta = JSON.parse(metaRaw);
    const expired = Date.now() > Date.parse(meta.expiresAt);
    if (expired) {
      res.status(410).json({ error: 'Link expired' });
      return;
    }

    const originalName = (meta.originalName || 'download').replace(/[\r\n"]/g, '_');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);

    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      console.error('Stream error:', err);
      res.status(404).json({ error: 'File not found' });
    });
    stream.pipe(res);
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.status(404).json({ error: 'Not found' });
    } else {
      console.error('Share error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
});

async function cleanupExpired() {
  try {
    const entries = await fsp.readdir(UPLOAD_DIR);
    const metaFiles = entries.filter((f) => f.endsWith('.meta.json'));
    const now = Date.now();
    for (const metaFile of metaFiles) {
      try {
        const metaRaw = await fsp.readFile(path.join(UPLOAD_DIR, metaFile), 'utf8');
        const meta = JSON.parse(metaRaw);
        const expiresAt = Date.parse(meta.expiresAt);
        if (!Number.isNaN(expiresAt) && now > expiresAt) {
          const fileId = meta.id;
          const fPath = path.join(UPLOAD_DIR, fileId);
          const mPath = path.join(UPLOAD_DIR, `${fileId}.meta.json`);
          await Promise.allSettled([
            fsp.unlink(fPath),
            fsp.unlink(mPath)
          ]);
          console.log(`Cleaned expired file: ${fileId}`);
        }
      } catch (err) {
        console.warn('Cleanup read error:', metaFile, err.message);
      }
    }
  } catch (err) {
    console.error('Cleanup error:', err);
  }
}

setInterval(cleanupExpired, 60 * 60 * 1000);
cleanupExpired();

let server = null;
if (!process.env.DISABLE_HTTP) {
  server = app.listen(PORT, HOST, () => {
    const base = `http://${LAN_IP || 'localhost'}:${PORT}`;
    const pairing = `${FRONTEND_URL}?api=${encodeURIComponent(base)}`;
    console.log(`LAN File Share backend on ${base}`);
    console.log(`Pairing URL: ${pairing}`);
    console.log(`Bootstrap: ${base}/bootstrap`);
    console.log(`QR: ${base}/boot-qr`);
  });
  server.requestTimeout = 0;
  server.headersTimeout = 0;
  server.keepAliveTimeout = 120000;
}

module.exports = app;


