import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  getMyDayTaskAttentionAt,
  type MyDayTask,
} from "@/lib/my-day-workspace";

export type MyDayNotificationPermission = NotificationPermission | "unsupported";

function currentPermission(): MyDayNotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

async function showReminderNotification(
  title: string,
  body: string,
  tag: string,
) {
  if ("serviceWorker" in navigator) {
    try {
      const registration = navigator.serviceWorker.controller
        ? await navigator.serviceWorker.ready
        : await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(title, {
          body,
          tag,
          data: { path: "/meu-dia" },
        });
        return;
      }
    } catch {
      // Usa a notificação da janela quando o service worker ainda não está pronto.
    }
  }

  const notification = new Notification(title, { body, tag });
  notification.onclick = () => {
    window.focus();
    window.location.assign("/meu-dia");
    notification.close();
  };
}

export function useMyDayReminders({
  userId,
  tasks,
  enabled,
}: {
  userId?: string;
  tasks: MyDayTask[];
  enabled: boolean;
}) {
  const [permission, setPermission] = useState<MyDayNotificationPermission>(currentPermission);
  const notifiedRef = useRef(new Set<string>());
  const storageKey = userId ? `siplan:my-day:reminders:${userId}` : null;

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    try {
      const stored = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
      notifiedRef.current = new Set(Array.isArray(stored) ? stored : []);
    } catch {
      notifiedRef.current = new Set();
    }
  }, [storageKey]);

  const checkReminders = useCallback(() => {
    if (!enabled || permission !== "granted" || !storageKey) return;

    const now = Date.now();
    let changed = false;
    for (const task of tasks) {
      if (task.status !== "pending" || task.reminderMinutes === null) continue;
      const attentionAt = getMyDayTaskAttentionAt(task);
      const reminderAt = attentionAt.getTime() - task.reminderMinutes * 60_000;
      if (now < reminderAt || now > attentionAt.getTime() + 24 * 60 * 60_000) continue;

      const notificationKey = `${task.id}:${attentionAt.toISOString()}:${task.reminderMinutes}`;
      if (notifiedRef.current.has(notificationKey)) continue;

      notifiedRef.current.add(notificationKey);
      changed = true;
      const body = `Prazo ${format(attentionAt, "dd/MM 'às' HH:mm")}`;
      void showReminderNotification(`Meu Dia: ${task.title}`, body, notificationKey)
        .catch(() => undefined);
      toast.info(task.title, { description: body });
    }

    if (changed) {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify([...notifiedRef.current].slice(-200)));
      } catch {
        // O lembrete continua funcionando durante a sessão sem persistência local.
      }
    }
  }, [enabled, permission, storageKey, tasks]);

  useEffect(() => {
    checkReminders();
    const intervalId = window.setInterval(checkReminders, 30_000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") checkReminders();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [checkReminders]);

  const requestPermission = useCallback(async () => {
    if (currentPermission() === "unsupported") {
      setPermission("unsupported");
      return false;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    return result === "granted";
  }, []);

  return { permission, requestPermission, checkReminders };
}
