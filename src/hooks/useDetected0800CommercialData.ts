import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DetectedCommercialData {
  found: boolean;
  sold_hours?: number | null;
  legacy_system?: string | null;
  tramite_numero?: number | null;
  tramite_data?: string | null;
  tramite_responsavel?: string | null;
  already_applied?: boolean;
}

export function useDetected0800CommercialData(
  ticketNumber?: string | null,
  projectId?: string | null
) {
  const queryClient = useQueryClient();

  const query = useQuery<DetectedCommercialData>({
    queryKey: ["detected0800CommercialData", ticketNumber],
    enabled: !!ticketNumber,
    staleTime: 1000 * 60 * 2, // 2 minutes
    queryFn: async () => {
      if (!ticketNumber) return { found: false, already_applied: false };

      const { data, error } = await supabase.rpc(
        "get_detected_0800_commercial_data",
        { p_ticket_number: ticketNumber }
      );

      if (error) {
        console.warn("[useDetected0800CommercialData] erro ao consultar:", error.message);
        return { found: false, already_applied: false };
      }

      return (data as unknown as DetectedCommercialData) || { found: false, already_applied: false };
    },
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("ID do projeto não fornecido.");

      const { data, error } = await supabase.rpc(
        "apply_detected_0800_commercial_data",
        { p_project_id: projectId }
      );

      if (error) throw error;
      return data as {
        success: boolean;
        message?: string;
        applied_hours?: number;
        applied_legacy?: string;
      };
    },
    onSuccess: (result) => {
      if (!result?.success) {
        toast.error(result?.message || "Não foi possível aplicar os dados.");
        return;
      }

      toast.success(
        `Dados do 0800 aplicados com sucesso! ${
          result.applied_hours ? `${result.applied_hours}h` : ""
        } ${result.applied_legacy ? `• ${result.applied_legacy}` : ""}`
      );

      // Invalida caches do React Query (Padrão Split Query)
      queryClient.invalidateQueries({ queryKey: ["projectsList"] });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ["projectDetails", projectId] });
      }
      queryClient.invalidateQueries({
        queryKey: ["detected0800CommercialData", ticketNumber],
      });
    },
    onError: (err: Error) => {
      toast.error(`Erro ao aplicar dados do 0800: ${err.message}`);
    },
  });

  return {
    ...query,
    detectedData: query.data,
    applyData: applyMutation.mutateAsync,
    isApplying: applyMutation.isPending,
  };
}
