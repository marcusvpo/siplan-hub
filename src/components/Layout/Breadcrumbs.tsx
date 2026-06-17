import { useLocation, Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { useProjectsV2 } from "@/hooks/useProjectsV2";

export function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);
  const { projects } = useProjectsV2();

  const breadcrumbMap: Record<string, string> = {
    projects: "Projetos",
    conversion: "Conversão",
    engines: "Motores",
    homologation: "Homologação",
    dashboard: "Dashboard",
    "orion-tn-models": "Modelos Orion TN",
  };

  const getBreadcrumbName = (value: string) => {
    if (breadcrumbMap[value]) {
      return breadcrumbMap[value];
    }
    
    // Check if value is a UUID (length 36, exactly 5 segments separated by hyphens)
    const isUuid = value.length === 36 && value.split("-").length === 5;
    if (isUuid) {
      const foundProject = projects?.find((p) => p.id === value);
      return foundProject ? foundProject.clientName : "Carregando...";
    }
    
    // Fallback: capitalize first letter and replace hyphens with spaces
    return value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, " ");
  };

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center text-sm text-muted-foreground"
    >
      <Link
        to="/"
        className="flex items-center hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      {pathnames.length > 0 && <ChevronRight className="h-4 w-4 mx-2" />}

      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join("/")}`;
        const isLast = index === pathnames.length - 1;
        const name = getBreadcrumbName(value);

        return (
          <div key={to} className="flex items-center">
            {isLast ? (
              <span className="font-medium text-foreground max-w-[240px] md:max-w-[360px] truncate" title={name}>
                {name}
              </span>
            ) : (
              <Link
                to={to}
                className="hover:text-foreground transition-colors max-w-[200px] truncate"
                title={name}
              >
                {name}
              </Link>
            )}
            {!isLast && <ChevronRight className="h-4 w-4 mx-2" />}
          </div>
        );
      })}

      {/* Custom Logic for Implantação Parent if needed */}
      {location.pathname === "/projects" && (
        <div className="hidden">
          {/* This is just a simple path based breadcrumb. */}
        </div>
      )}
    </nav>
  );
}
