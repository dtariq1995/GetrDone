import { Navigate, Outlet, useLocation, type Location } from 'react-router';
import { LoaderCircle } from 'lucide-react';
import { useMe } from '../api/auth';
import { FullPageMessage } from './FullPageMessage';

// Shown while useMe() asks the server who is logged in, or if it can't be
// reached at all.
function AuthStatus() {
  const me = useMe();
  if (me.isError) {
    return (
      <FullPageMessage>
        <p>Couldn't reach GetrDone.</p>
        <button
          onClick={() => void me.refetch()}
          className="font-medium text-indigo-600 hover:underline"
        >
          Try again
        </button>
      </FullPageMessage>
    );
  }
  return (
    <FullPageMessage>
      <LoaderCircle className="size-6 animate-spin" aria-label="Loading" />
    </FullPageMessage>
  );
}

// Wraps every page that needs a logged-in user. Logged-out visitors are sent
// to /login, remembering where they were headed. This is only for the UI;
// the API enforces auth on its own.
export function ProtectedRoute() {
  const me = useMe();
  const location = useLocation();

  if (me.data === undefined) {
    return <AuthStatus />;
  }
  if (me.data === null) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

// Wraps /login and /register. Once someone is logged in (including right
// after they submit the form), send them on to the page they originally
// wanted, or to the app's home page.
export function GuestRoute() {
  const me = useMe();
  const location = useLocation();
  const from = (location.state as { from?: Location } | null)?.from;

  if (me.data === undefined) {
    return <AuthStatus />;
  }
  if (me.data) {
    return <Navigate to={from ?? '/'} replace />;
  }
  return <Outlet />;
}
