import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Chamado0800,
  ParecerPosJob,
  mapChamado0800,
  isNaturezaIgnorada,
  softwareMatchesSystemType,
} from "@/hooks/useChamados0800";

/** Chamado do panorama, enriquecido com o projeto cuja janela de pós o contém. */
export interface ChamadoPanorama extends Chamado0800 {
  projetoId: string;
  projetoCliente: string;
  projetoProduto: string;
}

/** Projeto com pós iniciado (janela usada no casamento dos chamados). */
export interface ProjetoPos {
  id: string;
  cliente: string;
  produto: string;
  ticket: string;
  inicioPos: string;
  fimPos: string;
  posConcluido: boolean;
}

export interface PosPanoramaData {
  chamados: ChamadoPanorama[];
  /** projetos com pós iniciado e cliente resolvido no espelho (base da visão) */
  projetosEmPos: number;
  /** janelas de pós resolvidas — atalho cartório → projetos */
  projetos: ProjetoPos[];
  lastSyncedAt?: string;
}

interface JanelaPos {
  projetoId: string;
  cliente: string;
  produto: string;
  ticket: string;
  inicio: string;
  fim: string;
  idCliente?: number;
}

/**
 * Panorama Pós-Implantação: SOMENTE chamados que caem dentro da janela de pós
 * de algum projeto — mesmo critério da aba por projeto, agregado à carteira:
 *
 *   cliente do chamado = cliente do projeto (via ticket de origem → IDCliente)
 *   software do chamado ≈ system_type do projeto
 *   post_start_date <= abertura <= (pós concluído ? post_end_date : hoje)
 *
 * Chamado fora de qualquer janela (histórico antigo do cliente, outro produto,
 * aberto após o encerramento do pós) fica de fora. Naturezas internas idem.
 * Filtros finos (natureza, status, criticidade, busca, produto) são aplicados
 * na tela, sobre este conjunto já correto.
 *
 * @param inicio corte opcional extra de abertura (yyyy-mm-dd) — filtro do usuário
 * @param fim    corte opcional extra de abertura (yyyy-mm-dd)
 */
export function usePosPanorama(inicio: string | null, fim: string | null) {
  const hoje = new Date().toISOString().slice(0, 10);
  return useQuery<PosPanoramaData>({
    queryKey: ["posPanorama", inicio, fim],
    staleTime: 60_000,
    queryFn: async () => {
      // 1. Projetos com pós iniciado
      const { data: projs, error: projErr } = await supabase
        .from("projects")
        .select("id, client_name, ticket_number, system_type, post_start_date, post_end_date, post_status")
        .eq("is_deleted", false)
        .not("post_start_date", "is", null);
      if (projErr) throw projErr;

      const janelas: (JanelaPos & { posConcluido: boolean })[] = (projs ?? [])
        .map((p) => ({
          projetoId: p.id as string,
          cliente: (p.client_name as string) || "",
          produto: (p.system_type as string) || "",
          ticket: ((p.ticket_number as string) || "").trim(),
          inicio: p.post_start_date as string,
          fim: p.post_status === "done" && p.post_end_date ? (p.post_end_date as string) : hoje,
          posConcluido: p.post_status === "done",
        }))
        .filter((j) => /^\d{4,}$/.test(j.ticket));
      if (janelas.length === 0) return { chamados: [], projetosEmPos: 0, projetos: [] };

      // 2. Resolve o cliente Ellevo de cada projeto pelo chamado de origem
      const { data: origens, error: origErr } = await supabase
        .from("chamados_0800")
        .select("numero_chamado, id_cliente_ellevo")
        .in("numero_chamado", [...new Set(janelas.map((j) => j.ticket))]);
      if (origErr) throw origErr;
      const ticketToCliente = new Map(
        (origens ?? []).map((o) => [o.numero_chamado as string, o.id_cliente_ellevo as number])
      );
      const resolvidas = janelas
        .map((j) => ({ ...j, idCliente: ticketToCliente.get(j.ticket) }))
        .filter(
          (j): j is JanelaPos & { posConcluido: boolean; idCliente: number } =>
            j.idCliente !== undefined
        );
      const projetos: ProjetoPos[] = resolvidas.map((j) => ({
        id: j.projetoId,
        cliente: j.cliente,
        produto: j.produto,
        ticket: j.ticket,
        inicioPos: j.inicio,
        fimPos: j.fim,
        posConcluido: j.posConcluido,
      }));
      if (resolvidas.length === 0) return { chamados: [], projetosEmPos: 0, projetos: [] };

      const janelasPorCliente = new Map<number, (JanelaPos & { idCliente: number })[]>();
      for (const j of resolvidas) {
        const lista = janelasPorCliente.get(j.idCliente) ?? [];
        lista.push(j);
        janelasPorCliente.set(j.idCliente, lista);
      }

      // 3. Chamados dos clientes em pós, a partir da menor janela (+ cortes do usuário)
      const minInicio = resolvidas.map((j) => j.inicio).sort()[0];
      let q = supabase
        .from("chamados_0800")
        .select("*")
        .in("id_cliente_ellevo", [...janelasPorCliente.keys()])
        .gte("data_abertura", inicio && inicio > minInicio ? inicio : minInicio)
        .order("data_abertura", { ascending: false })
        .limit(5000);
      if (fim) q = q.lte("data_abertura", fim);
      const { data, error } = await q;
      if (error) throw error;

      // 4. Casa cada chamado com a primeira janela que o contém
      const chamados: ChamadoPanorama[] = [];
      for (const raw of data ?? []) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = raw as any;
        if (isNaturezaIgnorada(r.natureza)) continue;
        const c = mapChamado0800(r);
        if (!c.dataAbertura) continue;
        const janela = (janelasPorCliente.get(r.id_cliente_ellevo as number) ?? []).find(
          (j) =>
            c.dataAbertura! >= j.inicio &&
            c.dataAbertura! <= j.fim &&
            softwareMatchesSystemType(c.software, j.produto)
        );
        if (!janela) continue;
        chamados.push({
          ...c,
          projetoId: janela.projetoId,
          projetoCliente: janela.cliente,
          projetoProduto: janela.produto,
        });
      }

      const lastSyncedAt = chamados.reduce<string | undefined>(
        (max, c) => (c.syncedAt && (!max || c.syncedAt > max) ? c.syncedAt : max),
        undefined
      );

      return { chamados, projetosEmPos: resolvidas.length, projetos, lastSyncedAt };
    },
  });
}

export interface PosSaude {
  total: number;
  abertos: number;
  criticosAbertos: number;
}

/**
 * Saúde do pós por projeto (selo na lista de projetos): UMA consulta para a
 * carteira inteira (mesma base do Panorama), compartilhada entre todos os cards
 * via cache do react-query. Map projectId -> contadores de chamados no pós.
 */
export function usePosSaude() {
  const { data } = usePosPanorama(null, null);
  return useQuery<Map<string, PosSaude>>({
    queryKey: ["posSaudeMap", data?.chamados.length ?? -1],
    enabled: !!data,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const map = new Map<string, PosSaude>();
      for (const c of data?.chamados ?? []) {
        const s = map.get(c.projetoId) ?? { total: 0, abertos: 0, criticosAbertos: 0 };
        s.total++;
        if (!c.dataEncerramento) {
          s.abertos++;
          const crit = (c.criticidade || "").toLowerCase();
          if (crit.includes("crítico") && !crit.includes("não")) s.criticosAbertos++;
        }
        map.set(c.projetoId, s);
      }
      // Projetos com pós e zero chamados tambem ganham selo (verde)
      for (const p of data?.projetos ?? []) {
        if (!map.has(p.id)) map.set(p.id, { total: 0, abertos: 0, criticosAbertos: 0 });
      }
      return map;
    },
  });
}

/**
 * Parecer IA da CARTEIRA (Panorama): job 'panorama_parecer' na fila dtc_ai_jobs
 * com project_id null (nao pertence a um projeto). Mesmo fluxo do parecer por
 * projeto: input_text JSON agregado -> worker -> result_text.
 */
export function usePanoramaParecer() {
  const queryClient = useQueryClient();
  const queryKey = ["panoramaParecer"];

  const { data: jobs = [] } = useQuery<ParecerPosJob[]>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dtc_ai_jobs")
        .select("id, status, result_text, error_message, progress, created_at")
        .eq("job_type", "panorama_parecer")
        .is("project_id", null)
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
      project_id: null,
      job_type: "panorama_parecer",
      target_field: "panorama",
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
