import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as unknown as SupabaseClient;

export interface CsCxRoutineModel {
  id: string;
  legacy_id: number | null;
  name: string;
  description: string | null;
  active: boolean;
  origin: "legacy" | "hub";
  products: Array<{ id: string; name: string }>;
  item_count: number;
}

export interface CsCxRoutineItemConfig {
  id: string;
  active: boolean | null;
  notes: string | null;
  analysis_notes: string | null;
  analyzed_at: string | null;
  model_item: {
    id: string;
    name: string;
    description: string | null;
    sort_order: number;
    required: boolean;
    category: { id: string; name: string; display_color: string } | null;
    routine_type: { id: string; name: string } | null;
  } | null;
}

export interface CsCxOfficeRoutine {
  id: string;
  legacy_id: number | null;
  registry_office_id: string;
  routine_model_id: string;
  active: boolean;
  applied_at: string;
  notes: string | null;
  origin: "legacy" | "hub";
  registry_office: { id: string; name: string } | null;
  routine_model: { id: string; name: string; description: string | null } | null;
  items: CsCxRoutineItemConfig[];
}

interface RawModel extends Omit<CsCxRoutineModel, "products" | "item_count"> {
  cs_cx_routine_model_products?: Array<{ source_present: boolean; cs_cx_products: { id: string; name: string } | null }>;
  cs_cx_routine_model_items?: Array<{ source_present: boolean }>;
}

interface RawRoutine extends Omit<CsCxOfficeRoutine, "registry_office" | "routine_model" | "items"> {
  cs_cx_registry_offices: { id: string; name: string } | null;
  cs_cx_routine_models: { id: string; name: string; description: string | null } | null;
}

interface RawConfig extends Omit<CsCxRoutineItemConfig, "model_item"> {
  office_routine_id: string;
  cs_cx_routine_model_items: {
    id: string;
    name: string;
    description: string | null;
    sort_order: number;
    required: boolean;
    cs_cx_routine_categories: { id: string; name: string; display_color: string } | null;
    cs_cx_routine_types: { id: string; name: string } | null;
  } | null;
}

export function useCsCxRoutines() {
  const queryClient = useQueryClient();

  const modelsQuery = useQuery({
    queryKey: ["cs-cx", "routine-models"],
    queryFn: async () => {
      const { data, error } = await db
        .from("cs_cx_routine_models")
        .select(`
          id, legacy_id, name, description, active, origin,
          cs_cx_routine_model_products (
            source_present,
            cs_cx_products (id, name)
          ),
          cs_cx_routine_model_items (source_present)
        `)
        .eq("source_present", true)
        .order("name");
      if (error) throw error;

      return ((data ?? []) as unknown as RawModel[]).map((model) => ({
        ...model,
        products: (model.cs_cx_routine_model_products ?? [])
          .filter((link) => link.source_present)
          .map((link) => link.cs_cx_products)
          .filter((product): product is { id: string; name: string } => Boolean(product)),
        item_count: (model.cs_cx_routine_model_items ?? []).filter((item) => item.source_present).length,
      })) satisfies CsCxRoutineModel[];
    },
  });

  const routinesQuery = useQuery({
    queryKey: ["cs-cx", "office-routines"],
    queryFn: async () => {
      const [routineResult, configResult] = await Promise.all([
        db
          .from("cs_cx_office_routines")
          .select(`
            id, legacy_id, registry_office_id, routine_model_id, active,
            applied_at, notes, origin,
            cs_cx_registry_offices (id, name),
            cs_cx_routine_models (id, name, description)
          `)
          .eq("source_present", true)
          .order("applied_at", { ascending: false }),
        db
          .from("cs_cx_office_routine_items")
          .select(`
            id, office_routine_id, active, notes, analysis_notes, analyzed_at,
            cs_cx_routine_model_items (
              id, name, description, sort_order, required,
              cs_cx_routine_categories (id, name, display_color),
              cs_cx_routine_types (id, name)
            )
          `)
          .eq("source_present", true),
      ]);
      if (routineResult.error) throw routineResult.error;
      if (configResult.error) throw configResult.error;

      const configs = (configResult.data ?? []) as unknown as RawConfig[];
      return ((routineResult.data ?? []) as unknown as RawRoutine[]).map((routine) => ({
        ...routine,
        registry_office: routine.cs_cx_registry_offices,
        routine_model: routine.cs_cx_routine_models,
        items: configs
          .filter((config) => config.office_routine_id === routine.id)
          .map((config) => ({
            ...config,
            model_item: config.cs_cx_routine_model_items
              ? {
                  ...config.cs_cx_routine_model_items,
                  category: config.cs_cx_routine_model_items.cs_cx_routine_categories,
                  routine_type: config.cs_cx_routine_model_items.cs_cx_routine_types,
                }
              : null,
          }))
          .sort((a, b) => (a.model_item?.sort_order ?? 0) - (b.model_item?.sort_order ?? 0)),
      })) satisfies CsCxOfficeRoutine[];
    },
  });

  const applyRoutine = useMutation({
    mutationFn: async (input: { registryOfficeId: string; routineModelId: string; notes?: string }) => {
      const { data, error } = await db.rpc("cs_cx_apply_routine", {
        p_registry_office_id: input.registryOfficeId,
        p_routine_model_id: input.routineModelId,
        p_notes: emptyToNull(input.notes),
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => invalidateRoutines(queryClient),
  });

  const setRoutineItem = useMutation({
    mutationFn: async (input: { id: string; active: boolean | null; analysisNotes?: string }) => {
      const { error } = await db.rpc("cs_cx_set_routine_item", {
        p_config_id: input.id,
        p_active: input.active,
        p_analysis_notes: emptyToNull(input.analysisNotes),
      });
      if (error) throw error;
    },
    onSuccess: () => invalidateRoutines(queryClient),
  });

  const deleteRoutine = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("cs_cx_office_routines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateRoutines(queryClient),
  });

  return {
    models: modelsQuery.data ?? [],
    routines: routinesQuery.data ?? [],
    isLoading: modelsQuery.isLoading || routinesQuery.isLoading,
    error: modelsQuery.error ?? routinesQuery.error,
    refetch: routinesQuery.refetch,
    applyRoutine,
    setRoutineItem,
    deleteRoutine,
  };
}

function emptyToNull(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function invalidateRoutines(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["cs-cx"] });
}
