import { useContext, useMemo } from 'react';
import { QueryClient, QueryClientContext, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProjectV2 } from '@/types/ProjectV2';
import { toast } from '@/components/ui/use-toast';
import {
  buildSkillsObservacoes,
  formatSkillsCredentialsForCopy,
  generateSkillsUsernameFromProject,
  getDefaultSkillsExpirationDate,
  getExpectedSkillsProductsForSystems,
  isEligibleSkillsSystemType,
  normalizeEligibleOrionSystems,
  OrionSkillsSystemType,
  sanitizeSkillsUsername,
} from '@/utils/skills-username-generator';

export interface SkillsReleasedProduct {
  produto_id: string;
  produto_nome: string;
  sistema_id: string;
  sistema_nome: string;
}

export interface SiblingProjectSummary {
  id: string;
  client_name: string;
  system_type: string;
  ticket_number: string | null;
  custom_fields?: Record<string, unknown>;
}

export interface StoredSkillsCredentials {
  cartorioId: string;
  cartorioNome: string;
  userId: string | null;
  username: string;
  loginToken: string;
  expirationDate: string;
  observacoes: string;
  systemsReleased: OrionSkillsSystemType[];
  productsReleased: SkillsReleasedProduct[];
  portalUrl: string;
  lastActivity: string | null;
  sessionIsActive: boolean;
  provisionedAt: string | null;
  provisionedBy: string | null;
}

export interface SkillsActivityRecord {
  last_activity: string | null;
  session_is_active: boolean;
}

async function parseEdgeFunctionError(error: unknown, fallbackMessage: string): Promise<string> {
  if (!error) return fallbackMessage;
  try {
    const errObj = error as { message?: string; context?: Response };
    if (errObj.context && typeof errObj.context.json === 'function') {
      const body = await errObj.context.clone().json();
      if (body?.error && typeof body.error === 'string') {
        return body.error;
      }
    }
    if (errObj.message && errObj.message !== 'Edge Function returned a non-2xx status code') {
      return errObj.message;
    }
  } catch {
    // Ignora falha de parse do contexto HTTP
  }
  return fallbackMessage;
}

export function extractSkillsCredentialsFromFields(
  fields?: Record<string, unknown> | null
): StoredSkillsCredentials | null {
  if (!fields) return null;
  const username = typeof fields.skills_username === 'string' ? fields.skills_username.trim() : '';
  const loginToken = typeof fields.skills_login_token === 'string' ? fields.skills_login_token.trim() : '';
  const cartorioId = typeof fields.skills_cartorio_id === 'string' ? fields.skills_cartorio_id.trim() : '';

  if (!username || !loginToken || !cartorioId) {
    return null;
  }

  const rawSystems = Array.isArray(fields.skills_systems_released)
    ? (fields.skills_systems_released as string[])
    : [];

  const rawProducts = Array.isArray(fields.skills_products_released)
    ? (fields.skills_products_released as SkillsReleasedProduct[])
    : [];

  return {
    cartorioId,
    cartorioNome: typeof fields.skills_cartorio_nome === 'string' ? fields.skills_cartorio_nome : '',
    userId: typeof fields.skills_user_id === 'string' ? fields.skills_user_id : null,
    username,
    loginToken,
    expirationDate:
      typeof fields.skills_expiration_date === 'string'
        ? fields.skills_expiration_date
        : getDefaultSkillsExpirationDate(),
    observacoes: typeof fields.skills_observacoes === 'string' ? fields.skills_observacoes : '',
    systemsReleased: normalizeEligibleOrionSystems(rawSystems),
    productsReleased: rawProducts,
    portalUrl:
      typeof fields.skills_portal_url === 'string' && fields.skills_portal_url.trim()
        ? fields.skills_portal_url.trim()
        : 'https://skills.siplan.com.br/',
    lastActivity:
      typeof fields.skills_last_activity === 'string' && fields.skills_last_activity.trim()
        ? fields.skills_last_activity.trim()
        : null,
    sessionIsActive: Boolean(fields.skills_session_is_active),
    provisionedAt: typeof fields.skills_provisioned_at === 'string' ? fields.skills_provisioned_at : null,
    provisionedBy: typeof fields.skills_provisioned_by === 'string' ? fields.skills_provisioned_by : null,
  };
}

const fallbackQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      enabled: false,
    },
  },
});

/**
 * Busca em lote (1 única requisição compartilhada pelo React Query) o farol de atividade
 * de todos os cartórios no Siplan Skills para alimentar as tags dos cards em /projects.
 */
export function useSkillsBatchActivity(enabled = true) {
  const contextClient = useContext(QueryClientContext);

  return useQuery(
    {
      queryKey: ['skillsBatchActivityMap'],
      queryFn: async (): Promise<Record<string, SkillsActivityRecord>> => {
        const { data, error } = await supabase.functions.invoke('siplan-skills-integration', {
          body: {
            action: 'get_batch_activity',
          },
        });
        if (error || data?.error || !data?.activityMap) {
          return {};
        }
        return data.activityMap as Record<string, SkillsActivityRecord>;
      },
      enabled: Boolean(enabled && contextClient),
      staleTime: 30 * 1000,
      refetchInterval: 60 * 1000,
      retry: false,
      refetchOnWindowFocus: false,
    },
    contextClient || fallbackQueryClient
  );
}

export function useSiplanSkillsIntegration(project: ProjectV2 | null | undefined) {
  const queryClient = useQueryClient();
  const projectId = project?.id;
  const isEligible = isEligibleSkillsSystemType(project?.systemType);

  const siblingGroupQuery = useQuery({
    queryKey: ['projectSkillsGroup', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase.rpc('get_project_skills_sibling_group', {
        p_project_id: projectId,
      });
      if (error) {
        console.warn('[useSiplanSkillsIntegration] Erro ao buscar grupo de projetos irmãos:', error.message);
        return null;
      }
      return data as {
        target_project: SiblingProjectSummary;
        sibling_projects: SiblingProjectSummary[];
        orion_systems: string[];
        existing_cartorio_id: string | null;
      } | null;
    },
    enabled: Boolean(projectId && isEligible),
    staleTime: 1000 * 60 * 2,
  });

  const siblingProjects = useMemo<SiblingProjectSummary[]>(() => {
    if (siblingGroupQuery.data?.sibling_projects?.length) {
      return siblingGroupQuery.data.sibling_projects;
    }
    if (project && isEligible) {
      return [
        {
          id: project.id,
          client_name: project.clientName,
          system_type: project.systemType,
          ticket_number: project.ticketNumber,
          custom_fields: project.customFields,
        },
      ];
    }
    return [];
  }, [siblingGroupQuery.data, project, isEligible]);

  const orionSystems = useMemo<OrionSkillsSystemType[]>(() => {
    if (siblingGroupQuery.data?.orion_systems?.length) {
      return normalizeEligibleOrionSystems(siblingGroupQuery.data.orion_systems);
    }
    return normalizeEligibleOrionSystems([project?.systemType]);
  }, [siblingGroupQuery.data, project?.systemType]);

  const parsedSuggestion = useMemo(() => {
    const baseName = project?.clientName || '';
    const parsed = generateSkillsUsernameFromProject(baseName, orionSystems);
    const expectedProducts = getExpectedSkillsProductsForSystems(orionSystems);
    const expectedObservacoes = buildSkillsObservacoes(orionSystems);
    const defaultExpirationDate = getDefaultSkillsExpirationDate();

    return {
      ...parsed,
      expectedProducts,
      expectedObservacoes,
      defaultExpirationDate,
    };
  }, [project?.clientName, orionSystems]);

  // Credenciais armazenadas localmente no projeto ou nos projetos irmãos
  const storedCredentials = useMemo<StoredSkillsCredentials | null>(() => {
    const direct = extractSkillsCredentialsFromFields(project?.customFields);
    if (direct) return direct;

    for (const sibling of siblingProjects) {
      const fromSibling = extractSkillsCredentialsFromFields(sibling.custom_fields);
      if (fromSibling) return fromSibling;
    }
    return null;
  }, [project?.customFields, siblingProjects]);

  // Consulta em tempo real no banco do Siplan Skills (status de atividade online / último acesso + credenciais)
  const liveStatusQuery = useQuery({
    queryKey: [
      'projectSkillsLiveStatus',
      projectId,
      storedCredentials?.cartorioId || parsedSuggestion.username,
    ],
    queryFn: async () => {
      if (!projectId || !isEligible) return null;
      const { data, error } = await supabase.functions.invoke('siplan-skills-integration', {
        body: {
          action: 'get_status',
          projectId,
          cartorioId: storedCredentials?.cartorioId || null,
          cartorioNome: parsedSuggestion.cleanCartorioName,
          candidateUsernames: parsedSuggestion.candidateUsernames,
        },
      });
      if (error || data?.error) {
        return null;
      }
      return data?.status as {
        found: boolean;
        cartorio_id?: string;
        cartorio_nome?: string;
        user_id?: string | null;
        username?: string;
        login_token?: string;
        data_expiracao?: string;
        observacoes?: string;
        systems_released?: string[];
        products_released?: SkillsReleasedProduct[];
        portal_url?: string;
        last_activity?: string | null;
        session_is_active?: boolean;
      } | null;
    },
    enabled: Boolean(projectId && isEligible),
    staleTime: 30 * 1000,
    refetchInterval: 45 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Combina credenciais persistidas com os dados ao vivo vindos do Siplan Skills
  const credentials = useMemo<StoredSkillsCredentials | null>(() => {
    const live = liveStatusQuery.data;
    if (live?.found && live.cartorio_id && live.username && live.login_token) {
      return {
        cartorioId: live.cartorio_id,
        cartorioNome: live.cartorio_nome || storedCredentials?.cartorioNome || '',
        userId: live.user_id ?? storedCredentials?.userId ?? null,
        username: live.username,
        loginToken: live.login_token,
        expirationDate:
          live.data_expiracao || storedCredentials?.expirationDate || getDefaultSkillsExpirationDate(),
        observacoes: live.observacoes ?? storedCredentials?.observacoes ?? '',
        systemsReleased: normalizeEligibleOrionSystems(
          live.systems_released?.length ? live.systems_released : storedCredentials?.systemsReleased || []
        ),
        productsReleased: live.products_released?.length
          ? live.products_released
          : storedCredentials?.productsReleased || [],
        portalUrl: live.portal_url || storedCredentials?.portalUrl || 'https://skills.siplan.com.br/',
        lastActivity: live.last_activity ?? storedCredentials?.lastActivity ?? null,
        sessionIsActive: Boolean(live.session_is_active ?? storedCredentials?.sessionIsActive),
        provisionedAt: storedCredentials?.provisionedAt || null,
        provisionedBy: storedCredentials?.provisionedBy || 'Sincronizado com Siplan Skills',
      };
    }
    return storedCredentials;
  }, [storedCredentials, liveStatusQuery.data]);

  const isProvisioned = Boolean(credentials);

  // Detecta se algum projeto irmão novo ainda não está com o sistema liberado no acesso existente
  const needsSync = useMemo<boolean>(() => {
    if (!credentials) return false;
    const directHasToken = Boolean(extractSkillsCredentialsFromFields(project?.customFields));
    if (!directHasToken && !liveStatusQuery.data?.found) return true;

    for (const sys of orionSystems) {
      if (!credentials.systemsReleased.includes(sys)) {
        return true;
      }
    }
    return false;
  }, [credentials, project?.customFields, orionSystems, liveStatusQuery.data?.found]);

  const invalidateProjectQueries = async (affectedSiblingIds: string[]) => {
    const allIds = Array.from(new Set([projectId, ...affectedSiblingIds].filter(Boolean) as string[]));
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['projectSkillsGroup'] }),
      queryClient.invalidateQueries({ queryKey: ['projectSkillsLiveStatus'] }),
      queryClient.invalidateQueries({ queryKey: ['skillsBatchActivityMap'] }),
      queryClient.invalidateQueries({ queryKey: ['projectsList'] }),
      queryClient.invalidateQueries({ queryKey: ['projects'] }),
      queryClient.invalidateQueries({ queryKey: ['projectsV3'] }),
      queryClient.invalidateQueries({ queryKey: ['projectsV3_with_dates'] }),
      ...allIds.map((id) => queryClient.invalidateQueries({ queryKey: ['projectDetails', id] })),
    ]);
  };

  const provisionMutation = useMutation({
    mutationFn: async (customUsername?: string) => {
      if (!projectId || !isEligible) {
        throw new Error('Projeto não elegível para o Siplan Skills.');
      }

      const suggestedUsername = customUsername
        ? sanitizeSkillsUsername(customUsername)
        : parsedSuggestion.username;

      const { data, error } = await supabase.functions.invoke('siplan-skills-integration', {
        body: {
          action: 'provision',
          projectId,
          cartorioNome: parsedSuggestion.cleanCartorioName,
          suggestedUsername,
          candidateUsernames: parsedSuggestion.candidateUsernames,
        },
      });

      if (error) {
        const detailedMsg = await parseEdgeFunctionError(
          error,
          'Falha ao comunicar com a integração do Siplan Skills.'
        );
        throw new Error(detailedMsg);
      }
      if (data?.error) {
        throw new Error(data.error);
      }

      return data as {
        skills: {
          cartorio_id: string;
          cartorio_nome: string;
          is_new_cartorio: boolean;
          user_id: string;
          username: string;
          login_token: string;
          data_expiracao: string;
          observacoes: string;
          systems_released: OrionSkillsSystemType[];
          products_released: SkillsReleasedProduct[];
          portal_url: string;
          last_activity?: string | null;
          session_is_active?: boolean;
          provisioned_by: string;
          provisioned_at: string;
        };
        siblingProjects: SiblingProjectSummary[];
        orionSystems: OrionSkillsSystemType[];
      };
    },
    onSuccess: async (data) => {
      const siblingIds = (data.siblingProjects || []).map((s) => s.id);
      await invalidateProjectQueries(siblingIds);

      toast({
        title: data.skills.is_new_cartorio
          ? 'Acesso Siplan Skills criado com sucesso!'
          : 'Acesso Siplan Skills sincronizado com sucesso!',
        description: `Usuário: ${data.skills.username} | Token: ${data.skills.login_token}`,
      });
    },
    onError: (err: Error) => {
      toast({
        title: 'Erro ao provisionar acesso no Siplan Skills',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const updateUsernameMutation = useMutation({
    mutationFn: async (newUsername: string) => {
      if (!projectId || !credentials?.cartorioId) {
        throw new Error('Nenhum cartório vinculado para atualizar o nome de usuário.');
      }

      const sanitized = sanitizeSkillsUsername(newUsername);
      if (!sanitized || sanitized.length < 3) {
        throw new Error('Informe um nome de usuário válido (mínimo de 3 caracteres).');
      }

      const { data, error } = await supabase.functions.invoke('siplan-skills-integration', {
        body: {
          action: 'update_username',
          projectId,
          cartorioId: credentials.cartorioId,
          userId: credentials.userId,
          newUsername: sanitized,
        },
      });

      if (error) {
        const detailedMsg = await parseEdgeFunctionError(
          error,
          'Falha ao atualizar nome de usuário no Siplan Skills.'
        );
        throw new Error(detailedMsg);
      }
      if (data?.error) {
        throw new Error(data.error);
      }

      return data as {
        username: string;
        user_id: string;
        siblingIds: string[];
      };
    },
    onSuccess: async (data) => {
      await invalidateProjectQueries(data.siblingIds || []);
      toast({
        title: 'Nome de usuário atualizado!',
        description: `O login no Siplan Skills agora é "${data.username}".`,
      });
    },
    onError: (err: Error) => {
      toast({
        title: 'Erro ao atualizar usuário',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const copyCredentials = async (
    overrideUsername?: string,
    overrideToken?: string,
    overrideClientName?: string
  ) => {
    const userToCopy = overrideUsername || credentials?.username;
    const tokenToCopy = overrideToken || credentials?.loginToken;
    const urlToCopy = credentials?.portalUrl || 'https://skills.siplan.com.br/';
    const clientNameToCopy =
      overrideClientName ||
      parsedSuggestion.cleanCartorioName ||
      project?.clientName ||
      credentials?.cartorioNome ||
      '';

    if (!userToCopy || !tokenToCopy) return false;

    const formatted = formatSkillsCredentialsForCopy(
      userToCopy,
      tokenToCopy,
      clientNameToCopy,
      urlToCopy
    );
    await navigator.clipboard.writeText(formatted);
    toast({
      title: 'Credenciais copiadas!',
      description: `Acesso de "${userToCopy}" copiado no formato oficial do Siplan Skills.`,
    });
    return true;
  };

  return {
    isEligible,
    isLoadingGroup: siblingGroupQuery.isLoading,
    isLoadingLiveStatus: liveStatusQuery.isFetching,
    refetchLiveStatus: liveStatusQuery.refetch,
    siblingProjects,
    orionSystems,
    credentials,
    isProvisioned,
    needsSync,
    parsedSuggestion,
    provisionSkillsAccess: provisionMutation.mutateAsync,
    isProvisioning: provisionMutation.isPending,
    updateSkillsUsername: updateUsernameMutation.mutateAsync,
    isUpdatingUsername: updateUsernameMutation.isPending,
    copyCredentials,
  };
}
