import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";
import { AuthLoadError } from "@/components/auth/AuthLoadError";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, permissionsLoaded, authError } = useAuth();
  const location = useLocation();

  if (authError) return <AuthLoadError />;

  if (loading || !permissionsLoaded) {
    return <div className="flex min-h-[100dvh] w-full items-center justify-center">Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
