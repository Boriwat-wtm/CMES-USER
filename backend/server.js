import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import multer from "multer";
import Tesseract from "tesseract.js";
import fetch from "node-fetch";
import FormData from "form-data";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import bodyParser from "body-parser";
import axios from "axios";
import http from "http";
import { Server as SocketIoServer } from "socket.io";
import mongoose from "mongoose";
import authRoutes from "./routes/auth-mongodb.js";
import Report from "./models/Report.js";
import { optionalAuth } from "./middleware/authMiddleware.js";
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS Configuration - รองรับ Development และ Production
const allowedOrigins = [
  'http://localhost:3000',                    // User Frontend (Dev)
  'http://localhost:3001',                    // Admin Frontend (Dev)
  'https://cmesuserfrontend.vercel.app',      // User Frontend (Production)
  'https://cmesadminfrontend.vercel.app',     // Admin Frontend (Production)
  process.env.USER_FRONTEND_URL,              // User Frontend (Custom)
  process.env.ADMIN_FRONTEND_URL,             // Admin Frontend (Custom)
].filter(Boolean); // กรอง undefined ออก

app.use(cors({
  origin: function (origin, callback) {
    // อนุญาต requests ที่ไม่มี origin (เช่น mobile apps, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


const port = process.env.PORT ? Number(process.env.PORT) : 4000;
const ADMIN_API_BASE = (process.env.ADMIN_API_BASE || "https://cmes-admin-server.onrender.com").replace(/\/$/, "");

const expectedAmount = parseInt(process.env.EXPECTED_AMOUNT, 10);

app.use(bodyParser.json());
app.use(express.static("uploads"));
app.use(express.json());

// ===== MONGODB CONNECTION =====
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://admin:password@cluster0.mongodb.net/?retryWrites=true&w=majority";

mongoose.connect(MONGODB_URI, { dbName: 'cmes-user' })
  .then(() => {
    console.log("✓ Connected to MongoDB");
  })
  .catch((err) => {
    console.error("✗ MongoDB connection error:", err);
    process.exit(1);
  });

// ===== AUTH ROUTES =====
app.use("/api/auth", authRoutes);

// ===== CLOUDINARY CONFIGURATION =====
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dfcqbb9pt', 
  api_key: process.env.CLOUDINARY_API_KEY || '396185692714272', 
  api_secret: process.env.CLOUDINARY_API_SECRET // ⚠️ ต้องใส่ใน .env file
});

console.log("✓ Cloudinary configured:", {
  cloud_name: cloudinary.config().cloud_name,
  api_key: cloudinary.config().api_key ? '***' + cloudinary.config().api_key.slice(-4) : 'NOT SET'
});

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// ----- User Management -----
const usersFile = path.join(__dirname, "users-data.json");
function loadUsers() {
  try {
    if (fs.existsSync(usersFile)) {
      const data = fs.readFileSync(usersFile, "utf8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Error loading users:", e);
  }
  return {};
}

function saveUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

app.get("/api/check-phone", (req, res) => {
  try {
    const phone = req.query.phone;
    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone number required" });
    }
    const users = loadUsers();
    const userExists = !!users[phone];
    if (userExists) {
      res.json({ success: true, exists: true, user: users[phone] });
    } else {
      res.json({ success: true, exists: false, message: "Phone not registered yet" });
    }
  } catch (err) {
    console.error("[Backend /api/check-phone] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/user-profile", (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ success: false, message: "No token" });
    }
    const phone = Buffer.from(token, "base64").toString("utf8");
    const users = loadUsers();
    const userData = users[phone];
    if (!userData) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, user: userData });
  } catch (err) {
    console.error("Error getting user profile:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/update-profile", (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ success: false, message: "No token" });
    }
    const phone = Buffer.from(token, "base64").toString("utf8");
    const { username, email, birthday, avatar } = req.body;
    const users = loadUsers();
    if (!users[phone]) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    users[phone] = {
      ...users[phone],
      username: username || users[phone].username || "",
      email: email || users[phone].email || "",
      birthday: birthday || users[phone].birthday || "",
      avatar: avatar || users[phone].avatar || null,
      lastUpdated: new Date().toISOString()
    };
    saveUsers(users);
    res.json({ success: true, user: users[phone] });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/check-birthday", async (req, res) => {
  try {
    const birthdayStr = req.query.birthday;
    if (!birthdayStr) {
      return res.json({ isBirthday: false });
    }
    const parts = birthdayStr.split('/');
    if (parts.length !== 3) {
      return res.json({ isBirthday: false });
    }
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const today = new Date();
    const todayDay = today.getDate();
    const todayMonth = today.getMonth() + 1;
    const isBirthday = day === todayDay && month === todayMonth;
    res.json({
      isBirthday,
      debug: {
        birthday: birthdayStr,
        todayDay,
        todayMonth,
        serverTime: today.toISOString()
      }
    });
  } catch (err) {
    console.error("Error checking birthday:", err);
    res.status(500).json({ isBirthday: false, error: err.message });
  }
});

const avatarDir = path.join(__dirname, "uploads/avatars");
const slipDir = path.join(__dirname, "uploads/slips");
const genericDir = path.join(__dirname, "uploads/others");

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });
if (!fs.existsSync(slipDir)) fs.mkdirSync(slipDir, { recursive: true });
if (!fs.existsSync(genericDir)) fs.mkdirSync(genericDir, { recursive: true });

// Serve static files specific folders
app.use("/uploads/avatars", express.static(avatarDir));
app.use("/uploads/slips", express.static(slipDir));
app.use("/uploads", express.static(genericDir)); // fallback or others

// ----- Cloudinary Storage Configs -----

// 1. Avatar Storage (Cloudinary)
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'cmes/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }],
    public_id: (req, file) => `avatar-${Date.now()}`
  }
});

// 2. Slip Storage (Cloudinary)
const slipStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'cmes/slips',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
    public_id: (req, file) => `slip-${Date.now()}`
  }
});

// 3. Generic Storage (Cloudinary)
const genericStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'cmes/others',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'pdf'],
    public_id: (req, file) => `file-${Date.now()}`
  }
});

const uploadAvatar = multer({ 
  storage: avatarStorage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

const uploadSlip = multer({ 
  storage: slipStorage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

const uploadGeneric = multer({ 
  storage: genericStorage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

// ----- Gift Orders Storage -----
const giftOrdersPath = path.join(__dirname, "gift-orders.json");
let giftOrders = [];

if (fs.existsSync(giftOrdersPath)) {
  try {
    giftOrders = JSON.parse(fs.readFileSync(giftOrdersPath, "utf8"));
  } catch (error) {
    console.warn("Failed to read gift-orders.json, starting fresh", error);
    giftOrders = [];
  }
} else {
  fs.writeFileSync(giftOrdersPath, JSON.stringify([], null, 2));
}

function saveGiftOrders() {
  fs.writeFileSync(giftOrdersPath, JSON.stringify(giftOrders, null, 2));
}

async function fetchGiftSettingsFromAdmin() {
  const response = await fetch(`${ADMIN_API_BASE}/api/gifts/settings`);
  if (!response.ok) {
    throw new Error("ไม่สามารถดึงข้อมูลสินค้าได้");
  }
  return response.json();
}

app.post("/api/report", optionalAuth, async (req, res) => {
  const { category, detail } = req.body;
  if (!category || !detail) {
    return res.status(400).json({ status: "error", message: "category and detail are required" });
  }
  
  try {
    // บันทึกลง MongoDB ก่อน (พร้อม userId ถ้ามี)
    const reportData = {
      category,
      detail,
      userId: req.userId || null,  // จาก optionalAuth middleware
      status: "open"
    };
    
    const newReport = await Report.create(reportData);
    console.log("✓ Report saved to MongoDB:", newReport._id);
    
    // พยายามส่งไป Admin API (แต่ไม่ให้ล้มถ้า Admin API มีปัญหา)
    try {
      const adminRes = await fetch(`${ADMIN_API_BASE}/api/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, detail }),
      });
      
      if (adminRes.ok) {
        console.log("✓ Report forwarded to Admin API");
      } else {
        console.warn("⚠ Admin API returned error, but report saved locally");
      }
    } catch (adminErr) {
      console.warn("⚠ Failed to forward to Admin API, but report saved locally:", adminErr.message);
    }
    
    // ส่ง response สำเร็จ (เพราะบันทึกลง MongoDB แล้ว)
    res.json({ 
      status: "ok", 
      message: "Report saved successfully",
      reportId: newReport._id 
    });
    
  } catch (err) {
    console.error("✗ Failed to save report:", err);
    res.status(500).json({ 
      status: "error", 
      message: "Failed to save report to database" 
    });
  }
});

// เพิ่ม API OCR (ใช้ Generic ไปก่อน หรือจะเปลี่ยนเป็น Slip ก็ได้ถ้าเป็นสลิป)
app.post("/api/ocr", uploadGeneric.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: "error", message: "No file uploaded" });
  }
  try {
    const { data: { text } } = await Tesseract.recognize(
      req.file.path,
      "tha+eng"
    );
    res.json({ status: "ok", text });
  } catch (err) {
    res.status(500).json({ status: "error", message: "OCR failed" });
  }
});

// API Verify Slip (ใช้ uploadSlip)
app.post("/verify-slip", uploadSlip.single("slip"), async (req, res) => {
  console.log("===> เข้ามา /verify-slip แล้ว");
  let status = "failed";
  let detail = "";
  const amount = req.body.amount;

  if (!req.file) {
    console.log("===> ไม่พบไฟล์สลิป");
    detail = "ไม่พบไฟล์สลิป";
    await fetch(`${ADMIN_API_BASE}/api/stat-slip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "payment", detail, status, amount }),
    });
    return res.json({ success: false, message: detail });
  }

  try {
    console.log("===> เริ่ม OCR");
    console.log("===> Slip URL:", req.file.path); // Cloudinary URL
    const { data: { text } } = await Tesseract.recognize(
      req.file.path, // Cloudinary URL (Tesseract supports URLs)
      "tha+eng"
    );
    const textArabic = thaiToArabic(text);
    const cleanText = textArabic.replace(/[\s,\,\.]/g, "");
    const cleanAmount = String(amount).replace(/[\s,\,\.]/g, "");
    const cleanAmountDot = String(Number(amount).toFixed(2)).replace(/[\s,\,\.]/g, "");

    console.log("OCR TEXT:", text);
    console.log("cleanText:", cleanText);
    console.log("cleanAmount:", cleanAmount);
    console.log("cleanAmountDot:", cleanAmountDot);

    // ตัวเลือกที่ 1: ตรงกับจำนวนเงิน + "บาท"
    const match1 = cleanText.includes(cleanAmount + "บาท");
    const match2 = cleanText.includes(cleanAmountDot + "บาท");

    // ตัวเลือกที่ 2: ตรงกับจำนวนเงินแบบตรงตัว (แต่ต้องไม่ซ้อนกับเลขอื่น)
    const match3 = cleanText.split("บาท")[0].endsWith(cleanAmount);
    const match4 = cleanText.split("บาท")[0].endsWith(cleanAmountDot);

    console.log("match1:", match1, "match2:", match2, "match3:", match3, "match4:", match4);

    // ลบสลิปออกจาก Cloudinary หลัง OCR เสร็จ (ไม่ว่าจะผ่านหรือไม่ผ่าน)
    const deleteSlip = async () => {
      if (req.file && req.file.filename) {
        try {
          // Extract public_id from Cloudinary URL
          const publicId = req.file.filename; // Cloudinary storage จะเก็บ public_id ไว้ใน filename
          await cloudinary.uploader.destroy(publicId);
          console.log("✓ Deleted slip from Cloudinary:", publicId);
        } catch (err) {
          console.error("Failed to delete slip:", err);
        }
      }
    };

    if (match1 || match2 || match3 || match4) {
      status = "success";
      detail = `ชำระเงินสำเร็จ จำนวนเงิน: ${amount}`;
      console.log("===> ตรวจพบจำนวนเงินในสลิป");
      
      // ลบสลิปทันทีหลังยืนยันการชำระเงิน
      await deleteSlip();
      
      await fetch(`${ADMIN_API_BASE}/api/stat-slip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "payment", detail, status, amount }),
      });
      return res.json({ success: true });
    } else {
      detail = "ชำระเงินไม่ถูกต้อง หรือจำนวนเงินไม่ตรง";
      console.log("===> ชำระเงินไม่ถูกต้อง หรือจำนวนเงินไม่ตรง");
      
      // ลบสลิปแม้จะไม่ผ่านเพื่อป้องกันการเก็บสะสม
      await deleteSlip();
      
      await fetch(`${ADMIN_API_BASE}/api/stat-slip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "payment", detail, status, amount }),
      });
      return res.json({ success: false, message: detail });
    }
  } catch (err) {
    detail = "OCR ผิดพลาด";
    console.log("===> OCR ผิดพลาด", err);
    
    // ลบสลิปแม้เกิด error
    if (req.file && req.file.filename) {
      try {
        await cloudinary.uploader.destroy(req.file.filename);
        console.log("✓ Deleted slip after error");
      } catch (delErr) {
        console.error("Failed to delete slip:", delErr);
      }
    }
    
    await fetch(`${ADMIN_API_BASE}/api/stat-slip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "payment", detail, status, amount }),
    });
    return res.json({ success: false, message: detail });
  }
});

function thaiToArabic(str) {
  return str.replace(/[๐-๙]/g, d => "0123456789"["๐๑๒๓๔๕๖๗๘๙".indexOf(d)]);
}

// เก็บข้อมูลรอชำระเงิน
let pendingUploads = new Map();

// API สำหรับบันทึกข้อมูลรอชำระเงิน (ใช้ generic หรือแยกก็ได้ แต่เดิมใช้ upload.single("file"))
// User ส่ง file ขึ้นหน้าจอ (ไม่ใช่สลิป ไม่ใช่อวตาร) -> ใช้ Generic หรือ User Uploads
// Upload endpoint รองรับ file + qrCode
const uploadFields = uploadGeneric.fields([
  { name: 'file', maxCount: 1 },
  { name: 'qrCode', maxCount: 1 }
]);

app.post("/api/upload", uploadFields, (req, res) => {
  try {
    const { text, type, time, price, sender, userId, email, avatar, textColor, socialType, socialName } = req.body;
    const uploadId = Date.now().toString();

    console.log('[/api/upload] Request received:', {
      type,
      hasFile: !!req.files?.file,
      hasQR: !!req.files?.qrCode,
      sender,
      userId
    });

    const uploadData = {
      id: uploadId,
      text: text || '',
      type,
      time,
      price,
      sender: sender || 'Unknown',
      userId: userId || 'guest',
      email: email || '',
      avatar: avatar || '',
      textColor: textColor || 'white',
      socialType: socialType || '',
      socialName: socialName || '',
      file: req.files?.file?.[0]?.filename || null,
      filePath: req.files?.file?.[0]?.path || null, // Cloudinary URL
      qrCodeFile: req.files?.qrCode?.[0]?.filename || null,
      qrCodePath: req.files?.qrCode?.[0]?.path || null, // Cloudinary URL
      timestamp: new Date(),
      status: 'pending'
    };

    // เก็บข้อมูลรอชำระเงิน
    pendingUploads.set(uploadId, uploadData);
    console.log(`[/api/upload] ✓ Upload ${uploadId} saved, expires in 10 mins`);

    // ตั้งเวลายกเลิก 10 นาที
    setTimeout(() => {
      if (pendingUploads.has(uploadId)) {
        console.log(`[/api/upload] Upload ${uploadId} expired after 10 minutes`);
        pendingUploads.delete(uploadId);
      }
    }, 10 * 60 * 1000); // 10 นาที

    res.json({ 
      success: true, 
      uploadId,
      fileUrl: uploadData.filePath,
      qrCodeUrl: uploadData.qrCodePath
    });
  } catch (error) {
    console.error('[/api/upload] Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Upload failed: ' + error.message 
    });
  }
});

// API สำหรับยืนยันการชำระเงิน
app.post("/api/confirm-payment", async (req, res) => {
  try {
    const { uploadId, userId, email, avatar } = req.body;

    if (!uploadId) {
      return res.status(400).json({ success: false, message: 'Missing uploadId' });
    }

    const uploadData = pendingUploads.get(uploadId);

    if (!uploadData) {
      return res.status(404).json({ success: false, message: 'Upload not found or expired' });
    }

    // ส่งข้อมูลไปยัง Admin backend
    const formData = new FormData();
    formData.append('text', uploadData.text || '');
    formData.append('type', uploadData.type);
    formData.append('time', uploadData.time.toString());
    formData.append('price', uploadData.price.toString());
    formData.append('sender', uploadData.sender);
    formData.append('textColor', uploadData.textColor || 'white');
    formData.append('socialType', uploadData.socialType || '');
    formData.append('socialName', uploadData.socialName || '');

    // เพิ่มข้อมูล user
    if (userId) formData.append('userId', userId);
    if (email) formData.append('email', email);
    if (avatar) formData.append('avatar', avatar);

    // ส่งไฟล์หากมี (Cloudinary URL)
    if (uploadData.filePath) {
      formData.append('imageUrl', uploadData.filePath);
      console.log('[/api/confirm-payment] ✓ Sending image URL:', uploadData.filePath);
    }

    // ส่ง QR Code หากมี (Cloudinary URL)
    if (uploadData.qrCodePath) {
      formData.append('qrCodeUrl', uploadData.qrCodePath);
      console.log('[/api/confirm-payment] ✓ Sending QR Code URL:', uploadData.qrCodePath);
    }

    // ส่งข้อมูลไปยัง Admin backend
    const response = await fetch(`${ADMIN_API_BASE}/api/upload`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    if (response.ok) {
      // ลบข้อมูลออกจากรายการรอชำระเงิน
      pendingUploads.delete(uploadId);

      console.log('Successfully sent to admin backend');
      res.json({ success: true, message: 'Payment confirmed and data sent to admin' });
    } else {
      throw new Error('Failed to send to admin backend');
    }

  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการยืนยันการชำระเงิน' });
  }
});

// API สำหรับตรวจสอบสถานะ upload
app.get("/api/upload-status/:uploadId", (req, res) => {
  const { uploadId } = req.params;

  if (pendingUploads.has(uploadId)) {
    const data = pendingUploads.get(uploadId);
    res.json({ exists: true, status: data.status });
  } else {
    res.json({ exists: false });
  }
});

// API สำหรับอัปโหลดรูปภาพและข้อความ (Generic)
app.post("/upload-content", uploadGeneric.single("image"), (req, res) => {
  const { message } = req.body;
  const baseUrl = process.env.BASE_URL || `https://cmes-user.onrender.com`;
  const imageUrl = req.file ? `${baseUrl}/uploads/others/${req.file.filename}` : null;

  console.log("Message:", message);
  console.log("Image URL:", imageUrl);

  res.json({ success: true, message, imageUrl });
});

// API สำหรับอัปโหลด Avatar เฉพาะ
app.post("/api/upload-avatar", uploadAvatar.single("avatar"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    // Cloudinary returns URL in req.file.path
    const imageUrl = req.file.path;
    console.log("✓ Avatar uploaded to Cloudinary:", imageUrl);
    res.json({ success: true, imageUrl });
  } catch (error) {
    console.error("Upload avatar failed", error);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
});

// API เดิมสำหรับอัปโหลดรูปภาพ (Generic)
app.post("/upload", uploadGeneric.single("image"), (req, res) => {
  // Cloudinary returns URL in req.file.path
  const imageUrl = req.file.path;
  console.log("✓ Generic file uploaded to Cloudinary:", imageUrl);
  res.json({ imageUrl });
});

// Endpoint สำหรับส่ง OTP
app.post("/send-otp", async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ success: false, message: "กรุณาระบุหมายเลขโทรศัพท์" });
  }

  if (!/^\d{10}$/.test(phone)) {
    return res.status(400).json({ success: false, message: "หมายเลขโทรศัพท์ไม่ถูกต้อง" });
  }

  const config = {
    method: 'post',
    url: 'https://portal-otp.smsmkt.com/api/otp-send',
    headers: {
      "Content-Type": "application/json",
      "api_key": "2607fce6276d1f68e8d543e953d76bc4",
      "secret_key": "5yX5m9LcHVNks99i",
    },
    data: JSON.stringify({
      "project_key": "69a425bf4f",
      "phone": phone,
    })
  };

  try {
    const response = await axios(config);
    console.log(JSON.stringify(response.data));

    if (response.data.code === "000") {
      res.json({
        success: true,
        message: "OTP ส่งสำเร็จ",
        token: response.data.result.token,
      });
    } else {
      res.status(400).json({
        success: false,
        message: response.data.detail,
      });
    }
  } catch (error) {
    console.error("Error sending OTP:", error.message || error);
    res.status(500).json({ success: false, message: "ไม่สามารถส่ง OTP ได้" });
  }
});

// ตรวจสอบ OTP
app.post("/verify-otp", async (req, res) => {
  const { otp, token } = req.body;

  if (!otp || !token) {
    return res.status(400).json({ success: false, message: "กรุณาระบุ OTP และ token" });
  }

  const verifyData = {
    otp_code: otp,
    token: token,
    ref_code: "",
  };

  const config = {
    method: "post",
    url: "https://portal-otp.smsmkt.com/api/otp-validate",
    headers: {
      "Content-Type": "application/json",
      api_key: "2607fce6276d1f68e8d543e953d76bc4",
      secret_key: "5yX5m9LcHVNks99i",
    },
    data: JSON.stringify(verifyData),
  };

  try {
    const response = await axios(config);

    if (response.data.code === "000") {
      res.json({ success: true, message: "OTP verified successfully" });
    } else {
      console.error("SMSMKT Error:", response.data.detail);
      res.status(400).json({ success: false, message: response.data.detail });
    }
  } catch (error) {
    console.error("Error verifying OTP:", error.message || error);
    res.status(500).json({ success: false, message: "ไม่สามารถตรวจสอบ OTP ได้" });
  }
});

// ตรวจสอบการชำระเงิน
app.post("/verify-payment", (req, res) => {
  const { amount, method } = req.body;

  if (!amount || !method) {
    return res.status(400).json({ success: false, message: "กรุณาระบุจำนวนเงินและวิธีการชำระเงิน" });
  }

  if (amount === expectedAmount && method === "promptpay") {
    return res.json({ success: true });
  } else {
    return res.json({ success: false });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

// Socket.IO setup
const server = http.createServer(app);
const io = new SocketIoServer(server, { cors: { origin: "*" } });

let config = {
  enableImage: true,
  enableText: true,
  price: 100,
  time: 10
};

app.get("/api/status", (req, res) => {
  res.json(config);
});

io.on("connection", (socket) => {
  socket.emit("configUpdate", config);

  socket.on("adminUpdateConfig", (newConfig) => {
    config = { ...config, ...newConfig };
    io.emit("configUpdate", config);
  });
});

// เปลี่ยนจาก app.listen เป็น server.listen
server.listen(port, () => {
  console.log(`Server + WebSocket running on http://localhost:${port}`);
});

// ----- Gift APIs -----
app.get("/api/gifts", async (req, res) => {
  try {
    const settings = await fetchGiftSettingsFromAdmin();
    res.json({ success: true, settings });
  } catch (error) {
    console.error("Fetch gift settings failed", error);
    res.status(500).json({ success: false, message: "ไม่สามารถโหลดข้อมูลสินค้า" });
  }
});

app.post("/api/gifts/order", async (req, res) => {
  try {
    const { items, tableNumber, note, senderName } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "กรุณาเลือกรายการสินค้า" });
    }

    const settings = await fetchGiftSettingsFromAdmin();
    const maxTable = Number(settings.tableCount) || 0;
    const table = Number(tableNumber);
    if (!table || table < 1 || (maxTable && table > maxTable)) {
      return res.status(400).json({ success: false, message: "เลขโต๊ะไม่ถูกต้อง" });
    }

    const validItems = items
      .map((orderItem) => {
        const found = (settings.items || []).find((item) => item.id === orderItem.id);
        if (!found) return null;
        const qty = Number(orderItem.quantity) || 0;
        if (qty < 1) return null;
        return {
          id: found.id,
          name: found.name,
          price: Number(found.price) || 0,
          quantity: qty
        };
      })
      .filter(Boolean);

    if (validItems.length === 0) {
      return res.status(400).json({ success: false, message: "ไม่พบสินค้าที่เลือก" });
    }

    const totalPrice = validItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (totalPrice < 0) {
      return res.status(400).json({ success: false, message: "ยอดรวมไม่ถูกต้อง" });
    }

    const order = {
      id: `gift-${Date.now()}`,
      senderName: senderName?.trim() || "Guest",
      tableNumber: table,
      note: note ? note.trim() : "",
      items: validItems,
      totalPrice,
      status: "pending_payment",
      createdAt: new Date().toISOString()
    };

    giftOrders.push(order);
    saveGiftOrders();
    res.json({ success: true, order });
  } catch (error) {
    console.error("Create gift order failed", error);
    res.status(500).json({ success: false, message: "ไม่สามารถสร้างคำสั่งซื้อ" });
  }
});

app.get("/api/gifts/order/:orderId", (req, res) => {
  const { orderId } = req.params;
  const order = giftOrders.find((item) => item.id === orderId);
  if (!order) {
    return res.status(404).json({ success: false, message: "ไม่พบคำสั่งซื้อ" });
  }
  res.json({ success: true, order });
});

app.post("/api/gifts/order/:orderId/confirm", async (req, res) => {
  const { orderId } = req.params;
  const { userId, email, avatar } = req.body; // รับข้อมูล user จาก frontend

  console.log("[Gift Order Confirm] orderId:", orderId);
  console.log("[Gift Order Confirm] userId:", userId);
  console.log("[Gift Order Confirm] email:", email);
  console.log("[Gift Order Confirm] avatar:", avatar);

  const order = giftOrders.find((item) => item.id === orderId);
  if (!order) {
    return res.status(404).json({ success: false, message: "ไม่พบคำสั่งซื้อ" });
  }
  if (order.status !== "pending_payment") {
    return res.status(400).json({ success: false, message: "คำสั่งซื้ออยู็ในสถานะที่ไม่สามารถยืนยันได้" });
  }

  order.status = "awaiting_admin";
  order.paidAt = new Date().toISOString();
  saveGiftOrders();

  try {
    const payload = {
      orderId: order.id,
      sender: order.senderName,
      userId: userId || null,
      email: email || null,
      avatar: avatar || null,
      tableNumber: order.tableNumber,
      note: order.note,
      items: order.items,
      totalPrice: order.totalPrice
    };

    console.log("[Gift Order Confirm] Sending to admin:", JSON.stringify(payload, null, 2));

    const adminResponse = await fetch(`${ADMIN_API_BASE}/api/gifts/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!adminResponse.ok) {
      console.error("[Gift Order Confirm] Admin response not OK:", adminResponse.status);
      order.status = "pending_payment";
      delete order.paidAt;
      saveGiftOrders();
      const message = await adminResponse.text();
      return res.status(502).json({ success: false, message: message || "ส่งข้อมูลไปยังฝั่งแอดมินไม่สำเร็จ" });
    }

    console.log("[Gift Order Confirm] Successfully sent to admin");
    res.json({ success: true, order });
  } catch (error) {
    console.error("Confirm gift order failed", error);
    order.status = "pending_payment";
    delete order.paidAt;
    saveGiftOrders();
    res.status(500).json({ success: false, message: "ไม่สามารถแจ้งฝั่งแอดมินได้" });
  }
});

app.get("/api/rankings/top", async (req, res) => {
  try {
    // Forward ไปยัง CMES-ADMIN
    const response = await fetch(`${ADMIN_API_BASE}/api/rankings/top`);
    if (!response.ok) {
      throw new Error("Failed to fetch rankings from admin");
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Fetch rankings failed", error);
    res.status(500).json({ success: false, message: "ไม่สามารถโหลดอันดับ" });
  }
});