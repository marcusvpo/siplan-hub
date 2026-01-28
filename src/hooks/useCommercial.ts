import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

export type Client = Database['public']['Tables']['clients']['Row'];
export type Contact = Database['public']['Tables']['client_contacts']['Row'];
export type Project = Database['public']['Tables']['projects']['Row'] & { commercial_notes?: string | null };

export const useCommercial = () => {
  const queryClient = useQueryClient();

  const { data: clients, isLoading: isLoadingClients } = useQuery({
    queryKey: ['commercial-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const { data: contacts, isLoading: isLoadingContacts } = useQuery({
    queryKey: ['commercial-contacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_contacts')
        .select(`
          *,
          clients (
            name
          )
        `)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });



  const { data: allCommercialNotes } = useQuery({
    queryKey: ['commercial-notes-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commercial_notes')
        .select('id, client_id, created_at, type, content, author_name')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: projectsWithClients, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['commercial-projects'],
    queryFn: async () => {
      // Fetch projects and join with clients if possible, usually we rely on client_id
      // but if client_id is null (migration pending), we fallback to client_name
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          clients (
            id,
            name
          )
        `)
        .eq('is_deleted', false)
        .eq('is_archived', false)
        .not('global_status', 'in', '("done","canceled")');
      
      if (error) throw error;
      return data;
    }
  });

  const createClient = useMutation({
    mutationFn: async (newClient: Database['public']['Tables']['clients']['Insert']) => {
      const { data, error } = await supabase.from('clients').insert(newClient).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-clients'] });
    }
  });

  const updateClient = useMutation({
    mutationFn: async ({ id, ...updates }: Database['public']['Tables']['clients']['Update'] & { id: string }) => {
      const { data, error } = await supabase.from('clients').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-clients'] });
      queryClient.invalidateQueries({ queryKey: ['commercial-projects'] });
    }
  });

  const createContact = useMutation({
    mutationFn: async (newContact: Database['public']['Tables']['client_contacts']['Insert']) => {
      const { data, error } = await supabase.from('client_contacts').insert(newContact).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-contacts'] });
    }
  });

  const updateContact = useMutation({
    mutationFn: async ({ id, ...updates }: Database['public']['Tables']['client_contacts']['Update'] & { id: string }) => {
      const { data, error } = await supabase.from('client_contacts').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-contacts'] });
    }
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('client_contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-contacts'] });
    }
  });

  return {
    clients,
    contacts,
    projectsWithClients,
    isLoadingClients,
    isLoadingContacts,
    isLoadingProjects,
    createClient,
    updateClient,
    createContact,
    updateContact,

    deleteContact,
    allCommercialNotes
  };
};
