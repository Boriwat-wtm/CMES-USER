# วิธีการตั้งค่า Email Verification (Gmail)

ระบบยืนยันตัวตนผ่านอีเมลจำเป็นต้องใช้ **App Password** ของ Gmail เพื่อส่งเมลหาผู้ใช้งาน

## 1. ติดตั้ง Library ที่จำเป็น (ถ้ายังไม่ได้ทำ)
เปิด Terminal ที่ `CMES-USER/backend` แล้วรัน:
```bash
npm install nodemailer
```

## 2. การขอ App Password จาก Gmail
เนื่องจาก Google ไม่ให้ใช้รหัสผ่านปกติในการส่งเมลผ่านแอพ คุณต้องสร้างรหัสผ่านสำหรับแอพโดยเฉพาะ:

1. ไปที่ [Google Account Settings](https://myaccount.google.com/)
2. เลือกเมนู **Security (ความปลอดภัย)**
3. เปิดใช้งาน **2-Step Verification (การยืนยันแบบ 2 ขั้นตอน)** (ถ้ายังไม่ได้เปิด)
4. ค้นหาคำว่า **"App User passwords"** หรือ **"รหัสผ่านสำหรับแอป"**
5. สร้างรหัสใหม่:
   - **App (แอป):** เลือก "Mail" (จดหมาย)
   - **Device (อุปกรณ์):** เลือก "Other" (อื่นๆ) แล้วตั้งชื่อว่า "CMES Web"
6. กด **Generate (สร้าง)** -> คุณจะได้รหัส 16 หลัก (เช่น `abcd efgh ijkl mnop`)

## 3. ตั้งค่าในโปรเจกต์
เปิดไฟล์ `.env` ในโฟลเดอร์ `CMES-USER/backend` และเพิ่ม 2 บรรทัดนี้:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=รหัส-16-หลัก-ที่ได้มา-โดยไม่ต้องเว้นวรรค
```

*(เปลี่ยน `your-email@gmail.com` เป็นอีเมลของคุณ และ `EMAIL_PASS` เป็นรหัสที่เพิ่งสร้าง)*

## 4. รีสตาร์ท Server
อย่าลืมปิดและเปิด `node server.js` ใหม่เพื่อให้การตั้งค่ามีผล
