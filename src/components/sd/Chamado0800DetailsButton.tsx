import { useEffect, useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Chamado0800DetailDialog } from "@/components/ProjectManagement/Chamado0800DetailDialog";
import { Button } from "@/components/ui/button";
import { useChamado0800ByNumber } from "@/hooks/useChamados0800";
import { cn } from "@/lib/utils";

interface Chamado0800DetailsButtonProps {
  ticketNumber: string;
  variant?: "ghost" | "outline";
  className?: string;
  iconClassName?: string;
}

/** Abre os dados completos e os trâmites de um chamado sem carregar a lista antecipadamente. */
export function Chamado0800DetailsButton({
  ticketNumber,
  variant = "ghost",
  className,
  iconClassName,
}: Chamado0800DetailsButtonProps) {
  const [requested, setRequested] = useState(false);
  const query = useChamado0800ByNumber(requested ? ticketNumber : null);

  useEffect(() => {
    if (!requested) return;

    if (query.isError) {
      toast.error("Não foi possível carregar os detalhes do chamado.");
      setRequested(false);
      return;
    }

    if (query.isSuccess && !query.data) {
      toast.error("Os detalhes deste chamado ainda não foram sincronizados.");
      setRequested(false);
    }
  }, [query.data, query.isError, query.isSuccess, requested]);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size="icon"
        className={className}
        aria-label={`Ver detalhes do chamado ${ticketNumber}`}
        title={`Ver detalhes do chamado #${ticketNumber}`}
        disabled={requested && query.isLoading}
        onClick={() => setRequested(true)}
      >
        {requested && query.isLoading ? (
          <Loader2 className={cn("h-4 w-4 animate-spin", iconClassName)} />
        ) : (
          <Eye className={cn("h-4 w-4", iconClassName)} />
        )}
      </Button>

      <Chamado0800DetailDialog
        chamado={requested ? query.data ?? null : null}
        onClose={() => setRequested(false)}
        showTramites
      />
    </>
  );
}
