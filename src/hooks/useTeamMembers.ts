import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TeamMember } from "@/types/team";

export const useTeamMembers = () => {
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useQuery({
    queryKey: ["teamMembers"],
    queryFn: async () => {
      // FETCH members from profiles table instead of team_members
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, team, created_at")
        .order("full_name");

      if (error) throw error;

      return data.map((member) => ({
        id: member.id,
        name: member.full_name || member.email || "Sem nome",
        role: member.role || "user",
        email: member.email || "",
        active: true, // All profiles are considered active
        team: member.team,
        avatarUrl: undefined, // Gravatars could be added later
      })) as TeamMember[];
    },
  });

  // Deprecated/Modified mutations to support new structure
  // Ideally, these should be replaced by UserManagement calls
  
  const addMember = useMutation({
    mutationFn: async (newMember: Omit<TeamMember, "id">) => {
      throw new Error("Para adicionar membros, utilize o Gerenciamento de Usuários");
    },
  });

  const updateMember = useMutation({
    mutationFn: async (member: TeamMember) => {
      // Best effort update
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: member.name,
          team: member.team as string | null // cast to match type
        })
        .eq("id", member.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
    },
  });

  const deleteMember = useMutation({
    mutationFn: async (id: string) => {
      // This will delete the profile
       const { error } = await supabase.from('profiles').delete().eq('id', id);
       if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
    },
  });

  return { members: members || [], isLoading, addMember, updateMember, deleteMember };
};
