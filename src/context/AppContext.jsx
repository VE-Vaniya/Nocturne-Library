/* eslint-disable react-refresh/only-export-components -- context module: provider + hook + constants */
/**
 * App-wide state. useApp() returns:
 * {
 *   user, setUser(userOrUpdater),           // signed-in profile (null when signed out)
 *   stats, refreshStats(),                  // { streak, readingTimeSeconds, books, quotes, friends }
 *   books, refreshBooks(),
 *   quotes, refreshQuotes(),
 *   friends, refreshFriends(),
 *   notifications, refreshNotifications(),
 *   go(pageName),                           // 'home'|'shelves'|'find'|'quotes'|'timer'|'profile'
 *   toast(message),
 *   openModal(node, { onClose? }), closeModal(),
 *   currentBook,                            // most recent 'currently reading' book or null
 *   // shell extras:
 *   page, signIn(session), signOut(), modal, toastState
 * }
 * Every refreshX() returns a promise resolving to the fresh data (or the previous value on error).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as api from '../services/api.js';

export const PAGES = ['home', 'shelves', 'find', 'quotes', 'timer', 'profile'];

const AppContext = createContext(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp() must be used inside <AppProvider>');
  return ctx;
}

const EMPTY_STATS = { streak: 0, readingTimeSeconds: 0, books: 0, quotes: 0, friends: 0 };
const asList = (x) => (Array.isArray(x) ? x : []);
const when = (b) => new Date(b?.lastRead || b?.updatedAt || b?.createdAt || 0).getTime() || 0;

export function AppProvider({ children }) {
  const [user, setUserState] = useState(() => api.loadSession()?.user || null);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [books, setBooks] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [friends, setFriends] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState('home');
  const [modal, setModal] = useState(null); // { node, onClose, key }
  const [toastState, setToastState] = useState(null); // { message, key }
  const toastTimer = useRef(null);
  const modalRef = useRef(null);
  useEffect(() => {
    modalRef.current = modal;
  }, [modal]);
  const signedIn = !!user;

  // ── user ──
  const setUser = useCallback((next) => {
    setUserState((prev) => {
      const u = typeof next === 'function' ? next(prev) : next;
      const s = api.loadSession();
      if (s && u) api.saveSession({ ...s, user: u });
      return u;
    });
  }, []);

  // ── data loaders ──
  const loaders = useMemo(() => {
    const make = (fn, set, map = (x) => x) => async () => {
      if (!api.loadSession()) return undefined;
      try {
        const v = map(await fn());
        set(v);
        return v;
      } catch (err) {
        if (import.meta.env.DEV) console.warn('[nocturne] load failed:', err?.message);
        return undefined;
      }
    };
    return {
      stats: make(api.getStats, setStats, (s) => ({ ...EMPTY_STATS, ...(s || {}) })),
      books: make(api.getBooks, setBooks, asList),
      quotes: make(api.getQuotes, setQuotes, asList),
      friends: make(api.getFriends, setFriends, asList),
      notifications: make(api.getNotifications, setNotifications, asList),
      profile: make(api.getProfile, setUser),
    };
  }, [setUser]);
  const {
    stats: refreshStats,
    books: refreshBooks,
    quotes: refreshQuotes,
    friends: refreshFriends,
    notifications: refreshNotifications,
    profile: refreshProfile,
  } = loaders;

  useEffect(() => {
    if (!signedIn) return undefined;
    refreshProfile();
    refreshStats();
    refreshBooks();
    refreshQuotes();
    refreshFriends();
    refreshNotifications();
    const id = setInterval(refreshNotifications, 30000);
    const onFocus = () => refreshNotifications();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [signedIn, refreshProfile, refreshStats, refreshBooks, refreshQuotes, refreshFriends, refreshNotifications]);

  // ── navigation ──
  const go = useCallback((name) => {
    if (PAGES.includes(name)) setPage(name);
  }, []);

  // ── toast ──
  const toast = useCallback((message) => {
    clearTimeout(toastTimer.current);
    setToastState((t) => ({ message: String(message), key: (t?.key || 0) + 1 }));
    toastTimer.current = setTimeout(() => setToastState(null), 2800);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // ── modal host ──
  const closeModal = useCallback(() => {
    const m = modalRef.current;
    setModal(null);
    if (m?.onClose) m.onClose();
  }, []);
  const openModal = useCallback((node, opts = {}) => {
    setModal((m) => ({ node, onClose: opts.onClose, key: (m?.key || 0) + 1 }));
  }, []);

  // ── session ──
  const signIn = useCallback((session) => {
    const { token, ...u } = session || {};
    if (!token) return;
    api.saveSession({ token, user: u });
    setPage('home');
    setUserState(u);
  }, []);
  const signOut = useCallback(() => {
    api.clearSession();
    setModal(null);
    setUserState(null);
    setStats(EMPTY_STATS);
    setBooks([]);
    setQuotes([]);
    setFriends([]);
    setNotifications([]);
  }, []);

  const currentBook = useMemo(() => {
    const reading = books.filter((b) => b?.status === 'currently reading');
    if (!reading.length) return null;
    return reading.reduce((a, b) => (when(b) > when(a) ? b : a));
  }, [books]);

  const value = useMemo(
    () => ({
      user, setUser,
      stats, refreshStats,
      books, refreshBooks,
      quotes, refreshQuotes,
      friends, refreshFriends,
      notifications, refreshNotifications,
      go, toast, openModal, closeModal,
      currentBook,
      page, signIn, signOut, modal, toastState,
    }),
    [user, setUser, stats, refreshStats, books, refreshBooks, quotes, refreshQuotes, friends, refreshFriends,
      notifications, refreshNotifications, go, toast, openModal, closeModal, currentBook, page, signIn, signOut,
      modal, toastState],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
