/* global __ENV */
// k6 load test that drives the ASG to scale out, then lets it scale in.
//
// Profile (default, ~16 min): ramp 0 -> 200 VUs over 5 min, hold 200 for
// 8 min (CPU target tracking at 50% needs ~3 min of breaching datapoints plus
// instance warm-up), ramp down over 2 min, 1 min cool-down at 0.
// Override with -e PEAK_VUS=300 -e HOLD=10m.
//
//   k6 run -e BASE_URL=http://<alb-dns> \
//          -e K6_TEST_EMAIL=... -e K6_TEST_PASSWORD=... \
//          --summary-export loadtest/results/summary.json loadtest/k6-load.js
//
// Thresholds: p95 < 800 ms, error rate < 2 %. See loadtest/README.md for the
// CloudWatch / Auto Scaling evidence to capture while this runs.
import { sleep } from 'k6';
import { getPage, getAuthed, login } from './lib.js';

const PEAK = parseInt(__ENV.PEAK_VUS || '200', 10);
const RAMP = __ENV.RAMP || '5m';
const HOLD = __ENV.HOLD || '8m';

export const options = {
  scenarios: {
    ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: RAMP, target: PEAK },
        { duration: HOLD, target: PEAK },
        { duration: '2m', target: 0 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.02'],
    'http_req_duration{name:GET /api/health}': ['p(95)<800'],
  },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export function setup() {
  return { token: login() };
}

// Traffic mix per iteration: SPA shell, readiness (hits MongoDB), and when a
// test account is given, two authenticated reads (JWT verify + DB queries).
export default function (data) {
  getPage('/', 'GET /');
  getPage('/api/health', 'GET /api/health');
  if (data.token) {
    getAuthed('/api/books', data.token, 'GET /api/books');
    getAuthed('/api/auth/profile', data.token, 'GET /api/auth/profile');
  }
  sleep(Math.random() * 1.5 + 0.5); // 0.5-2 s think time
}
