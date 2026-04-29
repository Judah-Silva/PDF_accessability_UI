// App.jsx
import React, { useState } from 'react';
import {
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { AuthProvider, useAuthContext } from './context/AuthContext.jsx';
import {isMaintenanceMode} from './utilities/constants.jsx';

import theme from './theme';

import LandingPage from './pages/LandingPage';

import MainApp from './MainApp';
import CallbackPage from './pages/CallbackPage'; 
import MaintenancePage from './pages/MaintenancePage';
import PreviewApp from './preview/PreviewApp';

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuthContext();
  // const auth = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (isLoading) {
    return <div>Loading authentication status...</div>;
  }

  return (
    <Routes>
      {/* Landing / Public Routes */}
      <Route path="/home" element={<LandingPage />} />

      {/* Callback Route */}
      <Route path="/callback" element={<CallbackPage />} /> 

      {/* Protected App Routes */}
      <Route
        path="/app"
        element={
          isAuthenticated ? (
            <MainApp
              isLoggingOut={isLoggingOut}
              setIsLoggingOut={setIsLoggingOut}
            />
          ) : (
            <Navigate to="/home" replace />
          )
        }
      />

      {/* Fallback: redirect unknown paths to /home */}
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}

function App() {
  if (import.meta.env.REACT_APP_PREVIEW_MODE === 'true') {
    return <PreviewApp />;
  }

  return (
    <AuthProvider>
      <ThemeProvider theme={theme}>
          {/* <AppRoutes /> */}
          {isMaintenanceMode ? <MaintenancePage /> : <AppRoutes />}
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
