import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Stub types for future commercial module tables
// These tables don't exist yet: clients, client_contacts, commercial_notes
export type Client = {
  id: string;
  name: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
};

export type Contact = {
  id: string;
  client_id: string;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  notes?: string;
  clients?: { name: string };
};

export type Project = {
  id: string;
  client_name: string;
  system_type: string;
  global_status?: string;
  infra_status?: string;
  adherence_status?: string;
  environment_status?: string;
  conversion_status?: string;
  implementation_status?: string;
  post_status?: string;
  infra_blocking_reason?: string;
  ticket_number?: string;
  sold_hours?: number;
  tags?: string[];
  updated_at: string;
  created_at: string;
  project_leader?: string;
  project_type?: string;
  commercial_notes?: string | null;
  client_id?: string;
  go_live_date?: string;
};

/**
 * Stub hook for future Commercial Module.
 * 
 * The following tables are required but don't exist yet:
 * - clients
 * - client_contacts  
 * - commercial_notes
 * 
 * To enable this module, create the required tables in the database.
 */
export const useCommercial = () => {
  const queryClient = useQueryClient();

  // Stub queries returning empty data
  const { data: clients, isLoading: isLoadingClients } = useQuery({
    queryKey: ['commercial-clients'],
    queryFn: async () => {
      console.warn('[useCommercial] clients table not implemented');
      return [] as Client[];
    }
  });

  const { data: contacts, isLoading: isLoadingContacts } = useQuery({
    queryKey: ['commercial-contacts'],
    queryFn: async () => {
      console.warn('[useCommercial] client_contacts table not implemented');
      return [] as Contact[];
    }
  });

  const { data: allCommercialNotes } = useQuery({
    queryKey: ['commercial-notes-all'],
    queryFn: async () => {
      console.warn('[useCommercial] commercial_notes table not implemented');
      return [] as { id: string; client_id: string; created_at?: string; type?: string; content?: string; author_name?: string }[];
    }
  });

  const { data: projectsWithClients, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['commercial-projects'],
    queryFn: async () => {
      console.warn('[useCommercial] projectsWithClients not implemented - requires clients table');
      return [] as Project[];
    }
  });

  // Stub mutations that do nothing
  const createClient = useMutation({
    mutationFn: async (_newClient: Partial<Client>) => {
      console.warn('[useCommercial] createClient not implemented');
      throw new Error('clients table not implemented');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-clients'] });
    }
  });

  const updateClient = useMutation({
    mutationFn: async (_updates: Partial<Client> & { id: string }) => {
      console.warn('[useCommercial] updateClient not implemented');
      throw new Error('clients table not implemented');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-clients'] });
      queryClient.invalidateQueries({ queryKey: ['commercial-projects'] });
    }
  });

  const createContact = useMutation({
    mutationFn: async (_newContact: Partial<Contact>) => {
      console.warn('[useCommercial] createContact not implemented');
      throw new Error('client_contacts table not implemented');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-contacts'] });
    }
  });

  const updateContact = useMutation({
    mutationFn: async (_updates: Partial<Contact> & { id: string }) => {
      console.warn('[useCommercial] updateContact not implemented');
      throw new Error('client_contacts table not implemented');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-contacts'] });
    }
  });

  const deleteContact = useMutation({
    mutationFn: async (_id: string) => {
      console.warn('[useCommercial] deleteContact not implemented');
      throw new Error('client_contacts table not implemented');
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
