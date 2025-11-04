const request = require('supertest');
const app = require('../server');

describe('LAN File Share API', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /bootstrap redirects with ?api', async () => {
    const res = await request(app).get('/bootstrap');
    expect([301, 302, 307, 308]).toContain(res.status);
    expect(res.headers.location).toMatch(/\?api=http/);
  });

  it('GET /boot-qr returns a PNG image', async () => {
    const res = await request(app).get('/boot-qr');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('image/png');
    expect(Number(res.headers['content-length'] || 0)).toBeGreaterThan(0);
  });

  it('POST /upload then GET /share/:id streams the file', async () => {
    const content = 'hello world';
    const upload = await request(app)
      .post('/upload')
      .attach('file', Buffer.from(content, 'utf8'), 'test.txt');

    expect(upload.status).toBe(200);
    expect(upload.body).toHaveProperty('id');
    expect(upload.body).toHaveProperty('shareUrl');

    const { id } = upload.body;
    const download = await request(app).get(`/share/${id}`).buffer(true);
    expect(download.status).toBe(200);
    expect(download.headers['content-disposition']).toMatch(/attachment/);
    const buf = Buffer.isBuffer(download.body)
      ? download.body
      : Buffer.from(download.text || '', 'utf8');
    expect(buf.toString()).toBe(content);
  });
});


