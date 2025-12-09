import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Register from "./Register";
import Home from "./Home";
import Select from "./Select";
import Upload from "./Upload";
import Status from "./Status";
import Payment from "./Payment";
import Profile from "./Profile";
import Report from "./Report";
import Gift from "./Gift";
import { ProtectedRoute, PublicRoute } from "./ProtectedRoute";
import { initializeAuth } from "./authService";

function App() {
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
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
