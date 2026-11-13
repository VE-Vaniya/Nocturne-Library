/**
 * Nocturne Library API client (axios).
 *
 * Every exported function resolves to the response BODY (res.data), not the axios response.
 * Errors reject with the axios error; use errorMessage(err) for a human-readable string.
 *
 * Session: localStorage['nocturne_session'] = JSON { token, user }.
 * A 401 on an authenticated request clears the session and reloads to the sign-in gate.
 */
import axios from 'axios';

export const SESSION_KEY = 'nocturne_session';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: API_URL });

// ── session helpers ──────────────────────────────────────────────
export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const s = raw ? JSON.parse(raw) : null;
    return s && s.token ? s : null;
  } catch {
    return null;
  }
}
export function saveSession(session) {
  try {
    if (session && session.token) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // storage unavailable (private mode); the session just won't persist
  }
}
export function clearSession() {
  saveSession(null);
}

// Drop keys written by the pre-redesign build.
try {
  localStorage.removeItem('nocturne_logged_in_user');
  localStorage.removeItem('nocturne_users');
} catch {
  // ignore
}

api.interceptors.request.use((config) => {
  const s = loadSession();
  if (s?.token) config.headers.Authorization = `Bearer ${s.token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const hadAuth = !!error?.config?.headers?.Authorization;
    const isAuthCall = /\/auth\/(login|signup|change-password)/.test(error?.config?.url || '');
    if (status === 401 && hadAuth && !isAuthCall) {
      clearSession();
      window.location.reload();
    }
    return Promise.reject(error);
  },
);

const data = (p) => p.then((r) => r.data);

/** Best human-readable message from an API error. */
export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  const m = err?.response?.data?.message || err?.response?.data?.error;
  if (m) return String(m);
  if (err?.code === 'ERR_NETWORK') return 'The library is unreachable right now.';
  return fallback;
}

// ── auth ─────────────────────────────────────────────────────────
/** body: { fullName, username, email, password } → { _id, username, fullName, email, token, ... } */
export const signup = (body) => data(api.post('/auth/signup', body));
/** body: { email, password } → { _id, username, fullName, email, avatar, token, ... } */
export const login = (body) => data(api.post('/auth/login', body));
/** → user profile { _id, fullName, username, email, bio, avatar, sealColor, createdAt, ... } */
export const getProfile = () => data(api.get('/auth/profile'));
/** body: { currentPassword, newPassword } */
export const changePassword = (body) => data(api.put('/auth/change-password', body));

// ── users ────────────────────────────────────────────────────────
/** body: any of { fullName, username, bio, avatar (data URL | ''), sealColor } → updated user */
export const updateMe = (body) => data(api.put('/users/me', body));
/** → { streak, readingTimeSeconds, books, quotes, friends } */
export const getStats = () => data(api.get('/users/stats'));
/** body: e.g. { seconds, pagesRead, bookId } */
export const updateReadingStats = (body) => data(api.put('/users/reading-stats', body));
/** → [{ _id, username, fullName, avatar, currentlyReading }] */
export const getFriends = () => data(api.get('/users/friends'));
export const removeFriend = (id) => data(api.delete(`/users/disconnect/${id}`));
/** → [{ _id, username, fullName, avatar, booksInCommon, currentlyReading, requestStatus }] */
export const getSuggestions = () => data(api.get('/users/suggestions'));
export const searchPeople = (q) => data(api.get('/users/search', { params: { q } }));
export const connect = (id) => data(api.post(`/users/connect/${id}`));
export const cancelConnect = (id) => data(api.delete(`/users/connect/${id}`));

// ── books ────────────────────────────────────────────────────────
export const getBooks = () => data(api.get('/books'));
/** body: { title, author, genre?, status?, coverImage?, moodTags?, lastPageRead?, totalPages? } */
export const addBook = (body) => data(api.post('/books', body));
export const updateBook = (id, body) => data(api.put(`/books/${id}`, body));
export const deleteBook = (id) => data(api.delete(`/books/${id}`));

// ── quotes ───────────────────────────────────────────────────────
export const getQuotes = () => data(api.get('/quotes'));
/** body: { text, author?, bookTitle?, page? } */
export const addQuote = (body) => data(api.post('/quotes', body));
export const deleteQuote = (id) => data(api.delete(`/quotes/${id}`));
/** { text, author, bookTitle, page, recipientIds: string[], message } */
export const shareQuote = ({ text, author, bookTitle, page, recipientIds, message }) =>
  data(api.post('/quotes/share', { text, author, bookTitle, page, recipientIds, message }));

// ── missives (letters) ───────────────────────────────────────────
export const sendLetter = ({ recipientId, body }) => data(api.post('/missives', { recipientId, body }));
/** Save a shared quote missive into my quotes. */
export const saveMissive = (id) => data(api.post(`/missives/${id}/save`));

// ── notifications ────────────────────────────────────────────────
/** → [{ _id, type, status, read, createdAt, from:{_id, fullName, username, avatar}, missive }] */
export const getNotifications = () => data(api.get('/notifications'));
export const markRead = (id) => data(api.put(`/notifications/${id}/read`));
export const markAllRead = () => data(api.put('/notifications/read-all'));
/** status: 'accepted' | 'rejected' (connection requests) */
export const respond = (id, status) => data(api.put(`/notifications/${id}`, { status }));

// ── search ───────────────────────────────────────────────────────
export const searchBooks = (q) => data(api.get('/search', { params: { q } }));
export const getBookSuggestions = () => data(api.get('/search/suggestions'));

export default api;
