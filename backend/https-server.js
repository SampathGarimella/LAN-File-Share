const fs = require('fs');
const path = require('path');
const https = require('https');
const app = require('./server');

const KEY_PATH = process.env.TLS_KEY || path.resolve(__dirname, 'certs/key.pem');
const CERT_PATH = process.env.TLS_CERT || path.resolve(__dirname, 'certs/cert.pem');
const PORT = Number(process.env.HTTPS_PORT || 3443);
const HOST = process.env.HOST || '0.0.0.0';

const key = fs.readFileSync(KEY_PATH);
const cert = fs.readFileSync(CERT_PATH);

const server = https.createServer({ key, cert }, app);

server.listen(PORT, HOST, () => {
  console.log(`LAN File Share HTTPS backend on https://${HOST}:${PORT}`);
});

server.requestTimeout = 0;
server.headersTimeout = 0;
server.keepAliveTimeout = 120000;


