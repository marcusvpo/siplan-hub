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
  UserCheck,
  Zap,
} from "lucide-react";
import { useAdminStats } from "@/hooks/useAdminStats";
import { OverviewChart } from "@/components/Admin/OverviewChart";
import { RecentActivity } from "@/components/Admin/RecentActivity";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminDashboard() {
  const { stats, isLoading } = useAdminStats();

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* Top cards... */}
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
              Usuários Online
            </CardTitle>
            <UserCheck className="h-3.5 w-3.5 text-blue-500" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl font-bold text-blue-500">
              {isLoading ? "-" : stats?.onlineUsersCount}
            </div>
            <p className="text-xs text-muted-foreground">
              ativos nos últimos 10 min
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
            <CardTitle className="text-xs font-semibold">
              Mais Ativo
            </CardTitle>
            <Zap className="h-3.5 w-3.5 text-amber-500" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-sm font-bold truncate text-amber-600">
              {isLoading ? "-" : stats?.mostActiveUsers?.[0]?.userName || "Nenhum"}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {stats?.mostActiveUsers?.[0]?.actionCount || 0} ações recentes
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
              andamento (exceto concluídos)
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

      {/* New Row with Detailed Lists */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-3 flex flex-col">
          <CardHeader className="pt-3 pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm">Usuários Online Agora</CardTitle>
              <CardDescription className="text-[10px]">Atividade nos últimos 10 minutos</CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px] h-5">
              {stats?.onlineUsersCount || 0} online
            </Badge>
          </CardHeader>
          <CardContent className="px-4 pb-4 flex-1 overflow-auto max-h-[350px]">
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : stats?.onlineUsers && stats.onlineUsers.length > 0 ? (
                stats.onlineUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://avatar.vercel.sh/${user.userName}.png`} />
                      <AvatarFallback>{user.userName.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{user.userName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Última ação {formatDistanceToNow(new Date(user.lastAction), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum usuário online no momento.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-4 flex flex-col">
          <CardHeader className="pt-3 pb-2">
            <CardTitle className="text-sm">Ranking de Atividade Recente</CardTitle>
            <CardDescription className="text-[10px]">Colaboradores com maior volume de ações registradas</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 flex-1 overflow-auto max-h-[350px]">
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : stats?.mostActiveUsers && stats.mostActiveUsers.length > 0 ? (
                stats.mostActiveUsers.map((user, index) => (
                  <div key={user.userId} className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-muted text-[10px] font-bold">
                      {index + 1}
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://avatar.vercel.sh/${user.userName}.png`} />
                      <AvatarFallback>{user.userName.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{user.userName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary" 
                            style={{ 
                              width: `${(user.actionCount / (stats.mostActiveUsers[0]?.actionCount || 1)) * 100}%` 
                            }} 
                          />
                        </div>
                        <span className="text-[10px] font-semibold">{user.actionCount}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum dado de atividade disponível.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
