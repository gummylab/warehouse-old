# Content and voice

## Tone

- UI copy is Thai. Product and domain proper nouns stay in English (`AGENTS.md`: UI copy is
  Thai; `lib/page-titles.ts`).
- Sentences are short and action first: the verb, then the object. The quoted strings below
  use no honorifics and no exclamation marks, and none ends with a full stop.
- An error says what to do next, not what failed inside the system.
- A success toast confirms in the past tense with `แล้ว`.
- A loading label starts with `กำลัง` and ends with an ellipsis.
- An empty state names what is missing, usually `ไม่พบ` plus the noun, then one line that
  explains the link or the next step.

## Error messages

| Situation | Wording | Path |
| --- | --- | --- |
| Unsupported file type | `รองรับเฉพาะไฟล์ JPG, PNG และ WebP` | `app/liff/forms/order-image/order-image-api.ts:149` |
| File over the cap | `ไฟล์ใหญ่เกิน 10 MB` | `app/liff/forms/order-image/order-image-api.ts:148` |
| Missing order number | `กรุณาระบุเลขออเดอร์` | `app/liff/forms/order-image/order-image-api.ts:137` |
| Missing production line | `กรุณาเลือกไลน์ผลิต` | `app/liff/forms/order-image/order-image-api.ts:136` |
| Unknown production line | `ไม่มีไลน์ผลิตนี้` | `app/liff/forms/order-image/order-image-api.ts:139` |
| Order not found | `ไม่พบออเดอร์นี้` | `app/liff/forms/order-image/order-image-api.ts:140` |
| Item not found | `ไม่พบไอเท็มนี้` | `app/liff/forms/order-image/order-image-api.ts:141` |
| Variety under a variety | `ไม่สามารถเพิ่มไอเท็มย่อยใต้ไอเท็มย่อยได้` | `app/liff/forms/order-image/order-image-api.ts:144` |
| Pack full | `ไอเท็มย่อยครบแล้ว (สูงสุด 9 รายการ)` | `app/liff/forms/order-image/order-image-api.ts:145` |
| No permission | `บัญชีของคุณไม่มีสิทธิ์ใช้งานแบบฟอร์มนี้` | `app/liff/forms/order-image/order-image-api.ts:156` |
| Session misconfigured | `ระบบยังตั้งค่าเซสชันไม่เรียบร้อย กรุณาติดต่อผู้ดูแล` | `app/liff/forms/order-image/order-image-api.ts:157` |
| Session expired | `ไม่สามารถเข้าสู่ระบบได้ กรุณาเปิดหน้านี้ใหม่` | `app/liff/forms/order-image/order-image-api.ts:135` |
| Network | `การเชื่อมต่อขัดข้อง กรุณาลองใหม่` | `app/liff/forms/order-image/order-image-api.ts:133` |
| Unknown failure | `เกิดข้อผิดพลาด กรุณาลองใหม่` | `app/liff/forms/order-image/order-image-api.ts:134` |
| Add item failed | `เพิ่มไอเท็มไม่สำเร็จ` | `lib/messages.ts:14` |
| Delete item failed | `ลบไอเท็มไม่สำเร็จ` | `lib/messages.ts:19` |
| Package change failed | `เปลี่ยนแพ็กเกจไม่สำเร็จ` | `lib/messages.ts:22` |
| Image delete failed | `ลบรูปไม่สำเร็จ` | `lib/messages.ts:25` |
| Session unavailable | `เซสชันใช้งานไม่ได้` with `กรุณาเปิดหน้านี้ใหม่` | `lib/messages.ts:29-30` |
| Register refusal | `ไม่พบคำขอนี้ หรือดำเนินการไปแล้ว ลองรีเฟรชหน้าอีกครั้ง` | `app/(admin)/register/actions.ts:20`, `:36` |
| Revoke refusal | `ไม่พบผู้ใช้นี้ หรือเพิกถอนไปแล้ว ลองรีเฟรชหน้าอีกครั้ง` | `app/(admin)/register/actions.ts:49` |
| Admin page from another machine | `หน้านี้เปิดได้จากเครื่องของผู้ดูแลระบบเท่านั้น` | `app/(admin)/admin-gate.tsx:22` |
| LIFF error | `เกิดข้อผิดพลาด` with `กรุณาลองใหม่อีกครั้ง หากยังไม่ได้ ให้แจ้งผู้ดูแลระบบ` | `app/liff/error.tsx:26-27` |
| Admin error | `เกิดข้อผิดพลาดในการแสดงผล` with `ข้อมูลอาจยังไม่ถูกโหลด ลองใหม่อีกครั้ง` | `app/(admin)/error.tsx:26-27` |
| Global error | `เกิดข้อผิดพลาดที่ระบบ` with `กรุณาลองใหม่อีกครั้ง ถ้ายังพบปัญหาให้แจ้งผู้ดูแลระบบ` | `app/global-error.tsx:56-59` |

## Loading states

| Wording | Path |
| --- | --- |
| `กำลังโหลด...` | `app/liff/liff-notice.tsx:21`, `app/(admin)/register/page.tsx:36` |
| `กำลังค้นหา...` | `app/liff/forms/order-image/step-one-fields.tsx:91` |
| `กำลังอัปโหลด...` | `app/liff/forms/order-image/items/[itemId]/upload-dialog.tsx:173`, `app/liff/forms/order-image/items/[itemId]/item-images.tsx:211` |
| `กำลังสร้างไอเท็ม {n}` | `app/liff/forms/order-image/order-items-step.tsx:253` |
| `กำลังโหลด` (spinner `aria-label`, no ellipsis) | `components/ui/spinner.tsx:9` |

## Empty and waiting states

| Wording | Path |
| --- | --- |
| `ไม่พบข้อมูล` | `components/data-table/data-table.tsx:101` |
| `ไม่พบหน้าที่ต้องการ` | `app/not-found.tsx:10` |
| `ลิงก์อาจไม่ถูกต้อง หรือหน้านั้นถูกย้ายไปแล้ว` | `app/not-found.tsx:11` |
| `ไม่พบไอเท็มนี้` | `app/liff/forms/order-image/items/[itemId]/page.tsx:37` |
| `ไอเท็มอาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง` | `app/liff/forms/order-image/items/[itemId]/page.tsx:39` |
| `ยังไม่ระบุแพ็กเกจ` | `app/liff/forms/order-image/items/[itemId]/item-images.tsx:391`, `:421` |
| `คำขอของคุณอยู่ระหว่างรอการอนุมัติ` | `app/liff/authorization/authorization-client.tsx:47` |
| `เปิดลิงก์นี้จากในแอป LINE อีกครั้ง` | `app/liff/liff-notice.tsx:25` |
| `ยังไม่ได้ตั้งค่า LIFF ID` | `app/liff/liff-notice.tsx:23` |

## Confirmations

Success toasts name the object and end with `แล้ว`.

| Wording | Path |
| --- | --- |
| `อนุมัติ {name} แล้ว` | `lib/messages.ts:9` |
| `ปฏิเสธคำขอของ {name} แล้ว` | `lib/messages.ts:10` |
| `เพิกถอนสิทธิ์ของ {name} แล้ว` | `lib/messages.ts:11` |
| `เพิ่มไอเท็ม {n} แล้ว` | `lib/messages.ts:13` |
| `ลบไอเท็ม {n} แล้ว` | `lib/messages.ts:18` |
| `ลบไอเท็ม {n} พร้อมไอเท็มย่อย {n} รายการแล้ว` | `lib/messages.ts:17` |
| `เปลี่ยนแพ็กเกจเป็น {name} แล้ว` | `lib/messages.ts:21` |
| `ล้างแพ็กเกจแล้ว` | `lib/messages.ts:23` |
| `ลบรูปแล้ว` | `lib/messages.ts:24` |
| `อัปโหลด {n} รูปแล้ว` | `lib/messages.ts:27` |

Destructive confirmations name the object and the permanence, and the dialog buttons read
`ยกเลิก` then the destructive verb.

| Dialog title | Body | Path |
| --- | --- | --- |
| `ยืนยันการลบไอเท็ม` | `ลบไอเท็ม {n} พร้อมไอเท็มย่อย {n} รายการ และรูปภาพทั้งหมด {n} รูป ออกถาวร` | `app/liff/forms/order-image/order-items-step.tsx:187`, `:204-212` |
| `ยืนยันการลบรูปภาพ` | `ลบรูปที่ {n} ออกถาวร ไม่สามารถกู้คืนได้` | `app/liff/forms/order-image/items/[itemId]/item-images.tsx:322-324` |
| `ยืนยันเพิกถอนสิทธิ์` | `เพิกถอนสิทธิ์ของ "{name}" ผู้ใช้จะต้องขอสิทธิ์ใหม่ผ่าน LINE ก่อนจึงจะใช้งานระบบได้อีกครั้ง` | `app/(admin)/register/revoke-button.tsx:70-73` |

## Button labels

- Movement: `ถัดไป`, `กลับหน้าแรก`, `กลับไปหน้าแบบฟอร์ม`, `กลับออเดอร์`, `ลองใหม่`.
- Creation: `เพิ่มไอเท็ม`, `เพิ่ม Variety Pack`, `เพิ่มรูปภาพ`, `ถ่ายรูป`, `เลือกไฟล์`, `อัปโหลด`.
- Decision: `อนุมัติ`, `ปฏิเสธ`, `เพิกถอนสิทธิ์`, `ยกเลิก`, `ลบไอเท็ม`, `ยืนยันลบ`.
- Dialog and sheet close: `ปิด`, on the icon chip and the optional footer button
  (`components/ui/dialog.tsx:75`, `:113`, `components/ui/sheet.tsx:75`).

## Capitalization

- Thai has no sentence case. The first word is the action or the state, not a label.
- No full stop appears in toast, button or error strings. The quoted strings above are the
  full copy.
- English proper nouns keep their casing: `LINE`, `LIFF`, `JPG`, `PNG`, `WebP`, `MB`
  (`app/liff/forms/order-image/order-image-api.ts:135-149`), and the package names `Primary`,
  `Inner Box`, `Sleeve Box`, `Tray`, `Carton` (`lib/order-images/packages.ts:5`).
- `Admin` is the only English label on the phone surface, on the local device badge
  (`app/liff/local-device-badge.tsx:17`).
- A Latin name is joined to Thai without a space in `ไลน์${detail.order.line}`
  (`app/liff/forms/order-image/order-image-form.tsx:102`,
  `app/liff/forms/order-image/items/[itemId]/item-images.tsx:178`), while other strings keep
  a space around a value, such as `ไอเท็ม {n}`. The two forms coexist.

## Words to avoid

| Avoid | Use instead | Why |
| --- | --- | --- |
| A bare English action label | The Thai verb | UI copy is Thai. Dialog and sheet close both read `ปิด` (`components/ui/dialog.tsx:75`, `:113`, `components/ui/sheet.tsx:75`), and the sidebar chrome reads `สลับเมนู`, `เมนูนำทาง` and `เมนูสำหรับหน้าจอขนาดเล็ก` (`components/ui/sidebar.tsx:245`, `:257-260`, `:176-179`) |
| `เกิดข้อผิดพลาด` by itself | `เกิดข้อผิดพลาด กรุณาลองใหม่` | The user needs the recovery step |
| `สำเร็จ` alone in a toast | The past tense with `แล้ว` | The pattern in `lib/messages.ts` |
| An HTTP status or error code | The mapped Thai copy from `errorMessage` | `app/liff/forms/order-image/order-image-api.ts:162-165` |
| `ไม่พบ` without a noun | `ไม่พบข้อมูล` or `ไม่พบไอเท็มนี้` | The empty-state pattern above |
| An English placeholder on a page | Thai copy from `lib/page-titles.ts` | The dashboard body reads `แดชบอร์ด` (`app/(admin)/page.tsx:10`, `lib/page-titles.ts:3`), and each page title comes from the same map |
