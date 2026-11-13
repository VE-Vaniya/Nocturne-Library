import axios from 'axios';

// Same-origin '/api' by default (Vite dev proxy / reverse proxy in prod);
// set VITE_API_URL at build time to point at a different API host.
const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use(
  (config) => {
    const user = JSON.parse(localStorage.getItem('nocturne_logged_in_user'));
    if (user && user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authService = {
  signup: (userData) => api.post('/auth/signup', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getProfile: () => api.get('/auth/profile'),
  changePassword: (passwords) => api.put('/auth/change-password', passwords),
};

export const userService = {
  getUsers: () => api.get('/users'),
  getSentRequests: () => api.get('/users/requests/sent'),
  connect: (id) => api.post(`/users/connect/${id}`),
  updateAvatar: (avatar) => api.put('/users/avatar', { avatar }),
  cancelConnect: (id) => api.delete(`/users/connect/${id}`),
  disconnect: (id) => api.delete(`/users/disconnect/${id}`),
  updateReadingStats: (stats) => api.put('/users/reading-stats', stats),
};

export const notificationService = {
  getNotifications: () => api.get('/notifications'),
  respond: (id, status) => api.put(`/notifications/${id}`, { status }),
};

export const quoteService = {
  getQuotes: () => api.get('/quotes'),
  addQuote: (quoteData) => api.post('/quotes', quoteData),
  deleteQuote: (id) => api.delete(`/quotes/${id}`),
  share: (shareData) => api.post('/quotes/share', shareData),
};

export const bookService = {
  getBooks: () => api.get('/books'),
  addBook: (bookData) => api.post('/books', bookData),
  updateBook: (id, bookData) => api.put(`/books/${id}`, bookData),
  deleteBook: (id) => api.delete(`/books/${id}`),
};

export const missiveService = {
  getMissives: () => api.get('/missives'),
};

export const searchService = {
  searchBooks: (query) => api.get(`/search?q=${encodeURIComponent(query)}`),
};

export default api;
