# วิธีตั้งค่า LIFF app สำหรับ wh-bot

คู่มือนี้พาสร้าง LIFF app ใน LINE Developers console จนเปิด `https://liff.line.me/<LIFF_ID>` แล้วใช้งานหน้าขอสิทธิ์ได้จริง ทำครั้งเดียวจบ

## ก่อนเริ่ม

- มี LINE Official Account / channel ของบอทอยู่แล้ว (ใช้ channel เดิม)
- dev server + tunnel ทำงาน: `bun run dev:tunnel` (ต้องมี `CLOUDFLARE_TUNNEL_TOKEN` ใน `.env`)
- รู้ hostname ของ tunnel (ดูจาก output ของ tunnel หรือตั้งค่าไว้ใน Cloudflare)

## ขั้นตอน

1. เปิด [LINE Developers console](https://developers.line.biz/console/) เข้าสู่ระบบด้วย account ของผู้ดูแล
2. เลือก Provider ของบอท แล้วเลือก channel ที่ต้องการ
3. ไปแท็บ **LIFF** แล้วกด **Add** (ถ้า channel ยังไม่เคยสร้าง LIFF app)
4. กรอกข้อมูล:
   - **App name**: ชื่ออะไรก็ได้ เช่น `Warehouse Dashboard`
   - **Endpoint URL**: `https://<hostname ของ tunnel>/liff/authorization` (ต้องเป็น path จริงที่เปิดได้ ไม่ใช่ wildcard) หรือจะใส่ `https://<hostname>/liff` สั้นกว่าก็ได้ หน้า `/liff` จะ redirect ไปหน้า authorization ให้เอง
   - **Size**: `Large`
   - ตัวเลือก Bot link เลือกตามต้องการ (ไม่บังคับ)
5. กด **Create** แล้วคัด LIFF ID (รูปแบบ `1234567890-xxxxxxxx`) ที่มุมขวาบนของ LIFF app
6. ใส่ LIFF ID ใน `.env` (ไฟล์นี้ gitignored อยู่แล้ว):

   ```
   NEXT_PUBLIC_LIFF_ID=1234567890-xxxxxxxx
   ```

7. รีสตาร์ท dev server ให้อ่านค่า env ใหม่
8. เปิด `https://liff.line.me/<LIFF_ID>` จากในแอป LINE (วิธีเร็ว: ส่ง URL นี้เข้าแชทตัวเองแล้วกดจากใน LINE)

## ทดสอบ flow ครบทั้งวง

1. เปิด LIFF URL → เห็นปุ่ม "ขอสิทธิ์การใช้งานระบบ" (ผู้ใช้ยังไม่มีใน DB)
2. กดปุ่ม → ขึ้น "รอการอนุมัติ" → เปิด `http://localhost:8080/register` เห็นแถวใหม่ในแท็บรอตรวจสอบ
3. กด "อนุมัติ" → เปิด LIFF URL ใหม่ → ถูกส่งเข้าหน้า `/liff/forms` ซึ่งเป็นรายการของแบบฟอร์ม (ตอนนี้มี "อัปโหลดรูปภาพออเดอร์") ผู้ใช้ที่ approved จะถูก gate ส่งจากหน้าขอสิทธิ์มาหน้านี้อัตโนมัติเช่นกัน
4. ทดสอบปฏิเสธ: ลบแถว approved (หรือขอใหม่ด้วย LINE user อื่น) แล้วกด "ปฏิเสธ" → แถวหายจาก DB ทันที → เปิด LIFF ใหม่ได้ปุ่มขอใหม่

## หมายเหตุ

- แบบฟอร์มอัปโหลดรูปภาพใช้คุกกี้เซสชันที่ลงชื่อด้วยคีย์ `LIFF_SESSION_SECRET` ใน `.env` (สุ่มให้มีอย่างน้อย 32 ตัวอักษร) ถ้าคีย์นี้ขาดหรือสั้นกว่ากำหนด API ของแบบฟอร์มจะตอบ 503 ไม่ใช่ยอมรับแบบเงียบ ๆ (ดู ADR 0005)
- เปิด `http://localhost:8080/liff` จากเครื่องรันระบบเองจะเข้าหน้า `/liff/forms` ได้ทันทีโดยไม่ต้องมี LINE (มี banner "โหมดอุปกรณ์ภายใน" กำกับทุกหน้า ดู ADR 0004) การทดสอบ flow ขอสิทธิ์–อนุมัติ ข้อ 1–4 ข้างบนต้องเปิดผ่าน tunnel จากมือถือในแอป LINE เท่านั้น
- หน้า LIFF เปิดจากเบราว์เซอร์ทั่วไป (ไม่ใช่ในแอป LINE และไม่ใช่ localhost) จะถูกพาไปหน้า login ของ LINE ก่อนโดยอัตโนมัติ
- WAF ที่ Cloudflare: เจ้าของต้องเพิ่ม `/api/liff*` ใน allowlist เพื่อให้ API ใช้งานผ่านอินเทอร์เน็ตสาธารณะได้ (ดู ADR 0001/0003) ก่อนแก้ rule ทุกอย่างทำงานจาก localhost ได้ตามปกติ
- ถ้าเปลี่ยน hostname ของ tunnel ต้องแก้ Endpoint URL ใน console ด้วย
- พฤติกรรม subpath เช่น `liff.me/<id>/xxx` ให้ดูเอกสาร LINE เพิ่มเติมที่ [docs ของ LINE](https://developers.line.biz/en/docs/liff/) เพราะหน้านี้ใช้เฉพาะ URL หลัก
