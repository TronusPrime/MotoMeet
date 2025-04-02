import React from 'react';

import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
const debounce = (func, delay) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => func(...args), delay);
    };
  };
  
  
export default function LocationSetup() {
    const [city, setCity] = useState("");
    const [radius, setRadius] = useState(50);
    const [suggestions, setSuggestions] = useState([]);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    const getAutocompleteResults = async (query) => {
        if (!query) return;

        try {
            const API = process.env.REACT_APP_API_URL;
            const res = await axios.post("https://motomeet.onrender.com/api/autocomplete", {
                input: query,
            });
            setSuggestions(res.data.suggestions || []);
        } catch (error) {
            console.error("Autocomplete API Error:", error);
        }
    };

    const debouncedAutocomplete = debounce(getAutocompleteResults, 300);


    const handleSuggestionClick = (suggestion) => {
        setCity(suggestion);
        setSuggestions([]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const API = process.env.REACT_APP_API_URL;
            const res = await axios.post("https://motomeet.onrender.com/api/set_location", {
                city,
                radius,
              }, {
                withCredentials: true
              });
              

            if (res.data.message === "Location updated successfully!") {
                navigate("/home");
            } else {
                alert("Something went wrong saving your location.");
            }
        } catch (err) {
            console.error("Error saving location:", err);
            alert(err.response?.data?.error || "Server error. Try again.");
        }
    };

    return (
            <div className="bg-white p-6 rounded-2xl shadow-lg w-full max-w-md text-center relative">
                <h1 className="text-2xl font-bold mb-4 text-gray-800">Set Your Location</h1>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="text-left">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Enter Your City:
                        </label>
                        <input
                            type="text"
                            value={city}
                            onChange={(e) => {
                                setCity(e.target.value);
                                if (e.target.value.length >= 3) debouncedAutocomplete(e.target.value);
                            }}
                            placeholder="Enter a location"
                            className="w-full p-3 border border-gray-300 rounded-lg"
                            autoComplete="off"
                        />
                        {suggestions.length > 0 && (
                            <div
                                ref={dropdownRef}
                                className="absolute mt-1 bg-white border border-gray-300 w-[90%] max-h-40 overflow-y-auto rounded-lg shadow-md z-50 left-1/2 transform -translate-x-1/2"
                            >
                                {suggestions.map((s, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => handleSuggestionClick(s.placePrediction.text.text)}
                                        className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                                    >
                                        {s.placePrediction.text.text}
                                    </div>
                                ))}

                            </div>
                        )}
                    </div>

                    <div className="text-left">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Search Radius (miles):
                        </label>
                        <div className="flex items-center gap-4">
                            <input
                                type="range"
                                min="1"
                                max="200"
                                value={radius}
                                onChange={(e) => setRadius(e.target.value)}
                                className="w-full"
                            />
                            <span className="font-bold text-blue-600">{radius}</span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-purple-500 via-indigo-600 to-teal-400 text-white py-3 px-4 rounded-xl font-medium shadow hover:scale-105 transition"
                    >
                        Save and Continue
                    </button>
                </form>
        </div>
    );

}
