import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Vacation {
  id: string;
  implantador_name: string;
  implantador_id: string | null;
  start_date: string;
  end_date: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VacationInput {
  implantador_name: string;
  implantador_id?: string | null;
  start_date: string;
  end_date: string;
  description?: string | null;
}

export function useVacations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: vacations = [], isLoading, error } = useQuery({
    queryKey: ["vacations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("implantador_vacations")
        .select("*")
        .order("start_date", { ascending: true });
      
      if (error) throw error;
      return data as Vacation[];
    },
  });

  const addVacation = useMutation({
    mutationFn: async (input: VacationInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("implantador_vacations")
        .insert({
          ...input,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vacations"] });
      toast({
        title: "Férias cadastradas",
        description: "As férias foram adicionadas com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao cadastrar férias",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateVacation = useMutation({
    mutationFn: async ({ id, ...input }: VacationInput & { id: string }) => {
      const { data, error } = await supabase
        .from("implantador_vacations")
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vacations"] });
      toast({
        title: "Férias atualizadas",
        description: "As férias foram atualizadas com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar férias",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteVacation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("implantador_vacations")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vacations"] });
      toast({
        title: "Férias removidas",
        description: "As férias foram removidas com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover férias",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const checkVacationConflict = (implantadorId: string | null, date: Date): Vacation | null => {
    if (!implantadorId) return null;
    
    const dateStr = date.toISOString().split("T")[0];
    
    return vacations.find(v => 
      v.implantador_id === implantadorId &&
      dateStr >= v.start_date &&
      dateStr <= v.end_date
    ) || null;
  };

  const getVacationsForDateRange = (start: Date, end: Date): Vacation[] => {
    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];
    
    return vacations.filter(v =>
      (v.start_date <= endStr && v.end_date >= startStr)
    );
  };

  const getVacationsForImplantador = (implantadorId: string): Vacation[] => {
    return vacations.filter(v => v.implantador_id === implantadorId);
  };

  return {
    vacations,
    isLoading,
    error,
    addVacation,
    updateVacation,
    deleteVacation,
    checkVacationConflict,
    getVacationsForDateRange,
    getVacationsForImplantador,
  };
}
