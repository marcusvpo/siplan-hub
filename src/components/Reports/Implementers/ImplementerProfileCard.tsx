import React from "react";
import { ImplementerProfile } from "@/hooks/useImplementerReport";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, Activity, CheckCircle2, Mail } from "lucide-react";

interface ImplementerProfileCardProps {
  implementer: ImplementerProfile;
  totalProjects: number;
  activeProjects: number;
  completionRate: number;
}

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ImplementerProfileCard({
  implementer,
  totalProjects,
  activeProjects,
  completionRate,
}: ImplementerProfileCardProps) {
  const initials = getInitials(implementer.name);

  return (
    <Card className="relative overflow-hidden border border-primary/20 bg-gradient-to-br from-card via-card/95 to-primary/5 shadow-xl transition-all duration-300 hover:border-primary/40 group rounded-xl">
      {/* Glow Effect */}
      <div className="absolute -top-16 -right-16 h-36 w-36 rounded-full bg-primary/10 blur-3xl pointer-events-none group-hover:bg-primary/20 transition-all duration-500" />

      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Header Info */}
          <div className="flex items-center gap-4">
            {/* Avatar Circle with Initials */}
            <div className="relative shrink-0">
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground flex items-center justify-center font-black text-lg shadow-md shadow-primary/20 ring-2 ring-primary/20">
                {initials}
              </div>
            </div>

            <div className="space-y-1 overflow-hidden">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-foreground truncate">
                  {implementer.name}
                </h3>
                {implementer.team && (
                  <Badge
                    variant="outline"
                    className="text-xs font-semibold bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors"
                  >
                    {implementer.team}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground/80 font-medium">
                <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                <span className="truncate">{implementer.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Mini Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-6 pt-5 border-t border-border/50">
          {/* Stat 1: Total Projetos */}
          <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/40 backdrop-blur-sm border border-border/40 hover:bg-muted/60 transition-colors">
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <FolderKanban className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate">Total Projetos</span>
            </div>
            <div className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              {totalProjects}
            </div>
          </div>

          {/* Stat 2: Ativos */}
          <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/40 backdrop-blur-sm border border-border/40 hover:bg-muted/60 transition-colors">
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Activity className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              <span className="truncate">Ativos</span>
            </div>
            <div className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              {activeProjects}
            </div>
          </div>

          {/* Stat 3: Taxa Conclusão */}
          <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/40 backdrop-blur-sm border border-border/40 hover:bg-muted/60 transition-colors">
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span className="truncate">Taxa Conclusão</span>
            </div>
            <div className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              {Math.round(completionRate)}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
