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
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors"
              title="Remover da fila de conversão"
              onClick={async (e) => {
                e.stopPropagation();
                if (
                  confirm(
                    "Tem certeza que deseja remover este projeto da fila de conversão?",
                  )
                ) {
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
                }
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
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
        <Label className="text-xs font-bold uppercase tracking-widest text-fuchsia-600 flex items-center gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Status Homologação
        </Label>
        <Select
          value={stage.homologationStatus || ""}
          onValueChange={(v) =>
            onUpdate({ homologationStatus: v as StatusType })
          }
        >
          <SelectTrigger
            className={cn(
              "h-9 border font-medium transition-all text-xs",
              stage.homologationStatus === "Adequado" &&
              "bg-green-50 text-green-800 border-green-300 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50",
              stage.homologationStatus === "Parcialmente Adequado" &&
              "bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/50",
              stage.homologationStatus === "Inadequado" &&
              "bg-red-50 text-red-800 border-red-300 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50",
              stage.homologationStatus === "Aguardando Adequação" &&
              "bg-gray-50 text-gray-800 border-gray-300 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-800/60",
            )}
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
        <Label className="text-xs font-bold uppercase tracking-widest text-violet-600 flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Responsável Homolog.
        </Label>
        <AutocompleteInput
          value={stage.homologationResponsible || ""}
          onChange={(v) =>
            onUpdate({ homologationResponsible: v })
          }
          className="h-9 border border-violet-200 hover:border-violet-300 focus:border-violet-400 bg-violet-50/50 dark:border-violet-900/50 dark:hover:border-violet-800 dark:focus:border-violet-650 dark:bg-violet-950/20 dark:text-violet-300 text-xs"
        />
      </div>

      <div className="space-y-2.5">
        <Label className="text-xs font-bold uppercase tracking-widest text-rose-600 flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5" />
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
          className="h-9 border border-rose-200 hover:border-rose-300 focus:border-rose-400 bg-rose-50/50 dark:border-rose-900/50 dark:hover:border-rose-800 dark:focus:border-rose-600 dark:bg-rose-950/20 dark:text-rose-300 font-medium text-xs"
        />
      </div>
    </>
  );
}
