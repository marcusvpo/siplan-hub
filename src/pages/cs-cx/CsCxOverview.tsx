import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardList,
  Contact,
  Headset,
  ListChecks,
  MapPin,
  Settings2,
  ShieldCheck,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePermissions } from "@/hooks/usePermissions";

interface CsCxArea {
  title: string;
  description: string;
  path: string;
  permission: string;
  icon: LucideIcon;
}

const areas: CsCxArea[] = [
  {
    title: "Solicitações",
    description: "Registros, solicitações, filtros e acompanhamento em Kanban.",
    path: "/cs-cx/registros",
    permission: "cs_cx_registros",
    icon: ClipboardList,
  },
  {
    title: "Cartórios",
    description: "Cadastro, produtos implantados e histórico consolidado.",
    path: "/cs-cx/cartorios",
    permission: "cs_cx_cartorios",
    icon: Building2,
  },
  {
    title: "Contatos",
    description: "Interações, responsáveis, produtos e indicadores de contato.",
    path: "/cs-cx/contatos",
    permission: "cs_cx_contatos",
    icon: Contact,
  },
  {
    title: "Agendamentos",
    description: "Agenda operacional, calendário e ações de conclusão ou remarcação.",
    path: "/cs-cx/agendamentos",
    permission: "cs_cx_agendamentos",
    icon: CalendarDays,
  },
  {
    title: "Rotinas",
    description: "Modelos, aplicações por cartório, configurações e histórico.",
    path: "/cs-cx/rotinas",
    permission: "cs_cx_rotinas",
    icon: ListChecks,
  },
  {
    title: "Visitas",
    description: "Planejamento, checklist, pendências, anexos e solicitações geradas.",
    path: "/cs-cx/visitas",
    permission: "cs_cx_visitas",
    icon: MapPin,
  },
  {
    title: "NPS",
    description: "Respostas, importações, classificação, histórico e indicadores.",
    path: "/cs-cx/nps",
    permission: "cs_cx_nps",
    icon: Star,
  },
  {
    title: "Relatórios",
    description: "Indicadores operacionais e exportações do módulo CS/CX.",
    path: "/cs-cx/relatorios",
    permission: "cs_cx_reports",
    icon: BarChart3,
  },
  {
    title: "Administração",
    description: "Modelos, categorias, tipos e configurações específicas da área.",
    path: "/cs-cx/admin",
    permission: "cs_cx_admin",
    icon: Settings2,
  },
];

export default function CsCxOverview() {
  const { hasPermission } = usePermissions();
  const visibleAreas = areas.filter((area) => hasPermission(area.permission, "view"));

  return (
    <div data-testid="cs-cx-overview-page" className="container mx-auto w-full min-w-0 max-w-7xl space-y-5 overflow-x-hidden px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 sm:px-4 md:px-6 md:pb-6 md:pt-3">
      <section className="relative overflow-hidden rounded-xl border border-rose-200/70 bg-gradient-to-br from-rose-50 via-background to-slate-50 px-5 py-4 shadow-sm dark:border-rose-950/70 dark:from-rose-950/20 dark:via-background dark:to-slate-950 md:px-6 md:py-5">
        <Headset className="pointer-events-none absolute -bottom-10 -right-6 h-40 w-40 text-rose-500/10" />
        <div className="relative z-10 max-w-3xl space-y-2.5">
          <Badge variant="outline" className="gap-1.5 border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Customer Success & Customer Experience
          </Badge>
          <div>
            <h1 className="text-2xl font-black tracking-tight md:text-3xl">CS/CX</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Central de relacionamento e acompanhamento dos cartórios, reunindo solicitações,
              contatos, rotinas, visitas e satisfação do cliente.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-bold">Áreas do módulo</h2>
          <p className="text-sm text-muted-foreground">
            As opções exibidas respeitam as permissões do seu perfil.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleAreas.map((area) => {
            const Icon = area.icon;
            return (
              <Card key={area.path} className="group flex h-full flex-col border-muted/70 transition-all hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-md dark:hover:border-rose-900">
                <CardHeader className="flex-row items-start gap-3 space-y-0 p-4 pb-2">
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-rose-600 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                    <Icon className="h-[18px] w-[18px]" />
                  </div>
                  <div className="space-y-0.5">
                    <CardTitle className="text-sm">{area.title}</CardTitle>
                    <CardDescription className="text-xs leading-5">
                      {area.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="mt-auto flex justify-end px-4 pb-3 pt-0">
                  <Button asChild variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs group-hover:text-rose-600 dark:group-hover:text-rose-300">
                    <Link to={area.path}>
                      Acessar
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
