"use client";
import { createContext, useContext, useEffect, useState } from 'react';
import { User, UserProfile, supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileRetryTimeout, setProfileRetryTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      // Clean up any pending retry timeout
      if (profileRetryTimeout) {
        clearTimeout(profileRetryTimeout);
      }
    };
  }, [profileRetryTimeout]);

  const fetchUserProfile = async (userId: string, retryCount = 0) => {
    const maxRetries = 5;
    const baseDelay = 1000; // 1 second base delay
    const maxDelay = 10000; // Maximum 10 seconds delay
    
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // If profile doesn't exist and we haven't exceeded retries, try again
        if (error.code === 'PGRST116' && retryCount < maxRetries) {
          const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay); // Exponential backoff with cap
          console.log(`Profile not found for user ${userId}, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
          
          const timeout = setTimeout(() => {
            fetchUserProfile(userId, retryCount + 1);
          }, delay);
          
          setProfileRetryTimeout(timeout);
          return;
        }
        
        // If we've exhausted retries, this might be an orphaned account
        if (retryCount >= maxRetries) {
          console.error(`Profile creation failed after ${maxRetries} retries for user ${userId}. Attempting to create orphaned profile.`);
          // Try to create the profile manually for orphaned accounts
          const email = session?.user?.email || '';
          if (email) {
            await createOrphanedProfile(userId, email);
            return;
          }
        }
        
        console.error('Failed to fetch user profile:', error);
        setUser(null);
        setLoading(false);
        return;
      }

      if (profile) {
        setUser({
          id: userId,
          email: session?.user?.email || '',
          profile,
        });
        setLoading(false);
      } else {
        setUser(null);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUser(null);
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    
    // Handle specific error cases
    if (error) {
      // Check for duplicate email error
      if (error.message?.includes('User already registered') || 
          error.message?.includes('already been registered') ||
          error.message?.includes('already exists')) {
        return { 
          error: {
            ...error,
            message: 'An account with this email already exists. Please sign in instead.',
            code: 'DUPLICATE_EMAIL'
          }
        };
      }
      
      // Check for email confirmation required
      if (error.message?.includes('confirm your email') || 
          error.message?.includes('email confirmation')) {
        return { 
          error: {
            ...error,
            message: 'Please check your email and click the confirmation link to activate your account.',
            code: 'EMAIL_CONFIRMATION_REQUIRED'
          }
        };
      }
    }
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: new Error('No user logged in') };

    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id);

    if (!error) {
      await fetchUserProfile(user.id);
    }

    return { error };
  };

  const createOrphanedProfile = async (userId: string, email: string) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          email: email,
          full_name: email, // Use email as fallback
          role: 'loan_officer'
        });

      if (!error) {
        console.log('Successfully created orphaned profile for user:', userId);
        await fetchUserProfile(userId);
      } else {
        console.error('Failed to create orphaned profile:', error);
      }

      return { error };
    } catch (error) {
      console.error('Error creating orphaned profile:', error);
      return { error };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}