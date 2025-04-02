// src/pages/Profile.jsx
import React from 'react';
import NavBar from "../components/NavBar";
import { useEffect, useState } from "react";
import LocationSetupComp from "../components/LocationSetupComp"; // adjust path if needed
import axios from "axios";
import CreateEditEvent from "../components/CreateEditEvent";
import EventCard from "../components/EventCard"; // adjust path if needed
import { useNavigate, Navigate } from "react-router-dom";
export default function Profile() {
  const [userData, setUserData] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventsGoing, setEventsGoing] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [formMode, setFormMode] = useState("create");
  const navigate = useNavigate();
  // If user context is null or cookie missing, redirect


  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const API = process.env.REACT_APP_API_URL;
      const res = await axios.get("https://motomeet.onrender.com/api/profile", {
        withCredentials: true
      });
      console.log(res)
      setUserData(res.data);
      setEvents(res.data.events);
      setEventsGoing(res.data.events.map(e => e.event_uuid));
    } catch (err) {
      console.error("Failed to load profile data:", err);
      navigate("/", { replace: true });
    }
  };

  const handleRSVP = async (eventId, state) => {
    try {
      const API = process.env.REACT_APP_API_URL;
      await axios.post("https://motomeet.onrender.com/api/home", {
        event_id: eventId,
        state
      }, {
        withCredentials: true
      });
      await fetchProfile();
    } catch (error) {
      console.error("RSVP error:", error);
    }
  };

  const handleEdit = (event) => {
    setFormMode("edit");
    setSelectedEvent(event);
    setShowModal(true);
  };
  

  const handleCancel = async (eventId) => {
    try {
      const API = process.env.REACT_APP_API_URL;
      await axios.post("https://motomeet.onrender.com/api/cancel_event", { event_id: eventId }, {
        withCredentials: true
      });
      await fetchProfile();
    } catch (err) {
      console.error("Failed to cancel event:", err);
    }
  };
  const createdEvents = userData ? events.filter(e => e.host_email === userData.email) : [];
  const rsvpedEvents = userData ? events.filter(e => e.host_email !== userData.email) : [];

  return (
    <div className="min-h-screen bg-gray-100 font-mono px-4">
      <NavBar />
      <div className="max-w-2xl mx-auto bg-white mt-10 p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Your Profile</h1>

        {userData ? (
          <div className="space-y-2 text-gray-800">
            <p><strong>Name:</strong> {userData.name}</p>
            <p><strong>Email:</strong> {userData.email}</p>
            <p><strong>Motorcycle:</strong> {userData.make} {userData.model}</p>
            <p><strong>City:</strong> {userData.city}</p>
            <p><strong>Search Radius:</strong> {userData.radius} miles</p>
            <div className="flex justify-center items-center px-4 mt-6">
              <LocationSetupComp />
            </div>
            <div className="mt-6">
              <strong>Your Events:</strong>
                <div className="mt-2 space-y-2 max-h-80 overflow-y-auto pr-2">
                  {createdEvents.map((event, idx) => (
                    <EventCard
                      key={`created-${idx}`}
                      event={event}
                      userEmail={userData.email}
                      isGoing={true}
                      onRSVP={handleRSVP}
                      onCancel={() => handleCancel(event.event_uuid)}
                      onEdit={handleEdit}
                      onSeeMore={setSelectedEvent}
                    />
                  ))}
                  {rsvpedEvents.length > 0 && (
                    <div className="pt-2 border-t border-gray-300 text-sm text-gray-500">
                      RSVPed Events
                    </div>
                  )}
                  {rsvpedEvents.map((event, idx) => (
                    <EventCard
                      key={`rsvped-${idx}`}
                      event={event}
                      userEmail={userData.email}
                      isGoing={true}
                      onRSVP={handleRSVP}
                      onCancel={() => handleCancel(event.event_uuid)}
                      onEdit={handleEdit}
                      onSeeMore={setSelectedEvent}
                    />
                  ))}
                </div>
            </div>
          </div>
        ) : (
          <p>Loading profile info...</p>
        )}
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full shadow-lg">
            <h2 className="text-xl font-bold mb-4">{formMode === "create" ? "Create Event" : "Edit Event"}</h2>
            <CreateEditEvent
              formMode={formMode}
              initialValues={selectedEvent || {}}
              onClose={() => {
                setShowModal(false);
                setSelectedEvent(null);
              }}
              onSubmit={async (formData) => {
                try {
                  const API = process.env.REACT_APP_API_URL;
                  const geoResponse = await axios.post("https://motomeet.onrender.com/api/geocode", {
                    address: formData.location
                  }, {
                    withCredentials: true
                  });
                  const coords = geoResponse.data;

                  const eventPayload = {
                    ...formData,
                    lat: coords.lat,
                    lng: coords.lng
                  };

                  if (formMode === "edit" && selectedEvent?.event_uuid) {
                    // 🔁 UPDATE existing event
                    const API = process.env.REACT_APP_API_URL;
                    await axios.post("https://motomeet.onrender.com/api/update_event", {
                      ...eventPayload,
                      event_id: selectedEvent.event_uuid
                    }, {
                      withCredentials: true
                    });
                  } else {
                    // ➕ CREATE new event
                    const API = process.env.REACT_APP_API_URL;
                    await axios.post("https://motomeet.onrender.com/api/create_event", eventPayload, {
                      withCredentials: true
                    });
                  }
                  const refreshed = await axios.get("https://motomeet.onrender.com/api/home", { withCredentials: true });
                  
                  setEvents(refreshed.data.events);

                  setShowModal(false);
                  setSelectedEvent(null); // optional: clear selected event on close
                } catch (err) {
                  console.error("Error creating/updating event:", err);
                  alert("Failed to save event. Try again.");
                }
              }}

            />
          </div>
        </div>
      )}
    </div>
  );
}
