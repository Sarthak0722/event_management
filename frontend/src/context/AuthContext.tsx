import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios, { CancelTokenSource } from 'axios';
import axiosInstance from '../config/axios';

export interface User {
  role: 'admin' | 'presenter' | 'attendee' | 'none';
  email?: string;
}

interface AuthContextType {
  user: User | null;
  setUserType: (role: User['role']) => void;
  setPresenterEmail: (email: string) => void;
}

const defaultContext: AuthContextType = {
  user: null,
  setUserType: () => {},
  setPresenterEmail: () => {},
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

  const setUserType = (role: User['role']) => {
    if (role === 'presenter') {
      setUser({ role, email: undefined });
    } else if (role === 'none') {
      setUser(null);
    } else {
      setUser({ role });
    }
  };

  const setPresenterEmail = (email: string) => {
    setUser({ role: 'presenter', email });
  };

  return (
    <AuthContext.Provider value={{ user, setUserType, setPresenterEmail }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
