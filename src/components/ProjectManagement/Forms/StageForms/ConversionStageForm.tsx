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
  onSendToConversion: () => void;
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
  return (
    <>
      <div className="col-span-full mb-4">
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant={isInConversionQueue ? "outline" : "default"}
                disabled={sendingToConversion || isInConversionQueue || !canEditProjects}
                className={cn(
                  "w-full md:w-auto font-bold shadow-sm",
                  isInConversionQueue
                    ? "border-purple-300 text-purple-600"
                    : "bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700",
                )}
              >
                {isInConversionQueue ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
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
                    <Send className="mr-2 h-4 w-4" />
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
                  <AlertDialogTitle>Confirmar envio</AlertDialogTitle>
                  <AlertDialogDescription>
                    Deseja enviar este projeto para a fila de conversão? A
                    equipe de conversão será notificada e o projeto aparecerá no
                    dashboard deles.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onSendToConversion}>
                    Confirmar Envio
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            )}
          </AlertDialog>

          {isInConversionQueue && conversionItem && (
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors"
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
              <X className="h-4 w-4" />
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
              "h-11 border-2 font-medium transition-all",
              stage.homologationStatus === "Adequado" &&
              "bg-green-50 text-green-800 border-green-300",
              stage.homologationStatus === "Parcialmente Adequado" &&
              "bg-orange-50 text-orange-800 border-orange-300",
              stage.homologationStatus === "Inadequado" &&
              "bg-red-50 text-red-800 border-red-300",
              stage.homologationStatus === "Aguardando Adequação" &&
              "bg-gray-50 text-gray-800 border-gray-300",
            )}
          >
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Adequado" className="text-green-600 font-medium">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                Adequado
              </div>
            </SelectItem>
            <SelectItem
              value="Parcialmente Adequado"
              className="text-orange-600 font-medium"
            >
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                Parcialmente Adequado
              </div>
            </SelectItem>
            <SelectItem value="Inadequado" className="text-red-600 font-medium">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                Inadequado
              </div>
            </SelectItem>
            <SelectItem
              value="Aguardando Adequação"
              className="text-gray-600 font-medium"
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
          className="h-11 border-2 border-violet-200 hover:border-violet-300 focus:border-violet-400 bg-violet-50/50"
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
          className="h-11 border-2 border-rose-200 hover:border-rose-300 focus:border-rose-400 bg-rose-50/50 font-medium"
        />
      </div>
    </>
  );
}
