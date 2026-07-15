import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { ShieldOff } from "lucide-react";
import { getResourceLabel } from "@/constants/permissions";

interface RequirePermissionProps {
  resource: string;
  action?: string;
  children: ReactNode;
}

/**
 * Bloqueia a rota quando o perfil do usuário não tem a permissão exigida.
 * Esconder o item no menu não basta: sem isto a tela abre digitando a URL.
 */
export function RequirePermission({
  resource,
  action = "view",
  children,
}: RequirePermissionProps) {
  const { permissionsLoaded } = useAuth();
  const { hasPermission } = usePermissions();

  // Antes das permissões chegarem, negar mostraria um falso "sem acesso".
  if (!permissionsLoaded) {
    return (
      <div className="min-h-[50vh] w-full flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!hasPermission(resource, action)) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldOff className="h-7 w-7 text-destructive" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Acesso negado</h2>
          <p className="text-muted-foreground max-w-md">
            Seu perfil não tem permissão para acessar{" "}
            <span className="font-medium text-foreground">
              {getResourceLabel(resource)}
            </span>
            . Fale com um administrador se precisar deste acesso.
          </p>
        </div>
        <Link to="/">
          <Button variant="outline">Voltar ao início</Button>
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
