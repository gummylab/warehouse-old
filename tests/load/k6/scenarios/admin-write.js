// Admin write scenario: exercises admin mutation paths via the LIFF API
// endpoints that back them. Admin approve/revoke/delete are server actions
// (not HTTP routes), so they cannot be load-tested directly; instead we
// exercise the underlying data mutations through the LIFF endpoints that
// share the same DB write path (order create, item add, image upload, line-walk save).
//
// Local device trust (ADR 0004) auto-authenticates requests from 127.0.0.1,
// so no LINE session token is needed when running against localhost.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE, headers, checkOk, think, randomInt } from '../helpers.js';

export function adminWrite() {
  const h = headers({ 'Content-Type': 'application/json' });

  // 1. Create/find an order (upsert by number+date+line)
  const orderRes = http.post(
    `${BASE}/api/liff/order-images/orders`,
    JSON.stringify({
      orderNumber: `9${randomInt(10000000, 99999999)}`,
      orderDate: '2026-11-06',
      line: 'ดอกแค',
    }),
    { headers: h }
  );
  checkOk(orderRes, 'order create 200');

  let orderId = null;
  try { orderId = JSON.parse(orderRes.body).orderId; } catch (e) {}

  // 2. Add an item to the order
  if (orderId) {
    const itemRes = http.post(
      `${BASE}/api/liff/order-images/orders/${orderId}/items`,
      JSON.stringify({}),
      { headers: h }
    );
    check(itemRes, { 'item add 201': (r) => r.status === 201 });

    let itemId = null;
    try { itemId = JSON.parse(itemRes.body).item.id; } catch (e) {}

    // 3. Upload an image for the item (multipart, 1x1 PNG)
    if (itemId) {
      // k6 http.file() requires ArrayBuffer, not Uint8Array
      const pngBytes = new Uint8Array([
        137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,10,0,0,0,10,
        8,2,0,0,0,2,80,88,234,0,0,0,18,73,68,65,84,120,156,99,252,207,128,
        15,48,225,149,29,177,210,0,65,44,1,19,177,10,115,19,0,0,0,0,73,69,
        78,68,174,66,96,130,
      ]);
      const file = http.file(pngBytes.buffer, 'test.png', 'image/png');
      const uploadRes = http.post(
        `${BASE}/api/liff/order-images/items/${itemId}/images`,
        { file: file },
        { headers: headers() }
      );
      check(uploadRes, { 'image upload 201': (r) => r.status === 201 });
    }
  }

  // 4. Create a line-walk entry (upsert)
  const lwRes = http.post(
    `${BASE}/api/liff/line-walks`,
    JSON.stringify({
      entries: [{
        walkDate: '2026-11-06',
        shift: 'day',
        line: 'ดอกแค',
        brand: 'B',
        packStyle: 'P',
        people: randomInt(1, 10),
        amount: randomInt(1, 100),
      }],
    }),
    { headers: h }
  );
  check(lwRes, { 'line-walk save 200': (r) => r.status === 200 });

  // 5. Read admin pages (SSR)
  http.get(`${BASE}/order-images`, { headers: headers() });
  http.get(`${BASE}/line-walks`, { headers: headers() });
  http.get(`${BASE}/register`, { headers: headers() });

  think(1, 2);
}

export default function () {
  adminWrite();
}
