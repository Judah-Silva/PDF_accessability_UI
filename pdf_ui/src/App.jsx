// App.jsx
import React, { useState } from 'react';
import {
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { AuthProvider, useAuth } from 'react-oidc-context';
import {COGNITO_AUTHORITY, COGNITO_CLIENT_ID, isMaintenanceMode, REDIRECT_URI} from './utilities/constants.jsx';

import theme from './theme';

import LandingPage from './pages/LandingPage';

import MainApp from './MainApp';
import CallbackPage from './pages/CallbackPage'; 
import MaintenancePage from './pages/MaintenancePage';
import PreviewApp from './preview/PreviewApp';

const cognitoAuthConfig = {
  authority: COGNITO_AUTHORITY,
  client_id: COGNITO_CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  response_type: "code",
  scope: "email openid profile",
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  },
};


function AppRoutes() {
  const auth = useAuth();

  if (auth.isLoading) {
    return <div>Loading authentication status...</div>;
  }

  if (auth.error) {
    console.error('Authentication error:', auth.error);
    return <div>Authentication Error: {auth.error.message}</div>;
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
          auth.isAuthenticated ? (
            <MainApp/>
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
    <AuthProvider {...cognitoAuthConfig}>
      <ThemeProvider theme={theme}>
          {/* <AppRoutes /> */}
          {isMaintenanceMode ? <MaintenancePage /> : <AppRoutes />}
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
