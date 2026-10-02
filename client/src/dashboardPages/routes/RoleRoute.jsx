import { Navigate } from 'react-router-dom';
import useAuth from '../../shared/hooks/useAuth.js';
import { homeForRole } from '../../landingPages/store/authStore.js';

/** Restricts children to the given roles; others go to their own home */
export default function RoleRoute({ roles, children }) {
  const { role } = useAuth();
  if (!roles.includes(role)) return <Navigate to={homeForRole(role)} replace />;
  return children;
}
