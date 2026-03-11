import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface ProjectStatusChartProps {
  data: Record<string, number>;
  isLoading: boolean;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  'lead': { label: 'Lead', color: 'bg-blue-500' },
  'negotiation': { label: 'Negociação', color: 'bg-indigo-500' },
  'todo': { label: 'Na Fila', color: 'bg-cyan-500' },
  'in-progress': { label: 'Em Andamento', color: 'bg-amber-500' },
  'in_progress': { label: 'Em Andamento', color: 'bg-amber-500' },
  'blocked': { label: 'Bloqueado', color: 'bg-red-500' },
  'on_hold': { label: 'Pausado', color: 'bg-slate-400' },
  'canceled': { label: 'Cancelado', color: 'bg-stone-600' },
  'done': { label: 'Concluído', color: 'bg-emerald-500' },
  'archived': { label: 'Arquivado', color: 'bg-red-400' },
  'unknown': { label: 'Outros', color: 'bg-gray-300' }
};

export function ProjectStatusChart({ data, isLoading }: ProjectStatusChartProps) {
  const total = Object.values(data).reduce((acc, curr) => acc + curr, 0);

  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : total > 0 ? (
        <div className="space-y-2">
          {Object.entries(data)
            .sort((a, b) => b[1] - a[1])
            .map(([status, count]) => {
              const config = STATUS_LABELS[status] || STATUS_LABELS.unknown;
              const percentage = (count / total) * 100;
              
              return (
                <div key={status} className="space-y-1">
                  <div className="flex justify-between text-[10px] font-medium">
                    <span>{config.label}</span>
                    <span className="text-muted-foreground">{count} ({percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${config.color} transition-all duration-500`} 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-10">Nenhum projeto registrado.</p>
      )}
    </div>
  );
}
