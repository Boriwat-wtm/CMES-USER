# Database Schema Documentation

## CMES-USER Database Models

### 1. User (auth-mongodb.js)
Stores user account information
```
- email: String (unique, required)
- username: String (unique, required)
- password: String (nullable, for email auth)
- googleId: String (nullable, for Google OAuth)
- avatar: String
- birthday: String (DD/MM format)
- lastBirthdayEdit: Date
- emailVerified: Boolean
- authMethod: "email" | "google"
- createdAt: Date
- updatedAt: Date
```

### 2. GiftOrder
Stores gift order information
```
- orderId: String (unique, required)
- senderName: String
- tableNumber: Number
- note: String
- items: Array of { id, name, price, quantity }
- totalPrice: Number
- status: "pending_payment" | "paid" | "completed" | "cancelled" | "awaiting_admin" | "processing"
- paymentMethod: String
- userId: ObjectId (ref: User)
- createdAt: Date
- updatedAt: Date
```

### 3. Report
Stores user-submitted reports
```
- category: "display" | "technical" | "payment" | "other"
- detail: String
- userId: ObjectId (ref: User)
- status: "open" | "in-progress" | "resolved" | "closed"
- createdAt: Date
- updatedAt: Date
```

### 4. GiftSetting
Stores gift product information
```
- giftId: String (unique, required)
- giftName: String
- description: String
- price: Number
- available: Boolean
- stock: Number
- image: String
- category: String
- createdAt: Date
- updatedAt: Date
```

---

## CMES-ADMIN Database Models

### 1. AdminUser
Stores admin account information
```
- username: String (unique, required)
- password: String (required)
- role: "super_admin" | "admin" | "moderator"
- email: String
- permissions: Array of String
- lastLogin: Date
- isActive: Boolean
- createdAt: Date
- updatedAt: Date
```

### 2. Ranking
Stores donation ranking
```
- name: String (required, trim)
- points: Number (required)
- rank: Number (auto-calculated)
- avatar: String
- email: String
- createdAt: Date
- updatedAt: Date
```

### 3. GiftSetting
Stores gift product information (admin side)
```
- giftId: String (unique, required)
- giftName: String
- description: String
- price: Number
- available: Boolean
- stock: Number
- image: String
- category: String
- minDonationAmount: Number
- createdAt: Date
- updatedAt: Date
```

### 4. CheckHistory
Stores donation check/verification history
```
- giftId: String
- giftName: String
- senderName: String (required)
- tableNumber: Number
- amount: Number (required)
- status: "verified" | "pending" | "rejected"
- approvalDate: Date
- approvedBy: String
- notes: String
- userId: ObjectId (ref: User)
- createdAt: Date
- updatedAt: Date
```

### 5. AdminReport
Stores admin-side reports/issues
```
- reportId: String (unique, required)
- title: String
- description: String
- category: "technical" | "payment" | "display" | "other"
- priority: "low" | "medium" | "high" | "critical"
- status: "open" | "in-progress" | "resolved" | "closed"
- senderName: String
- senderEmail: String
- senderPhone: String
- assignedTo: String
- resolvedAt: Date
- resolution: String
- attachments: Array of String
- createdAt: Date
- updatedAt: Date
```

### 6. Setting
Stores system configuration/settings
```
- key: String (unique, required)
- value: Mixed (any type)
- description: String
- type: "string" | "number" | "boolean" | "json"
- createdAt: Date
- updatedAt: Date
```

---

## Migration Instructions

### For CMES-USER:
```bash
cd backend
node migrate-complete.js
```

### For CMES-ADMIN:
```bash
cd backend
node migrate-complete.js
```

Both scripts will:
1. Read existing JSON files
2. Create documents in MongoDB
3. Skip documents that already exist
4. Report success/failure for each record

After migration, you can safely delete the old JSON files.
