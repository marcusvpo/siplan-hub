import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import {
  calculateBoardPosition,
  type MyDayBoard,
  type MyDayBoardCard,
  type MyDayBoardCardInput,
  type MyDayBoardChecklistItem,
  type MyDayBoardColumn,
  type MyDayBoardLinkedCardUpdate,
} from "@/lib/my-day-board";

const db = supabase as unknown as SupabaseClient;

interface RawBoard {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_default: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

interface RawColumn {
  id: string;
  board_id: string;
  title: string;
  color: string;
  is_completion: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

interface RawCard {
  id: string;
  board_id: string;
  column_id: string;
  title: string;
  description: string | null;
  priority: MyDayBoardCard["priority"];
  due_at: string | null;
  labels: string[] | null;
  checklist: unknown;
  linked_path: string | null;
  position: number;
  archived_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const BOARD_SELECT =
  "id, name, description, color, is_default, position, created_at, updated_at";
const COLUMN_SELECT =
  "id, board_id, title, color, is_completion, position, created_at, updated_at";
const CARD_SELECT =
  "id, board_id, column_id, title, description, priority, due_at, labels, checklist, linked_path, position, archived_at, completed_at, created_at, updated_at";

function mapBoard(board: RawBoard): MyDayBoard {
  return {
    id: board.id,
    name: board.name,
    description: board.description,
    color: board.color,
    isDefault: board.is_default,
    position: Number(board.position),
    createdAt: new Date(board.created_at),
    updatedAt: new Date(board.updated_at),
  };
}

function mapColumn(column: RawColumn): MyDayBoardColumn {
  return {
    id: column.id,
    boardId: column.board_id,
    title: column.title,
    color: column.color,
    isCompletion: column.is_completion,
    position: Number(column.position),
    createdAt: new Date(column.created_at),
    updatedAt: new Date(column.updated_at),
  };
}

function parseChecklist(value: unknown): MyDayBoardChecklistItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Record<string, unknown>;
    if (typeof candidate.id !== "string" || typeof candidate.text !== "string") {
      return [];
    }
    return [{
      id: candidate.id,
      text: candidate.text,
      done: candidate.done === true,
    }];
  });
}

function mapCard(card: RawCard): MyDayBoardCard {
  return {
    id: card.id,
    boardId: card.board_id,
    columnId: card.column_id,
    title: card.title,
    description: card.description,
    priority: card.priority,
    dueAt: card.due_at ? new Date(card.due_at) : null,
    labels: card.labels ?? [],
    checklist: parseChecklist(card.checklist),
    linkedPath: card.linked_path,
    position: Number(card.position),
    archivedAt: card.archived_at ? new Date(card.archived_at) : null,
    completedAt: card.completed_at ? new Date(card.completed_at) : null,
    createdAt: new Date(card.created_at),
    updatedAt: new Date(card.updated_at),
  };
}

export function useMyDayBoard() {
  const { user } = useAuth();
  const { hasPermission, isAdmin } = usePermissions();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const canView = isAdmin || hasPermission("work_board", "view");
  const canCreate = isAdmin || hasPermission("work_board", "create");
  const canEdit = isAdmin || hasPermission("work_board", "edit");
  const canDelete = isAdmin || hasPermission("work_board", "delete");

  const boardsQuery = useQuery({
    queryKey: ["my-day", "boards", userId],
    enabled: Boolean(userId && canView),
    queryFn: async () => {
      const { data, error } = await db
        .from("my_day_boards")
        .select(BOARD_SELECT)
        .eq("user_id", userId as string)
        .order("position", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as RawBoard[]).map(mapBoard);
    },
    staleTime: 30_000,
  });

  const columnsQuery = useQuery({
    queryKey: ["my-day", "board-columns", userId],
    enabled: Boolean(userId && canView),
    queryFn: async () => {
      const { data, error } = await db
        .from("my_day_board_columns")
        .select(COLUMN_SELECT)
        .eq("user_id", userId as string)
        .order("position", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as RawColumn[]).map(mapColumn);
    },
    staleTime: 30_000,
  });

  const cardsQuery = useQuery({
    queryKey: ["my-day", "board-cards", userId],
    enabled: Boolean(userId && canView),
    queryFn: async () => {
      const { data, error } = await db
        .from("my_day_board_cards")
        .select(CARD_SELECT)
        .eq("user_id", userId as string)
        .order("position", { ascending: true })
        .limit(500);
      if (error) throw error;
      return ((data ?? []) as RawCard[]).map(mapCard);
    },
    staleTime: 20_000,
    refetchOnWindowFocus: true,
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["my-day", "boards", userId] }),
      queryClient.invalidateQueries({ queryKey: ["my-day", "board-columns", userId] }),
      queryClient.invalidateQueries({ queryKey: ["my-day", "board-cards", userId] }),
    ]);
  };

  const createBoardMutation = useMutation({
    mutationFn: async (input: { name: string; description?: string | null; color: string }) => {
      if (!userId || !canCreate) throw new Error("Sem permissão para criar quadros.");
      const { data, error } = await db.rpc("create_my_day_board", {
        p_name: input.name.trim(),
        p_description: input.description?.trim() || null,
        p_color: input.color,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      void invalidate();
      toast.success("Quadro criado com as colunas iniciais.");
    },
    onError: () => toast.error("Não foi possível criar o quadro."),
  });

  const updateBoardMutation = useMutation({
    mutationFn: async ({ id, ...input }: { id: string; name: string; description?: string | null; color: string }) => {
      if (!userId || !canEdit) throw new Error("Sem permissão para editar quadros.");
      const { error } = await db
        .from("my_day_boards")
        .update({
          name: input.name.trim(),
          description: input.description?.trim() || null,
          color: input.color,
        })
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      void invalidate();
      toast.success("Quadro atualizado.");
    },
    onError: () => toast.error("Não foi possível atualizar o quadro."),
  });

  const setDefaultBoardMutation = useMutation({
    mutationFn: async (boardId: string) => {
      if (!userId || !canEdit) throw new Error("Sem permissão para editar quadros.");
      const { error } = await db.rpc("set_default_my_day_board", {
        p_board_id: boardId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void invalidate();
      toast.success("Quadro principal atualizado.");
    },
    onError: () => toast.error("Não foi possível definir o quadro principal."),
  });

  const deleteBoardMutation = useMutation({
    mutationFn: async (boardId: string) => {
      if (!userId || !canDelete) throw new Error("Sem permissão para excluir quadros.");
      const { error } = await db
        .from("my_day_boards")
        .delete()
        .eq("id", boardId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      void invalidate();
      toast.success("Quadro excluído.");
    },
    onError: () => toast.error("Não foi possível excluir o quadro."),
  });

  const createColumnMutation = useMutation({
    mutationFn: async (input: { boardId: string; title: string; color: string; isCompletion: boolean }) => {
      if (!userId || !canCreate) throw new Error("Sem permissão para criar colunas.");
      const boardColumns = (columnsQuery.data ?? []).filter((column) => column.boardId === input.boardId);
      const lastPosition = boardColumns.at(-1)?.position ?? 0;
      const { error } = await db.from("my_day_board_columns").insert({
        board_id: input.boardId,
        user_id: userId,
        title: input.title.trim(),
        color: input.color,
        is_completion: input.isCompletion,
        position: lastPosition + 1024,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void invalidate();
      toast.success("Coluna adicionada.");
    },
    onError: () => toast.error("Não foi possível adicionar a coluna."),
  });

  const updateColumnMutation = useMutation({
    mutationFn: async ({ id, ...input }: { id: string; title: string; color: string; isCompletion: boolean }) => {
      if (!userId || !canEdit) throw new Error("Sem permissão para editar colunas.");
      const { error } = await db.rpc("update_my_day_board_column", {
        p_column_id: id,
        p_title: input.title.trim(),
        p_color: input.color,
        p_is_completion: input.isCompletion,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void invalidate();
      toast.success("Coluna atualizada.");
    },
    onError: () => toast.error("Não foi possível atualizar a coluna."),
  });

  const reorderColumnsMutation = useMutation({
    mutationFn: async (orderedColumnIds: string[]) => {
      if (!userId || !canEdit) throw new Error("Sem permissão para organizar colunas.");
      const boardId = (columnsQuery.data ?? [])
        .find((column) => column.id === orderedColumnIds[0])?.boardId;
      if (!boardId) throw new Error("Quadro não encontrado para reordenar as colunas.");
      const { error } = await db.rpc("reorder_my_day_board_columns", {
        p_board_id: boardId,
        p_column_ids: orderedColumnIds,
      });
      if (error) throw error;
    },
    onSuccess: () => void invalidate(),
    onError: () => toast.error("Não foi possível reordenar as colunas."),
  });

  const deleteColumnMutation = useMutation({
    mutationFn: async (columnId: string) => {
      if (!userId || !canDelete) throw new Error("Sem permissão para excluir colunas.");
      const { error } = await db
        .from("my_day_board_columns")
        .delete()
        .eq("id", columnId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      void invalidate();
      toast.success("Coluna excluída.");
    },
    onError: () => toast.error("Mova os cartões antes de excluir esta coluna."),
  });

  const createCardMutation = useMutation({
    mutationFn: async (input: MyDayBoardCardInput) => {
      if (!userId || !canCreate) throw new Error("Sem permissão para criar cartões.");
      const columnCards = (cardsQuery.data ?? []).filter((card) => card.columnId === input.columnId && !card.archivedAt);
      const lastPosition = columnCards.at(-1)?.position ?? 0;
      const { data, error } = await db
        .from("my_day_board_cards")
        .insert({
          board_id: input.boardId,
          column_id: input.columnId,
          user_id: userId,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          priority: input.priority,
          due_at: input.dueAt?.toISOString() ?? null,
          labels: input.labels ?? [],
          checklist: input.checklist ?? [],
          linked_path: input.linkedPath?.trim() || null,
          position: lastPosition + 1024,
        })
        .select(CARD_SELECT)
        .single();
      if (error) throw error;
      return mapCard(data as RawCard);
    },
    onSuccess: () => {
      void invalidate();
      toast.success("Cartão criado.");
    },
    onError: () => toast.error("Não foi possível criar o cartão."),
  });

  const updateCardMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: MyDayBoardCardInput }) => {
      if (!userId || !canEdit) throw new Error("Sem permissão para editar cartões.");
      const targetColumn = (columnsQuery.data ?? []).find((column) => column.id === input.columnId);
      const completed = Boolean(targetColumn?.isCompletion);
      const { data, error } = await db
        .from("my_day_board_cards")
        .update({
          board_id: input.boardId,
          column_id: input.columnId,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          priority: input.priority,
          due_at: input.dueAt?.toISOString() ?? null,
          labels: input.labels ?? [],
          checklist: input.checklist ?? [],
          linked_path: input.linkedPath?.trim() || null,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq("id", id)
        .eq("user_id", userId)
        .select(CARD_SELECT)
        .single();
      if (error) throw error;
      return mapCard(data as RawCard);
    },
    onSuccess: () => {
      void invalidate();
      toast.success("Cartão atualizado.");
    },
    onError: () => toast.error("Não foi possível atualizar o cartão."),
  });

  const moveCardMutation = useMutation({
    mutationFn: async (input: { cardId: string; columnId: string; position: number }) => {
      if (!userId || !canEdit) throw new Error("Sem permissão para mover cartões.");
      const targetColumn = (columnsQuery.data ?? []).find((column) => column.id === input.columnId);
      const completed = Boolean(targetColumn?.isCompletion);
      const { error } = await db
        .from("my_day_board_cards")
        .update({
          column_id: input.columnId,
          position: input.position,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq("id", input.cardId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => void invalidate(),
    onError: () => toast.error("Não foi possível mover o cartão."),
  });

  const syncLinkedCardsMutation = useMutation({
    mutationFn: async (updates: MyDayBoardLinkedCardUpdate[]) => {
      if (!userId || !canEdit || updates.length === 0) return;
      const { error } = await db.rpc("sync_my_day_board_cards", {
        p_updates: updates.map((update) => ({
          id: update.id,
          title: update.title,
          priority: update.priority,
          due_at: update.dueAt.toISOString(),
        })),
      });
      if (error) throw error;
    },
    onSuccess: (_, updates) => {
      if (updates.length > 0) {
        void queryClient.invalidateQueries({ queryKey: ["my-day", "board-cards", userId] });
      }
    },
    onError: () => toast.error("Não foi possível sincronizar os cartões vinculados à agenda."),
  });

  const archiveCardMutation = useMutation({
    mutationFn: async ({ cardId, archived }: { cardId: string; archived: boolean }) => {
      if (!userId || !canEdit) throw new Error("Sem permissão para arquivar cartões.");
      const { error } = await db
        .from("my_day_board_cards")
        .update({ archived_at: archived ? new Date().toISOString() : null })
        .eq("id", cardId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      void invalidate();
      toast.success(variables.archived ? "Cartão arquivado." : "Cartão restaurado.");
    },
    onError: () => toast.error("Não foi possível arquivar o cartão."),
  });

  const deleteCardMutation = useMutation({
    mutationFn: async (cardId: string) => {
      if (!userId || !canDelete) throw new Error("Sem permissão para excluir cartões.");
      const { error } = await db
        .from("my_day_board_cards")
        .delete()
        .eq("id", cardId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      void invalidate();
      toast.success("Cartão excluído.");
    },
    onError: () => toast.error("Não foi possível excluir o cartão."),
  });

  const cards = cardsQuery.data ?? [];

  return {
    userId,
    boards: boardsQuery.data ?? [],
    columns: columnsQuery.data ?? [],
    cards,
    permissions: { canView, canCreate, canEdit, canDelete },
    createBoard: createBoardMutation.mutateAsync,
    updateBoard: (id: string, input: { name: string; description?: string | null; color: string }) =>
      updateBoardMutation.mutateAsync({ id, ...input }),
    setDefaultBoard: setDefaultBoardMutation.mutateAsync,
    deleteBoard: deleteBoardMutation.mutateAsync,
    createColumn: createColumnMutation.mutateAsync,
    updateColumn: (id: string, input: { title: string; color: string; isCompletion: boolean }) =>
      updateColumnMutation.mutateAsync({ id, ...input }),
    reorderColumns: reorderColumnsMutation.mutateAsync,
    deleteColumn: deleteColumnMutation.mutateAsync,
    createCard: createCardMutation.mutateAsync,
    updateCard: (id: string, input: MyDayBoardCardInput) =>
      updateCardMutation.mutateAsync({ id, input }),
    moveCard: moveCardMutation.mutateAsync,
    syncLinkedCards: syncLinkedCardsMutation.mutateAsync,
    archiveCard: (cardId: string) => archiveCardMutation.mutateAsync({ cardId, archived: true }),
    restoreCard: (cardId: string) => archiveCardMutation.mutateAsync({ cardId, archived: false }),
    deleteCard: deleteCardMutation.mutateAsync,
    calculateCardPosition: (columnId: string, destinationIndex: number, movingCardId?: string) => {
      const ordered = cards
        .filter((card) => card.columnId === columnId && card.id !== movingCardId && !card.archivedAt)
        .sort((left, right) => left.position - right.position);
      const previous = ordered[destinationIndex - 1]?.position;
      const next = ordered[destinationIndex]?.position;
      return calculateBoardPosition(previous, next);
    },
    isLoading: boardsQuery.isLoading || columnsQuery.isLoading || cardsQuery.isLoading,
    isRefreshing: boardsQuery.isFetching || columnsQuery.isFetching || cardsQuery.isFetching,
    isSaving:
      createBoardMutation.isPending ||
      updateBoardMutation.isPending ||
      setDefaultBoardMutation.isPending ||
      deleteBoardMutation.isPending ||
      createColumnMutation.isPending ||
      updateColumnMutation.isPending ||
      reorderColumnsMutation.isPending ||
      deleteColumnMutation.isPending ||
      createCardMutation.isPending ||
      updateCardMutation.isPending ||
      moveCardMutation.isPending ||
      syncLinkedCardsMutation.isPending ||
      archiveCardMutation.isPending ||
      deleteCardMutation.isPending,
    isSyncingLinkedCards: syncLinkedCardsMutation.isPending,
    error: boardsQuery.error ?? columnsQuery.error ?? cardsQuery.error,
    refresh: async () => {
      await Promise.all([
        boardsQuery.refetch(),
        columnsQuery.refetch(),
        cardsQuery.refetch(),
      ]);
    },
  };
}
