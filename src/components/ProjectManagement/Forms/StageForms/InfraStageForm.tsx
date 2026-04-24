import { InfraStageV2 } from "@/types/ProjectV2";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Megaphone, Server } from "lucide-react";
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

interface InfraStageFormProps {
  stage: InfraStageV2;
  canEditProjects: boolean;
  notifying: boolean;
  onUpdate: (updates: Partial<InfraStageV2>) => void;
  onNotifyComercial: () => void;
}

export function InfraStageForm({
  stage,
  canEditProjects,
  notifying,
  onUpdate,
  onNotifyComercial,
}: InfraStageFormProps) {
  return (
    <>
      <div className="col-span-full mb-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              disabled={notifying || !canEditProjects}
              className="w-full md:w-auto font-bold shadow-sm"
            >
              <Megaphone className="mr-2 h-4 w-4" />
              {notifying ? "Notificando..." : "Notificar Comercial"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar notificação</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja notificar o comercial? Um e-mail será
                enviado informando a infraestrutura inadequada.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onNotifyComercial}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <div className="space-y-2.5">
        <Label className="text-xs font-bold uppercase tracking-widest text-teal-600 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-teal-500" />
          Status Estações
        </Label>
        <Select
          value={stage.workstationsStatus || ""}
          onValueChange={(v) =>
            onUpdate({ workstationsStatus: v as StatusType })
          }
          disabled={!canEditProjects}
        >
          <SelectTrigger
            className={cn(
              "h-11 border-2 font-medium transition-all",
              stage.workstationsStatus === "Adequado" &&
              "bg-green-50 text-green-800 border-green-300",
              stage.workstationsStatus === "Parcialmente Adequado" &&
              "bg-orange-50 text-orange-800 border-orange-300",
              stage.workstationsStatus === "Inadequado" &&
              "bg-red-50 text-red-800 border-red-300",
              stage.workstationsStatus === "Aguardando Adequação" &&
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
        <Label className="text-xs font-bold uppercase tracking-widest text-sky-600 flex items-center gap-2">
          <Server className="h-3.5 w-3.5" />
          Status Servidor
        </Label>
        <Select
          value={stage.serverStatus || ""}
          onValueChange={(v) => onUpdate({ serverStatus: v as StatusType })}
          disabled={!canEditProjects}
        >
          <SelectTrigger
            className={cn(
              "h-11 border-2 font-medium transition-all",
              stage.serverStatus === "Adequado" &&
              "bg-green-50 text-green-800 border-green-300",
              stage.serverStatus === "Parcialmente Adequado" &&
              "bg-orange-50 text-orange-800 border-orange-300",
              stage.serverStatus === "Inadequado" &&
              "bg-red-50 text-red-800 border-red-300",
              stage.serverStatus === "Aguardando Adequação" &&
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
        <Label className="text-xs font-bold uppercase tracking-widest text-purple-600 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-purple-500" />
          Qtd. de Estações
        </Label>
        <Input
          type="number"
          value={stage.workstationsCount || ""}
          onChange={(e) =>
            onUpdate({
              workstationsCount: parseInt(e.target.value),
            })
          }
          disabled={!canEditProjects}
          className="h-11 border-2 border-purple-200 hover:border-purple-300 focus:border-purple-400 bg-purple-50/50 font-medium"
        />
      </div>
    </>
  );
}
