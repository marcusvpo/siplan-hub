import { ProjectV2 } from "@/types/ProjectV2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts";

interface TimePerStageChartProps {
  projects: ProjectV2[];
}

export function TimePerStageChart({ projects }: TimePerStageChartProps) {
  const stages = [
    { key: 'infra', label: 'Infra' },
    { key: 'adherence', label: 'Aderência' },
    { key: 'environment', label: 'Ambiente' },
    { key: 'conversion', label: 'Conversão' },
    { key: 'implementation', label: 'Implantação' },
    { key: 'post', label: 'Pós' },
  ] as const;

  const data = stages.map(stage => {
    const projectsWithStageDates = projects.filter(p => {
      const s = p.stages[stage.key];
      return s.startDate && s.endDate;
    });

    let avgDays = 0;
    if (projectsWithStageDates.length > 0) {
      const totalDays = projectsWithStageDates.reduce((acc, p) => {
        const s = p.stages[stage.key];
        const start = new Date(s.startDate!);
        const end = new Date(s.endDate!);
        const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return acc + diffDays;
      }, 0);
      avgDays = Math.round(totalDays / projectsWithStageDates.length);
    }

    // Define thresholds for status
    let status = "ok";
    if (avgDays > 15) status = "critical";
    else if (avgDays > 10) status = "warning";

    return {
      name: stage.label,
      days: avgDays,
      status: status
    };
  });

  const getBarColor = (status: string) => {
    if (status === "critical") return "#ef4444"; // red-500
    if (status === "warning") return "#f59e0b"; // amber-500
    return "#3b82f6"; // blue-500
  };

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Tempo Médio por Etapa (Dias)</CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="h-[300px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis 
                dataKey="name" 
                stroke="#888888" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}d`}
              />
              <Tooltip 
                cursor={{ fill: 'transparent' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="days" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.status)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
