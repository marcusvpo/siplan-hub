import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Users,
  Activity,
  ShieldCheck,
} from "lucide-react";
import { useAdminStats } from "@/hooks/useAdminStats";
import { OverviewChart } from "@/components/Admin/OverviewChart";
import { RecentActivity } from "@/components/Admin/RecentActivity";

export default function AdminDashboard() {
  const { stats, isLoading } = useAdminStats();

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
            <CardTitle className="text-xs font-semibold">
              Total de Usuários
            </CardTitle>
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl font-bold">
              {isLoading ? "-" : stats?.totalUsers}
            </div>
            <p className="text-xs text-muted-foreground">
              usuários ativos na plataforma
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
            <CardTitle className="text-xs font-semibold">
              Projetos Ativos
            </CardTitle>
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl font-bold">
              {isLoading ? "-" : stats?.activeProjects}
            </div>
            <p className="text-xs text-muted-foreground">
              projetos em andamento (exceto concluídos/arquivados)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
            <CardTitle className="text-xs font-semibold">
              Status do Sistema
            </CardTitle>
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl font-bold text-emerald-500">Online</div>
            <p className="text-xs text-muted-foreground">
              todos os serviços operacionais
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 flex flex-col">
          <CardHeader className="pt-3 pb-2">
            <CardTitle className="text-sm">Visão Geral</CardTitle>
          </CardHeader>
          <CardContent className="pl-0 pr-2 pb-2 flex-1">
            <OverviewChart />
          </CardContent>
        </Card>
        <Card className="col-span-3 flex flex-col">
          <CardHeader className="pt-3 pb-2">
            <CardTitle className="text-sm">Atividade Recente</CardTitle>
            <CardDescription className="text-[10px]/snug">Ações realizadas no sistema</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-2 flex-1 overflow-auto max-h-[400px]">
            <RecentActivity />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
