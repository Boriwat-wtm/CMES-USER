import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Register from "./03_Register/Register";
import Home from "./01_Home/Home";
import Select from "./05_Select/Select";
import Upload from "./09_Upload/Upload";
import Status from "./10_Status/Status";
import Payment from "./04_Payment/Payment";
import Profile from "./02_Profile/Profile";
import Report from "./07_Report/Report";
import Gift from "./08_Gift/Gift";
import { ProtectedRoute, PublicRoute } from "./ProtectedRoute";
import { initializeAuth } from "./authService";

function App() {
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // ดักจับ shopId จาก URL ก่อน
    const params = new URLSearchParams(window.location.search);
    const urlShopId = params.get('shopId');
    if (urlShopId) {
      localStorage.setItem('shopId', urlShopId);
    }

    // Initialize auth on app load
    const initAuth = async () => {
      await initializeAuth();
      setAuthLoading(false);
    };
    initAuth();
  }, []);

  if (authLoading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        fontSize: "18px",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
      }}>
        กำลังโหลด...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<PublicRoute><Register /></PublicRoute>}
        />
        <Route
          path="/home"
          element={<ProtectedRoute><Home /></ProtectedRoute>}
        />
        <Route
          path="/select"
          element={<ProtectedRoute><Select /></ProtectedRoute>}
        />
        <Route
          path="/upload"
          element={<ProtectedRoute><Upload /></ProtectedRoute>}
        />
        <Route
          path="/status"
          element={<ProtectedRoute><Status /></ProtectedRoute>}
        />
        <Route
          path="/payment"
          element={<ProtectedRoute><Payment /></ProtectedRoute>}
        />
        <Route
          path="/report"
          element={<ProtectedRoute><Report /></ProtectedRoute>}
        />
        <Route
          path="/profile"
          element={<ProtectedRoute><Profile /></ProtectedRoute>}
        />
        <Route
          path="/gift"
          element={<ProtectedRoute><Gift /></ProtectedRoute>}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
