import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';

export default function SilentRenew() {
  const auth = useAuth();

  useEffect(() => {
    auth.signinSilentCallback().catch((err) => {
      // silent renewal failures are normal (e.g. user went idle)
      // don't redirect or show UI — the parent window handles fallback
      console.warn('[Silent renew failed]', err);
    });
  }, [auth]);

  // render nothing — this page only exists inside a hidden iframe
  return null;
}
