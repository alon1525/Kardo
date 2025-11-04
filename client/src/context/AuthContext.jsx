import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase/supabaseConfig';

// Create AuthContext for managing authentication state
const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sign up function
  const signup = async (email, password) => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Please check your environment variables.');
    }
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });
      
      if (error) {
        console.error('Signup error:', error);
        if (error.message && error.message.includes('Invalid API key')) {
          throw new Error('Invalid Supabase API key. Please check your VITE_SUPABASE_ANON_KEY in .env file. Get it from: Supabase Dashboard > Settings > API > anon public key');
        }
        throw error;
      }
      return data;
    } catch (err) {
      console.error('Signup failed:', err);
      console.error('Error details:', {
        message: err.message,
        status: err.status,
        name: err.name,
        cause: err.cause
      });
      
      if (err.message && (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('Failed to fetch'))) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'Supabase';
        throw new Error(`Network error: Could not connect to ${supabaseUrl}. Please check:
1. Your Supabase project URL is correct in .env file
2. Your internet connection
3. Supabase project is active (not paused)
4. Restart your dev server after updating .env`);
      }
      
      if (err.message && err.message.includes('email')) {
        throw err; // Pass through email-related errors
      }
      
      throw err;
    }
  };

  // Login function
  const login = async (email, password) => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Please check your environment variables.');
    }
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('Login error:', error);
        throw error;
      }
      return data;
    } catch (err) {
      console.error('Login failed:', err);
      if (err.message && err.message.includes('fetch')) {
        throw new Error('Network error: Could not connect to Supabase. Please check your internet connection and Supabase configuration.');
      }
      throw err;
    }
  };

  // Sign out function
  const signout = async () => {
    if (!supabase) {
      console.error('Supabase is not configured');
      setCurrentUser(null);
      return;
    }
    
    // Clear the current user state immediately (before signout completes)
    setCurrentUser(null);
    
    // Sign out from Supabase (clears session and localStorage)
    const { error } = await supabase.auth.signOut();
    
    // Manually clear any Supabase session data from localStorage
    try {
      const storageKeys = Object.keys(localStorage);
      storageKeys.forEach(key => {
        if (key.includes('supabase') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.warn('Could not clear localStorage:', e);
    }
    
    if (error) {
      console.error('Sign out error:', error);
      // Still clear user state even if there's an error
      setCurrentUser(null);
      throw error;
    }
    
    // Force clear any remaining session data
    setCurrentUser(null);
  };

  useEffect(() => {
    if (!supabase) {
      console.error('Supabase is not configured');
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
      setLoading(false);
    }).catch((error) => {
      console.error('Error getting session:', error);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email || 'No user');
      // On SIGNED_OUT event, explicitly clear user
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
      } else {
        setCurrentUser(session?.user ?? null);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  const value = {
    currentUser,
    loading,
    signup: signup || (() => {
      console.error('signup function not available');
      return Promise.reject(new Error('Authentication service not initialized'));
    }),
    login: login || (() => {
      console.error('login function not available');
      return Promise.reject(new Error('Authentication service not initialized'));
    }),
    signout: signout || (() => {
      console.error('signout function not available');
      return Promise.resolve();
    })
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
