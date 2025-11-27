import { ProjectV2 } from "@/types/ProjectV2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";

interface GeneralInfoGroupProps {
  project: ProjectV2;
  onUpdate: (field: keyof ProjectV2, value: unknown) => void;
}

export const GeneralInfoGroup = ({ project, onUpdate }: GeneralInfoGroupProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações Gerais</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Nome do Cliente</Label>
          <Input 
            value={project.clientName} 
            onChange={(e) => onUpdate("clientName", e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Nº Ticket SAC</Label>
          <Input 
            value={project.ticketNumber} 
            onChange={(e) => onUpdate("ticketNumber", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Sistema/Produto</Label>
          <Input 
            value={project.systemType} 
            onChange={(e) => onUpdate("systemType", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Tipo de Implantação</Label>
          <Select 
            value={project.implantationType} 
            onValueChange={(value) => onUpdate("implantationType", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">Novo Cliente</SelectItem>
              <SelectItem value="migration_siplan">Migração Siplan</SelectItem>
              <SelectItem value="migration_competitor">Migração Concorrente</SelectItem>
              <SelectItem value="upgrade">Atualização</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Data de Criação</Label>
          <Input 
            value={format(new Date(project.createdAt), "dd/MM/yyyy")} 
            disabled 
            className="bg-muted"
          />
        </div>

        <div className="space-y-2">
          <Label>Status Global</Label>
          <div className="flex items-center gap-2">
            <Badge variant={
              project.globalStatus === "done" ? "default" :
              project.globalStatus === "blocked" ? "destructive" :
              project.globalStatus === "in-progress" ? "secondary" : "outline"
            }>
              {project.globalStatus}
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Health Score</Label>
          <div className="flex items-center gap-2">
             <Badge variant={
              project.healthScore === "ok" ? "default" : // Changed from "success" to "default" as "success" might not exist in standard shadcn
              project.healthScore === "warning" ? "secondary" : "destructive"
            }>
              {project.healthScore}
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Progresso Geral</Label>
          <div className="flex items-center gap-2">
            <Progress value={project.overallProgress} className="h-2" />
            <span className="text-sm text-muted-foreground">{project.overallProgress}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
