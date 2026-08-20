import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getSession, getTokenExpiryMs, clearSession } from '../api/api';

// Every other 401-handling path (api.js's request()) is "lazy": it only
// notices the session expired the next time the user clicks something and
// a request goes out. That's fine for security (the backend still rejects
// the request either way) but it's a poor experience if someone is just
// sitting on a page - they don't get told anything until they act.
//
// This component makes expiry ACTIVE instead: it reads the token's exact
// expiration timestamp and sets a real timer for that exact moment, so the
// user gets logged out and redirected the instant time is up, even if
// they're idle and never click anything.
//
// Mounted once at the top of the app (see App.jsx) so it runs for the
// entire session regardless of which page is showing. Re-checks whenever
// the route changes, which naturally covers the case of a fresh login
// (new token -> new expiry time) without needing extra plumbing.
export default function SessionWatcher() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const session = getSession();
    if (!session.token) return;

    const expiryMs = getTokenExpiryMs();
    if (!expiryMs) return;

    const msUntilExpiry = expiryMs - Date.now();

    // Already expired (e.g. laptop was asleep past the expiry time) - log
    // out immediately rather than waiting for a negative-delay timer.
    if (msUntilExpiry <= 0) {
      clearSession();
      if (!location.pathname.startsWith('/login')) {
        navigate('/login?expired=1', { replace: true });
      }
      return;
    }

    const timer = setTimeout(() => {
      clearSession();
      navigate('/login?expired=1', { replace: true });
    }, msUntilExpiry);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return null;
}
