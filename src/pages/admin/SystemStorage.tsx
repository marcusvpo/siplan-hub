import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, HardDrive, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function SystemStorage() {
  // Mock data representing Supabase Storage & DB size limits
  const storageLimit = 50 * 1024; // 50GB in MB
  const storageUsed = 12 * 1024 + 450; // 12.45 GB used

  const dbLimit = 5 * 1024; // 5GB in MB
  const dbUsed = 1024 * 1.2; // 1.2 GB used

  const storagePercentage = (storageUsed / storageLimit) * 100;
  const dbPercentage = (dbUsed / dbLimit) * 100;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Armazenamento</h2>
        <p className="text-muted-foreground">
          Visão geral simulada do consumo de Storage e Banco de Dados (Supabase).
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-primary/10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <HardDrive className="h-32 w-32" />
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-primary" />
              Uploads (Storage API)
            </CardTitle>
            <CardDescription>
              Imagens, relatórios PDF, fotos de perfil (bucket principal).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-3xl font-bold">12.45 GB</p>
                <p className="text-sm font-medium text-muted-foreground">de 50 GB contratados</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-semibold text-primary">{storagePercentage.toFixed(1)}%</p>
              </div>
            </div>
            <Progress value={storagePercentage} className="h-3" />
            {storagePercentage > 80 && (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 text-sm font-medium mt-2 bg-amber-50 dark:bg-amber-500/10 p-2 rounded-md">
                <AlertTriangle className="h-4 w-4" />
                Atenção: Consumo de storage próximo ao limite.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Database className="h-32 w-32" />
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-500" />
              Banco de Dados (PostgreSQL)
            </CardTitle>
            <CardDescription>
              Dados transacionais, tabelas, logs de auditoria e perfis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-3xl font-bold">1.2 GB</p>
                <p className="text-sm font-medium text-muted-foreground">de 5 GB (Plano Pro)</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-semibold text-emerald-500">{dbPercentage.toFixed(1)}%</p>
              </div>
            </div>
            <Progress 
              value={dbPercentage} 
              className="h-3 [&>div]:bg-emerald-500" // Custom progress bar color
            />
            <p className="text-xs text-muted-foreground text-center">
              A manutenção de índices e limpeza automática de logs ocorre semanalmente.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
