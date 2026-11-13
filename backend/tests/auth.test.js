const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { app, request, createUser } = require('./helpers');
const User = require('../models/User');

describe('POST /api/auth/signup', () => {
  const valid = {
    fullName: 'Julian Blackwood',
    username: 'J_Blackwood',
    email: 'Julian@Example.com',
    password: 'nightfall-42',
  };

  it('creates a user and returns the auth payload', async () => {
    const res = await request(app).post('/api/auth/signup').send(valid);
    expect(res.status).toBe(201);
    expect(res.body).toEqual(
      expect.objectContaining({
        username: 'j_blackwood',
        fullName: 'Julian Blackwood',
        email: 'julian@example.com',
        avatar: '',
        bio: '',
      }),
    );
    expect(typeof res.body._id).toBe('string');
    expect(typeof res.body.token).toBe('string');
    expect(res.body.password).toBeUndefined();
    const stored = await User.findOne({ email: 'julian@example.com' });
    expect(stored.password).not.toBe(valid.password);
  });

  it.each([
    [{ ...valid, fullName: '' }, /required/],
    [{ ...valid, password: 'short' }, /Password/],
    [{ ...valid, email: 'not-an-email' }, /email/],
    [{ ...valid, username: 'a!' }, /Username/],
    [{ ...valid, fullName: 'x'.repeat(81) }, /Full name/],
  ])('rejects invalid input %#', async (body, msg) => {
    const res = await request(app).post('/api/auth/signup').send(body);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(msg);
  });

  it('rejects duplicate email and username', async () => {
    await request(app).post('/api/auth/signup').send(valid).expect(201);
    const dupEmail = await request(app)
      .post('/api/auth/signup')
      .send({ ...valid, username: 'other' });
    expect(dupEmail.status).toBe(400);
    expect(dupEmail.body.message).toMatch(/email/);
    const dupUser = await request(app)
      .post('/api/auth/signup')
      .send({ ...valid, email: 'x@example.com' });
    expect(dupUser.status).toBe(400);
    expect(dupUser.body.message).toMatch(/username/);
  });

  it('maps a unique-index race to 400', async () => {
    const spy = jest
      .spyOn(User, 'create')
      .mockRejectedValueOnce(
        Object.assign(new Error('dup'), { code: 11000, keyPattern: { username: 1 } }),
      );
    const res = await request(app).post('/api/auth/signup').send(valid);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/username/);
    spy.mockRestore();
  });

  it('returns 500 with a generic message on unexpected errors', async () => {
    const spy = jest.spyOn(User, 'create').mockRejectedValueOnce(new Error('boom'));
    const res = await request(app).post('/api/auth/signup').send(valid);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: 'Server error' });
    spy.mockRestore();
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials (case-insensitive email)', async () => {
    const u = await createUser({ email: 'login@example.com' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'LOGIN@example.com', password: u.password });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({ _id: u.id, email: 'login@example.com', bio: '', avatar: '' }),
    );
    expect(res.body.token).toBeTruthy();
  });

  it('rejects wrong password and unknown user with 401', async () => {
    const u = await createUser({ email: 'login2@example.com' });
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'login2@example.com', password: 'wrong-password' })
      .expect(401);
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: u.password })
      .expect(401);
  });

  it('requires email and password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.co' });
    expect(res.status).toBe(400);
  });

  it('rejects malformed JSON with 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{bad');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/JSON/);
  });
});

describe('protect middleware', () => {
  it('rejects requests without a token', async () => {
    const res = await request(app).get('/api/auth/profile');
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/no token/);
  });

  it('rejects a bare "Bearer " header', async () => {
    const res = await request(app).get('/api/auth/profile').set('Authorization', 'Bearer ');
    expect(res.status).toBe(401);
  });

  it('rejects an invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', 'Bearer not.a.jwt');
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/token failed/);
  });

  it('rejects a token for a deleted user', async () => {
    const token = jwt.sign(
      { id: new mongoose.Types.ObjectId().toString() },
      process.env.JWT_SECRET,
    );
    const res = await request(app).get('/api/auth/profile').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/user not found/);
  });

  it('protects every non-auth API route', async () => {
    const routes = [
      ['get', '/api/books'],
      ['get', '/api/quotes'],
      ['get', '/api/users/stats'],
      ['get', '/api/users/friends'],
      ['get', '/api/notifications'],
      ['get', '/api/missives'],
      ['get', '/api/search?q=x'],
      ['get', '/api/search/suggestions'],
      ['put', '/api/users/me'],
    ];
    for (const [method, url] of routes) {
      const res = await request(app)[method](url);
      expect(res.status).toBe(401);
    }
  });
});

describe('GET /api/auth/profile', () => {
  it('returns the user without password, with profile fields', async () => {
    const u = await createUser();
    const res = await request(app).get('/api/auth/profile').set(u.auth);
    expect(res.status).toBe(200);
    expect(res.body.password).toBeUndefined();
    expect(res.body).toEqual(
      expect.objectContaining({ _id: u.id, bio: '', avatar: '', sealColor: 'oxblood' }),
    );
    expect(res.body.createdAt).toBeTruthy();
  });
});

describe('PUT /api/auth/change-password', () => {
  it('changes the password', async () => {
    const u = await createUser({ email: 'pw@example.com' });
    await request(app)
      .put('/api/auth/change-password')
      .set(u.auth)
      .send({ currentPassword: u.password, newPassword: 'brand-new-pass' })
      .expect(200);
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'pw@example.com', password: 'brand-new-pass' })
      .expect(200);
  });

  it('rejects a wrong current password and short new password', async () => {
    const u = await createUser();
    await request(app)
      .put('/api/auth/change-password')
      .set(u.auth)
      .send({ currentPassword: 'nope-nope-nope', newPassword: 'brand-new-pass' })
      .expect(401);
    await request(app)
      .put('/api/auth/change-password')
      .set(u.auth)
      .send({ currentPassword: u.password, newPassword: 'short' })
      .expect(400);
    await request(app).put('/api/auth/change-password').set(u.auth).send({}).expect(400);
  });
});
