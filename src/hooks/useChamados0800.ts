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
  /** Tema curto gerado por IA no worker ("selo digital", "livro caixa"...).
   * undefined = ainda nao classificado; "interno" nunca chega aqui (filtrado). */
  tema?: string;
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
  syncedAt: c.synced_at ?? undefined,
  tema: c.tema_ia && c.tema_ia !== "interno" ? c.tema_ia : undefined,
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
