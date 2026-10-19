import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { normalizeText } from "@/lib/project-calendar-events";

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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: vacations = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["vacations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("implantador_vacations")
        .select("*")
        .order("start_date", { ascending: true });

      if (error) throw error;
      return (data ?? []) as Vacation[];
    },
  });

  const addVacation = useMutation({
    mutationFn: async (input: VacationInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

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
        description: "O período de férias foi adicionado com sucesso.",
      });
    },
    onError: (error: any) => {
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
        description: "O período de férias foi atualizado com sucesso.",
      });
    },
    onError: (error: any) => {
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
        description: "O período de férias foi removido com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover férias",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  /**
   * Verifica se uma data ou intervalo de datas colide com qualquer período de férias do implantador
   */
  const checkVacationConflict = (
    implantadorIdOrName: string | null | undefined,
    startDate: Date,
    endDate?: Date
  ): Vacation | null => {
    if (!implantadorIdOrName || !startDate) return null;

    const startStr = startDate.toISOString().split("T")[0];
    const endStr = (endDate || startDate).toISOString().split("T")[0];
    const normTarget = normalizeText(implantadorIdOrName);

    return (
      vacations.find((v) => {
        const matchesId = v.implantador_id === implantadorIdOrName;
        const matchesName = normalizeText(v.implantador_name) === normTarget;
        if (!matchesId && !matchesName) return false;

        return v.start_date <= endStr && v.end_date >= startStr;
      }) || null
    );
  };

  /**
   * Verifica se um novo período a ser cadastrado colide com outro período já existente do mesmo implantador
   */
  const checkOverlapWithExisting = (
    implantadorIdOrName: string | null | undefined,
    startDate: string,
    endDate: string,
    excludeVacationId?: string
  ): Vacation | null => {
    if (!implantadorIdOrName || !startDate || !endDate) return null;
    const normTarget = normalizeText(implantadorIdOrName);

    return (
      vacations.find((v) => {
        if (excludeVacationId && v.id === excludeVacationId) return false;
        const matchesId = v.implantador_id === implantadorIdOrName;
        const matchesName = normalizeText(v.implantador_name) === normTarget;
        if (!matchesId && !matchesName) return false;

        return v.start_date <= endDate && v.end_date >= startDate;
      }) || null
    );
  };

  const getVacationsForDateRange = (start: Date, end: Date): Vacation[] => {
    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];

    return vacations.filter(
      (v) => v.start_date <= endStr && v.end_date >= startStr
    );
  };

  const getVacationsForImplantador = (
    implantadorIdOrName: string | null | undefined
  ): Vacation[] => {
    if (!implantadorIdOrName) return [];
    const normTarget = normalizeText(implantadorIdOrName);

    return vacations
      .filter(
        (v) =>
          v.implantador_id === implantadorIdOrName ||
          normalizeText(v.implantador_name) === normTarget
      )
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
  };

  return {
    vacations,
    isLoading,
    error,
    addVacation,
    updateVacation,
    deleteVacation,
    checkVacationConflict,
    checkOverlapWithExisting,
    getVacationsForDateRange,
    getVacationsForImplantador,
  };
}
