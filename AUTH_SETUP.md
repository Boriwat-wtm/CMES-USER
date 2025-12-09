# CMES Authentication System Setup

## 🎯 Overview
ระบบรับรองความถูกต้อง (Authentication) แบบใหม่ที่ใช้ Email/Password แทน SMS/OTP พร้อมรองรับ Google OAuth

## 📋 Requirements
- Node.js 16+
- npm หรือ yarn
- Backend dependencies: bcryptjs, jsonwebtoken
- Frontend dependencies: React Router

## 🚀 Installation

### Backend Setup

1. **Install dependencies**
```bash
cd backend
npm install
# หรือ
npm install bcryptjs jsonwebtoken
```

2. **Environment Variables** (สร้าง `.env` file)
```env
PORT=4000
JWT_SECRET=your-secret-key-here-change-this
ADMIN_API_BASE=http://localhost:5001
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
EXPECTED_AMOUNT=100
```

3. **Start Backend Server**
```bash
npm start
# Server runs on http://localhost:4000
```

### Frontend Setup

1. **Install dependencies** (ถ้าจำเป็น)
```bash
cd frontend
npm install
```

2. **Start Frontend**
```bash
npm start
# Frontend runs on http://localhost:3000
```

## 📚 API Endpoints

### Authentication Routes (`/api/auth`)

#### 1. Register
```
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}

Response:
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {
    "id": "1234567890",
    "email": "john@example.com",
    "username": "john_doe",
    "avatar": null,
    "birthday": "",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "emailVerified": false
  }
}
```

#### 2. Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}

Response:
{
  "success": true,
  "token": "eyJhbGc...",
  "user": { ... }
}
```

#### 3. Get Profile
```
GET /api/auth/profile
Authorization: Bearer <token>

Response:
{
  "success": true,
  "user": { ... }
}
```

#### 4. Update Profile
```
PUT /api/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "new_username",
  "avatar": "url_to_avatar",
  "birthday": "15/01"
}

Response:
{
  "success": true,
  "user": { ... }
}
```

#### 5. Verify Token
```
POST /api/auth/verify-token
Content-Type: application/json

{
  "token": "eyJhbGc..."
}

Response:
{
  "success": true,
  "user": { ... }
}
```

#### 6. Logout
```
POST /api/auth/logout
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Logout successful"
}
```

## 🔐 Data Structure

### User Schema (users-data.json)
```json
{
  "1234567890": {
    "id": "1234567890",
    "email": "john@example.com",
    "username": "john_doe",
    "password": "$2a$10$...", // bcrypt hashed password
    "avatar": null,
    "birthday": "15/01",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "lastBirthdayUpdate": "2024-01-01T00:00:00.000Z",
    "emailVerified": false
  }
}
```

## 🛡️ Security Features

1. **Password Hashing**: ใช้ bcryptjs (salt rounds: 10)
2. **JWT Tokens**: Expire ใน 7 วัน
3. **Token Validation**: ตรวจสอบ token ทุกครั้งที่เข้า protected route
4. **Input Validation**: ตรวจสอบ email และ password format

## 📱 Frontend Integration

### Using Auth Service

```javascript
import { 
  registerUser, 
  loginUser, 
  logoutUser,
  getUserProfile,
  updateUserProfile,
  getToken,
  isAuthenticated 
} from "./authService";

// Register
const response = await registerUser("john_doe", "john@example.com", "password123");
localStorage.setItem("token", response.token);
localStorage.setItem("user", JSON.stringify(response.user));

// Login
const response = await loginUser("john@example.com", "password123");

// Get Profile
const profile = await getUserProfile();

// Update Profile
const updated = await updateUserProfile({
  username: "new_username",
  birthday: "15/01"
});

// Check Authentication
if (isAuthenticated()) {
  // User is logged in
}

// Logout
await logoutUser();
```

### Protected Routes

```javascript
import { ProtectedRoute, PublicRoute } from "./ProtectedRoute";

<Routes>
  <Route 
    path="/" 
    element={<PublicRoute><Register /></PublicRoute>}
  />
  <Route 
    path="/home" 
    element={<ProtectedRoute><Home /></ProtectedRoute>}
  />
</Routes>
```

## ⚙️ Configuration

### JWT Secret
ต้องเปลี่ยน `JWT_SECRET` ใน `.env` ให้เป็นค่าที่ปลอดภัยในการใช้งาน production

### Password Requirements
- ต้องมีอย่างน้อย 8 ตัวอักษร
- สามารถมี: ตัวพิมพ์เล็ก, ตัวพิมพ์ใหญ่, ตัวเลข, สัญลักษณ์พิเศษ

### Token Expiration
- Access token: 7 วัน
- สามารถปรับได้ใน `auth.js` โดยเปลี่ยน `expiresIn` value

## 🔗 Integrating with Existing Endpoints

ระบบ auth ใหม่สามารถทำงานควบคู่กับ endpoint เดิมได้:

```javascript
// Old endpoint: /api/check-phone (ยังใช้ได้)
GET /api/check-phone?phone=0891234567

// New endpoint: /api/auth/login (แนะนำ)
POST /api/auth/login
```

## 📋 Migration from Old System

ถ้าต้องการ migrate ข้อมูลผู้ใช้เดิม:

```javascript
// 1. สำหรับผู้ใช้ที่ลงทะเบียนแล้ว (มี phone)
const oldUsers = loadUsers();
const newUsers = {};

Object.entries(oldUsers).forEach(([phone, user]) => {
  const userId = Date.now().toString();
  newUsers[userId] = {
    id: userId,
    email: `user_${phone}@example.com`, // Generate email
    username: user.username || `user_${phone}`,
    password: await bcrypt.hash("DefaultPassword123!", 10),
    avatar: user.avatar || null,
    birthday: user.birthday || "",
    createdAt: new Date().toISOString(),
    emailVerified: false
  };
});

saveUsers(newUsers);
```

## 🐛 Troubleshooting

### "Token is expired"
```
สาเหตุ: JWT token หมดอายุแล้ว
แก้ไข: ให้ user login ใหม่
```

### "Invalid or expired token"
```
สาเหตุ: Token ไม่ถูกต้อง
แก้ไข: ตรวจสอบ JWT_SECRET ตรงกันหรือไม่
```

### "Email already registered"
```
สาเหตุ: Email นี้ถูกใช้แล้ว
แก้ไข: ให้ user ใช้ email อื่นหรือ login
```

### Password hashing ช้า
```
สาเหตุ: Salt rounds สูง
แก้ไข: ปรับ saltRounds ใน bcrypt.hash() ให้ต่ำกว่า
```

## 📝 Notes

- Passwords ถูก hash ด้วย bcryptjs (10 rounds)
- Tokens ไม่เก็บไว้ใน backend (stateless)
- สามารถเพิ่ม refresh token ได้หากต้องการ
- สามารถเพิ่ม email verification flow ได้หากต้องการ
- Google OAuth สามารถเพิ่มได้ตามต้องการ

## 🎓 Next Steps

1. ✅ Setup backend auth routes
2. ✅ Setup frontend auth forms
3. ✅ Integrate auth service
4. ⏭️ Test all flows (register, login, logout)
5. ⏭️ Add email verification (optional)
6. ⏭️ Setup Google OAuth (optional)
7. ⏭️ Add password reset feature (optional)
8. ⏭️ Deploy to production

---

**Created**: January 2024
**Updated**: Based on CMES-USER project requirements
