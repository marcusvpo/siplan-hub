import { EnvironmentStageV2 } from "@/types/ProjectV2";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Database } from "lucide-react";

interface EnvironmentStageFormProps {
  stage: EnvironmentStageV2;
  canEditProjects: boolean;
  onUpdate: (updates: Partial<EnvironmentStageV2>) => void;
}

export function EnvironmentStageForm({
  stage,
  canEditProjects,
  onUpdate,
}: EnvironmentStageFormProps) {
  return (
    <div className="space-y-2.5">
      <Label className="text-xs font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-2">
        <Database className="h-3.5 w-3.5" />
        Sistema Operacional
      </Label>
      <Input
        value={stage.osVersion || ""}
        onChange={(e) => onUpdate({ osVersion: e.target.value })}
        disabled={!canEditProjects}
        placeholder="Ex: Windows Server 2022"
        className="h-11 border-2 border-emerald-200 hover:border-emerald-300 focus:border-emerald-400 bg-emerald-50/50 dark:border-emerald-900/50 dark:hover:border-emerald-800 dark:focus:border-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-300 font-medium"
      />
    </div>
  );
}
