"use client";
import { createContext, useContext, useEffect, useState } from 'react';
import { User, UserProfile, supabase, createFreshSupabaseClient } from './supabase';
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  console.log('🔍 AuthProvider render - loading:', loading, 'user:', user?.id, 'session:', !!session, 'fetchingProfile:', fetchingProfile, 'authInitialized:', authInitialized, 'isHydrated:', isHydrated);

  // Handle hydration - defer all auth operations until after hydration
  useEffect(() => {
    console.log('🚀 Component mounted, setting hydrated to true');
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    console.log('🔄 Auth useEffect triggered - isHydrated:', isHydrated, 'user:', user?.id);
    
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

    // Listen for auth changes - prevent duplicate triggers
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state change:', event, 'session exists:', !!session, 'user id:', session?.user?.id);
      
      // Skip INITIAL_SESSION events since we handle that separately
      if (event === 'INITIAL_SESSION') {
        console.log('⏭️ Skipping INITIAL_SESSION event');
        return;
      }
      
      console.log('📝 Setting session state...');
      setSession(session);
      
      if (session?.user) {
        console.log('👤 User found in auth change:', session.user.id, 'current user:', user?.id);
        // Always fetch profile on auth state change to ensure we have the latest data
        console.log('🚀 About to call fetchUserProfile from auth state change...');
        await fetchUserProfile(session.user.id);
        console.log('✅ fetchUserProfile completed from auth state change');
      } else {
        console.log('❌ No user in auth change, clearing state');
        setUser(null);
        setLoading(false);
        setCurrentUserId(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [isHydrated, user]);

  const fetchUserProfile = async (userId: string) => {
    console.log('🚀 fetchUserProfile called with userId:', userId, 'fetchingProfile:', fetchingProfile, 'currentUserId:', currentUserId, 'current user:', user?.id);
    
    // Strong debounce: prevent ALL concurrent calls
    if (fetchingProfile || currentUserId === userId) {
      console.log('⏳ Already fetching profile or same user, skipping...');
      return;
    }
    
    // If we already have this user loaded, skip
    if (user && user.id === userId) {
      console.log('👤 User already loaded, skipping...');
      setLoading(false);
      return;
    }
    
    console.log('🔒 Setting fetchingProfile to true and currentUserId to:', userId);
    setFetchingProfile(true);
    setCurrentUserId(userId);
    
    try {
      console.log('🔍 Step 1: Verifying current session...');
      // First, verify the current session is still valid
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.log('❌ Session invalid or expired, signing out');
        await supabase.auth.signOut();
        setUser(null);
        setLoading(false);
        return;
      }
      
      console.log('✅ Session verified, user id:', session.user.id);
      
      // Check if the session user matches the requested user ID
      if (session.user.id !== userId) {
        console.log('❌ Session user ID mismatch, signing out');
        await supabase.auth.signOut();
        setUser(null);
        setLoading(false);
        return;
      }
      
      console.log('✅ User ID matches, proceeding to profile query...');
      console.log('📡 Executing profile query for user:', userId);
      
      // Create a fresh Supabase client for this query to avoid hanging
      const freshClient = createFreshSupabaseClient();
      
      // Retry mechanism for profile query with fresh client
      let profile, error;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          console.log(`📡 Profile query attempt ${retryCount + 1}/${maxRetries} with fresh client`);
          
          const profilePromise = freshClient
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single();
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Profile query timeout')), 3000)
          );
          
          const result = await Promise.race([profilePromise, timeoutPromise]) as any;
          profile = result.data;
          error = result.error;
          console.log('✅ Profile query succeeded on attempt', retryCount + 1);
          break;
        } catch (err: any) {
          console.log(`❌ Profile query attempt ${retryCount + 1} failed:`, err.message);
          retryCount++;
          if (retryCount < maxRetries) {
            console.log(`🔄 Retrying in 1 second...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            console.log('❌ All profile query attempts failed');
            error = err;
          }
        }
      }

      console.log('✅ Supabase query completed!');
      console.log('Profile query result:', { profile, error });

      if (error) {
        console.error('❌ Profile query error:', error);
        // If profile doesn't exist, just set user to null
        if (error.code === 'PGRST116') { // No rows returned
          console.log('❌ User profile not found in database');
          setUser(null);
          setLoading(false);
          return;
        }
        throw error;
      }

      if (!profile) {
        console.error('❌ No profile found for user:', userId);
        setUser(null);
        setLoading(false);
        return;
      }
      
      console.log('✅ Profile found, setting user state...');
      console.log('Profile data:', profile);
      setUser({
        id: userId,
        email: session.user.email || '',
        profile,
      });
      console.log('✅ User state set successfully');
      
    } catch (error) {
      console.error('💥 Error fetching user profile:', error);
      // If there's an error, sign out to clear any inconsistent state
      try {
        console.log('🔄 Attempting to sign out due to error...');
        await supabase.auth.signOut();
        console.log('✅ Sign out successful');
      } catch (signOutError) {
        console.error('❌ Error signing out:', signOutError);
      }
      setUser(null);
    } finally {
      console.log('🏁 fetchUserProfile finally block - setting loading to false');
      console.log('🏁 Setting fetchingProfile to false');
      console.log('🏁 Setting currentUserId to null');
      setLoading(false);
      setFetchingProfile(false);
      setCurrentUserId(null);
      console.log('🏁 fetchUserProfile cleanup complete');
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
