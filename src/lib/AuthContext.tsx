import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  signInAsAdmin: (username: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  isLoginOpen: boolean;
  setIsLoginOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define the admin emails here
const ADMIN_EMAILS = ['khazratkulovshokhzod@gmail.com'];
const ADMIN_CREDENTIALS = {
  username: 'Shokhzod',
  password: 'Shokhzod03@'
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mockAdminActive, setMockAdminActive] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  useEffect(() => {
    // Check locally stored mock admin
    const isMockAdmin = localStorage.getItem('mock_admin_active') === 'true';
    if (isMockAdmin) {
      setMockAdminActive(true);
      setIsAdmin(true);
      // Create a mock user object
      const mockUser = {
        id: 'mock-admin-id',
        email: ADMIN_EMAILS[0],
        user_metadata: { full_name: 'Admin Shokhzod' },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString()
      } as unknown as User;
      setUser(mockUser);
    }

    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMockAdmin) {
        setSession(session);
        setUser(session?.user ?? null);
        setIsAdmin(!!session?.user?.email && ADMIN_EMAILS.includes(session.user.email));
      }
      setLoading(false);
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!localStorage.getItem('mock_admin_active')) {
        setSession(session);
        setUser(session?.user ?? null);
        setIsAdmin(!!session?.user?.email && ADMIN_EMAILS.includes(session.user.email));
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  };

  const signInWithEmail = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  };

  const signInAsAdmin = async (username: string, password: string): Promise<boolean> => {
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      localStorage.setItem('mock_admin_active', 'true');
      setMockAdminActive(true);
      setIsAdmin(true);
      const mockUser = {
        id: 'mock-admin-id',
        email: ADMIN_EMAILS[0],
        user_metadata: { full_name: 'Admin Shokhzod' },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString()
      } as unknown as User;
      setUser(mockUser);
      return true;
    }
    return false;
  };

  const signOut = async () => {
    localStorage.removeItem('mock_admin_active');
    setMockAdminActive(false);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = useMemo(() => ({
    user,
    session,
    loading,
    isAdmin,
    signInWithGoogle,
    signInWithEmail,
    signInAsAdmin,
    signOut,
    isLoginOpen,
    setIsLoginOpen,
  }), [user, session, loading, isAdmin, isLoginOpen]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
