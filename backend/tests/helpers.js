const request = require('supertest');
const app = require('../app');
const User = require('../models/User');

let counter = 0;

// Create a user through the API and return {user, token, auth}.
const createUser = async (overrides = {}) => {
  counter += 1;
  const body = {
    fullName: `Reader ${counter}`,
    username: `reader${counter}_${Math.random().toString(36).slice(2, 6)}`,
    email: `reader${counter}_${Math.random().toString(36).slice(2, 6)}@example.com`,
    password: 'correct-horse-1',
    ...overrides,
  };
  const res = await request(app).post('/api/auth/signup').send(body);
  if (res.status !== 201) throw new Error(`signup failed: ${res.status} ${JSON.stringify(res.body)}`);
  return {
    user: res.body,
    id: res.body._id,
    token: res.body.token,
    auth: { Authorization: `Bearer ${res.body.token}` },
    password: body.password,
  };
};

const makeFriends = async (a, b) => {
  await User.updateOne({ _id: a.id }, { $addToSet: { connections: b.id } });
  await User.updateOne({ _id: b.id }, { $addToSet: { connections: a.id } });
};

module.exports = { app, request, createUser, makeFriends };
