import { useState, useCallback, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

// Types based on actual database schema
export interface ConversionIssue {
  id: string;
  projectId: string;
  clientName?: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  reportedBy: string | null;
  reportedAt: Date;
  fixedBy: string | null;
  fixedAt: Date | null;
  notes: string | null;
}

export interface IssueStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
}

interface UseConversionIssuesOptions {
  projectId?: string;
}

export function useConversionIssues(options: UseConversionIssuesOptions = {}) {
  const { projectId } = options;
  const [issues, setIssues] = useState<ConversionIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIssues = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("conversion_issues")
        .select(`
          *,
          projects!inner (
            client_name
          )
        `)
        .order("reported_at", { ascending: false });

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const items: ConversionIssue[] = (data || []).map((item) => ({
        id: item.id,
        projectId: item.project_id,
        clientName: item.projects?.client_name,
        title: item.title,
        description: item.description,
        priority: item.priority,
        status: item.status,
        reportedBy: item.reported_by,
        reportedAt: new Date(item.reported_at),
        fixedBy: item.fixed_by,
        fixedAt: item.fixed_at ? new Date(item.fixed_at) : null,
        notes: item.notes,
      }));

      setIssues(items);
      setError(null);
    } catch (err) {
      console.error("Error fetching issues:", err);
      setError("Erro ao carregar inconsistências");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  // Stats
  const stats: IssueStats = useMemo(() => {
    const open = issues.filter((i) => i.status === "open").length;
    const inProgress = issues.filter((i) => i.status === "in_progress").length;
    const resolved = issues.filter((i) => i.status === "resolved").length;

    return {
      total: issues.length,
      open,
      inProgress,
      resolved,
    };
  }, [issues]);

  // Report new issue
  const reportIssue = useCallback(
    async (data: {
      projectId: string;
      title: string;
      description?: string;
      priority: string;
      reportedBy?: string;
    }) => {
      try {
        const { error } = await supabase.from("conversion_issues").insert({
          project_id: data.projectId,
          title: data.title,
          description: data.description || null,
          priority: data.priority,
          status: "open",
          reported_by: data.reportedBy || null,
        });

        if (error) throw error;
        await fetchIssues();
        return true;
      } catch (err) {
        console.error("Error reporting issue:", err);
        return false;
      }
    },
    [fetchIssues]
  );

  // Update issue status
  const updateStatus = useCallback(
    async (issueId: string, status: string) => {
      try {
        const { error } = await supabase
          .from("conversion_issues")
          .update({ status })
          .eq("id", issueId);

        if (error) throw error;
        await fetchIssues();
        return true;
      } catch (err) {
        console.error("Error updating status:", err);
        return false;
      }
    },
    [fetchIssues]
  );

  // Resolve issue
  const resolveIssue = useCallback(
    async (issueId: string, fixedBy: string, notes?: string) => {
      try {
        const { error } = await supabase
          .from("conversion_issues")
          .update({
            status: "resolved",
            fixed_by: fixedBy,
            fixed_at: new Date().toISOString(),
            notes: notes || null,
          })
          .eq("id", issueId);

        if (error) throw error;
        await fetchIssues();
        return true;
      } catch (err) {
        console.error("Error resolving issue:", err);
        return false;
      }
    },
    [fetchIssues]
  );

  // Update notes
  const updateNotes = useCallback(
    async (issueId: string, notes: string) => {
      try {
        const { error } = await supabase
          .from("conversion_issues")
          .update({ notes })
          .eq("id", issueId);

        if (error) throw error;
        await fetchIssues();
        return true;
      } catch (err) {
        console.error("Error updating notes:", err);
        return false;
      }
    },
    [fetchIssues]
  );

  // Delete issue
  const deleteIssue = useCallback(
    async (issueId: string) => {
      try {
        const { error } = await supabase
          .from("conversion_issues")
          .delete()
          .eq("id", issueId);

        if (error) throw error;
        await fetchIssues();
        return true;
      } catch (err) {
        console.error("Error deleting issue:", err);
        return false;
      }
    },
    [fetchIssues]
  );

  return {
    issues,
    stats,
    loading,
    error,
    reportIssue,
    updateStatus,
    resolveIssue,
    updateNotes,
    deleteIssue,
    refetch: fetchIssues,
  };
}
