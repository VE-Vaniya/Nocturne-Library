// Shared helpers for the k6 scripts. Plain k6 JavaScript (no npm deps).
import http from 'k6/http';
import { check, fail } from 'k6';

export const BASE_URL = (__ENV.BASE_URL || '').replace(/\/$/, '');
if (!BASE_URL) {
  fail('Set BASE_URL, e.g. k6 run -e BASE_URL=http://<alb-dns> loadtest/k6-smoke.js');
}

// Optional test account (create it once through the app's sign-up page).
// Never use a real user's credentials; pass them via env, not the command history:
//   export K6_TEST_EMAIL=loadtest@example.com K6_TEST_PASSWORD=...
const EMAIL = __ENV.K6_TEST_EMAIL || '';
const PASSWORD = __ENV.K6_TEST_PASSWORD || '';

export const JSON_HEADERS = { 'Content-Type': 'application/json' };

// Called from setup(): logs in once and returns the JWT (or '' when no
// test account was given, in which case authenticated reads are skipped).
export function login() {
  if (!EMAIL || !PASSWORD) {
    console.warn('K6_TEST_EMAIL/K6_TEST_PASSWORD not set - skipping authenticated reads');
    return '';
  }
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    { headers: JSON_HEADERS, tags: { name: 'POST /api/auth/login' } },
  );
  const okLogin = check(res, {
    'login 200': (r) => r.status === 200,
    'login returns token': (r) => !!(r.json() && r.json().token),
  });
  if (!okLogin) {
    fail(`login failed with HTTP ${res.status} - check the test account`);
  }
  return res.json().token;
}

export function getPage(path, name) {
  const res = http.get(`${BASE_URL}${path}`, { tags: { name } });
  check(res, { [`${name} 200`]: (r) => r.status === 200 });
  return res;
}

export function getAuthed(path, token, name) {
  const res = http.get(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    tags: { name },
  });
  check(res, { [`${name} 200`]: (r) => r.status === 200 });
  return res;
}
