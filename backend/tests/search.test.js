jest.mock('axios');
const axios = require('axios');
const { app, request, createUser } = require('./helpers');
const Book = require('../models/Book');
const { FALLBACK_SUGGESTIONS } = require('../controllers/searchController');

const item = (id, title, extra = {}) => ({
  id,
  volumeInfo: {
    title,
    authors: ['Wilkie Collins'],
    categories: ['Fiction'],
    publishedDate: '1868-01-01',
    imageLinks: { thumbnail: `http://books.example/${id}.jpg` },
    ...extra,
  },
});

afterEach(() => {
  process.env.GOOGLE_BOOKS_API_KEY = '';
});

describe('GET /api/search', () => {
  it('maps Google Books results with a 5s timeout', async () => {
    const u = await createUser();
    axios.get.mockResolvedValueOnce({ data: { items: [item('a', 'The Moonstone'), { id: 'b', volumeInfo: {} }] } });
    process.env.GOOGLE_BOOKS_API_KEY = 'k';
    const res = await request(app).get('/api/search?q=moonstone').set(u.auth);
    expect(res.status).toBe(200);
    expect(res.body[0]).toEqual(expect.objectContaining({
      id: 'a', title: 'The Moonstone', author: 'Wilkie Collins', genre: 'Fiction', image: 'https://books.example/a.jpg',
    }));
    expect(res.body[1]).toEqual(expect.objectContaining({ title: 'Unknown Title', author: 'Unknown Author', image: null }));
    const [, opts] = axios.get.mock.calls[0];
    expect(opts.timeout).toBe(5000);
    expect(opts.params).toEqual(expect.objectContaining({ q: 'moonstone', key: 'k' }));
  });

  it('returns [] when there are no items or upstream fails', async () => {
    const u = await createUser();
    axios.get.mockResolvedValueOnce({ data: {} });
    expect((await request(app).get('/api/search?q=zzz').set(u.auth)).body).toEqual([]);
    axios.get.mockRejectedValueOnce(new Error('timeout of 5000ms exceeded'));
    const res = await request(app).get('/api/search?q=zzz').set(u.auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('requires a sane query', async () => {
    const u = await createUser();
    await request(app).get('/api/search').set(u.auth).expect(400);
    await request(app).get(`/api/search?q=${'a'.repeat(201)}`).set(u.auth).expect(400);
  });
});

describe('GET /api/search/suggestions', () => {
  it('falls back to classics when the user has no books', async () => {
    const u = await createUser();
    const res = await request(app).get('/api/search/suggestions').set(u.auth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(8);
    expect(res.body[0]).toEqual({ id: expect.any(String), title: expect.any(String), author: expect.any(String), year: expect.any(String), image: null, reason: expect.any(String) });
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('derives suggestions from the most common author and genre, excluding owned books', async () => {
    const u = await createUser();
    await Book.create([
      { userId: u.id, title: 'The Woman in White', author: 'Wilkie Collins', genre: 'Mystery' },
      { userId: u.id, title: 'Armadale', author: 'Wilkie Collins', genre: 'Mystery' },
      { userId: u.id, title: 'Dracula', author: 'Bram Stoker', genre: 'General' },
    ]);
    axios.get.mockImplementation(async (url, { params }) => {
      if (params.q.startsWith('inauthor:')) {
        return { data: { items: [item('m', 'The Moonstone'), item('w', 'the woman in white'), item('n', 'No Name', { imageLinks: undefined })] } };
      }
      return { data: { items: [item('m', 'The Moonstone'), item('l', 'Lady Audley\'s Secret', { authors: undefined, publishedDate: undefined })] } };
    });

    const res = await request(app).get('/api/search/suggestions').set(u.auth);
    expect(res.status).toBe(200);
    const ids = res.body.map((s) => s.id);
    expect(ids).toEqual(['m', 'l', 'n']);
    expect(res.body[0]).toEqual({ id: 'm', title: 'The Moonstone', author: 'Wilkie Collins', year: '1868', image: 'https://books.example/m.jpg', reason: 'more Wilkie Collins' });
    expect(res.body[1]).toEqual(expect.objectContaining({ author: 'Unknown Author', year: '', reason: 'because you read mystery' }));
    expect(res.body[2].image).toBeNull();
    const queries = axios.get.mock.calls.map(([, o]) => o.params.q);
    expect(queries).toEqual(['inauthor:"Wilkie Collins"', 'subject:"Mystery"']);
    axios.get.mockReset();
  });

  it('falls back when upstream fails, filtering owned classics', async () => {
    const u = await createUser();
    await Book.create({ userId: u.id, title: 'Dracula', author: 'Bram Stoker', genre: 'Horror' });
    axios.get.mockRejectedValue(new Error('down'));
    const res = await request(app).get('/api/search/suggestions').set(u.auth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(FALLBACK_SUGGESTIONS.length - 1);
    expect(res.body.map((s) => s.title)).not.toContain('Dracula');
    axios.get.mockReset();
  });

  it('falls back when books have no author/genre signal', async () => {
    const u = await createUser();
    await Book.collection.insertOne({ userId: new (require('mongoose').Types.ObjectId)(u.id), title: 'Untitled' });
    const res = await request(app).get('/api/search/suggestions').set(u.auth);
    expect(res.body).toHaveLength(8);
    expect(axios.get).not.toHaveBeenCalled();
  });
});
