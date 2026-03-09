import { FileText, Search, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useProjects } from "@/hooks/useProjects";

export default function OrionTNModels() {
  const { projectId } = useParams();
  const { projects, isLoading } = useProjects();
  const [search, setSearch] = useState("");

  const selectedProject = projects.find((p) => p.id === projectId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Modelos Editor OrionTN {selectedProject ? `- ${selectedProject.clientName}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedProject
              ? `Criação de modelos para o projeto: ${selectedProject.clientName}`
              : "Selecione um projeto no menu lateral para começar"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar modelos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : selectedProject ? (
        <Card>
          <CardHeader>
            <CardTitle>Modelos para {selectedProject.clientName}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Nenhum modelo cadastrado para este projeto.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Aguardando seleção de projeto no menu ao lado.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
