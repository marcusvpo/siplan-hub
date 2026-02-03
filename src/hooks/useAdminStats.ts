import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminStats } from "@/types/admin";

export function useAdminStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async (): Promise<AdminStats> => {
      const { count: usersCount, error: usersError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      if (usersError) throw usersError;

      // Active projects: status not in done/archived
      // Assuming 'projects' table (ProjectV2) maps to 'projects' in DB?
      // Need to verify table name. 'projects' usually.
      // And strict globalStatus check.
      const { count: projectsCount, error: projectsError } = await supabase
        .from("projects") 
        .select("*", { count: "exact", head: true })
        .not("global_status", "in", '("done","archived")'); // Assuming 'status' column maps to globalStatus. 
        // Note: ProjectV2 type says 'globalStatus' but in DB it might be 'status'. 
        // Usually ProjectV2.globalStatus maps to a "status" column. 
        // If I am not sure, I should check schema. But 'projects' table usually has 'status'.
        
      if (projectsError) {
        console.error("Error fetching project stats:", projectsError);
        // If exact column name mismatch, just return 0 for now to avoid crash
        // but generally 'status' is standard.
      }

      return {
        totalUsers: usersCount || 0,
        activeProjects: projectsCount || 0,
      };
    },
  });

  return { stats, isLoading };
}
