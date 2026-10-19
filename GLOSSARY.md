# Warehouse Dashboard

Admin dashboard for warehouse order images and user registration, plus the LIFF pages that LINE users open from inside LINE.

## Language

**User**:
A person who can use the system, shown with name, avatar, and status on the register screen.
_Avoid_: Account, member

**User status**:
Where a user sits in the access lifecycle: `pending` (requested, not reviewed) or `approved` (can use the system). A rejected request is deleted, so `rejected` is not a stored status.
_Avoid_: State, rejected status

**Access request**:
The `pending` row a LINE user creates by tapping "ขอสิทธิ์การใช้งานระบบ" on the LIFF page; it exists until an admin approves it or rejects it (which deletes it).
_Avoid_: Registration form, registration record

**LINE identity**:
The caller's `line_user_id` after LINE's own API has verified their token; the only identity the server ever trusts (ADR 0003).
_Avoid_: Client profile, userId from the client

**Approval queue**:
The users with `pending` status, reviewed one by one on the register screen's tab labelled "รอตรวจสอบ".
_Avoid_: Pending list, pending dialog

**LIFF**:
The area under `/liff` that LINE users open from inside LINE (authorization screen, forms, ...); the only part of the app exposed to the public internet (ADR 0001). The layout gate resolves the session once per load and steers non-approved users to the authorization screen.
_Avoid_: /liff/api (the API lives under /api/liff)

**Local device mode**:
When `/liff` opens on the machine running the server: the request never passed through Cloudflare and names the loopback host, so the server answers `approved` without LINE and without a users row; a banner marks these pages (ADR 0004).
_Avoid_: dev bypass, localhost mock, local user

## Order images

**Order-image form**:
The two-step form at `/liff/form/order-image`, linked from `/liff/forms`: step 1 identifies the order (number, date, line), step 2 creates its items through the auto-numbered add buttons. Each item card links to its own photo page (`/liff/form/order-image/items/<id>`) where photos are uploaded and labelled. It lives under `/liff` so the tunnel allowlist exposes it (ADR 0001).
_Avoid_: upload page, chat upload

**Order**:
One `(order_number, order_date)` pair. `order_date` is the Bangkok calendar date stored as plain `YYYY-MM-DD` text, never a timestamp, so no timezone math exists anywhere downstream. The line chosen in step 1 only applies when the order is first created.
_Avoid_: order record, order timestamp

**Item (ไอเท็ม)**:
A numbered unit inside an order, in two shapes: singles are multiples of 100 (100, 200, …) and varieties sit +10 to +90 under their pack (110 to 190 under 100, at most 9 per pack). The numbering rules are inherited from eu-shipment.
_Avoid_: ไอเต็ม (old eu-shipment wording), product, line item

**Line (ไลน์ผลิต)**:
The production line catalog offered by the form's dropdown (`lines` table, seeded from the 27 eu-shipment lines) and stored on the order at creation.
_Avoid_: lane, channel

**Package (แพ็กเกจ)**:
The label on an uploaded photo: `Primary`, `Inner Box`, `Sleeve Box`, `Tray`, or `Carton` (stored as the display string itself). NULL means not yet labelled; filenames then fall back to `Primary`.
_Avoid_: box type, packaging level

**Session cookie**:
The httpOnly, 12-hour cookie `wh_order_image_session`, which the form exchanges its LINE token for so `<img src>` requests can authenticate; approval is still re-checked on every request (ADR 0005).
_Avoid_: LIFF session, auth token (the token is exchanged away, never kept)

**Storage key**:
The relative path a stored image occupies under `wh-order-images-storage` (`date/order/line/item/seq-package.ext`). It exists only server-side and is never part of an API response.
_Avoid_: file path, filename
