import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      default: null, // null สำหรับ OAuth users
    },
    googleId: {
      type: String,
      default: null,
      index: true, // เพื่อให้ค้นหาเร็ว แต่ไม่ unique
    },
    avatar: {
      type: String,
      default: null,
    },
    birthday: {
      type: String,
      default: "",
    },
    lastBirthdayEdit: {
      type: Date,
      default: null,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    authMethod: {
      type: String,
      enum: ["email", "google"],
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
