import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';

function CallbackPage() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait until the auth process is finished loading
    if (!auth.isLoading) {
      if (auth.isAuthenticated) {
        // After successful authentication, navigate to /app
        navigate('/app', { replace: true });
      } else {
        // If authentication failed, navigate to /home
        navigate('/home?error=auth_failed', { replace: true });
      }
    }
  }, [auth.isLoading, auth.isAuthenticated, navigate]);

  return <div>Signing you in...</div>;
}

export default CallbackPage;
