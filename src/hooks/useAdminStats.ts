import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminStats } from "@/types/admin";

export function useAdminStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async (): Promise<AdminStats> => {
      const [
        { count: usersCount, error: usersError },
        { count: projectsCount, error: projectsError },
        { data: recentLogs, error: logsError },
        { data: allProjects, error: allProjectsError },
        { data: dbSize, error: dbSizeError },
        { data: storageSize, error: storageSizeError }
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("projects").select("*", { count: "exact", head: true }).not("global_status", "in", '("done","archived")'),
        supabase.from("audit_logs").select(`
          user_id,
          profiles:user_id (full_name)
        `).order('created_at', { ascending: false }).limit(2000),
        supabase.from("projects").select("global_status"),
        supabase.rpc('get_db_size'),
        supabase.rpc('get_storage_size')
      ]);

      if (usersError) throw usersError;
      
      const projectDistribution: Record<string, number> = {};
      allProjects?.forEach((p: any) => {
        const status = p.global_status || 'unknown';
        projectDistribution[status] = (projectDistribution[status] || 0) + 1;
      });

      const dbSizeMB = dbSize ? Number(dbSize) / (1024 * 1024) : 0;
      const storageSizeMB = storageSize ? Number(storageSize) / (1024 * 1024) : 0;

      // Online: distinct users with logs in the last 2 hours
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      
      const { data: onlineLogs, error: onlineError } = await supabase
        .from("audit_logs")
        .select(`
          user_id,
          created_at,
          profiles:user_id (full_name)
        `)
        .gt("created_at", twoHoursAgo)
        .order('created_at', { ascending: false });

      const onlineUsersMap: Record<string, { id: string; userName: string; lastAction: string; status: 'active' | 'away' }> = {};
      onlineLogs?.forEach(log => {
        if (!log.user_id || onlineUsersMap[log.user_id]) return;
        
        const isRecentlyActive = new Date(log.created_at) > new Date(fifteenMinutesAgo);
        
        onlineUsersMap[log.user_id] = {
          id: log.user_id,
          userName: (log.profiles as any)?.full_name || "Usuário Desconhecido",
          lastAction: log.created_at,
          status: isRecentlyActive ? 'active' : 'away'
        };
      });

      const onlineUsers = Object.values(onlineUsersMap).sort((a, b) => 
        new Date(b.lastAction).getTime() - new Date(a.lastAction).getTime()
      );

      const activeNowCount = onlineUsers.filter(u => u.status === 'active').length;

      // Most Active: Aggregate recentLogs (last 2000 actions)
      const activityMap: Record<string, { name: string, count: number }> = {};
      recentLogs?.forEach(log => {
        if (!log.user_id) return;
        const name = (log.profiles as any)?.full_name || "Usuário Desconhecido";
        if (!activityMap[log.user_id]) {
          activityMap[log.user_id] = { name, count: 0 };
        }
        activityMap[log.user_id].count++;
      });

      const mostActiveUsers = Object.values(activityMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map((u, index) => ({ 
          userId: Object.keys(activityMap).find(key => activityMap[key].name === u.name) || String(index),
          userName: u.name, 
          actionCount: u.count 
        }));

      return {
        totalUsers: usersCount || 0,
        activeProjects: projectsCount || 0,
        onlineUsersCount: onlineUsers.length,
        activeNowCount,
        onlineUsers,
        mostActiveUsers,
        projectDistribution,
        storage: {
          dbSizeMB,
          storageSizeMB
        }
      };
    },
  });

  return { stats, isLoading };
}

export function useStorageStats() {
  return useQuery({
    queryKey: ["admin-storage-stats"],
    queryFn: async () => {
      const { data: dbSize, error: dbError } = await supabase.rpc('get_db_size');
      if (dbError) console.error("Error fetching get_db_size:", dbError);

      const { data: storageSize, error: storageError } = await supabase.rpc('get_storage_size');
      if (storageError) console.error("Error fetching get_storage_size:", storageError);

      const dbSizeMB = dbSize ? Number(dbSize) / (1024 * 1024) : 0;
      const storageSizeMB = storageSize ? Number(storageSize) / (1024 * 1024) : 0;

      return {
        dbSizeMB,
        storageSizeMB,
      };
    },
    refetchInterval: 5 * 60 * 1000,
  });
}
