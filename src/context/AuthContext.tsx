import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { User, Organization } from '../types';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; role: string; organizationName?: string }) => Promise<void>;
  logout: () => void;
  quickLogin: (role: 'admin' | 'organizer1' | 'organizer2' | 'attendee') => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('eventsphere_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    try {
      const storedToken = localStorage.getItem('eventsphere_token');
      if (!storedToken) {
        setUser(null);
        setOrganization(null);
        setLoading(false);
        return;
      }
      const res = await api.get('/auth/me');
      setUser(res.data.user);
      setOrganization(res.data.organization || null);
    } catch (err) {
      localStorage.removeItem('eventsphere_token');
      setToken(null);
      setUser(null);
      setOrganization(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: newUser, organization: newOrg } = res.data;
    localStorage.setItem('eventsphere_token', newToken);
    setToken(newToken);
    setUser(newUser);
    setOrganization(newOrg || null);
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    role: string;
    organizationName?: string;
  }) => {
    const res = await api.post('/auth/register', data);
    const { token: newToken, user: newUser, organization: newOrg } = res.data;
    localStorage.setItem('eventsphere_token', newToken);
    setToken(newToken);
    setUser(newUser);
    setOrganization(newOrg || null);
  };

  const logout = () => {
    localStorage.removeItem('eventsphere_token');
    setToken(null);
    setUser(null);
    setOrganization(null);
  };

  const quickLogin = async (role: 'admin' | 'organizer1' | 'organizer2' | 'attendee') => {
    let email = '';
    let password = '';
    if (role === 'admin') {
      email = 'admin@eventsphere.com';
      password = 'Admin@123';
    } else if (role === 'organizer1') {
      email = 'sarah@pulseevents.com';
      password = 'Organizer@123';
    } else if (role === 'organizer2') {
      email = 'david@horizonlive.com';
      password = 'Organizer@123';
    } else {
      email = 'attendee@example.com';
      password = 'Attendee@123';
    }
    await login(email, password);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        token,
        loading,
        login,
        register,
        logout,
        quickLogin,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
