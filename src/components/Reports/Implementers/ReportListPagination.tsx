import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReportListPaginationProps {
  anchorId: string;
  currentPage: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export function ReportListPagination({
  anchorId,
  currentPage,
  itemLabel,
  onPageChange,
  pageSize,
  totalItems,
  totalPages,
}: ReportListPaginationProps) {
  if (totalItems <= pageSize) return null;

  const firstItem = (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalItems);

  const changePage = (nextPage: number) => {
    onPageChange(nextPage);
    globalThis.requestAnimationFrame?.(() => {
      document.getElementById(anchorId)?.scrollIntoView?.({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  return (
    <div className="flex min-w-0 flex-col gap-2 border-t border-border bg-muted/20 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <p className="text-center text-[11px] font-medium text-muted-foreground sm:text-left">
        Exibindo <strong className="text-foreground">{firstItem}–{lastItem}</strong> de{" "}
        <strong className="text-foreground">{totalItems}</strong>
      </p>
      <div className="flex items-center justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 min-w-9 gap-1 px-2 sm:h-8"
          aria-controls={anchorId}
          aria-label={`Página anterior de ${itemLabel}`}
          disabled={currentPage <= 1}
          onClick={() => changePage(currentPage - 1)}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="hidden min-[420px]:inline">Anterior</span>
        </Button>
        <span className="min-w-[82px] text-center text-[11px] font-semibold text-muted-foreground">
          Página <strong className="text-foreground">{currentPage}</strong> de{" "}
          <strong className="text-foreground">{totalPages}</strong>
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 min-w-9 gap-1 px-2 sm:h-8"
          aria-controls={anchorId}
          aria-label={`Próxima página de ${itemLabel}`}
          disabled={currentPage >= totalPages}
          onClick={() => changePage(currentPage + 1)}
        >
          <span className="hidden min-[420px]:inline">Próxima</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
