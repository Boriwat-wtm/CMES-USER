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
import twilio from "twilio";
import axios from "axios";
import http from "http";
import { Server as SocketIoServer } from "socket.io";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
const ADMIN_API_BASE = (process.env.ADMIN_API_BASE || "http://localhost:5001").replace(/\/$/, "");

// Twilio Credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

const expectedAmount = parseInt(process.env.EXPECTED_AMOUNT, 10);

app.use(bodyParser.json());
app.use(express.static("uploads"));
app.use(express.json());

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
    console.log(`[Backend /api/check-phone] Checking phone: ${phone}`);
    const users = loadUsers();
    const userExists = !!users[phone];
    console.log(`[Backend /api/check-phone] Phone ${phone} exists: ${userExists}`);
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
    console.log(`[Backend] Getting user profile for phone: ${phone}`);
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
    console.log(`[Backend] Updating profile for phone: ${phone}`);
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
    console.log(`[Backend] Profile updated for phone: ${phone}`);
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
    console.log(`[Backend] Birthday Check: ${day}/${month} vs ${todayDay}/${todayMonth}`);
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

// ----- OTP & Authentication -----
app.post("/api/send-otp", async (req, res) => {
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

app.post("/api/verify-otp", async (req, res) => {
  const { otp, token, phone, birthday } = req.body;
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
      const userData = {
        phone,
        username: "",
        email: "",
        avatar: null,
        birthday,
        lastBirthdayUpdate: new Date().toISOString(),
      };
      const users = loadUsers();
      users[phone] = userData;
      saveUsers(users);
      console.log(`[Backend] Saved user data for phone: ${phone}`);
      const authToken = Buffer.from(phone).toString("base64");
      res.json({ 
        success: true, 
        message: "OTP verified successfully",
        token: authToken,
        user: userData
      });
    } else {
      console.error("SMSMKT Error:", response.data.detail);
      res.status(400).json({ success: false, message: response.data.detail });
    }
  } catch (error) {
    console.error("Error verifying OTP:", error.message || error);
    res.status(500).json({ success: false, message: "ไม่สามารถตรวจสอบ OTP ได้" });
  }
});

// ----- File Upload Setup -----
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

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

app.post("/api/report", async (req, res) => {
  const { category, detail } = req.body;
  if (!category || !detail) {
    return res.status(400).json({ status: "error", message: "category and detail are required" });
  }
  try {
    const adminRes = await fetch(`${ADMIN_API_BASE}/api/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, detail }),
    });
    const adminData = await adminRes.json();
    if (adminRes.ok) {
      res.json({ status: "ok" });
    } else {
      res.status(500).json({ status: "error", message: adminData.message });
    }
  } catch (err) {
    console.error("ส่งข้อมูลไป admin ไม่สำเร็จ:", err); // เพิ่ม log error
    res.status(500).json({ status: "error", message: "ส่งข้อมูลไป admin ไม่สำเร็จ" });
  }
});

// เพิ่ม API OCR
app.post("/api/ocr", upload.single("image"), async (req, res) => {
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

app.post("/verify-slip", upload.single("slip"), async (req, res) => {
  console.log("===> เข้ามา /verify-slip แล้ว");
  let status = "failed";
  let detail = "";
  const amount = req.body.amount;

  if (!req.file) {
    console.log("===> ไม่พบไฟล์สลิป");
    detail = "ไม่พบไฟล์สลิป";
    await fetch("http://localhost:4000/api/stat-slip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "payment", detail, status, amount }),
    });
    return res.json({ success: false, message: detail });
  }

  try {
    console.log("===> เริ่ม OCR");
    const { data: { text } } = await Tesseract.recognize(
      req.file.path,
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

    if (match1 || match2 || match3 || match4) {
      status = "success";
      detail = `ชำระเงินสำเร็จ จำนวนเงิน: ${amount}`;
      console.log("===> ตรวจพบจำนวนเงินในสลิป");
      await fetch(`${ADMIN_API_BASE}/api/stat-slip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "payment", detail, status, amount }),
      });
      return res.json({ success: true });
    } else {
      detail = "ชำระเงินไม่ถูกต้อง หรือจำนวนเงินไม่ตรง";
      console.log("===> ชำระเงินไม่ถูกต้อง หรือจำนวนเงินไม่ตรง");
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

// API สำหรับบันทึกข้อมูลรอชำระเงิน
app.post("/api/upload", upload.single("file"), (req, res) => {
  const { text, type, time, price, sender } = req.body;
  const uploadId = Date.now().toString();
  
  const uploadData = {
    id: uploadId,
    text,
    type,
    time,
    price,
    sender,
    file: req.file ? req.file.filename : null,
    filePath: req.file ? req.file.path : null,
    timestamp: new Date(),
    status: 'pending',
    socialType: req.body.socialType,
    socialName: req.body.socialName,
  };
  
  // เก็บข้อมูลรอชำระเงิน
  pendingUploads.set(uploadId, uploadData);
  
  // ตั้งเวลายกเลิก 10 นาที
  setTimeout(() => {
    if (pendingUploads.has(uploadId)) {
      console.log(`Upload ${uploadId} expired after 10 minutes`);
      pendingUploads.delete(uploadId);
    }
  }, 10 * 60 * 1000); // 10 นาที
  
  res.json({ success: true, uploadId });
});

// API สำหรับยืนยันการชำระเงิน
app.post("/api/confirm-payment", async (req, res) => {
  try {
    const { uploadId } = req.body;
    
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
    formData.append('textColor', uploadData.textColor || 'white'); // เพิ่มสีข้อความ
    
    // ส่งไฟล์หากมี
    if (uploadData.file) {
      const filePath = path.join(__dirname, 'uploads', uploadData.file);
      if (fs.existsSync(filePath)) {
        formData.append('file', fs.createReadStream(filePath));
      }
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

// API สำหรับอัปโหลดรูปภาพและข้อความ
app.post("/upload-content", upload.single("image"), (req, res) => {
  const { message } = req.body;
  const imageUrl = req.file ? `http://localhost:${port}/uploads/${req.file.filename}` : null;

  console.log("Message:", message);
  console.log("Image URL:", imageUrl);

  res.json({ success: true, message, imageUrl });
});

// API เดิมสำหรับอัปโหลดรูปภาพ
app.post("/upload", upload.single("image"), (req, res) => {
  res.json({ imageUrl: `http://localhost:${port}/uploads/${req.file.filename}` });
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
    if (totalPrice <= 0) {
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
  const order = giftOrders.find((item) => item.id === orderId);
  if (!order) {
    return res.status(404).json({ success: false, message: "ไม่พบคำสั่งซื้อ" });
  }
  if (order.status !== "pending_payment") {
    return res.status(400).json({ success: false, message: "คำสั่งซื้ออยู่ในสถานะที่ไม่สามารถยืนยันได้" });
  }

  order.status = "awaiting_admin";
  order.paidAt = new Date().toISOString();
  saveGiftOrders();

  try {
    const adminResponse = await fetch(`${ADMIN_API_BASE}/api/gifts/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: order.id,
        sender: order.senderName,
        tableNumber: order.tableNumber,
        note: order.note,
        items: order.items,
        totalPrice: order.totalPrice
      })
    });

    if (!adminResponse.ok) {
      order.status = "pending_payment";
      delete order.paidAt;
      saveGiftOrders();
      const message = await adminResponse.text();
      return res.status(502).json({ success: false, message: message || "ส่งข้อมูลไปยังฝั่งแอดมินไม่สำเร็จ" });
    }

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
    const response = await fetch(`${ADMIN_API_BASE}/api/rankings/top`);
    if (!response.ok) {
      throw new Error("ADMIN_UNAVAILABLE");
    }
    const data = await response.json();
    res.json({ success: true, ranks: data.ranks || [], totalUsers: data.totalUsers || 0 });
  } catch (error) {
    console.error("Fetch rankings failed", error);
    res.status(500).json({ success: false, message: "ไม่สามารถโหลดอันดับ" });
  }
});