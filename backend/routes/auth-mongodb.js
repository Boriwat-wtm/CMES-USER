import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import User from "../models/User.js";
import fetch from "node-fetch";

dotenv.config();

const router = express.Router();

// Admin API Base URL
const ADMIN_API_BASE = (process.env.ADMIN_API_BASE || "https://cmes-admin-server.onrender.com").replace(/\/$/, "");

// OTP Storage (In-memory)
// Format: email -> { otp: "123456", expires: Date }
const otpStore = new Map();

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Utility functions
function generateToken(userId) {
  const secret = process.env.JWT_SECRET || "your-secret-key-change-this";
  return jwt.sign({ userId }, secret, { expiresIn: "7d" });
}

function verifyToken(token) {
  const secret = process.env.JWT_SECRET || "your-secret-key-change-this";
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
}

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ==========================================
// SEND EMAIL OTP
// ==========================================
router.post("/send-email-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "กรุณาระบุอีเมล" });
    }

    // Check if email already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "อีเมลนี้ถูกใช้งานแล้ว" });
    }

    const otp = generateOTP();
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store OTP
    otpStore.set(email, { otp, expires });

    // Send Email
    const mailOptions = {
      from: process.env.EMAIL_USER || "CMES Support",
      to: email,
      subject: "รหัสยืนยันการลงทะเบียน (CMES)",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>รหัสยืนยันของคุณ</h2>
          <p>รหัสยืนยัน (OTP) สำหรับการลงทะเบียนคือ:</p>
          <h1 style="color: #4CAF50; letter-spacing: 5px;">${otp}</h1>
          <p>รหัสนี้จะหมดอายุใน 5 นาที</p>
          <p>หากคุณไม่ได้ทำรายการนี้ โปรดเพิกเฉยต่ออีเมลนี้</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: "ส่งรหัส OTP ไปยังอีเมลแล้ว" });

  } catch (error) {
    console.error("Send OTP error:", error);
    res.status(500).json({
      success: false,
      message: "ไม่สามารถส่งอีเมลได้",
      error: error.message
    });
  }
});

// ==========================================
// REGISTER (Email/Password)
// ==========================================
router.post("/register", async (req, res) => {
  try {
    const { email, password, username, otp } = req.body;

    // Validation
    if (!email || !password || !username || !otp) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกข้อมูลให้ครบถ้วนและระบุรหัส OTP",
      });
    }

    // Verify OTP
    const storedOtpData = otpStore.get(email);
    if (!storedOtpData) {
      return res.status(400).json({ success: false, message: "กรุณาขอรหัส OTP ใหม่" });
    }

    if (Date.now() > storedOtpData.expires) {
      otpStore.delete(email);
      return res.status(400).json({ success: false, message: "รหัส OTP หมดอายุแล้ว" });
    }

    if (storedOtpData.otp !== otp) {
      return res.status(400).json({ success: false, message: "รหัส OTP ไม่ถูกต้อง" });
    }

    // Clean up OTP
    otpStore.delete(email);

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    // Double Check if email exists (Race condition)
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Check if username exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: "Username already taken",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = new User({
      email,
      username,
      password: hashedPassword,
      authMethod: "email",
      emailVerified: true, // Verified by OTP
    });

    await newUser.save();

    // Generate token
    const token = generateToken(newUser._id.toString());

    // shopId comes from the QR-code URL of the current session — NOT stored in User DB
    // (a user can visit multiple shops, shopId must always reflect the current scan)
    const requestShopId = req.query.shopId || req.headers['x-shop-id'] || null;

    // Return user data (without password)
    const userResponse = {
      id: newUser._id.toString(),
      email: newUser.email,
      username: newUser.username,
      avatar: newUser.avatar,
      birthday: newUser.birthday,
      authMethod: newUser.authMethod,
      shopId: requestShopId,
    };

    res.json({
      success: true,
      token,
      user: userResponse,
      message: "Registration successful",
    });
  } catch (error) {
    console.error("[Auth] Register error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
});

// ==========================================
// LOGIN (Email/Password)
// ==========================================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Compare password
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate token
    const token = generateToken(user._id.toString());

    // shopId comes from the QR-code URL of the current session — NOT stored in User DB
    // (a user can visit multiple shops, shopId must always reflect the current scan)
    const requestShopId = req.query.shopId || req.headers['x-shop-id'] || null;

    // Return user data (without password)
    const userResponse = {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      birthday: user.birthday,
      authMethod: user.authMethod,
      shopId: requestShopId,
    };

    res.json({
      success: true,
      token,
      user: userResponse,
      message: "Login successful",
    });
  } catch (error) {
    console.error("[Auth] Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
});

// ==========================================
// GOOGLE OAUTH
// ==========================================
router.post("/google", async (req, res) => {
  try {
    const { googleId, email, name, picture } = req.body;

    if (!googleId || !email) {
      return res.status(400).json({
        success: false,
        message: "Google ID and email are required",
      });
    }

    // Find user by email
    let user = await User.findOne({ email });

    const requestShopId = req.query.shopId || req.headers['x-shop-id'] || null;

    if (user) {
      // User already exists, link Google account if not linked
      if (!user.googleId) {
        user.googleId = googleId;
      }
      user.updatedAt = new Date();
      await user.save();
    } else {
      // Create new user from Google data
      user = new User({
        email,
        username: name || email.split("@")[0],
        googleId,
        avatar: picture || null,
        birthday: "",
        authMethod: "google",
        emailVerified: true,
      });
      await user.save();
    }

    // Generate JWT token
    const token = generateToken(user._id.toString());

    // Return user data (without password)
    // shopId comes from the QR-code URL of the current session — NOT stored in User DB
    const userResponse = {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      birthday: user.birthday,
      authMethod: user.authMethod,
      shopId: requestShopId,
    };

    res.json({
      success: true,
      token,
      user: userResponse,
      message: "Google login/registration successful",
    });
  } catch (error) {
    console.error("[Auth] Google error:", error);
    res.status(500).json({
      success: false,
      message: "Google authentication failed",
      error: error.message,
    });
  }
});

// ==========================================
// VERIFY TOKEN
// ==========================================
router.post("/verify-token", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required",
      });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const userResponse = {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      birthday: user.birthday,
      authMethod: user.authMethod,
    };

    res.json({
      success: true,
      user: userResponse,
    });
  } catch (error) {
    console.error("[Auth] Verify token error:", error);
    res.status(500).json({
      success: false,
      message: "Token verification failed",
      error: error.message,
    });
  }
});

// ==========================================
// GET PROFILE
// ==========================================
router.get("/profile", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const userResponse = {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      birthday: user.birthday,
      lastBirthdayEdit: user.lastBirthdayEdit,
      authMethod: user.authMethod,
    };

    res.json({
      success: true,
      user: userResponse,
    });
  } catch (error) {
    console.error("[Auth] Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get profile",
      error: error.message,
    });
  }
});

// ==========================================
// UPDATE PROFILE (PUT)
// ==========================================
router.put("/profile", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    const { username, avatar, birthday, lastBirthdayEdit } = req.body;

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update fields
    if (username && username.trim()) {
      // Check if username is already taken by another user
      const existingUsername = await User.findOne({
        username,
        _id: { $ne: user._id },
      });
      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: "Username already taken",
        });
      }
      user.username = username;
    }

    if (avatar !== undefined) {
      user.avatar = avatar;
    }

    if (birthday) {
      user.birthday = birthday;
    }

    if (lastBirthdayEdit) {
      user.lastBirthdayEdit = new Date(lastBirthdayEdit);
    }

    await user.save();

    // Sync profile (username & avatar) to Admin Backend (for ranking display)
    // ทำทุกครั้งที่บันทึกโปรไฟล์ เพื่อให้ชื่อและรูปอัปเดตทันทีใน Ranking
    try {
      console.log(`[Auth] Syncing profile to Admin Backend for user: ${user.email}`);
      const syncResponse = await fetch(`${ADMIN_API_BASE}/api/rankings/update-avatar`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user._id.toString(),
          email: user.email,
          username: user.username,
          avatar: user.avatar,
        }),
      });

      if (syncResponse.ok) {
        const syncData = await syncResponse.json();
        console.log(`[Auth] ✓ Profile synced to Admin Backend:`, syncData.message);
      } else {
        console.warn(`[Auth] ⚠ Failed to sync profile to Admin Backend: ${syncResponse.status}`);
      }
    } catch (syncError) {
      console.error(`[Auth] ⚠ Error syncing profile to Admin Backend:`, syncError.message);
      // ไม่ throw error เพราะไม่อยากให้การอัปเดตโปรไฟล์ล้มเหลวเพียงเพราะ sync ไม่ได้
    }

    const userResponse = {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      birthday: user.birthday,
      lastBirthdayEdit: user.lastBirthdayEdit,
      authMethod: user.authMethod,
    };

    res.json({
      success: true,
      user: userResponse,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("[Auth] Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
});

// ==========================================
// LOGOUT
// ==========================================
router.post("/logout", (req, res) => {
  res.json({
    success: true,
    message: "Logout successful",
  });
});

export default router;
