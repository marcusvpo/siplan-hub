import { useMemo } from "react";
import { addDays, endOfDay, startOfDay, subDays } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Bot, type LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCopilot } from "@/hooks/useCopilot";
import { usePermissions } from "@/hooks/usePermissions";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { supabase } from "@/integrations/supabase/client";
import { buildMyDayProjects } from "@/lib/my-day";
import { menuItems } from "@/constants/menuItems";

const db = supabase as unknown as SupabaseClient;

export interface MyDayConversionIssue {
  id: string;
  projectId: string;
  clientName: string;
  ticketNumber: string;
  title: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress";
  updatedAt: Date;
}

export interface MyDayAppointment {
  id: string;
  title: string;
  startsAt: Date;
  status: string;
  appointmentType: string;
  location: string | null;
  officeName: string;
  isOverdue: boolean;
}

export interface MyDayShortcut {
  label: string;
  description: string;
  path: string;
  group: string;
  icon: LucideIcon;
}

interface RawConversionIssue {
  id: string;
  project_id: string;
  title: string;
  priority: MyDayConversionIssue["priority"];
  status: MyDayConversionIssue["status"];
  updated_at: string;
  projects: { client_name: string | null; ticket_number: string | null } | null;
}

interface RawAppointment {
  id: string;
  title: string;
  starts_at: string;
  status: string;
  appointment_type: string;
  location: string | null;
  is_lead: boolean;
  lead_office_name: string | null;
  cs_cx_registry_offices: { name: string | null } | null;
}

const ACTIVE_APPOINTMENT_STATUSES = new Set(["AGENDADO", "REMARCADO"]);
const ISSUE_PRIORITY = { critical: 4, high: 3, medium: 2, low: 1 } as const;

export function useMyDay() {
  const { user, fullName, team } = useAuth();
  const { hasPermission, isAdmin } = usePermissions();
  const {
    projects,
    isLoading: projectsLoading,
    isFetching: projectsFetching,
    error: projectsError,
    refetch: refetchProjects,
  } = useProjectsV2();
  const {
    digest,
    hasAccess: hasCopilotAccess,
    accessLoading: copilotLoading,
    error: copilotError,
    isRefreshing: copilotRefreshing,
    refreshSummary: refreshCopilot,
  } = useCopilot();

  const canOpenProjectDetails = isAdmin || hasPermission("projects", "view");
  const canViewConversion = isAdmin || hasPermission("conversion_home", "view");
  const canViewAppointments = isAdmin || hasPermission("cs_cx_agendamentos", "view");
  const canViewCalendar = isAdmin || hasPermission("calendar_projects", "view");
  const canRegisterHours = isAdmin || hasPermission("sd_time_entries", "view");
  const canViewDashboard = isAdmin || hasPermission("dashboard_view", "view");
  const canViewKanban = isAdmin || hasPermission("kanban", "view");
  const canViewTransition = isAdmin || hasPermission("implantadores_transicao", "view");
  const canViewProjects =
    canOpenProjectDetails ||
    canViewDashboard ||
    canViewKanban ||
    canViewCalendar ||
    canViewConversion ||
    canViewTransition;
  const projectOverviewPath = canOpenProjectDetails
    ? "/projects"
    : canViewConversion
      ? "/conversion/atividades"
      : canViewCalendar
        ? "/calendar"
        : canViewDashboard
          ? "/dashboard/indicadores"
          : canViewKanban
            ? "/dashboard/kanban"
            : "/implantadores/transicao";

  const availableShortcuts = useMemo(() => {
    const shortcuts: MyDayShortcut[] = [];
    const canAccess = (permissionKey?: string) =>
      isAdmin || !permissionKey || hasPermission(permissionKey, "view");

    for (const item of menuItems) {
      if (!canAccess(item.permissionKey)) continue;

      if (item.subItems?.length) {
        for (const subItem of item.subItems) {
          if (!canAccess(subItem.permissionKey)) continue;
          shortcuts.push({
            label: subItem.title,
            description: subItem.description ?? `Abrir ${subItem.title}`,
            path: subItem.path,
            group: item.title,
            icon: subItem.icon,
          });
        }
      } else if (item.path && item.path !== "/meu-dia") {
        shortcuts.push({
          label: item.title,
          description: item.description ?? `Abrir ${item.title}`,
          path: item.path,
          group: "Siplan HUB",
          icon: item.icon,
        });
      }
    }

    if (hasCopilotAccess) {
      shortcuts.push({
        label: "Copiloto",
        description: "Consulte o portfólio em linguagem natural",
        path: "/copilot",
        group: "Copiloto",
        icon: Bot,
      });
    }

    return [...new Map(shortcuts.map((shortcut) => [shortcut.path, shortcut])).values()];
  }, [hasCopilotAccess, hasPermission, isAdmin]);

  const defaultQuickLinkPaths = useMemo(() => {
    const preferredPaths = [
      "/projects",
      "/calendar",
      "/conversion/atividades",
      "/cs-cx/agendamentos",
      "/sd/horas",
      "/copilot",
    ];
    const availablePaths = new Set(availableShortcuts.map((shortcut) => shortcut.path));
    const preferred = preferredPaths.filter((path) => availablePaths.has(path));
    return [...preferred, ...availableShortcuts.map((shortcut) => shortcut.path)]
      .filter((path, index, paths) => paths.indexOf(path) === index)
      .slice(0, 6);
  }, [availableShortcuts]);

  const userId = user?.id;
  const identities = useMemo(
    () => [fullName, user?.email, user?.user_metadata?.full_name as string | undefined],
    [fullName, user?.email, user?.user_metadata?.full_name],
  );

  const myProjects = useMemo(
    () => (canViewProjects ? buildMyDayProjects(projects, identities) : []),
    [canViewProjects, identities, projects],
  );
  const portfolioProjects = useMemo(
    () =>
      canViewProjects && isAdmin
        ? buildMyDayProjects(projects, identities, { assignedOnly: false })
        : [],
    [canViewProjects, identities, isAdmin, projects],
  );

  const issuesQuery = useQuery({
    queryKey: ["my-day", "conversion-issues", userId],
    enabled: Boolean(userId && canViewConversion),
    queryFn: async () => {
      let query = db
        .from("conversion_issues")
        .select(`
          id, project_id, title, priority, status, updated_at,
          projects (client_name, ticket_number)
        `)
        .in("status", ["open", "in_progress"])
        .order("updated_at", { ascending: false })
        .limit(30);

      query = query.eq("assigned_to", userId as string);

      const { data, error } = await query;
      if (error) throw error;

      return ((data ?? []) as unknown as RawConversionIssue[])
        .map((issue) => ({
          id: issue.id,
          projectId: issue.project_id,
          clientName: issue.projects?.client_name ?? "Cliente não identificado",
          ticketNumber: issue.projects?.ticket_number ?? "Sem chamado",
          title: issue.title,
          priority: issue.priority,
          status: issue.status,
          updatedAt: new Date(issue.updated_at),
        }))
        .sort(
          (left, right) =>
            ISSUE_PRIORITY[right.priority] - ISSUE_PRIORITY[left.priority] ||
            right.updatedAt.getTime() - left.updatedAt.getTime(),
        ) satisfies MyDayConversionIssue[];
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
    refetchOnWindowFocus: true,
  });

  const appointmentsQuery = useQuery({
    queryKey: ["my-day", "appointments", userId],
    enabled: Boolean(userId && canViewAppointments),
    queryFn: async () => {
      const now = new Date();
      let query = db
        .from("cs_cx_appointments")
        .select(`
          id, title, starts_at, status, appointment_type, location,
          is_lead, lead_office_name,
          cs_cx_registry_offices (name)
        `)
        .eq("source_present", true)
        .gte("starts_at", startOfDay(subDays(now, 30)).toISOString())
        .lte("starts_at", endOfDay(addDays(now, 7)).toISOString())
        .order("starts_at", { ascending: true })
        .limit(40);

      query = query.eq("responsible_profile_id", userId as string);

      const { data, error } = await query;
      if (error) throw error;

      return ((data ?? []) as unknown as RawAppointment[])
        .filter((appointment) => ACTIVE_APPOINTMENT_STATUSES.has(appointment.status))
        .map((appointment) => {
          const startsAt = new Date(appointment.starts_at);
          return {
            id: appointment.id,
            title: appointment.title,
            startsAt,
            status: appointment.status,
            appointmentType: appointment.appointment_type,
            location: appointment.location,
            officeName: appointment.is_lead
              ? appointment.lead_office_name || "Lead comercial"
              : appointment.cs_cx_registry_offices?.name || "Cartório não identificado",
            isOverdue: startsAt.getTime() < now.getTime(),
          };
        }) satisfies MyDayAppointment[];
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
    refetchOnWindowFocus: true,
  });

  const issues = issuesQuery.data ?? [];
  const appointments = appointmentsQuery.data ?? [];

  return {
    userId,
    fullName,
    team,
    isAdmin,
    myProjects,
    portfolioProjects,
    issues,
    appointments,
    digest,
    hasCopilotAccess,
    availableShortcuts,
    defaultQuickLinkPaths,
    permissions: {
      canViewProjects,
      canOpenProjectDetails,
      projectOverviewPath,
      canViewConversion,
      canViewAppointments,
      canViewCalendar,
      canRegisterHours,
    },
    isLoading:
      (canViewProjects && projectsLoading) ||
      issuesQuery.isLoading ||
      appointmentsQuery.isLoading ||
      copilotLoading,
    loading: {
      projects: canViewProjects && projectsLoading,
      conversion: issuesQuery.isLoading,
      appointments: appointmentsQuery.isLoading,
      copilot: copilotLoading,
    },
    error: projectsError ?? issuesQuery.error ?? appointmentsQuery.error ?? copilotError,
    errors: {
      projects: projectsError,
      conversion: issuesQuery.error,
      appointments: appointmentsQuery.error,
      copilot: copilotError,
    },
    refreshers: {
      projects: refetchProjects,
      conversion: issuesQuery.refetch,
      appointments: appointmentsQuery.refetch,
      copilot: refreshCopilot,
    },
    refresh: async () => {
      await Promise.all([
        canViewProjects ? refetchProjects() : Promise.resolve(),
        canViewConversion ? issuesQuery.refetch() : Promise.resolve(),
        canViewAppointments ? appointmentsQuery.refetch() : Promise.resolve(),
        hasCopilotAccess ? refreshCopilot() : Promise.resolve(),
      ]);
    },
    isRefreshing:
      projectsFetching ||
      issuesQuery.isFetching ||
      appointmentsQuery.isFetching ||
      copilotRefreshing,
  };
}
