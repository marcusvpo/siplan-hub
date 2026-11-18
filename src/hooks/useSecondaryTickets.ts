import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  SecondaryProductCatalogRow,
  SecondaryTicketHubStatus,
  SecondaryTicketRow,
} from "@/integrations/supabase/types";
import {
  OFFICIAL_SECONDARY_PRODUCTS,
  SECONDARY_HUB_STATUS_MAP,
  normalizeSecondaryMatchText,
} from "@/lib/secondary-products";
import {
  recordProjectActivityLog,
  type ProjectLogChangeItem,
} from "@/services/projectLogService";

export interface LinkedParentProjectSummary {
  id: string;
  clientName: string;
  systemType: string;
  ticketNumber: string;
  globalStatus: string;
  projectLeader?: string | null;
  implementationStatus?: string | null;
  implementationResponsible?: string | null;
  implementationStartDate?: string | null;
  implementationEndDate?: string | null;
  linkSource: "auto" | "manual";
}

export interface SecondaryTicketWithLinks extends SecondaryTicketRow {
  requiresOrionAdmin: boolean;
  onlySystemType: string | null;
  linkedProjects: LinkedParentProjectSummary[];
}

export interface SecondaryTicketTramiteRow {
  numero_chamado: string;
  sequencia_tramite: number;
  numero_tramite: number | null;
  data_tramite: string | null;
  responsavel: string | null;
  equipe_responsavel: string | null;
  atividade: string | null;
  descricao: string | null;
}

interface RawLinkWithProject {
  project_id: string;
  secondary_ticket_id: string;
  link_source: "auto" | "manual";
  projects: {
    id: string;
    client_name: string;
    system_type: string;
    ticket_number: string;
    global_status: string;
    project_leader?: string | null;
    implementation_status?: string | null;
    implementation_responsible?: string | null;
    implementation_start_date?: string | null;
    implementation_end_date?: string | null;
    is_deleted?: boolean | null;
  } | null;
}

function mapRawLinkToParentSummary(link: RawLinkWithProject): LinkedParentProjectSummary | null {
  const p = link.projects;
  if (!p || p.is_deleted) return null;
  return {
    id: p.id,
    clientName: p.client_name,
    systemType: p.system_type,
    ticketNumber: p.ticket_number,
    globalStatus: p.global_status,
    projectLeader: p.project_leader,
    implementationStatus: p.implementation_status,
    implementationResponsible: p.implementation_responsible,
    implementationStartDate: p.implementation_start_date,
    implementationEndDate: p.implementation_end_date,
    linkSource: link.link_source || "auto",
  };
}

export function useSecondaryProductCatalog() {
  return useQuery({
    queryKey: ["secondaryProductCatalog"],
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("secondary_product_catalog")
        .select("*")
        .eq("active", true)
        .eq("category", "secondary")
        .order("name", { ascending: true });

      if (error) throw error;
      return (data as SecondaryProductCatalogRow[]) || [];
    },
  });
}

export function useProjectSecondaryTickets(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ["projectSecondaryTickets", projectId],
    enabled: Boolean(projectId),
    staleTime: 1000 * 30,
    queryFn: async (): Promise<SecondaryTicketWithLinks[]> => {
      if (!projectId) return [];

      const { data: projectLinks, error: linksError } = await supabase
        .from("project_secondary_ticket_links")
        .select("secondary_ticket_id")
        .eq("project_id", projectId);

      if (linksError) throw linksError;

      const ticketIds = (projectLinks || []).map(
        (l: { secondary_ticket_id: string }) => l.secondary_ticket_id
      );
      if (ticketIds.length === 0) return [];

      const [{ data: tickets, error: ticketsError }, { data: allLinks, error: allLinksError }, { data: catalog }] =
        await Promise.all([
          supabase
            .from("secondary_tickets")
            .select("*")
            .in("id", ticketIds)
            .neq("hub_status", "cancelled")
            .order("product_name", { ascending: true }),
          supabase
            .from("project_secondary_ticket_links")
            .select(
              `
              project_id,
              secondary_ticket_id,
              link_source,
              projects (
                id,
                client_name,
                system_type,
                ticket_number,
                global_status,
                project_leader,
                implementation_status,
                implementation_responsible,
                implementation_start_date,
                implementation_end_date,
                is_deleted
              )
            `
            )
            .in("secondary_ticket_id", ticketIds),
          supabase
            .from("secondary_product_catalog")
            .select("code, name, requires_orion_admin, only_system_type")
            .eq("category", "secondary"),
        ]);

      if (ticketsError) throw ticketsError;
      if (allLinksError) throw allLinksError;

      const catalogByCode = new Map<string, { requires_orion_admin: boolean; only_system_type: string | null }>();
      for (const item of (catalog as Array<{ code: string; requires_orion_admin: boolean; only_system_type: string | null }>) || []) {
        catalogByCode.set(item.code, item);
      }

      const linksByTicket = new Map<string, LinkedParentProjectSummary[]>();
      for (const raw of (allLinks as unknown as RawLinkWithProject[]) || []) {
        const mapped = mapRawLinkToParentSummary(raw);
        if (!mapped) continue;
        const arr = linksByTicket.get(raw.secondary_ticket_id) || [];
        arr.push(mapped);
        linksByTicket.set(raw.secondary_ticket_id, arr);
      }

      return ((tickets as SecondaryTicketRow[]) || []).map((t) => {
        const cat = t.product_code ? catalogByCode.get(t.product_code) : undefined;
        const fallbackOfficial = OFFICIAL_SECONDARY_PRODUCTS.find(
          (item) => item.code === t.product_code || item.name === t.product_name
        );
        return {
          ...t,
          requiresOrionAdmin: cat?.requires_orion_admin ?? fallbackOfficial?.requiresOrionAdmin ?? false,
          onlySystemType: cat?.only_system_type ?? fallbackOfficial?.onlySystemType ?? null,
          linkedProjects: linksByTicket.get(t.id) || [],
        };
      });
    },
  });
}

export function useAllSecondaryTickets() {
  return useQuery({
    queryKey: ["secondaryTickets", "all"],
    staleTime: 1000 * 30,
    queryFn: async (): Promise<SecondaryTicketWithLinks[]> => {
      const [{ data: tickets, error: ticketsError }, { data: allLinks, error: linksError }, { data: catalog }] =
        await Promise.all([
          supabase
            .from("secondary_tickets")
            .select("*")
            .neq("hub_status", "cancelled")
            .order("updated_at", { ascending: false }),
          supabase
            .from("project_secondary_ticket_links")
            .select(
              `
              project_id,
              secondary_ticket_id,
              link_source,
              projects (
                id,
                client_name,
                system_type,
                ticket_number,
                global_status,
                project_leader,
                implementation_status,
                implementation_responsible,
                implementation_start_date,
                implementation_end_date,
                is_deleted
              )
            `
            ),
          supabase
            .from("secondary_product_catalog")
            .select("code, name, requires_orion_admin, only_system_type")
            .eq("category", "secondary"),
        ]);

      if (ticketsError) throw ticketsError;
      if (linksError) throw linksError;

      const catalogByCode = new Map<string, { requires_orion_admin: boolean; only_system_type: string | null }>();
      for (const item of (catalog as Array<{ code: string; requires_orion_admin: boolean; only_system_type: string | null }>) || []) {
        catalogByCode.set(item.code, item);
      }

      const linksByTicket = new Map<string, LinkedParentProjectSummary[]>();
      for (const raw of (allLinks as unknown as RawLinkWithProject[]) || []) {
        const mapped = mapRawLinkToParentSummary(raw);
        if (!mapped) continue;
        const arr = linksByTicket.get(raw.secondary_ticket_id) || [];
        arr.push(mapped);
        linksByTicket.set(raw.secondary_ticket_id, arr);
      }

      return ((tickets as SecondaryTicketRow[]) || [])
        .map((t) => {
          const cat = t.product_code ? catalogByCode.get(t.product_code) : undefined;
          const fallbackOfficial = OFFICIAL_SECONDARY_PRODUCTS.find(
            (item) => item.code === t.product_code || item.name === t.product_name
          );
          return {
            ...t,
            requiresOrionAdmin: cat?.requires_orion_admin ?? fallbackOfficial?.requiresOrionAdmin ?? false,
            onlySystemType: cat?.only_system_type ?? fallbackOfficial?.onlySystemType ?? null,
            linkedProjects: linksByTicket.get(t.id) || [],
          };
        })
        .filter((t) => t.linkedProjects.length > 0);
    },
  });
}

export function useSecondaryTicketTramites(ticketNumber: string | null | undefined) {
  return useQuery({
    queryKey: ["secondaryTicketTramites", ticketNumber],
    enabled: Boolean(ticketNumber),
    staleTime: 1000 * 30,
    queryFn: async (): Promise<SecondaryTicketTramiteRow[]> => {
      if (!ticketNumber) return [];
      const clean = ticketNumber.replace(/\D/g, "") || ticketNumber.trim();
      const { data, error } = await supabase
        .from("chamados_processo_venda_tramites")
        .select(
          "numero_chamado, sequencia_tramite, numero_tramite, data_tramite, responsavel, equipe_responsavel, atividade, descricao"
        )
        .eq("numero_chamado", clean)
        .order("sequencia_tramite", { ascending: false });

      if (error) throw error;
      return (data as SecondaryTicketTramiteRow[]) || [];
    },
  });
}

export function useSecondaryTicketMutations() {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["secondaryTickets"] });
    queryClient.invalidateQueries({ queryKey: ["projectSecondaryTickets"] });
    queryClient.invalidateQueries({ queryKey: ["projectsList"] });
    queryClient.invalidateQueries({ queryKey: ["projectDetails"] });
    queryClient.invalidateQueries({ queryKey: ["projectsV3_with_dates"] });
    queryClient.invalidateQueries({ queryKey: ["timelineEvents"] });
  };

  const updateSecondaryTicket = useMutation({
    mutationFn: async (params: {
      id: string;
      projectId?: string;
      hub_status?: SecondaryTicketHubStatus;
      responsible?: string | null;
      observations?: string | null;
      tramited_to_cs?: boolean;
      updated_by?: string | null;
    }) => {
      const { id, projectId, ...rest } = params;

      const [{ data: previousRow }, { data: linkedRows }] = await Promise.all([
        supabase.from("secondary_tickets").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("project_secondary_ticket_links")
          .select("project_id")
          .eq("secondary_ticket_id", id),
      ]);

      const { data, error } = await supabase
        .from("secondary_tickets")
        .update({
          ...rest,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      const updatedTicket = data as SecondaryTicketRow;
      const previousTicket = previousRow as SecondaryTicketRow | null;
      const targetProjectIds = Array.from(
        new Set([
          ...(projectId ? [projectId] : []),
          ...((linkedRows as Array<{ project_id: string }> | null) || []).map(
            (r) => r.project_id,
          ),
        ]),
      );

      if (previousTicket && targetProjectIds.length > 0) {
        const changes: ProjectLogChangeItem[] = [];
        const productTitle = `${updatedTicket.product_name} (#${updatedTicket.ticket_number})`;

        if (
          rest.hub_status !== undefined &&
          rest.hub_status !== previousTicket.hub_status
        ) {
          const oldLabel =
            SECONDARY_HUB_STATUS_MAP[previousTicket.hub_status]?.label ||
            previousTicket.hub_status;
          const newLabel =
            SECONDARY_HUB_STATUS_MAP[updatedTicket.hub_status]?.label ||
            updatedTicket.hub_status;
          changes.push({
            field: `secondary_ticket.${id}.hub_status`,
            label: `${productTitle} — Situação HUB`,
            oldValue: oldLabel,
            newValue: newLabel,
          });
        }

        if (
          rest.responsible !== undefined &&
          (rest.responsible || "").trim() !== (previousTicket.responsible || "").trim()
        ) {
          changes.push({
            field: `secondary_ticket.${id}.responsible`,
            label: `${productTitle} — Responsável`,
            oldValue: previousTicket.responsible?.trim() || "(não definido)",
            newValue: updatedTicket.responsible?.trim() || "(removido)",
          });
        }

        if (
          rest.tramited_to_cs !== undefined &&
          Boolean(rest.tramited_to_cs) !== Boolean(previousTicket.tramited_to_cs)
        ) {
          changes.push({
            field: `secondary_ticket.${id}.tramited_to_cs`,
            label: `${productTitle} — Tramitado para CS no 0800`,
            oldValue: previousTicket.tramited_to_cs ? "Sim" : "Não",
            newValue: updatedTicket.tramited_to_cs ? "Sim" : "Não",
          });
        }

        if (
          rest.observations !== undefined &&
          (rest.observations || "").trim() !== (previousTicket.observations || "").trim()
        ) {
          changes.push({
            field: `secondary_ticket.${id}.observations`,
            label: `${productTitle} — Observações`,
            oldValue: previousTicket.observations?.trim() || "(vazio)",
            newValue: updatedTicket.observations?.trim() || "(vazio)",
          });
        }

        if (changes.length > 0) {
          const summaryMsg =
            changes.length === 1
              ? `${changes[0].label}: "${changes[0].oldValue}" → "${changes[0].newValue}"`
              : `Produto secundário ${productTitle} atualizado (${changes.length} campos)`;

          await Promise.all(
            targetProjectIds.map((pid) =>
              recordProjectActivityLog({
                projectId: pid,
                type: "secondary_product",
                category: "secondary_products",
                actionType: "secondary_product",
                tabLabel: "Produtos Secundários",
                fieldLabel: productTitle,
                oldValue: changes[0]?.oldValue,
                newValue: changes[0]?.newValue,
                changes,
                message: summaryMsg,
                extraMetadata: {
                  secondaryTicketId: id,
                  ticketNumber: updatedTicket.ticket_number,
                  productName: updatedTicket.product_name,
                },
                queryClient,
              }),
            ),
          );
        }
      }

      return updatedTicket;
    },
    onSuccess: invalidateAll,
  });

  const linkManualSecondaryTicket = useMutation({
    mutationFn: async (params: {
      projectId: string;
      clientName: string;
      opNumber?: number | null;
      salesOrderNumber?: number | null;
      ticketNumber: string;
      productCode: string;
      productName: string;
      onlySystemType?: string | null;
      responsible?: string | null;
      observations?: string | null;
      mirrorToSiblingProjects?: boolean;
      updatedBy?: string | null;
    }) => {
      const cleanTicket = params.ticketNumber.replace(/\D/g, "") || params.ticketNumber.trim();
      if (!cleanTicket) {
        throw new Error("Informe um número de chamado válido.");
      }

      // 1. Upsert do chamado único em secondary_tickets
      const { data: existing } = await supabase
        .from("secondary_tickets")
        .select("id, hub_status")
        .eq("ticket_number", cleanTicket)
        .maybeSingle();

      let secondaryId: string;
      if (existing?.id) {
        secondaryId = existing.id;
        if (existing.hub_status === "cancelled") {
          const { error: reviveErr } = await supabase
            .from("secondary_tickets")
            .update({
              hub_status: "pending",
              product_code: params.productCode,
              product_name: params.productName,
              updated_by: params.updatedBy ?? null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", secondaryId);
          if (reviveErr) throw reviveErr;
        }
      } else {
        const { data: created, error: createErr } = await supabase
          .from("secondary_tickets")
          .insert({
            ticket_number: cleanTicket,
            product_code: params.productCode,
            product_name: params.productName,
            client_name: params.clientName,
            op_number: params.opNumber ?? null,
            sales_order_number: params.salesOrderNumber ?? null,
            hub_status: "pending",
            responsible: params.responsible?.trim() || null,
            observations: params.observations?.trim() || null,
            updated_by: params.updatedBy ?? null,
          })
          .select("id")
          .single();
        if (createErr) throw createErr;
        secondaryId = (created as { id: string }).id;
      }

      // 2. Define projetos ativos a vincular (projeto atual + irmãos ativos do mesmo cartório, respeitando Orion Editor -> Orion TN)
      const targetProjectIds = new Set<string>([params.projectId]);

      if (params.mirrorToSiblingProjects !== false) {
        const normTargetClient = normalizeSecondaryMatchText(params.clientName);
        if (normTargetClient) {
          const { data: candidates } = await supabase
            .from("projects")
            .select("id, client_name, system_type, global_status, is_deleted, is_archived")
            .eq("is_deleted", false);

          for (const cand of (candidates as Array<{
            id: string;
            client_name: string;
            system_type: string;
            global_status: string;
            is_archived?: boolean | null;
          }>) || []) {
            if (cand.is_archived) continue;
            if (cand.global_status === "done" || cand.global_status === "archived") continue;
            if (params.onlySystemType && cand.system_type !== params.onlySystemType) continue;
            if (normalizeSecondaryMatchText(cand.client_name) === normTargetClient) {
              targetProjectIds.add(cand.id);
            }
          }
        }
      }

      const linkRows = [...targetProjectIds].map((pid) => ({
        project_id: pid,
        secondary_ticket_id: secondaryId,
        link_source: (pid === params.projectId ? "manual" : "auto") as "manual" | "auto",
      }));

      const { error: linkErr } = await supabase
        .from("project_secondary_ticket_links")
        .upsert(linkRows, { onConflict: "project_id,secondary_ticket_id" });

      if (linkErr) throw linkErr;

      // Aciona o vm-worker em background para puxar imediatamente os dados reais desse chamado no 0800
      await supabase
        .from("chamados_sync_requests")
        .insert({ scope: "chamados_0800", status: "pending" })
        .then(() => undefined, () => undefined);

      const newValueText = `${params.productName} (#${cleanTicket})`;
      await Promise.all(
        [...targetProjectIds].map((pid) =>
          recordProjectActivityLog({
            projectId: pid,
            type: "secondary_product",
            category: "secondary_products",
            actionType: "secondary_product",
            tabLabel: "Produtos Secundários",
            fieldLabel: "Vínculo de Produto Secundário",
            oldValue: "(não vinculado)",
            newValue: newValueText,
            changes: [
              {
                field: "secondary_tickets",
                label: "Produto Secundário Vinculado",
                oldValue: "(não vinculado)",
                newValue: newValueText,
              },
            ],
            message:
              pid === params.projectId
                ? `Produto secundário vinculado manualmente: ${newValueText}`
                : `Produto secundário espelhado automaticamente: ${newValueText}`,
            extraMetadata: {
              secondaryTicketId: secondaryId,
              ticketNumber: cleanTicket,
              productName: params.productName,
            },
            queryClient,
          }),
        ),
      );

      return { id: secondaryId, linkedCount: targetProjectIds.size };
    },
    onSuccess: invalidateAll,
  });

  const unlinkSecondaryTicket = useMutation({
    mutationFn: async (params: { projectId: string; secondaryTicketId: string; unlinkAllSiblings?: boolean }) => {
      const { data: ticketInfo } = await supabase
        .from("secondary_tickets")
        .select("product_name, ticket_number")
        .eq("id", params.secondaryTicketId)
        .maybeSingle();

      let query = supabase
        .from("project_secondary_ticket_links")
        .delete()
        .eq("secondary_ticket_id", params.secondaryTicketId);

      if (!params.unlinkAllSiblings) {
        query = query.eq("project_id", params.projectId);
      }

      const { error } = await query;
      if (error) throw error;

      const ticketLabel = ticketInfo
        ? `${ticketInfo.product_name} (#${ticketInfo.ticket_number})`
        : params.secondaryTicketId;

      await recordProjectActivityLog({
        projectId: params.projectId,
        type: "secondary_product",
        category: "secondary_products",
        actionType: "secondary_product",
        tabLabel: "Produtos Secundários",
        fieldLabel: "Vínculo de Produto Secundário",
        oldValue: ticketLabel,
        newValue: "(desvinculado)",
        changes: [
          {
            field: "secondary_tickets",
            label: "Produto Secundário Desvinculado",
            oldValue: ticketLabel,
            newValue: "(desvinculado)",
          },
        ],
        message: `Vínculo de produto secundário removido: ${ticketLabel}`,
        extraMetadata: {
          secondaryTicketId: params.secondaryTicketId,
          ticketNumber: ticketInfo?.ticket_number,
          productName: ticketInfo?.product_name,
        },
        queryClient,
      });
    },
    onSuccess: invalidateAll,
  });

  const requestSync0800Now = useMutation({
    mutationFn: async (params?: { projectId?: string } | void) => {
      const { data, error } = await supabase
        .from("chamados_sync_requests")
        .insert({ scope: "chamados_0800", status: "pending" })
        .select("id")
        .single();
      if (error) throw error;

      const projectId =
        params && typeof params === "object" && "projectId" in params
          ? params.projectId
          : undefined;

      if (projectId) {
        await recordProjectActivityLog({
          projectId,
          type: "sync_action",
          category: "secondary_products",
          actionType: "sync_action",
          tabLabel: "Produtos Secundários",
          buttonLabel: "Sincronizar 0800",
          message: "Sincronização manual do espelho 0800 solicitada na aba Produtos Secundários",
          queryClient,
        });
      }

      return data as { id: string };
    },
    onSuccess: () => {
      setTimeout(() => {
        invalidateAll();
        queryClient.invalidateQueries({ queryKey: ["secondaryTicketTramites"] });
      }, 4000);
    },
  });

  return {
    updateSecondaryTicket,
    linkManualSecondaryTicket,
    unlinkSecondaryTicket,
    requestSync0800Now,
  };
}
