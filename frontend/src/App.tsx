import React, { useState, useEffect } from 'react';
import { LogIn, Calendar, CheckCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js'; 
import Dashboard from './dashboard/Dashboard';

// --- CONFIGURATION PLACEHOLDERS ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Initialize Supabase Client (Use createClient directly)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY); 

// --- AUTHENTICATION SCOPES (CRITICAL) ---
const GOOGLE_OAUTH_SCOPES = [
    'email', 
    'profile',
    'https://www.googleapis.com/auth/calendar.events', 
    'https://www.googleapis.com/auth/tasks' 
].join(' ');

// --- TYPES ---
interface UserSession {
    email: string;
    full_name: string; 
}

// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
    const [session, setSession] = useState<UserSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState<'home' | 'dashboard'>('home');

    // --- EFFECTS ---
    // listten for hash changes to navigate between pages
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
        // --- FIX 1: Correctly check session on load ---
        const checkSession = async () => {
            try {
                // Check if Supabase already has a valid session token (e.g., from a previous redirect)
                const { data: { session } } = await supabase.auth.getSession();
                if (session && session.user) {
                    setSession({ 
                        email: session.user.email || '',
                        full_name: session.user.user_metadata.full_name || 'User'
                    });
                } else {
                    setSession(null);
                }
            } catch (error) {
                console.error("Error checking session:", error);
                setSession(null);
            } finally {
                setLoading(false);
            }
        };

        checkSession();

        // Setup listener for real-time changes (login/logout/token refresh)
        const { data: authListener } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (session && session.user) {
                    setSession({ 
                        email: session.user.email || '',
                        full_name: session.user.user_metadata.full_name || 'User'
                    });
                } else {
                    setSession(null);
                }
                // setLoading is primarily handled in checkSession, keep it stable here.
            }
        );
        
        // Cleanup the listener
        return () => {
            if (authListener && authListener.subscription) {
                authListener.subscription.unsubscribe();
            }
        };
    }, []);

    // 2. Handler for Google Sign In (Performs the redirect)
    const handleGoogleSignIn = async () => {
        setLoading(true); // Show loading while redirecting
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    // Pass the CRITICAL scopes
                    scopes: GOOGLE_OAUTH_SCOPES,
                    // Use window.location.origin to redirect back to the app's root URL 
                    // where Supabase can finish the handshake.
                    redirectTo: window.location.origin
                },
            });
            
            if (error) {
                console.error('Error initiating Google Sign In:', error.message);
                setLoading(false);
            }
            // SUCCESS: No further JS execution here; the browser is redirected.
        } catch (error) {
            console.error('Error initiating Google Sign In:', error);
            setLoading(false);
        }
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
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connecting to Supabase...
                </div>
            </div>
        );
    }

    const WelcomeContent = (
        <>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
                Welcome Back, {session?.full_name || 'User'}!
            </h1>
            <p className="text-xl text-gray-600 mb-8">
                Your AI Executive Assistant is ready to plan your day.
            </p>
            <div className="space-y-4">
                {/* TODO: Implement Dashboard Navigation */}
                <button
                    onClick={goToDashboard}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg transform transition duration-150 hover:scale-[1.02] flex items-center justify-center"
                >
                    <CheckCircle className="w-5 h-5 mr-2" /> Dashboard
                </button>
                <button
                    onClick={handleSignOut}
                    className="w-full sm:w-auto bg-white hover:bg-gray-100 text-gray-800 font-semibold py-3 px-8 border border-gray-300 rounded-lg shadow-md transition duration-150 flex items-center justify-center"
                >
                    <LogIn className="w-5 h-5 mr-2 rotate-180" /> Sign Out
                </button>
            </div>
        </>
    );

    const SignInContent = (
        <>
            <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-4">
                AI Executive Assistant
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-lg text-center">
                Intelligent time management built for students. Syncs your calendar and uses AI to schedule your tasks perfectly.
            </p>
            <button
                onClick={handleGoogleSignIn}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg shadow-xl transform transition duration-150 hover:scale-105 flex items-center justify-center text-lg"
            >
                <LogIn className="w-6 h-6 mr-3" /> Sign In with Google
            </button>
            <p className="mt-6 text-sm text-gray-500 flex items-center">
                <Calendar className="w-4 h-4 mr-1 text-gray-500" /> Requires access to Google Calendar & Tasks.
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
