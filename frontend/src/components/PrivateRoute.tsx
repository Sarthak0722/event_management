import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode;
  role: 'admin' | 'presenter' | 'attendee';
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, role }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (user.role !== role) {
    // Redirect to appropriate home page based on role
    switch (user.role) {
      case 'admin':
        return <Navigate to="/admin" />;
      case 'presenter':
        return <Navigate to="/presenter" />;
      case 'attendee':
        return <Navigate to="/attendee" />;
      default:
        return <Navigate to="/login" />;
    }
  }

  return <>{children}</>;
};

export default PrivateRoute; 