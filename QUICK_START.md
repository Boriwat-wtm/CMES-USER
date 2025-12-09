# 🚀 Quick Start Guide - CMES Authentication System

## ⚡ 5-Minute Setup

### Step 1: Install Backend Dependencies
```bash
cd backend
npm install
```

### Step 2: Create .env File
```bash
cp .env.example .env
```

`.env` file content:
```env
PORT=4000
JWT_SECRET=change-this-secret-key-to-something-secure
ADMIN_API_BASE=http://localhost:5001
```

### Step 3: Start Backend Server
```bash
npm start
```

You should see:
```
[Backend] Server running on port 4000
```

### Step 4: Start Frontend (new terminal)
```bash
cd frontend
npm start
```

Frontend opens at `http://localhost:3000`

### Step 5: Test Registration

1. Go to `http://localhost:3000`
2. Fill in the form:
   - Username: `testuser`
   - Email: `test@example.com`
   - Password: `TestPass123!`
   - Confirm Password: `TestPass123!`
3. Click "ลงทะเบียน" (Register)
4. Should redirect to `/home`

## 🧪 Test with Script

```bash
cd backend
node test-auth.js
```

This runs 9 tests automatically:
- ✅ Register new user
- ✅ Prevent duplicate emails
- ✅ Login with credentials
- ✅ Reject wrong password
- ✅ Verify token
- ✅ Get profile
- ✅ Update profile
- ✅ Logout
- ✅ Reject invalid token

## 📱 Test with cURL

### Register
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username":"john",
    "email":"john@example.com",
    "password":"TestPass123!"
  }'
```

### Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"john@example.com",
    "password":"TestPass123!"
  }'
```

Response includes `token` - copy this for next requests.

### Get Profile
```bash
curl -X GET http://localhost:4000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Update Profile
```bash
curl -X PUT http://localhost:4000/api/auth/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "username":"newname",
    "birthday":"15/01"
  }'
```

## 🛠️ Using Frontend Auth Service

```javascript
import { 
  registerUser, 
  loginUser, 
  logoutUser,
  getUserProfile
} from "./authService";

// Register
const result = await registerUser("john", "john@example.com", "TestPass123!");
console.log(result.token); // Save this

// Login
const result = await loginUser("john@example.com", "TestPass123!");
console.log(result.token); // Already saved to localStorage

// Get Profile
const profile = await getUserProfile();
console.log(profile.user);

// Logout
await logoutUser();
```

## 📂 Database

User data stored in `backend/users-data.json`:

```json
{
  "1234567890": {
    "id": "1234567890",
    "email": "john@example.com",
    "username": "john",
    "password": "$2a$10$...", // bcrypt hashed
    "avatar": null,
    "birthday": "15/01",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "emailVerified": false
  }
}
```

## 🔐 Key Files

| File | Purpose |
|------|---------|
| `backend/routes/auth.js` | Auth endpoints |
| `backend/middleware/authMiddleware.js` | Token verification |
| `frontend/src/authService.js` | Frontend API calls |
| `frontend/src/ProtectedRoute.js` | Route protection |
| `frontend/src/App.js` | Route setup |

## 🐛 Common Issues

**"Cannot find module"**
```bash
# Make sure you installed dependencies
npm install
```

**"Port 4000 already in use"**
```bash
# Change PORT in .env or kill process
# On Windows:
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

**"JWT_SECRET is not defined"**
```bash
# Check .env file has JWT_SECRET
# Or .env.example has default value
```

**"Email already registered"**
```bash
# Use a different email or clear users-data.json
rm backend/users-data.json
```

**"Invalid email or password"**
```bash
# Double-check email and password
# Make sure password is at least 8 characters
# Try registering a new account
```

## 📋 Password Requirements

- ✅ Minimum 8 characters
- ✅ Can include uppercase, lowercase, numbers, symbols
- ⚠️ Case-sensitive
- ⚠️ Must be confirmed on register

## 🔄 Data Flow

```
User enters credentials
         ↓
Frontend validates input
         ↓
POST /api/auth/register or /api/auth/login
         ↓
Backend validates data
         ↓
Check email exists (register only)
         ↓
Hash password with bcryptjs
         ↓
Save/Compare in users-data.json
         ↓
Generate JWT token (expires in 7 days)
         ↓
Return token to frontend
         ↓
Frontend saves token to localStorage
         ↓
Redirect to /home
```

## 📚 Full Documentation

For complete documentation, see:
- `AUTH_SETUP.md` - Detailed setup guide
- `IMPLEMENTATION_SUMMARY.md` - What was implemented
- `backend/routes/auth.js` - Source code comments

## 💡 Tips

1. **Local Testing**: Use `test-auth.js` script
2. **Database**: Clear `users-data.json` to start fresh
3. **Token Debugging**: Decode JWT at https://jwt.io
4. **DevTools**: Check browser Network tab for API calls
5. **Backend Logs**: Check terminal for error messages

## ✅ Verification Checklist

- [ ] Backend npm install completed
- [ ] .env file created with JWT_SECRET
- [ ] Backend running on http://localhost:4000
- [ ] Frontend running on http://localhost:3000
- [ ] Can register new user
- [ ] Can login with email/password
- [ ] Protected routes redirect to login
- [ ] Can update profile
- [ ] Can logout

## 🎯 Next Features

Optional enhancements you can add:
- Email verification (send verification email)
- Google OAuth login
- Password reset via email
- Refresh tokens
- User avatar upload
- Account deactivation
- Login history

---

**Ready to use!** Start with Step 1 above. 🚀
