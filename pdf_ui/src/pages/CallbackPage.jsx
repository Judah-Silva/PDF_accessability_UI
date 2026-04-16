// src/pages/CallbackPage.jsx
import React from 'react';
 
// The userCallback Lambda handles the Duo code exchange and sets
// the httpOnly cookie, then redirects the browser to /app?auth=true.
// This page only renders briefly if something goes wrong with that redirect,
// or if a user navigates to /callback directly.
function CallbackPage() {
  return <div>Completing sign in...</div>;
}
 
export default CallbackPage;

// import React, { useEffect } from 'react';
// import { useAuth } from 'react-oidc-context';
// import { useNavigate } from 'react-router-dom';

// function CallbackPage() {
//   const auth = useAuth();
//   const navigate = useNavigate();

//   useEffect(() => {
//     // Wait until the auth process is finished loading
//     if (!auth.isLoading) {
//       if (auth.isAuthenticated) {
//         // After successful authentication, navigate to /app
//         navigate('/app', { replace: true });
//       } else {
//         // If authentication failed, navigate to /home
//         navigate('/home', { replace: true });
//       }
//     }
//   }, [auth.isLoading, auth.isAuthenticated, navigate]);

//   return <div>Processing authentication...</div>;
// }

// export default CallbackPage;
