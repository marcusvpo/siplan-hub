import { ProjectV2 } from "@/types/ProjectV2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

interface CriticalDatesGroupProps {
  project: ProjectV2;
  onUpdate: (field: keyof ProjectV2, value: unknown) => void;
}

export const CriticalDatesGroup = ({ project, onUpdate }: CriticalDatesGroupProps) => {
  const formatDateForInput = (date?: Date) => {
    if (!date) return "";
    return format(new Date(date), "yyyy-MM-dd");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datas Críticas</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Início Previsto</Label>
          <Input 
            type="date"
            value={formatDateForInput(project.startDatePlanned)} 
            onChange={(e) => onUpdate("startDatePlanned", e.target.value ? new Date(e.target.value) : undefined)}
          />
        </div>

        <div className="space-y-2">
          <Label>Término Previsto</Label>
          <Input 
            type="date"
            value={formatDateForInput(project.endDatePlanned)} 
            onChange={(e) => onUpdate("endDatePlanned", e.target.value ? new Date(e.target.value) : undefined)}
          />
        </div>

        <div className="space-y-2">
          <Label>Início Real</Label>
          <Input 
            type="date"
            value={formatDateForInput(project.startDateActual)} 
            onChange={(e) => onUpdate("startDateActual", e.target.value ? new Date(e.target.value) : undefined)}
          />
        </div>

        <div className="space-y-2">
          <Label>Término Real</Label>
          <Input 
            type="date"
            value={formatDateForInput(project.endDateActual)} 
            onChange={(e) => onUpdate("endDateActual", e.target.value ? new Date(e.target.value) : undefined)}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-destructive">Próximo Follow-up</Label>
          <Input 
            type="date"
            className="border-destructive/50 focus-visible:ring-destructive"
            value={formatDateForInput(project.nextFollowUpDate)} 
            onChange={(e) => onUpdate("nextFollowUpDate", e.target.value ? new Date(e.target.value) : undefined)}
          />
        </div>

        <div className="space-y-2">
          <Label>Última Atualização</Label>
          <Input 
            value={`${format(new Date(project.lastUpdatedAt), "dd/MM/yyyy HH:mm")} por ${project.lastUpdatedBy}`} 
            disabled 
            className="bg-muted"
          />
        </div>
      </CardContent>
    </Card>
  );
};
