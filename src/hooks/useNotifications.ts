import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import type { Notification, NotificationCategory, NotificationType, TeamArea } from '@/types/conversion';

interface UseNotificationsOptions {
  userId?: string;
  team?: TeamArea;
  limit?: number;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { userId, team, limit = 50 } = options;
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
      
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      
      const orFilters: string[] = [];
      if (userId) {
        orFilters.push(`user_id.eq.${userId}`);
      }
      if (team) {
        orFilters.push(`team.eq.${team}`);
      }
      orFilters.push(`category.eq.changelog`);
      orFilters.push(`user_id.is.null`);

      let query = supabase
        .from('notifications')
        .select(`
          id,
          user_id,
          team,
          project_id,
          type,
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
        .gte('created_at', twoWeeksAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(limit);

      if (orFilters.length > 0) {
        query = query.or(orFilters.join(','));
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const mapped: Notification[] = (data || [])
        .map((n) => ({
          id: n.id,
          userId: n.user_id ?? undefined,
          team: n.team as TeamArea | undefined,
          projectId: n.project_id ?? undefined,
          type: n.type as NotificationType,
          title: n.title,
          message: n.message,
          actionUrl: n.action_url ?? undefined,
          read: n.read ?? false,
          createdAt: new Date(n.created_at),
          readAt: n.read_at ? new Date(n.read_at) : undefined,
          projectName: (n.projects as { client_name?: string } | null)?.client_name,
          permissionResource: n.permission_resource ?? undefined,
          category: (n.category as NotificationCategory) ?? (n.type?.startsWith('release_') ? 'changelog' : 'operational'),
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
  }, [userId, team, limit, hasPermissionFunc]);

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

  // Realtime subscription
  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('notifications-changes')
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
          const isGlobal = !newNotif.user_id && !newNotif.team;
          
          if (!belongsToUser && !belongsToTeam && !isChangelog && !isGlobal) return;

          if (newNotif.permission_resource && hasPermissionFunc && !hasPermissionFunc(newNotif.permission_resource as string, 'view')) {
            return;
          }

          const mapped: Notification = {
            id: newNotif.id as string,
            userId: newNotif.user_id as string | undefined,
            team: newNotif.team as TeamArea | undefined,
            projectId: newNotif.project_id as string | undefined,
            type: newNotif.type as NotificationType,
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, userId, team, hasPermissionFunc]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    deleteNotification,
    markAllAsRead,
    createNotification,
    refetch: fetchNotifications,
  };
}
