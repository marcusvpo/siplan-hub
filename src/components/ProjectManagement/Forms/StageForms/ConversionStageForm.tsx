import { useState } from "react";
import { ConversionStageV2, StageStatus } from "@/types/ProjectV2";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ConversionQueueItem } from "@/hooks/useConversionQueue";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, Calendar, Send, ExternalLink, X } from "lucide-react";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { StatusType } from "./types";

interface ConversionStageFormProps {
  stage: ConversionStageV2;
  canEditProjects: boolean;
  isInConversionQueue: boolean;
  sendingToConversion: boolean;
  conversionItem: ConversionQueueItem | undefined;
  projectId: string;
  onUpdate: (updates: Partial<ConversionStageV2>) => void;
  onSendToConversion: (priority: number) => void;
  onRemoveFromQueue: (itemId: string, projectId: string) => Promise<boolean>;
}

export function ConversionStageForm({
  stage,
  canEditProjects,
  isInConversionQueue,
  sendingToConversion,
  conversionItem,
  projectId,
  onUpdate,
  onSendToConversion,
  onRemoveFromQueue,
}: ConversionStageFormProps) {
  const [selectedPriority, setSelectedPriority] = useState<number>(3); // 3: Normal, 2: Média, 1: Alta

  return (
    <>
      <div className="col-span-full mb-2.5">
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant={isInConversionQueue ? "outline" : "default"}
                size="sm"
                disabled={sendingToConversion || isInConversionQueue || !canEditProjects}
                className={cn(
                  "w-full md:w-auto font-bold shadow-sm h-8 text-xs",
                  isInConversionQueue
                    ? "border-primary/30 text-primary hover:bg-primary/5"
                    : "bg-primary hover:bg-primary/90 text-primary-foreground",
                )}
              >
                {isInConversionQueue ? (
                  <>
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    Na Fila de Conversão
                    <a
                      href="/conversion"
                      className="ml-2 inline-flex items-center text-xs underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </>
                ) : (
                  <>
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                    {sendingToConversion
                      ? "Enviando..."
                      : "Enviar para Conversão"}
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            {!isInConversionQueue && (
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Enviar para Conversão</AlertDialogTitle>
                  <div className="space-y-4 text-sm text-muted-foreground mt-2">
                    <p>
                      Deseja enviar este projeto para a fila de conversão? A
                      equipe de conversão será notificada e o projeto aparecerá no
                      dashboard deles.
                    </p>
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <Label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Defina a Prioridade da Conversão:
                      </Label>
                      <Select
                        value={selectedPriority.toString()}
                        onValueChange={(val) => setSelectedPriority(Number(val))}
                      >
                        <SelectTrigger className="w-full h-8 border text-xs">
                          <SelectValue placeholder="Selecione a prioridade..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">💤 Normal</SelectItem>
                          <SelectItem value="2">⚡ Média</SelectItem>
                          <SelectItem value="1">🚨 Alta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4">
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onSendToConversion(selectedPriority)}>
                    Confirmar Envio
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            )}
          </AlertDialog>

          {isInConversionQueue && conversionItem && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors"
                  title="Remover da fila de conversão"
                  aria-label="Remover da fila de conversão"
                  onClick={(e) => e.stopPropagation()}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover da fila de conversão?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O projeto será retirado da fila e o estágio volta para "A fazer".
                    Você pode reenviá-lo depois, se necessário.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700"
                    onClick={async () => {
                      const success = await onRemoveFromQueue(
                        conversionItem.id,
                        projectId,
                      );
                      if (success) {
                        onUpdate({
                          sentAt: undefined,
                          status: "todo" as StageStatus,
                          homologationStatus: undefined,
                          homologationResponsible: undefined,
                        });
                      }
                    }}
                  >
                    Remover
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {isInConversionQueue && conversionItem && (
          <div className="mt-2 text-sm text-muted-foreground">
            Status:{" "}
            <Badge variant="outline" className="ml-1">
              {conversionItem.queueStatus === "pending" && "Pendente"}
              {conversionItem.queueStatus === "in_progress" && "Em Andamento"}
              {conversionItem.queueStatus === "awaiting_homologation" &&
                "Aguard. Homologação"}
              {conversionItem.queueStatus === "homologation_issues" &&
                "Inconsistências"}
              {conversionItem.queueStatus === "approved" && "Aprovado"}
              {conversionItem.queueStatus === "done" && "Concluído"}
            </Badge>
            {conversionItem.assignedToName && (
              <span className="ml-3">
                Responsável: <strong>{conversionItem.assignedToName}</strong>
              </span>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2.5">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
          Status Homologação
        </Label>
        <Select
          value={stage.homologationStatus || ""}
          onValueChange={(v) =>
            onUpdate({ homologationStatus: v as StatusType })
          }
        >
          <SelectTrigger
            className="h-9 border border-input bg-background text-xs font-medium text-foreground hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all duration-200"
          >
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Adequado" className="text-green-600 dark:text-emerald-400 font-medium">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                Adequado
              </div>
            </SelectItem>
            <SelectItem
              value="Parcialmente Adequado"
              className="text-orange-600 dark:text-orange-400 font-medium"
            >
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                Parcialmente Adequado
              </div>
            </SelectItem>
            <SelectItem value="Inadequado" className="text-red-600 dark:text-red-400 font-medium">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                Inadequado
              </div>
            </SelectItem>
            <SelectItem
              value="Aguardando Adequação"
              className="text-gray-600 dark:text-slate-400 font-medium"
            >
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-gray-500" />
                Aguardando Adequação
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2.5">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
          Responsável Homolog.
        </Label>
        <AutocompleteInput
          value={stage.homologationResponsible || ""}
          onChange={(v) =>
            onUpdate({ homologationResponsible: v })
          }
          className="h-9 border border-input bg-background text-foreground hover:bg-slate-50/50 dark:hover:bg-slate-900/50 focus-visible:ring-1 focus-visible:ring-ring text-xs"
        />
      </div>

      <div className="space-y-2.5">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          Agendado Para (Homolog.)
        </Label>
        <Input
          type="date"
          value={
            stage.homologationFinishedAt
              ? new Date(stage.homologationFinishedAt)
                .toISOString()
                .split("T")[0]
              : ""
          }
          onChange={(e) =>
            onUpdate({
              homologationFinishedAt: e.target.value
                ? new Date(e.target.value + "T12:00:00")
                : undefined,
            })
          }
          className="h-9 border border-input bg-background text-foreground hover:bg-slate-50/50 dark:hover:bg-slate-900/50 focus-visible:ring-1 focus-visible:ring-ring font-medium text-xs"
        />
      </div>
    </>
  );
}
