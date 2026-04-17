// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { SESSION_KEY, SESSION_USERNAME_KEY, SESSION_TOKEN_KEY } from '../utilities/constants';
import { isTokenExpired } from '../utilities/tokenUtils';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const flag  = localStorage.getItem(SESSION_KEY) === 'true';
    const token = localStorage.getItem(SESSION_TOKEN_KEY);

    // clear state if token is already expired when the app loads
    if (flag && (!token || isTokenExpired(token))) {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_TOKEN_KEY);
      localStorage.removeItem(SESSION_USERNAME_KEY);
      return false;
    }

    return flag;
  });

  const [username, setUsername] = useState(() => {
    return localStorage.getItem(SESSION_USERNAME_KEY) ?? ''
  });

  // isLoading is only true on the very first render while we check
  // if Duo just redirected back with ?auth=true
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('auth') === 'true') {
      const token = params.get('token') ?? '';
      const usernameParam = params.get('username') ?? '';
      // Duo callback Lambda redirected here with ?auth=true
      // set the session flag and clean the param off the URL
      localStorage.setItem(SESSION_KEY, 'true');
      localStorage.setItem(SESSION_TOKEN_KEY, token);
      localStorage.setItem(SESSION_USERNAME_KEY, usernameParam);
      setIsAuthenticated(true);
      setUsername(usernameParam);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    setIsLoading(false);
  }, []);

  function logout() {
    console.log('Logging out');
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_USERNAME_KEY);
    localStorage.removeItem(SESSION_TOKEN_KEY);
    setIsAuthenticated(false);
    setUsername('');
    window.location.href = '/home';
  }
  
  // called by useApiClient whenever any API call returns 401
  // token expired or cookie gone — clear state and send to login
  function handleUnauthorized() {
    console.log('User is not authenticated. Returning to landing.');
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_USERNAME_KEY);
    localStorage.removeItem(SESSION_TOKEN_KEY);
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
