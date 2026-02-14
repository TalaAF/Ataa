// ===== Field App - Auth Context =====
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../api/client';

interface User {
  id: string;
  username: string;
  full_name: string;
  role: string;
  zone_id?: string;
  shelter_id?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('field_token');
    const savedUser = localStorage.getItem('field_user');

    if (savedToken && savedUser) {
      api.setToken(savedToken);
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const response = await api.login(username, password);
    const { token: newToken, user: userData } = response.data;

    api.setToken(newToken);
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('field_token', newToken);
    localStorage.setItem('field_user', JSON.stringify(userData));
    // Also store for sync service compatibility
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('auth_token', newToken);
  };

  const logout = () => {
    api.setToken(null);
    setToken(null);
    setUser(null);
    localStorage.removeItem('field_token');
    localStorage.removeItem('field_user');
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
