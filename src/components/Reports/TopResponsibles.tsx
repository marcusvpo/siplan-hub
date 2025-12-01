import { ProjectV2 } from "@/types/ProjectV2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface TopResponsiblesProps {
  projects: ProjectV2[];
}

export function TopResponsibles({ projects }: TopResponsiblesProps) {
  // Aggregate data by project leader
  const leaderStats = projects.reduce((acc, project) => {
    if (project.globalStatus !== 'done' || !project.startDateActual || !project.endDateActual) {
      return acc;
    }

    const leader = project.projectLeader;
    if (!acc[leader]) {
      acc[leader] = { count: 0, totalDays: 0 };
    }

    const start = new Date(project.startDateActual);
    const end = new Date(project.endDateActual);
    const days = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    acc[leader].count += 1;
    acc[leader].totalDays += days;
    return acc;
  }, {} as Record<string, { count: number; totalDays: number }>);

  const responsibles = Object.entries(leaderStats)
    .map(([name, stats]) => ({
      name,
      completed: stats.count,
      avgTime: Math.round(stats.totalDays / stats.count)
    }))
    .sort((a, b) => b.completed - a.completed)
    .slice(0, 5); // Top 5

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle>Top Responsáveis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {responsibles.map((user, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {user.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {user.completed} projetos concluídos
                  </p>
                </div>
              </div>
              <div className="font-medium text-sm">
                Média {user.avgTime}d
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
