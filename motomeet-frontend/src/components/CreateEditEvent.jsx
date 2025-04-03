import { useState, useRef } from "react";
import axios from "axios";
import React from 'react';

axios.defaults.withCredentials = true;
const debounce = (func, delay) => {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => func(...args), delay);
    };
};

export default function CreateEditEvent({ formMode, initialValues = {}, onClose, onSubmit }) {
    const [eventName, setEventName] = useState(initialValues.event_name || "");
    const [datetime, setDateTime] = useState(initialValues.event_time || "");
    const [location, setLocation] = useState(initialValues.location || "");
    const [description, setDescription] = useState(initialValues.description || "");
    const [suggestions, setSuggestions] = useState([]);
    const dropdownRef = useRef(null);


    const handleSubmit = (e) => {
        e.preventDefault();
        const localDate = new Date(datetime);
        const utcDateString = new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000).toISOString();

        const formData = {
            event_name: eventName,
            event_time: utcDateString,
            location,
            description
        };
        onSubmit(formData); // Pass data up to parent
        setSuggestions([]);
    };

    const handleDateTimeChange = (event) => {
        setDateTime(event.target.value)
    };
    const lastQueryRef = useRef("");


    const getAutocompleteResults = async (query) => {
        if (!query || query === lastQueryRef.current) return;
        lastQueryRef.current = query;

        const requestBody = {
            input: query,
            includedPrimaryTypes: ["locality", "geocode", "establishment"],
            locationBias: {
                rectangle: {
                    low: { latitude: 24.396308, longitude: -125.0 },
                    high: { latitude: 49.384358, longitude: -66.93457 },
                },
            },
        };
        try {
            const API = process.env.REACT_APP_API_URL;
            const response = await axios.post("https://motomeet.onrender.com/api/autocomplete", requestBody);
            setSuggestions(
                response.data.suggestions.map((s) => s.placePrediction.text.text)
            );
        } catch (error) {
            console.error("❌ Autocomplete API Error:", error);
        }
    };
    const debouncedAutocompleteRef = useRef(
        debounce((query) => getAutocompleteResults(query), 600)
    );

    const handleSuggestionClick = (suggestion) => {
        setLocation(suggestion);
        setSuggestions([]);
    };
    return (
        <form onSubmit={handleSubmit}>
            <input
                type="text"
                name="event_name"
                value={eventName}
                placeholder="Event Name"
                className="w-full p-3 mb-3 border border-gray-300 rounded"
                onChange={(e) => setEventName(e.target.value)}
                required
            />
            <input
                type="text"
                id="event_time"
                name="event_time"
                placeholder="Event Time"
                className="w-full p-3 mb-3 border border-gray-300 rounded"
                value={datetime}
                onChange={handleDateTimeChange}
                onFocus={(e) => e.target.type = 'datetime-local'}
                required
            />
            <input
                type="text"
                value={location}
                onChange={(e) => {
                    setLocation(e.target.value);
                    if (e.target.value.length >= 3) { debouncedAutocompleteRef.current(e.target.value); }
                }}
                placeholder="Enter a location"
                className="w-full p-2 border border-gray-300 rounded"
                autoComplete="off"
            />
            {suggestions.length > 0 && (
                <div
                    ref={dropdownRef}
                    className="relative bg-white border border-gray-300 w-full max-h-40 overflow-y-auto rounded shadow-md z-50 left-1/2 transform -translate-x-1/2"
                >
                    {suggestions.map((s, idx) => (
                        <div
                            key={idx}
                            onClick={() => handleSuggestionClick(s)}
                            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                        >
                            {s}
                        </div>
                    ))}
                </div>
            )}
            <textarea
                id="description"
                name="description"
                rows="4"
                cols="50"
                placeholder="Enter event details..."
                className="w-full mt-3 p-2 border border-gray-300 rounded"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
            ></textarea>
            <div className="mt-4 flex justify-start gap-2">
                <button
                    className="bg-gradient-to-r from-green-500 via-green-600 to-green-400 text-white px-4 py-2 rounded-lg shadow hover:scale-105 transition"
                    type="submit"
                >
                    {formMode === "edit" ? "Save Changes" : "Create Event"}
                </button>
                <button
                    className="ml-1 bg-gradient-to-r from-red-500 via-red-600 to-red-800 text-white px-4 py-2 rounded-lg shadow hover:scale-105 transition"
                    onClick={onClose}
                >
                    Cancel
                </button>
            </div>
        </form>
    )
}