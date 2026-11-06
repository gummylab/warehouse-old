// Admin read scenario: exercises the local-only admin + LIFF surface.
// Runs without LINE auth (local device mode trusts loopback).
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE, headers, checkOk, think } from '../helpers.js';

export function adminRead() {
  // Admin pages (SSR, local-only)
  let res = http.get(`${BASE}/`, { headers: headers() });
  res = http.get(`${BASE}/order-images`, { headers: headers() });
  res = http.get(`${BASE}/line-walks`, { headers: headers() });
  res = http.get(`${BASE}/register`, { headers: headers() });
  res = http.get(`${BASE}/settings`, { headers: headers() });

  // LIFF order lookup (POST, creates/finds order) — local device mode auto-auths
  res = http.post(
    `${BASE}/api/liff/order-images/orders`,
    JSON.stringify({ orderNumber: '123456789', orderDate: '2026-11-06', line: 'ดอกแค' }),
    { headers: headers({ 'Content-Type': 'application/json' }) }
  );
  checkOk(res, 'order lookup 200');

  // Line walks (GET with query params; URL-encode Thai line names)
  const params = 'date=2026-11-06&shift=day&line=' + encodeURIComponent('ดอกแค') + '&brand=B&packStyle=P';
  res = http.get(`${BASE}/api/liff/line-walks?${params}`, { headers: headers() });
  checkOk(res, 'line-walks lookup 200');

  think(0.5, 1.5);
}

export default function () {
  adminRead();
}
