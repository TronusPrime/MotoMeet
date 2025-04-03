import React from 'react';

export default function EventCard({ event, userEmail, isGoing, onRSVP, onCancel, onEdit, onSeeMore }) {
  const isHost = event.host_email === userEmail;

  return (
    <div className="bg-gray-50 p-4 mb-4 rounded shadow-sm">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-800">{event.event_name}</h3>
        {event.rsvp_count > 1 && (
          <p className="text-sm text-gray-600">{event.rsvp_count} going</p>
        )}
      </div>

      <p className="text-sm text-gray-700 mt-1">
        <strong>Time:</strong>{" "}
        {new Date(event.event_time.replace(" ", "T")).toLocaleString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit"
        })}
      </p>
      <p className="text-sm text-gray-700">
        <strong>Location:</strong> {event.location}
      </p>
      <p className="text-sm text-gray-700">
        <strong>Hosted by:</strong> {event.host_name}
      </p>

      <div className="mt-3 flex gap-3 flex-wrap">
        {isHost ? (
          <>
            <button
              onClick={() => onCancel(event.event_uuid)}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Cancel Event
            </button>
            <button
              onClick={() => onEdit(event)}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Edit Event
            </button>
          </>
        ) : (
          <button
            onClick={() => onRSVP(event.event_uuid, !isGoing)}
            className={`px-4 py-2 rounded text-white ${isGoing ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}
          >
            {isGoing ? "unRSVP" : "RSVP"}
          </button>
        )}

        <button
          onClick={() => onSeeMore(event)}
          className="border border-gray-400 text-gray-700 px-4 py-2 rounded hover:bg-gray-100"
        >
          See More
        </button>
      </div>
    </div>
  );
}
