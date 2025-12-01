import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TeamMember } from "@/types/team";

export const useTeamMembers = () => {
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useQuery({
    queryKey: ["teamMembers"],
    queryFn: async () => {
      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("team_members" as any)
        .select("*")
        .order("name");

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.map((member: any) => ({
        id: member.id,
        name: member.name,
        role: member.role,
        email: member.email,
        avatarUrl: member.avatar_url,
        active: member.active,
      })) as TeamMember[];
    },
  });

  const addMember = useMutation({
    mutationFn: async (newMember: Omit<TeamMember, "id">) => {
      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("team_members" as any)
        .insert({
          name: newMember.name,
          role: newMember.role,
          email: newMember.email,
          avatar_url: newMember.avatarUrl,
          active: newMember.active,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
    },
  });

  const updateMember = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TeamMember> }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dbUpdates: Record<string, any> = {};
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.role) dbUpdates.role = updates.role;
      if (updates.email) dbUpdates.email = updates.email;
      if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
      if (updates.active !== undefined) dbUpdates.active = updates.active;

      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("team_members" as any)
        .update(dbUpdates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
    },
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("team_members" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
    },
  });

  return {
    members: members || [],
    isLoading,
    addMember,
    updateMember,
    removeMember,
  };
};
