// k6 smoke test: 2 virtual users for 30 s against the live ALB.
// Proves the stack serves every path class before running the load test.
//   k6 run -e BASE_URL=http://<alb-dns> loadtest/k6-smoke.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, login, getPage, getAuthed } from './lib.js';

export const options = {
  vus: 2,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
    checks: ['rate>0.99'],
  },
};

export function setup() {
  return { token: login() };
}

export default function (data) {
  const home = getPage('/', 'GET /');
  check(home, { 'GET / is html': (r) => String(r.headers['Content-Type']).includes('text/html') });

  getPage('/health', 'GET /health');

  const ready = getPage('/api/health', 'GET /api/health');
  check(ready, { 'db connected': (r) => r.json('db') === 'connected' });

  const unauth = http.get(`${BASE_URL}/api/books`, {
    tags: { name: 'GET /api/books (no token)' },
    responseCallback: http.expectedStatuses(401),
  });
  check(unauth, { 'no token -> 401': (r) => r.status === 401 });

  if (data.token) {
    getAuthed('/api/auth/profile', data.token, 'GET /api/auth/profile');
    getAuthed('/api/books', data.token, 'GET /api/books');
  }
  sleep(1);
}
