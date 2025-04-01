// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

export default function ProtectedRoute({ children }) {
  const { user } = useUser();

  if (!user || !user.email) {
    return <Navigate to="/" replace />;
  }

  return children;
}
