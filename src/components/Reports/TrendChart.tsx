import { ProjectV2 } from "@/types/ProjectV2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";

interface TrendChartProps {
  projects: ProjectV2[];
}

export function TrendChart({ projects }: TrendChartProps) {
  // Generate last 30 days
  const data = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return date;
  }).map(date => {
    const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    
    const createdCount = projects.filter(p => {
      const created = new Date(p.createdAt);
      return created.getDate() === date.getDate() && 
             created.getMonth() === date.getMonth() && 
             created.getFullYear() === date.getFullYear();
    }).length;

    const finishedCount = projects.filter(p => {
      if (!p.endDateActual) return false;
      const finished = new Date(p.endDateActual);
      return finished.getDate() === date.getDate() && 
             finished.getMonth() === date.getMonth() && 
             finished.getFullYear() === date.getFullYear();
    }).length;

    return {
      date: dateStr,
      created: createdCount,
      finished: finishedCount
    };
  });

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Tendência (30 Dias)</CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis 
                dataKey="date" 
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
              />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="created" 
                name="Criados"
                stroke="#3b82f6" 
                strokeWidth={2} 
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="finished" 
                name="Finalizados"
                stroke="#10b981" 
                strokeWidth={2} 
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
