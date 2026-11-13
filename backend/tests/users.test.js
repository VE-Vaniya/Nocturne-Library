const mongoose = require('mongoose');
const { app, request, createUser, makeFriends } = require('./helpers');
const User = require('../models/User');
const Book = require('../models/Book');
const Notification = require('../models/Notification');
const { sendNotificationEmail } = require('../services/emailService');

const addBook = (u, title, status = 'completed', extra = {}) =>
  Book.create({ userId: u.id, title, author: 'Someone', status, ...extra });

describe('PUT /api/users/me', () => {
  it('updates profile fields and never returns the password', async () => {
    const u = await createUser();
    const res = await request(app).put('/api/users/me').set(u.auth).send({
      fullName: ' Julian Blackwood ', username: 'j.black_wood', bio: 'Gothic novels.',
      avatar: 'https://example.com/a.png', sealColor: 'plum', email: 'hacker@example.com',
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({
      fullName: 'Julian Blackwood', username: 'j.black_wood', bio: 'Gothic novels.',
      avatar: 'https://example.com/a.png', sealColor: 'plum',
    }));
    expect(res.body.password).toBeUndefined();
    expect(res.body.email).toBe(u.user.email); // email is not updatable here
  });

  it('accepts a small data URL avatar and "" to clear', async () => {
    const u = await createUser();
    const avatar = `data:image/png;base64,${Buffer.from('png-bytes').toString('base64')}`;
    await request(app).put('/api/users/me').set(u.auth).send({ avatar }).expect(200);
    const res = await request(app).put('/api/users/me').set(u.auth).send({ avatar: '' });
    expect(res.status).toBe(200);
    expect(res.body.avatar).toBe('');
  });

  it.each([
    [{ username: 'Upper' }],
    [{ username: 'ab' }],
    [{ username: 'has space' }],
    [{ bio: 'x'.repeat(141) }],
    [{ sealColor: 'gold' }],
    [{ avatar: 'http://insecure.example/a.png' }],
    [{ avatar: 'javascript:alert(1)' }],
    [{ avatar: 'data:text/html;base64,PGgxPg==' }],
    [{ avatar: `data:image/png;base64,${'A'.repeat(2 * 1024 * 1024 * 4 / 3 + 8)}` }],
    [{ avatar: 42 }],
    [{ fullName: '' }],
  ])('rejects invalid input %#', async (body) => {
    const u = await createUser();
    const res = await request(app).put('/api/users/me').set(u.auth).send(body);
    expect(res.status).toBe(400);
    expect(res.body.message).toBeTruthy();
  });

  it('rejects a username taken by someone else (case-insensitive)', async () => {
    const a = await createUser({ username: 'taken_name' });
    const b = await createUser();
    const res = await request(app).put('/api/users/me').set(b.auth).send({ username: 'taken_name' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/taken/);
    await User.updateOne({ _id: a.id }, { username: 'Mixed_Case' });
    await request(app).put('/api/users/me').set(b.auth).send({ username: 'mixed_case' }).expect(400);
    // keeping your own username is fine
    await request(app).put('/api/users/me').set(a.auth).send({ username: 'mixed_case' }).expect(200);
  });

  it('legacy PUT /avatar validates and saves', async () => {
    const u = await createUser();
    await request(app).put('/api/users/avatar').set(u.auth).send({ avatar: 'ftp://x' }).expect(400);
    const res = await request(app).put('/api/users/avatar').set(u.auth).send({ avatar: 'https://x.example/a.png' });
    expect(res.status).toBe(200);
    expect((await User.findById(u.id)).avatar).toBe('https://x.example/a.png');
  });
});

describe('stats and reading sessions', () => {
  it('GET /stats counts books, quotes and friends', async () => {
    const a = await createUser();
    const b = await createUser();
    await makeFriends(a, b);
    await addBook(a, 'Dracula');
    await request(app).post('/api/quotes').set(a.auth).send({ text: 'Listen to them.' }).expect(201);
    const res = await request(app).get('/api/users/stats').set(a.auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ streak: 0, readingTimeSeconds: 0, books: 1, quotes: 1, friends: 1 });
  });

  it('starts, keeps, extends and resets the streak by UTC day', async () => {
    const u = await createUser();
    const log = (body) => request(app).put('/api/users/reading-stats').set(u.auth).send(body);
    const day = 24 * 60 * 60 * 1000;

    let res = await log({ elapsedSeconds: 600 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ streak: 1, readingTimeSeconds: 600 });

    // same day: unchanged
    res = await log({ elapsedSeconds: 60, pagesRead: 3 });
    expect(res.body).toEqual({ streak: 1, readingTimeSeconds: 660 });

    // last session yesterday with a 4-day streak -> 5
    await User.updateOne({ _id: u.id }, { lastReadDate: new Date(Date.now() - day), streak: 4 });
    res = await log({ elapsedSeconds: 30 });
    expect(res.body.streak).toBe(5);

    // stats show it while alive
    expect((await request(app).get('/api/users/stats').set(u.auth)).body.streak).toBe(5);

    // a gap of more than one day: stats show 0, next session restarts at 1
    await User.updateOne({ _id: u.id }, { lastReadDate: new Date(Date.now() - 3 * day), streak: 9 });
    expect((await request(app).get('/api/users/stats').set(u.auth)).body.streak).toBe(0);
    res = await log({ elapsedSeconds: 30 });
    expect(res.body.streak).toBe(1);
  });

  it('a zero-length session does not start a streak', async () => {
    const u = await createUser();
    const res = await request(app).put('/api/users/reading-stats').set(u.auth).send({ elapsedSeconds: 0 });
    expect(res.body).toEqual({ streak: 0, readingTimeSeconds: 0 });
  });

  it('works across consecutive days with fake timers', async () => {
    const u = await createUser();
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'queueMicrotask', 'performance', 'hrtime'] });
    try {
      const streaks = [];
      for (const d of ['2026-03-01T23:30:00Z', '2026-03-02T00:10:00Z', '2026-03-03T12:00:00Z', '2026-03-05T12:00:00Z']) {
        jest.setSystemTime(new Date(d));
        const res = await request(app).put('/api/users/reading-stats').set(u.auth).send({ elapsedSeconds: 60 });
        streaks.push(res.body.streak);
      }
      expect(streaks).toEqual([1, 2, 3, 1]);
    } finally {
      jest.useRealTimers();
    }
  });

  it('updates the book lastPageRead and lastRead', async () => {
    const u = await createUser();
    const book = await addBook(u, 'Dorian Gray', 'currently reading', { lastRead: new Date('2020-01-01') });
    await request(app).put('/api/users/reading-stats').set(u.auth)
      .send({ elapsedSeconds: 120, bookId: String(book._id), lastPageRead: 148 }).expect(200);
    const fresh = await Book.findById(book._id);
    expect(fresh.lastPageRead).toBe(148);
    expect(fresh.lastRead.getFullYear()).toBeGreaterThan(2020);
  });

  it('rejects bad input and books that are not yours', async () => {
    const u = await createUser();
    const other = await createUser();
    const theirs = await addBook(other, 'Not mine');
    const log = (body) => request(app).put('/api/users/reading-stats').set(u.auth).send(body);
    await log({}).expect(400);
    await log({ elapsedSeconds: -1 }).expect(400);
    await log({ elapsedSeconds: '60' }).expect(400);
    await log({ elapsedSeconds: 10, pagesRead: -2 }).expect(400);
    await log({ elapsedSeconds: 10, lastPageRead: 'x' }).expect(400);
    await log({ elapsedSeconds: 10, bookId: 'nope' }).expect(404);
    await log({ elapsedSeconds: 10, bookId: String(theirs._id) }).expect(404);
  });
});

describe('friends and connection requests', () => {
  it('GET /friends lists friends with their current book, no emails', async () => {
    const a = await createUser();
    const b = await createUser();
    const c = await createUser();
    await makeFriends(a, b);
    await makeFriends(a, c);
    await addBook(b, 'Old read', 'currently reading', { lastRead: new Date('2025-01-01') });
    await addBook(b, 'The Secret History', 'currently reading', { lastRead: new Date('2026-01-01') });
    await addBook(c, 'Finished', 'completed');

    const res = await request(app).get('/api/users/friends').set(a.auth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    const byId = Object.fromEntries(res.body.map((f) => [f._id, f]));
    expect(byId[b.id]).toEqual({ _id: b.id, username: b.user.username, fullName: b.user.fullName, avatar: '', currentlyReading: 'The Secret History' });
    expect(byId[c.id].currentlyReading).toBeNull();
    expect(JSON.stringify(res.body)).not.toMatch(/@example\.com/);
  });

  it('full request / accept flow', async () => {
    const a = await createUser();
    const b = await createUser();

    const sent = await request(app).post(`/api/users/connect/${b.id}`).set(a.auth);
    expect(sent.status).toBe(201);
    expect(sendNotificationEmail).toHaveBeenCalled();

    // duplicate in either direction
    await request(app).post(`/api/users/connect/${b.id}`).set(a.auth).expect(400);
    const reverse = await request(app).post(`/api/users/connect/${a.id}`).set(b.auth);
    expect(reverse.status).toBe(400);
    expect(reverse.body.message).toMatch(/already sent you/);

    const outgoing = await request(app).get('/api/users/requests/sent').set(a.auth);
    expect(outgoing.body).toHaveLength(1);
    expect(outgoing.body[0].recipientId.email).toBeUndefined();

    const feed = await request(app).get('/api/notifications').set(b.auth);
    expect(feed.body).toHaveLength(1);
    const note = feed.body[0];
    expect(note).toEqual(expect.objectContaining({ type: 'connection_request', status: 'pending', read: false, missive: null }));
    expect(note.from).toEqual({ _id: a.id, username: a.user.username, fullName: a.user.fullName, avatar: '' });

    // only the recipient may respond
    await request(app).put(`/api/notifications/${note._id}`).set(a.auth).send({ status: 'accepted' }).expect(404);

    const accepted = await request(app).put(`/api/notifications/${note._id}`).set(b.auth).send({ status: 'accepted' });
    expect(accepted.status).toBe(200);
    expect(accepted.body.notification).toEqual(expect.objectContaining({ status: 'accepted', read: true }));

    // cannot respond twice
    await request(app).put(`/api/notifications/${note._id}`).set(b.auth).send({ status: 'rejected' }).expect(404);

    expect((await User.findById(a.id)).connections.map(String)).toContain(b.id);
    expect((await User.findById(b.id)).connections.map(String)).toContain(a.id);

    const aFeed = await request(app).get('/api/notifications').set(a.auth);
    expect(aFeed.body[0]).toEqual(expect.objectContaining({ type: 'request_accepted', status: null }));
    expect(aFeed.body[0].from._id).toBe(b.id);

    // already friends
    const again = await request(app).post(`/api/users/connect/${b.id}`).set(a.auth);
    expect(again.status).toBe(400);
    expect(again.body.message).toMatch(/already friends/);

    // disconnect
    await request(app).delete(`/api/users/disconnect/${b.id}`).set(a.auth).expect(200);
    expect((await User.findById(b.id)).connections).toHaveLength(0);
    await request(app).delete('/api/users/disconnect/bad-id').set(a.auth).expect(400);
  });

  it('rejecting keeps the request as rejected', async () => {
    const a = await createUser();
    const b = await createUser();
    await request(app).post(`/api/users/connect/${b.id}`).set(a.auth).expect(201);
    const n = await Notification.findOne({ recipientId: b.id });
    const res = await request(app).put(`/api/notifications/${n._id}`).set(b.auth).send({ status: 'rejected' });
    expect(res.status).toBe(200);
    expect(res.body.notification.status).toBe('rejected');
    expect((await User.findById(a.id)).connections).toHaveLength(0);
  });

  it('validates respond input', async () => {
    const a = await createUser();
    await request(app).put('/api/notifications/abc').set(a.auth).send({ status: 'maybe' }).expect(400);
    await request(app).put('/api/notifications/abc').set(a.auth).send({ status: 'accepted' }).expect(404);
  });

  it('rejects self, unknown and invalid targets', async () => {
    const a = await createUser();
    await request(app).post(`/api/users/connect/${a.id}`).set(a.auth).expect(400);
    await request(app).post('/api/users/connect/not-an-id').set(a.auth).expect(400);
    await request(app).post(`/api/users/connect/${new mongoose.Types.ObjectId()}`).set(a.auth).expect(404);
  });

  it('DELETE /connect/:id cancels only my pending request', async () => {
    const a = await createUser();
    const b = await createUser();
    await request(app).post(`/api/users/connect/${b.id}`).set(a.auth).expect(201);
    // b cannot cancel a's request to b
    const other = await request(app).delete(`/api/users/connect/${a.id}`).set(b.auth);
    expect(other.body.cancelled).toBe(0);
    const res = await request(app).delete(`/api/users/connect/${b.id}`).set(a.auth);
    expect(res.status).toBe(200);
    expect(res.body.cancelled).toBe(1);
    expect(await Notification.countDocuments()).toBe(0);
    await request(app).delete('/api/users/connect/xyz').set(a.auth).expect(400);
  });
});

describe('people: suggestions and search', () => {
  it('ranks suggestions by books in common and excludes self and friends', async () => {
    const me = await createUser();
    const friend = await createUser();
    const two = await createUser({ fullName: 'Two Common' });
    const one = await createUser({ fullName: 'One Common' });
    const none = await createUser({ fullName: 'No Common' });
    await makeFriends(me, friend);

    await addBook(me, 'Dracula');
    await addBook(me, 'Jane Eyre');
    await addBook(friend, 'Dracula');
    await addBook(two, ' DRACULA ');
    await addBook(two, 'jane eyre');
    await addBook(two, 'Dracula'); // duplicate title counts once
    await addBook(one, 'Jane Eyre', 'currently reading');

    await request(app).post(`/api/users/connect/${me.id}`).set(one.auth).expect(201);
    await request(app).post(`/api/users/connect/${none.id}`).set(me.auth).expect(201);

    const res = await request(app).get('/api/users/suggestions').set(me.auth);
    expect(res.status).toBe(200);
    const ids = res.body.map((p) => p._id);
    expect(ids).not.toContain(me.id);
    expect(ids).not.toContain(friend.id);
    expect(ids.slice(0, 2)).toEqual([two.id, one.id]);
    expect(ids).toContain(none.id);

    const byId = Object.fromEntries(res.body.map((p) => [p._id, p]));
    expect(byId[two.id]).toEqual({
      _id: two.id, username: two.user.username, fullName: 'Two Common', avatar: '',
      booksInCommon: 2, currentlyReading: null, requestStatus: 'none',
    });
    expect(byId[one.id]).toEqual(expect.objectContaining({ booksInCommon: 1, currentlyReading: 'Jane Eyre', requestStatus: 'incoming' }));
    expect(byId[none.id]).toEqual(expect.objectContaining({ booksInCommon: 0, requestStatus: 'sent' }));
    expect(JSON.stringify(res.body)).not.toMatch(/email/);
  });

  it('caps suggestions at 12 and works without books', async () => {
    const me = await createUser();
    for (let i = 0; i < 14; i += 1) await createUser();
    const res = await request(app).get('/api/users/suggestions').set(me.auth);
    expect(res.body).toHaveLength(12);
  });

  it('searches by name or username, case-insensitive, regex-safe', async () => {
    const me = await createUser();
    const silas = await createUser({ fullName: 'Silas Ashgrove', username: 'silas_a' });
    await createUser({ fullName: 'Octavia Wren', username: 'owren' });
    const friend = await createUser({ fullName: 'Silas Friend' });
    await makeFriends(me, friend);
    await addBook(me, 'Rebecca');
    await addBook(silas, 'rebecca');

    let res = await request(app).get('/api/users/search?q=SILAS').set(me.auth);
    expect(res.status).toBe(200);
    expect(res.body.map((p) => p._id)).toEqual([silas.id]);
    expect(res.body[0]).toEqual(expect.objectContaining({ booksInCommon: 1, requestStatus: 'none', currentlyReading: null }));

    res = await request(app).get('/api/users/search?q=OWREN').set(me.auth);
    expect(res.body).toHaveLength(1);

    res = await request(app).get('/api/users/search?q=.*').set(me.auth);
    expect(res.body).toEqual([]);

    res = await request(app).get('/api/users/search').set(me.auth);
    expect(res.body).toEqual([]);

    await request(app).get(`/api/users/search?q=${'a'.repeat(65)}`).set(me.auth).expect(400);
  });

  it('legacy GET /api/users exposes no emails', async () => {
    const me = await createUser();
    await createUser();
    const res = await request(app).get('/api/users').set(me.auth);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].email).toBeUndefined();
  });
});
