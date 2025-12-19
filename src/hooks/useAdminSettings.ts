import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProjectHealthSettings {
  [key: string]: number; // status -> days
}

const DEFAULT_HEALTH_SETTINGS: ProjectHealthSettings = {
  "infra": 7,
  "adherence": 7,
  "environment": 5,
  "conversion": 10,
  "implementation": 15,
  "post": 30,
};

export function useAdminSettings() {
  const [loading, setLoading] = useState(true);
  const [healthSettings, setHealthSettings] = useState<ProjectHealthSettings>(DEFAULT_HEALTH_SETTINGS);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("settings" as any)
        .select("*")
        .eq("key", "project_health_thresholds")
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((data as any)?.value) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setHealthSettings((data as any).value as ProjectHealthSettings);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Erro ao carregar configurações.");
    } finally {
      setLoading(false);
    }
  };

  const updateHealthSettings = async (newSettings: ProjectHealthSettings) => {
    try {
      const { error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("settings" as any)
        .upsert({
          key: "project_health_thresholds",
          value: newSettings,
          description: "Dias para considerar o projeto saudável em cada etapa",
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setHealthSettings(newSettings);
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erro ao salvar configurações.");
    }
  };

  return {
    loading,
    healthSettings,
    updateHealthSettings,
  };
}
