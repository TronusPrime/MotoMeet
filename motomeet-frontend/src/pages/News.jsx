import React, { useEffect, useState } from 'react';
import axios from 'axios';
import NavBar from '../components/NavBar';

export default function UpdatesPage() {
  const [updates, setUpdates] = useState([]);

  useEffect(() => {
    axios.get("https://motomeet.onrender.com/api/news")
      .then(res => setUpdates(res.data))
      .catch(err => console.error("Failed to load updates", err));
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 px-4 font-mono">
      <NavBar />
      <div className="max-w-3xl mx-auto mt-10 bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">MotoMeet Updates</h1>
        {updates.map((update, idx) => (
          <div key={idx} className="mb-6">
            <h2 className="text-xl font-semibold">{update.title}</h2>
            <p className="text-sm text-gray-500 mb-2">{update.date}</p>
            <p>{update.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
