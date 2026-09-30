'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from './api';

const AuthContext = createContext({
  admin: null,
  token: null,
  loading: true,
  login: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }) {
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth from localStorage on mount
  useEffect(() => {
    async function initAuth() {
      try {
        const storedToken = localStorage.getItem('provider_admin_token') || localStorage.getItem('provider_token');
        const storedAdmin = localStorage.getItem('provider_admin_user') || localStorage.getItem('provider_admin');

        if (storedToken) {
          setToken(storedToken);
          if (storedAdmin) {
            try {
              setAdmin(JSON.parse(storedAdmin));
            } catch (e) {
              console.error('Failed to parse cached admin:', e);
            }
          }

          // Verify token with backend
          try {
            const res = await api.get('/auth/me');
            if (res.data?.admin) {
              setAdmin(res.data.admin);
              localStorage.setItem('provider_admin_user', JSON.stringify(res.data.admin));
            }
          } catch (err) {
            console.warn('Token validation failed or offline:', err?.message);
            if (err?.response?.status === 401) {
              localStorage.removeItem('provider_admin_token');
              localStorage.removeItem('provider_token');
              localStorage.removeItem('provider_admin_user');
              setAdmin(null);
              setToken(null);
            }
          }
        }
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', {
      email: email.trim().toLowerCase(),
      password,
    });

    const { token: receivedToken, admin: adminData } = res.data;
    if (!receivedToken) {
      throw new Error('No authentication token received');
    }

    localStorage.setItem('provider_admin_token', receivedToken);
    localStorage.setItem('provider_token', receivedToken); // compatibility
    localStorage.setItem('provider_admin_user', JSON.stringify(adminData));

    setToken(receivedToken);
    setAdmin(adminData);
    return adminData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('provider_admin_token');
    localStorage.removeItem('provider_token');
    localStorage.removeItem('provider_admin_user');
    localStorage.removeItem('provider_admin');
    setToken(null);
    setAdmin(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ admin, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
