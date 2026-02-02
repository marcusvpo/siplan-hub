import { useState, useCallback, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

// Types based on actual database schema
export interface ConversionMapping {
  id: string;
  projectId: string;
  clientName?: string;
  sourceOrigin: string;
  originTable: string;
  destinationTable: string;
  fieldMappings: Record<string, unknown> | null;
  scriptSnippet: string | null;
  scriptUrl: string | null;
}

export interface MappingStats {
  total: number;
  byProject: Record<string, number>;
}

interface UseConversionMappingsOptions {
  projectId?: string;
}

export function useConversionMappings(
  options: UseConversionMappingsOptions = {}
) {
  const { projectId } = options;
  const [mappings, setMappings] = useState<ConversionMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMappings = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("conversion_mappings")
        .select(`
          *,
          projects!inner (
            client_name
          )
        `)
        .order("origin_table", { ascending: true });

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const items: ConversionMapping[] = (data || []).map((item) => ({
        id: item.id,
        projectId: item.project_id,
        clientName: item.projects?.client_name,
        sourceOrigin: item.source_origin,
        originTable: item.origin_table,
        destinationTable: item.destination_table,
        fieldMappings: item.field_mappings as Record<string, unknown> | null,
        scriptSnippet: item.script_snippet,
        scriptUrl: item.script_url,
      }));

      setMappings(items);
      setError(null);
    } catch (err) {
      console.error("Error fetching mappings:", err);
      setError("Erro ao carregar mapeamentos");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  // Stats
  const stats: MappingStats = useMemo(() => {
    const byProject: Record<string, number> = {};
    mappings.forEach((m) => {
      byProject[m.projectId] = (byProject[m.projectId] || 0) + 1;
    });

    return {
      total: mappings.length,
      byProject,
    };
  }, [mappings]);

  // Add mapping
  const addMapping = useCallback(
    async (data: {
      projectId: string;
      sourceOrigin: string;
      originTable: string;
      destinationTable: string;
      fieldMappings?: Record<string, unknown>;
      scriptSnippet?: string;
      scriptUrl?: string;
    }) => {
      try {
        const { error } = await supabase.from("conversion_mappings").insert({
          project_id: data.projectId,
          source_origin: data.sourceOrigin,
          origin_table: data.originTable,
          destination_table: data.destinationTable,
          field_mappings: data.fieldMappings || null,
          script_snippet: data.scriptSnippet || null,
          script_url: data.scriptUrl || null,
        });

        if (error) throw error;
        await fetchMappings();
        return true;
      } catch (err) {
        console.error("Error adding mapping:", err);
        return false;
      }
    },
    [fetchMappings]
  );

  // Update mapping
  const updateMapping = useCallback(
    async (
      mappingId: string,
      data: Partial<{
        sourceOrigin: string;
        originTable: string;
        destinationTable: string;
        fieldMappings: Record<string, unknown>;
        scriptSnippet: string;
        scriptUrl: string;
      }>
    ) => {
      try {
        const updates: Record<string, unknown> = {};
        if (data.sourceOrigin !== undefined)
          updates.source_origin = data.sourceOrigin;
        if (data.originTable !== undefined)
          updates.origin_table = data.originTable;
        if (data.destinationTable !== undefined)
          updates.destination_table = data.destinationTable;
        if (data.fieldMappings !== undefined)
          updates.field_mappings = data.fieldMappings;
        if (data.scriptSnippet !== undefined)
          updates.script_snippet = data.scriptSnippet;
        if (data.scriptUrl !== undefined) updates.script_url = data.scriptUrl;

        const { error } = await supabase
          .from("conversion_mappings")
          .update(updates)
          .eq("id", mappingId);

        if (error) throw error;
        await fetchMappings();
        return true;
      } catch (err) {
        console.error("Error updating mapping:", err);
        return false;
      }
    },
    [fetchMappings]
  );

  // Delete mapping
  const deleteMapping = useCallback(
    async (mappingId: string) => {
      try {
        const { error } = await supabase
          .from("conversion_mappings")
          .delete()
          .eq("id", mappingId);

        if (error) throw error;
        await fetchMappings();
        return true;
      } catch (err) {
        console.error("Error deleting mapping:", err);
        return false;
      }
    },
    [fetchMappings]
  );

  return {
    mappings,
    stats,
    loading,
    error,
    addMapping,
    updateMapping,
    deleteMapping,
    refetch: fetchMappings,
  };
}
