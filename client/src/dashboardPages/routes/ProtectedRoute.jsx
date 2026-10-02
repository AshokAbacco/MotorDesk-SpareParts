import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../../shared/hooks/useAuth.js';

/** Requires any logged-in user */
export default function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAuth();
  const { pathname } = useLocation();
  if (!isLoggedIn) return <Navigate to={`/login?next=${encodeURIComponent(pathname)}`} replace />;
  return children;
}
