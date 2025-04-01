// src/pages/Home.jsx
import React from 'react';
import AuthModal from "../components/AuthModal";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-100 px-3 pt-20 text-center">
      <h1 className="text-5xl font-bold text-purple-600">MotoMeet</h1>
      <div className="mt-10 font-[Courier_New] font-bold text-3xl text-bold text-black whitespace-nowrap max-w-6xl text-center mx-auto">
        Find your people, discover interests, and join group rides near you
      </div>
      <div className="mt-8">
        <AuthModal />
      </div>
    </div>
  );
}
