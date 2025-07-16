import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Login from './pages/Login';
import Register from './pages/Register';
import PresenterHome from './pages/PresenterHome';
import AttendeeHome from './pages/AttendeeHome';
import AdminHome from './pages/AdminHome';
import AdminDashboard from './pages/AdminDashboard';
import AddPaper from './pages/AddPaper'; 
import ScheduleManager from './pages/ScheduleManager';
import CommunicationCenter from './pages/CommunicationCenter';
import PresenterManagement from './pages/PresenterManagement';
import PrivateRoute from './components/PrivateRoute';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AddSpecialSession from './pages/AddSpecialSession';
import DomainPaperChart from './pages/DomainPaperChart';
import HomePage from './pages/HomePage';
import Timetable from './pages/Timetable';
import AdminSlotAllocationPage from './pages/AdminSlotAllocationPage';
import Layout from './components/Layout';
import UserSelector from './components/UserSelector';

import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const theme = createTheme({
  palette: {
    primary: {
      main: '#00838F', // Darker turquoise as main color
      light: '#4DD0E1', // Previous main color becomes light
      dark: '#006064', // Even darker shade for hover/emphasis
      contrastText: '#fff',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        contained: {
          backgroundColor: '#00838F',
          '&:hover': {
            backgroundColor: '#006064',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#00838F',
        },
      },
    },
  },
});

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <AuthProvider>
            <NotificationProvider>
              <Routes>
                {/* Public routes with Layout */}
                <Route path="/" element={<HomePage />} />
                <Route path="/timetable" element={
                  <Layout>
                    <Timetable />
                  </Layout>
                } />
                <Route path="/presenter" element={<Layout><PresenterHome /></Layout>} />
                <Route path="/attendee" element={<Layout><AttendeeHome /></Layout>} />
                <Route path="/admin" element={<Layout><AdminHome /></Layout>} />
                <Route path="/admin/dashboard" element={<Layout><AdminDashboard /></Layout>} />
                <Route path="/admin/schedule" element={<Layout><ScheduleManager /></Layout>} />
                <Route path="/admin/communications" element={<Layout><CommunicationCenter /></Layout>} />
                <Route path="/admin/add-paper" element={<Layout><AddPaper /></Layout>} />
                <Route path="/admin/presenters" element={<Layout><PresenterManagement /></Layout>} />
                <Route path="/admin/add-special-session" element={<Layout><AddSpecialSession /></Layout>} />
                <Route path="/admin/slot-allocation" element={<Layout><AdminSlotAllocationPage /></Layout>} />
              </Routes>
            </NotificationProvider>
          </AuthProvider>
        </LocalizationProvider>
      </Router>
    </ThemeProvider>
  );
};

export default App;
