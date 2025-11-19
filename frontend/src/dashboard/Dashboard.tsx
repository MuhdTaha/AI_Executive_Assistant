import React, { useEffect, useState } from 'react';
import { Calendar, ListTodo } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import Tasks from '../tasks/Tasks';

// Supabase client (matches App.tsx config)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Backend API base URL
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

type GoogleEvent = {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

const Dashboard: React.FC = () => {
  const [events, setEvents] = useState<GoogleEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCalendarEvents = async () => {
      try {
        // Get current Supabase session so we can send the access token
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting Supabase session:', error);
          setEventsError('Could not read auth session.');
          setLoadingEvents(false);
          return;
        }

        if (!session) {
          setEventsError('You must be signed in to view calendar events.');
          setLoadingEvents(false);
          return;
        }

        const accessToken = session.access_token;

        const res = await fetch(`${API_BASE_URL}/calendar/events`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!res.ok) {
          const text = await res.text();
          console.error('Calendar API error:', res.status, text);
          setEventsError(
            `Calendar API error (${res.status}). Check backend logs.`,
          );
          setLoadingEvents(false);
          return;
        }

        const data: GoogleEvent[] = await res.json();
        setEvents(data);
      } catch (err: any) {
        console.error('Failed to fetch calendar events:', err);
        setEventsError('Failed to fetch calendar events.');
      } finally {
        setLoadingEvents(false);
      }
    };

    fetchCalendarEvents();
  }, []);

  const renderEventTime = (ev: GoogleEvent) => {
    const raw =
      ev.start?.dateTime ??
      (ev.start?.date ? `${ev.start.date}T00:00:00.000Z` : null);

    if (!raw) return 'No start time';

    try {
      return new Date(raw).toLocaleString();
    } catch {
      return raw;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto w-full">
        {/* Left: Calendar */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center mb-4">
            <Calendar className="w-6 h-6 text-indigo-600 mr-2" />
            <h2 className="text-xl font-bold text-gray-900">
              Your Google Calendar
            </h2>
          </div>

          {loadingEvents && (
            <p className="text-gray-500">Loading calendar events...</p>
          )}

          {!loadingEvents && eventsError && (
            <p className="text-red-500 text-sm">{eventsError}</p>
          )}

          {!loadingEvents && !eventsError && events.length === 0 && (
            <p className="text-gray-500 text-sm">
              No upcoming events found. Try adding some events in Google
              Calendar.
            </p>
          )}

          {!loadingEvents && !eventsError && events.length > 0 && (
            <div className="space-y-3">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="border rounded-xl px-4 py-3 flex flex-col bg-gray-50"
                >
                  <span className="font-semibold text-gray-900">
                    {ev.summary || '(No title)'}
                  </span>
                  <span className="text-sm text-gray-600">
                    {renderEventTime(ev)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Tasks */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center mb-4">
            <ListTodo className="w-6 h-6 text-indigo-600 mr-2" />
            <h2 className="text-xl font-bold text-gray-900">Tasks</h2>
          </div>

          <Tasks />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
