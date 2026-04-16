// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const SESSION_KEY = 'app_authenticated';
const SESSION_USERNAME_KEY = 'app_username';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // initialise synchronously from sessionStorage so there's no flicker
    return sessionStorage.getItem(SESSION_KEY) === 'true';
  });

  const [username, setUsername] = useState(() => {
    return sessionStorage.getItem(SESSION_USERNAME_KEY) ?? ''
  });

  // isLoading is only true on the very first render while we check
  // if Duo just redirected back with ?auth=true
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('auth') === 'true') {
      const usernameParam = params.get('username') ?? '';
      // Duo callback Lambda redirected here with ?auth=true
      // set the session flag and clean the param off the URL
      sessionStorage.setItem(SESSION_KEY, 'true');
      sessionStorage.setItem(SESSION_USERNAME_KEY, usernameParam)
      setIsAuthenticated(true);
      setUsername(usernameParam);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    setIsLoading(false);
  }, []);

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_USERNAME_KEY);
    setIsAuthenticated(false);
    setUsername('');
    window.location.href = '/home';
  }
  
  // called by useApiClient whenever any API call returns 401
  // token expired or cookie gone — clear state and send to login
  function handleUnauthorized() {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_USERNAME_KEY);
    setIsAuthenticated(false);
    setUsername('');
    window.location.href = '/home';
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, username, logout, handleUnauthorized }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
  return ctx;
}
