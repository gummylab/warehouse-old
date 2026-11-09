📚 เอกสารอ้างอิง: รายชื่อฟังก์ชันและตัวแปรทั้งหมดใน rfid (dir(rfid))

1. กลุ่มตรวจสอบและจัดการการ์ดพื้นฐาน:

- rfid.is_new_card_present() / rfid.picc_is_new_card_present() : เช็คว่ามีบัตรใหม่วางอยู่หรือไม่ (True/False)
- rfid.read_card_uid() : อ่านหมายเลข UID ของการ์ด
- rfid.picc_get_type() / rfid.picc_get_type_name() : ตรวจสอบประเภทการ์ด (เช่น Mifare 1K, Ultralight)
- rfid.picc_halt_a() : สั่งหยุดการสื่อสารกับการ์ดชั่วคราว
- rfid.picc_wakeup_a() / rfid.picc_wakeup_all() / rfid.picc_reqa_or_wupa() : คำสั่งปลุกการ์ด
- rfid.picc_select() / rfid.picc_select_card() : เลือกการ์ดเพื่อทำธุรกรรมต่อ

2. กลุ่มจัดการข้อมูลภายในบล็อก/เซกเตอร์ (Mifare Classic Operations):

- rfid.mifare_read(block) / rfid.mifare_write(block, data) : อ่าน/เขียน ข้อมูลในบล็อก
- rfid.mifare_increment() / rfid.mifare_decrement() : เพิ่ม/ลด ค่าตัวเลขใน Value Block (ระบบเติมเงิน/แต้ม)
- rfid.mifare_get_value() / rfid.mifare_set_value() : อ่าน/ตั้งค่า ตัวเลขใน Value Block
- rfid.mifare_transfer() / rfid.mifare_restore() : สำรองและถ่ายโอนข้อมูลบล็อก
- rfid.mifare_set_access_bits() : ตั้งค่าสิทธิ์การเข้าถึงเซกเตอร์ (Access Bits)
- rfid.mifare_ultralight_write() : เขียนข้อมูลลงบัตร Ultralight
- rfid.mifare_open_uid_backdoor() / rfid.mifare_unbrick_uid_sector() : คำสั่งพิเศษสำหรับ UID (เกรดพิเศษ/บล็อก 0)

3. กลุ่มควบคุมเสาอากาศและฮาร์ดแวร์ (PCD Commands / Reader Control):

- rfid.pcd_init() : เริ่มต้นการทำงานชิป RFID
- rfid.pcd_antenna_on() / rfid.pcd_antenna_off() : เปิด/ปิด คลื่นสนามแม่เหล็กเสาอากาศ
- rfid.pcd_authenticate(command, blockAddr, key, uid) : ยืนยันตัวตนด้วยรหัสผ่าน (Key A/B)
- rfid.pcd_reset() : รีเซ็ตชิป
- rfid.pcd_get_antenna_gain() / rfid.pcd_set_antenna_gain() : ตรวจสอบ/ปรับอัตราขยายสัญญาณเสาอากาศ
- rfid.pcd_perform_self_test() : ทดสอบระบบฮาร์ดแวร์ภายในตัวชิป
- rfid.pcd_calculate_crc() : คำนวณค่า CRC
- rfid.pcd_clear_register_bitmask() / rfid.pcd_set_register_bitmask() / rfid.pcd_read_register() / rfid.pcd_write_register() : จัดการรีจิสเตอร์ระดับต่ำ
- rfid.pcd_read_bytes() / rfid.pcd_write_bytes() : อ่าน/เขียน ไบต์ในรีจิสเตอร์
- rfid.pcd_communicate_with_picc() / rfid.pcd_mifare_transceive() / rfid.pcd_transceive_data() / rfid.pcd_stop_crypto1() : การรับส่งข้อมูลระดับล่าง

4. กลุ่มดีบักและแสดงผลข้อมูล:

- rfid.picc_dump_to_serial() : พิมพ์ข้อมูลทั้งหมดในการ์ดออก Serial
- rfid.picc_dump_mifare_classic_to_serial() / rfid.picc_dump_mifare_classic_sector_to_serial() : พิมพ์ข้อมูล Mifare Classic
- rfid.picc_dump_mifare_ultralight_to_serial() : พิมพ์ข้อมูล Mifare Ultralight
- rfid.get_status_code_name(code) : แปลงรหัสสถานะเป็นชื่อข้อความ (เช่น STATUS_OK)
- rfid.close() / rfid.read() / rfid.write() : ฟังก์ชันจัดการไฟล์/การเชื่อมต่อพื้นฐาน

5. ค่าคงที่ประเภทการ์ดและสถานะ (Constants):

- rfid.PICC_TYPE_MIFARE_1K, rfid.PICC_TYPE_MIFARE_4K, rfid.PICC_TYPE_MIFARE_UL, ฯลฯ (ประเภทบัตร)
- rfid.STATUS_OK, rfid.STATUS_ERROR, rfid.STATUS_TIMEOUT, ฯลฯ (รหัสสถานะการทำงาน)
