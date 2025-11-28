import { useLocation, Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

export function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  const breadcrumbMap: Record<string, string> = {
    "projects": "Projetos",
  };

  const getBreadcrumbName = (value: string) => breadcrumbMap[value] || value;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm text-muted-foreground">
      <Link to="/" className="flex items-center hover:text-foreground transition-colors">
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
              <span className="font-medium text-foreground capitalize">{name}</span>
            ) : (
              <Link to={to} className="hover:text-foreground transition-colors capitalize">
                {name}
              </Link>
            )}
            {!isLast && <ChevronRight className="h-4 w-4 mx-2" />}
          </div>
        );
      })}
      
      {/* Custom Logic for Implantação Parent if needed */}
      {location.pathname === '/projects' && (
         <div className="hidden">
            {/* This is just a simple path based breadcrumb. 
                For "Implantação > Projetos" visual, we might need manual overrides if the URL doesn't reflect hierarchy.
                Since URL is /projects, it shows Home > Projetos. 
                To show Home > Implantação > Projetos, we'd need to change the logic.
            */}
         </div>
      )}
    </nav>
  );
}
