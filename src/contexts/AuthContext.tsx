import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  isLoading: boolean;
  isAdmin: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // CODE-007: mounted guard prevents setState on unmounted component
  const mountedRef = useRef(true);

  const fetchProfileAndRole = async (userId: string) => {
    try {
      setAuthError(null);

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!mountedRef.current) return;

      if (profileError) {
        // CODE-022: distinguish "not found" from real errors
        if (profileError.code !== 'PGRST116') {
          const msg = 'Failed to load profile';
          setAuthError(msg);
          toast.error(msg);
        }
      } else if (profileData) {
        setProfile(profileData);
      }

      // Fetch role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (!mountedRef.current) return;

      if (roleError && roleError.code !== 'PGRST116') {
        const msg = 'Failed to load user role';
        setAuthError(msg);
        toast.error(msg);
      } else if (roleData) {
        setRole(roleData.role);
      }
    } catch (error) {
      if (!mountedRef.current) return;
      const msg = 'Error loading account data';
      setAuthError(msg);
      toast.error(msg);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfileAndRole(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener BEFORE checking session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return;
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Use setTimeout to avoid Supabase deadlock, but keep isLoading
          // true until the profile fetch completes (UI-027)
          setTimeout(async () => {
            await fetchProfileAndRole(session.user.id);
            if (mountedRef.current) setIsLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          setIsLoading(false);
        }
      }
    );

    // CODE-002: validate with getUser() (server round-trip) instead of
    // getSession() which reads from cache and can't detect deleted users.
    supabase.auth.getUser().then(async ({ data: { user }, error }) => {
      if (!mountedRef.current) return;

      if (error || !user) {
        setUser(null);
        setSession(null);
        setIsLoading(false);
        return;
      }

      // User is validated — get session for the token/session object
      const { data: { session } } = await supabase.auth.getSession();
      if (!mountedRef.current) return;

      setSession(session);
      setUser(user);

      // UI-027: await profile fetch BEFORE setting isLoading to false
      if (user) {
        await fetchProfileAndRole(user.id);
      }

      if (mountedRef.current) setIsLoading(false);
    });

    // CODE-007: cleanup on unmount
    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    setAuthError(null);
  };

  const value = {
    user,
    session,
    profile,
    role,
    isLoading,
    isAdmin: role === 'admin',
    authError,
    signIn,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook must be co-located with its provider context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
