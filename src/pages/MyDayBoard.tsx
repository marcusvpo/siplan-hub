import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { format, isBefore, isSameDay, startOfDay } from "date-fns";
import {
  Archive,
  ArrowLeft,
  CalendarDays,
  CheckSquare2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Columns3,
  ExternalLink,
  FileText,
  GripVertical,
  Inbox,
  Link2,
  ListFilter,
  Loader2,
  Map,
  Maximize2,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Star,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { MyDayBoardCardDialog } from "@/components/my-day/MyDayBoardCardDialog";
import { MyDayBoardSettingsDialog } from "@/components/my-day/MyDayBoardSettingsDialog";
import { MyDayWidgetError } from "@/components/my-day/MyDayWidgetError";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  buildMyDayBoardLinkedCardUpdates,
  getDefaultMyDayBoard,
  getMyDayBoardInboxSourceKeyFromPath,
  isMyDayBoardCardCompleted,
  MY_DAY_BOARD_PRIORITY_LABELS,
  type MyDayBoardCard,
  type MyDayBoardColumn,
  type MyDayBoardInboxItem,
  type MyDayBoardInboxSource,
} from "@/lib/my-day-board";
import { cn } from "@/lib/utils";
import { normalizeSearchText } from "@/utils/normalize-search";

const AGENDA_INBOX_ID = "agenda-inbox";
const DESKTOP_COLUMN_PREFIX = "desktop-column:";
const MOBILE_LIST_PREFIX = "mobile-list:";
const MOBILE_TARGET_PREFIX = "mobile-target:";
const CARD_DRAG_PREFIX = "board-card:";
const AGENDA_DRAG_PREFIX = "agenda-item:";
const BOARD_ZOOM_MIN = 50;
const BOARD_ZOOM_MAX = 130;
const BOARD_ZOOM_STEP = 10;
const BOARD_VIEW_STORAGE_PREFIX = "siplan:my-day-board:view";

type BoardDensity = "comfortable" | "compact";
type BoardDueFilter = "all" | "overdue" | "today" | "upcoming" | "without-date";
type BoardOriginFilter = "all" | "manual" | "agenda" | MyDayBoardInboxSource;

interface StoredBoardViewPreferences {
  zoom: number;
  scrollLeft: number;
  density: BoardDensity;
  collapsedColumnIds: string[];
  minimapOpen: boolean;
}

const DEFAULT_BOARD_VIEW_PREFERENCES: StoredBoardViewPreferences = {
  zoom: 100,
  scrollLeft: 0,
  density: "comfortable",
  collapsedColumnIds: [],
  minimapOpen: false,
};

function readBoardViewPreferences(key: string): StoredBoardViewPreferences {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return DEFAULT_BOARD_VIEW_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<StoredBoardViewPreferences>;
    return {
      zoom: Math.min(BOARD_ZOOM_MAX, Math.max(BOARD_ZOOM_MIN, Number(parsed.zoom) || 100)),
      scrollLeft: Math.max(0, Number(parsed.scrollLeft) || 0),
      density: parsed.density === "compact" ? "compact" : "comfortable",
      collapsedColumnIds: Array.isArray(parsed.collapsedColumnIds)
        ? parsed.collapsedColumnIds.filter((id): id is string => typeof id === "string")
        : [],
      minimapOpen: Boolean(parsed.minimapOpen),
    };
  } catch {
    return DEFAULT_BOARD_VIEW_PREFERENCES;
  }
}

function writeBoardViewPreferences(key: string, preferences: StoredBoardViewPreferences) {
  try {
    window.localStorage.setItem(key, JSON.stringify(preferences));
  } catch {
    // A preferência visual é opcional; o quadro continua funcional sem storage local.
  }
}

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
  density: BoardDensity;
  onClick: () => void;
  dragHandleProps?: Record<string, unknown>;
}

function BoardCard({ card, columns, density, onClick, dragHandleProps }: BoardCardProps) {
  const doneCount = card.checklist.filter((item) => item.done).length;
  const completed = isMyDayBoardCardCompleted(card, columns);
  const linkedToAgenda = Boolean(getMyDayBoardInboxSourceKeyFromPath(card.linkedPath));
  const overdue = Boolean(card.dueAt && !completed && isBefore(card.dueAt, startOfDay(new Date())));

  return (
    <article
      data-board-card
      className={cn(
        "flex w-full min-w-0 items-start gap-1 rounded-lg border bg-background shadow-sm transition-colors hover:border-primary/35 hover:bg-primary/[0.02]",
        overdue && "border-rose-300 dark:border-rose-900",
      )}
    >
      <button
        type="button"
        className={cn(
          "min-w-0 flex-1 pr-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          density === "compact" ? "p-2" : "p-3",
        )}
        onClick={onClick}
      >
        <div className="flex min-w-0 items-start justify-between gap-2">
          <h3 className={cn("min-w-0 flex-1 break-words text-xs font-bold leading-snug", completed && "text-muted-foreground line-through")}>{card.title}</h3>
          <Badge variant="outline" className={cn("h-5 shrink-0 px-1.5 text-[8px]", PRIORITY_CLASSES[card.priority])}>
            {MY_DAY_BOARD_PRIORITY_LABELS[card.priority]}
          </Badge>
        </div>
        {card.description && density === "comfortable" && (
          <p className="mt-1.5 line-clamp-3 break-words text-[10px] leading-relaxed text-muted-foreground">{card.description}</p>
        )}
        {(card.labels.length > 0 || linkedToAgenda) && (
          <div className={cn("flex min-w-0 flex-wrap gap-1", density === "compact" ? "mt-1" : "mt-2")}>
            {linkedToAgenda && <Badge variant="outline" className="h-4 max-w-full gap-1 truncate px-1 text-[8px]"><CalendarDays className="h-2.5 w-2.5" /> Vinculado à agenda</Badge>}
            {card.labels.slice(0, 4).map((label) => <Badge key={label} variant="secondary" className="h-4 max-w-full truncate px-1 text-[8px]">{label}</Badge>)}
            {card.labels.length > 4 && <Badge variant="secondary" className="h-4 px-1 text-[8px]">+{card.labels.length - 4}</Badge>}
          </div>
        )}
        <div className={cn("flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[9px] text-muted-foreground", density === "compact" ? "mt-1" : "mt-2")}>
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
  density: BoardDensity;
  canImport: boolean;
  isSaving: boolean;
  dragHandleProps?: Record<string, unknown>;
  onImport: () => void;
}

function AgendaInboxCard({
  item,
  targetColumn,
  density,
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
      "min-w-0 rounded-lg border bg-background shadow-sm",
      density === "compact" ? "p-2" : "p-2.5",
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
          {density === "comfortable" && (
            <p className="mt-1 line-clamp-2 break-words text-[10px] text-muted-foreground">
              {item.context} · {dateLabel}
            </p>
          )}
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
      <div className={cn("flex min-w-0 flex-wrap gap-1.5", density === "compact" ? "mt-1.5" : "mt-2")}>
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
  const [boardZoom, setBoardZoom] = useState(100);
  const [boardDensity, setBoardDensity] = useState<BoardDensity>("comfortable");
  const [collapsedColumnIds, setCollapsedColumnIds] = useState<Set<string>>(() => new Set());
  const [minimapOpen, setMinimapOpen] = useState(false);
  const [boardScrollLeft, setBoardScrollLeft] = useState(0);
  const [loadedViewPreferenceKey, setLoadedViewPreferenceKey] = useState<string | null>(null);
  const [boardSearch, setBoardSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"all" | MyDayBoardCard["priority"]>("all");
  const [dueFilter, setDueFilter] = useState<BoardDueFilter>("all");
  const [labelFilter, setLabelFilter] = useState("all");
  const [originFilter, setOriginFilter] = useState<BoardOriginFilter>("all");
  const [quickAddColumnId, setQuickAddColumnId] = useState<string | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const lastLinkedSyncRef = useRef<string | null>(null);
  const scrollPersistenceTimerRef = useRef<number | null>(null);
  const boardScrollRef = useRef<HTMLElement | null>(null);
  const boardPanRef = useRef({
    pointerId: null as number | null,
    startX: 0,
    scrollLeft: 0,
  });
  const [isBoardPanning, setIsBoardPanning] = useState(false);
  const canEditBoard = workspace.permissions.canEdit;
  const isSyncingLinkedCards = workspace.isSyncingLinkedCards;
  const syncLinkedCards = workspace.syncLinkedCards;

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
  const availableLabels = useMemo(
    () => [...new Set(cards.flatMap((card) => card.labels))].sort((left, right) => left.localeCompare(right, "pt-BR")),
    [cards],
  );
  const hasActiveFilters = Boolean(
    boardSearch.trim()
    || priorityFilter !== "all"
    || dueFilter !== "all"
    || labelFilter !== "all"
    || originFilter !== "all",
  );
  const activeFilterCount = [
    Boolean(boardSearch.trim()),
    priorityFilter !== "all",
    dueFilter !== "all",
    labelFilter !== "all",
    originFilter !== "all",
  ].filter(Boolean).length;
  const filteredCards = useMemo(() => {
    const query = normalizeSearchText(boardSearch);
    const today = new Date();
    const todayStart = startOfDay(today);

    return cards.filter((card) => {
      if (query) {
        const columnTitle = columns.find((column) => column.id === card.columnId)?.title;
        const searchable = [card.title, card.description, columnTitle, ...card.labels]
          .some((value) => normalizeSearchText(value).includes(query));
        if (!searchable) return false;
      }
      if (priorityFilter !== "all" && card.priority !== priorityFilter) return false;
      if (labelFilter !== "all" && !card.labels.includes(labelFilter)) return false;

      const source = getMyDayBoardInboxSourceKeyFromPath(card.linkedPath);
      if (originFilter === "manual" && source) return false;
      if (originFilter === "agenda" && !source) return false;
      if (originFilter !== "all" && originFilter !== "manual" && originFilter !== "agenda" && source !== originFilter) return false;

      const overdue = Boolean(card.dueAt && isBefore(card.dueAt, todayStart));
      const todayDue = Boolean(card.dueAt && isSameDay(card.dueAt, today));
      if (dueFilter === "overdue" && !overdue) return false;
      if (dueFilter === "today" && !todayDue) return false;
      if (dueFilter === "upcoming" && (!card.dueAt || overdue || todayDue)) return false;
      if (dueFilter === "without-date" && card.dueAt) return false;
      return true;
    });
  }, [boardSearch, cards, columns, dueFilter, labelFilter, originFilter, priorityFilter]);
  const visibleInboxItems = useMemo(
    () => agendaInbox.items.filter((item) => inboxSource === "all" || item.source === inboxSource),
    [agendaInbox.items, inboxSource],
  );
  const inboxSources = useMemo(
    () => [...new Set(agendaInbox.items.map((item) => item.source))],
    [agendaInbox.items],
  );
  const linkedCardUpdates = useMemo(
    () => buildMyDayBoardLinkedCardUpdates(workspace.cards, agendaInbox.sourceItems),
    [agendaInbox.sourceItems, workspace.cards],
  );
  const linkedSyncSignature = useMemo(
    () => linkedCardUpdates
      .map((update) => `${update.id}:${update.title}:${update.priority}:${update.dueAt.toISOString()}`)
      .join("|"),
    [linkedCardUpdates],
  );
  const viewPreferenceKey = board
    ? `${BOARD_VIEW_STORAGE_PREFIX}:${workspace.userId ?? "current"}:${board.id}`
    : null;

  useEffect(() => {
    if (!viewPreferenceKey) {
      setLoadedViewPreferenceKey(null);
      return;
    }

    if (scrollPersistenceTimerRef.current !== null) {
      window.clearTimeout(scrollPersistenceTimerRef.current);
      scrollPersistenceTimerRef.current = null;
    }
    setLoadedViewPreferenceKey(null);
    const preferences = readBoardViewPreferences(viewPreferenceKey);
    setBoardZoom(preferences.zoom);
    setBoardDensity(preferences.density);
    setCollapsedColumnIds(new Set(preferences.collapsedColumnIds));
    setMinimapOpen(preferences.minimapOpen);
    setBoardScrollLeft(preferences.scrollLeft);
    if (boardScrollRef.current) boardScrollRef.current.scrollLeft = preferences.scrollLeft;
    setLoadedViewPreferenceKey(viewPreferenceKey);
  }, [viewPreferenceKey]);

  useEffect(() => {
    if (!viewPreferenceKey || loadedViewPreferenceKey !== viewPreferenceKey) return;
    writeBoardViewPreferences(viewPreferenceKey, {
      zoom: boardZoom,
      scrollLeft: boardScrollLeft,
      density: boardDensity,
      collapsedColumnIds: [...collapsedColumnIds],
      minimapOpen,
    });
  }, [
    boardDensity,
    boardScrollLeft,
    boardZoom,
    collapsedColumnIds,
    loadedViewPreferenceKey,
    minimapOpen,
    viewPreferenceKey,
  ]);

  useEffect(() => () => {
    if (scrollPersistenceTimerRef.current !== null) {
      window.clearTimeout(scrollPersistenceTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (
      !canEditBoard ||
      isSyncingLinkedCards ||
      agendaInbox.isLoading ||
      linkedCardUpdates.length === 0 ||
      lastLinkedSyncRef.current === linkedSyncSignature
    ) return;

    lastLinkedSyncRef.current = linkedSyncSignature;
    void syncLinkedCards(linkedCardUpdates).catch(() => undefined);
  }, [
    agendaInbox.isLoading,
    linkedCardUpdates,
    linkedSyncSignature,
    canEditBoard,
    isSyncingLinkedCards,
    syncLinkedCards,
  ]);

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
    if (labelFilter !== "all" && !availableLabels.includes(labelFilter)) {
      setLabelFilter("all");
    }
  }, [availableLabels, labelFilter]);

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
    setBoardSearch("");
    setPriorityFilter("all");
    setDueFilter("all");
    setLabelFilter("all");
    setOriginFilter("all");
    setQuickAddColumnId(null);
    setQuickAddTitle("");
  };

  const clearBoardFilters = () => {
    setBoardSearch("");
    setPriorityFilter("all");
    setDueFilter("all");
    setLabelFilter("all");
    setOriginFilter("all");
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

  const startBoardPan = (event: PointerEvent<HTMLElement>) => {
    if (event.button > 0 || !boardScrollRef.current) return;
    if (
      event.target instanceof Element
      && event.target.closest("button, a, input, textarea, select, [role='button'], [data-board-pan-ignore='true']")
    ) return;

    event.preventDefault();
    boardPanRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: boardScrollRef.current.scrollLeft,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsBoardPanning(true);
  };

  const moveBoardPan = (event: PointerEvent<HTMLElement>) => {
    const pan = boardPanRef.current;
    if (pan.pointerId !== event.pointerId || !boardScrollRef.current) return;
    event.preventDefault();
    boardScrollRef.current.scrollLeft = pan.scrollLeft - (event.clientX - pan.startX);
  };

  const stopBoardPan = (event: PointerEvent<HTMLElement>) => {
    if (boardPanRef.current.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    boardPanRef.current.pointerId = null;
    setBoardScrollLeft(boardScrollRef.current?.scrollLeft ?? 0);
    setIsBoardPanning(false);
  };

  const navigateBoardWithKeyboard = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    boardScrollRef.current?.scrollBy({
      left: event.key === "ArrowLeft" ? -320 : 320,
      behavior: "smooth",
    });
  };

  const changeBoardZoom = (nextZoom: number) => {
    const normalizedZoom = Math.min(BOARD_ZOOM_MAX, Math.max(BOARD_ZOOM_MIN, nextZoom));
    if (normalizedZoom === boardZoom) return;

    if (boardScrollRef.current) {
      boardScrollRef.current.scrollLeft *= normalizedZoom / boardZoom;
      setBoardScrollLeft(boardScrollRef.current.scrollLeft);
    }
    setBoardZoom(normalizedZoom);
  };

  const fitBoardToViewport = () => {
    const viewportWidth = boardScrollRef.current?.clientWidth ?? 0;
    if (!viewportWidth) {
      changeBoardZoom(100);
      return;
    }

    const allColumnIds = [AGENDA_INBOX_ID, ...columns.map((column) => column.id)];
    const collapsedCount = allColumnIds.filter((id) => collapsedColumnIds.has(id)).length;
    const expandedCount = allColumnIds.length - collapsedCount;
    const estimatedWidth = expandedCount * 320 + collapsedCount * 56 + Math.max(0, allColumnIds.length - 1) * 10;
    const fittedZoom = Math.floor((viewportWidth / Math.max(estimatedWidth, 1)) * 100 / BOARD_ZOOM_STEP) * BOARD_ZOOM_STEP;
    changeBoardZoom(fittedZoom);
  };

  const toggleColumnCollapsed = (columnId: string) => {
    setCollapsedColumnIds((current) => {
      const next = new Set(current);
      if (next.has(columnId)) next.delete(columnId);
      else next.add(columnId);
      return next;
    });
  };

  const captureBoardScroll = () => {
    if (scrollPersistenceTimerRef.current !== null) {
      window.clearTimeout(scrollPersistenceTimerRef.current);
    }
    scrollPersistenceTimerRef.current = window.setTimeout(() => {
      setBoardScrollLeft(boardScrollRef.current?.scrollLeft ?? 0);
    }, 150);
  };

  const scrollToBoardColumn = (columnId: string) => {
    const column = boardScrollRef.current?.querySelector<HTMLElement>(`[data-board-column-id="${columnId}"]`);
    column?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  };

  const submitQuickCard = async (event: FormEvent<HTMLFormElement>, columnId: string) => {
    event.preventDefault();
    const title = quickAddTitle.trim();
    if (!board || !workspace.permissions.canCreate || !title) return;

    await workspace.createCard({
      boardId: board.id,
      columnId,
      title,
      priority: "medium",
      labels: [],
      checklist: [],
    });
    setQuickAddTitle("");
    setQuickAddColumnId(null);
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

    if (hasActiveFilters || !workspace.permissions.canEdit || !result.draggableId.startsWith(CARD_DRAG_PREFIX)) return;
    const cardId = result.draggableId.slice(CARD_DRAG_PREFIX.length);
    const movedCard = cards.find((card) => card.id === cardId);
    if (!movedCard) return;
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
    }).then(() => {
      const destinationTitle = columns.find((column) => column.id === destinationColumnId)?.title ?? "outra coluna";
      toast.success(`Cartão movido para ${destinationTitle}.`, {
        action: {
          label: "Desfazer",
          onClick: () => {
            void workspace.moveCard({
              cardId,
              columnId: movedCard.columnId,
              position: movedCard.position,
            }).then(() => toast.success("Movimentação desfeita."));
          },
        },
      });
    }).catch(() => undefined);
    if (isMobile) setActiveMobileColumnId(destinationColumnId);
  };

  const renderInboxHeader = (collapsible = false) => (
    <>
      <div className={cn(
        "mb-2 flex min-w-0 items-start justify-between gap-2",
        collapsible && "sticky top-0 z-10 -mx-1 -mt-1 rounded-md bg-background/95 px-1 py-1 backdrop-blur",
      )}>
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
        <div className="flex shrink-0 items-center gap-1">
          {agendaInbox.isLoading && <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />}
          {collapsible && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-9 w-9"
              aria-label="Recolher coluna Entrada da agenda"
              onClick={() => toggleColumnCollapsed(AGENDA_INBOX_ID)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
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
      isDragDisabled={!workspace.permissions.canCreate || hasActiveFilters}
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
            density={boardDensity}
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
      isDragDisabled={!workspace.permissions.canEdit || hasActiveFilters}
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
            density={boardDensity}
            onClick={() => openCard(card)}
            dragHandleProps={provided.dragHandleProps as unknown as Record<string, unknown>}
          />
        </div>
      )}
    </Draggable>
  );

  const renderQuickAdd = (columnId: string, columnTitle: string) => {
    if (!workspace.permissions.canCreate) return null;
    if (quickAddColumnId !== columnId) {
      return (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 h-9 w-full justify-start gap-1.5 text-[10px] text-muted-foreground"
          aria-label={`Adicionar cartão rápido em ${columnTitle}`}
          onClick={() => {
            setQuickAddColumnId(columnId);
            setQuickAddTitle("");
          }}
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar cartão
        </Button>
      );
    }

    return (
      <form className="mt-2 space-y-2 rounded-lg border bg-background p-2" onSubmit={(event) => void submitQuickCard(event, columnId)}>
        <Input
          autoFocus
          value={quickAddTitle}
          className="h-9 text-xs"
          maxLength={180}
          placeholder="Título do cartão"
          aria-label={`Título do novo cartão em ${columnTitle}`}
          onChange={(event) => setQuickAddTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setQuickAddColumnId(null);
              setQuickAddTitle("");
            }
          }}
        />
        <div className="flex items-center justify-end gap-1.5">
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-[10px]" onClick={() => { setQuickAddColumnId(null); setQuickAddTitle(""); }}>Cancelar</Button>
          <Button type="submit" size="sm" className="h-8 px-2 text-[10px]" disabled={!quickAddTitle.trim() || workspace.isSaving}>Adicionar</Button>
        </div>
      </form>
    );
  };

  const boardViewportRatio = (boardScrollRef.current?.clientWidth ?? 0)
    / Math.max(boardScrollRef.current?.scrollWidth ?? 1, 1);
  const minimapThumbWidth = Math.max(8, Math.min(100, boardViewportRatio * 100));
  const minimapScrollProgress = Math.max(0, Math.min(
    1,
    boardScrollLeft / Math.max(
      (boardScrollRef.current?.scrollWidth ?? 1) - (boardScrollRef.current?.clientWidth ?? 0),
      1,
    ),
  ));

  if (workspace.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto w-full min-w-0 max-w-[1800px] space-y-3 overflow-x-hidden px-0 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:px-3 md:pb-6" data-testid="my-day-board-page">
      <section className="relative min-w-0 overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-r from-primary/[0.08] via-background to-sky-50 p-2.5 shadow-sm dark:to-sky-950/10 sm:p-3" data-testid="my-day-board-hero">
        <Columns3 className="pointer-events-none absolute -bottom-8 -right-4 h-24 w-24 text-primary/[0.05]" />
        <div className="relative z-10 flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <Button asChild variant="ghost" size="sm" className="-ml-2 h-6 gap-1 px-2 text-[10px]">
              <Link to="/meu-dia"><ArrowLeft className="h-3.5 w-3.5" /> Voltar ao Meu Dia</Link>
            </Button>
            <div className="mt-0.5 flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: board?.color ?? "#e11d48" }} />
              <h1 className="min-w-0 truncate text-lg font-black tracking-tight sm:text-xl">Meu Quadro</h1>
              {board?.isDefault && <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[9px]"><Star className="h-3 w-3" /> Principal</Badge>}
            </div>
            <p className="mt-0.5 max-w-xl break-words text-[10px] leading-tight text-muted-foreground sm:text-[11px]">
              Organize notas e atividades em um Kanban privado. Cartões importados acompanham título, prazo e prioridade da agenda.
            </p>
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center lg:max-w-[42rem] lg:flex-nowrap lg:justify-end">
            {workspace.boards.length > 0 && (
              <Select value={board?.id} onValueChange={selectBoard}>
                <SelectTrigger className="col-span-2 h-10 w-full min-w-0 sm:h-8 sm:w-48" aria-label="Selecionar quadro"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {workspace.boards.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {workspace.permissions.canCreate && (
              <Button type="button" variant="outline" className="h-10 gap-1 px-2.5 text-xs sm:h-8" onClick={() => { setCreatingBoard(true); setSettingsOpen(true); }}><Plus className="h-3.5 w-3.5" /> Novo quadro</Button>
            )}
            {board && workspace.permissions.canEdit && (
              <Button type="button" variant="outline" className="h-10 gap-1 px-2.5 text-xs sm:h-8" onClick={() => { setCreatingBoard(false); setSettingsOpen(true); }}><Settings2 className="h-3.5 w-3.5" /> Configurar</Button>
            )}
            {board && (
              <Button type="button" variant={showArchived ? "secondary" : "outline"} className="h-10 gap-1 px-2.5 text-xs sm:h-8" aria-pressed={showArchived} onClick={() => setShowArchived((current) => !current)}>
                <Archive className="h-3.5 w-3.5" /> Arquivados
                {archivedCards.length > 0 && <Badge variant="secondary" className="h-5 px-1 text-[9px]">{archivedCards.length}</Badge>}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-full sm:h-8 sm:w-8"
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

      {board && !showArchived && columns.length > 0 && (
        <section className="rounded-xl border bg-card/95 p-2 shadow-sm" aria-label="Busca e filtros do quadro" data-testid="my-day-board-filters">
          <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1.5fr)_repeat(4,minmax(8rem,0.75fr))_auto]">
            <div className="relative min-w-0 sm:col-span-2 lg:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={boardSearch}
                className="h-10 pl-9 pr-9 text-xs"
                placeholder="Buscar por título, nota, etiqueta ou coluna"
                aria-label="Buscar cartões no quadro"
                onChange={(event) => setBoardSearch(event.target.value)}
              />
              {boardSearch && (
                <Button type="button" size="icon" variant="ghost" className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2" aria-label="Limpar busca" onClick={() => setBoardSearch("")}><X className="h-3.5 w-3.5" /></Button>
              )}
            </div>

            <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as "all" | MyDayBoardCard["priority"])}>
              <SelectTrigger className="h-10 min-w-0 text-xs" aria-label="Filtrar por prioridade"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as prioridades</SelectItem>
                {Object.entries(MY_DAY_BOARD_PRIORITY_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={dueFilter} onValueChange={(value) => setDueFilter(value as BoardDueFilter)}>
              <SelectTrigger className="h-10 min-w-0 text-xs" aria-label="Filtrar por prazo"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os prazos</SelectItem>
                <SelectItem value="overdue">Atrasados</SelectItem>
                <SelectItem value="today">Vencem hoje</SelectItem>
                <SelectItem value="upcoming">Próximos</SelectItem>
                <SelectItem value="without-date">Sem prazo</SelectItem>
              </SelectContent>
            </Select>

            <Select value={originFilter} onValueChange={(value) => setOriginFilter(value as BoardOriginFilter)}>
              <SelectTrigger className="h-10 min-w-0 text-xs" aria-label="Filtrar por origem"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as origens</SelectItem>
                <SelectItem value="manual">Criados no quadro</SelectItem>
                <SelectItem value="agenda">Toda a agenda</SelectItem>
                <SelectItem value="personal">Agenda pessoal</SelectItem>
                <SelectItem value="cs_cx">Agenda CS/CX</SelectItem>
                <SelectItem value="implementation">Agenda de implantação</SelectItem>
              </SelectContent>
            </Select>

            <Select value={labelFilter} onValueChange={setLabelFilter}>
              <SelectTrigger className="h-10 min-w-0 text-xs" aria-label="Filtrar por etiqueta"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as etiquetas</SelectItem>
                {availableLabels.map((label) => <SelectItem key={label} value={label}>{label}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="flex min-w-0 items-center gap-1.5 sm:col-span-2 lg:col-span-1">
              <Button
                type="button"
                variant={boardDensity === "compact" ? "secondary" : "outline"}
                className="h-10 min-w-0 flex-1 gap-1.5 px-2 text-[10px] lg:flex-none"
                aria-pressed={boardDensity === "compact"}
                onClick={() => setBoardDensity((current) => current === "compact" ? "comfortable" : "compact")}
              >
                <ListFilter className="h-3.5 w-3.5" /> {boardDensity === "compact" ? "Compacto" : "Confortável"}
              </Button>
              {hasActiveFilters && (
                <Button type="button" variant="ghost" className="h-10 shrink-0 gap-1 px-2 text-[10px]" onClick={clearBoardFilters}><X className="h-3.5 w-3.5" /> Limpar</Button>
              )}
            </div>
          </div>
          <div className="mt-2 flex min-w-0 flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
            <span>{filteredCards.length} de {cards.length} cartões visíveis</span>
            {hasActiveFilters && (
              <span className="flex items-center gap-1.5"><Badge variant="secondary" className="h-5 px-1.5 text-[9px]">{activeFilterCount}</Badge> Arraste pausado enquanto houver filtros.</span>
            )}
          </div>
        </section>
      )}

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
                {archivedCards.map((card) => <BoardCard key={card.id} card={card} columns={columns} density={boardDensity} onClick={() => openCard(card)} />)}
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
                const count = filteredCards.filter((card) => card.columnId === column.id).length;
                const totalCount = cards.filter((card) => card.columnId === column.id).length;
                return (
                  <Droppable key={column.id} droppableId={`${MOBILE_TARGET_PREFIX}${column.id}`} isDropDisabled={hasActiveFilters || (!workspace.permissions.canCreate && !workspace.permissions.canEdit)}>
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
                          <span className="flex min-w-0 items-center gap-1.5"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: column.color }} />{column.isCompletion && <CheckSquare2 className="h-3 w-3 shrink-0 text-emerald-600" aria-label="Coluna de conclusão" />}<span className="min-w-0 flex-1 truncate text-[10px] font-bold">{column.title}</span><Badge variant="secondary" className="h-5 px-1 text-[9px]">{hasActiveFilters ? `${count}/${totalCount}` : count}</Badge></span>
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
              const columnCards = filteredCards.filter((card) => card.columnId === column.id);
              return (
                <Droppable key={column.id} droppableId={`${MOBILE_LIST_PREFIX}${column.id}`} isDropDisabled={hasActiveFilters || (!workspace.permissions.canCreate && !workspace.permissions.canEdit)}>
                  {(provided, snapshot) => (
                    <section ref={provided.innerRef} {...provided.droppableProps} className={cn("min-w-0 rounded-xl border bg-muted/10 p-2.5 transition-colors", snapshot.isDraggingOver && "border-primary/40 bg-primary/[0.04]")}>
                      <div className="mb-2 flex items-center justify-between gap-2"><h2 className="flex min-w-0 items-center gap-2 text-sm font-black"><span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: column.color }} />{column.isCompletion && <CheckSquare2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-label="Coluna de conclusão" />}<span className="truncate">{column.title}</span></h2>{workspace.permissions.canCreate && <Button type="button" size="sm" className="h-9 shrink-0 gap-1" onClick={() => openNewCard(column.id)}><Plus className="h-4 w-4" /> Cartão</Button>}</div>
                      <p className="mb-2 text-[9px] text-muted-foreground">Segure o ícone <GripVertical className="inline h-3 w-3" /> para reordenar ou solte sobre outra coluna acima.</p>
                      <div className="min-h-20 space-y-2">
                        {columnCards.map(renderBoardDraggable)}
                        {provided.placeholder}
                        {columnCards.length === 0 && <p className="rounded-lg border border-dashed py-8 text-center text-xs text-muted-foreground">{hasActiveFilters ? "Nenhum cartão corresponde aos filtros." : "Solte um cartão aqui."}</p>}
                      </div>
                      {renderQuickAdd(column.id, column.title)}
                    </section>
                  )}
                </Droppable>
              );
            })}
          </section>
        </DragDropContext>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="relative min-w-0">
            <section
              ref={boardScrollRef}
              className={cn(
                "-mx-1 flex min-h-[24rem] min-w-0 touch-pan-y select-none items-start overflow-x-auto overscroll-x-contain rounded-xl bg-[linear-gradient(to_right,#64748b1a_1px,transparent_1px),linear-gradient(to_bottom,#64748b1a_1px,transparent_1px)] bg-[size:24px_24px] px-1 pb-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring lg:min-h-[calc(100dvh-17rem)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                isBoardPanning ? "cursor-grabbing" : "cursor-grab",
              )}
              aria-label="Quadro Kanban. Segure e arraste qualquer área livre para navegar horizontalmente."
              data-testid="my-day-board-desktop"
              tabIndex={0}
              onPointerDown={startBoardPan}
              onPointerMove={moveBoardPan}
              onPointerUp={stopBoardPan}
              onPointerCancel={stopBoardPan}
              onLostPointerCapture={stopBoardPan}
              onKeyDown={navigateBoardWithKeyboard}
              onScroll={captureBoardScroll}
            >
              <div
                className="flex min-w-max origin-top-left items-start gap-2.5"
                data-testid="my-day-board-zoom-layer"
                style={{ zoom: boardZoom / 100 }}
              >
                <Droppable droppableId={AGENDA_INBOX_ID} isDropDisabled>
                  {(provided) => collapsedColumnIds.has(AGENDA_INBOX_ID) ? (
                    <section
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      data-board-column-id={AGENDA_INBOX_ID}
                      className="flex min-h-72 w-14 shrink-0 flex-col items-center rounded-xl border border-primary/20 bg-primary/[0.025] p-1.5"
                    >
                      <Button type="button" size="icon" variant="ghost" className="h-10 w-10" aria-label="Expandir coluna Entrada da agenda" onClick={() => toggleColumnCollapsed(AGENDA_INBOX_ID)}><ChevronRight className="h-4 w-4" /></Button>
                      <Inbox className="mt-2 h-4 w-4 text-primary" />
                      <span className="my-2 text-[10px] font-black [writing-mode:vertical-rl] rotate-180">Entrada da agenda</span>
                      <Badge variant="secondary" className="h-5 px-1.5 text-[9px]">{visibleInboxItems.length}</Badge>
                      {provided.placeholder}
                    </section>
                  ) : (
                    <section
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      data-board-column-id={AGENDA_INBOX_ID}
                      className="w-[min(86vw,19rem)] shrink-0 rounded-xl border border-primary/20 bg-primary/[0.025] p-2.5 sm:w-80"
                    >
                      {renderInboxHeader(true)}
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
                  const columnCards = filteredCards.filter((card) => card.columnId === column.id);
                  const totalCount = cards.filter((card) => card.columnId === column.id).length;
                  const collapsed = collapsedColumnIds.has(column.id);
                  return (
                    <Droppable key={column.id} droppableId={`${DESKTOP_COLUMN_PREFIX}${column.id}`} isDropDisabled={hasActiveFilters || (!workspace.permissions.canCreate && !workspace.permissions.canEdit)}>
                      {(provided, snapshot) => collapsed ? (
                        <section
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          data-board-column-id={column.id}
                          className={cn("flex min-h-72 w-14 shrink-0 flex-col items-center rounded-xl border bg-muted/10 p-1.5 transition-colors", snapshot.isDraggingOver && "border-primary/40 bg-primary/[0.04]")}
                        >
                          <Button type="button" size="icon" variant="ghost" className="h-10 w-10" aria-label={`Expandir coluna ${column.title}`} onClick={() => toggleColumnCollapsed(column.id)}><ChevronRight className="h-4 w-4" /></Button>
                          <span className="mt-2 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: column.color }} />
                          <span className="my-2 max-h-44 truncate text-[10px] font-black [writing-mode:vertical-rl] rotate-180">{column.title}</span>
                          <Badge variant="secondary" className="h-5 px-1.5 text-[9px]">{hasActiveFilters ? `${columnCards.length}/${totalCount}` : totalCount}</Badge>
                          {provided.placeholder}
                        </section>
                      ) : (
                        <section
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          data-board-column-id={column.id}
                          className={cn("w-[min(86vw,19rem)] shrink-0 rounded-xl border bg-muted/10 p-2.5 transition-colors sm:w-80", snapshot.isDraggingOver && "border-primary/40 bg-primary/[0.04]")}
                        >
                          <div className="sticky top-0 z-10 -mx-1 -mt-1 mb-2 flex min-w-0 items-center justify-between gap-1 rounded-md bg-background/95 px-1 py-1 backdrop-blur">
                            <h2 className="flex min-w-0 items-center gap-2 text-sm font-black"><span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: column.color }} />{column.isCompletion && <CheckSquare2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-label="Coluna de conclusão" />}<span className="truncate">{column.title}</span><Badge variant="secondary" className="h-5 px-1.5 text-[9px]">{hasActiveFilters ? `${columnCards.length}/${totalCount}` : totalCount}</Badge></h2>
                            <div className="flex shrink-0 items-center gap-0.5">
                              {workspace.permissions.canCreate && <Button type="button" size="icon" variant="ghost" className="h-9 w-9" aria-label={`Adicionar cartão em ${column.title}`} onClick={() => openNewCard(column.id)}><Plus className="h-4 w-4" /></Button>}
                              <Button type="button" size="icon" variant="ghost" className="h-9 w-9" aria-label={`Recolher coluna ${column.title}`} onClick={() => toggleColumnCollapsed(column.id)}><ChevronLeft className="h-4 w-4" /></Button>
                            </div>
                          </div>
                          <div className="min-h-20 space-y-2">
                            {columnCards.map(renderBoardDraggable)}
                            {provided.placeholder}
                            {columnCards.length === 0 && <p className="rounded-lg border border-dashed py-8 text-center text-xs text-muted-foreground">{hasActiveFilters ? "Nenhum cartão corresponde aos filtros." : "Solte um cartão aqui."}</p>}
                          </div>
                          {renderQuickAdd(column.id, column.title)}
                        </section>
                      )}
                    </Droppable>
                  );
                })}
              </div>
            </section>

            {minimapOpen && (
              <aside
                className="absolute bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-3 z-20 w-[min(24rem,calc(100%-1.5rem))] rounded-xl border bg-background/95 p-2 shadow-xl backdrop-blur"
                aria-label="Minimapa do quadro"
                data-testid="my-day-board-minimap"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold">Visão do quadro</span>
                  <span className="text-[9px] text-muted-foreground">Clique para navegar</span>
                </div>
                <div className="flex min-w-0 gap-1 overflow-hidden rounded-lg bg-muted/50 p-1">
                  <button type="button" className="flex h-14 min-w-0 flex-1 flex-col justify-between rounded border border-primary/20 bg-primary/[0.05] p-1 text-left" title="Entrada da agenda" onClick={() => scrollToBoardColumn(AGENDA_INBOX_ID)}><Inbox className="h-3 w-3 text-primary" /><span className="w-full truncate text-[8px] font-semibold">Agenda</span><span className="text-[8px] text-muted-foreground">{visibleInboxItems.length}</span></button>
                  {columns.map((column) => {
                    const count = filteredCards.filter((card) => card.columnId === column.id).length;
                    return <button key={column.id} type="button" className="flex h-14 min-w-0 flex-1 flex-col justify-between rounded border bg-background p-1 text-left hover:border-primary/40" title={column.title} onClick={() => scrollToBoardColumn(column.id)}><span className="h-2 w-2 rounded-full" style={{ backgroundColor: column.color }} /><span className="w-full truncate text-[8px] font-semibold">{column.title}</span><span className="text-[8px] text-muted-foreground">{count}</span></button>;
                  })}
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                  <span className="block h-full rounded-full bg-primary/40 transition-[width,margin]" style={{ width: `${minimapThumbWidth}%`, marginLeft: `${minimapScrollProgress * (100 - minimapThumbWidth)}%` }} />
                </div>
              </aside>
            )}

            <div
              className="absolute bottom-[calc(0.75rem+env(safe-area-inset-bottom))] right-3 z-20 flex items-center rounded-lg border bg-background/95 p-1 shadow-lg backdrop-blur"
              role="group"
              aria-label="Controles de visualização do quadro"
              data-testid="my-day-board-zoom-controls"
            >
              <Button type="button" variant={minimapOpen ? "secondary" : "ghost"} size="icon" className="h-10 w-10" aria-label={minimapOpen ? "Ocultar minimapa do quadro" : "Mostrar minimapa do quadro"} aria-pressed={minimapOpen} onClick={() => setMinimapOpen((current) => !current)}><Map className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className="h-10 w-10" aria-label="Ajustar quadro à tela" onClick={fitBoardToViewport}><Maximize2 className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className="h-10 w-10" aria-label="Diminuir zoom do quadro" disabled={boardZoom === BOARD_ZOOM_MIN} onClick={() => changeBoardZoom(boardZoom - BOARD_ZOOM_STEP)}><ZoomOut className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="sm" className="h-10 min-w-14 px-2 text-xs font-bold tabular-nums" aria-label={`Restaurar zoom para 100%. Zoom atual: ${boardZoom}%`} onClick={() => changeBoardZoom(100)}><span aria-live="polite">{boardZoom}%</span></Button>
              <Button type="button" variant="ghost" size="icon" className="h-10 w-10" aria-label="Aumentar zoom do quadro" disabled={boardZoom === BOARD_ZOOM_MAX} onClick={() => changeBoardZoom(boardZoom + BOARD_ZOOM_STEP)}><ZoomIn className="h-4 w-4" /></Button>
            </div>
          </div>
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
