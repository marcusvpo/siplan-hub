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
  HardDrive,
  Database,
} from "lucide-react";
import { useAdminStats } from "@/hooks/useAdminStats";
import { OverviewChart } from "@/components/Admin/OverviewChart";
import { RecentActivity } from "@/components/Admin/RecentActivity";
import { ProjectStatusChart } from "@/components/Admin/ProjectStatusChart";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function AdminDashboard() {
  const { stats, isLoading } = useAdminStats();

  return (
    <div className="space-y-4 pb-6">
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-6">
        {/* Top cards */}
        <Card className="hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Total de Usuários
            </CardTitle>
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-3 px-3">
            <div className="text-xl font-black">
              {isLoading ? "-" : stats?.totalUsers}
            </div>
            <p className="text-[10px] text-muted-foreground">
              usuários na plataforma
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border-emerald-100 bg-emerald-50/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
              Ativos Agora
            </CardTitle>
            <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
          </CardHeader>
          <CardContent className="pb-3 px-3">
            <div className="text-xl font-black text-emerald-600">
              {isLoading ? "-" : stats?.activeNowCount}
            </div>
            <p className="text-[10px] text-emerald-700/60">
              sessões em tempo real
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Mais Ativo
            </CardTitle>
            <Zap className="h-3.5 w-3.5 text-amber-500" />
          </CardHeader>
          <CardContent className="pb-3 px-3">
            <div className="text-sm font-black truncate text-amber-600">
              {isLoading ? "-" : stats?.mostActiveUsers?.[0]?.userName || "Nenhum"}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {stats?.mostActiveUsers?.[0]?.actionCount || 0} ações recentes
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Projetos Ativos
            </CardTitle>
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-3 px-3">
            <div className="text-xl font-black">
              {isLoading ? "-" : stats?.activeProjects}
            </div>
            <p className="text-[10px] text-muted-foreground">
              andamento (não concl.)
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border-blue-100 bg-blue-50/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
              Status do Sistema
            </CardTitle>
            <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
          </CardHeader>
          <CardContent className="pb-3 px-3">
            <div className="text-xl font-black text-blue-600">Operacional</div>
            <p className="text-[10px] text-blue-700/60">
              todos os serviços ok
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border-amber-100 bg-amber-50/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
              Armazenamento
            </CardTitle>
            <HardDrive className="h-3.5 w-3.5 text-amber-500" />
          </CardHeader>
          <CardContent className="pb-3 px-3">
            <div className="text-xl font-black text-amber-600">
              {isLoading ? "-" : (stats?.storage?.storageSizeMB || 0) > 1024 
                ? `${((stats?.storage?.storageSizeMB || 0) / 1024).toFixed(1)} GB`
                : `${(stats?.storage?.storageSizeMB || 0).toFixed(0)} MB`}
            </div>
            <p className="text-[10px] text-amber-700/60">
              uso total de arquivos
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-12">
        <Card className="lg:col-span-5 flex flex-col h-[320px]">
          <CardHeader className="pt-3 pb-2 px-4 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-sm font-bold">Resumo de Atividade</CardTitle>
              <CardDescription className="text-[10px]">Acessos recentes</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pl-0 pr-2 pb-2 flex-1">
            <OverviewChart />
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 flex flex-col h-[320px]">
          <CardHeader className="pt-3 pb-2 px-4 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-sm font-bold">Últimas Ações</CardTitle>
              <CardDescription className="text-[10px]">Log em tempo real</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-2 flex-1 overflow-auto">
            <RecentActivity />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 flex flex-col h-[320px]">
          <CardHeader className="pt-3 pb-2 px-4 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-sm font-bold">Fases de Projetos</CardTitle>
              <CardDescription className="text-[10px]">Por status atual</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-2 flex-1">
            <ProjectStatusChart data={stats?.projectDistribution || {}} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-12">
        <Card className="lg:col-span-4 flex flex-col h-[350px]">
          <CardHeader className="pt-3 pb-2 px-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold">Usuários Online</CardTitle>
              <CardDescription className="text-[10px]">Ativos nos últimos 15 min</CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px] h-5 bg-emerald-500/5 text-emerald-600 border-emerald-100">
              {stats?.activeNowCount || 0} online
            </Badge>
          </CardHeader>
          <CardContent className="px-4 pb-4 flex-1 overflow-auto">
            <div className="space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : stats?.onlineUsers && stats.onlineUsers.length > 0 ? (
                stats.onlineUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 ring-2 ring-background">
                      <AvatarImage src={`https://avatar.vercel.sh/${user.userName}.png`} />
                      <AvatarFallback>{user.userName.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{user.userName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(user.lastAction), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      user.status === 'active' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-amber-400"
                    )} />
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum registro.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-5 flex flex-col h-[350px]">
          <CardHeader className="pt-3 pb-2 px-4">
            <CardTitle className="text-sm font-bold">Engajamento de Colaboradores</CardTitle>
            <CardDescription className="text-[10px]">Maiores volumes de ações registradas</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 flex-1 overflow-auto">
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : stats?.mostActiveUsers && stats.mostActiveUsers.length > 0 ? (
                stats.mostActiveUsers.map((user, index) => (
                  <div key={user.userId} className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-6 w-6 rounded-lg bg-muted text-[10px] font-bold shrink-0">
                      {index + 1}
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://avatar.vercel.sh/${user.userName}.png`} />
                      <AvatarFallback>{user.userName.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-xs font-semibold truncate">{user.userName}</p>
                        <span className="text-[10px] font-bold text-primary">{user.actionCount} pts</span>
                      </div>
                      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ 
                            width: `${(user.actionCount / (stats.mostActiveUsers[0]?.actionCount || 1)) * 100}%` 
                          }} 
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum dado.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 flex flex-col h-[350px] bg-primary/5 border-primary/10">
          <CardHeader className="pt-3 pb-2 px-4">
            <CardTitle className="text-sm font-bold">Recursos Infra</CardTitle>
            <CardDescription className="text-[10px]">Monitoramento técnico</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 flex-1 space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Database className="h-3.5 w-3.5 text-indigo-500" />
                  <span className="text-xs font-medium">Banco</span>
                </div>
                <span className="text-[10px] font-bold">
                  {stats?.storage?.dbSizeMB?.toFixed(1)} MB
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs font-medium">Arquivos</span>
                </div>
                <span className="text-[10px] font-bold">
                  {stats?.storage?.storageSizeMB?.toFixed(1)} MB
                </span>
              </div>
            </div>
            
            <div className="pt-4 border-t border-primary/10">
              <div className="p-3 bg-white rounded-lg border border-primary/5 shadow-sm">
                <p className="text-[10px] font-bold uppercase text-primary/60 mb-1">Dica Siplan</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Considere limpar os logs se o banco ultrapassar 4.5 GB.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
