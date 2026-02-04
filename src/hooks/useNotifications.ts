import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Notification, NotificationType, TeamArea } from '@/types/conversion';

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

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      
      // Build OR filter for user_id and team
      // Users should see: their own notifications OR team-wide notifications for their team
      const orFilters: string[] = [];
      if (userId) {
        orFilters.push(`user_id.eq.${userId}`);
      }
      if (team) {
        orFilters.push(`team.eq.${team}`);
      }

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
          projects(client_name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      // Apply OR filter if we have any conditions
      if (orFilters.length > 0) {
        query = query.or(orFilters.join(','));
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const mapped: Notification[] = (data || []).map((n) => ({
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
      }));

      setNotifications(mapped);
      setUnreadCount(mapped.filter((n) => !n.read).length);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar notificações');
    } finally {
      setLoading(false);
    }
  }, [userId, team, limit]);

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

  const markAllAsRead = useCallback(async () => {
    try {
      let query = supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('read', false);

      if (userId) {
        query = query.eq('user_id', userId);
      }
      if (team) {
        query = query.eq('team', team);
      }

      const { error: updateError } = await query;
      if (updateError) throw updateError;

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, readAt: new Date() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Erro ao marcar todas como lidas:', err);
    }
  }, [userId, team]);

  const createNotification = useCallback(
    async (data: {
      userId?: string;
      team?: TeamArea;
      projectId?: string;
      type: NotificationType;
      title: string;
      message: string;
      actionUrl?: string;
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
          filter: team ? `team=eq.${team}` : undefined,
        },
        (payload) => {
          const newNotif = payload.new as Record<string, unknown>;
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
          };
          setNotifications((prev) => [mapped, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, team]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    createNotification,
    refetch: fetchNotifications,
  };
}
