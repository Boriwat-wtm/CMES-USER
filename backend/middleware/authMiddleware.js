import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const usersFile = path.join(__dirname, "../users-data.json");

export const verifyAuthToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const secret = process.env.JWT_SECRET || "your-secret-key-change-this";
    const decoded = jwt.verify(token, secret);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      error: error.message,
    });
  }
};

export const optionalAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (token) {
      const secret = process.env.JWT_SECRET || "your-secret-key-change-this";
      const decoded = jwt.verify(token, secret);
      req.userId = decoded.userId;
    }
    next();
  } catch (error) {
    // Token invalid or expired, but we allow the request to continue
    next();
  }
};

export const getCurrentUser = (req) => {
  try {
    if (!req.userId) return null;

    const data = fs.readFileSync(usersFile, "utf8");
    const users = JSON.parse(data);
    return users[req.userId] || null;
  } catch (error) {
    return null;
  }
};
