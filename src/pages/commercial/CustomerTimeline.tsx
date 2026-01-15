import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, ArrowLeft, Construction } from "lucide-react";

/**
 * Customer Timeline Page - Stub
 * 
 * This page requires the following database tables that don't exist yet:
 * - clients
 * - commercial_notes
 * 
 * To enable this feature, create the required tables in the database.
 */
export default function CustomerTimeline() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-in fade-in duration-500">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
            <Construction className="h-8 w-8 text-yellow-600" />
          </div>
          
          <h1 className="text-2xl font-bold">Timeline do Cliente</h1>
          
          <p className="text-muted-foreground">
            Esta funcionalidade está em desenvolvimento e requer a criação das 
            tabelas do módulo comercial no banco de dados.
          </p>

          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-lg text-sm text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Tabelas necessárias não encontradas</span>
          </div>

          <Button 
            variant="outline" 
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
