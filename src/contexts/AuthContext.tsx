import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { AuthState } from '../types';
import { mockUsers } from '../utils/mockData';

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(() => {
    const stored = sessionStorage.getItem('lounge_auth');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return { user: null, isAuthenticated: false };
      }
    }
    return { user: null, isAuthenticated: false };
  });

  const login = useCallback((username: string, _password: string) => {
    const user = mockUsers.find(u => u.username === username && u.isActive);
    if (user) {
      const state: AuthState = { user, isAuthenticated: true };
      setAuthState(state);
      sessionStorage.setItem('lounge_auth', JSON.stringify(state));
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setAuthState({ user: null, isAuthenticated: false });
    sessionStorage.removeItem('lounge_auth');
  }, []);

  return (
    <AuthContext.Provider value={{ ...authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
