import { AdherenceStageV2 } from "@/types/ProjectV2";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

interface AdherenceStageFormProps {
  stage: AdherenceStageV2;
  canEditProjects: boolean;
  onUpdate: (updates: Partial<AdherenceStageV2>) => void;
}

export function AdherenceStageForm({
  stage,
  canEditProjects,
  onUpdate,
}: AdherenceStageFormProps) {
  return (
    <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-4">
      <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
        <Checkbox
          id="has-gap"
          checked={stage.hasProductGap || false}
          onCheckedChange={(checked) =>
            onUpdate({ hasProductGap: checked === true })
          }
          disabled={!canEditProjects}
          className="border-amber-400 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
        />
        <Label
          htmlFor="has-gap"
          className="text-amber-800 font-semibold cursor-pointer"
        >
          ⚠️ Existe Gap de Produto?
        </Label>
      </div>
      {stage.hasProductGap && (
        <div className="bg-gradient-to-br from-red-50 to-orange-50 p-5 rounded-xl space-y-4 border-2 border-red-200 shadow-sm">
          <div className="space-y-2.5">
            <Label className="text-xs font-bold uppercase tracking-widest text-red-600 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              Descrição do Gap
            </Label>
            <Textarea
              value={stage.gapDescription || ""}
              onChange={(e) => onUpdate({ gapDescription: e.target.value })}
              disabled={!canEditProjects}
              className="min-h-[100px] border-2 border-red-200 focus:border-red-400 bg-white"
              placeholder="Descreva detalhadamente o gap identificado..."
            />
          </div>
        </div>
      )}
    </div>
  );
}
