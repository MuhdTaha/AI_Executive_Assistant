import React, { useState, useEffect } from 'react';
import { LogIn, Calendar, CheckCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import Dashboard from './dashboard/Dashboard';

// --- CONFIGURATION PLACEHOLDERS ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Google OAuth config for the *direct* Calendar connect flow
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI;

// Initialize Supabase Client (Use createClient directly)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- AUTHENTICATION SCOPES (CRITICAL) ---
// Shared between Supabase Sign-In and our direct Google OAuth flow.
const GOOGLE_OAUTH_SCOPES = [
    'email',
    'profile',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/tasks',
].join(' ');

// --- TYPES ---
interface UserSession {
    id: string;
    email: string;
    full_name: string;
}

// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
    const [session, setSession] = useState<UserSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState<'home' | 'dashboard'>('home');

    // --- EFFECTS ---
    // Listen for hash changes to navigate between pages
    useEffect(() => {
        const handleHashChange = () => {
            if (window.location.hash === '#dashboard') setPage('dashboard');
            else setPage('home');
        };
        window.addEventListener('hashchange', handleHashChange);
        handleHashChange();
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    // 1. Initial Session Check and Listener Setup
    useEffect(() => {
        const checkSession = async () => {
            try {
                const {
                    data: { session },
                } = await supabase.auth.getSession();

                if (session && session.user) {
                    setSession({
                        id: session.user.id,
                        email: session.user.email || '',
                        full_name: session.user.user_metadata.full_name || 'User',
                    });
                } else {
                    setSession(null);
                }
            } catch (error) {
                console.error('Error checking session:', error);
                setSession(null);
            } finally {
                setLoading(false);
            }
        };

        checkSession();

        // Setup listener for real-time changes (login/logout/token refresh)
        const { data: authListener } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                if (session && session.user) {
                    setSession({
                        id: session.user.id,
                        email: session.user.email || '',
                        full_name: session.user.user_metadata.full_name || 'User',
                    });
                } else {
                    setSession(null);
                }
                // loading is handled by checkSession
            },
        );

        // Cleanup the listener
        return () => {
            if (authListener && authListener.subscription) {
                authListener.subscription.unsubscribe();
            }
        };
    }, []);

    // 2. Handler for Supabase Google Sign In (Performs the redirect)
    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    scopes: GOOGLE_OAUTH_SCOPES,
                    redirectTo: window.location.origin,
                },
            });

            if (error) {
                console.error('Error initiating Google Sign In:', error.message);
                setLoading(false);
            }
            // On success, browser is redirected; no further JS here.
        } catch (error) {
            console.error('Error initiating Google Sign In:', error);
            setLoading(false);
        }
    };

    // 2b. Handler for *connecting* Google Calendar (our own OAuth)
    const handleConnectGoogleCalendar = () => {
        if (!session) return;

        if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
            console.error(
                'VITE_GOOGLE_CLIENT_ID or VITE_GOOGLE_REDIRECT_URI is not set in the frontend env.',
            );
            return;
        }

        const state = JSON.stringify({ userId: session.id });

        const params = new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            redirect_uri: GOOGLE_REDIRECT_URI,
            response_type: 'code',
            access_type: 'offline',
            prompt: 'consent',
            scope: GOOGLE_OAUTH_SCOPES,
            state,
        });

        // Kick off Google OAuth directly; backend will handle /auth/google/callback
        window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    };

    // 3. Handler for Sign Out
    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setSession(null);
    };

    // 4. Navigation Handler (Dashboard)
    const goToDashboard = () => {
        window.location.hash = '#dashboard';
    };

    // --- RENDERING LOGIC ---

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="text-xl text-indigo-600 font-medium flex items-center">
                    <svg
                        className="animate-spin -ml-1 mr-3 h-6 w-6 text-indigo-600"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        ></circle>
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        ></path>
                    </svg>
                    Connecting to Supabase...
                </div>
            </div>
        );
    }

    const WelcomeContent = (
        <>
            <div className="flex flex-col items-center mb-6">
                <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
                <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">
                    Welcome back{session?.full_name ? `, ${session.full_name}` : ''}!
                </h1>
                <p className="text-gray-600">
                    You&apos;re signed in as{' '}
                    <span className="font-semibold text-indigo-600">{session?.email}</span>
                </p>
            </div>

            <p className="text-lg text-gray-600 mb-6">
                Next steps:
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
                <button
                    onClick={goToDashboard}
                    className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md transition-transform transform hover:scale-105"
                >
                    Open Dashboard
                </button>

                <button
                    onClick={handleConnectGoogleCalendar}
                    className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-md transition-transform transform hover:scale-105 flex items-center justify-center"
                >
                    <Calendar className="w-5 h-5 mr-2" />
                    Connect Google Calendar
                </button>

                <button
                    onClick={handleSignOut}
                    className="px-5 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold transition-transform transform hover:scale-105"
                >
                    Sign Out
                </button>
            </div>

            <p className="text-sm text-gray-500">
                Connecting your calendar lets the assistant fetch busy times and compute
                free blocks for scheduling.
            </p>
        </>
    );

    const SignInContent = (
        <>
            <div className="flex flex-col items-center mb-6">
                <Calendar className="w-12 h-12 text-indigo-600 mb-4" />
                <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">
                    AI Executive Assistant
                </h1>
            </div>
            <p className="text-xl text-gray-600 mb-8 max-w-lg text-center">
                Intelligent time management built for students and busy professionals.
                Connects to your Google Calendar and uses AI to schedule your tasks
                perfectly.
            </p>
            <button
                onClick={handleGoogleSignIn}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-150 hover:scale-105 flex items-center justify-center text-lg"
            >
                <LogIn className="w-6 h-6 mr-3" /> Sign In with Google
            </button>
            <p className="mt-6 text-sm text-gray-500 flex items-center justify-center">
                <Calendar className="w-4 h-4 mr-1 text-gray-500" /> Requires access to
                Google Calendar &amp; Tasks.
            </p>
        </>
    );

    if (session && page === 'dashboard') {
        return <Dashboard />;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-2xl w-full max-w-xl text-center">
                {session ? WelcomeContent : SignInContent}
            </div>
        </div>
    );
};

export default App;
