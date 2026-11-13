const mongoose = require('mongoose');
const { app, request, createUser, makeFriends } = require('./helpers');
const Missive = require('../models/Missive');
const Notification = require('../models/Notification');
const Quote = require('../models/Quote');
const { sendNotificationEmail } = require('../services/emailService');

const quote = {
  text: 'Last night I dreamt I went to Manderley again.',
  author: 'Daphne du Maurier',
  bookTitle: 'Rebecca',
  page: 'p. 1',
};

describe('POST /api/quotes/share', () => {
  it('shares with several friends: one missive + notification each', async () => {
    const me = await createUser();
    const a = await createUser();
    const b = await createUser();
    await makeFriends(me, a);
    await makeFriends(me, b);

    const res = await request(app)
      .post('/api/quotes/share')
      .set(me.auth)
      .send({ ...quote, recipientIds: [a.id, b.id, a.id], message: 'Thought of you' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ sent: 2 });
    expect(await Missive.countDocuments({ kind: 'quote' })).toBe(2);
    expect(await Notification.countDocuments({ type: 'quote_shared' })).toBe(2);
    expect(sendNotificationEmail).toHaveBeenCalledTimes(2);
    // sender email is never sent to recipients
    for (const call of sendNotificationEmail.mock.calls)
      expect(call.join(' ')).not.toContain(me.user.email);

    const feed = await request(app).get('/api/notifications').set(a.auth);
    expect(feed.body[0]).toEqual(
      expect.objectContaining({ type: 'quote_shared', status: null, read: false }),
    );
    expect(feed.body[0].from._id).toBe(me.id);
    expect(feed.body[0].missive).toEqual(
      expect.objectContaining({
        kind: 'quote',
        text: quote.text,
        author: quote.author,
        bookTitle: 'Rebecca',
        page: 'p. 1',
        message: 'Thought of you',
        body: '',
        saved: false,
      }),
    );
  });

  it('accepts the legacy recipientId field', async () => {
    const me = await createUser();
    const a = await createUser();
    await makeFriends(me, a);
    const res = await request(app)
      .post('/api/quotes/share')
      .set(me.auth)
      .send({ ...quote, recipientId: a.id });
    expect(res.body).toEqual({ sent: 1 });
  });

  it('returns 403 if any recipient is not a friend and creates nothing', async () => {
    const me = await createUser();
    const friend = await createUser();
    const stranger = await createUser();
    await makeFriends(me, friend);
    const res = await request(app)
      .post('/api/quotes/share')
      .set(me.auth)
      .send({ ...quote, recipientIds: [friend.id, stranger.id] });
    expect(res.status).toBe(403);
    expect(await Missive.countDocuments()).toBe(0);
  });

  it('returns 403 when a friend account no longer exists', async () => {
    const me = await createUser();
    const ghost = new mongoose.Types.ObjectId().toString();
    await makeFriends(me, { id: ghost });
    await request(app)
      .post('/api/quotes/share')
      .set(me.auth)
      .send({ ...quote, recipientIds: [ghost] })
      .expect(403);
  });

  it('validates the payload', async () => {
    const me = await createUser();
    const a = await createUser();
    await makeFriends(me, a);
    const share = (body) => request(app).post('/api/quotes/share').set(me.auth).send(body);
    await share({ ...quote, recipientIds: [] }).expect(400);
    await share({ ...quote }).expect(400);
    await share({
      ...quote,
      recipientIds: Array.from({ length: 21 }, () => new mongoose.Types.ObjectId().toString()),
    }).expect(400);
    await share({ ...quote, recipientIds: ['bad'] }).expect(400);
    await share({ recipientIds: [a.id], text: '' }).expect(400);
    await share({ ...quote, recipientIds: [a.id], message: 'x'.repeat(501) }).expect(400);
    await share({ ...quote, recipientIds: [a.id], message: 5 }).expect(400);
  });

  it('does not fail the request when email fails', async () => {
    const me = await createUser();
    const a = await createUser();
    await makeFriends(me, a);
    sendNotificationEmail.mockRejectedValueOnce(new Error('smtp down'));
    const res = await request(app)
      .post('/api/quotes/share')
      .set(me.auth)
      .send({ ...quote, recipientIds: [a.id] });
    expect(res.status).toBe(200);
  });
});

describe('letters and missives', () => {
  it('sends a letter to a friend and lists received missives', async () => {
    const me = await createUser();
    const a = await createUser();
    await makeFriends(me, a);

    const res = await request(app)
      .post('/api/missives')
      .set(me.auth)
      .send({ recipientId: a.id, body: '  Your turn: what next?  ' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual(
      expect.objectContaining({ kind: 'letter', body: 'Your turn: what next?', saved: false }),
    );
    expect(res.body.from._id).toBe(me.id);

    const inbox = await request(app).get('/api/missives').set(a.auth);
    expect(inbox.body).toHaveLength(1);
    expect(inbox.body[0]).toEqual(
      expect.objectContaining({ kind: 'letter', body: 'Your turn: what next?' }),
    );
    expect(inbox.body[0].from).toEqual({
      _id: me.id,
      username: me.user.username,
      fullName: me.user.fullName,
      avatar: '',
    });
    expect((await request(app).get('/api/missives').set(me.auth)).body).toEqual([]);

    const feed = await request(app).get('/api/notifications').set(a.auth);
    expect(feed.body[0]).toEqual(expect.objectContaining({ type: 'letter', status: null }));
    expect(feed.body[0].missive).toEqual(
      expect.objectContaining({ kind: 'letter', body: 'Your turn: what next?', text: '' }),
    );
  });

  it('validates letters', async () => {
    const me = await createUser();
    const a = await createUser();
    const stranger = await createUser();
    await makeFriends(me, a);
    const send = (body) => request(app).post('/api/missives').set(me.auth).send(body);
    await send({ recipientId: 'x', body: 'hi' }).expect(400);
    await send({ recipientId: a.id, body: '   ' }).expect(400);
    await send({ recipientId: a.id, body: 'x'.repeat(2001) }).expect(400);
    await send({ recipientId: stranger.id, body: 'hi' }).expect(403);
    const ghost = new mongoose.Types.ObjectId().toString();
    await makeFriends(me, { id: ghost });
    await send({ recipientId: ghost, body: 'hi' }).expect(403);
  });

  it('saves a shared quote idempotently, only for its recipient', async () => {
    const me = await createUser();
    const a = await createUser();
    await makeFriends(me, a);
    await request(app)
      .post('/api/quotes/share')
      .set(me.auth)
      .send({ ...quote, recipientIds: [a.id] })
      .expect(200);
    const missive = await Missive.findOne({ recipientId: a.id });

    await request(app).post(`/api/missives/${missive._id}/save`).set(me.auth).expect(404);
    await request(app).post('/api/missives/bad/save').set(a.auth).expect(404);

    const first = await request(app).post(`/api/missives/${missive._id}/save`).set(a.auth);
    expect(first.status).toBe(201);
    expect(first.body).toEqual(
      expect.objectContaining({ text: quote.text, page: 'p. 1', ownerId: a.id }),
    );

    const second = await request(app).post(`/api/missives/${missive._id}/save`).set(a.auth);
    expect(second.status).toBe(200);
    expect(second.body._id).toBe(first.body._id);
    expect(await Quote.countDocuments({ ownerId: a.id })).toBe(1);

    const feed = await request(app).get('/api/notifications').set(a.auth);
    expect(feed.body[0].missive.saved).toBe(true);

    // if the saved quote was deleted, saving again creates a fresh copy
    await request(app).delete(`/api/quotes/${first.body._id}`).set(a.auth).expect(200);
    const third = await request(app).post(`/api/missives/${missive._id}/save`).set(a.auth);
    expect(third.status).toBe(201);
    expect(third.body._id).not.toBe(first.body._id);
  });

  it('handles a concurrent save race', async () => {
    const me = await createUser();
    const a = await createUser();
    await makeFriends(me, a);
    await request(app)
      .post('/api/quotes/share')
      .set(me.auth)
      .send({ ...quote, recipientIds: [a.id] })
      .expect(200);
    const missive = await Missive.findOne({ recipientId: a.id });

    const results = await Promise.all(
      [1, 2, 3].map(() => request(app).post(`/api/missives/${missive._id}/save`).set(a.auth)),
    );
    const ids = new Set(results.map((r) => r.body._id));
    expect(ids.size).toBe(1);
    expect(await Quote.countDocuments({ ownerId: a.id })).toBe(1);
  });

  it('letters cannot be saved as quotes', async () => {
    const me = await createUser();
    const a = await createUser();
    await makeFriends(me, a);
    const letter = await request(app)
      .post('/api/missives')
      .set(me.auth)
      .send({ recipientId: a.id, body: 'hello' });
    await request(app).post(`/api/missives/${letter.body._id}/save`).set(a.auth).expect(404);
  });
});

describe('notifications read state', () => {
  it('marks one and all as read, recipient only', async () => {
    const me = await createUser();
    const a = await createUser();
    await makeFriends(me, a);
    await request(app)
      .post('/api/quotes/share')
      .set(me.auth)
      .send({ ...quote, recipientIds: [a.id] });
    await request(app).post('/api/missives').set(me.auth).send({ recipientId: a.id, body: 'hi' });

    const feed = await request(app).get('/api/notifications').set(a.auth);
    expect(feed.body).toHaveLength(2);
    expect(feed.body[0].type).toBe('letter'); // newest first
    const [first] = feed.body;

    await request(app).put(`/api/notifications/${first._id}/read`).set(me.auth).expect(404);
    await request(app).put('/api/notifications/bad/read').set(a.auth).expect(404);
    const one = await request(app).put(`/api/notifications/${first._id}/read`).set(a.auth);
    expect(one.status).toBe(200);
    expect(one.body).toEqual(expect.objectContaining({ _id: first._id, read: true }));

    const all = await request(app).put('/api/notifications/read-all').set(a.auth);
    expect(all.body).toEqual({ updated: 1 });
    const after = await request(app).get('/api/notifications').set(a.auth);
    expect(after.body.every((n) => n.read)).toBe(true);
  });

  it('normalizes legacy notifications', async () => {
    const a = await createUser();
    await Notification.collection.insertOne({
      recipientId: new mongoose.Types.ObjectId(a.id),
      type: 'quote_shared',
      status: 'pending',
      createdAt: new Date(),
    });
    await Notification.collection.insertOne({
      recipientId: new mongoose.Types.ObjectId(a.id),
      type: 'system_alert',
      createdAt: new Date(),
    });
    const feed = await request(app).get('/api/notifications').set(a.auth);
    expect(feed.body).toHaveLength(1);
    expect(feed.body[0]).toEqual(
      expect.objectContaining({ status: null, read: false, from: null, missive: null }),
    );
  });
});
