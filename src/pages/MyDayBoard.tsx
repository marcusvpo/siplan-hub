import { useEffect, useMemo, useState } from "react";
import { format, isBefore, isSameDay, startOfDay } from "date-fns";
import {
  Archive,
  ArrowLeft,
  CalendarDays,
  CheckSquare2,
  Clock3,
  Columns3,
  ExternalLink,
  FileText,
  GripVertical,
  Inbox,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Settings2,
  Star,
} from "lucide-react";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { Link, useSearchParams } from "react-router-dom";
import { MyDayBoardCardDialog } from "@/components/my-day/MyDayBoardCardDialog";
import { MyDayBoardSettingsDialog } from "@/components/my-day/MyDayBoardSettingsDialog";
import { MyDayWidgetError } from "@/components/my-day/MyDayWidgetError";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMyDayBoard } from "@/hooks/useMyDayBoard";
import { useMyDayBoardInbox } from "@/hooks/useMyDayBoardInbox";
import {
  buildMyDayBoardCardInputFromInbox,
  getDefaultMyDayBoard,
  isMyDayBoardCardCompleted,
  MY_DAY_BOARD_PRIORITY_LABELS,
  type MyDayBoardCard,
  type MyDayBoardColumn,
  type MyDayBoardInboxItem,
  type MyDayBoardInboxSource,
} from "@/lib/my-day-board";
import { cn } from "@/lib/utils";

const AGENDA_INBOX_ID = "agenda-inbox";
const DESKTOP_COLUMN_PREFIX = "desktop-column:";
const MOBILE_LIST_PREFIX = "mobile-list:";
const MOBILE_TARGET_PREFIX = "mobile-target:";
const CARD_DRAG_PREFIX = "board-card:";
const AGENDA_DRAG_PREFIX = "agenda-item:";

const INBOX_SOURCE_LABELS: Record<MyDayBoardInboxSource, string> = {
  personal: "Pessoal",
  cs_cx: "CS/CX",
  implementation: "Implantação",
};

const PRIORITY_CLASSES: Record<MyDayBoardCard["priority"], string> = {
  low: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300",
  medium: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300",
  high: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300",
  critical: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300",
};

interface BoardCardProps {
  card: MyDayBoardCard;
  columns: MyDayBoardColumn[];
  onClick: () => void;
  dragHandleProps?: Record<string, unknown>;
}

function BoardCard({ card, columns, onClick, dragHandleProps }: BoardCardProps) {
  const doneCount = card.checklist.filter((item) => item.done).length;
  const completed = isMyDayBoardCardCompleted(card, columns);
  const overdue = Boolean(card.dueAt && !completed && isBefore(card.dueAt, startOfDay(new Date())));

  return (
    <article
      className={cn(
        "flex w-full min-w-0 items-start gap-1 rounded-lg border bg-background shadow-sm transition-colors hover:border-primary/35 hover:bg-primary/[0.02]",
        overdue && "border-rose-300 dark:border-rose-900",
      )}
    >
      <button
        type="button"
        className="min-w-0 flex-1 p-3 pr-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        onClick={onClick}
      >
        <div className="flex min-w-0 items-start justify-between gap-2">
          <h3 className={cn("min-w-0 flex-1 break-words text-xs font-bold leading-snug", completed && "text-muted-foreground line-through")}>{card.title}</h3>
          <Badge variant="outline" className={cn("h-5 shrink-0 px-1.5 text-[8px]", PRIORITY_CLASSES[card.priority])}>
            {MY_DAY_BOARD_PRIORITY_LABELS[card.priority]}
          </Badge>
        </div>
        {card.description && (
          <p className="mt-1.5 line-clamp-3 break-words text-[10px] leading-relaxed text-muted-foreground">{card.description}</p>
        )}
        {card.labels.length > 0 && (
          <div className="mt-2 flex min-w-0 flex-wrap gap-1">
            {card.labels.slice(0, 4).map((label) => <Badge key={label} variant="secondary" className="h-4 max-w-full truncate px-1 text-[8px]">{label}</Badge>)}
            {card.labels.length > 4 && <Badge variant="secondary" className="h-4 px-1 text-[8px]">+{card.labels.length - 4}</Badge>}
          </div>
        )}
        <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[9px] text-muted-foreground">
          {card.dueAt && (
            <span className={cn("flex items-center gap-1", overdue && "font-semibold text-rose-600 dark:text-rose-400")}>
              <Clock3 className="h-3 w-3" /> {format(card.dueAt, "dd/MM/yyyy")}
            </span>
          )}
          {card.checklist.length > 0 && (
            <span className="flex items-center gap-1"><CheckSquare2 className="h-3 w-3" /> {doneCount}/{card.checklist.length}</span>
          )}
          {card.description && <FileText className="h-3 w-3" aria-label="Possui notas" />}
          {card.linkedPath && <Link2 className="h-3 w-3" aria-label="Possui link" />}
        </div>
      </button>
      {dragHandleProps && (
        <div
          {...dragHandleProps}
          aria-label={`Arrastar ${card.title}`}
          className="m-1 flex min-h-10 w-9 shrink-0 touch-none cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}
    </article>
  );
}

interface AgendaInboxCardProps {
  item: MyDayBoardInboxItem;
  targetColumn?: MyDayBoardColumn;
  canImport: boolean;
  isSaving: boolean;
  dragHandleProps?: Record<string, unknown>;
  onImport: () => void;
}

function AgendaInboxCard({
  item,
  targetColumn,
  canImport,
  isSaving,
  dragHandleProps,
  onImport,
}: AgendaInboxCardProps) {
  const today = isSameDay(item.dueAt, new Date());
  const dateLabel = item.allDay
    ? format(item.dueAt, "dd/MM")
    : format(item.dueAt, "dd/MM 'às' HH:mm");

  return (
    <article className={cn(
      "min-w-0 rounded-lg border bg-background p-2.5 shadow-sm",
      item.isOverdue && "border-amber-300 dark:border-amber-900",
    )}>
      <div className="flex min-w-0 items-start gap-1">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="h-5 px-1.5 text-[8px]">
              {item.sourceLabel}
            </Badge>
            <span className={cn(
              "text-[9px] font-semibold text-muted-foreground",
              item.isOverdue && "text-amber-700 dark:text-amber-300",
            )}>
              {item.isOverdue ? "Atrasado" : today ? "Hoje" : dateLabel}
            </span>
          </div>
          <h3 className="mt-1.5 break-words text-xs font-bold leading-snug">{item.title}</h3>
          <p className="mt-1 line-clamp-2 break-words text-[10px] text-muted-foreground">
            {item.context} · {dateLabel}
          </p>
        </div>
        {dragHandleProps && (
          <div
            {...dragHandleProps}
            aria-label={`Arrastar ${item.title} da agenda`}
            className="flex min-h-10 w-9 shrink-0 touch-none cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
        {canImport && targetColumn && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 min-w-0 flex-1 px-2 text-[10px]"
            disabled={isSaving}
            onClick={onImport}
          >
            Adicionar em {targetColumn.title}
          </Button>
        )}
        <Button asChild type="button" size="sm" variant="ghost" className="h-8 shrink-0 gap-1 px-2 text-[10px]">
          <Link to={item.path}><ExternalLink className="h-3.5 w-3.5" /> Abrir</Link>
        </Button>
      </div>
    </article>
  );
}

export default function MyDayBoardPage() {
  const workspace = useMyDayBoard();
  const agendaInbox = useMyDayBoardInbox(workspace.cards);
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<MyDayBoardCard | null>(null);
  const [initialColumnId, setInitialColumnId] = useState<string | null>(null);
  const [activeMobileColumnId, setActiveMobileColumnId] = useState<string | null>(AGENDA_INBOX_ID);
  const [inboxSource, setInboxSource] = useState<"all" | MyDayBoardInboxSource>("all");
  const [showArchived, setShowArchived] = useState(false);

  const fallbackBoard = getDefaultMyDayBoard(workspace.boards);
  const requestedBoardId = searchParams.get("board");
  const board = workspace.boards.find((item) => item.id === requestedBoardId) ?? fallbackBoard;
  const columns = useMemo(
    () => workspace.columns.filter((column) => column.boardId === board?.id).sort((left, right) => left.position - right.position),
    [board?.id, workspace.columns],
  );
  const boardCards = useMemo(
    () => workspace.cards.filter((card) => card.boardId === board?.id).sort((left, right) => left.position - right.position),
    [board?.id, workspace.cards],
  );
  const cards = useMemo(() => boardCards.filter((card) => !card.archivedAt), [boardCards]);
  const archivedCards = useMemo(() => boardCards.filter((card) => card.archivedAt), [boardCards]);
  const visibleInboxItems = useMemo(
    () => agendaInbox.items.filter((item) => inboxSource === "all" || item.source === inboxSource),
    [agendaInbox.items, inboxSource],
  );
  const inboxSources = useMemo(
    () => [...new Set(agendaInbox.items.map((item) => item.source))],
    [agendaInbox.items],
  );

  useEffect(() => {
    if (
      activeMobileColumnId !== AGENDA_INBOX_ID &&
      !columns.some((column) => column.id === activeMobileColumnId)
    ) {
      setActiveMobileColumnId(AGENDA_INBOX_ID);
    }
  }, [activeMobileColumnId, columns]);

  useEffect(() => {
    if (inboxSource !== "all" && !inboxSources.includes(inboxSource)) {
      setInboxSource("all");
    }
  }, [inboxSource, inboxSources]);

  useEffect(() => {
    const requestedCardId = searchParams.get("card");
    if (!requestedCardId || workspace.isLoading) return;
    const requestedCard = workspace.cards.find((card) => card.id === requestedCardId);
    if (!requestedCard) return;
    setEditingCard(requestedCard);
    setInitialColumnId(requestedCard.columnId);
    setCardDialogOpen(true);
  }, [searchParams, workspace.cards, workspace.isLoading]);

  const selectBoard = (boardId: string) => {
    setSearchParams({ board: boardId });
    setEditingCard(null);
    setCardDialogOpen(false);
    setShowArchived(false);
  };

  const openNewCard = (columnId: string) => {
    setEditingCard(null);
    setInitialColumnId(columnId);
    setCardDialogOpen(true);
  };

  const openCard = (card: MyDayBoardCard) => {
    setEditingCard(card);
    setInitialColumnId(card.columnId);
    setSearchParams({ board: card.boardId, card: card.id });
    setCardDialogOpen(true);
  };

  const closeCardDialog = (open: boolean) => {
    setCardDialogOpen(open);
    if (!open) {
      setEditingCard(null);
      setSearchParams(board ? { board: board.id } : {});
    }
  };

  const getDestinationColumnId = (droppableId: string) => {
    for (const prefix of [DESKTOP_COLUMN_PREFIX, MOBILE_LIST_PREFIX, MOBILE_TARGET_PREFIX]) {
      if (droppableId.startsWith(prefix)) return droppableId.slice(prefix.length);
    }
    return null;
  };

  const importInboxItem = async (
    item: MyDayBoardInboxItem,
    columnId: string,
  ) => {
    if (!board || !workspace.permissions.canCreate) return;
    await workspace.createCard(
      buildMyDayBoardCardInputFromInbox(item, board.id, columnId),
    );
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const destinationColumnId = getDestinationColumnId(result.destination.droppableId);
    if (!destinationColumnId) return;

    if (result.draggableId.startsWith(AGENDA_DRAG_PREFIX)) {
      if (!workspace.permissions.canCreate) return;
      const inboxItemId = result.draggableId.slice(AGENDA_DRAG_PREFIX.length);
      const item = agendaInbox.items.find((candidate) => candidate.id === inboxItemId);
      if (!item) return;
      void importInboxItem(item, destinationColumnId).catch(() => undefined);
      if (isMobile) setActiveMobileColumnId(destinationColumnId);
      return;
    }

    if (!workspace.permissions.canEdit || !result.draggableId.startsWith(CARD_DRAG_PREFIX)) return;
    const cardId = result.draggableId.slice(CARD_DRAG_PREFIX.length);
    const destinationIndex = result.destination.droppableId.startsWith(MOBILE_TARGET_PREFIX)
      ? cards.filter((card) => card.columnId === destinationColumnId).length
      : result.destination.index;
    if (
      result.source.droppableId === result.destination.droppableId &&
      result.source.index === destinationIndex
    ) return;
    const position = workspace.calculateCardPosition(
      destinationColumnId,
      destinationIndex,
      cardId,
    );
    void workspace.moveCard({
      cardId,
      columnId: destinationColumnId,
      position,
    }).catch(() => undefined);
    if (isMobile) setActiveMobileColumnId(destinationColumnId);
  };

  const renderInboxHeader = () => (
    <>
      <div className="mb-2 flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="flex min-w-0 items-center gap-2 text-sm font-black">
            <Inbox className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">Entrada da agenda</span>
            <Badge variant="secondary" className="h-5 px-1.5 text-[9px]">{visibleInboxItems.length}</Badge>
          </h2>
          <p className="mt-0.5 text-[9px] text-muted-foreground">
            Arraste para uma coluna ou use o botão de adicionar.
          </p>
        </div>
        {agendaInbox.isLoading && <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />}
      </div>
      {inboxSources.length > 1 && (
        <div className="mb-2 flex min-w-0 flex-wrap gap-1" aria-label="Filtrar entrada da agenda por origem">
          <Button
            type="button"
            size="sm"
            variant={inboxSource === "all" ? "secondary" : "ghost"}
            className="h-7 px-2 text-[9px]"
            aria-pressed={inboxSource === "all"}
            onClick={() => setInboxSource("all")}
          >
            Todas
          </Button>
          {inboxSources.map((source) => (
            <Button
              key={source}
              type="button"
              size="sm"
              variant={inboxSource === source ? "secondary" : "ghost"}
              className="h-7 px-2 text-[9px]"
              aria-pressed={inboxSource === source}
              onClick={() => setInboxSource(source)}
            >
              {INBOX_SOURCE_LABELS[source]}
            </Button>
          ))}
        </div>
      )}
      {agendaInbox.error && (
        <div className="mb-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-[10px] text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Não foi possível atualizar a entrada da agenda.
        </div>
      )}
    </>
  );

  const renderInboxItem = (item: MyDayBoardInboxItem, index: number) => (
    <Draggable
      key={item.id}
      draggableId={`${AGENDA_DRAG_PREFIX}${item.id}`}
      index={index}
      isDragDisabled={!workspace.permissions.canCreate}
    >
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(snapshot.isDragging && "rotate-1 opacity-95 shadow-xl")}
        >
          <AgendaInboxCard
            item={item}
            targetColumn={columns[0]}
            canImport={workspace.permissions.canCreate}
            isSaving={workspace.isSaving}
            dragHandleProps={provided.dragHandleProps as unknown as Record<string, unknown>}
            onImport={() => {
              if (!columns[0]) return;
              void importInboxItem(item, columns[0].id).catch(() => undefined);
            }}
          />
        </div>
      )}
    </Draggable>
  );

  const renderBoardDraggable = (card: MyDayBoardCard, index: number) => (
    <Draggable
      key={card.id}
      draggableId={`${CARD_DRAG_PREFIX}${card.id}`}
      index={index}
      isDragDisabled={!workspace.permissions.canEdit}
    >
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(snapshot.isDragging && "rotate-1 opacity-95 shadow-xl")}
        >
          <BoardCard
            card={card}
            columns={columns}
            onClick={() => openCard(card)}
            dragHandleProps={provided.dragHandleProps as unknown as Record<string, unknown>}
          />
        </div>
      )}
    </Draggable>
  );

  if (workspace.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto w-full min-w-0 max-w-[1800px] space-y-4 overflow-x-hidden px-0 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:px-3 md:pb-6" data-testid="my-day-board-page">
      <section className="relative min-w-0 overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-r from-primary/[0.08] via-background to-sky-50 p-3 shadow-sm dark:to-sky-950/10 sm:p-4">
        <Columns3 className="pointer-events-none absolute -bottom-10 -right-5 h-36 w-36 text-primary/[0.05]" />
        <div className="relative z-10 flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <Button asChild variant="ghost" size="sm" className="-ml-2 h-7 gap-1 px-2 text-[10px]">
              <Link to="/meu-dia"><ArrowLeft className="h-3.5 w-3.5" /> Voltar ao Meu Dia</Link>
            </Button>
            <div className="mt-1 flex min-w-0 items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: board?.color ?? "#e11d48" }} />
              <h1 className="min-w-0 truncate text-xl font-black tracking-tight sm:text-2xl">Meu Quadro</h1>
              {board?.isDefault && <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[9px]"><Star className="h-3 w-3" /> Principal</Badge>}
            </div>
            <p className="mt-1 max-w-2xl break-words text-[11px] text-muted-foreground sm:text-xs">
              Organize notas e atividades em um Kanban privado. Arraste compromissos da agenda para transformá-los em cartões.
            </p>
          </div>

          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {workspace.boards.length > 0 && (
              <Select value={board?.id} onValueChange={selectBoard}>
                <SelectTrigger className="h-9 w-full min-w-0 sm:w-56" aria-label="Selecionar quadro"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {workspace.boards.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {workspace.permissions.canCreate && (
              <Button type="button" variant="outline" className="h-9 gap-1" onClick={() => { setCreatingBoard(true); setSettingsOpen(true); }}><Plus className="h-4 w-4" /> Novo quadro</Button>
            )}
            {board && workspace.permissions.canEdit && (
              <Button type="button" variant="outline" className="h-9 gap-1" onClick={() => { setCreatingBoard(false); setSettingsOpen(true); }}><Settings2 className="h-4 w-4" /> Configurar</Button>
            )}
            {board && (
              <Button type="button" variant={showArchived ? "secondary" : "outline"} className="h-9 gap-1" aria-pressed={showArchived} onClick={() => setShowArchived((current) => !current)}>
                <Archive className="h-4 w-4" /> Arquivados
                {archivedCards.length > 0 && <Badge variant="secondary" className="h-5 px-1 text-[9px]">{archivedCards.length}</Badge>}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9"
              aria-label="Atualizar quadro e agenda"
              disabled={workspace.isRefreshing || agendaInbox.isRefreshing}
              onClick={() => void Promise.all([workspace.refresh(), agendaInbox.refresh()])}
            >
              <RefreshCw className={cn("h-4 w-4", (workspace.isRefreshing || agendaInbox.isRefreshing) && "animate-spin")} />
            </Button>
          </div>
        </div>
      </section>

      {workspace.error && <MyDayWidgetError label="seu quadro pessoal" onRetry={workspace.refresh} />}

      {!board ? (
        <Card className="border-dashed">
          <CardContent className="flex min-h-72 flex-col items-center justify-center gap-3 p-6 text-center">
            <Columns3 className="h-12 w-12 text-primary/70" />
            <div>
              <h2 className="text-base font-black">Crie seu primeiro quadro</h2>
              <p className="mt-1 max-w-lg text-xs text-muted-foreground">Você receberá as colunas Ideias, Em andamento e Concluído, mas poderá personalizar tudo depois.</p>
            </div>
            {workspace.permissions.canCreate && <Button className="gap-1" onClick={() => { setCreatingBoard(true); setSettingsOpen(true); }}><Plus className="h-4 w-4" /> Criar Meu Quadro</Button>}
          </CardContent>
        </Card>
      ) : showArchived ? (
        <Card>
          <CardContent className="min-w-0 p-3 sm:p-4">
            <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
              <div className="min-w-0"><h2 className="text-sm font-black">Cartões arquivados</h2><p className="text-[10px] text-muted-foreground">Abra um cartão para restaurá-lo ou excluí-lo.</p></div>
              <Button type="button" variant="outline" size="sm" className="h-9 shrink-0" onClick={() => setShowArchived(false)}>Voltar ao quadro</Button>
            </div>
            {archivedCards.length > 0 ? (
              <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {archivedCards.map((card) => <BoardCard key={card.id} card={card} columns={columns} onClick={() => openCard(card)} />)}
              </div>
            ) : (
              <div className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center"><Archive className="h-8 w-8 text-muted-foreground" /><p className="text-xs font-semibold">Nenhum cartão arquivado.</p></div>
            )}
          </CardContent>
        </Card>
      ) : columns.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex min-h-56 flex-col items-center justify-center gap-3 p-6 text-center">
            <Columns3 className="h-10 w-10 text-primary/70" />
            <p className="text-sm font-bold">Este quadro ainda não possui colunas.</p>
            {workspace.permissions.canEdit && <Button variant="outline" onClick={() => { setCreatingBoard(false); setSettingsOpen(true); }}>Configurar colunas</Button>}
          </CardContent>
        </Card>
      ) : isMobile ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <section className="space-y-3" aria-label="Quadro mobile" data-testid="my-day-board-mobile">
            <div className="grid grid-cols-2 gap-2 min-[460px]:grid-cols-3">
              <button
                type="button"
                aria-pressed={activeMobileColumnId === AGENDA_INBOX_ID}
                className={cn(
                  "min-h-11 min-w-0 rounded-lg border p-2 text-left",
                  activeMobileColumnId === AGENDA_INBOX_ID ? "border-primary bg-primary/[0.06]" : "bg-card",
                )}
                onClick={() => setActiveMobileColumnId(AGENDA_INBOX_ID)}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate text-[10px] font-bold">Agenda</span>
                  <Badge variant="secondary" className="h-5 px-1 text-[9px]">{visibleInboxItems.length}</Badge>
                </span>
              </button>
              {columns.map((column) => {
                const active = column.id === activeMobileColumnId;
                const count = cards.filter((card) => card.columnId === column.id).length;
                return (
                  <Droppable key={column.id} droppableId={`${MOBILE_TARGET_PREFIX}${column.id}`} isDropDisabled={!workspace.permissions.canCreate && !workspace.permissions.canEdit}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.droppableProps}>
                        <button
                          type="button"
                          aria-pressed={active}
                          className={cn(
                            "min-h-11 w-full min-w-0 rounded-lg border p-2 text-left transition-colors",
                            active ? "border-primary bg-primary/[0.06]" : "bg-card",
                            snapshot.isDraggingOver && "border-primary bg-primary/10 ring-2 ring-primary/20",
                          )}
                          onClick={() => setActiveMobileColumnId(column.id)}
                        >
                          <span className="flex min-w-0 items-center gap-1.5"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: column.color }} /><span className="min-w-0 flex-1 truncate text-[10px] font-bold">{column.title}</span><Badge variant="secondary" className="h-5 px-1 text-[9px]">{count}</Badge></span>
                        </button>
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>

            {activeMobileColumnId === AGENDA_INBOX_ID && (
              <Droppable droppableId={AGENDA_INBOX_ID} isDropDisabled>
                {(provided) => (
                  <section ref={provided.innerRef} {...provided.droppableProps} className="min-w-0 rounded-xl border bg-muted/10 p-2.5">
                    {renderInboxHeader()}
                    <div className="min-h-20 space-y-2">
                      {visibleInboxItems.map(renderInboxItem)}
                      {provided.placeholder}
                      {!agendaInbox.isLoading && visibleInboxItems.length === 0 && (
                        <p className="rounded-lg border border-dashed px-3 py-8 text-center text-xs text-muted-foreground">Nenhum compromisso disponível para este filtro.</p>
                      )}
                    </div>
                  </section>
                )}
              </Droppable>
            )}

            {columns.filter((column) => column.id === activeMobileColumnId).map((column) => {
              const columnCards = cards.filter((card) => card.columnId === column.id);
              return (
                <Droppable key={column.id} droppableId={`${MOBILE_LIST_PREFIX}${column.id}`} isDropDisabled={!workspace.permissions.canCreate && !workspace.permissions.canEdit}>
                  {(provided, snapshot) => (
                    <section ref={provided.innerRef} {...provided.droppableProps} className={cn("min-w-0 rounded-xl border bg-muted/10 p-2.5 transition-colors", snapshot.isDraggingOver && "border-primary/40 bg-primary/[0.04]")}>
                      <div className="mb-2 flex items-center justify-between gap-2"><h2 className="flex min-w-0 items-center gap-2 text-sm font-black"><span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: column.color }} /><span className="truncate">{column.title}</span></h2>{workspace.permissions.canCreate && <Button type="button" size="sm" className="h-9 shrink-0 gap-1" onClick={() => openNewCard(column.id)}><Plus className="h-4 w-4" /> Cartão</Button>}</div>
                      <p className="mb-2 text-[9px] text-muted-foreground">Segure o ícone <GripVertical className="inline h-3 w-3" /> para reordenar ou solte sobre outra coluna acima.</p>
                      <div className="min-h-20 space-y-2">
                        {columnCards.map(renderBoardDraggable)}
                        {provided.placeholder}
                        {columnCards.length === 0 && <p className="rounded-lg border border-dashed py-8 text-center text-xs text-muted-foreground">Solte um cartão aqui.</p>}
                      </div>
                    </section>
                  )}
                </Droppable>
              );
            })}
          </section>
        </DragDropContext>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <section className="grid min-w-0 grid-cols-2 items-start gap-3 xl:grid-cols-3 2xl:grid-cols-4" aria-label="Quadro Kanban">
            <Droppable droppableId={AGENDA_INBOX_ID} isDropDisabled>
              {(provided) => (
                <section ref={provided.innerRef} {...provided.droppableProps} className="min-w-0 rounded-xl border border-primary/20 bg-primary/[0.025] p-2.5">
                  {renderInboxHeader()}
                  <div className="min-h-20 space-y-2">
                    {visibleInboxItems.map(renderInboxItem)}
                    {provided.placeholder}
                    {!agendaInbox.isLoading && visibleInboxItems.length === 0 && (
                      <p className="rounded-lg border border-dashed px-3 py-8 text-center text-xs text-muted-foreground">Nenhum compromisso disponível para este filtro.</p>
                    )}
                  </div>
                </section>
              )}
            </Droppable>
            {columns.map((column) => {
              const columnCards = cards.filter((card) => card.columnId === column.id);
              return (
                <Droppable key={column.id} droppableId={`${DESKTOP_COLUMN_PREFIX}${column.id}`} isDropDisabled={!workspace.permissions.canCreate && !workspace.permissions.canEdit}>
                  {(provided, snapshot) => (
                    <section ref={provided.innerRef} {...provided.droppableProps} className={cn("min-w-0 rounded-xl border bg-muted/10 p-2.5 transition-colors", snapshot.isDraggingOver && "border-primary/40 bg-primary/[0.04]")}>
                      <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
                        <h2 className="flex min-w-0 items-center gap-2 text-sm font-black"><span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: column.color }} /><span className="truncate">{column.title}</span><Badge variant="secondary" className="h-5 px-1.5 text-[9px]">{columnCards.length}</Badge></h2>
                        {workspace.permissions.canCreate && <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0" aria-label={`Adicionar cartão em ${column.title}`} onClick={() => openNewCard(column.id)}><Plus className="h-4 w-4" /></Button>}
                      </div>
                      <div className="min-h-20 space-y-2">
                        {columnCards.map(renderBoardDraggable)}
                        {provided.placeholder}
                        {columnCards.length === 0 && <p className="rounded-lg border border-dashed py-8 text-center text-xs text-muted-foreground">Solte um cartão aqui.</p>}
                      </div>
                    </section>
                  )}
                </Droppable>
              );
            })}
          </section>
        </DragDropContext>
      )}

      <MyDayBoardSettingsDialog
        open={settingsOpen}
        onOpenChange={(open) => { setSettingsOpen(open); if (!open) setCreatingBoard(false); }}
        board={creatingBoard ? null : board}
        columns={creatingBoard ? [] : columns}
        canCreate={workspace.permissions.canCreate}
        canEdit={workspace.permissions.canEdit}
        canDelete={workspace.permissions.canDelete}
        isSaving={workspace.isSaving}
        onSaveBoard={async (input) => {
          if (creatingBoard) {
            const id = await workspace.createBoard(input);
            setSearchParams({ board: id });
            return id;
          }
          if (!board) return;
          return workspace.updateBoard(board.id, input);
        }}
        onSetDefault={board ? () => workspace.setDefaultBoard(board.id) : undefined}
        onDeleteBoard={board ? async () => { await workspace.deleteBoard(board.id); setSearchParams({}); } : undefined}
        onCreateColumn={board ? (input) => workspace.createColumn({ boardId: board.id, ...input }) : undefined}
        onUpdateColumn={workspace.updateColumn}
        onReorderColumns={workspace.reorderColumns}
        onDeleteColumn={workspace.deleteColumn}
      />

      <MyDayBoardCardDialog
        open={cardDialogOpen}
        onOpenChange={closeCardDialog}
        board={board}
        columns={columns}
        card={editingCard}
        initialColumnId={initialColumnId}
        canEdit={editingCard ? workspace.permissions.canEdit : workspace.permissions.canCreate}
        canDelete={workspace.permissions.canDelete}
        isSaving={workspace.isSaving}
        onSave={(input) => editingCard ? workspace.updateCard(editingCard.id, input) : workspace.createCard(input)}
        onArchive={editingCard ? () => editingCard.archivedAt ? workspace.restoreCard(editingCard.id) : workspace.archiveCard(editingCard.id) : undefined}
        isArchived={Boolean(editingCard?.archivedAt)}
        onDelete={editingCard ? () => workspace.deleteCard(editingCard.id) : undefined}
      />
    </div>
  );
}
