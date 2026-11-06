// Admin write scenario: exercises admin mutation paths.
// Note: mutations require seeded data; this scenario focuses on the
// read-heavy admin surface that precedes writes (register queue, order list).
// For real approve/revoke load, seed rows via tests/e2e/support/data.ts first.
import { get, checkOk, think } from '../helpers.js';

export function adminWrite() {
  // Register queue (pending users)
  let res = get('/register');
  // Orders table
  res = get('/order-images');
  // Line walks overview
  res = get('/line-walks');

  think(1, 2);
}

export default function () {
  adminWrite();
}
