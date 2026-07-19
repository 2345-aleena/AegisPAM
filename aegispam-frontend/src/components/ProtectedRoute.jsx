import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Seal from "./Seal";

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="flex flex-col items-center gap-3 text-brown-600">
          <Seal state="pending" size={36} className="animate-pulse" />
          <p className="text-sm">Loading AegisPAM…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream px-4">
        <div className="text-center">
          <p className="font-display text-2xl text-brown-800">Access restricted</p>
          <p className="text-sm text-ink-soft mt-2">Your role doesn't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return children;
}
