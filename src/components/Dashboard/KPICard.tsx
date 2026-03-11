import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollingText } from "@/components/ui/scrolling-text";

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
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1 sm:space-y-2 flex-1 min-w-0">
            <ScrollingText 
              text={title} 
              className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              speed={30}
            />
            <div className="flex items-baseline gap-1">
              <h3 className="text-xl sm:text-2xl font-black tracking-tight truncate">
                {value}
                {unit && <span className="text-xs sm:text-sm text-muted-foreground ml-0.5">{unit}</span>}
              </h3>
            </div>
            {trend && (
              <div
                className={cn(
                  "flex items-center gap-0.5 text-[10px] font-bold",
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
          <div className={cn("p-1.5 sm:p-2 rounded-md bg-background/50 shrink-0 ml-2", iconColors[variant])}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
