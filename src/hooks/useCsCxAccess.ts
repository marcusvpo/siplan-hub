import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as unknown as SupabaseClient;
const QUERY_KEY = ["cs-cx", "access"] as const;

export interface CsCxAccessUser {
  user_id: string;
  full_name: string | null;
  email: string;
  global_role: string;
  access_profile_id: string;
  access_profile_name: string;
  active: boolean;
  is_hub_admin: boolean;
}

export interface CsCxAccessCandidate {
  user_id: string;
  full_name: string | null;
  email: string;
  global_role: string;
}

export interface CsCxAccessProfile {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  permission_ids: string[];
  user_count: number;
}

export interface CsCxModulePermission {
  id: string;
  resource: string;
  action: string;
  description: string | null;
}

interface AccessData {
  users: CsCxAccessUser[];
  candidates: CsCxAccessCandidate[];
  profiles: CsCxAccessProfile[];
  permissions: CsCxModulePermission[];
}

export function useCsCxAccess(canManage: boolean) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<AccessData> => {
      const requests = [
        db.rpc("cs_cx_list_access_users"),
        db.rpc("cs_cx_list_access_profiles"),
        db.rpc("cs_cx_list_module_permissions"),
      ] as const;
      const [usersResult, profilesResult, permissionsResult] = await Promise.all(requests);
      if (usersResult.error) throw usersResult.error;
      if (profilesResult.error) throw profilesResult.error;
      if (permissionsResult.error) throw permissionsResult.error;

      let candidates: CsCxAccessCandidate[] = [];
      if (canManage) {
        const candidatesResult = await db.rpc("cs_cx_list_access_candidates");
        if (candidatesResult.error) throw candidatesResult.error;
        candidates = (candidatesResult.data ?? []) as CsCxAccessCandidate[];
      }

      return {
        users: (usersResult.data ?? []) as CsCxAccessUser[],
        candidates,
        profiles: ((profilesResult.data ?? []) as Array<Omit<CsCxAccessProfile, "user_count"> & { user_count: number | string }>).map((profile) => ({
          ...profile,
          permission_ids: profile.permission_ids ?? [],
          user_count: Number(profile.user_count),
        })),
        permissions: (permissionsResult.data ?? []) as CsCxModulePermission[],
      };
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const saveProfile = useMutation({
    mutationFn: async (input: { id?: string; name: string; description: string; active: boolean; permissionIds: string[] }) => {
      const { data, error } = await db.rpc("cs_cx_save_access_profile", {
        p_id: input.id ?? null,
        p_name: input.name,
        p_description: input.description,
        p_active: input.active,
        p_permission_ids: input.permissionIds,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: invalidate,
  });

  const deleteProfile = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.rpc("cs_cx_delete_access_profile", { p_id: id });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const assignUser = useMutation({
    mutationFn: async (input: { userId: string; profileId: string; active?: boolean }) => {
      const { error } = await db.rpc("cs_cx_assign_user_access", {
        p_user_id: input.userId,
        p_access_profile_id: input.profileId,
        p_active: input.active ?? true,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const removeUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await db.rpc("cs_cx_remove_user_access", { p_user_id: userId });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    users: query.data?.users ?? [],
    candidates: query.data?.candidates ?? [],
    profiles: query.data?.profiles ?? [],
    permissions: query.data?.permissions ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    saveProfile,
    deleteProfile,
    assignUser,
    removeUser,
  };
}
