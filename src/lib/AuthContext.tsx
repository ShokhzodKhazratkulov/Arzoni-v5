import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';
import { User, Session } from '@supabase/supabase-js';
import { Profile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.warn('Profile fetch error:', error.message);
        return null;
      }
      return data as Profile;
    } catch (err) {
      console.error('Error in fetchProfile:', err);
      return null;
    }
  };

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        let userProfile = await fetchProfile(currentUser.id);
        
        if (!userProfile) {
          console.log('No profile found during initial session check, attempting to create...');
          const { error: upsertError } = await supabase.from('profiles').upsert({
            id: currentUser.id,
            email: currentUser.email,
            full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0],
            role: (currentUser.email && ['khazratkulovshokhzod@gmail.com', 'abdullayevamuborak548@gmail.com'].includes(currentUser.email)) ? 'admin' : 'user',
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
          
          if (!upsertError) {
            userProfile = await fetchProfile(currentUser.id);
          }
        }
        setProfile(userProfile);
      }
      setLoading(false);
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        console.log('Auth state change: User detected', currentUser.id);
        const userProfile = await fetchProfile(currentUser.id);
        
        if (!userProfile) {
          console.log('No profile found during auth state change, attempting to create...');
          const { error: upsertError } = await supabase.from('profiles').upsert({
            id: currentUser.id,
            email: currentUser.email,
            full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0],
            role: (currentUser.email && ['khazratkulovshokhzod@gmail.com', 'abdullayevamuborak548@gmail.com'].includes(currentUser.email)) ? 'admin' : 'user',
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
          
          if (upsertError) {
            console.error('Error creating profile in onAuthStateChange:', upsertError);
          } else {
            console.log('Profile created successfully in onAuthStateChange');
            const refreshed = await fetchProfile(currentUser.id);
            setProfile(refreshed);
          }
        } else {
          setProfile(userProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data: { user }, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;

    if (user) {
      try {
        // Ensure profile exists on sign in
        const { data: existingProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();
        
        if (fetchError) {
          console.error('Error fetching profile during sign in:', fetchError);
        }
        
        if (!existingProfile) {
          console.log('No profile found for user, creating one...');
          const { error: upsertError } = await supabase.from('profiles').upsert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || email.split('@')[0],
            role: (user.email && ['khazratkulovshokhzod@gmail.com', 'abdullayevamuborak548@gmail.com'].includes(user.email)) ? 'admin' : 'user',
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
          
          if (upsertError) {
            console.error('Error creating profile during sign in:', upsertError);
          } else {
            console.log('Profile created successfully on sign in');
          }
        }
        await refreshProfile();
      } catch (err) {
        console.error('Unexpected error in profile initialization during sign in:', err);
      }
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: 'user'
        },
      },
    });
    
    if (error) throw error;

    if (data.user) {
      try {
        console.log('Attempting to create profile for new user:', data.user.id);
        const { error: upsertError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email,
          full_name: fullName || data.user.user_metadata?.full_name || email.split('@')[0],
          role: (data.user.email && ['khazratkulovshokhzod@gmail.com', 'abdullayevamuborak548@gmail.com'].includes(data.user.email)) ? 'admin' : 'user',
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
        
        if (upsertError) {
          console.error('Error creating profile during sign up:', upsertError);
          // If this fails, it might be because the user isn't confirmed yet 
          // and RLS prevents insertion by unauthenticated users.
        } else {
          console.log('Profile created successfully on sign up');
        }
        await refreshProfile();
      } catch (err) {
        console.error('Unexpected error in profile creation during sign up:', err);
      }
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const refreshProfile = async () => {
    if (user) {
      const userProfile = await fetchProfile(user.id);
      setProfile(userProfile);
    }
  };

  const isAdmin = useMemo(() => {
    const adminEmails = ['khazratkulovshokhzod@gmail.com', 'abdullayevamuborak548@gmail.com'];
    return profile?.role === 'admin' || (user?.email && adminEmails.includes(user.email));
  }, [profile, user]);

  const value = useMemo(() => ({
    user,
    profile,
    session,
    loading,
    isAdmin,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  }), [user, profile, session, loading, isAdmin]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
