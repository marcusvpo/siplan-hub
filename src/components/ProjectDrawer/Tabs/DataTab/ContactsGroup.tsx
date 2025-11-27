import { ProjectV2 } from "@/types/ProjectV2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ContactsGroupProps {
  project: ProjectV2;
  onUpdate: (field: keyof ProjectV2, value: unknown) => void;
}

export const ContactsGroup = ({ project, onUpdate }: ContactsGroupProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contatos & Responsáveis</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Líder do Projeto</Label>
          <Input 
            value={project.projectLeader} 
            onChange={(e) => onUpdate("projectLeader", e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Contato Principal (Cliente)</Label>
          <Input 
            value={project.clientPrimaryContact || ""} 
            onChange={(e) => onUpdate("clientPrimaryContact", e.target.value)}
            placeholder="Nome + Email/Telefone"
          />
        </div>

        <div className="space-y-2">
          <Label>Resp. Infraestrutura</Label>
          <Input 
            value={project.responsibleInfra || ""} 
            onChange={(e) => onUpdate("responsibleInfra", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Resp. Aderência</Label>
          <Input 
            value={project.responsibleAdherence || ""} 
            onChange={(e) => onUpdate("responsibleAdherence", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Resp. Conversão</Label>
          <Input 
            value={project.responsibleConversion || ""} 
            onChange={(e) => onUpdate("responsibleConversion", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Resp. Implantação</Label>
          <Input 
            value={project.responsibleImplementation || ""} 
            onChange={(e) => onUpdate("responsibleImplementation", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Resp. Pós-Implantação</Label>
          <Input 
            value={project.responsiblePost || ""} 
            onChange={(e) => onUpdate("responsiblePost", e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
};
