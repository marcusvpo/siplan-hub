import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, permissionsLoaded } = useAuth();
  const location = useLocation();

  if (loading || !permissionsLoaded) {
    return <div className="flex min-h-[100dvh] w-full items-center justify-center">Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
