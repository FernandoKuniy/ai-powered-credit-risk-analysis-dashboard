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

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔍 Initial session check:', session);
      setSession(session);
      if (session?.user) {
        console.log('👤 User found in session:', session.user.id);
        fetchUserProfile(session.user.id);
      } else {
        console.log('❌ No user in session');
        setUser(null);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state change:', event, session);
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

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    console.log('🚀 fetchUserProfile called with userId:', userId);
    try {
      console.log('Fetching user profile for:', userId);
      console.log('🔗 Supabase client:', supabase);
      console.log('🔗 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      console.log('Profile query result:', { profile, error });

      if (error) {
        console.error('Profile query error:', error);
        // If profile doesn't exist, sign out the user to clear stale session
        if (error.code === 'PGRST116') { // No rows returned
          console.log('User profile not found, signing out stale session');
          await supabase.auth.signOut();
        }
        throw error;
      }

      if (!profile) {
        console.error('No profile found for user:', userId);
        console.log('User profile not found, signing out stale session');
        await supabase.auth.signOut();
        throw new Error('No profile found');
      }

      setUser({
        id: userId,
        email: session?.user.email || '',
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
