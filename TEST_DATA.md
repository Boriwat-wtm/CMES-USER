# Sample Test Data for CMES-USER Authentication

## Demo Credentials

### Demo User Account
```
Email: demo@example.com
Password: Demo123!
Username: demo_user
```

**Note**: This account is pre-seeded in `users-data.json` for testing purposes.

---

## How to Create Test Users

### Method 1: Using the UI
1. Visit http://localhost:3000
2. Click "ลงทะเบียน" (Register)
3. Fill in the form
4. Click "ลงทะเบียน" button
5. User will be automatically logged in

### Method 2: Using cURL
```bash
# Register new user
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser1",
    "email": "testuser1@example.com",
    "password": "TestPass123!"
  }'

# Response includes token and user data
# Save the token for next requests
```

### Method 3: Using test-auth.js
```bash
cd backend
node test-auth.js
```

This automatically creates test users and runs tests.

---

## Test User Examples

### User 1: Developer
```json
{
  "username": "dev_user",
  "email": "developer@example.com",
  "password": "DevPass123!"
}
```

### User 2: Admin
```json
{
  "username": "admin_user",
  "email": "admin@example.com",
  "password": "AdminPass123!"
}
```

### User 3: Customer
```json
{
  "username": "customer_user",
  "email": "customer@example.com",
  "password": "CustomerPass123!"
}
```

---

## Password Requirements

All test passwords must meet these requirements:
- ✅ Minimum 8 characters
- ✅ Include at least one uppercase letter (A-Z)
- ✅ Include at least one lowercase letter (a-z)
- ✅ Include at least one number (0-9)
- ✅ Include at least one special character (!@#$%^&*)

---

## Database File

The user database is stored in `backend/users-data.json`

### Initial Content
```json
{
  "1234567890": {
    "id": "1234567890",
    "email": "demo@example.com",
    "username": "demo_user",
    "password": "$2a$10$...", // bcrypt hashed
    "avatar": null,
    "birthday": "15/01",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "emailVerified": false
  }
}
```

### User ID Generation
- Each new user gets a unique ID based on current timestamp
- Example: `1704110400000` (Date.now())

---

## Testing Workflow

### 1. Start Fresh
```bash
# Delete database to start fresh
cd backend
rm users-data.json
npm start
```

### 2. Create Test User
```bash
# Via UI or cURL
# Email: test@example.com
# Password: TestPass123!
```

### 3. Login
```bash
# Visit http://localhost:3000
# Enter credentials
# Should redirect to /home
```

### 4. Update Profile
```bash
# Go to /profile
# Update username, birthday, etc.
# Click Save
```

### 5. Verify Data
```bash
# Check backend/users-data.json
# Should see updated user data
```

---

## Common Test Scenarios

### Scenario 1: Normal Registration and Login
1. Register with new email
2. System saves user with hashed password
3. Returns JWT token
4. Frontend stores token in localStorage
5. Redirects to /home

### Scenario 2: Duplicate Email
1. Try registering with existing email
2. System returns error
3. User stays on registration page
4. Can try with different email

### Scenario 3: Wrong Password
1. Register user
2. Try logging in with wrong password
3. System returns error
4. User can retry with correct password

### Scenario 4: Token Expiration
1. Login normally (token expires in 7 days)
2. After 7 days, try using old token
3. System rejects expired token
4. User must login again

### Scenario 5: Protected Route Access
1. Without token, visiting /home redirects to /
2. After login, can access /home
3. After logout, /home redirects to /

---

## API Test Endpoints

### Register Endpoint
```
POST http://localhost:4000/api/auth/register
Content-Type: application/json

Request Body:
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "TestPass123!"
}

Expected Response (200):
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "1704110400000",
    "email": "test@example.com",
    "username": "testuser",
    "avatar": null,
    "birthday": "",
    "createdAt": "2024-01-01T12:00:00.000Z",
    "emailVerified": false
  }
}
```

### Login Endpoint
```
POST http://localhost:4000/api/auth/login
Content-Type: application/json

Request Body:
{
  "email": "test@example.com",
  "password": "TestPass123!"
}

Expected Response (200):
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... }
}
```

### Get Profile Endpoint
```
GET http://localhost:4000/api/auth/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

Expected Response (200):
{
  "success": true,
  "user": { ... }
}
```

### Update Profile Endpoint
```
PUT http://localhost:4000/api/auth/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

Request Body:
{
  "username": "newname",
  "birthday": "15/01",
  "avatar": "https://..."
}

Expected Response (200):
{
  "success": true,
  "user": { ... }
}
```

---

## Debugging Tips

### Check Token in Browser
```javascript
// In browser console:
localStorage.getItem("token")
localStorage.getItem("user")

// Decode token at: https://jwt.io
```

### Check Backend Logs
```bash
# Terminal where backend is running
# Look for [Backend] or error messages
```

### Reset Database
```bash
# Delete users-data.json to start fresh
rm backend/users-data.json

# Restart backend
npm start
```

### Test Individual Endpoints
```bash
# Use test-auth.js script
node backend/test-auth.js

# Or use cURL commands above
```

---

## Performance Testing

### Load Testing (Optional)
```bash
# Create 100 test users
for i in {1..100}; do
  curl -X POST http://localhost:4000/api/auth/register \
    -H "Content-Type: application/json" \
    -d "{
      \"username\":\"user$i\",
      \"email\":\"user$i@example.com\",
      \"password\":\"TestPass123!\"
    }"
done
```

### Memory Usage
- Initial: ~50MB
- After 1000 users: ~150MB
- Recommended upgrade for production DB

---

## Cleanup

### Remove All Test Users
```bash
# Delete database file
rm backend/users-data.json

# Backend will create empty file on next request
```

### Clear Frontend Cache
```javascript
// In browser console:
localStorage.clear()
sessionStorage.clear()
location.reload()
```

---

## Next Testing Steps

1. ✅ Unit test individual endpoints
2. ✅ Integration test login flow
3. ✅ Test password hashing
4. ✅ Test token validation
5. ⏭️ Load testing
6. ⏭️ Security testing
7. ⏭️ E2E testing with Cypress/Playwright

---

For more information, see:
- `QUICK_START.md` - Setup guide
- `AUTH_SETUP.md` - API documentation
- `backend/test-auth.js` - Automated tests
