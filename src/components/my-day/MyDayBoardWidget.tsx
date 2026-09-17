import { format } from "date-fns";
import { ArrowRight, CheckSquare2, Clock3, Columns3, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getDefaultMyDayBoard,
  MY_DAY_BOARD_PRIORITY_LABELS,
  type MyDayBoard,
  type MyDayBoardCard,
  type MyDayBoardColumn,
} from "@/lib/my-day-board";
import { cn } from "@/lib/utils";

interface MyDayBoardWidgetProps {
  boards: MyDayBoard[];
  columns: MyDayBoardColumn[];
  cards: MyDayBoardCard[];
  compact: boolean;
  canCreate: boolean;
}

const PRIORITY_CLASSES: Record<MyDayBoardCard["priority"], string> = {
  low: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300",
  medium: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300",
  high: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300",
  critical: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300",
};

export function MyDayBoardWidget({
  boards,
  columns,
  cards,
  compact,
  canCreate,
}: MyDayBoardWidgetProps) {
  const board = getDefaultMyDayBoard(boards);
  const boardColumns = board
    ? columns.filter((column) => column.boardId === board.id).sort((left, right) => left.position - right.position)
    : [];
  const boardCards = board
    ? cards.filter((card) => card.boardId === board.id && !card.archivedAt).sort((left, right) => left.position - right.position)
    : [];

  return (
    <Card className="h-full min-w-0 overflow-hidden border-border/70 shadow-sm">
      <CardHeader className={cn("flex min-w-0 flex-row items-center justify-between gap-2 space-y-0 border-b bg-muted/15", compact ? "p-3" : "p-4")}>
        <div className="min-w-0">
          <CardTitle className="flex min-w-0 items-center gap-2 text-sm">
            <Columns3 className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">Meu Quadro</span>
          </CardTitle>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
            {board ? board.name : "Notas e atividades em um Kanban pessoal."}
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="h-8 shrink-0 gap-1 px-2 text-[10px]">
          <Link to="/meu-dia/quadro">
            {board ? "Abrir quadro" : canCreate ? "Criar quadro" : "Visualizar"}
            {board ? <ArrowRight className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          </Link>
        </Button>
      </CardHeader>

      <CardContent className={cn("min-w-0", compact ? "p-2.5" : "p-4")}>
        {!board ? (
          <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 text-center">
            <Columns3 className="h-7 w-7 text-primary/70" />
            <p className="text-xs font-bold">Seu quadro pessoal ainda está vazio.</p>
            <p className="max-w-md text-[10px] text-muted-foreground">
              Crie colunas para organizar ideias, notas e próximos passos.
            </p>
          </div>
        ) : (
          <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {boardColumns.slice(0, 3).map((column) => {
              const columnCards = boardCards.filter((card) => card.columnId === column.id);
              return (
                <section key={column.id} className="min-w-0 rounded-lg border bg-muted/10 p-2" aria-label={column.title}>
                  <div className="mb-2 flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: column.color }} />
                    <h3 className="min-w-0 flex-1 truncate text-[11px] font-bold">{column.title}</h3>
                    <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1 text-[9px]">{columnCards.length}</Badge>
                  </div>
                  <div className="space-y-1.5">
                    {columnCards.slice(0, 3).map((card) => {
                      const doneCount = card.checklist.filter((item) => item.done).length;
                      return (
                        <Link
                          key={card.id}
                          to={`/meu-dia/quadro?board=${board.id}&card=${card.id}`}
                          className="block min-w-0 rounded-md border bg-background p-2 shadow-sm transition-colors hover:border-primary/30 hover:bg-primary/[0.02]"
                        >
                          <p className="line-clamp-2 text-[10px] font-semibold leading-snug">{card.title}</p>
                          <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1">
                            <Badge variant="outline" className={cn("h-4 px-1 text-[8px]", PRIORITY_CLASSES[card.priority])}>
                              {MY_DAY_BOARD_PRIORITY_LABELS[card.priority]}
                            </Badge>
                            {card.dueAt && (
                              <span className="flex items-center gap-0.5 text-[8px] text-muted-foreground">
                                <Clock3 className="h-2.5 w-2.5" /> {format(card.dueAt, "dd/MM")}
                              </span>
                            )}
                            {card.checklist.length > 0 && (
                              <span className="flex items-center gap-0.5 text-[8px] text-muted-foreground">
                                <CheckSquare2 className="h-2.5 w-2.5" /> {doneCount}/{card.checklist.length}
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                    {columnCards.length === 0 && (
                      <p className="rounded-md border border-dashed px-2 py-3 text-center text-[9px] text-muted-foreground">Sem cartões</p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
