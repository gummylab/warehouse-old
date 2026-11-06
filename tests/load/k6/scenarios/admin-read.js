// Admin read scenario: exercises the local-only admin surface.
// Runs without LINE auth (local device mode trusts loopback).
import { get, checkOk, think } from '../helpers.js';

export function adminRead() {
  // Dashboard landing
  let res = get('/(admin)', {});
  // Orders list
  res = get('/api/liff/order-images/orders');
  checkOk(res, 'orders list 200');

  // Order detail (first page) — fetch list then detail
  // Line walks
  res = get('/api/liff/line-walks');
  checkOk(res, 'line-walks list 200');

  // Register queue
  res = get('/api/liff/request');
  // may be 200 or 404 depending route; accept 2xx
  // Settings
  res = get('/settings');
  // state screen acceptable

  think(0.5, 1.5);
}

export default function () {
  adminRead();
}
