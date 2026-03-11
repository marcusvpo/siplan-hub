import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, AlertTriangle, UserMinus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface InactiveUser {
  id: string;
  fullName: string;
  email: string;
  lastActionDate: string | null;
  daysInactive: number;
}

export default function InactiveUsers() {
  const [loading, setLoading] = useState(true);
  const [inactiveUsers, setInactiveUsers] = useState<InactiveUser[]>([]);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;
  
  const totalPages = Math.ceil(inactiveUsers.length / itemsPerPage);
  const currentUsers = inactiveUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    async function fetchInactiveUsers() {
      try {
        setLoading(true);
        // Step 1: Get all users
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name");
        
        if (profilesError) throw profilesError;

        // Step 2: Get last audit log for each user (approximate login/activity)
        // Since we cannot group by easily, we will pull the latest 5000 logs and map
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: logs, error: logsError } = await supabase
          .from("audit_logs")
          .select("user_id, created_at")
          .order("created_at", { ascending: false })
          .limit(10000);

        if (logsError) throw logsError;

        const latestActivityMap: Record<string, string> = {};
        logs?.forEach((log) => {
          if (log.user_id && !latestActivityMap[log.user_id]) {
            latestActivityMap[log.user_id] = log.created_at;
          }
        });

        const usersList: InactiveUser[] = [];

        profiles?.forEach((profile) => {
          const lastAction = latestActivityMap[profile.id] || null;
          
          let isInactive = false;
          let days = 999;

          if (!lastAction) {
            isInactive = true;
          } else {
            const lastDate = new Date(lastAction);
            if (lastDate < thirtyDaysAgo) {
              isInactive = true;
            }
            const diffTime = Math.abs(new Date().getTime() - lastDate.getTime());
            days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          }

          if (isInactive) {
            usersList.push({
              id: profile.id,
              fullName: profile.full_name || "Usuário sem nome",
              email: "email@protegido.mock", // email is not in profiles natively usually, needs RPC. Mocked for view.
              lastActionDate: lastAction,
              daysInactive: days,
            });
          }
        });

        // Sort by longest inactivity
        usersList.sort((a, b) => b.daysInactive - a.daysInactive);
        setInactiveUsers(usersList);

      } catch (error) {
        console.error("Error fetching inactive users:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchInactiveUsers();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Usuários Inativos</h2>
        <p className="text-muted-foreground">
          Contas que não registraram nenhuma ação (login ou alteração de dados) nos últimos 30 dias.
        </p>
      </div>

      <Card className="border-primary/10 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-muted/30">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserMinus className="h-5 w-5 text-destructive" />
              Lista de Inativos
            </CardTitle>
            <CardDescription>Critério: Sem registros na tabela de auditoria recentemente.</CardDescription>
          </div>
          <div className="flex items-center gap-2 bg-destructive/10 text-destructive px-3 py-1 rounded-full text-sm font-semibold">
            {inactiveUsers.length} encontrados
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin h-6 w-6 border-b-2 border-primary rounded-full" />
            </div>
          ) : inactiveUsers.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              Nenhum usuário inativo encontrado. Excelente!
            </div>
          ) : (
            <div className="space-y-4">
              {currentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={`https://avatar.vercel.sh/${user.fullName}.png`} />
                      <AvatarFallback>{user.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{user.fullName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <Clock className="h-3 w-3" />
                        {user.lastActionDate ? (
                          <span>
                            Última ação: {formatDistanceToNow(new Date(user.lastActionDate), { addSuffix: true, locale: ptBR })}
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-500 font-medium">
                            <AlertTriangle className="h-3 w-3 inline mr-1" />
                            Nunca acessou o sistema (ou sem logs).
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {user.lastActionDate && (
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-destructive">{user.daysInactive} dias</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Inativo</p>
                      </div>
                    )}
                    <Button variant="outline" size="sm" className="hidden">
                      Gerenciar Perfil
                    </Button>
                  </div>
                </div>
              ))}

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="p-4 bg-muted/30 border rounded-lg flex gap-3 text-sm text-muted-foreground">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
        <p>
          Bloquear ou excluir um usuário permanentemente deve ser feito através da aba <strong>"Usuários"</strong> ou diretamente no Authentication do Supabase para garantir revogação de chaves ativas.
        </p>
      </div>
    </div>
  );
}
