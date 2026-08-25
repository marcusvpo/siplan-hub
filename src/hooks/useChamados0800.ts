import { useCallback, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CHAMADOS_CATALOG_CONFIG,
  LEGACY_PRODUCT_FAMILIES,
  type ChamadosCatalog,
} from "@/lib/chamados-catalog";
import { getOrionProductPattern } from "@/lib/chamados-product-filter";
import { CHAMADO_STATUS_OPTIONS, isChamadoStatus } from "@/lib/chamados-status";

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
  abertoEm?: string;
  encerradoEm?: string;
  syncedAt?: string;
  /** Tema curto gerado por IA no worker ("selo digital", "livro caixa"...).
   * undefined = ainda nao classificado; "interno" nunca chega aqui (filtrado). */
  tema?: string;
}

export interface ChamadoTramite {
  sequenciaTramite: number;
  numeroTramite?: number;
  dataTramite?: string;
  responsavel?: string;
  equipeResponsavel?: string;
  atividade?: string;
  descricao?: string;
}

export interface ChamadoReportRow extends Chamado0800 {
  ultimoTramite?: ChamadoTramite;
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
 * Naturezas que nao representam dor do cliente no pos e so poluem a lista e a
 * analise: "Nova implantação" e o chamado interno do proprio projeto.
 * Comparacao em minusculas.
 */
const NATUREZAS_IGNORADAS = ["nova implantação", "nova implantacao"];

/** true para naturezas internas que nao entram em lista nem analise. */
export function isNaturezaIgnorada(natureza?: string | null): boolean {
  return NATUREZAS_IGNORADAS.includes((natureza || "").toLowerCase());
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
export const mapChamado0800 = (c: any): Chamado0800 => ({
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
  abertoEm: c.aberto_em ?? undefined,
  encerradoEm: c.encerrado_em ?? undefined,
  syncedAt: c.synced_at ?? undefined,
  tema: c.tema_ia && c.tema_ia !== "interno" ? c.tema_ia : undefined,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapChamadoTramite = (tramite: any): ChamadoTramite => ({
  sequenciaTramite: Number(tramite.sequencia_tramite),
  numeroTramite: tramite.numero_tramite ?? undefined,
  dataTramite: tramite.data_tramite ?? undefined,
  responsavel: tramite.responsavel ?? undefined,
  equipeResponsavel: tramite.equipe_responsavel ?? undefined,
  atividade: tramite.atividade ?? undefined,
  descricao: tramite.descricao ?? undefined,
});

/** Historico 1:N de tramites da tela Consulta de Chamados. */
export function useChamadoTramites(numeroChamado?: string, enabled = true) {
  const query = useQuery({
    queryKey: ["chamadoProcessoVendaTramites", numeroChamado],
    enabled: enabled && !!numeroChamado,
    staleTime: 30_000,
    queryFn: async (): Promise<ChamadoTramite[]> => {
      const { data, error } = await supabase
        .from("chamados_processo_venda_tramites")
        .select(
          "sequencia_tramite, numero_tramite, data_tramite, responsavel, equipe_responsavel, atividade, descricao"
        )
        .eq("numero_chamado", numeroChamado!)
        .order("data_tramite", { ascending: false, nullsFirst: false })
        .order("numero_tramite", { ascending: false });

      if (error) throw error;
      return (data ?? []).map(mapChamadoTramite);
    },
  });

  return {
    tramites: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

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

      let chamados = (data ?? []).map(mapChamado0800);
      chamados = chamados.filter(
        (c) => !NATUREZAS_IGNORADAS.includes((c.natureza || "").toLowerCase())
      );
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

export interface BenchmarkPos {
  /** mediana de chamados por pos entre os outros projetos do mesmo produto */
  mediana: number;
  /** quantos projetos entraram na comparacao */
  projetos: number;
}

/**
 * Benchmark da carteira: mediana de chamados de pos entre os OUTROS projetos do
 * mesmo produto (com pos iniciado). Transforma o total do projeto atual em
 * veredito ("3 chamados" e bom ou ruim?). Tudo lido do espelho chamados_0800.
 */
export function useBenchmarkPos(systemType?: string | null, excludeTicket?: string | null) {
  const hoje = new Date().toISOString().slice(0, 10);
  return useQuery<BenchmarkPos | null>({
    queryKey: ["benchmarkPos", systemType, excludeTicket],
    enabled: !!systemType,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data: projs, error: projErr } = await supabase
        .from("projects")
        .select("ticket_number, post_start_date, post_end_date, post_status")
        .eq("is_deleted", false)
        .eq("system_type", systemType as string)
        .not("post_start_date", "is", null);
      if (projErr) throw projErr;

      const candidatos = (projs ?? [])
        .map((p) => ({
          ticket: (p.ticket_number || "").trim(),
          inicio: p.post_start_date as string,
          fim: p.post_status === "done" && p.post_end_date ? (p.post_end_date as string) : hoje,
        }))
        .filter((p) => /^\d{4,}$/.test(p.ticket) && p.ticket !== (excludeTicket || "").trim());
      if (candidatos.length < 2) return null; // sem base de comparacao

      const { data: origens, error: origErr } = await supabase
        .from("chamados_0800")
        .select("numero_chamado, id_cliente_ellevo")
        .in("numero_chamado", candidatos.map((c) => c.ticket));
      if (origErr) throw origErr;
      const ticketToCliente = new Map(
        (origens ?? []).map((o) => [o.numero_chamado as string, o.id_cliente_ellevo as number])
      );

      const resolvidos = candidatos.filter((c) => ticketToCliente.has(c.ticket));
      if (resolvidos.length < 2) return null;

      const minInicio = resolvidos.map((c) => c.inicio).sort()[0];
      const { data: chamados, error: chErr } = await supabase
        .from("chamados_0800")
        .select("id_cliente_ellevo, data_abertura, natureza, software")
        .in("id_cliente_ellevo", [...new Set(resolvidos.map((c) => ticketToCliente.get(c.ticket)!))])
        .gte("data_abertura", minInicio);
      if (chErr) throw chErr;

      const counts = resolvidos.map((c) => {
        const idCliente = ticketToCliente.get(c.ticket)!;
        return (chamados ?? []).filter(
          (ch) =>
            ch.id_cliente_ellevo === idCliente &&
            !!ch.data_abertura &&
            (ch.data_abertura as string) >= c.inicio &&
            (ch.data_abertura as string) <= c.fim &&
            !isNaturezaIgnorada(ch.natureza as string) &&
            softwareMatchesSystemType(ch.software as string, systemType)
        ).length;
      });

      counts.sort((a, b) => a - b);
      const meio = Math.floor(counts.length / 2);
      const mediana =
        counts.length % 2 === 1 ? counts[meio] : Math.round((counts[meio - 1] + counts[meio]) / 2);
      return { mediana, projetos: counts.length };
    },
  });
}

/**
 * Checagem pontual usada ao CONCLUIR o pós: existe chamado CRÍTICO em aberto do
 * cliente/produto dentro do período? Retorna os números para o aviso (suave —
 * não bloqueia a conclusão, só informa quem conclui).
 */
export async function checkPosCriticosAbertos(
  ticketNumber?: string | null,
  systemType?: string | null,
  startDate?: Date | string | null
): Promise<{ total: number; numeros: string[] }> {
  const vazio = { total: 0, numeros: [] as string[] };
  const ticket = (ticketNumber || "").trim();
  const inicio = toIsoDay(startDate);
  if (!/^\d{4,}$/.test(ticket) || !inicio) return vazio;

  const { data: origem } = await supabase
    .from("chamados_0800")
    .select("id_cliente_ellevo")
    .eq("numero_chamado", ticket)
    .maybeSingle();
  if (!origem) return vazio;

  const { data } = await supabase
    .from("chamados_0800")
    .select("numero_chamado, natureza, criticidade, software, data_encerramento")
    .eq("id_cliente_ellevo", origem.id_cliente_ellevo)
    .gte("data_abertura", inicio)
    .is("data_encerramento", null);

  const criticos = (data ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((c: any) => {
      const crit = (c.criticidade || "").toLowerCase();
      return (
        !isNaturezaIgnorada(c.natureza) &&
        (!systemType || softwareMatchesSystemType(c.software, systemType)) &&
        crit.includes("crítico") &&
        !crit.includes("não")
      );
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((c: any) => c.numero_chamado as string);
  return { total: criticos.length, numeros: criticos };
}

export interface ParecerPosJob {
  id: string;
  status: string;
  resultText?: string;
  errorMessage?: string;
  progress?: string;
  createdAt: string;
}

/**
 * Parecer IA da Analise Pos-Implantacao: enfileira um job 'pos_parecer' na fila
 * dtc_ai_jobs (input_text = JSON compacto dos chamados do periodo); o vm-worker
 * roda o Claude e devolve o texto em result_text. A query faz polling enquanto
 * houver job ativo e guarda o ultimo parecer concluido do projeto.
 */
export function useParecerPos(projectId?: string) {
  const queryClient = useQueryClient();
  const queryKey = ["parecerPos", projectId];

  const { data: jobs = [] } = useQuery<ParecerPosJob[]>({
    queryKey,
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dtc_ai_jobs")
        .select("id, status, result_text, error_message, progress, created_at")
        .eq("project_id", projectId as string)
        .eq("job_type", "pos_parecer")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((j: any) => ({
        id: j.id,
        status: j.status,
        resultText: j.result_text ?? undefined,
        errorMessage: j.error_message ?? undefined,
        progress: j.progress ?? undefined,
        createdAt: j.created_at,
      }));
    },
    refetchInterval: (query) => {
      const data = query.state.data as ParecerPosJob[] | undefined;
      const ativo = data?.some((j) => j.status === "pending" || j.status === "processing");
      return ativo ? 4000 : false;
    },
  });

  const gerarParecer = async (inputJson: string, requestedBy?: string): Promise<void> => {
    const { error } = await supabase.from("dtc_ai_jobs").insert({
      project_id: projectId,
      job_type: "pos_parecer",
      target_field: "pos_parecer",
      input_text: inputJson,
      requested_by: requestedBy ?? null,
    });
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey });
  };

  const ativo = jobs.find((j) => j.status === "pending" || j.status === "processing");
  const ultimo = jobs.find((j) => j.status === "done" && j.resultText);
  const ultimoErro = !ativo && jobs[0]?.status === "error" ? jobs[0] : undefined;

  return { gerarParecer, ativo, ultimo, ultimoErro };
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

/**
 * Solicita ao worker a importacao de uma faixa historica exclusiva da tela de
 * Consulta de Chamados. O fluxo tradicional de chamados_0800 nao e alterado.
 */
export interface ProcessoVendaSyncFilters {
  clientCodes?: string[] | null;
  clientNames?: string[] | null;
  product?: string | null;
  products?: string[] | null;
  softwares?: string[] | null;
  nature?: string | null;
  statuses?: string[] | null;
  searchTerm?: string | null;
}

export interface ProcessoVendaSyncResult {
  ticketNumbers: string[];
}

const PROCESSO_VENDA_SYNC_SUPERSEDED = "PROCESSO_VENDA_SYNC_SUPERSEDED";

class ProcessoVendaSyncSupersededError extends Error {
  readonly code = PROCESSO_VENDA_SYNC_SUPERSEDED;

  constructor() {
    super("Consulta substituida por filtros mais recentes.");
    this.name = "ProcessoVendaSyncSupersededError";
  }
}

export function isProcessoVendaSyncSupersededError(error: unknown): boolean {
  return error instanceof ProcessoVendaSyncSupersededError
    || (error instanceof Error
      && "code" in error
      && error.code === PROCESSO_VENDA_SYNC_SUPERSEDED);
}

export function useSolicitarSyncProcessoVenda(catalog: ChamadosCatalog = "orion") {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const latestRequestVersion = useRef(0);

  const solicitarSync = useCallback(async (
    startDate: string,
    endDate: string,
    filters: ProcessoVendaSyncFilters = {}
  ): Promise<ProcessoVendaSyncResult> => {
    const requestVersion = ++latestRequestVersion.current;
    const assertLatestRequest = () => {
      if (requestVersion !== latestRequestVersion.current) {
        throw new ProcessoVendaSyncSupersededError();
      }
    };

    setSyncing(true);
    try {
      const { data: requestId, error } = await supabase.rpc(
        CHAMADOS_CATALOG_CONFIG[catalog].syncRpc,
        {
          p_start_date: startDate,
          p_end_date: endDate,
          p_filters: {
            client_codes: filters.clientCodes ?? [],
            client_names: filters.clientNames ?? [],
            product: filters.product ?? null,
            products: filters.products ?? [],
            softwares: filters.softwares ?? [],
            nature: filters.nature ?? null,
            statuses: filters.statuses ?? [],
            search_term: filters.searchTerm?.trim() || null,
          },
        }
      );
      if (error) throw error;
      if (typeof requestId !== "string") {
        throw new Error("O Supabase nao retornou o identificador da consulta.");
      }
      assertLatestRequest();

      // Periodos historicos extensos podem levar mais tempo no SQL Server.
      for (let i = 0; i < 180; i++) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        assertLatestRequest();
        const { data: row, error: pollError } = await supabase
          .from("chamados_sync_requests")
          .select("status, detail, result_ticket_ids")
          .eq("id", requestId)
          .maybeSingle();
        if (pollError) throw pollError;
        assertLatestRequest();
        if (row?.status === "done") {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["chamadosSearch"] }),
            queryClient.invalidateQueries({ queryKey: ["ticketsAiDashboard"] }),
            queryClient.invalidateQueries({ queryKey: ["chamadosClientOptions", catalog] }),
            queryClient.invalidateQueries({ queryKey: ["distinctProcessoVendaNaturezas", catalog] }),
          ]);
          return {
            ticketNumbers: Array.isArray(row.result_ticket_ids)
              ? row.result_ticket_ids.map(String)
              : [],
          };
        }
        if (row?.status === "error") {
          if (row.detail?.startsWith("Substituida por uma consulta mais recente")) {
            throw new ProcessoVendaSyncSupersededError();
          }
          throw new Error(row.detail || "O worker reportou erro na consulta do periodo.");
        }
      }
      throw new Error("A consulta do periodo excedeu 6 minutos.");
    } finally {
      if (requestVersion === latestRequestVersion.current) {
        setSyncing(false);
      }
    }
  }, [catalog, queryClient]);

  return { solicitarSync, syncing };
}

export interface ChamadosSearchFilters {
  catalog?: ChamadosCatalog;
  startDate?: string | null;
  endDate?: string | null;
  clientCodes?: string[] | null;
  clientNames?: string[] | null;
  product?: string | null;
  products?: string[] | null;
  softwares?: string[] | null;
  nature?: string | null;
  searchTerm?: string | null;
  statuses?: string[] | null;
  ticketNumbers?: string[] | null;
  page?: number;
  pageSize?: number;
}

function createChamadosSearchQuery(
  {
    startDate,
    endDate,
    clientCodes,
    clientNames,
    product,
    products,
    softwares,
    nature,
    searchTerm,
    statuses,
    ticketNumbers,
    catalog = "orion",
  }: ChamadosSearchFilters,
  withCount = false
) {
  let q = supabase
    .from("chamados_processo_venda")
    .select("*", { count: withCount ? "exact" : undefined });

  if (startDate) q = q.gte("data_abertura", startDate);
  if (endDate) q = q.lte("data_abertura", endDate);
  if (clientCodes && clientCodes.length > 0) {
    q = q.in("codigo_cliente", clientCodes);
  } else if (clientNames && clientNames.length > 0) {
    q = q.in("nome_cliente", clientNames);
  }
  if (ticketNumbers && ticketNumbers.length > 0) q = q.in("numero_chamado", ticketNumbers);

  if (catalog === "legacy") {
    q = q.in(
      "produto",
      products && products.length > 0 ? products : [...LEGACY_PRODUCT_FAMILIES],
    );
    if (softwares && softwares.length > 0) q = q.in("software", softwares);
  } else {
    q = q.ilike("software", getOrionProductPattern(product));
  }
  if (nature && nature !== "todas") q = q.eq("natureza", nature);

  const validStatuses = (statuses ?? []).filter(isChamadoStatus);
  q = q.in(
    "status",
    validStatuses.length > 0 ? validStatuses : [...CHAMADO_STATUS_OPTIONS]
  );

  if (searchTerm) {
    const term = searchTerm.trim();
    if (/^\d+$/.test(term)) {
      q = q.or(`numero_chamado.eq.${term},nome_cliente.ilike.%${term}%,titulo.ilike.%${term}%`);
    } else {
      q = q.or(`nome_cliente.ilike.%${term}%,titulo.ilike.%${term}%,descricao.ilike.%${term}%`);
    }
  }

  return q;
}

async function fetchUltimosTramites(
  numerosChamados: string[]
): Promise<Map<string, ChamadoTramite>> {
  const ultimosPorChamado = new Map<string, ChamadoTramite>();
  const ticketBatchSize = 100;
  const rowBatchSize = 1000;

  for (let ticketFrom = 0; ticketFrom < numerosChamados.length; ticketFrom += ticketBatchSize) {
    const ticketBatch = numerosChamados.slice(ticketFrom, ticketFrom + ticketBatchSize);

    for (let rowFrom = 0; ; rowFrom += rowBatchSize) {
      const { data, error } = await supabase
        .from("chamados_processo_venda_tramites")
        .select(
          "numero_chamado, sequencia_tramite, numero_tramite, data_tramite, responsavel, equipe_responsavel, atividade, descricao"
        )
        .in("numero_chamado", ticketBatch)
        .order("data_tramite", { ascending: false, nullsFirst: false })
        .order("numero_tramite", { ascending: false })
        .order("sequencia_tramite", { ascending: false })
        .range(rowFrom, rowFrom + rowBatchSize - 1);

      if (error) throw error;
      const batch = data ?? [];
      for (const tramite of batch) {
        const numeroChamado = String(tramite.numero_chamado);
        if (!ultimosPorChamado.has(numeroChamado)) {
          ultimosPorChamado.set(numeroChamado, mapChamadoTramite(tramite));
        }
      }

      if (batch.length < rowBatchSize) break;
    }
  }

  return ultimosPorChamado;
}

/** Busca todos os chamados do recorte sem carregar o histórico de trâmites. */
export async function fetchAllChamados(
  filters: Omit<ChamadosSearchFilters, "page" | "pageSize">
): Promise<Chamado0800[]> {
  if (Array.isArray(filters.ticketNumbers) && filters.ticketNumbers.length === 0) {
    return [];
  }

  const batchSize = 1000;
  const rows: unknown[] = [];

  for (let from = 0; ; from += batchSize) {
    const { data, error } = await createChamadosSearchQuery(filters)
      .order("data_abertura", { ascending: false })
      .order("numero_chamado", { ascending: false })
      .range(from, from + batchSize - 1);
    if (error) throw error;

    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < batchSize) break;
  }

  return rows.map(mapChamado0800);
}

/** Busca todos os chamados e o último trâmite do recorte para PDF ou IA. */
export async function fetchAllChamadosForReport(
  filters: Omit<ChamadosSearchFilters, "page" | "pageSize">
): Promise<ChamadoReportRow[]> {
  const chamados = await fetchAllChamados(filters);
  if (chamados.length === 0) return [];
  const ultimosTramites = await fetchUltimosTramites(
    chamados.map((chamado) => chamado.numeroChamado)
  );

  return chamados.map((chamado) => ({
    ...chamado,
    ultimoTramite: ultimosTramites.get(chamado.numeroChamado),
  }));
}

export function useChamadosSearch({
  catalog = "orion",
  startDate,
  endDate,
  clientCodes,
  clientNames,
  product,
  products,
  softwares,
  nature,
  searchTerm,
  statuses,
  ticketNumbers,
  page = 1,
  pageSize = 20,
}: ChamadosSearchFilters) {
  const query = useQuery({
    queryKey: [
      "chamadosSearch",
      catalog,
      startDate,
      endDate,
      clientCodes,
      clientNames,
      product,
      products,
      softwares,
      nature,
      searchTerm,
      statuses,
      ticketNumbers,
      page,
      pageSize,
    ],
    staleTime: 30_000,
    queryFn: async () => {
      if (Array.isArray(ticketNumbers) && ticketNumbers.length === 0) {
        return { chamados: [], totalCount: 0 };
      }

      let q = createChamadosSearchQuery(
        {
          startDate,
          endDate,
          clientCodes,
          clientNames,
          product,
          products,
          softwares,
          nature,
          searchTerm,
          statuses,
          ticketNumbers,
          catalog,
        },
        true
      );

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      q = q
        .order("data_abertura", { ascending: false })
        .order("numero_chamado", { ascending: false })
        .range(from, to);

      const { data, error, count } = await q;
      if (error) throw error;

      return {
        chamados: (data ?? []).map(mapChamado0800),
        totalCount: count ?? 0,
      };
    },
  });

  return {
    chamados: query.data?.chamados ?? [],
    totalCount: query.data?.totalCount ?? 0,
    isLoading: query.isLoading,
    error: query.error,
  };
}
