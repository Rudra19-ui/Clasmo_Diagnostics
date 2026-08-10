import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FRANCHISE_ROLES } from '../utils/roles';

function homeForUser(user) {
  if (FRANCHISE_ROLES.includes(user?.role)) return '/dashboard';
  return '/search';
}

export default function ProtectedRoute({ children, adminOnly = false, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="dash-main"><p>Loading...</p></div>;
  }

  if (!user) {
    const next = encodeURIComponent(`${location.pathname}${location.search}${location.hash}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (adminOnly && user.role !== 'admin') return <Navigate to={homeForUser(user)} replace />;
  if (allowedRoles?.length && !allowedRoles.includes(user.role)) {
    return <Navigate to={homeForUser(user)} replace />;
  }

  return children;
}
