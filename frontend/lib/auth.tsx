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
  const [isHydrated, setIsHydrated] = useState(false);

  // Handle hydration - defer all auth operations until after hydration
  useEffect(() => {
    console.log('🚀 Component mounted, setting hydrated to true');
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    // Only initialize auth after hydration is complete
    if (!isHydrated) {
      console.log('⏳ Waiting for hydration to complete...');
      return;
    }

    let mounted = true;
    
    console.log('🔍 Starting auth initialization after hydration...');
    
    // Simplified auth initialization - no timeouts, let Supabase handle its own retries
    const initializeAuth = async () => {
      try {
        console.log('🔍 Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error('❌ Session check error:', error);
          setUser(null);
          setLoading(false);
          setAuthInitialized(true);
          return;
        }
        
        console.log('🔍 Initial session:', session);
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

    // Listen for auth changes - simplified approach
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
  }, [isHydrated]);

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
      
      // Simplified approach - just query the profile directly
      // Let Supabase handle its own retries and timeouts
      console.log('📡 Executing profile query...');
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      console.log('✅ Supabase query completed!');
      console.log('Profile query result:', { profile, error });

      if (error) {
        console.error('Profile query error:', error);
        // If profile doesn't exist, just set user to null
        if (error.code === 'PGRST116') { // No rows returned
          console.log('User profile not found in database');
          setUser(null);
          setLoading(false);
          return;
        }
        throw error;
      }

      if (!profile) {
        console.error('No profile found for user:', userId);
        setUser(null);
        setLoading(false);
        return;
      }

      // Get current session for email
      const { data: { session } } = await supabase.auth.getSession();
      
      setUser({
        id: userId,
        email: session?.user?.email || '',
        profile,
      });
    } catch (error) {
      console.error('💥 Error fetching user profile:', error);
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
