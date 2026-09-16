import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MyDayWidgetError({
  label,
  onRetry,
}: {
  label: string;
  onRetry: () => void | Promise<unknown>;
}) {
  return (
    <div
      role="alert"
      className="flex min-w-0 items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold">Não foi possível carregar {label}.</p>
        <p className="mt-0.5 text-[10px] opacity-80">Os demais blocos continuam disponíveis.</p>
      </div>
      <Button type="button" variant="outline" size="sm" className="h-7 shrink-0 gap-1 px-2 text-[10px]" onClick={() => void onRetry()}>
        <RefreshCw className="h-3 w-3" /> Tentar
      </Button>
    </div>
  );
}
