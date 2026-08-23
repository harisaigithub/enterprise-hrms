/**
 * RequireAuth — route guard.
 * Redirects unauthenticated users to /login; shows a spinner while the
 * session is being restored from the stored access token.
 */

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Spinner from "../shared/Spinner";

export default function RequireAuth({ children, permission }) {
  const { user, loading, permissions } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--background)" }}>
        <Spinner size={32} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (permission && !permissions.includes(permission)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
