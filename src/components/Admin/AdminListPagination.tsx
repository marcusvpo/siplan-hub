import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

interface AdminListPagerProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function AdminListPager({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
}: AdminListPagerProps) {
  if (total <= pageSize) return null;

  return (
    <nav className="flex flex-col items-center justify-between gap-2 border-t bg-muted/20 px-3 py-3 sm:flex-row" aria-label="Paginação da lista">
      <p className="text-xs text-muted-foreground">
        Página <strong>{page}</strong> de <strong>{totalPages}</strong> · {total} registros
      </p>
      <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4" /> Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
        >
          Próxima <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}
