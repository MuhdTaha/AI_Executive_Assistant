import React, { useState, useEffect } from 'react';
import { LogIn, Calendar, CheckCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import Dashboard from './dashboard/Dashboard';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface UserSession {
  email: string;
  full_name: string;
}

const App: React.FC = () => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<'home' | 'dashboard'>('home');

  // Handle hash changes
  useEffect(() => {
    const handleHashChange = () => {
      setPage(window.location.hash === '#dashboard' ? 'dashboard' : 'home');
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Session management
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const ensuredUser = await ensureUser(session.access_token);
        console.log('Ensured user:', ensuredUser);

        setSession({
          email: session.user.email || '',
          full_name: session.user.user_metadata.full_name || 'User'
        });
      } else {
        setSession(null);
      }
      setLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await ensureUser(session.access_token);
        setSession({
          email: session.user.email || '',
          full_name: session.user.user_metadata.full_name || 'User'
        });
      } else {
        setSession(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Google Sign-In
  const handleGoogleSignIn = () => {
    setLoading(true);
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/tasks',
        redirectTo: `${window.location.origin}${window.location.pathname}` // Redirect back to same page
      },
    });
  };

  const ensureUser = async (token: string) => {
    try {
      const response = await fetch(`http://localhost:8080/api/auth/ensure-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`, // pass Supabase access token
        },
        body: JSON.stringify({}), // body can be empty, backend uses token to get user info
      });

      if (!response.ok) {
        console.error('Failed to ensure user:', await response.text());
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error ensuring user:', error);
      return null;
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const goToDashboard = () => { 
    window.location.hash = '#dashboard'; 
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-indigo-600 font-medium flex items-center">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading...
        </div>
      </div>
    );
  }
  
  if (session && page === 'dashboard') {
    return <Dashboard />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-2xl w-full max-w-xl text-center">
        {session ? (
          <>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
              Welcome Back, {session.full_name}!
            </h1>
            <p className="text-xl mb-8">Your AI Executive Assistant is ready to plan your day.</p>
            <div className="space-y-4">
              <button onClick={goToDashboard} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-8 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 mr-2" /> Dashboard
              </button>
              <button onClick={handleSignOut} className="w-full sm:w-auto bg-white hover:bg-gray-100 text-gray-800 py-3 px-8 border rounded-lg flex items-center justify-center">
                <LogIn className="w-5 h-5 mr-2 rotate-180" /> Sign Out
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-4xl md:text-6xl font-extrabold mb-4">AI Executive Assistant</h1>
            <p className="text-xl mb-8 max-w-lg text-center">
              Intelligent time management built for students. Syncs your calendar and uses AI to schedule your tasks perfectly.
            </p>
            <button onClick={handleGoogleSignIn} className="bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-8 rounded-lg flex items-center justify-center text-lg">
              <LogIn className="w-6 h-6 mr-3" /> Sign In with Google
            </button>
            <p className="mt-6 text-sm text-gray-500 flex items-center justify-center">
              <Calendar className="w-4 h-4 mr-1" /> Requires access to Google Calendar & Tasks.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default App;