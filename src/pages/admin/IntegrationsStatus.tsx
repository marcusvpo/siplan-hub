import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Webhook, Mail, CheckCircle2, XCircle, Clock } from "lucide-react";

export default function IntegrationsStatus() {
  const integrations = [
    {
      id: "n8n-commercial",
      name: "Fluxo Comercial (N8N)",
      type: "Webhook",
      icon: Webhook,
      status: "operational",
      lastSync: "Há 12 minutos",
      description: "Dispara notificações comerciais no Slack e envia atualizações para o CRM externo.",
    },
    {
      id: "resend-email",
      name: "Envio de E-mails Transacionais",
      type: "SMTP / API",
      icon: Mail,
      status: "operational",
      lastSync: "Há 2 horas",
      description: "Responsável pelo envio de relatórios, convites de acesso e recuperação de senha.",
    },
    {
      id: "n8n-conversion",
      name: "Esteira de Conversão (N8N)",
      type: "Background Worker",
      icon: Webhook,
      status: "degraded",
      lastSync: "Há 4 horas",
      description: "Processa pacotes de bancos legado e atualiza o status dos projetos para Homologação.",
      error: "Timeout na conexão com o servidor SFTP do cliente #1042",
    }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Status de Integrações (BETA)</h2>
        <p className="text-muted-foreground">
          Monitoramento dos fluxos do N8N e APIs externas vinculadas ao Siplan Hub.
        </p>
      </div>

      <div className="grid gap-4">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          const isOk = integration.status === "operational";
          
          return (
            <Card key={integration.id} className={`border-l-4 ${isOk ? "border-l-emerald-500" : "border-l-amber-500"} shadow-sm transition-all hover:shadow-md`}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isOk ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{integration.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">{integration.type}</Badge>
                      <span className="flex items-center gap-1 text-xs">
                        <Clock className="h-3 w-3" />
                        Última Sincronização: {integration.lastSync}
                      </span>
                    </CardDescription>
                  </div>
                </div>
                <div>
                  {isOk ? (
                    <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1 py-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Operacional
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="bg-amber-500 hover:bg-amber-600 text-white gap-1 py-1">
                      <XCircle className="h-3.5 w-3.5" />
                      Degradado
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mt-2">{integration.description}</p>
                
                {integration.error && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg">
                    <p className="text-xs font-mono text-red-600 dark:text-red-400 font-medium">
                      Último erro registrado: {integration.error}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
