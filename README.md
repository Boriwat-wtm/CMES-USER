# CMES-USER - Customer Management & E-Commerce System

A modern React/Node.js application for customer management with an integrated e-commerce system and gift rewards.

## 🎯 Features

### Authentication System ✨ NEW
- ✅ Email/Password registration and login
- ✅ Secure password hashing (bcryptjs)
- ✅ JWT token-based authentication
- ✅ Protected routes with automatic redirects
- ✅ User profile management
- ✅ 7-day token expiration
- ✅ Ready for Google OAuth integration

### User Features
- 👤 User profile management
- 🎁 Gift rewards system
- 📊 Order management
- 💳 Payment processing
- 📝 Report generation
- 🎯 Status tracking
- 📤 Document upload with OCR

### Admin Features (CMES-ADMIN)
- 📊 Admin dashboard
- 🎁 Gift management
- 👥 User management
- 📈 Reports and analytics
- 🏆 VIP supporter tracking

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

#### Option 1: Automated Setup (Recommended)

**Windows:**
```powershell
# Open PowerShell and run:
.\setup.ps1
```

**Mac/Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

#### Option 2: Manual Setup

```bash
# 1. Install backend dependencies
cd backend
npm install

# 2. Create .env file
cp .env.example .env
# Edit .env and change JWT_SECRET to something secure

# 3. Start backend server
npm start
# Backend runs on http://localhost:4000

# 4. In another terminal, install frontend dependencies
cd ../frontend
npm install

# 5. Start frontend
npm start
# Frontend runs on http://localhost:3000
```

---

## 📁 Project Structure

```
CMES-USER/
│
├── backend/
│   ├── routes/
│   │   └── auth.js              # Authentication routes
│   ├── middleware/
│   │   └── authMiddleware.js    # JWT verification
│   ├── server.js                # Express server
│   ├── package.json             # Backend dependencies
│   ├── .env.example             # Environment template
│   ├── test-auth.js             # Auth system tests
│   └── users-data.json          # User database
│
├── frontend/
│   ├── src/
│   │   ├── authService.js       # Auth API service
│   │   ├── ProtectedRoute.js    # Route protection
│   │   ├── App.js               # Main app component
│   │   ├── Register.js          # Auth page
│   │   ├── Home.js              # Home page
│   │   ├── Profile.js           # User profile
│   │   ├── Gift.js              # Gift system
│   │   ├── Upload.js            # Document upload
│   │   ├── Payment.js           # Payment page
│   │   └── ...
│   └── package.json             # Frontend dependencies
│
├── QUICK_START.md               # Quick setup guide
├── AUTH_SETUP.md                # Detailed auth documentation
├── IMPLEMENTATION_SUMMARY.md    # What was implemented
└── REPORT.md                    # Complete report
```

---

## 🔐 Authentication

### Register
```javascript
POST /api/auth/register
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

### Login
```javascript
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

### Protected Routes
All pages except Register require authentication:
- `/home` - User dashboard
- `/profile` - User profile
- `/gift` - Gift rewards
- `/upload` - Document upload
- `/payment` - Payment
- `/status` - Order status
- `/report` - Reports

### Using Auth Service
```javascript
import { 
  registerUser, 
  loginUser, 
  logoutUser,
  getUserProfile,
  isAuthenticated 
} from "./authService";

// Register
const result = await registerUser("john", "john@example.com", "Password123!");

// Login
const result = await loginUser("john@example.com", "Password123!");

// Check if authenticated
if (isAuthenticated()) {
  // User is logged in
}

// Logout
await logoutUser();
```

---

## 🛠️ Development

### Backend Development
```bash
cd backend

# Install dependencies
npm install

# Start development server
npm start

# Run tests
node test-auth.js

# List all users
cat users-data.json
```

### Frontend Development
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

---

## 🧪 Testing

### Test Authentication System
```bash
cd backend
node test-auth.js
```

This runs 9 automated tests:
1. ✅ Register new user
2. ✅ Prevent duplicate emails
3. ✅ Login with email/password
4. ✅ Reject wrong password
5. ✅ Verify JWT token
6. ✅ Get user profile
7. ✅ Update user profile
8. ✅ Logout user
9. ✅ Reject invalid token

### Manual Testing with cURL
```bash
# Register
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"Test123!"}'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Get Profile
curl -X GET http://localhost:4000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📝 Environment Variables

Create `backend/.env`:
```env
PORT=4000
JWT_SECRET=your-super-secret-key-here-change-this
NODE_ENV=development
ADMIN_API_BASE=http://localhost:5001
EXPECTED_AMOUNT=100
```

---

## 🔒 Security

- ✅ Passwords hashed with bcryptjs (10 rounds)
- ✅ JWT tokens with 7-day expiration
- ✅ Token validation on protected routes
- ✅ Input validation on all endpoints
- ✅ CORS enabled for localhost
- ✅ Protected route components

**Production Checklist:**
- [ ] Change JWT_SECRET to a secure random string
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS
- [ ] Use httpOnly cookies for tokens
- [ ] Set CORS to production domain
- [ ] Use database instead of JSON files
- [ ] Enable rate limiting
- [ ] Add logging and monitoring

---

## 📚 Documentation

### Getting Started
- **QUICK_START.md** - 5-minute setup guide
- **AUTH_SETUP.md** - Complete authentication documentation

### Implementation Details
- **IMPLEMENTATION_SUMMARY.md** - What was implemented
- **REPORT.md** - Detailed implementation report

### API Reference
See `AUTH_SETUP.md` for complete API documentation

### Code Comments
Source code includes comprehensive comments explaining functionality

---

## 🐛 Troubleshooting

### Backend Issues
```bash
# Port already in use
# Change PORT in .env or:
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Module not found
npm install

# JWT errors
# Check .env has JWT_SECRET

# Database errors
# Delete users-data.json to reset
```

### Frontend Issues
```bash
# Clear cache
npm cache clean --force

# Clear node_modules
rm -rf node_modules
npm install

# Port in use
# Change port or kill process on 3000
```

### Auth Issues
```bash
# Can't login
# Check email/password are correct
# Try registering new account

# Token errors
# Clear localStorage: localStorage.clear()
# Login again

# Protected routes redirect to login
# Check token is valid: node test-auth.js
```

---

## 🚀 Deployment

### Backend Deployment

**Using Vercel/Netlify Functions:**
```bash
# Deploy with serverless functions
npm install -g @netlify/cli
netlify deploy
```

**Using Heroku:**
```bash
heroku create cmes-user-backend
git push heroku main
```

**Using DigitalOcean/AWS:**
```bash
# Build Docker image
docker build -t cmes-user-backend .
docker run -p 4000:4000 cmes-user-backend
```

### Frontend Deployment

**Using Vercel:**
```bash
npm install -g vercel
vercel
```

**Using Netlify:**
```bash
npm run build
netlify deploy --prod --dir=build
```

**Using GitHub Pages:**
```bash
npm run build
# Deploy build/ folder to gh-pages
```

---

## 🎯 Roadmap

### Completed ✅
- [x] Email/Password authentication
- [x] JWT token system
- [x] Protected routes
- [x] User profile management
- [x] Modern UI with animations
- [x] Form validation
- [x] Password hashing

### In Progress 🔄
- [ ] Google OAuth integration
- [ ] Email verification
- [ ] Password reset feature

### Planned 📋
- [ ] Refresh tokens
- [ ] User avatar upload
- [ ] Two-factor authentication
- [ ] Social login
- [ ] Account deletion
- [ ] Login history
- [ ] API documentation (Swagger)

---

## 🤝 Contributing

To contribute:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📄 License

ISC License - feel free to use this project

---

## 💡 Tips

1. **Development Mode**: Run frontend and backend separately in different terminals
2. **Database Reset**: Delete `users-data.json` and restart backend
3. **Token Debugging**: Visit https://jwt.io to decode tokens
4. **Browser DevTools**: Check Network tab to see API calls
5. **Backend Logs**: Check terminal for detailed error messages

---

## 📞 Support

Having issues? Check:
1. `QUICK_START.md` - Common issues and solutions
2. `AUTH_SETUP.md` - Detailed documentation
3. `test-auth.js` - Test the backend
4. Browser console - Client-side errors
5. Backend terminal - Server errors

---

## ✨ Latest Updates

### Version 1.0.0 (January 2024)
- ✅ Complete authentication system
- ✅ User profile management
- ✅ Protected routes
- ✅ Comprehensive documentation
- ✅ Test automation
- ✅ Security best practices

---

**Happy Coding! 🚀**

For detailed setup instructions, see [QUICK_START.md](./QUICK_START.md)
