import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database, CheckCircle2, Loader2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConversionQueueItem } from "@/hooks/useConversionQueue";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CompactQueueCardProps {
  item: ConversionQueueItem;
  onClick: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-300",
  in_progress: "bg-blue-100 text-blue-700 border-blue-300",
  awaiting_homologation: "bg-primary/10 text-primary border-primary/20",
  homologation: "bg-violet-100 text-violet-700 border-violet-300",
  approved: "bg-green-100 text-green-700 border-green-300",
  done: "bg-emerald-100 text-emerald-700 border-emerald-300",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em Andamento",
  awaiting_homologation: "Aguard. Homologação",
  homologation: "Em Homologação",
  homologation_issues: "Inconsistências",
  approved: "Aprovado",
  done: "Concluído",
};

export function CompactQueueCard({ item, onClick }: CompactQueueCardProps) {
  const daysInQueue = item.sentAt
    ? Math.floor(
        (new Date().getTime() - item.sentAt.getTime()) / (1000 * 60 * 60 * 24),
      )
    : 0;

  return (
    <Card
      className="min-w-0 cursor-pointer overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/[0.02] to-background transition-all hover:-translate-y-0.5 hover:shadow-lg"
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Abrir detalhes de ${item.clientName}`}
      data-testid="conversion-my-queue-card"
    >
      <CardContent className="min-w-0 p-3 sm:p-4">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          {/* Left Side - Client Info */}
          <div className="flex-1 min-w-0">
            <div className="mb-1 flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
              <span className="min-w-0 basis-full break-words text-base font-bold text-slate-900 dark:text-slate-100 sm:basis-auto sm:text-lg">
                {item.clientName}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "h-auto max-w-full shrink-0 whitespace-normal break-words text-xs",
                  STATUS_COLORS[item.queueStatus],
                )}
              >
                {STATUS_LABELS[item.queueStatus] || item.queueStatus}
              </Badge>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground sm:text-sm">
              <span className="font-mono bg-muted px-2 py-0.5 rounded">
                #{item.ticketNumber}
              </span>
              <span className="flex items-center gap-1">
                <Database className="h-3.5 w-3.5" />
                {item.systemType}
              </span>
              <span className="flex items-center gap-1 text-xs">
                📅{" "}
                {item.deploymentDate
                  ? format(new Date(item.deploymentDate), "dd/MM/yyyy", {
                      locale: ptBR,
                    })
                  : "Sem Previsão"}
              </span>
            </div>
            {/* Engine Status Badge - Prominent */}
            {item.engineStatus && (
              <div className="mt-2">
                <Badge
                  className={cn(
                    "h-auto max-w-full whitespace-normal break-words px-3 py-1 text-left text-xs font-semibold gap-1.5",
                    item.engineStatus === "pending_engine" &&
                      "bg-orange-500 text-white border-orange-600 shadow-sm shadow-orange-200",
                    item.engineStatus === "engine_in_development" &&
                      "bg-blue-500 text-white border-blue-600 shadow-sm shadow-blue-200",
                    item.engineStatus === "engine_ready" &&
                      "bg-emerald-500 text-white border-emerald-600 shadow-sm shadow-emerald-200",
                  )}
                >
                  {item.engineStatus === "pending_engine" && (
                    <>
                      <Database className="h-3.5 w-3.5" /> Aguardando Extração
                      da Base
                    </>
                  )}
                  {item.engineStatus === "engine_in_development" && (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Em
                      Desenvolvimento
                    </>
                  )}
                  {item.engineStatus === "engine_ready" && (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Pronto
                    </>
                  )}
                </Badge>
              </div>
            )}
          </div>

          {/* Right Side - Priority & Actions */}
          <div className="grid w-full grid-cols-[auto_auto_1fr] items-center gap-2 sm:flex sm:w-auto sm:gap-3">
            <Badge
              className={cn(
                "text-sm font-bold",
                item.priority <= 2
                  ? "bg-red-500 text-white"
                  : item.priority <= 4
                    ? "bg-orange-500 text-white"
                    : "bg-slate-500 text-white",
              )}
            >
              P{item.priority}
            </Badge>
            <span
              className={cn(
                "text-sm font-bold px-2 py-1 rounded",
                daysInQueue > 5
                  ? "bg-red-100 text-red-700"
                  : daysInQueue > 3
                    ? "bg-orange-100 text-orange-700"
                    : "bg-gray-100 text-gray-700",
              )}
            >
              {daysInQueue}d
            </span>
            <Button
              size="sm"
              variant="outline"
              className="min-w-0 gap-1 border-primary/20 text-primary hover:bg-primary/5"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              <Eye className="h-4 w-4" />
              Detalhes
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
