import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminHome from './pages/AdminHome';
import PresenterHome from './pages/PresenterHome';
import AttendeeHome from './pages/AttendeeHome';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/admin"
              element={
                <PrivateRoute role="admin">
                  <AdminHome />
                </PrivateRoute>
              }
            />
            <Route
              path="/presenter"
              element={
                <PrivateRoute role="presenter">
                  <PresenterHome />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendee"
              element={
                <PrivateRoute role="attendee">
                  <AttendeeHome />
                </PrivateRoute>
              }
            />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
