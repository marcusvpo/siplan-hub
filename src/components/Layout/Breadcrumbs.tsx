import { useLocation, Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { useProjectsV2 } from "@/hooks/useProjectsV2";

export function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);
  const { projects } = useProjectsV2();

  const breadcrumbMap: Record<string, string> = {
    implantacao: "Implantação",
    calendario: "Calendário",
    calendar: "Calendário de Projetos",
    "agenda-analistas": "Agenda dos Analistas",
    projects: "Projetos",
    reports: "Relatórios",
    deployments: "Próximas Implantações",
    latest: "Últimas Implantações",
    commercial: "Comercial",
    customers: "Painel de Clientes",
    blockers: "Bloqueios",
    contacts: "Contatos",
    checklists: "Checklist do Cliente",
    conversion: "Conversão",
    atividades: "Gestão de Atividades",
    engines: "Motores",
    homologation: "Homologação",
    dashboard: "Dashboard",
    indicadores: "Painel de Indicadores",
    "orion-tn-models": "Modelos Orion TN",
    editor: "Editor de Modelos",
    assistentes: "Assistentes",
    conhecimento: "Base de Conhecimento",
    logs: "Logs & Analytics",
    "links-chats": "Links e Chats",
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

  const defaultBreadcrumbs = pathnames.map((value, index) => ({
    value,
    to: `/${pathnames.slice(0, index + 1).join("/")}`,
    name: getBreadcrumbName(value),
  }));

  const syntheticRoot = (() => {
    if (
      location.pathname === "/projects" ||
      location.pathname.startsWith("/projects/") ||
      location.pathname === "/reports" ||
      location.pathname === "/deployments" ||
      location.pathname === "/deployments/latest"
    ) {
      return { value: "implantacao", to: "/implantacao", name: "Implantação" };
    }

    if (
      location.pathname === "/calendar" ||
      location.pathname === "/agenda-analistas"
    ) {
      return { value: "calendario", to: "/calendario", name: "Calendário" };
    }

    return null;
  })();

  const breadcrumbs = location.pathname.startsWith("/deployments/tickets")
    ? [
        { value: "dashboard", to: "/dashboard", name: "Dashboard" },
        {
          value: pathnames.at(-1) ?? "tickets",
          to: location.pathname,
          name: location.pathname.endsWith("tickets-legacy")
            ? "Chamados (Legado)"
            : "Consultar Chamados",
        },
      ]
    : syntheticRoot
      ? [syntheticRoot, ...defaultBreadcrumbs]
      : defaultBreadcrumbs;

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
      {breadcrumbs.length > 0 && <ChevronRight className="h-4 w-4 mx-2" />}

      {breadcrumbs.map(({ value, to, name }, index) => {
        const isLast = index === breadcrumbs.length - 1;

        return (
          <div key={to} className="flex items-center">
            {isLast ? (
              <span className="font-medium text-foreground max-w-[110px] sm:max-w-[240px] md:max-w-[360px] truncate text-xs sm:text-sm" title={name}>
                {name}
              </span>
            ) : (
              <Link
                to={to}
                className="hover:text-foreground transition-colors max-w-[90px] sm:max-w-[200px] truncate text-xs sm:text-sm"
                title={name}
              >
                {name}
              </Link>
            )}
            {!isLast && <ChevronRight className="h-4 w-4 mx-2" />}
          </div>
        );
      })}

    </nav>
  );
}
