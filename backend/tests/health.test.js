const mongoose = require('mongoose');
const { app, request } = require('./helpers');
const { readiness } = require('../routes/healthRoutes');

describe('health endpoints', () => {
  it('GET /health is a liveness probe', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/health reports DB readiness', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ status: 'ok', db: 'connected' }));
  });

  it('readiness returns 503 when the DB is disconnected', () => {
    let isolatedReadiness;
    jest.isolateModules(() => {
      jest.doMock('mongoose', () => ({ connection: { readyState: 0 } }));
      isolatedReadiness = require('../routes/healthRoutes').readiness;
    });
    jest.dontMock('mongoose');
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    isolatedReadiness({}, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ db: 'disconnected' }));
    // the real module reports connected
    const ok = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    readiness({}, ok);
    expect(ok.status).toHaveBeenCalledWith(mongoose.connection.readyState === 1 ? 200 : 503);
  });

  it('GET / responds and unknown API routes are JSON 404s', async () => {
    await request(app).get('/').expect(200);
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Not found' });
  });

  it('applies the CORS allow-list', async () => {
    const ok = await request(app).get('/').set('Origin', 'http://localhost:5173');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    const bad = await request(app).get('/').set('Origin', 'https://evil.example');
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
  });
});
