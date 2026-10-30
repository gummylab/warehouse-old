// User-facing toast copy.
//
// This module has no React or server imports on purpose: both client handlers
// and unit tests can import it, and the wording stays in one place instead of
// drifting between screens. Error copy for the form API stays in
// app/liff/forms/order-image/order-image-api.ts because it maps server codes.

export const toastMessages = {
  userApproved: (name: string) => `อนุมัติ ${name} แล้ว`,
  userRejected: (name: string) => `ปฏิเสธคำขอของ ${name} แล้ว`,
  userRevoked: (name: string) => `เพิกถอนสิทธิ์ของ ${name} แล้ว`,

  itemAdded: (number: number) => `เพิ่มไอเท็ม ${number} แล้ว`,
  itemAddFailed: 'เพิ่มไอเท็มไม่สำเร็จ',
  itemDeleted: (number: number, varieties = 0) =>
    varieties > 0
      ? `ลบไอเท็ม ${number} พร้อมไอเท็มย่อย ${varieties} รายการแล้ว`
      : `ลบไอเท็ม ${number} แล้ว`,
  itemDeleteFailed: 'ลบไอเท็มไม่สำเร็จ',

  packageChanged: (name: string) => `เปลี่ยนแพ็กเกจเป็น ${name} แล้ว`,
  packageChangeFailed: 'เปลี่ยนแพ็กเกจไม่สำเร็จ',
  packageCleared: 'ล้างแพ็กเกจแล้ว',
  imageDeleted: 'ลบรูปแล้ว',
  imageDeleteFailed: 'ลบรูปไม่สำเร็จ',

  uploadDone: (count: number) => `อัปโหลด ${count} รูปแล้ว`,

  sessionUnavailable: 'เซสชันใช้งานไม่ได้',
  sessionUnavailableDescription: 'กรุณาเปิดหน้านี้ใหม่',
} as const
