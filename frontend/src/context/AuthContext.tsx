import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios, { CancelTokenSource } from 'axios';
import axiosInstance from '../config/axios';

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

const defaultContext: AuthContextType = {
  user: null,
  login: async () => null,
  register: async () => {},
  logout: async () => {},
  isAuthenticated: false,
  loading: true
};

const AuthContext = createContext<AuthContextType>(defaultContext);

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
  const location = useLocation();
  const cancelTokenRef = useRef<CancelTokenSource | null>(null);
  const authCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkAuth = useCallback(async () => {
    // Clear any existing timeout
    if (authCheckTimeoutRef.current) {
      clearTimeout(authCheckTimeoutRef.current);
      authCheckTimeoutRef.current = null;
    }

    // Cancel any previous request
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel('Operation canceled due to new request.');
      cancelTokenRef.current = null;
    }

    // Create a new cancel token
    cancelTokenRef.current = axios.CancelToken.source();

    try {
      const response = await axiosInstance.get('/auth/me', {
        cancelToken: cancelTokenRef.current.token
      });
      
      if (response.data.success) {
        const userData = response.data.data.user;
        setUser(userData);
        
        // Only redirect if we're on the login/register/root page and have a valid user
        if (['/login', '/register', '/'].includes(location.pathname) && userData.role) {
          navigate(`/${userData.role.toLowerCase()}`, { replace: true });
        }
      } else {
        setUser(null);
        if (!['/login', '/register'].includes(location.pathname)) {
          navigate('/login', { replace: true });
        }
      }
    } catch (error) {
      if (axios.isCancel(error)) {
        console.log('Request canceled:', error.message);
        return;
      }
      
      console.error('Auth check error:', error);
      setUser(null);
      
      if (!['/login', '/register'].includes(location.pathname)) {
        navigate('/login', { replace: true });
      }
    } finally {
      setLoading(false);
      cancelTokenRef.current = null;
    }
  }, [navigate, location.pathname]);

  useEffect(() => {
    // Initial auth check
    checkAuth();

    // Cleanup function
    return () => {
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel('Component unmounted');
        cancelTokenRef.current = null;
      }
      if (authCheckTimeoutRef.current) {
        clearTimeout(authCheckTimeoutRef.current);
        authCheckTimeoutRef.current = null;
      }
    };
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await axiosInstance.post('/auth/login', {
        email,
        password
      });
      
      if (response.data.success) {
        const userData = response.data.data.user;
        setUser(userData);
        navigate(`/${userData.role.toLowerCase()}`, { replace: true });
        return userData;
      }
      throw new Error(response.data.message || 'Login failed');
    } catch (error: any) {
      console.error('Login error:', error);
      if (axios.isCancel(error)) {
        return null;
      }
      throw new Error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string, role: 'presenter' | 'attendee') => {
    setLoading(true);
    try {
      const response = await axiosInstance.post('/auth/register', {
        username,
        email,
        password,
        role
      });
      
      if (response.data.success) {
        const userData = response.data.data.user;
        setUser(userData);
        navigate(`/${userData.role.toLowerCase()}`, { replace: true });
        return;
      }
      throw new Error(response.data.message || 'Registration failed');
    } catch (error: any) {
      console.error('Registration error:', error);
      if (axios.isCancel(error)) {
        return;
      }
      throw new Error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await axiosInstance.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setLoading(false);
      navigate('/login', { replace: true });
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider; 