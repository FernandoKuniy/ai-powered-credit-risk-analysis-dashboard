"use client";
import { createContext, useContext, useEffect, useState } from 'react';
import { User, UserProfile, supabase, getSupabaseClient } from './supabase';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any; isNewUser?: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileRetryTimeout, setProfileRetryTimeout] = useState<NodeJS.Timeout | null>(null);

  // Check if DEV_MODE is enabled
  const isDevMode = process.env.DEV_MODE === 'true';
  const devAccessToken = process.env.DEV_ACCESS_TOKEN;

  useEffect(() => {
    if (isDevMode && devAccessToken) {
      // DEV_MODE: Skip Supabase auth and use hardcoded token
      handleDevModeAuth();
    } else {
      // Normal auth flow
      handleNormalAuth();
    }

    return () => {
      // Clean up any pending retry timeout
      if (profileRetryTimeout) {
        clearTimeout(profileRetryTimeout);
      }
    };
  }, [profileRetryTimeout, isDevMode, devAccessToken]);

  const handleDevModeAuth = async () => {
    try {
      // Create a mock session with the hardcoded token
      const mockSession: Session = {
        access_token: devAccessToken!,
        refresh_token: '',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: {
          id: 'dev-user-id', // This will be replaced with real user ID from token
          email: 'dev@example.com', // This will be replaced with real email from profile
          aud: 'authenticated',
          role: 'authenticated',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: {},
        }
      };

      setSession(mockSession);
      
      // Fetch real user profile using the hardcoded token
      await fetchUserProfileWithToken(devAccessToken!);
    } catch (error) {
      console.error('DEV_MODE auth error:', error);
      setUser(null);
      setLoading(false);
    }
  };

  const handleNormalAuth = () => {
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
    };
  };

  const fetchUserProfileWithToken = async (accessToken: string, retryCount = 0) => {
    const maxRetries = 5;
    const baseDelay = 1000; // 1 second base delay
    const maxDelay = 10000; // Maximum 10 seconds delay
    
    try {
      // Use the DEV_MODE client with the hardcoded token
      const devClient = getSupabaseClient();
      
      const { data: profile, error } = await devClient
        .from('user_profiles')
        .select('*')
        .single();

      if (error) {
        // If profile doesn't exist and we haven't exceeded retries, try again
        if (error.code === 'PGRST116' && retryCount < maxRetries) {
          const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay); // Exponential backoff with cap
          console.log(`Profile not found in DEV_MODE, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
          
          const timeout = setTimeout(() => {
            fetchUserProfileWithToken(accessToken, retryCount + 1);
          }, delay);
          
          setProfileRetryTimeout(timeout);
          return;
        }
        
        console.error('Failed to fetch user profile in DEV_MODE:', error);
        setUser(null);
        setLoading(false);
        return;
      }

      if (profile) {
        setUser({
          id: profile.id,
          email: profile.email,
          profile,
        });
        setLoading(false);
      } else {
        setUser(null);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching user profile in DEV_MODE:', error);
      setUser(null);
      setLoading(false);
    }
  };

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
    if (isDevMode) {
      // In DEV_MODE, sign in is not needed - just return success
      return { error: null };
    }
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    if (isDevMode) {
      // In DEV_MODE, sign up is not needed - just return success
      return { error: null, isNewUser: true };
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    
    // Handle explicit errors (when email confirmation is disabled)
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
      
      return { error };
    }
    
    // Handle case where user exists but no session (email confirmation enabled)
    // This happens for both new users (need confirmation) and existing users (duplicate)
    if (data.user && !data.session) {
      // Check if this is likely a duplicate by looking at user creation time
      // If user was created more than 1 second ago, it's probably a duplicate
      const userCreatedAt = new Date(data.user.created_at).getTime();
      const now = Date.now();
      const timeDiff = now - userCreatedAt;
      
      if (timeDiff > 1000) {
        // This is likely an existing user trying to sign up again
        return { 
          error: {
            message: 'Please check your email for a confirmation link, or try signing in if you already have an account.',
            code: 'CHECK_EMAIL_OR_SIGNIN'
          }
        };
      } else {
        // This is a new user who needs email confirmation
        return { error: null, isNewUser: true };
      }
    }
    
    // Successful signup with immediate session (email confirmation disabled)
    return { error: null, isNewUser: true };
  };

  const signOut = async () => {
    if (isDevMode) {
      // In DEV_MODE, just clear the local state
      setUser(null);
      setSession(null);
      return;
    }
    
    await supabase.auth.signOut();
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: new Error('No user logged in') };

    if (isDevMode) {
      // In DEV_MODE, use the DEV_MODE client
      const devClient = getSupabaseClient();
      const { error } = await devClient
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id);

      if (!error) {
        await fetchUserProfileWithToken(devAccessToken!);
      }

      return { error };
    }

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