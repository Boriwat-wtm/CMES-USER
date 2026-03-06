// นำเข้าและกำหนดค่า environment variables จากไฟล์ .env
import dotenv from "dotenv";
dotenv.config();

// นำเข้า Express framework สำหรับสร้าง web server
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
// import Report from "./models/Report.js";  // ลบแล้ว — ไม่ save ลง cmes-user.reports อีกต่อไป
import { optionalAuth } from "./middleware/authMiddleware.js";
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// กำหนด __filename และ __dirname สำหรับ ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// สร้าง Express application
const app = express();

// ===== การตั้งค่า CORS (Cross-Origin Resource Sharing) =====
// รองรับทั้งสภาพแวดล้อม Development และ Production
const allowedOrigins = [
  'http://localhost:3000',                    // User Frontend (Dev)
  'http://localhost:3001',                    // Admin Frontend (Dev)
  'https://cmesuserfrontend.vercel.app',      // User Frontend (Production)
  'https://cmesadminfrontend.vercel.app',     // Admin Frontend (Production)
  process.env.USER_FRONTEND_URL,              // User Frontend (Custom)
  process.env.ADMIN_FRONTEND_URL,             // Admin Frontend (Custom)
].filter(Boolean); // กรอง undefined ออก

// ใช้ CORS middleware พร้อมกำหนดค่าการอนุญาต origin
app.use(cors({
  origin: function (origin, callback) {
    // อนุญาต requests ที่ไม่มี origin (เช่น mobile apps, Postman, curl)
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
  allowedHeaders: ['Content-Type', 'Authorization', 'x-shop-id']
}));


// กำหนดพอร์ตของเซิร์ฟเวอร์ (ค่าเริ่มต้น 5002)
const port = process.env.PORT ? Number(process.env.PORT) : 5002;
// URL ของ Admin API สำหรับเชื่อมต่อกับฝั่งแอดมิน
const ADMIN_API_BASE = (process.env.ADMIN_API_BASE || "https://cmes-admin-server.onrender.com").replace(/\/$/, "");

// จำนวนเงินที่คาดหวังสำหรับการชำระเงิน
const expectedAmount = parseInt(process.env.EXPECTED_AMOUNT, 10);

// ใช้ Body Parser middleware สำหรับแปลง JSON request body
app.use(bodyParser.json());
// เปิดให้เข้าถึงไฟล์ static ในโฟลเดอร์ uploads
app.use(express.static("uploads"));
// ใช้ Express JSON middleware
app.use(express.json());

// ===== การเชื่อมต่อ MONGODB DATABASE =====
// URI สำหรับเชื่อมต่อ MongoDB
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("✗ MONGODB_URI is not defined in .env file");
  process.exit(1);
}

// เชื่อมต่อกับ MongoDB database
mongoose.connect(MONGODB_URI, { dbName: 'cmes-user' })
  .then(() => {
    console.log("✓ Connected to MongoDB");
  })
  .catch((err) => {
    console.error("✗ MongoDB connection error:", err);
    process.exit(1);
  });

// ===== เส้นทาง (Routes) สำหรับการ Authentication =====
app.use("/api/auth", authRoutes);

// ===== การตั้งค่า CLOUDINARY สำหรับจัดเก็บไฟล์บนคลาวด์ =====
// ตั้งค่า Cloudinary API credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log("✓ Cloudinary configured:", {
  cloud_name: cloudinary.config().cloud_name,
  api_key: cloudinary.config().api_key ? '***' + cloudinary.config().api_key.slice(-4) : 'NOT SET'
});

// ตรวจสอบและสร้างโฟลเดอร์ uploads ถ้ายังไม่มี
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// ===== ระบบจัดการข้อมูลผู้ใช้ (User Management) =====
// ไฟล์ JSON สำหรับเก็บข้อมูลผู้ใช้
const usersFile = path.join(__dirname, "users-data.json");

// ฟังก์ชันโหลดข้อมูลผู้ใช้จากไฟล์ JSON
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

// ฟังก์ชันบันทึกข้อมูลผู้ใช้ลงไฟล์ JSON
function saveUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

// API ตรวจสอบหมายเลขโทรศัพท์ว่ามีในระบบหรือไม่
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

// API ดึงข้อมูลโปรไฟล์ผู้ใช้
app.get("/api/user-profile", (req, res) => {
  try {
    // ดึง token จาก Authorization header
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

// API อัปเดตข้อมูลโปรไฟล์ผู้ใช้
app.post("/api/update-profile", (req, res) => {
  try {
    // ดึง token เพื่อระบุตัวตนผู้ใช้
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

// API ตรวจสอบว่าวันนี้เป็นวันเกิดของผู้ใช้หรือไม่
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

// กำหนด path สำหรับโฟลเดอร์เก็บไฟล์แต่ละประเภท
const avatarDir = path.join(__dirname, "uploads/avatars");
const slipDir = path.join(__dirname, "uploads/slips");
const genericDir = path.join(__dirname, "uploads/others");

// สร้างโฟลเดอร์ทั้งหมดถ้ายังไม่มี
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });
if (!fs.existsSync(slipDir)) fs.mkdirSync(slipDir, { recursive: true });
if (!fs.existsSync(genericDir)) fs.mkdirSync(genericDir, { recursive: true });

// เปิดให้เข้าถึงไฟล์ static ในแต่ละโฟลเดอร์
app.use("/uploads/avatars", express.static(avatarDir));
app.use("/uploads/slips", express.static(slipDir));
app.use("/uploads", express.static(genericDir)); // สำหรับไฟล์ทั่วไป

// ===== การตั้งค่า Cloudinary Storage สำหรับแต่ละประเภทไฟล์ =====

// 1. กำหนดที่เก็บไฟล์รูปโปรไฟล์ (Avatar) บน Cloudinary
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'cmes/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }],
    public_id: (req, file) => `avatar-${Date.now()}`
  }
});

// 2. กำหนดที่เก็บไฟล์สลิปการชำระเงิน (Slip) บน Cloudinary
const slipStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'cmes/slips',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
    public_id: (req, file) => `slip-${Date.now()}`
  }
});

// 3. กำหนดที่เก็บไฟล์ทั่วไป (Generic) บน Cloudinary
const genericStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'cmes/others',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'pdf'],
    public_id: (req, file) => `file-${Date.now()}`
  }
});

// Multer middleware สำหรับอัปโหลดรูปโปรไฟล์ (ขนาดไฟล์สูงสุด 20MB)
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

// Multer middleware สำหรับอัปโหลดสลิปการชำระเงิน (ขนาดไฟล์สูงสุด 20MB)
const uploadSlip = multer({
  storage: slipStorage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

// Multer middleware สำหรับอัปโหลดไฟล์ทั่วไป (ขนาดไฟล์สูงสุด 20MB)
const uploadGeneric = multer({
  storage: genericStorage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

// ===== ระบบจัดเก็บข้อมูลคำสั่งซื้อของขวัญ (Gift Orders) =====
// ไฟล์ JSON สำหรับเก็บข้อมูลคำสั่งซื้อของขวัญ
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

// ฟังก์ชันบันทึกข้อมูลคำสั่งซื้อของขวัญลงไฟล์
function saveGiftOrders() {
  fs.writeFileSync(giftOrdersPath, JSON.stringify(giftOrders, null, 2));
}

// ฟังก์ชันดึงข้อมูลการตั้งค่าของขวัญจากฝั่ง Admin
async function fetchGiftSettingsFromAdmin(shopId = '') {
  const response = await fetch(`${ADMIN_API_BASE}/api/gifts/settings`, {
    headers: { 'x-shop-id': shopId }
  });
  if (!response.ok) {
    throw new Error("ไม่สามารถดึงข้อมูลสินค้าได้");
  }
  return response.json();
}

// API สำหรับส่งรายงานปัญหาหรือข้อเสนอแนะ (รองรับทั้งผู้ใช้ที่ล็อกอินและไม่ล็อกอิน)
// ส่ง report ไปยัง Admin API โดยตรง (ไม่ save ลง cmes-user.reports อีกต่อไป)
app.post("/api/report", optionalAuth, async (req, res) => {
  const { category, detail } = req.body;
  if (!category || !detail) {
    return res.status(400).json({ status: "error", message: "category and detail are required" });
  }

  try {
    const shopId = req.headers['x-shop-id'] || '';

    // Debug logging สำหรับ production
    console.log(`[Report] Forwarding to Admin API: ${ADMIN_API_BASE}/api/report`);
    console.log(`[Report] shopId: "${shopId}", category: "${category}"`);

    if (!shopId) {
      console.warn("[Report] ⚠ shopId is empty! Report will use fallback shopId on Admin side.");
    }

    // ส่ง report ไปยัง Admin API (primary action)
    const adminRes = await fetch(`${ADMIN_API_BASE}/api/report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-shop-id": shopId
      },
      body: JSON.stringify({ category, detail }),
    });

    if (!adminRes.ok) {
      const errBody = await adminRes.text();
      console.error(`[Report] ✗ Admin API error: ${adminRes.status}`, errBody);
      throw new Error(`Admin API returned ${adminRes.status}: ${errBody}`);
    }

    const adminData = await adminRes.json();
    console.log("[Report] ✓ Report saved to Admin:", adminData);

    // ส่ง response สำเร็จ
    res.json({
      status: "ok",
      message: "Report saved successfully",
      reportId: adminData.reportId || null
    });

  } catch (err) {
    console.error("[Report] ✗ Failed to save report:", err.message);
    res.status(500).json({
      status: "error",
      message: "Failed to save report"
    });
  }
});

// ===== API สำหรับแปลงรูปภาพเป็นข้อความด้วย OCR (Optical Character Recognition) =====
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

// ===== API สำหรับตรวจสอบความถูกต้องของสลิปการชำระเงินด้วย OCR =====
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

    // ฟังก์ชันลบสลิปออกจาก Cloudinary หลัง OCR เสร็จ (เพื่อประหยัดพื้นที่และปกป้องข้อมูล)
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

// ฟังก์ชันแปลงตัวเลขไทย (๐-๙) เป็นตัวเลขอารบิก (0-9)
function thaiToArabic(str) {
  return str.replace(/[๐-๙]/g, d => "0123456789"["๐๑๒๓๔๕๖๗๘๙".indexOf(d)]);
}

// เก็บข้อมูลการอัปโหลดที่รอการชำระเงิน (ใช้ Map เพื่อความเร็วในการค้นหา)
let pendingUploads = new Map();

// ===== API สำหรับบันทึกข้อมูลรอชำระเงิน =====
// รับไฟล์จากผู้ใช้ (รูปภาพ, QR Code) และเก็บไว้รอการยืนยันการชำระเงิน
// รองรับทั้งไฟล์ปกติและ QR Code
const uploadFields = uploadGeneric.fields([
  { name: 'file', maxCount: 1 },
  { name: 'qrCode', maxCount: 1 }
]);

// API อัปโหลดไฟล์และข้อมูลเพื่อรอการชำระเงิน
app.post("/api/upload", uploadFields, (req, res) => {
  try {
    // ดึงข้อมูลจาก request body
    const { text, type, time, price, sender, userId, email, avatar, textColor, socialColor, textLayout, socialType, socialName } = req.body;
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
      textColor: textColor || '#ffffff',
      socialColor: socialColor || '#ffffff',
      textLayout: textLayout || 'right',
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

    // ตั้งเวลายกเลิกคำขออัปโหลดอัตโนมัติหลังจาก 10 นาที (ป้องกันข้อมูลค้างในระบบ)
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

// ===== API สำหรับยืนยันการชำระเงินและส่งข้อมูลไปยัง Admin =====
app.post("/api/confirm-payment", async (req, res) => {
  try {
    const { uploadId, userId, email, avatar } = req.body;
    // รับ shopId จาก header ที่ Frontend ส่งมา แล้วส่งต่อไปยัง Admin
    const shopId = req.headers['x-shop-id'] || '';

    if (!uploadId) {
      return res.status(400).json({ success: false, message: 'Missing uploadId' });
    }

    if (!shopId) {
      return res.status(400).json({ success: false, message: 'Missing shopId (x-shop-id header)' });
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
    formData.append('textColor', uploadData.textColor || '#ffffff');
    formData.append('socialColor', uploadData.socialColor || '#ffffff');
    formData.append('textLayout', uploadData.textLayout || 'right');
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

    // ส่งข้อมูลไปยัง Admin backend พร้อม x-shop-id header
    const response = await fetch(`${ADMIN_API_BASE}/api/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        ...formData.getHeaders(),
        'x-shop-id': shopId  // ✅ ส่ง shopId ไปด้วยเพื่อผ่าน requireShopId middleware
      }
    });

    if (response.ok) {
      const adminResult = await response.json();
      const adminUploadId = adminResult.uploadId; // รับ uploadId จาก Admin

      // ลบข้อมูลออกจากรายการรอชำระเงิน
      pendingUploads.delete(uploadId);

      console.log('Successfully sent to admin backend, admin uploadId:', adminUploadId);
      res.json({
        success: true,
        message: 'Payment confirmed and data sent to admin',
        uploadId: adminUploadId // ส่ง uploadId จาก Admin กลับไปให้ Frontend
      });
    } else {
      const errBody = await response.text();
      console.error('[/api/confirm-payment] Admin returned error:', response.status, errBody);
      throw new Error(`Admin backend error: ${response.status} ${errBody}`);
    }

  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการยืนยันการชำระเงิน' });
  }
});

// API ตรวจสอบสถานะของการอัปโหลดด้วย uploadId
app.get("/api/upload-status/:uploadId", (req, res) => {
  const { uploadId } = req.params;

  if (pendingUploads.has(uploadId)) {
    const data = pendingUploads.get(uploadId);
    res.json({ exists: true, status: data.status });
  } else {
    res.json({ exists: false });
  }
});

// API อัปโหลดเนื้อหา (ข้อความ + รูปภาพ)
app.post("/upload-content", uploadGeneric.single("image"), (req, res) => {
  const { message } = req.body;
  const baseUrl = process.env.BASE_URL || `https://cmes-user.onrender.com`;
  const imageUrl = req.file ? `${baseUrl}/uploads/others/${req.file.filename}` : null;

  console.log("Message:", message);
  console.log("Image URL:", imageUrl);

  res.json({ success: true, message, imageUrl });
});

// ===== API อัปโหลดรูปโปรไฟล์ (Avatar) เฉพาะ =====
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

// API อัปโหลดรูปภาพทั่วไป (Generic)
app.post("/upload", uploadGeneric.single("image"), (req, res) => {
  // Cloudinary returns URL in req.file.path
  const imageUrl = req.file.path;
  console.log("✓ Generic file uploaded to Cloudinary:", imageUrl);
  res.json({ imageUrl });
});

// ===== API ส่งรหัส OTP ไปยังหมายเลขโทรศัพท์ผ่าน SMS =====
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
      "api_key": process.env.SMS_API_KEY,
      "secret_key": process.env.SMS_SECRET_KEY,
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

// ===== API ตรวจสอบความถูกต้องของรหัส OTP =====
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
      api_key: process.env.SMS_API_KEY,
      secret_key: process.env.SMS_SECRET_KEY,
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

// API ตรวจสอบการชำระเงิน (ตรวจสอบจำนวนเงินและวิธีการชำระ)
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

// ===== Error Handler - จัดการข้อผิดพลาดทั้งหมดของแอปพลิเคชัน =====
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

// ===== ตั้งค่า Socket.IO สำหรับการสื่อสาร Real-time =====
const server = http.createServer(app);
const io = new SocketIoServer(server, { cors: { origin: "*" } });

// การตั้งค่าเริ่มต้นของระบบ
let config = {
  enableImage: true,   // เปิดใช้งานการอัปโหลดรูปภาพ
  enableText: true,    // เปิดใช้งานการส่งข้อความ
  price: 100,          // ราคาเริ่มต้น (บาท)
  time: 10             // เวลาเริ่มต้น (วินาที)
};

// API ดึงข้อมูลการตั้งค่าปัจจุบันของระบบ
app.get("/api/status", (req, res) => {
  res.json(config);
});

// จัดการการเชื่อมต่อ Socket.IO
io.on("connection", (socket) => {
  // ส่งการตั้งค่าปัจจุบันไปยังผู้ใช้ที่เชื่อมต่อใหม่
  socket.emit("configUpdate", config);

  // รับการอัปเดตการตั้งค่าจาก Admin และแจ้งเตือนผู้ใช้ทุกคน
  socket.on("adminUpdateConfig", (newConfig) => {
    config = { ...config, ...newConfig };
    io.emit("configUpdate", config);
  });
});

// เริ่มต้นเซิร์ฟเวอร์ (ใช้ server.listen แทน app.listen เพื่อรองรับ Socket.IO)
server.listen(port, () => {
  console.log(`Server + WebSocket running on http://localhost:${port}`);
});

// ===== APIs สำหรับระบบของขวัญ (Gift System) =====

// API ดึงรายการของขวัญทั้งหมด
app.get("/api/gifts", async (req, res) => {
  try {
    const shopId = req.headers['x-shop-id'] || '';
    const settings = await fetchGiftSettingsFromAdmin(shopId);
    res.json({ success: true, settings });
  } catch (error) {
    console.error("Fetch gift settings failed", error);
    res.status(500).json({ success: false, message: "ไม่สามารถโหลดข้อมูลสินค้า" });
  }
});

// API สร้างคำสั่งซื้อของขวัญ
app.post("/api/gifts/order", async (req, res) => {
  try {
    // ดึงข้อมูลคำสั่งซื้อจาก request body
    const { items, tableNumber, note, senderName, senderPhone } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "กรุณาเลือกรายการสินค้า" });
    }

    const shopId = req.headers['x-shop-id'] || '';
    const settings = await fetchGiftSettingsFromAdmin(shopId);
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
          imageUrl: found.imageUrl || "",
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
      senderPhone: senderPhone?.trim() || null,
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

// API ดึงข้อมูลคำสั่งซื้อของขวัญด้วย orderId
app.get("/api/gifts/order/:orderId", (req, res) => {
  const { orderId } = req.params;
  const order = giftOrders.find((item) => item.id === orderId);
  if (!order) {
    return res.status(404).json({ success: false, message: "ไม่พบคำสั่งซื้อ" });
  }
  res.json({ success: true, order });
});

// API ยืนยันการชำระเงินสำหรับคำสั่งซื้อของขวัญและส่งข้อมูลไปยัง Admin
app.post("/api/gifts/order/:orderId/confirm", async (req, res) => {
  const { orderId } = req.params;
  const { userId, email, avatar } = req.body; // รับข้อมูล user จาก frontend
  const shopId = req.headers['x-shop-id'] || ''; // รับ shopId จาก header เพื่อส่งต่อไปยัง Admin

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
      senderPhone: order.senderPhone || null,
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
      headers: {
        "Content-Type": "application/json",
        "x-shop-id": shopId  // ✅ ส่ง shopId ไปด้วยเพื่อผ่าน requireShopId middleware
      },
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

// ===== API ดึงข้อมูลอันดับผู้ใช้ชั้นนำ (Rankings) =====
app.get("/api/rankings/top", async (req, res) => {
  try {
    // ส่งต่อคำขอไปยังฝั่ง Admin พร้อม x-shop-id
    const shopId = req.headers['x-shop-id'] || '';
    const response = await fetch(`${ADMIN_API_BASE}/api/rankings/top`, {
      headers: { 'x-shop-id': shopId }
    });
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