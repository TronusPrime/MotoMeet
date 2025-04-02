import axios from "axios";
import React, { use } from 'react';
import { useUser } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
export default function NavBar() {
  const navigate = useNavigate();
  const { setUser } = useUser();

  const handleLogout = async () => {
    try {
      const API = process.env.REACT_APP_API_URL;
      await axios.post("https://motomeet.onrender.com/api/logout", {}, {
        withCredentials: true
      });
  
      setUser(null); // Clear user context
      navigate("/", { replace: true });
      window.location.href = "/"; // Force reload to clear memory
  
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };
  
  
  
    return (
      <nav className="bg-gradient-to-r from-purple-700 via-indigo-600 to-teal-400 text-white px-6 py-4 shadow-md flex items-center justify-between font-mono">
        <div className="flex gap-5 text-m">
          <a href="/home" className="hover:text-purple-400 transition">Home</a>
          <a href="#news" className="hover:text-purple-400 transition">News</a>
          <a href="#contact" className="hover:text-purple-400 transition">Contact</a>
          <a href="#about" className="hover:text-purple-400 transition">About</a>
          <a href="/profile" className="hover:text-purple-400 transition">Profile</a>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm bg-gradient-to-r from-indigo-800 to-indigo-500 px-3 py-1 rounded font-semibold hover:scale-105 transition-transform"
        >
          Log Out
        </button>
      </nav>
    );
  }
  