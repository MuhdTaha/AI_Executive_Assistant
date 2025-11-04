import React, { useEffect, useState } from "react";
import { useSupabase } from "../context/SupabaseSessionContext";
import Tasks from "../tasks/Tasks";

interface CalendarEvent {
  id: string;
  summary?: string;
  start?: {
    dateTime?: string;
    date?: string;
  };
}

const Dashboard: React.FC = () => {
  const { session, supabase } = useSupabase();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) return;

    const fetchCalendarEvents = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("http://localhost:8080/api/calendar/events", {
            headers: { authorization: `Bearer ${session.access_token}` },
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || "Failed to fetch events");
        }

        const data = await response.json();
        setEvents(data);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "An error occurred while fetching events");
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarEvents();
  }, [session]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center p-6">
      <div className="flex gap-6 w-full max-w-6xl">
        
        {/* Calendar Section */}
        <div className="bg-white p-6 rounded-xl shadow-md w-2/3">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Your Google Calendar</h1>

          {loading && <p className="text-gray-600">Loading events...</p>}
          {error && <p className="text-red-500">{error}</p>}

          {!loading && !error && events.length === 0 && (
            <p className="text-gray-500">No upcoming events found.</p>
          )}

          {!loading && events.length > 0 && (
            <ul className="divide-y divide-gray-200">
              {events.map((event) => (
                <li key={event.id} className="py-3">
                  <p className="text-lg font-semibold text-gray-800">
                    {event.summary || "Untitled Event"}
                  </p>
                  <p className="text-sm text-gray-600">
                    {event.start?.dateTime
                      ? new Date(event.start.dateTime).toLocaleString()
                      : event.start?.date || "No start date"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ✅ Tasks Section */}
        <div className="bg-white p-6 rounded-xl shadow-md w-1/3">
          <h2 className="text-2xl font-bold mb-4">Tasks</h2>
          <Tasks />
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
