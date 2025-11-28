import { ProjectV2 } from "@/types/ProjectV2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";

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
          <AutocompleteInput
            value={project.projectLeader}
            onChange={(value) => onUpdate("projectLeader", value)}
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
          <AutocompleteInput
            value={project.responsibleInfra || ""}
            onChange={(value) => onUpdate("responsibleInfra", value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Resp. Aderência</Label>
          <AutocompleteInput
            value={project.responsibleAdherence || ""}
            onChange={(value) => onUpdate("responsibleAdherence", value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Resp. Conversão</Label>
          <AutocompleteInput
            value={project.responsibleConversion || ""}
            onChange={(value) => onUpdate("responsibleConversion", value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Resp. Implantação</Label>
          <AutocompleteInput
            value={project.responsibleImplementation || ""}
            onChange={(value) => onUpdate("responsibleImplementation", value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Resp. Pós-Implantação</Label>
          <AutocompleteInput
            value={project.responsiblePost || ""}
            onChange={(value) => onUpdate("responsiblePost", value)}
          />
        </div>
      </CardContent>
    </Card>
  );
};
