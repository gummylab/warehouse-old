# Warehouse Dashboard

ระบบจัดการรูปภาพออเดอร์ของโรงงาน พนักงานส่งรูปแพ็กเกจผ่าน LIFF บนมือถือ ผู้ดูแลอนุมัติผู้ใช้และตรวจรูปภาพจากหน้าเว็บบนเครื่องของตัวเอง

## โครงสร้าง

- `app/(admin)/` หน้าแอดมิน (จัดการผู้ใช้, จัดการรูปภาพออเดอร์) เข้าถึงจากเครื่องผู้ดูแลระบบเท่านั้น
- `app/liff/` หน้าจอสำหรับผู้ใช้ LINE เปิดจากในแอป LINE เท่านั้น
- `app/api/liff/` API ที่หน้า LIFF เรียกใช้
- `lib/db/` ชั้นข้อมูล (SQLite ผ่าน better-sqlite3, ไม่มี ORM)
- `lib/liff/` การยืนยันตัวตนกับ LINE, คุกกี้เซสชัน, rate limit
- `lib/order-images/` กติกาธุรกิจของฟอร์มรูปภาพ (หมายเลขไอเท็ม, key ของไฟล์, แพ็กเกจ)
- `docs/adr/` บันทึกการตัดสินใจเชิงสถาปัตยกรรม
- `docs/liff-setup.md` วิธีตั้งค่า LIFF app ที่ LINE Developers console

## คำสั่ง

ใช้ bun เป็นตัวจัดการแพ็กเกจ (ดู `package.json` ที่ `packageManager`)

```bash
bun run dev          # dev server ที่ 127.0.0.1:8080
bun run dev:tunnel   # dev server + Cloudflare Tunnel
bun run build        # production build
bun run start        # production server + tunnel
bun run verify       # lint + typecheck + unit test + build
bun run test         # unit test (Vitest)
bun run test:e2e     # e2e test (Playwright) ต้อง `bunx playwright install chromium` ครั้งแรก
```

ดูรายละเอียดเพิ่มเติมใน `AGENTS.md`

## การตั้งค่า

คัดลอก `.env.example` เป็น `.env` แล้วใส่ค่า:

| ตัวแปร | ความหมาย |
|---|---|
| `NEXT_PUBLIC_LIFF_ID` | LIFF ID จาก LINE Developers console ใช้ยืนยันตัวตนกับ LINE |
| `LIFF_SESSION_SECRET` | กุญแจเซสชันของฟอร์มรูปภาพ ต้องยาวอย่างน้อย 32 ตัวอักษร |
| `CLOUDFLARE_TUNNEL_TOKEN` | token ของ tunnel ที่ใช้เปิด `/liff` สู่อินเทอร์เน็ต |
| `STORAGE_PATH` | โฟลเดอร์ที่เก็บรูปภาพ (ถ้าไม่ใส่จะอยู่ที่รากโปรเจค) |

## การเปิดใช้งาน

- หน้าแอดมินเปิดจาก `http://localhost:8080/register` เท่านั้น เครื่องอื่นเข้าไม่ได้
- หน้า LIFF เปิดผ่าน hostname ของ tunnel จากในแอป LINE
- การเพิ่ม `/api/liff*` ใน WAF allowlist ที่ Cloudflare เป็นขั้นตอนที่เจ้าของต้องทำเอง (ดู ADR 0001)
