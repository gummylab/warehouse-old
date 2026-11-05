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
When `/liff` opens on the machine running the server: the request never passed through Cloudflare and names the loopback host, so the server answers `approved` without LINE and without a users row; a badge reading "Admin" in the form navbar marks these pages (ADR 0004).
_Avoid_: dev bypass, localhost mock, local user

## Order images

**Order-image form**:
The two-step form at `/liff/forms/order-image`, linked from `/liff/forms`: step 1 identifies the order (number, date, line), step 2 creates its items through the auto-numbered add buttons. Each item card links to its own photo page (`/liff/forms/order-image/items/<id>`) where photos are uploaded and labelled. It lives under `/liff` so the tunnel allowlist exposes it (ADR 0001).
_Avoid_: upload page, chat upload

**Order**:
One `(order_number, order_date)` pair. `order_date` is the Bangkok calendar date stored as plain `YYYY-MM-DD` text, never a timestamp, so no timezone math exists anywhere downstream. The line chosen in step 1 only applies when the order is first created.
_Avoid_: order record, order timestamp

**Order number**:
The nine digits printed on the warehouse's order, always `0`-`9` and always exactly nine. Stored as text so a leading zero survives.
_Avoid_: order id (the internal identifier), order code, reference number

**Item (ไอเท็ม)**:
A numbered unit inside an order, in two shapes: singles are multiples of 100 (100, 200, …) and varieties sit +10 to +90 under their pack (110 to 190 under 100, at most 9 per pack). The numbering rules are inherited from eu-shipment.
_Avoid_: ไอเต็ม (old eu-shipment wording), product, line item

**Line (ไลน์ผลิต)**:
The production line catalog offered by the form's dropdown (`lines` table, seeded from the 27 eu-shipment lines) and stored on the order at creation.
_Avoid_: lane, channel

**Package (แพ็กเกจ)**:
The label on an uploaded photo: `Primary`, `Inner Box`, `Sleeve Box`, `Tray`, or `Carton` (stored as the display string itself). NULL means not yet labelled; filenames then fall back to `Primary`.
_Avoid_: box type, packaging level

**Overview window (ช่วงภาพรวม)**:
The time window the order overview reads: the last 30 consecutive days ("30 วัน"), the last 12 calendar months ("12 เดือน"), or the last 5 calendar years ("5 ปี"), each one ending today in Bangkok. It covers the whole system and ignores the order list's period, line and search filters, so the KPI numbers and the trend chart always describe the same stretch of time (ADR 0010). Orders dated in the future fall outside it.
_Avoid_: KPI filter, summary scope, ตามตัวกรอง

**Session cookie**:
The httpOnly, 12-hour cookie `wh_order_image_session`, which the form exchanges its LINE token for so `<img src>` requests can authenticate; approval is still re-checked on every request (ADR 0005).
_Avoid_: LIFF session, auth token (the token is exchanged away, never kept)

**Storage key**:
The relative path a stored image occupies under `wh-order-images-storage` (`date/order/line/item/seq-package.ext`). It exists only server-side and is never part of an API response.
_Avoid_: file path, filename

**Admin surface**:
The pages and server actions under `app/(admin)/`, reachable only from the machine running the server. The rule that keeps them local is the one ADR 0004 uses for the LIFF surface: no `CF-Connecting-IP` header and a loopback `Host` (ADR 0007).
_Avoid_: dashboard (the dashboard is one page of the admin surface), private pages

## Testing

**Test database**:
The throwaway SQLite file an automated test opens instead of `database/wh.db`, chosen with the `WH_DB_PATH` variable and wiped before every test by `isolateTestData()` (tests/unit/setup/db.ts). The default is unchanged when the variable is unset, so the app itself never points anywhere else (ADR 0006).
_Avoid_: mock database, sandbox database

**Seeded row**:
A users row written straight through the data layer by a test or an e2e spec, because a real request would have to be vouched for by LINE (ADR 0003) and a browser cannot do that. It is the same write the LIFF endpoints perform.
_Avoid_: fixture, stub user, fake user

**Run id**:
The identifier the e2e harness gives one run, so the runner and the server it starts work on the same throwaway database and upload folder. It travels as `WH_E2E_RUN_ID`; if the two disagree they use different files, and the specs see neither the rows they seeded nor the deletions the server performed.
_Avoid_: test run id, session id
