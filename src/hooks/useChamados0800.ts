import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Chamado0800 {
  numeroChamado: string;
  nomeCliente?: string;
  solicitante?: string;
  titulo?: string;
  descricao?: string;
  natureza?: string;
  status?: string;
  criticidade?: string;
  software?: string;
  produto?: string;
  equipeResponsavel?: string;
  dataAbertura?: string;
  dataEncerramento?: string;
  syncedAt?: string;
}

export interface Chamados0800Result {
  chamados: Chamado0800[];
  /** false = o chamado de origem do projeto ainda nao apareceu no espelho
   * (sync do worker ainda nao rodou ou ticket_number invalido). */
  clienteResolvido: boolean;
  /** Ultima sincronizacao do espelho (mais recente entre os chamados lidos). */
  lastSyncedAt?: string;
}

/**
 * Normaliza nome de produto para comparacao: minusculas, so alfanumericos.
 * "Orion TN" ≈ "OrionTN"; "Orion REG" ≈ "OrionREG (TDPJ)" (via prefixo);
 * "WEB RI" ≈ "WEBRI".
 */
function normalizeProduto(value?: string | null): string {
  return (value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** true se o software do chamado corresponde ao system_type do projeto. */
export function softwareMatchesSystemType(software?: string | null, systemType?: string | null): boolean {
  const sw = normalizeProduto(software);
  const st = normalizeProduto(systemType);
  if (!sw || !st) return false;
  return sw === st || sw.startsWith(st) || st.startsWith(sw);
}

/** Normaliza Date | string para 'yyyy-mm-dd' (calendario local, sem fuso). */
function toIsoDay(value?: Date | string | null): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    const d = new Date(value);
    if (isNaN(d.getTime())) return undefined;
    return toIsoDay(d);
  }
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapChamado = (c: any): Chamado0800 => ({
  numeroChamado: c.numero_chamado,
  nomeCliente: c.nome_cliente ?? undefined,
  solicitante: c.solicitante ?? undefined,
  titulo: c.titulo ?? undefined,
  descricao: c.descricao ?? undefined,
  natureza: c.natureza ?? undefined,
  status: c.status ?? undefined,
  criticidade: c.criticidade ?? undefined,
  software: c.software ?? undefined,
  produto: c.produto ?? undefined,
  equipeResponsavel: c.equipe_responsavel ?? undefined,
  dataAbertura: c.data_abertura ?? undefined,
  dataEncerramento: c.data_encerramento ?? undefined,
  syncedAt: c.synced_at ?? undefined,
});

/**
 * Chamados 0800 (Ellevo) do cliente do projeto, abertos dentro do periodo do
 * pos-implantacao. Le o espelho public.chamados_0800, alimentado pelo vm-worker
 * a cada ~5 min a partir do SQL Server interno (vw_2026_ChamadosTodosStatus).
 *
 * O vinculo projeto -> cliente Ellevo e resolvido pelo proprio espelho:
 * projects.ticket_number e o numero do chamado que originou o projeto, e essa
 * linha carrega o id_cliente_ellevo.
 *
 * @param ticketNumber projects.ticket_number (chamado de origem)
 * @param startDate    inicio do pos (post.startDate — Date do dominio ou string)
 * @param endDate      termino do pos (post.endDate); vazio = ate hoje
 * @param systemType   projects.system_type; quando informado, lista so os
 *                     chamados do MESMO produto (cliente pode ter Orion TN e
 *                     Orion PRO em projetos separados)
 */
export function useChamados0800(
  ticketNumber?: string | null,
  startDate?: Date | string | null,
  endDate?: Date | string | null,
  systemType?: string | null
) {
  const ticket = (ticketNumber || "").trim();
  const inicio = toIsoDay(startDate);
  const fim = toIsoDay(endDate);
  const valido = /^\d{4,}$/.test(ticket) && !!inicio;

  const query = useQuery<Chamados0800Result>({
    queryKey: ["chamados0800", ticket, inicio, fim, normalizeProduto(systemType)],
    enabled: valido,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: origem, error: origemError } = await supabase
        .from("chamados_0800")
        .select("id_cliente_ellevo")
        .eq("numero_chamado", ticket)
        .maybeSingle();
      if (origemError) throw origemError;
      if (!origem) return { chamados: [], clienteResolvido: false };

      let q = supabase
        .from("chamados_0800")
        .select("*")
        .eq("id_cliente_ellevo", origem.id_cliente_ellevo)
        .gte("data_abertura", inicio as string)
        .order("data_abertura", { ascending: false });
      if (fim) q = q.lte("data_abertura", fim);

      const { data, error } = await q;
      if (error) throw error;

      let chamados = (data ?? []).map(mapChamado);
      // Corte por produto no cliente (valores de Software do Ellevo variam de
      // grafia — "OrionPRO", "OrionREG (TDPJ)" — por isso nao da para filtrar
      // direto no SQL).
      if (systemType) {
        chamados = chamados.filter((c) => softwareMatchesSystemType(c.software, systemType));
      }
      const lastSyncedAt = chamados.reduce<string | undefined>(
        (max, c) => (c.syncedAt && (!max || c.syncedAt > max) ? c.syncedAt : max),
        undefined
      );
      return { chamados, clienteResolvido: true, lastSyncedAt };
    },
  });

  return {
    chamados: query.data?.chamados ?? [],
    clienteResolvido: query.data?.clienteResolvido ?? false,
    lastSyncedAt: query.data?.lastSyncedAt,
    isLoading: valido && query.isLoading,
    error: query.error,
    /** true quando faltam datas do pos ou ticket valido para consultar */
    parametrosIncompletos: !valido,
  };
}

/**
 * "Sincronizar agora": insere um pedido em chamados_sync_requests; o vm-worker
 * escuta o INSERT via Realtime, roda o sync imediatamente e marca a linha como
 * done/error. Aqui aguardamos o desfecho (ate ~40s) e invalidamos o cache dos
 * chamados para a lista recarregar ja com o espelho fresco.
 */
export function useSolicitarSyncChamados0800() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  const solicitarSync = async (): Promise<void> => {
    if (syncing) return;
    setSyncing(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("chamados_sync_requests")
        .insert({ requested_by: auth.user?.email ?? null })
        .select("id")
        .single();
      if (error) throw error;

      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const { data: row } = await supabase
          .from("chamados_sync_requests")
          .select("status, detail")
          .eq("id", data.id)
          .maybeSingle();
        if (row?.status === "done") {
          await queryClient.invalidateQueries({ queryKey: ["chamados0800"] });
          return;
        }
        if (row?.status === "error") {
          throw new Error(row.detail || "O worker reportou erro no sync.");
        }
      }
      throw new Error("O worker não respondeu em 40s — ele está online?");
    } finally {
      setSyncing(false);
    }
  };

  return { solicitarSync, syncing };
}
