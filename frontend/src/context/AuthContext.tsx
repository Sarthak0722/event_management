import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export interface User {
  _id: string;
  username: string;
  email: string;
  role: 'admin' | 'presenter' | 'attendee';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  register: (username: string, email: string, password: string, role: 'presenter' | 'attendee') => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => null,
  register: async () => {},
  logout: async () => {},
  isAuthenticated: false,
  loading: false
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/auth/me', { withCredentials: true });
        if (response.data.success) {
          setUser(response.data.data.user);
          // Redirect to appropriate page if on login or register
          const path = window.location.pathname;
          if (path === '/login' || path === '/register' || path === '/') {
            navigate(`/${response.data.data.user.role.toLowerCase()}`);
          }
        }
      } catch (error) {
        setUser(null);
        // Only redirect to login if not already there
        const path = window.location.pathname;
        if (path !== '/login' && path !== '/register') {
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      }, { withCredentials: true });
      
      if (response.data.success) {
        const userData = response.data.data.user;
        setUser(userData);
        // Let the Login component handle navigation
        return userData;
      }
      return null;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const register = async (username: string, email: string, password: string, role: 'presenter' | 'attendee') => {
    try {
      const response = await axios.post('http://localhost:5000/api/auth/register', {
        username,
        email,
        password,
        role
      }, { withCredentials: true });
      
      if (response.data.success) {
        setUser(response.data.data.user);
        navigate(`/${response.data.data.user.role.toLowerCase()}`);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const logout = async () => {
    try {
      await axios.post('http://localhost:5000/api/auth/logout', {}, { withCredentials: true });
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 