import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

// Gate host-only routes. Sends unauthenticated users to /login and remembers
// where they were headed so they return there after signing in.
export default function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}
