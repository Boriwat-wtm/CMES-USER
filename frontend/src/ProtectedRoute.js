import React from "react";
import { Navigate } from "react-router-dom";
import { isAuthenticated } from "./authService";

/**
 * ProtectedRoute Component
 * ป้องกันการเข้าถึงหน้าที่ต้องเข้าสู่ระบบก่อน
 * ถ้ายังไม่ได้เข้าสู่ระบบจะถูกส่งกลับไปหน้า Register
 */
export const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  return children;
};

/**
 * PublicRoute Component
 * ป้องกันการเข้าถึงหน้าสำหรับผู้ที่ยังไม่ได้ล็อกอิน (เช่น หน้า Login, Register)
 * ถ้าเข้าสู่ระบบแล้วจะถูกส่งไปหน้า Home อัตโนมัติ
 */
export const PublicRoute = ({ children }) => {
  if (isAuthenticated()) {
    return <Navigate to="/home" replace />;
  }
  return children;
};
