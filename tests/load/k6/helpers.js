// Shared helpers for warehouse load tests.
import http from 'k6/http';
import { check, sleep } from 'k6';

export const BASE = __ENV.BASE_URL || 'http://127.0.0.1:8080';

export const THRESHOLDS = {
  smoke: {
    'http_req_duration': ['p(95)<500'],
    'http_req_failed': ['rate<0.01'],
  },
  load: {
    'http_req_duration': ['p(95)<1000'],
    'http_req_failed': ['rate<0.02'],
  },
  stress: {
    'http_req_duration': ['p(95)<3000'],
    'http_req_failed': ['rate<0.10'],
  },
  soak: {
    'http_req_duration': ['p(95)<1000'],
    'http_req_failed': ['rate<0.01'],
  },
};

export function headers(extra = {}) {
  return Object.assign({ Accept: 'application/json' }, extra);
}

export function get(path, params) {
  return http.get(`${BASE}${path}`, Object.assign({ headers: headers() }, params || {}));
}

export function post(path, body, params) {
  const h = headers({ 'Content-Type': 'application/json' });
  return http.post(`${BASE}${path}`, JSON.stringify(body), Object.assign({ headers: h }, params || {}));
}

export function postForm(path, fields, params) {
  return http.post(`${BASE}${path}`, fields, Object.assign({ headers: headers() }, params || {}));
}

export function checkOk(res, name) {
  return check(res, { [name || 'status 200']: (r) => r.status === 200 });
}

export function checkStatus(res, status, name) {
  return check(res, { [name || `status ${status}`]: (r) => r.status === status });
}

export function think(min, max) {
  if (min === undefined) min = 0.5;
  if (max === undefined) max = 2;
  sleep(Math.random() * (max - min) + min);
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
