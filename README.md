# CMES-USER - Customer Management & E-Commerce System

A modern React/Node.js full-stack application for customer management with integrated e-commerce system, gift rewards, and real-time features.

## 🎯 Features

### Authentication System
- ✅ Email/Password registration and login
- ✅ Secure password hashing (bcryptjs)
- ✅ JWT token-based authentication
- ✅ Protected routes with automatic redirects
- ✅ User profile management
- ✅ 7-day token expiration
- ✅ Google OAuth integration ready

### User Features
- 👤 User profile management with avatars
- 🎁 Gift rewards system
- 📊 Order management
- 💳 Payment processing
- 📝 Report generation and export
- 🎯 Status tracking
- 📤 Document upload with OCR support
- ⚡ Real-time updates with Socket.io

### Admin Features (CMES-ADMIN)
- 📊 Admin dashboard with analytics
- 🎁 Gift management system
- 👥 User management
- 📈 Reports and advanced analytics
- 🏆 VIP supporter tracking
- 🎡 Lucky wheel management
- 📸 Image queue management
- 🔐 Role-based access control

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ (Recommended: 18 LTS)
- npm or yarn
- MongoDB (for user data)
- Port availability: 3000 (frontend) and 4000 (backend)

### Installation

#### Option 1: Automated Setup (Windows/Mac/Linux)

**Windows (PowerShell):**
```powershell
.\setup.ps1
```

**Mac/Linux (Bash):**
```bash
chmod +x setup.sh
./setup.sh
```

#### Option 2: Manual Setup

**Step 1: Backend Setup**
```bash
cd backend
npm install

# Create .env file
cp .env.example .env
```

**.env Configuration:**
```env
PORT=4000
JWT_SECRET=change-this-to-a-secure-random-string
NODE_ENV=development
ADMIN_API_BASE=http://localhost:5001
```

**Start Backend:**
```bash
npm start
# Server runs on http://localhost:4000
```

**Step 2: Frontend Setup (new terminal)**
```bash
cd frontend
npm install
npm start
# Frontend runs on http://localhost:3000
```

---

## 📁 Project Structure

```
CMES-USER/
├── backend/
│   ├── models/
│   │   ├── User.js                  # User data model
│   │   ├── GiftOrder.js             # Gift order model
│   │   └── Report.js                # Report model
│   │
│   ├── routes/
│   │   ├── auth.js                  # Local authentication routes
│   │   └── auth-mongodb.js          # MongoDB auth routes
│   │
│   ├── middleware/
│   │   └── authMiddleware.js        # JWT verification middleware
│   │
│   ├── uploads/
│   │   ├── avatars/                 # User avatars
│   │   ├── slips/                   # Payment slips
│   │   └── others/                  # Other uploads
│   │
│   ├── server.js                    # Express server entry point
│   ├── package.json                 # Backend dependencies
│   ├── .env                         # Environment variables
│   └── DATABASE_SCHEMA.md           # Database schema documentation
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── App.js               # Main app component
│   │   │   ├── Home.js              # Dashboard
│   │   │   ├── Register.js          # Registration page
│   │   │   ├── Profile.js           # User profile
│   │   │   ├── Gift.js              # Gift rewards
│   │   │   ├── Payment.js           # Payment page
│   │   │   ├── Report.js            # Reports page
│   │   │   ├── Select.js            # Selection component
│   │   │   ├── ProtectedRoute.js    # Route protection
│   │   │   └── authService.js       # Authentication service
│   │   │
│   │   ├── styles/
│   │   │   ├── App.css              # Global styles
│   │   │   ├── index.css            # Base styles
│   │   │   ├── theme.css            # Theme variables
│   │   │   └── *.css                # Component styles
│   │   │
│   │   ├── index.js                 # React entry point
│   │   └── reportWebVitals.js       # Performance monitoring
│   │
│   ├── public/
│   │   ├── index.html               # HTML template
│   │   ├── manifest.json            # PWA manifest
│   │   └── test-google.html         # Google OAuth test
│   │
│   ├── package.json                 # Frontend dependencies
│   ├── tailwind.config.js           # Tailwind CSS config
│   └── postcss.config.js            # PostCSS config
│
├── public/
│   └── index.html                   # Root HTML
│
├── Documentation/
│   ├── README.md                    # This file
│   ├── QUICK_START.md               # 5-minute setup guide
│   ├── AUTH_SETUP.md                # Authentication documentation
│   ├── GOOGLE_OAUTH_SETUP.md        # Google OAuth setup
│   ├── IMPLEMENTATION_SUMMARY.md    # Implementation details
│   ├── REPORT.md                    # Project report
│   └── TEST_DATA.md                 # Test data reference
│
├── tailwind.config.js               # Tailwind CSS configuration
├── postcss.config.js                # PostCSS configuration
└── package.json                     # Root package.json
```

---

## 🔐 Authentication

### API Endpoints

**Register User**
```javascript
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}

Response: { token, user }
```

**Login**
```javascript
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}

Response: { token, user }
```

**Get Profile**
```javascript
GET /api/auth/profile
Headers: { Authorization: Bearer <token> }

Response: { user }
```

**Logout**
```javascript
POST /api/auth/logout
Headers: { Authorization: Bearer <token> }
```

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

// Check authentication
if (isAuthenticated()) {
  // User is logged in
}

// Get user profile
const profile = await getUserProfile();

// Logout
await logoutUser();
```

### Protected Routes

All routes require authentication except `/register`:
- `/home` - User dashboard
- `/profile` - User profile
- `/gift` - Gift rewards
- `/payment` - Payment processing
- `/report` - Reports
- `/status` - Order status

### Token Format

```javascript
// JWT Token payload
{
  userId: "...",
  email: "user@example.com",
  iat: 1234567890,
  exp: 1234567890 + (7 * 24 * 60 * 60) // 7 days
}
```

---

## 🛠️ Development

### Backend Development

```bash
cd backend

# Install dependencies
npm install

# Start in development mode (with auto-reload)
npm run dev

# Start in production mode
npm start

# Check database
node check_db.js
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Start development server with HMR
npm start

# Build for production
npm run build

# Run tests
npm test
```

### Environment Variables

**Backend (.env)**
```env
PORT=4000
JWT_SECRET=your-super-secret-key-here-change-this
NODE_ENV=development
ADMIN_API_BASE=http://localhost:5001
DATABASE_URL=mongodb://localhost:27017/cmes-user
```

**Frontend (.env)**
```env
REACT_APP_API_URL=http://localhost:4000/api
REACT_APP_SOCKET_URL=http://localhost:4000
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
```

---

## 🧪 Testing

### API Testing with cURL

```bash
# Register new user
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"Test123!"}'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Get profile (replace TOKEN with actual token)
curl -X GET http://localhost:4000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Manual Testing

1. **Register:** http://localhost:3000 → Fill form → Submit
2. **Login:** Enter credentials → Should redirect to home
3. **Profile:** Click profile → View user information
4. **Check Token:** Open DevTools → Application → localStorage → Look for `token`
5. **Verify JWT:** Visit https://jwt.io → Paste token → Verify claims

### Automated Tests

```bash
cd frontend
npm test

cd ../backend
npm run test
```

---

## 📝 Environment Variables

### Backend Configuration

Create `backend/.env`:
```env
# Server
PORT=4000
NODE_ENV=development

# JWT
JWT_SECRET=change-this-to-a-very-secure-random-string
JWT_EXPIRY=7d

# Database
MONGODB_URI=mongodb://localhost:27017/cmes-user
DATABASE_NAME=cmes-user

# External Services
ADMIN_API_BASE=http://localhost:5001
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=<get-from-google-cloud-console>

# Email (Optional - for verification)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# File Upload
MAX_FILE_SIZE=5242880
ALLOWED_IMAGE_TYPES=jpg,jpeg,png,gif,webp
```

### Frontend Configuration

Create `frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:4000/api
REACT_APP_SOCKET_URL=http://localhost:4000
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
REACT_APP_ENV=development
```

---

## 🔒 Security

### ⚠️ Critical Security Notes

**NEVER expose sensitive information in version control:**
- ❌ Do NOT commit `.env` files to GitHub
- ❌ Do NOT hardcode passwords or API keys in code
- ❌ Do NOT include real connection strings in documentation
- ❌ Do NOT share JWT secrets or database credentials
- ❌ Never push email passwords to repositories

**What to Keep Secret:**
```
- JWT_SECRET (use 32+ character random string)
- MONGODB_URI with credentials
- API keys (Google, Twilio, SendGrid, etc.)
- Email passwords or app tokens
- Database passwords and connection strings
- Any personal or authentication data
```

**Use .gitignore to protect:**
```
.env
.env.local
.env.*.local
node_modules/
uploads/
```

### Implementation
- ✅ Passwords hashed with bcryptjs (10 salt rounds)
- ✅ JWT tokens with configurable expiration (default 7 days)
- ✅ Token validation on all protected routes
- ✅ CORS protection for localhost development
- ✅ Input validation and sanitization
- ✅ Protected route components with redirects
- ✅ Secure HTTP headers
- ✅ XSS prevention

### Best Practices Implemented
- Password hashing: `bcryptjs` with 10 rounds
- Token algorithm: `HS256` (HMAC-SHA256)
- Token storage: localStorage (consider httpOnly cookies for production)
- Session validation: JWT verification on each request

### Production Security Checklist
- [ ] Change JWT_SECRET to 32+ character random string
- [ ] Set NODE_ENV=production in backend
- [ ] Enable HTTPS/TLS for all endpoints
- [ ] Use httpOnly, Secure, SameSite cookies for tokens
- [ ] Configure CORS to specific production domain
- [ ] Use environment variables from secure vault (AWS Secrets, Azure Key Vault)
- [ ] Enable rate limiting on authentication endpoints
- [ ] Set up Web Application Firewall (WAF)
- [ ] Enable request logging and monitoring
- [ ] Regular security audits and dependency updates
- [ ] Implement CSRF tokens for state-changing operations
- [ ] Enable Content Security Policy (CSP) headers

### Vulnerability Prevention
```javascript
// Input Validation
- Email format validation
- Password strength requirements
- Username length limits
- File upload type restrictions

// Output Encoding
- XSS prevention in React (auto-escaping)
- Proper HTTP headers
- CORS whitelist

// Authentication
- Unique JWT secrets per environment
- Token expiration enforcement
- Invalid token rejection
```

---

## 📚 Documentation

### Getting Started
- **[QUICK_START.md](./QUICK_START.md)** - 5-minute setup guide
- **[START_HERE.txt](./START_HERE.txt)** - First-time setup instructions
- **[AUTH_SETUP.md](./AUTH_SETUP.md)** - Complete authentication documentation

### Advanced Documentation
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - What was implemented
- **[GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)** - Google OAuth integration guide
- **[REPORT.md](./REPORT.md)** - Detailed implementation report
- **[TEST_DATA.md](./TEST_DATA.md)** - Test data reference

### Database Documentation
- **[DATABASE_SCHEMA.md](./backend/DATABASE_SCHEMA.md)** - Complete database schema
- **[GMAIL_SETUP.md](./backend/GMAIL_SETUP.md)** - Email service setup

### Code Comments
All source files include comprehensive comments explaining functionality and key concepts.

---

## 🐛 Troubleshooting

### Backend Issues

**Port already in use (Port 4000)**
```bash
# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :4000
kill -9 <PID>
```

**Module not found errors**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

**JWT errors**
```bash
# Check .env has JWT_SECRET set
cat .env

# Check token in localStorage (browser console)
localStorage.getItem('token')
```

**Database connection error**
```bash
# Verify MongoDB is running
mongod --version

# Check MONGODB_URI in .env
# Default: mongodb://localhost:27017/cmes-user
```

### Frontend Issues

**Port in use (Port 3000)**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :3000
kill -9 <PID>
```

**Dependencies not installing**
```bash
cd frontend
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**Build errors**
```bash
npm run build 2>&1 | head -50  # See first 50 lines of error
```

**Styles not loading**
```bash
# Rebuild Tailwind CSS
npm run build

# Clear browser cache (Ctrl+Shift+Delete in Chrome)
```

### Authentication Issues

**Can't login**
- Verify email/password are correct
- Check user exists in database
- Verify backend is running on port 4000
- Check network tab in DevTools for API errors

**Token errors**
```bash
# Clear localStorage and login again
localStorage.clear()

# Or in browser console:
// Decode token to verify
const token = localStorage.getItem('token');
console.log(JSON.parse(atob(token.split('.')[1])));
```

**Protected routes redirect to login**
- Verify token exists: `localStorage.getItem('token')`
- Check token hasn't expired: Use https://jwt.io
- Verify backend can validate token: Check server logs

### Common Error Messages

| Error | Solution |
|-------|----------|
| `ERR_MODULE_NOT_FOUND` | Run `npm install` in the affected directory |
| `Port already in use` | Kill process on port or change PORT in .env |
| `JWT malformed` | Clear localStorage and login again |
| `CORS error` | Verify CORS middleware in backend is enabled |
| `Cannot POST /api/auth/register` | Backend not running or wrong URL |
| `axios is not defined` | Check axios is imported at top of file |

---

## 🚀 Deployment

### Frontend Deployment

**Vercel (Recommended for React)**
```bash
npm install -g vercel
cd frontend
vercel
```

**Netlify**
```bash
npm run build
npm install -g netlify-cli
netlify deploy --prod --dir=build
```

**GitHub Pages**
```bash
# Update package.json
{
  "homepage": "https://username.github.io/CMES-USER"
}

npm run build
npm install gh-pages --save-dev
npm run deploy
```

### Backend Deployment

**Vercel/Netlify Functions**
```bash
npm install -g @netlify/cli
netlify functions:create auth
netlify deploy
```

**Heroku**
```bash
heroku login
heroku create cmes-user-backend
heroku config:set JWT_SECRET=your-secret
git push heroku main
heroku logs --tail
```

**Railway**
```bash
npm install -g railway
railway link
railway up
```

**Docker**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 4000
CMD ["node", "server.js"]
```

```bash
docker build -t cmes-user-backend .
docker run -p 4000:4000 --env-file .env cmes-user-backend
```

### Full Stack Deployment (Azure/AWS)

**Azure App Service**
```bash
az login
az appservice plan create --name cmes-plan --resource-group mygroup --sku B1 --is-linux
az webapp create --resource-group mygroup --plan cmes-plan --name cmes-app --runtime "NODE|18-lts"
```

**AWS Elastic Beanstalk**
```bash
pip install awsebcli
eb init -p node.js-18 CMES-USER
eb create cmes-env
eb deploy
```

---

## 🎯 Roadmap

### ✅ Completed Features
- [x] Email/Password authentication
- [x] JWT token system with 7-day expiration
- [x] Protected routes and access control
- [x] User profile management
- [x] Password hashing with bcryptjs
- [x] Modern UI with Tailwind CSS
- [x] Form validation
- [x] Socket.io real-time updates
- [x] MongoDB integration
- [x] File upload system
- [x] Payment processing
- [x] Report generation

### 🔄 In Progress
- [ ] Google OAuth integration
- [ ] Email verification on registration
- [ ] Password reset functionality
- [ ] User avatar upload and management
- [ ] Two-factor authentication (2FA)
- [ ] Advanced analytics and charts
- [ ] Mobile-responsive design improvements

### 📋 Planned Features
- [ ] Social login (Facebook, GitHub)
- [ ] Refresh token implementation
- [ ] Account deletion/GDPR compliance
- [ ] Login history and device tracking
- [ ] API documentation (Swagger/OpenAPI)
- [ ] GraphQL API support
- [ ] Real-time notifications
- [ ] Webhooks for external integrations
- [ ] Rate limiting and DDoS protection
- [ ] A/B testing framework

### 🚀 Performance & Optimization
- [ ] Database query optimization
- [ ] Caching strategy (Redis)
- [ ] CDN integration for static assets
- [ ] Image optimization and compression
- [ ] Code splitting and lazy loading
- [ ] Lighthouse optimization

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

## 💡 Tips & Tricks

1. **Development Workflow**
   - Run frontend and backend in separate terminals
   - Use `npm run dev` for auto-reload with nodemon
   - Monitor both terminal outputs for errors

2. **Token Management**
   - Decode tokens at https://jwt.io
   - Check expiration: `new Date(payload.exp * 1000)`
   - Token stored in localStorage under key `token`

3. **API Debugging**
   - Use DevTools Network tab to inspect requests/responses
   - Use VS Code REST Client extension for API testing
   - Enable verbose logging in .env: `DEBUG=app:*`

4. **Database Management**
   - Use MongoDB Compass GUI to view/edit data
   - Regular backups before major changes
   - Use read-only mode for production queries

5. **Performance**
   - Profile React components with React DevTools
   - Check bundle size: `npm run build`
   - Monitor API response times in Network tab

6. **Testing Strategies**
   - Test authentication flow first
   - Use consistent test data (see TEST_DATA.md)
   - Test edge cases and error scenarios

---

## 📞 Support & Community

### Getting Help
1. **Documentation**
   - Check [QUICK_START.md](./QUICK_START.md) first
   - Review [AUTH_SETUP.md](./AUTH_SETUP.md) for detailed API info
   - See [REPORT.md](./REPORT.md) for implementation details

2. **Debugging**
   - Check backend terminal for server errors
   - Check browser console for client-side errors
   - Review Network tab for API issues
   - Verify .env configuration

3. **Common Issues**
   - See [Troubleshooting](#-troubleshooting) section
   - Check error message in the documentation
   - Verify all services are running

### Reporting Issues
When reporting issues, include:
- Error message and stack trace
- Steps to reproduce
- Environment details (OS, Node version, etc.)
- Relevant logs from backend/frontend

### Contributing
- Fork the repository
- Create feature branch: `git checkout -b feature/amazing-feature`
- Commit changes: `git commit -m 'Add amazing feature'`
- Push to branch: `git push origin feature/amazing-feature`
- Open Pull Request

---

## 📄 License

ISC License - You are free to use this project for personal and commercial purposes.

See [LICENSE](./LICENSE) for details.

---

**Happy Coding! 🚀**

For quick setup, see [QUICK_START.md](./QUICK_START.md)

Last updated: January 28, 2026

---

## ✨ Latest Updates

### Version 2.1.0 (January 2026)

**New Features**
- ✅ Real-time updates with Socket.io integration
- ✅ Advanced report generation and export
- ✅ Image upload with OCR support (Tesseract.js)
- ✅ Payment slip processing
- ✅ User avatar management
- ✅ Enhanced security with bcryptjs
- ✅ MongoDB integration for persistent storage
- ✅ Responsive design with Tailwind CSS v4

**Technical Updates**
- 🔄 React v19.1.0 with latest hooks API
- 🔄 Express v4.18.2 with modern middleware
- 🔄 React Router v7.6.3 for client-side routing
- 🔄 Mongoose v8.0.0 for MongoDB ORM
- 🔄 Axios v1.10.0 for HTTP requests
- 🔄 Socket.io v4.8.1 for real-time communication

**Bug Fixes & Improvements**
- 🐛 Fixed token expiration handling
- 🐛 Improved error messages and logging
- 🐛 Enhanced form validation
- 🐛 Better mobile responsiveness
- 🐛 Optimized bundle size
- 🐛 Reduced API response times

### Previous Versions
- **Version 2.0.0** - Complete authentication system
- **Version 1.0.0** - Initial release with basic features

### Version History
```
2.1.0 (Jan 2026) - Real-time features and OCR support
2.0.0 (Dec 2025) - Authentication system
1.0.0 (Nov 2025) - Initial release
```
