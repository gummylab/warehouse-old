# Warehouse Dashboard

ระบบจัดการรูปภาพออเดอร์ของโรงงาน พนักงานส่งรูปแพ็กเกจผ่าน LIFF บนมือถือ ผู้ดูแลอนุมัติผู้ใช้และตรวจรูปภาพจากหน้าเว็บบนเครื่องของตัวเอง รูปที่อัปโหลดแต่ละรูปเก็บไฟล์ต้นฉบับไว้ และสร้างไฟล์ย่อสำหรับแสดงผลอีกสองขนาด

## โครงสร้าง

- `app/(admin)/` หน้าแอดมิน (จัดการผู้ใช้, จัดการรูปภาพออเดอร์, ตั้งค่าตำแหน่งฐานข้อมูลและที่จัดเก็บรูป) เข้าถึงจากเครื่องผู้ดูแลระบบเท่านั้น
- `app/liff/` หน้าจอสำหรับผู้ใช้ LINE เปิดจากในแอป LINE เท่านั้น
- `app/api/liff/` API ที่หน้า LIFF เรียกใช้
- `lib/db/` ชั้นข้อมูล (SQLite ผ่าน better-sqlite3 + Drizzle ORM, schema ที่ `lib/db/schema.ts`)
- `lib/liff/` การยืนยันตัวตนกับ LINE, คุกกี้เซสชัน, rate limit
- `lib/order-images/` กติกาธุรกิจของฟอร์มรูปภาพ (หมายเลขไอเท็ม, key ของไฟล์, แพ็กเกจ)
- `docs/adr/` บันทึกการตัดสินใจเชิงสถาปัตยกรรม
- `docs/liff-setup.md` วิธีตั้งค่า LIFF app ที่ LINE Developers console

## คำสั่ง

ใช้ bun เป็นตัวจัดการแพ็กเกจ (ดู `package.json` ที่ `packageManager`)

```bash
bun run dev          # dev server ที่ 127.0.0.1:8080
bun run dev:tunnel   # dev server + Cloudflare Tunnel
bun run build        # production build (ตรวจ migration ก่อน)
bun run db:generate  # สร้าง migration จาก `lib/db/schema.ts`
bun run db:check     # ตรวจว่า `drizzle/` ตรงกับ schema (สร้าง migration ที่ขาดให้)
bun run start        # production server + tunnel
bun run verify       # lint + typecheck + unit test + build
bun run test         # unit test (Vitest)
bun run test:e2e     # e2e test (Playwright) ต้อง `bunx playwright install chromium` ครั้งแรก
```

การแก้ schema: แก้ที่ `lib/db/schema.ts` แล้วรัน `bun run db:generate` ไฟล์ SQL ที่สร้างใน `drizzle/` ต้อง commit ไปด้วย ถ้ายังมี migration ที่ค้างอยู่ `bun run build` จะหยุดเอง

ดูรายละเอียดเพิ่มเติมใน `AGENTS.md`

## การตั้งค่า

คัดลอก `.env.example` เป็น `.env` แล้วใส่ค่า:

| ตัวแปร | ความหมาย |
|---|---|
| `NEXT_PUBLIC_LIFF_ID` | LIFF ID จาก LINE Developers console ใช้ยืนยันตัวตนกับ LINE |
| `LIFF_SESSION_SECRET` | กุญแจเซสชันของฟอร์มรูปภาพ ต้องยาวอย่างน้อย 32 ตัวอักษร |
| `CLOUDFLARE_TUNNEL_TOKEN` | token ของ tunnel ที่ใช้เปิด `/liff` สู่อินเทอร์เน็ต |
| `STORAGE_PATH` | โฟลเดอร์ที่เก็บรูปภาพ (ถ้าไม่ใส่จะอยู่ที่รากโปรเจค) |

ที่อยู่ที่บันทึกไว้ในหน้า `/settings` มีผลเหนือตัวแปรที่ตรงกันใน `.env` ถ้าจะกลับไปใช้ค่าใน `.env` ต้องลบค่านั้นออกจาก `config/settings.json`

## การเปิดใช้งาน

- หน้าแอดมินเปิดจาก `http://localhost:8080` บนเครื่องที่รันเซิร์ฟเวอร์เท่านั้น เครื่องอื่นเข้าไม่ได้
- หน้า LIFF เปิดผ่าน hostname ของ tunnel จากในแอป LINE
- การเพิ่ม `/api/liff*` ใน WAF allowlist ที่ Cloudflare เป็นขั้นตอนที่เจ้าของต้องทำเอง (ดู ADR 0001)
