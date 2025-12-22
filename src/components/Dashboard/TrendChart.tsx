import { ProjectV2 } from "@/types/ProjectV2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { startOfWeek, format, isSameWeek, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TrendChartProps {
  projects: ProjectV2[];
}

export const TrendChart = ({ projects }: TrendChartProps) => {
  const data = Array.from({ length: 8 }).map((_, i) => {
    const date = subWeeks(new Date(), 7 - i);
    const weekStart = startOfWeek(date, { locale: ptBR });

    const created = projects.filter((p) =>
      isSameWeek(new Date(p.createdAt), weekStart, { locale: ptBR })
    ).length;

    const completed = projects.filter(
      (p) =>
        p.globalStatus === "done" &&
        p.endDateActual &&
        isSameWeek(new Date(p.endDateActual), weekStart, { locale: ptBR })
    ).length;

    return {
      name: format(weekStart, "dd/MM"),
      Criados: created,
      Finalizados: completed,
    };
  });

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Tendência Semanal</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={data}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="Criados"
                stroke="#8884d8"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="Finalizados"
                stroke="#82ca9d"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
