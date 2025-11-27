import { ProjectV2 } from "@/types/ProjectV2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PipelineSummaryGroupProps {
  project: ProjectV2;
}

export const PipelineSummaryGroup = ({ project }: PipelineSummaryGroupProps) => {
  const stages = [
    { id: "infra", label: "Infra", status: project.stages.infra.status },
    { id: "adherence", label: "Aderência", status: project.stages.adherence.status },
    { id: "environment", label: "Ambiente", status: project.stages.environment.status },
    { id: "conversion", label: "Conversão", status: project.stages.conversion.status },
    { id: "implementation", label: "Implantação", status: project.stages.implementation.status },
    { id: "post", label: "Pós", status: project.stages.post.status },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "done": return "bg-green-500";
      case "in-progress": return "bg-blue-500";
      case "blocked": return "bg-red-500";
      default: return "bg-gray-200";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Visual</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-6 relative">
          {/* Connecting Line */}
          <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -z-10 transform -translate-y-1/2" />
          
          {stages.map((stage) => (
            <div key={stage.id} className="flex flex-col items-center gap-2 bg-background px-2">
              <div 
                className={`w-4 h-4 rounded-full ${getStatusColor(stage.status)} ring-4 ring-background`}
                title={`${stage.label}: ${stage.status}`}
              />
              <span className="text-xs font-medium text-muted-foreground">{stage.label}</span>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm font-medium">Última Ação</span>
            <span className="text-sm text-muted-foreground">
              {project.lastUpdatedBy} em {new Date(project.lastUpdatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
