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

## Forms and access

**แบบฟอร์ม (form)**:
A LIFF feature page an approved user may open, identified by `order-image` or `line-walk`. It is one unit of access: a user either holds it or does not.
_Avoid_: เมนู, หน้า, ฟีเจอร์

**สิทธิ์ฟอร์ม (form grant)**:
The right an approved user holds to open one form. Without it the form hub hides that card and the form's API answers 403.
_Avoid_: permission, สิทธิ์การเข้าถึง

**หน้าแบบฟอร์ม (form hub)**:
`/liff/forms`, the page that lists one card for each form the user holds; with no grant it shows the empty state instead.
_Avoid_: หน้าหลัก, home

**อนุมัติ (approve)**:
Moving an access request from pending to approved and choosing its form grants in the same action. Zero forms is a valid outcome.
_Avoid_: เปิดใช้, อนุญาต

## Order images

**Order-image form**:
The two-step form at `/liff/forms/order-image`, linked from `/liff/forms`: step 1 identifies the order (number, date, line), step 2 creates its items through the auto-numbered add buttons. Each item card links to its own photo page (`/liff/forms/order-image/items/<id>`) where photos are uploaded and labelled. It lives under `/liff` so the tunnel allowlist exposes it (ADR 0001).
_Avoid_: upload page, chat upload

**Order**:
One `(order_number, order_date, line)` triple; the same number and date on a different production line is a different order with its own items and photos (ADR 0011). `order_date` is the Bangkok calendar date stored as plain `YYYY-MM-DD` text, never a timestamp, so no timezone math exists anywhere downstream.
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

**Line walk (การเดินไลน์)**:
One record in the line-walk log, identified by `(date, shift, line, brand, pack style)` and holding a people count and an amount. The shift is `day` or `night`, because a line can be walked on both in one day. Saving a key that already exists updates its two counts; it does not add a second row (ADR 0012).
_Avoid_: walk log row, line visit, duplicate walk

**Overview window (ช่วงภาพรวม)**:
The calendar window the order overview reads, anchored on today in Bangkok: วัน is the last seven days ending today, เดือน every day of the current month, and ปี every month of the current year. All three count the order date, not the time an order was entered, and all three cover the whole system and ignore the order list's period, line and search filters (ADR 0010).
_Avoid_: KPI filter, summary scope, ตามตัวกรอง

**Session cookie**:
The httpOnly, 12-hour cookie `wh_order_image_session`, which the form exchanges its LINE token for so `<img src>` requests can authenticate; approval is still re-checked on every request (ADR 0005).
_Avoid_: LIFF session, auth token (the token is exchanged away, never kept)

**Storage key**:
The relative path a stored image occupies inside the app's storage folder, one level below the kind folder (`date/order/line/item/seq-package.ext`). It exists only server-side and is never part of an API response.
_Avoid_: file path, filename

**Original**:
The uploaded file exactly as it arrived, kept so the archive holds what the camera produced and the display copies can be rebuilt from it (ADR 0015).
_Avoid_: master file, source file, full-size copy

**Derivative**:
A smaller WebP copy generated from an original for display: `web` at 1600px for previews, or `thumb` at 480px for grids. Disposable, because it can be regenerated (ADR 0015).
_Avoid_: resized copy, cache file, preview file

**Admin surface**:
The pages and server actions under `app/(admin)/`, reachable only from the machine running the server. The rule that keeps them local is the one ADR 0004 uses for the LIFF surface: no `CF-Connecting-IP` header and a loopback `Host` (ADR 0007).
_Avoid_: dashboard (the dashboard is one page of the admin surface), private pages

## Database

**Drizzle schema**:
The TypeScript definition of every table, index and constraint in `lib/db/schema.ts`, the single source of truth for the shape of the database file. `drizzle-kit generate` turns it into the SQL under `drizzle/`, so the two move together (ADR 0013).
_Avoid_: table definitions, entity model, schema file

**Migration**:
One generated SQL file under `drizzle/` that brings an existing database file in line with the Drizzle schema; `migrate()` applies the files the database has not recorded yet when the connection opens, and the generated file is committed. Changing a column or an index normally means editing `lib/db/schema.ts` and regenerating; editing the generated SQL by hand is a last resort, and the schema file must then describe the same shape (ADR 0013).
_Avoid_: schema script, bootstrap SQL, ALTER script

**ORM handle**:
The Drizzle object built on one connection (`getOrm()`); the data layer queries through it, and `getDb()` keeps the raw driver for row counts and the rare direct query. The handle is cached with its connection and dropped together by `closeDb()` (ADR 0013).
_Avoid_: db object, connection pool, client

## Settings

**Settings file**:
The JSON file at `config/settings.json` that holds the paths saved on `/settings`; it is gitignored because those paths are absolute and machine specific, and `WH_SETTINGS_PATH` moves it for the test harnesses. A value here outranks `WH_DB_PATH` and `STORAGE_PATH`, and the file is read on every call rather than cached (ADR 0014).
_Avoid_: config file, .env, preferences

**Effective path**:
The path the app actually uses after the rules have run: the resolved database file, or the storage base with `order-images` appended unless the base is already a folder of that name. The card shows the effective path, which is why a saved storage base reads back with the folder on the end.
_Avoid_: saved path, raw path, configured path

**Database switch**:
Changing the database path on `/settings`. The target is opened and migrated in a throwaway handle first, and the live connection is closed only after that succeeds; the previous file is left untouched, so pointing the field back returns to the old data (ADR 0014).
_Avoid_: reconnect, database migration, restart

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
