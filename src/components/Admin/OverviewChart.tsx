import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const data = [
  { name: "Jan", total: Math.floor(Math.random() * 50) + 10 },
  { name: "Feb", total: Math.floor(Math.random() * 50) + 10 },
  { name: "Mar", total: Math.floor(Math.random() * 50) + 10 },
  { name: "Apr", total: Math.floor(Math.random() * 50) + 10 },
  { name: "May", total: Math.floor(Math.random() * 50) + 10 },
  { name: "Jun", total: Math.floor(Math.random() * 50) + 10 },
];

export function OverviewChart() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="name"
          stroke="#888888"
          fontSize={10}
          tickLine={false}
          axisLine={false}
          dy={5}
        />
        <YAxis
          stroke="#888888"
          fontSize={10}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip
          cursor={{ fill: "transparent" }}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            borderRadius: "8px",
            border: "1px solid hsl(var(--border))",
          }}
        />
        <Bar
          dataKey="total"
          fill="currentColor"
          radius={[4, 4, 0, 0]}
          className="fill-primary"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
