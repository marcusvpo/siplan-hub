import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';
import type { 
  Notification, 
  NotificationCategory, 
  NotificationPriority, 
  NotificationStage, 
  NotificationType, 
  TeamArea 
} from '@/types/conversion';

export interface UseNotificationsOptions {
  userId?: string;
  team?: TeamArea;
  category?: 'all' | 'operational' | 'changelog';
  stage?: NotificationStage;
  priority?: NotificationPriority;
  onlyUnread?: boolean;
  limit?: number;
  adminMode?: boolean;
  showToasts?: boolean;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { 
    userId, 
    team, 
    category = 'all', 
    stage, 
    priority, 
    onlyUnread = false, 
    limit = 50,
    adminMode = false,
    showToasts = false,
  } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  let hasPermissionFunc: ((resource: string, action: string) => boolean) | null = null;
  try {
    const permContext = usePermissions();
    hasPermissionFunc = permContext.hasPermission;
  } catch {
    hasPermissionFunc = null;
  }

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      
      const pastWindow = new Date();
      // Admins têm histórico estendido de 90 dias; usuários comuns usam 30 dias
      pastWindow.setDate(pastWindow.getDate() - (adminMode ? 90 : 30));
      
      let query = supabase
        .from('notifications')
        .select(`
          id,
          user_id,
          team,
          project_id,
          type,
          stage,
          priority,
          title,
          message,
          action_url,
          read,
          created_at,
          read_at,
          permission_resource,
          category,
          projects(client_name)
        `)
        .gte('created_at', pastWindow.toISOString())
        .order('created_at', { ascending: false })
        .limit(limit);

      // Regras de isolamento e filtros
      if (!adminMode) {
        const orFilters: string[] = [];
        if (userId) {
          orFilters.push(`user_id.eq.${userId}`);
        }
        if (team) {
          orFilters.push(`team.eq.${team}`);
        }
        // Se a busca permitir novidades, traz as novidades globais
        if (category === 'all' || category === 'changelog') {
          orFilters.push(`category.eq.changelog`);
        }

        if (orFilters.length > 0) {
          query = query.or(orFilters.join(','));
        }
      }

      if (category !== 'all') {
        query = query.eq('category', category);
      }

      if (stage) {
        query = query.eq('stage', stage);
      }

      if (priority) {
        query = query.eq('priority', priority);
      }

      if (onlyUnread) {
        query = query.eq('read', false);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const mapped: Notification[] = (data || [])
        .map((n: Record<string, unknown>) => ({
          id: n.id as string,
          userId: (n.user_id as string) ?? undefined,
          team: n.team as TeamArea | undefined,
          projectId: (n.project_id as string) ?? undefined,
          type: n.type as NotificationType,
          stage: (n.stage as NotificationStage) ?? 'general',
          priority: (n.priority as NotificationPriority) ?? 'normal',
          title: n.title as string,
          message: n.message as string,
          actionUrl: (n.action_url as string) ?? undefined,
          read: (n.read as boolean) ?? false,
          createdAt: new Date(n.created_at as string),
          readAt: n.read_at ? new Date(n.read_at as string) : undefined,
          projectName: (n.projects as { client_name?: string } | null)?.client_name,
          permissionResource: (n.permission_resource as string) ?? undefined,
          category: (n.category as NotificationCategory) ?? ((n.type as string)?.startsWith('release_') ? 'changelog' : 'operational'),
        }))
        .filter((n) => {
          if (n.permissionResource && hasPermissionFunc) {
            return hasPermissionFunc(n.permissionResource, 'view');
          }
          return true;
        });

      setNotifications(mapped);
      setUnreadCount(mapped.filter((n) => !n.read).length);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar notificações');
    } finally {
      setLoading(false);
    }
  }, [userId, team, category, stage, priority, onlyUnread, limit, adminMode, hasPermissionFunc]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (updateError) throw updateError;

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read: true, readAt: new Date() } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Erro ao marcar notificação como lida:', err);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (deleteError) throw deleteError;

      setNotifications((prev) => {
        const target = prev.find((n) => n.id === notificationId);
        if (target && !target.read) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return prev.filter((n) => n.id !== notificationId);
      });
    } catch (err) {
      console.error('Erro ao excluir notificação:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const idsToUpdate = notifications.filter((n) => !n.read).map((n) => n.id);
      if (idsToUpdate.length === 0) return;

      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .in('id', idsToUpdate);

      if (updateError) throw updateError;

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, readAt: new Date() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Erro ao marcar todas como lidas:', err);
    }
  }, [notifications]);

  const createNotification = useCallback(
    async (data: {
      userId?: string;
      team?: TeamArea;
      projectId?: string;
      type: NotificationType;
      stage?: NotificationStage;
      priority?: NotificationPriority;
      title: string;
      message: string;
      actionUrl?: string;
      permissionResource?: string;
      category?: NotificationCategory;
    }) => {
      try {
        const { data: newNotif, error: insertError } = await supabase
          .from('notifications')
          .insert({
            user_id: data.userId,
            team: data.team,
            project_id: data.projectId,
            type: data.type,
            stage: data.stage ?? 'general',
            priority: data.priority ?? 'normal',
            title: data.title,
            message: data.message,
            action_url: data.actionUrl,
            permission_resource: data.permissionResource,
            category: data.category ?? (data.type.startsWith('release_') ? 'changelog' : 'operational'),
          })
          .select()
          .single();

        if (insertError) throw insertError;

        return newNotif?.id;
      } catch (err) {
        console.error('Erro ao criar notificação:', err);
        return null;
      }
    },
    []
  );

  // Subscrição em Tempo Real (Supabase Realtime)
  useEffect(() => {
    fetchNotifications();

    if (typeof (supabase as any)?.channel !== 'function') {
      return;
    }

    const channel = supabase
      .channel('notifications-changes-' + (userId || 'global'))
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const newNotif = payload.new as Record<string, unknown>;
          
          const isChangelog = newNotif.category === 'changelog' || (newNotif.type as string)?.startsWith('release_');
          const belongsToUser = userId && newNotif.user_id === userId;
          const belongsToTeam = team && newNotif.team === team;
          
          if (!adminMode && !belongsToUser && !belongsToTeam && !isChangelog) return;

          if (newNotif.permission_resource && hasPermissionFunc && !hasPermissionFunc(newNotif.permission_resource as string, 'view')) {
            return;
          }

          const mapped: Notification = {
            id: newNotif.id as string,
            userId: newNotif.user_id as string | undefined,
            team: newNotif.team as TeamArea | undefined,
            projectId: newNotif.project_id as string | undefined,
            type: newNotif.type as NotificationType,
            stage: (newNotif.stage as NotificationStage) ?? 'general',
            priority: (newNotif.priority as NotificationPriority) ?? 'normal',
            title: newNotif.title as string,
            message: newNotif.message as string,
            actionUrl: newNotif.action_url as string | undefined,
            read: false,
            createdAt: new Date(newNotif.created_at as string),
            permissionResource: newNotif.permission_resource as string | undefined,
            category: (newNotif.category as NotificationCategory) ?? ((newNotif.type as string)?.startsWith('release_') ? 'changelog' : 'operational'),
          };

          setNotifications((prev) => [mapped, ...prev]);
          setUnreadCount((prev) => prev + 1);

          // Dispara toast em tempo real se habilitado e não for novidade genérica
          if (showToasts && belongsToUser && !isChangelog) {
            toast.info(mapped.title, {
              description: mapped.message,
              action: mapped.actionUrl
                ? {
                    label: 'Ver',
                    onClick: () => {
                      window.location.href = mapped.actionUrl!;
                    },
                  }
                : undefined,
            });
          }
        }
      )
      .subscribe();

    return () => {
      if (typeof (supabase as any)?.removeChannel === 'function') {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchNotifications, userId, team, adminMode, showToasts, hasPermissionFunc]);

  // Contadores separados por tipo
  const operationalUnreadCount = useMemo(() => {
    return notifications.filter(
      (n) => !n.read && n.category !== 'changelog' && !n.type.startsWith('release_')
    ).length;
  }, [notifications]);

  const changelogUnreadCount = useMemo(() => {
    return notifications.filter(
      (n) => !n.read && (n.category === 'changelog' || n.type.startsWith('release_'))
    ).length;
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    operationalUnreadCount,
    changelogUnreadCount,
    loading,
    error,
    markAsRead,
    deleteNotification,
    markAllAsRead,
    createNotification,
    refetch: fetchNotifications,
  };
}
