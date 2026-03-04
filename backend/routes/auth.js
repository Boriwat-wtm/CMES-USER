import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

// File paths
const usersFile = path.join(__dirname, "../users-data.json");

// Utility functions
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

// ==========================================
// REGISTER
// ==========================================
router.post("/register", async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // Validation
    if (!email || !password || !username) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and username are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    const users = loadUsers();

    // Check if email exists
    const emailExists = Object.values(users).some((u) => u.email === email);
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Check if username exists
    const usernameExists = Object.values(users).some((u) => u.username === username);
    if (usernameExists) {
      return res.status(400).json({
        success: false,
        message: "Username already taken",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userId = Date.now().toString();
    const newUser = {
      id: userId,
      email,
      username,
      password: hashedPassword,
      avatar: null,
      birthday: "",
      createdAt: new Date().toISOString(),
      lastBirthdayUpdate: new Date().toISOString(),
      emailVerified: false, // Optional: email verification
    };

    // Save user
    users[userId] = newUser;
    saveUsers(users);

    // Generate token
    const token = generateToken(userId);

    // Return user data (without password)
    const { password: _, ...userDataWithoutPassword } = newUser;

    res.json({
      success: true,
      token,
      user: userDataWithoutPassword,
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
// LOGIN
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

    const users = loadUsers();

    // Find user by email
    const user = Object.values(users).find((u) => u.email === email);
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
    const token = generateToken(user.id);

    // Return user data (without password)
    const { password: _, ...userDataWithoutPassword } = user;

    res.json({
      success: true,
      token,
      user: userDataWithoutPassword,
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
// VERIFY TOKEN
// ==========================================
router.post("/verify-token", (req, res) => {
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

    const users = loadUsers();
    const user = users[decoded.userId];

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const { password: _, ...userDataWithoutPassword } = user;

    res.json({
      success: true,
      user: userDataWithoutPassword,
      message: "Token is valid",
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
router.get("/profile", (req, res) => {
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

    const users = loadUsers();
    const user = users[decoded.userId];

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const { password: _, ...userDataWithoutPassword } = user;

    res.json({
      success: true,
      user: userDataWithoutPassword,
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
// GOOGLE OAUTH
// ==========================================
router.post("/google", async (req, res) => {
  try {
    const { googleId, email, name, picture, username, birthday } = req.body;

    if (!googleId || !email) {
      return res.status(400).json({
        success: false,
        message: "Google ID and email are required",
      });
    }

    const users = loadUsers();

    // Find user by email or googleId
    let user = Object.values(users).find((u) => u.email === email);

    if (user) {
      // User already exists, link Google account if not linked
      if (!user.googleId) {
        user.googleId = googleId;
      }
      
      // Update username and birthday if provided
      if (username) {
        user.username = username;
      }
      if (birthday) {
        user.birthday = birthday;
        user.lastBirthdayUpdate = new Date().toISOString();
      }
      
      user.updatedAt = new Date().toISOString();
      saveUsers(users);
    } else {
      // สร้าง user ใหม่จาก Google data โดยใช้ Google name เป็น username
      // ให้ผู้ใช้กรอก birthday และแก้ username ในหน้า Profile ได้
      const userId = Date.now().toString();
      user = {
        id: userId,
        email,
        username: name || email.split("@")[0], // ใช้ Google name หรือ email prefix
        password: null, // No password for OAuth users
        googleId,
        avatar: picture || null,
        birthday: "", // ปล่อยเป็นค่าว่าง ให้ผู้ใช้กรอกเองใน Profile page
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastBirthdayUpdate: null,
        emailVerified: true, // Google verified emails
        authMethod: "google", // Track how user registered
      };
      users[userId] = user;
      saveUsers(users);
    }

    // Generate JWT token
    const token = generateToken(user.id);

    // Return user data (without password)
    const { password: _, ...userDataWithoutPassword } = user;

    res.json({
      success: true,
      token,
      user: userDataWithoutPassword,
      message: "Google login successful",
    });
  } catch (error) {
    console.error("[Auth] Google login error:", error);
    res.status(500).json({
      success: false,
      message: "Google login failed",
      error: error.message,
    });
  }
});

// ==========================================
// UPDATE PROFILE (PUT)
// ==========================================
router.put("/profile", (req, res) => {
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

    const { username, email, avatar, birthday, lastBirthdayEdit } = req.body;

    const users = loadUsers();
    const user = users[decoded.userId];

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update fields
    if (username && username.trim()) {
      // Check if username is already taken by another user
      const usernameTaken = Object.values(users).some(
        (u) => u.username === username && u.id !== user.id
      );
      if (usernameTaken) {
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

    // ตรวจสอบการแก้ไขวันเกิด
    if (birthday !== undefined && birthday !== user.birthday) {
      // มีการเปลี่ยนแปลงวันเกิด ต้องเช็คว่าผ่าน 90 วันหรือยัง
      if (user.lastBirthdayEdit) {
        const lastEdit = new Date(user.lastBirthdayEdit);
        const now = new Date();
        const daysDiff = Math.floor((now - lastEdit) / (1000 * 60 * 60 * 24));
        
        if (daysDiff < 90) {
          // ยังไม่ครบ 90 วัน
          const nextAllowedDate = new Date(lastEdit);
          nextAllowedDate.setDate(nextAllowedDate.getDate() + 90);
          
          return res.status(400).json({
            success: false,
            message: `สามารถแก้ไขวันเกิดได้ทุก 90 วันเท่านั้น แก้ไขได้อีกครั้งในวันที่ ${nextAllowedDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}`,
            nextAllowedDate: nextAllowedDate.toISOString(),
            daysRemaining: 90 - daysDiff
          });
        }
      }
      
      // อนุญาตให้แก้ไขได้ อัพเดทวันเกิดและวันที่แก้ไขล่าสุด
      user.birthday = birthday;
      user.lastBirthdayEdit = new Date().toISOString();
    }

    if (lastBirthdayEdit && birthday === user.birthday) {
      // กรณีที่ frontend ส่ง lastBirthdayEdit มาโดยไม่มีการเปลี่ยนวันเกิด
      user.lastBirthdayEdit = lastBirthdayEdit;
    }

    user.updatedAt = new Date().toISOString();
    saveUsers(users);

    const { password: _, ...userDataWithoutPassword } = user;

    res.json({
      success: true,
      user: userDataWithoutPassword,
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
  // Client-side การทำ logout ดำเนินการลบ token จาก localStorage
  // Server-side สามารถใช้ blacklist token หรือเพียงส่ง success response
  res.json({
    success: true,
    message: "Logout successful",
  });
});

export default router;
