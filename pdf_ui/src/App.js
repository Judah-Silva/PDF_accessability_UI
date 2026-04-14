// App.jsx
import React, { useState } from 'react';
import {
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { AuthProvider, useAuth } from 'react-oidc-context';
import { WebStorageStateStore } from 'oidc-client-ts';
import {isMaintenanceMode} from './utilities/constants.jsx';

import theme from './theme';
import { HostedUIUrl } from './utilities/constants';

import LandingPage from './pages/LandingPage';

import MainApp from './MainApp';
import CallbackPage from './pages/CallbackPage'; 
import MaintenancePage from './pages/MaintenancePage';
import PreviewApp from './preview/PreviewApp';
import SilentRenew from './pages/SilentRenew.jsx';

const oidcConfig = {
  authority: process.env.DUO_AUTHORITY,
  client_id: process.env.DUO_CLIENT_ID,
  redirect_uri: `${HostedUIUrl}/callback`, // Amplify redirect_uri
  post_logout_redirect_uri: `${HostedUIUrl}/home`,
  // redirect_uri: 'http://localhost:3000/callback', // Local redirect_uri
  // post_logout_redirect_uri: 'http://localhost:3000/home',
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  automaticSilentRenew: true,
  silent_redirect_uri: `${HostedUIUrl}/silent-renew`,
  response_type: 'code',
  scope: 'email openid phone profile offline_access',
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  },
};

function AppRoutes() {
  const auth = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (auth.isLoading) {
    return <div>Loading authentication status...</div>;
  }

  if (auth.error) {
    console.error('Authentication error.');
    return <div>Authentication failed. Please try again.</div>;
  }

  return (
    <Routes>
      {/* Landing / Public Routes */}
      <Route path="/home" element={<LandingPage />} />

      {/* Token refresh Route */}
      <Route path="/silent-renew" element={<SilentRenew />} />

      {/* Callback Route */}
      <Route path="/callback" element={<CallbackPage />} /> 

      {/* Protected App Routes */}
      <Route
        path="/app"
        element={
          auth.isAuthenticated ? (
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
  if (process.env.REACT_APP_PREVIEW_MODE === 'true') {
    return <PreviewApp />;
  }

  return (
    <AuthProvider {...oidcConfig}>
      <ThemeProvider theme={theme}>
          {/* <AppRoutes /> */}
          {isMaintenanceMode ? <MaintenancePage /> : <AppRoutes />}
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
