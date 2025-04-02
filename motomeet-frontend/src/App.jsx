// src/App.jsx
import React from 'react';
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import LocationSetup from "./pages/LocationSetup";
import EventsPage from "./pages/EventsPage";
import { UserProvider } from "./context/UserContext";
import ProtectedRoute from './components/ProtectedRoute';
import Profile from "./pages/Profile";
import UpdatesPage from './pages/News';
export default function App() {
  return (
    <UserProvider>
      <Routes>
        <Route path="/home" element={
          <ProtectedRoute>
            <EventsPage />
          </ProtectedRoute>
        } />
        <Route path="/news" element={
          <ProtectedRoute>
            <UpdatesPage />
          </ProtectedRoute>
        } />
        <Route path="/set_location" element={
          <ProtectedRoute>
            <LocationSetup />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="/" element={<Home />} />
      </Routes>
    </UserProvider>
  );
}
