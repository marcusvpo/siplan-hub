import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ResponsibleMapping {
  id: string;
  name: string;
  user_id: string | null;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
}

export function useResponsibleMapping() {
  const { data: mappings, isLoading } = useQuery({
    queryKey: ['responsibleMappings'],
    queryFn: async () => {
      // Typically we want mappings that HAVE a user_id, but keeping all might be useful for debugging
      const { data, error } = await supabase
        .from('responsible_name_mapping')
        .select(`
          id,
          name,
          user_id,
          profiles (
            full_name,
            email
          )
        `);
        
      if (error) throw error;
      
      // Transform to match the interface if needed, but Supabase return type is close enough usually 
      // if we don't care about exact null/undefined matches for optional joins
      return data as unknown as ResponsibleMapping[];
    }
  });

  /**
   * Given a historical name string (e.g. "Bruno Fernandes"), returns the mapped user ID (UUID).
   */
  const resolveNameToId = (name: string | null | undefined): string | null | undefined => {
    if (!name) return name;
    // Normalized lookup? For now exact match as populated in DB
    const mapping = mappings?.find(m => m.name === name);
    return mapping?.user_id;
  };

  /**
   * Given a user ID, returns the resolved name.
   * Prefers the current profile full_name, falls back to the historical mapped name.
   */
  const resolveIdToName = (userId: string | null | undefined): string | null | undefined => {
    if (!userId) return userId;
    
    // Find any mapping that points to this user_id
    const mapping = mappings?.find(m => m.user_id === userId);
    
    // Return profile name if available
    if (mapping?.profiles?.full_name) {
      return mapping.profiles.full_name;
    }
    
    // Fallback to the mapping name key itself (which was the historical name)
    return mapping?.name;
  };

  return { 
    mappings, 
    isLoading,
    resolveNameToId, 
    resolveIdToName 
  };
}
