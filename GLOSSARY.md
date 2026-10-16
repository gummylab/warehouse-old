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
