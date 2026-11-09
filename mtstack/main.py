import time

import M5
from hardware import I2C, Pin
from unit import RFIDUnit

# เริ่มต้นการทำงานระบบพื้นฐานของบอร์ด M5Stack (AtomS3 Lite)
M5.begin()

# กำหนดค่าพอร์ต I2C (Bus 0) โดยระบุขา SCL ที่ Pin 1 และ SDA ที่ Pin 2 (พอร์ต A บนฐาน Atomic Port ABC Base)
# ตั้งความถี่การสื่อสาร I2C ที่ 100kHz (100000 Hz)
i2c = I2C(0, scl=Pin(1), sda=Pin(2), freq=100000)

# สร้างออบเจกต์ rfid โดยเชื่อมต่อผ่านบอร์ด I2C ที่กำหนดไว้
rfid = RFIDUnit(i2c)

print("RFID Ready. Please tap your card...")

while True:
    try:
        # rfid.is_new_card_present(): ฟังก์ชันสำหรับตรวจสอบว่ามีบัตร RFID มาแตะใหม่ในระยะเสาอากาศหรือไม่ (คืนค่า True/False)
        if rfid.is_new_card_present():
            # rfid.read_card_uid(): ฟังก์ชันสำหรับอ่านข้อมูลหมายเลขประจำตัว (UID) ของการ์ดที่นำมาแตะ
            uid = rfid.read_card_uid()

            if uid:
                # ตรวจสอบว่าข้อมูล UID ที่อ่านมาอยู่ในรูปแบบของชุดข้อมูลไบต์ (bytearray หรือ bytes) หรือไม่
                if isinstance(uid, (bytearray, bytes)):
                    # ตัดเอาเฉพาะ 4 ไบต์แรก (มาตรฐานของบัตร Mifare Classic 1k ทั่วไป) เพื่อป้องกันข้อมูลขยะหรือค่าศูนย์ต่อท้าย
                    real_uid = bytes(uid[:4])

                    # แปลงค่าไบต์แต่ละตัวให้เป็นตัวเลขฐานสิบหก (Hex String) สองหลักตัวพิมพ์ใหญ่ต่อกัน
                    uid_hex = "".join([f"{b:02X}" for b in real_uid])

                    # แสดงผลลัพธ์รหัส UID ของบัตรออกทางหน้าจอ Serial Monitor / Terminal
                    print("Card UID (Hex):", uid_hex)

                # หน่วงเวลา 1 วินาที เพื่อป้องกันไม่ให้ระบบอ่านบัตรใบเดิมซ้ำรัวๆ ในขณะที่เรากำลังวางบัตรแช่ไว้
                time.sleep(1)

    except Exception as e:
        # ป้องกันไม่ให้โปรแกรมหยุดทำงาน (Crash) หากเกิดข้อผิดพลาดหรือจังหวะที่ไม่มีบัตรอยู่ในระยะ
        pass

    # หน่วงเวลาสั้นๆ 0.1 วินาทีในลูปหลัก เพื่อลดภาระการประมวลผลของซีพียู (CPU)
    time.sleep(0.1)
