import { useEffect, useState } from "react";
import axios from "axios";
import NavBar from "../components/NavBar";
import CreateEditEvent from "../components/CreateEditEvent";
import React from 'react';
import EventCard from "../components/EventCard";
import { useUser } from "../context/UserContext";
import { useNavigate, Navigate } from "react-router-dom";
axios.defaults.withCredentials = true;

export default function EventsPage() {
    const { user, setUser } = useUser();
    const [events, setEvents] = useState([]);
    const [eventsGoing, setEventsGoing] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [formMode, setFormMode] = useState("create");
    console.log("Work")
    const navigate = useNavigate();
    useEffect(() => {
        const fetchData = async () => {
          try {
            const res = await axios.get("http://localhost:5000/api/home", {
              withCredentials: true,
            });
            setUser({
              name: res.data.n,
              email: res.data.email,
              city: res.data.city,
              radius: res.data.radius,
            });
            setEvents(res.data.events);
            setEventsGoing(res.data.events_going);
          } catch (err) {
            if (err.response && err.response.status === 401) {
              setUser(null);
              navigate("/", { replace: true });
            }
          }
        };
      
        fetchData();
      }, []);
      

    const handleCancel = async (eventId) => {
        try {
            await axios.post("http://localhost:5000/api/cancel_event", { event_id: eventId }, {
                withCredentials: true
            });
            const refreshed = await axios.get("http://localhost:5000/api/home", {
                withCredentials: true
            });
            setEvents(refreshed.data.events);
            setEventsGoing(refreshed.data.events_going);
        } catch (err) {
            console.error("Failed to cancel event:", err);
        }
    };

    const handleRSVP = async (eventId, state) => {
        try {
            const res = await axios.post("http://localhost:5000/api/home", {
                event_id: eventId,
                state: state
            }, {
                withCredentials: true
            });
            console.log(res.data.message);
            console.log(res.data);
            const refreshed = await axios.get("http://localhost:5000/api/home", {
                withCredentials: true
            });
            setEvents(refreshed.data.events);
            setEventsGoing(refreshed.data.events_going);
        } catch (error) {
            console.error("RSVP error:", error);
        }
    };

    const handleEdit = (event) => {
        setFormMode("edit");
        setSelectedEvent(event);
        setShowModal(true);
    };

    return (
        <div className="min-h-screen bg-gray-100 font-mono px-4">
            <NavBar />

            <div className="max-w-4xl mx-auto bg-white mt-10 p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4">

                    <h1 className="text-2xl font-bold mb-2">Welcome, {user.name}!</h1>
                    <button
                        className="flex justify-end items-center mb-4 bg-gradient-to-r from-purple-500 via-indigo-600 to-teal-400 text-white px-4 py-2 rounded-lg shadow hover:scale-105 transition"
                        onClick={() => {
                            setFormMode("create");
                            setSelectedEvent(null);
                            setShowModal(true);
                        }}
                    >
                        + Create Event
                    </button>
                </div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl">Events within {user.radius} miles near {user.city}</h2>
                </div>

                {events.length === 0 ? (
                    <p className="text-gray-500">No events found within your selected radius.</p>
                ) : (
                    events.map((event) => (
                        <EventCard
                            key={event.event_uuid}
                            event={event}
                            userEmail={user.email}
                            isGoing={eventsGoing.includes(event.event_uuid)}
                            onRSVP={handleRSVP}
                            onCancel={() => handleCancel(event.event_uuid)}
                            onEdit={handleEdit}
                            onSeeMore={setSelectedEvent}
                        />
                    ))
                )}
            </div>

            {selectedEvent && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg max-w-md w-full shadow-lg relative">
                        <button className="absolute top-2 right-3 text-2xl" onClick={() => setSelectedEvent(null)}>&times;</button>
                        <h2 className="text-xl font-bold mb-2">{selectedEvent.event_name}</h2>
                        <p><strong>Hosted by:</strong> {selectedEvent.host_name}</p>
                        <p><strong>Time:</strong> {selectedEvent.event_time}</p>
                        <p><strong>Location:</strong> {selectedEvent.location}</p>
                        <p><strong>Info:</strong> {selectedEvent.description}</p>
                    </div>
                </div>
            )}

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
                                    const geoResponse = await axios.post("http://localhost:5000/api/geocode", {
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
                                        await axios.post("http://localhost:5000/api/update_event", {
                                            ...eventPayload,
                                            event_id: selectedEvent.event_uuid
                                        }, {
                                            withCredentials:true
                                        });
                                    } else {
                                        // ➕ CREATE new event
                                        await axios.post("http://localhost:5000/api/create_event", eventPayload, {
                                            withCredentials: true, // Only needed if using cookies (you may remove)
                                        });
                                    }

                                    const refreshed = await axios.get("http://localhost:5000/api/home", {
                                        withCredentials: true
                                    });

                                    setEvents(refreshed.data.events);
                                    setEventsGoing(refreshed.data.events_going);

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
