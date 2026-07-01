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
      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
        <Database className="h-3.5 w-3.5 text-muted-foreground" />
        Sistema Operacional
      </Label>
      <Input
        value={stage.osVersion || ""}
        onChange={(e) => onUpdate({ osVersion: e.target.value })}
        disabled={!canEditProjects}
        placeholder="Ex: Windows Server 2022"
        className="h-9 border border-input bg-background text-foreground hover:bg-slate-50/50 dark:hover:bg-slate-900/50 focus-visible:ring-1 focus-visible:ring-ring font-medium text-xs"
      />
    </div>
  );
}
