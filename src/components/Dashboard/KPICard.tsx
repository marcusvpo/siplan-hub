import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: number | string;
  unit?: string;
  icon: LucideIcon;
  variant?: "default" | "success" | "warning" | "critical";
  trend?: {
    value: number;
    direction: "up" | "down" | "stable";
  };
  onClick?: () => void;
}

export const KPICard = ({ title, value, unit, icon: Icon, variant = "default", trend, onClick }: KPICardProps) => {
  const variantStyles = {
    default: "border-border bg-card",
    success: "border-green-500/30 bg-green-500/5",
    warning: "border-yellow-500/30 bg-yellow-500/5",
    critical: "border-red-500/30 bg-red-500/5",
  };

  const iconColors = {
    default: "text-primary",
    success: "text-green-500",
    warning: "text-yellow-500",
    critical: "text-red-500",
  };

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md",
        variantStyles[variant],
        onClick && "cursor-pointer hover:scale-105"
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold tracking-tight">
                {value}
                {unit && <span className="text-xl text-muted-foreground ml-1">{unit}</span>}
              </h3>
            </div>
            {trend && (
              <div
                className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  trend.direction === "up" && "text-green-600",
                  trend.direction === "down" && "text-red-600",
                  trend.direction === "stable" && "text-muted-foreground"
                )}
              >
                {trend.direction === "up" && "↑"}
                {trend.direction === "down" && "↓"}
                {trend.direction === "stable" && "→"}
                <span>{Math.abs(trend.value)}%</span>
              </div>
            )}
          </div>
          <div className={cn("p-3 rounded-lg bg-background/50", iconColors[variant])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
