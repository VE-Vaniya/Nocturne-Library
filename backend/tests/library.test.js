const mongoose = require('mongoose');
const { app, request, createUser } = require('./helpers');
const Book = require('../models/Book');

describe('books CRUD', () => {
  it('creates, lists, updates and deletes own books', async () => {
    const u = await createUser();
    const created = await request(app).post('/api/books').set(u.auth).send({
      title: 'Dracula',
      author: 'Bram Stoker',
      genre: 'Gothic',
      totalPages: 418,
      coverImage: 'data:image/png;base64,AAAA',
      userId: new mongoose.Types.ObjectId().toString(),
    });
    expect(created.status).toBe(201);
    expect(created.body).toEqual(
      expect.objectContaining({
        title: 'Dracula',
        status: 'wishlist',
        totalPages: 418,
        lastPageRead: 0,
        userId: u.id,
        coverImage: 'data:image/png;base64,AAAA',
      }),
    );

    const list = await request(app).get('/api/books').set(u.auth);
    expect(list.body).toHaveLength(1);

    const id = created.body._id;
    const updated = await request(app).put(`/api/books/${id}`).set(u.auth).send({
      status: 'currently reading',
      totalPages: 420,
      lastPageRead: 12,
      userId: new mongoose.Types.ObjectId().toString(),
      bogus: 1,
    });
    expect(updated.status).toBe(200);
    expect(updated.body).toEqual(
      expect.objectContaining({
        status: 'currently reading',
        totalPages: 420,
        lastPageRead: 12,
        userId: u.id,
      }),
    );
    expect(updated.body.bogus).toBeUndefined();

    await request(app).delete(`/api/books/${id}`).set(u.auth).expect(200);
    expect(await Book.countDocuments()).toBe(0);
  });

  it('validates input', async () => {
    const u = await createUser();
    await request(app).post('/api/books').set(u.auth).send({ title: 'No author' }).expect(400);
    const bad = await request(app)
      .post('/api/books')
      .set(u.auth)
      .send({ title: 'T', author: 'A', status: 'reading' });
    expect(bad.status).toBe(400);
    const b = await request(app).post('/api/books').set(u.auth).send({ title: 'T', author: 'A' });
    await request(app)
      .put(`/api/books/${b.body._id}`)
      .set(u.auth)
      .send({ status: 'nope' })
      .expect(400);
    await request(app)
      .put(`/api/books/${b.body._id}`)
      .set(u.auth)
      .send({ totalPages: 'many' })
      .expect(400);
  });

  it('hides other users books (404)', async () => {
    const owner = await createUser();
    const other = await createUser();
    const b = await request(app)
      .post('/api/books')
      .set(owner.auth)
      .send({ title: 'Mine', author: 'Me' });
    await request(app)
      .put(`/api/books/${b.body._id}`)
      .set(other.auth)
      .send({ title: 'Stolen' })
      .expect(404);
    await request(app).delete(`/api/books/${b.body._id}`).set(other.auth).expect(404);
    await request(app).delete('/api/books/not-an-id').set(other.auth).expect(404);
    expect((await request(app).get('/api/books').set(other.auth)).body).toEqual([]);
    expect((await Book.findById(b.body._id)).title).toBe('Mine');
  });
});

describe('quotes CRUD', () => {
  it('creates with page and bookId, lists and deletes', async () => {
    const u = await createUser();
    const book = await request(app)
      .post('/api/books')
      .set(u.auth)
      .send({ title: 'Jane Eyre', author: 'Charlotte Brontë' });
    const q = await request(app).post('/api/quotes').set(u.auth).send({
      text: '  I am no bird.  ',
      author: 'Charlotte Brontë',
      bookTitle: 'Jane Eyre',
      page: 'p. 318',
      bookId: book.body._id,
    });
    expect(q.status).toBe(201);
    expect(q.body).toEqual(
      expect.objectContaining({
        text: 'I am no bird.',
        page: 'p. 318',
        bookId: book.body._id,
        ownerId: u.id,
      }),
    );

    const num = await request(app)
      .post('/api/quotes')
      .set(u.auth)
      .send({ text: 'Numbered', page: 12 });
    expect(num.body.page).toBe('12');

    const list = await request(app).get('/api/quotes').set(u.auth);
    expect(list.body).toHaveLength(2);

    await request(app).delete(`/api/quotes/${q.body._id}`).set(u.auth).expect(200);
    expect((await request(app).get('/api/quotes').set(u.auth)).body).toHaveLength(1);
  });

  it('validates quotes and ownership', async () => {
    const u = await createUser();
    const other = await createUser();
    const theirBook = await request(app)
      .post('/api/books')
      .set(other.auth)
      .send({ title: 'X', author: 'Y' });
    await request(app).post('/api/quotes').set(u.auth).send({}).expect(400);
    await request(app)
      .post('/api/quotes')
      .set(u.auth)
      .send({ text: 'x'.repeat(2001) })
      .expect(400);
    await request(app)
      .post('/api/quotes')
      .set(u.auth)
      .send({ text: 'ok', author: { $gt: '' } })
      .expect(400);
    await request(app)
      .post('/api/quotes')
      .set(u.auth)
      .send({ text: 'ok', bookId: theirBook.body._id })
      .expect(400);
    await request(app)
      .post('/api/quotes')
      .set(u.auth)
      .send({ text: 'ok', bookId: 'nope' })
      .expect(400);

    const q = await request(app).post('/api/quotes').set(other.auth).send({ text: 'theirs' });
    await request(app).delete(`/api/quotes/${q.body._id}`).set(u.auth).expect(404);
    await request(app).delete('/api/quotes/bad').set(u.auth).expect(404);
  });
});
