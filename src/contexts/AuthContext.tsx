import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['users']['Row'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{
    error: Error | null;
    data: Session | null;
  }>;
  signUp: (email: string, password: string) => Promise<{
    error: Error | null;
    data: { user: User | null; session: Session | null };
  }>;
  signOut: () => Promise<void>;
  signInWithProvider: (provider: 'google') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      // Lưu user id vào localStorage nếu có
      if (session?.user) {
        localStorage.setItem('sb-user-id', session.user.id);
      } else {
        localStorage.removeItem('sb-user-id');
      }
    });

    // Set up listener for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
        if (session?.user) {
          localStorage.setItem('sb-user-id', session.user.id);
        } else {
          localStorage.removeItem('sb-user-id');
          // Xóa thêm các token Supabase nếu cần
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
              localStorage.removeItem(key);
            }
          });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch user profile when user changes
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfile(null);
        setIsAdmin(false);
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
      setIsAdmin(data.role === 'admin');
    };

    fetchProfile();
  }, [user]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return {
      error: null,
      data: data?.session ?? null,
    };
  };

  const signUp = async (email: string, password: string) => {
    return await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          role: 'customer'
        }
      }
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('sb-user-id');
    // Xóa thêm các token Supabase nếu cần (phòng trường hợp Supabase không tự xóa)
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        localStorage.removeItem(key);
      }
    });
  };

  // Đăng nhập với Google
  const signInWithProvider = async (provider: 'google') => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;

      // Lắng nghe sự kiện auth state change để tạo profile cho user mới
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Kiểm tra xem user đã có profile chưa
          const { data: existingProfile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          // Nếu chưa có profile, tạo mới
          if (!existingProfile) {
            const { error: insertError } = await supabase
              .from('users')
              .insert([
                {
                  id: session.user.id,
                  email: session.user.email,
                  role: 'customer',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }
              ]);

            if (insertError) {
              console.error('Lỗi khi tạo profile:', insertError);
            }
          }
        }
      });

      // Hủy subscription sau 5 giây để tránh memory leak
      setTimeout(() => {
        subscription.unsubscribe();
      }, 5000);

    } catch (error: any) {
      console.error('Lỗi đăng nhập:', error.message);
      throw error;
    }
  };

  const value = {
    user,
    profile,
    session,
    isLoading,
    isAdmin,
    signIn,
    signUp,
    signOut,
    signInWithProvider,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}