# Google OAuth Setup Guide

## ขั้นตอนการตั้งค่า Google OAuth

### 1. สร้าง Google Cloud Project

1. ไปที่ https://console.cloud.google.com/
2. สร้าง project ใหม่
3. ตั้งชื่อ project เช่น "CMES-USER"

### 2. เปิด Google Sign-In API

1. ไปที่ **APIs & Services** > **Library**
2. ค้นหา "Google+ API"
3. Click **Enable** (หรือหา "Google Identity Services" และ enable)

### 3. สร้าง OAuth Credentials

1. ไปที่ **APIs & Services** > **Credentials**
2. Click **+ Create Credentials** > **OAuth 2.0 Client IDs**
3. Select Application Type: **Web application**
4. ตั้งชื่อ เช่น "CMES-USER Web"
5. เพิ่ม Authorized redirect URIs:
   ```
   http://localhost:3000
   http://localhost:3001
   http://localhost:4000
   ```
6. Save และ Copy **Client ID**

### 4. Update Frontend Code

แก้ไขไฟล์ `frontend/src/Register.js`

ค้นหา:
```javascript
client_id: "YOUR_GOOGLE_CLIENT_ID", // Replace with your Google Client ID
```

เปลี่ยนเป็น:
```javascript
client_id: "YOUR_ACTUAL_CLIENT_ID_HERE",
```

### 5. Backend Endpoint

Backend ได้ทำเสร็จแล้ว:
- Endpoint: `POST /api/auth/google`
- Body:
  ```json
  {
    "googleId": "user_google_id",
    "email": "user@example.com",
    "name": "User Name",
    "picture": "avatar_url"
  }
  ```

### 6. Test Google OAuth

1. ไปที่ http://localhost:3001/
2. Click ที่ tab **เข้าสู่ระบบ** (Login)
3. ปุ่ม Google Sign-In ควรปรากฎ
4. Click และเลือกบัญชี Google
5. ควรเข้าสู่ระบบและไปยัง /home

---

## การแก้ปัญหา

### "Cannot GET /api/auth/google"
✅ **แก้ไขแล้ว** - Backend endpoint ทำเสร็จแล้ว

### "Google is not defined"
- เช็คว่าได้ load Google Sign-In script
- ตรวจสอบ console สำหรับ errors

### "Client ID is invalid"
- ตรวจสอบว่า Client ID ถูกต้อง
- ตรวจสอบว่า Redirect URI ตรงกับ localhost

### Google button ไม่ปรากฎ
- ตรวจสอบว่า activeTab เป็น "login"
- ลองรีเฟรช page
- ดู browser console สำหรับ errors

---

## Environment Variables (Optional)

สร้าง `.env` ใน frontend:
```
REACT_APP_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
```

แล้วใช้:
```javascript
client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
```

---

## Test Google OAuth (Quick)

```bash
# Backend check
curl -X POST http://localhost:4000/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{
    "googleId": "123456789",
    "email": "test@gmail.com",
    "name": "Test User",
    "picture": "https://..."
  }'
```

Expected Response:
```json
{
  "success": true,
  "token": "eyJ...",
  "user": {
    "id": "...",
    "email": "test@gmail.com",
    "authMethod": "google"
  }
}
```

---

## ข้อมูลเพิ่มเติม

- Google Sign-In Docs: https://developers.google.com/identity
- OAuth 2.0: https://developers.google.com/identity/protocols/oauth2

---

## สถานะ

✅ Backend: `/api/auth/google` endpoint ทำเสร็จแล้ว
✅ Frontend: Google Sign-In library integrated
⏳ แต่ยังต้อง setup Google Client ID

Follow steps 1-4 ข้างบนเพื่อให้ Google OAuth ทำงานได้เต็มที่
