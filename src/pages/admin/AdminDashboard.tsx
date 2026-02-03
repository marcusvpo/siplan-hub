import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Activity,
  ShieldCheck,
  UserCog,
  LayoutGrid,
  ClipboardList,
} from "lucide-react";
import UserManagement from "./UserManagement";
import TeamConfiguration from "./TeamConfiguration";
import AuditLogPage from "./AuditLog";
import { useAdminStats } from "@/hooks/useAdminStats";
import { OverviewChart } from "@/components/Admin/OverviewChart";
import { RecentActivity } from "@/components/Admin/RecentActivity";

export default function AdminDashboard() {
  const { stats, isLoading } = useAdminStats();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Usuários
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "-" : stats?.totalUsers}
            </div>
            <p className="text-xs text-muted-foreground">
              usuários ativos na plataforma
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Projetos Ativos
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "-" : stats?.activeProjects}
            </div>
            <p className="text-xs text-muted-foreground">
              projetos em andamento (exceto concluídos/arquivados)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Status do Sistema
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">Online</div>
            <p className="text-xs text-muted-foreground">
              todos os serviços operacionais
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Visão Geral</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <OverviewChart />
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
            <CardDescription>Ações realizadas no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentActivity />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">
            <UserCog className="mr-2 h-4 w-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="teams">
            <LayoutGrid className="mr-2 h-4 w-4" />
            Equipes
          </TabsTrigger>
          <TabsTrigger value="audit">
            <ClipboardList className="mr-2 h-4 w-4" />
            Logs
          </TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="space-y-4">
          <UserManagement />
        </TabsContent>
        <TabsContent value="teams" className="space-y-4">
          <TeamConfiguration />
        </TabsContent>
        <TabsContent value="audit" className="space-y-4">
          <AuditLogPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
