import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_MY_DAY_PREFERENCES,
  normalizeMyDayPreferences,
  type MyDayPreferences,
  type MyDayTask,
  type MyDayTaskInput,
  type MyDayTaskRecurrence,
  type MyDayTaskStatus,
} from "@/lib/my-day-workspace";

const db = supabase as unknown as SupabaseClient;

interface RawTask {
  id: string;
  title: string;
  description: string | null;
  due_at: string;
  priority: MyDayTask["priority"];
  status: MyDayTaskStatus;
  linked_path: string | null;
  recurrence: MyDayTaskRecurrence;
  reminder_minutes: number | null;
  snoozed_until: string | null;
  recurrence_parent_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface RawPreferences {
  density: string;
  widget_order: string[];
  hidden_widgets: string[];
  widget_layout: Record<string, string> | null;
  quick_links: string[] | null;
  notifications_enabled: boolean;
}

const TASK_SELECT =
  "id, title, description, due_at, priority, status, linked_path, recurrence, reminder_minutes, snoozed_until, recurrence_parent_id, completed_at, created_at, updated_at";

function mapTask(task: RawTask): MyDayTask {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    dueAt: new Date(task.due_at),
    priority: task.priority,
    status: task.status,
    linkedPath: task.linked_path,
    recurrence: task.recurrence,
    reminderMinutes: task.reminder_minutes,
    snoozedUntil: task.snoozed_until ? new Date(task.snoozed_until) : null,
    recurrenceParentId: task.recurrence_parent_id,
    completedAt: task.completed_at ? new Date(task.completed_at) : null,
    createdAt: new Date(task.created_at),
    updatedAt: new Date(task.updated_at),
  };
}

export function useMyDayWorkspace() {
  const { user } = useAuth();
  const { hasPermission, isAdmin } = usePermissions();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const canView = isAdmin || hasPermission("work_center", "view");
  const canCreateTask = isAdmin || hasPermission("work_center", "create");
  const canEditTask = isAdmin || hasPermission("work_center", "edit");
  const canDeleteTask = isAdmin || hasPermission("work_center", "delete");

  const tasksQuery = useQuery({
    queryKey: ["my-day", "tasks", userId],
    enabled: Boolean(userId && canView),
    queryFn: async () => {
      const { data, error } = await db
        .from("my_day_tasks")
        .select(TASK_SELECT)
        .eq("user_id", userId as string)
        .order("status", { ascending: false })
        .order("due_at", { ascending: true })
        .limit(100);

      if (error) throw error;
      return ((data ?? []) as RawTask[]).map(mapTask);
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const preferencesQuery = useQuery({
    queryKey: ["my-day", "preferences", userId],
    enabled: Boolean(userId && canView),
    queryFn: async () => {
      const { data, error } = await db
        .from("my_day_preferences")
        .select("density, widget_order, hidden_widgets, widget_layout, quick_links, notifications_enabled")
        .eq("user_id", userId as string)
        .maybeSingle();

      if (error) throw error;
      if (!data) return DEFAULT_MY_DAY_PREFERENCES;

      const preferences = data as RawPreferences;
      return normalizeMyDayPreferences({
        density: preferences.density,
        widgetOrder: preferences.widget_order,
        hiddenWidgets: preferences.hidden_widgets,
        widgetLayout: preferences.widget_layout,
        quickLinks: preferences.quick_links,
        notificationsEnabled: preferences.notifications_enabled,
      });
    },
    staleTime: 60_000,
  });

  const createTaskMutation = useMutation({
    mutationFn: async (input: MyDayTaskInput) => {
      if (!userId || !canCreateTask) throw new Error("Sem permissão para criar tarefas.");

      const { data, error } = await db
        .from("my_day_tasks")
        .insert({
          user_id: userId,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          due_at: input.dueAt.toISOString(),
          priority: input.priority,
          linked_path: input.linkedPath || null,
          recurrence: input.recurrence,
          reminder_minutes: input.reminderMinutes ?? null,
        })
        .select(TASK_SELECT)
        .single();

      if (error) throw error;
      return mapTask(data as RawTask);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-day", "tasks", userId] });
      toast.success("Tarefa adicionada à sua agenda.");
    },
    onError: () => toast.error("Não foi possível adicionar a tarefa."),
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: MyDayTaskInput }) => {
      if (!userId || !canEditTask) throw new Error("Sem permissão para editar tarefas.");

      const { data, error } = await db
        .from("my_day_tasks")
        .update({
          title: input.title.trim(),
          description: input.description?.trim() || null,
          due_at: input.dueAt.toISOString(),
          priority: input.priority,
          linked_path: input.linkedPath || null,
          recurrence: input.recurrence,
          reminder_minutes: input.reminderMinutes ?? null,
          snoozed_until: null,
        })
        .eq("id", id)
        .eq("user_id", userId)
        .select(TASK_SELECT)
        .single();

      if (error) throw error;
      return mapTask(data as RawTask);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-day", "tasks", userId] });
      toast.success("Tarefa atualizada.");
    },
    onError: () => toast.error("Não foi possível atualizar a tarefa."),
  });

  const setTaskStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: MyDayTaskStatus }) => {
      if (!userId || !canEditTask) throw new Error("Sem permissão para editar tarefas.");
      const task = tasksQuery.data?.find((item) => item.id === id);
      if (
        status === "completed" &&
        task?.recurrence !== undefined &&
        task.recurrence !== "none" &&
        !canCreateTask
      ) {
        throw new Error("Para concluir uma tarefa recorrente, seu perfil também precisa da permissão de criar tarefas.");
      }

      const result = status === "completed"
        ? await db.rpc("complete_my_day_task", { p_task_id: id })
        : await db
            .from("my_day_tasks")
            .update({ status, completed_at: null, snoozed_until: null })
            .eq("id", id)
            .eq("user_id", userId);

      if (result.error) throw result.error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-day", "tasks", userId] });
    },
    onError: (error) => toast.error(
      error instanceof Error
        ? error.message
        : "Não foi possível alterar o status da tarefa.",
    ),
  });

  const snoozeTaskMutation = useMutation({
    mutationFn: async ({ id, until }: { id: string; until: Date }) => {
      if (!userId || !canEditTask) throw new Error("Sem permissão para adiar tarefas.");

      const { error } = await db
        .from("my_day_tasks")
        .update({ snoozed_until: until.toISOString() })
        .eq("id", id)
        .eq("user_id", userId)
        .eq("status", "pending");

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-day", "tasks", userId] });
      toast.success("Tarefa adiada por uma hora.");
    },
    onError: () => toast.error("Não foi possível adiar a tarefa."),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId || !canDeleteTask) throw new Error("Sem permissão para excluir tarefas.");

      const { error } = await db
        .from("my_day_tasks")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-day", "tasks", userId] });
      toast.success("Tarefa removida da agenda.");
    },
    onError: () => toast.error("Não foi possível remover a tarefa."),
  });

  const savePreferencesMutation = useMutation({
    mutationFn: async (preferences: MyDayPreferences) => {
      if (!userId || !canEditTask) {
        throw new Error("Sem permissão para personalizar o Meu Dia.");
      }

      const normalized = normalizeMyDayPreferences(preferences);
      const { error } = await db.from("my_day_preferences").upsert(
        {
          user_id: userId,
          density: normalized.density,
          widget_order: normalized.widgetOrder,
          hidden_widgets: normalized.hiddenWidgets,
          widget_layout: normalized.widgetLayout,
          quick_links: normalized.quickLinks,
          notifications_enabled: normalized.notificationsEnabled,
        },
        { onConflict: "user_id" },
      );

      if (error) throw error;
      return normalized;
    },
    onSuccess: (preferences) => {
      queryClient.setQueryData(["my-day", "preferences", userId], preferences);
      toast.success("Seu Meu Dia foi personalizado.");
    },
    onError: () => toast.error("Não foi possível salvar a personalização."),
  });

  return {
    tasks: tasksQuery.data ?? [],
    preferences: preferencesQuery.data ?? DEFAULT_MY_DAY_PREFERENCES,
    permissions: {
      canCreateTask,
      canEditTask,
      canDeleteTask,
      canPersonalize: canEditTask,
    },
    createTask: createTaskMutation.mutateAsync,
    updateTask: (id: string, input: MyDayTaskInput) =>
      updateTaskMutation.mutateAsync({ id, input }),
    setTaskStatus: (id: string, status: MyDayTaskStatus) =>
      setTaskStatusMutation.mutateAsync({ id, status }),
    snoozeTask: (id: string, until: Date) =>
      snoozeTaskMutation.mutateAsync({ id, until }),
    deleteTask: deleteTaskMutation.mutateAsync,
    savePreferences: savePreferencesMutation.mutateAsync,
    isLoading: preferencesQuery.isLoading,
    loading: {
      tasks: tasksQuery.isLoading,
      preferences: preferencesQuery.isLoading,
    },
    isSavingTask:
      createTaskMutation.isPending ||
      updateTaskMutation.isPending ||
      setTaskStatusMutation.isPending ||
      snoozeTaskMutation.isPending ||
      deleteTaskMutation.isPending,
    isSavingPreferences: savePreferencesMutation.isPending,
    error: tasksQuery.error ?? preferencesQuery.error,
    errors: {
      tasks: tasksQuery.error,
      preferences: preferencesQuery.error,
    },
    isRefreshing: tasksQuery.isFetching || preferencesQuery.isFetching,
    refreshTasks: tasksQuery.refetch,
    refreshPreferences: preferencesQuery.refetch,
    refresh: async () => {
      await Promise.all([tasksQuery.refetch(), preferencesQuery.refetch()]);
    },
  };
}
