import { ProjectV2 } from "@/types/ProjectV2";
import { GeneralInfoGroup } from "./GeneralInfoGroup";
import { ContactsGroup } from "./ContactsGroup";
import { CriticalDatesGroup } from "./CriticalDatesGroup";
import { ContractDataGroup } from "./ContractDataGroup";
import { PipelineSummaryGroup } from "./PipelineSummaryGroup";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface DataTabProps {
  project: ProjectV2;
}

export const DataTab = ({ project }: DataTabProps) => {
  const { toast } = useToast();
  const [localProject, setLocalProject] = useState<ProjectV2>(project);
  const [hasChanges, setHasChanges] = useState(false);

  const handleUpdate = (field: keyof ProjectV2, value: unknown) => {
    setLocalProject((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    // Here you would call the store update function
    // updateProject(localProject.id, localProject);
    console.log("Saving project:", localProject);
    setHasChanges(false);
    toast({
      title: "Projeto atualizado",
      description: "As informações foram salvas com sucesso.",
    });
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Dados do Projeto</h3>
        {hasChanges && (
          <Button onClick={handleSave} size="sm" className="gap-2">
            <Save className="h-4 w-4" />
            Salvar Alterações
          </Button>
        )}
      </div>

      <PipelineSummaryGroup project={localProject} />
      <GeneralInfoGroup project={localProject} onUpdate={handleUpdate} />
      <ContactsGroup project={localProject} onUpdate={handleUpdate} />
      <CriticalDatesGroup project={localProject} onUpdate={handleUpdate} />
      <ContractDataGroup project={localProject} onUpdate={handleUpdate} />
    </div>
  );
};
