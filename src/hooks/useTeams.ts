import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Team } from "@/types/admin";
import { useToast } from "@/hooks/use-toast";

export function useTeams() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: teams, isLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .order("label");
      
      if (error) {
        console.error("Error loading teams:", error);
        throw error;
      }
      return data as Team[];
    },
  });

  const createTeam = useMutation({
    mutationFn: async (team: Omit<Team, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("teams")
        .insert(team)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast({ title: "Time criado com sucesso" });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao criar time", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const updateTeam = useMutation({
    mutationFn: async (team: Partial<Team> & { id: string }) => {
      const { data, error } = await supabase
        .from("teams")
        .update(team)
        .eq("id", team.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast({ title: "Time atualizado com sucesso" });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao atualizar time", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const deleteTeam = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("teams")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast({ title: "Time removido com sucesso" });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao remover time", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  return { teams, isLoading, createTeam, updateTeam, deleteTeam };
}
