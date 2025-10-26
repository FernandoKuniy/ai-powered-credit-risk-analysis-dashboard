"use client";
import { createContext, useContext, useEffect, useState } from 'react';
import { User, UserProfile } from './supabase';
import { supabase } from './supabase';
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
  const [fetchingProfile, setFetchingProfile] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    // Get initial session with timeout
    const initializeAuth = async () => {
      try {
        console.log('🔍 Initial session check starting...');
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Initial session check timeout')), 10000)
        );
        
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;
        
        if (!mounted) return;
        
        console.log('🔍 Initial session check:', session);
        setSession(session);
        setAuthInitialized(true);
        
        if (session?.user) {
          console.log('👤 User found in session:', session.user.id);
          await fetchUserProfile(session.user.id);
        } else {
          console.log('❌ No user in session');
          setUser(null);
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ Initial session check failed:', error);
        if (mounted) {
          setUser(null);
          setLoading(false);
          setAuthInitialized(true);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes - but only after initial setup
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state change:', event, session);
      
      // Skip INITIAL_SESSION events since we handle that separately
      if (event === 'INITIAL_SESSION') {
        console.log('⏭️ Skipping INITIAL_SESSION event');
        return;
      }
      
      setSession(session);
      
      if (session?.user) {
        console.log('👤 User found in auth change:', session.user.id);
        await fetchUserProfile(session.user.id);
      } else {
        console.log('❌ No user in auth change');
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    console.log('🚀 fetchUserProfile called with userId:', userId);
    
    // Prevent multiple simultaneous calls for the same user
    if (fetchingProfile) {
      console.log('⏳ Already fetching profile, skipping...');
      return;
    }
    
    // If we already have this user loaded, skip
    if (user && user.id === userId) {
      console.log('👤 User already loaded, skipping...');
      setLoading(false);
      return;
    }
    
    setFetchingProfile(true);
    try {
      console.log('Fetching user profile for:', userId);
      console.log('🔗 Supabase client:', supabase);
      console.log('🔗 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      
      console.log('📡 About to execute Supabase query...');
      
      // Create a timeout wrapper for any Supabase operation
      const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 5000): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>((_, reject) => 
            setTimeout(() => reject(new Error(`Operation timeout after ${timeoutMs}ms`)), timeoutMs)
          )
        ]);
      };
      
      // Try to get session with timeout
      console.log('🔍 Checking session with timeout...');
      let currentSession;
      try {
        const sessionResult = await withTimeout(supabase.auth.getSession(), 5000);
        currentSession = sessionResult.data.session;
        console.log('✅ Session check completed:', !!currentSession);
      } catch (sessionError) {
        console.error('❌ Session check failed or timed out:', sessionError);
        // Force sign out to clear any corrupted session state
        console.log('🔄 Forcing sign out due to session check failure...');
        try {
          await withTimeout(supabase.auth.signOut(), 3000);
        } catch (signOutError) {
          console.error('❌ Sign out also failed:', signOutError);
        }
        throw new Error('Session check failed');
      }
      
      if (!currentSession) {
        console.log('❌ No valid session found, signing out');
        await supabase.auth.signOut();
        throw new Error('No valid session');
      }
      
      // Execute profile query with timeout
      console.log('🔍 Executing profile query with timeout...');
      const profileResult = await withTimeout(
        supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single() as unknown as Promise<any>,
        10000
      );
      
      const { data: profile, error } = profileResult;

      console.log('✅ Supabase query completed!');
      console.log('Profile query result:', { profile, error });

      if (error) {
        console.error('Profile query error:', error);
        // If profile doesn't exist, don't sign out - just set user to null
        if (error.code === 'PGRST116') { // No rows returned
          console.log('User profile not found in database, but session is valid');
          setUser(null);
          setLoading(false);
          return;
        }
        throw error;
      }

      if (!profile) {
        console.error('No profile found for user:', userId);
        console.log('User profile not found, setting user to null');
        setUser(null);
        setLoading(false);
        return;
      }

      setUser({
        id: userId,
        email: currentSession.user.email || '',
        profile,
      });
    } catch (error) {
      console.error('💥 Error fetching user profile:', error);
      console.error('💥 Error type:', typeof error);
      console.error('💥 Error message:', (error as any)?.message);
      console.error('💥 Error stack:', (error as any)?.stack);
      setUser(null);
    } finally {
      console.log('🏁 fetchUserProfile finally block - setting loading to false');
      setLoading(false);
      setFetchingProfile(false);
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
      // Refresh user data
      await fetchUserProfile(user.id);
    }

    return { error };
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
