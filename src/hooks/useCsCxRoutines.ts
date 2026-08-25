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

export interface CsCxRoutineCategory {
  id: string;
  name: string;
  description: string | null;
  display_color: string;
  active: boolean;
  origin: "legacy" | "hub";
  item_count: number;
}

export interface CsCxRoutineType {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  origin: "legacy" | "hub";
  item_count: number;
}

export interface CsCxProduct {
  id: string;
  legacy_id: number | null;
  product_code: string | null;
  name: string;
  description: string | null;
  active: boolean;
  origin: "legacy" | "hub";
}

export interface CsCxRoutineModelItem {
  id: string;
  routine_model_id: string;
  name: string;
  description: string | null;
  category_id: string;
  routine_type_id: string;
  sort_order: number;
  required: boolean;
  default_active: boolean | null;
  origin: "legacy" | "hub";
  category: { id: string; name: string; display_color: string } | null;
  routine_type: { id: string; name: string } | null;
}

export interface RoutineModelInput {
  id?: string;
  name: string;
  description?: string;
  active: boolean;
  productIds: string[];
}

export interface RoutineModelItemInput {
  id?: string;
  routineModelId: string;
  name: string;
  description?: string;
  categoryId: string;
  routineTypeId: string;
  required: boolean;
  defaultActive: boolean | null;
}

export interface RoutineCategoryInput {
  id?: string;
  name: string;
  description?: string;
  display_color: string;
  active: boolean;
}

export interface RoutineTypeInput {
  id?: string;
  name: string;
  description?: string;
  active: boolean;
}

export interface ProductInput {
  id?: string;
  name: string;
  productCode?: string;
  description?: string;
  active: boolean;
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
  applied_by: string | null;
  registry_office: { id: string; name: string } | null;
  routine_model: {
    id: string;
    name: string;
    description: string | null;
  } | null;
  items: CsCxRoutineItemConfig[];
}

export interface CsCxRoutineLink {
  id: string;
  registry_office_id: string;
  routine_model_id: string;
  applied_by: string | null;
}

export interface CsCxRoutineLinkModel {
  id: string;
  name: string;
  active: boolean;
}

export interface CsCxRoutineHistory {
  id: string;
  legacy_id: number | null;
  office_routine_id: string | null;
  model_item_id: string | null;
  action: string;
  previous_status: boolean | null;
  new_status: boolean | null;
  notes: string | null;
  legacy_user_id: number | null;
  actor_profile_id: string | null;
  occurred_at: string;
  ip_address: string | null;
  origin: "legacy" | "hub";
  registry_office_name: string | null;
  routine_model_name: string | null;
  model_item_name: string | null;
  actor_name: string | null;
}

interface RawModel extends Omit<CsCxRoutineModel, "products" | "item_count"> {
  cs_cx_routine_model_products?: Array<{
    source_present: boolean;
    cs_cx_products: { id: string; name: string } | null;
  }>;
  cs_cx_routine_model_items?: Array<{ source_present: boolean }>;
}

interface RawRoutine extends Omit<
  CsCxOfficeRoutine,
  "registry_office" | "routine_model" | "items"
> {
  cs_cx_registry_offices: { id: string; name: string } | null;
  cs_cx_routine_models: {
    id: string;
    name: string;
    description: string | null;
  } | null;
}

interface RawConfig extends Omit<CsCxRoutineItemConfig, "model_item"> {
  office_routine_id: string;
  cs_cx_routine_model_items: {
    id: string;
    name: string;
    description: string | null;
    sort_order: number;
    required: boolean;
    cs_cx_routine_categories: {
      id: string;
      name: string;
      display_color: string;
    } | null;
    cs_cx_routine_types: { id: string; name: string } | null;
  } | null;
}

interface RawAdminItem extends Omit<
  CsCxRoutineModelItem,
  "category" | "routine_type"
> {
  cs_cx_routine_categories: {
    id: string;
    name: string;
    display_color: string;
  } | null;
  cs_cx_routine_types: { id: string; name: string } | null;
}

async function fetchAllRoutineConfigs() {
  const pageSize = 1000;
  const rows: RawConfig[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await db
      .from("cs_cx_office_routine_items")
      .select(
        `
        id, office_routine_id, active, notes, analysis_notes, analyzed_at,
        cs_cx_routine_model_items (
          id, name, description, sort_order, required,
          cs_cx_routine_categories (id, name, display_color),
          cs_cx_routine_types (id, name)
        )
      `,
      )
      .eq("source_present", true)
      .order("id")
      .range(from, from + pageSize - 1);
    if (error) throw error;

    const page = (data ?? []) as unknown as RawConfig[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}

export function useCsCxRoutines() {
  const queryClient = useQueryClient();

  const modelsQuery = useQuery({
    queryKey: ["cs-cx", "routine-models"],
    queryFn: async () => {
      const { data, error } = await db
        .from("cs_cx_routine_models")
        .select(
          `
          id, legacy_id, name, description, active, origin,
          cs_cx_routine_model_products (
            source_present,
            cs_cx_products (id, name)
          ),
          cs_cx_routine_model_items (source_present)
        `,
        )
        .eq("source_present", true)
        .order("name");
      if (error) throw error;

      return ((data ?? []) as unknown as RawModel[]).map((model) => ({
        ...model,
        products: (model.cs_cx_routine_model_products ?? [])
          .filter((link) => link.source_present)
          .map((link) => link.cs_cx_products)
          .filter((product): product is { id: string; name: string } =>
            Boolean(product),
          ),
        item_count: (model.cs_cx_routine_model_items ?? []).filter(
          (item) => item.source_present,
        ).length,
      })) satisfies CsCxRoutineModel[];
    },
  });

  const routinesQuery = useQuery({
    queryKey: ["cs-cx", "office-routines"],
    queryFn: async () => {
      const [routineResult, configs] = await Promise.all([
        db
          .from("cs_cx_office_routines")
          .select(
            `
            id, legacy_id, registry_office_id, routine_model_id, active,
            applied_at, notes, origin, applied_by,
            cs_cx_registry_offices (id, name),
            cs_cx_routine_models (id, name, description)
          `,
          )
          .eq("source_present", true)
          .order("applied_at", { ascending: false }),
        fetchAllRoutineConfigs(),
      ]);
      if (routineResult.error) throw routineResult.error;

      return ((routineResult.data ?? []) as unknown as RawRoutine[]).map(
        (routine) => ({
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
                    category:
                      config.cs_cx_routine_model_items.cs_cx_routine_categories,
                    routine_type:
                      config.cs_cx_routine_model_items.cs_cx_routine_types,
                  }
                : null,
            }))
            .sort(
              (a, b) =>
                (a.model_item?.sort_order ?? 0) -
                (b.model_item?.sort_order ?? 0),
            ),
        }),
      ) satisfies CsCxOfficeRoutine[];
    },
  });

  const historyQuery = useQuery({
    queryKey: ["cs-cx", "routine-history"],
    queryFn: async () => {
      const pageSize = 1000;
      const rows: CsCxRoutineHistory[] = [];

      for (let from = 0; ; from += pageSize) {
        const { data, error } = await db
          .from("cs_cx_routine_history")
          .select(
            `
            id, legacy_id, office_routine_id, model_item_id, action,
            previous_status, new_status, notes, legacy_user_id,
            actor_profile_id, occurred_at, ip_address, origin,
            registry_office_name, routine_model_name, model_item_name, actor_name
          `,
          )
          .eq("source_present", true)
          .order("occurred_at", { ascending: false })
          .range(from, from + pageSize - 1);
        if (error) throw error;

        const page = (data ?? []) as CsCxRoutineHistory[];
        rows.push(...page);
        if (page.length < pageSize) break;
      }

      return rows;
    },
  });

  const applyRoutine = useMutation({
    mutationFn: async (input: {
      registryOfficeId: string;
      routineModelId: string;
      notes?: string;
    }) => {
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
    mutationFn: async (input: {
      id: string;
      active: boolean | null;
      notes?: string;
      analysisNotes?: string;
      historyNotes?: string;
      analyzedAt: string;
    }) => {
      const { error } = await db.rpc("cs_cx_set_routine_item_v2", {
        p_config_id: input.id,
        p_active: input.active,
        p_notes: emptyToNull(input.notes),
        p_analysis_notes: emptyToNull(input.analysisNotes),
        p_history_notes: emptyToNull(input.historyNotes),
        p_analyzed_at: `${input.analyzedAt}T12:00:00`,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidateRoutines(queryClient),
  });

  const setAllRoutineItems = useMutation({
    mutationFn: async (input: {
      registryOfficeId: string;
      routineModelIds?: string[];
      active: boolean | null;
      analysisNotes?: string;
      historyNotes?: string;
      analyzedAt: string;
    }) => {
      const { data, error } = await db.rpc("cs_cx_set_routine_items_bulk_v3", {
        p_registry_office_id: input.registryOfficeId,
        p_active: input.active,
        p_routine_model_ids: input.routineModelIds ?? null,
        p_analysis_notes: emptyToNull(input.analysisNotes),
        p_history_notes: emptyToNull(input.historyNotes),
        p_analyzed_at: `${input.analyzedAt}T12:00:00`,
      });
      if (error) throw error;
      return Number(data ?? 0);
    },
    onSuccess: () => invalidateRoutines(queryClient),
  });

  const deleteRoutine = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from("cs_cx_office_routines")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateRoutines(queryClient),
  });

  return {
    models: modelsQuery.data ?? [],
    routines: routinesQuery.data ?? [],
    history: historyQuery.data ?? [],
    isLoading:
      modelsQuery.isLoading ||
      routinesQuery.isLoading ||
      historyQuery.isLoading,
    error: modelsQuery.error ?? routinesQuery.error ?? historyQuery.error,
    refetch: async () =>
      Promise.all([
        modelsQuery.refetch(),
        routinesQuery.refetch(),
        historyQuery.refetch(),
      ]),
    applyRoutine,
    setRoutineItem,
    setAllRoutineItems,
    deleteRoutine,
  };
}

export function useCsCxRoutineLinks() {
  const queryClient = useQueryClient();

  const modelsQuery = useQuery({
    queryKey: ["cs-cx", "routine-link-models"],
    queryFn: async () => {
      const { data, error } = await db
        .from("cs_cx_routine_models")
        .select("id, name, active")
        .eq("source_present", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as CsCxRoutineLinkModel[];
    },
  });

  const linksQuery = useQuery({
    queryKey: ["cs-cx", "office-routine-links"],
    queryFn: async () => {
      const { data, error } = await db
        .from("cs_cx_office_routines")
        .select("id, registry_office_id, routine_model_id, applied_by")
        .eq("source_present", true);
      if (error) throw error;
      return (data ?? []) as CsCxRoutineLink[];
    },
  });

  const applyRoutine = useMutation({
    mutationFn: async (input: {
      registryOfficeId: string;
      routineModelId: string;
    }) => {
      const { data, error } = await db.rpc("cs_cx_apply_routine", {
        p_registry_office_id: input.registryOfficeId,
        p_routine_model_id: input.routineModelId,
        p_notes: null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => invalidateRoutines(queryClient),
  });

  const deleteRoutine = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from("cs_cx_office_routines")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateRoutines(queryClient),
  });

  return {
    models: modelsQuery.data ?? [],
    routines: linksQuery.data ?? [],
    isLoading: modelsQuery.isLoading || linksQuery.isLoading,
    error: modelsQuery.error ?? linksQuery.error,
    applyRoutine,
    deleteRoutine,
  };
}

export function useCsCxRoutineAdmin() {
  const queryClient = useQueryClient();

  const adminQuery = useQuery({
    queryKey: ["cs-cx", "routine-admin"],
    queryFn: async () => {
      const [
        modelsResult,
        categoriesResult,
        typesResult,
        itemsResult,
        productsResult,
      ] = await Promise.all([
        db
          .from("cs_cx_routine_models")
          .select(
            `
            id, legacy_id, name, description, active, origin,
            cs_cx_routine_model_products (
              source_present,
              cs_cx_products (id, name)
            ),
            cs_cx_routine_model_items (source_present)
          `,
          )
          .eq("source_present", true)
          .order("name"),
        db
          .from("cs_cx_routine_categories")
          .select("id, name, description, display_color, active, origin")
          .eq("source_present", true)
          .order("name"),
        db
          .from("cs_cx_routine_types")
          .select("id, name, description, active, origin")
          .eq("source_present", true)
          .order("name"),
        db
          .from("cs_cx_routine_model_items")
          .select(
            `
            id, routine_model_id, name, description, category_id, routine_type_id,
            sort_order, required, default_active, origin,
            cs_cx_routine_categories (id, name, display_color),
            cs_cx_routine_types (id, name)
          `,
          )
          .eq("source_present", true)
          .order("sort_order"),
        db
          .from("cs_cx_products")
          .select("id, legacy_id, product_code, name, description, active, origin")
          .eq("source_present", true)
          .order("name"),
      ]);

      const firstError = [
        modelsResult,
        categoriesResult,
        typesResult,
        itemsResult,
        productsResult,
      ].find((result) => result.error)?.error;
      if (firstError) throw firstError;

      const items = ((itemsResult.data ?? []) as unknown as RawAdminItem[]).map(
        (item) => ({
          ...item,
          category: item.cs_cx_routine_categories,
          routine_type: item.cs_cx_routine_types,
        }),
      ) satisfies CsCxRoutineModelItem[];

      return {
        models: ((modelsResult.data ?? []) as unknown as RawModel[]).map(
          (model) => ({
            ...model,
            products: (model.cs_cx_routine_model_products ?? [])
              .filter((link) => link.source_present)
              .map((link) => link.cs_cx_products)
              .filter((product): product is { id: string; name: string } =>
                Boolean(product),
              ),
            item_count: (model.cs_cx_routine_model_items ?? []).filter(
              (item) => item.source_present,
            ).length,
          }),
        ) satisfies CsCxRoutineModel[],
        categories: (
          (categoriesResult.data ?? []) as Omit<
            CsCxRoutineCategory,
            "item_count"
          >[]
        ).map((category) => ({
          ...category,
          item_count: items.filter((item) => item.category_id === category.id)
            .length,
        })),
        types: (
          (typesResult.data ?? []) as Omit<CsCxRoutineType, "item_count">[]
        ).map((routineType) => ({
          ...routineType,
          item_count: items.filter(
            (item) => item.routine_type_id === routineType.id,
          ).length,
        })),
        items,
        products: (productsResult.data ?? []) as CsCxProduct[],
      };
    },
  });

  const saveModel = useMutation({
    mutationFn: async (input: RoutineModelInput) => {
      const { data, error } = await db.rpc("cs_cx_save_routine_model", {
        p_id: input.id ?? null,
        p_name: input.name.trim(),
        p_description: emptyToNull(input.description),
        p_active: input.active,
        p_product_ids: input.productIds,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => invalidateRoutines(queryClient),
  });

  const deleteModel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.rpc("cs_cx_delete_routine_model", {
        p_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidateRoutines(queryClient),
  });

  const saveItem = useMutation({
    mutationFn: async (input: RoutineModelItemInput) => {
      const { data, error } = await db.rpc("cs_cx_save_routine_model_item", {
        p_id: input.id ?? null,
        p_routine_model_id: input.routineModelId,
        p_name: input.name.trim(),
        p_description: emptyToNull(input.description),
        p_category_id: input.categoryId,
        p_routine_type_id: input.routineTypeId,
        p_required: input.required,
        p_default_active: input.defaultActive,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => invalidateRoutines(queryClient),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.rpc("cs_cx_delete_routine_model_item", {
        p_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidateRoutines(queryClient),
  });

  const reorderItem = useMutation({
    mutationFn: async (input: { id: string; newOrder: number }) => {
      const { error } = await db.rpc("cs_cx_reorder_routine_model_item", {
        p_id: input.id,
        p_new_order: input.newOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidateRoutines(queryClient),
  });

  const saveCategory = useMutation({
    mutationFn: async (input: RoutineCategoryInput) => {
      const payload = {
        name: input.name.trim(),
        description: emptyToNull(input.description),
        display_color: input.display_color,
        active: input.active,
      };
      const request = input.id
        ? db.from("cs_cx_routine_categories").update(payload).eq("id", input.id)
        : db
            .from("cs_cx_routine_categories")
            .insert({ ...payload, origin: "hub", source_present: true });
      const { error } = await request;
      if (error) throw error;
    },
    onSuccess: () => invalidateRoutines(queryClient),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from("cs_cx_routine_categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateRoutines(queryClient),
  });

  const saveType = useMutation({
    mutationFn: async (input: RoutineTypeInput) => {
      const payload = {
        name: input.name.trim(),
        description: emptyToNull(input.description),
        active: input.active,
      };
      const request = input.id
        ? db.from("cs_cx_routine_types").update(payload).eq("id", input.id)
        : db
            .from("cs_cx_routine_types")
            .insert({ ...payload, origin: "hub", source_present: true });
      const { error } = await request;
      if (error) throw error;
    },
    onSuccess: () => invalidateRoutines(queryClient),
  });

  const deleteType = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from("cs_cx_routine_types")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateRoutines(queryClient),
  });

  const saveProduct = useMutation({
    mutationFn: async (input: ProductInput) => {
      const name = input.name.trim();
      const productCode = emptyToNull(input.productCode)?.toUpperCase() ?? null;
      const duplicate = (adminQuery.data?.products ?? []).find(
        (product) =>
          product.id !== input.id &&
          (product.name.trim().toLocaleLowerCase("pt-BR") ===
            name.toLocaleLowerCase("pt-BR") ||
            (productCode !== null &&
              product.product_code?.trim().toUpperCase() === productCode)),
      );
      if (duplicate) {
        throw new Error(
          duplicate.name.toLocaleLowerCase("pt-BR") ===
            name.toLocaleLowerCase("pt-BR")
            ? "Já existe um produto com este nome."
            : "Já existe um produto com este código.",
        );
      }

      const payload = {
        name,
        product_code: productCode,
        description: emptyToNull(input.description),
        active: input.active,
        source_present: true,
      };
      const request = input.id
        ? db.from("cs_cx_products").update(payload).eq("id", input.id)
        : db.from("cs_cx_products").insert({ ...payload, origin: "hub" });
      const { error } = await request;
      if (error) throw error;
    },
    onSuccess: () => invalidateRoutines(queryClient),
  });

  return {
    models: adminQuery.data?.models ?? [],
    categories: adminQuery.data?.categories ?? [],
    types: adminQuery.data?.types ?? [],
    items: adminQuery.data?.items ?? [],
    products: adminQuery.data?.products ?? [],
    isLoading: adminQuery.isLoading,
    error: adminQuery.error,
    refetch: adminQuery.refetch,
    saveModel,
    deleteModel,
    saveItem,
    deleteItem,
    reorderItem,
    saveCategory,
    deleteCategory,
    saveType,
    deleteType,
    saveProduct,
  };
}

function emptyToNull(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function invalidateRoutines(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["cs-cx"] });
}
