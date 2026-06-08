import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { supabase, type Profile, type UserRole } from '../lib/supabase';

interface AuthContextType {
  user: Profile | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: UserRole, address?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; address?: string; phone?: string }) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Tenta buscar o perfil com retries (o trigger do Supabase pode demorar alguns ms)
async function fetchProfile(userId: string): Promise<Profile | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (data) return data;
    // Aguarda antes de tentar novamente
    await new Promise(r => setTimeout(r, 300));
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    // Verifica sessão inicial
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user && mounted.current) {
        const profile = await fetchProfile(session.user.id);
        if (mounted.current) setUser(profile);
      }
      if (mounted.current) setIsLoading(false);
    });

    // Ouve mudanças de autenticação (login, cadastro, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted.current) return;

      if (session?.user) {
        setIsLoading(true);
        const profile = await fetchProfile(session.user.id);
        if (mounted.current) {
          setUser(profile);
          setIsLoading(false);
        }
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error('Email ou senha incorretos');
  };

  const register = async (name: string, email: string, password: string, role: UserRole, address?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role, address: address ?? '' } },
    });
    if (error) throw new Error(error.message);
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  };

  const updateProfile = async (data: { name?: string; address?: string; phone?: string }) => {
    if (!user) throw new Error('Não autenticado');
    const { data: updated, error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    if (mounted.current) setUser(updated as Profile);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateProfile, updatePassword, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
