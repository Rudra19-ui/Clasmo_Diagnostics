import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
  if (adminOnly && user.role !== 'admin') return <Navigate to="/search" replace />;
  if (allowedRoles?.length && !allowedRoles.includes(user.role)) {
    return <Navigate to="/search" replace />;
  }

  return children;
}
