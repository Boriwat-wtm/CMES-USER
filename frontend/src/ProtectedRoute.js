import React from "react";
import { Navigate } from "react-router-dom";
import { isAuthenticated } from "./authService";

// ProtectedRoute component - redirect to register if not authenticated
export const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  return children;
};

// PublicRoute component - redirect to home if already authenticated
export const PublicRoute = ({ children }) => {
  if (isAuthenticated()) {
    return <Navigate to="/home" replace />;
  }
  return children;
};
