import sql from "mssql";
import { supabase } from "./supabase.js";
import { config } from "./config.js";

/**
 * Sync de chamados 0800 (Ellevo) -> espelho public.chamados_0800 no Supabase.
 *
 * Fonte: SQL Server interno (Siplan_AcessoIA.dbo.vw_2026_ChamadosTodosStatus),
 * alcancavel so de dentro da rede da empresa -- por isso o sync mora aqui no
 * worker e nao numa edge function. A view e passiva (nao emite eventos), entao
 * o espelho e atualizado por polling; automacoes em tempo quase real devem
 * escutar INSERT/UPDATE na tabela espelho via Database Webhook do Supabase.
 *
 * Escopo sincronizado (mantem o espelho pequeno):
 *  1. O chamado de ORIGEM de cada projeto (projects.ticket_number) -- e ele que
 *     resolve o vinculo projeto -> IDCliente do Ellevo.
 *  2. Todos os chamados dos clientes que tem projeto com pos-implantacao
 *     definida, abertos a partir do inicio do pos (menor post_start_date do
 *     cliente). Clientes cujo pos terminou ha mais de chamadosSyncGraceDays
 *     dias saem do escopo (o espelho preserva o historico ja gravado).
 *
 * A view tem uma linha por TRAMITE; aqui deduplicamos por NumeroChamado
 * (ROW_NUMBER) porque o espelho guarda so os dados do chamado.
 */

interface ViewRow {
  NumeroChamado: string;
  IDCliente: number;
  CardCode0800: string | null;
  ClienteChamado: string | null;
  solicitante: string | null;
  TituloChamado: string | null;
  DescricaoChamado: string | null;
  natureza: string | null;
  StatusChamado: string | null;
  Criticidade: string | null;
  Software: string | null;
  Produto: string | null;
  EquipeResponsavelChamado: string | null;
  DataAberturaChamado: Date | null;
  DataEncerramentoChamado: Date | null;
}

interface ProjectRow {
  ticket_number: string | null;
  post_start_date: string | null;
  post_end_date: string | null;
}

interface ProcessoVendaSyncRequest {
  id: string;
  start_date: string;
  end_date: string;
}

// Colunas de chamado da view + dedupe por NumeroChamado (1 linha por chamado).
const CHAMADO_SELECT = `
  WITH c AS (
    SELECT NumeroChamado, IDCliente, CardCode0800, ClienteChamado, solicitante,
           TituloChamado, DescricaoChamado, natureza, StatusChamado, Criticidade,
           Software, Produto, EquipeResponsavelChamado,
           DataAberturaChamado, DataEncerramentoChamado,
           ROW_NUMBER() OVER (PARTITION BY NumeroChamado ORDER BY DataAberturaChamado DESC) AS rn
    FROM dbo.vw_2026_ChamadosTodosStatus
    WHERE %COND%
  )
  SELECT * FROM c WHERE rn = 1
`;

/**
 * DescricaoChamado vem do Ellevo com o documento UTF-16LE gravado cru dentro de
 * um varchar (comeca com o BOM 0xFF 0xFE, que o driver entrega como "ÿþ") e com
 * HTML embutido. Decodifica para texto puro legivel.
 */
export function decodeDescricao(raw: string | null): string | null {
  if (!raw) return null;
  let text = raw;
  if (text.startsWith("ÿþ")) {
    text = Buffer.from(text, "latin1").toString("utf16le").slice(1); // pula o BOM
  }
  const fromCode = (code: number): string => {
    try {
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    } catch {
      return "";
    }
  };
  text = text
    .replace(/<[^>]*>/g, " ")
    .replace(/&gt;/gi, ">")
    .replace(/&lt;/gi, "<")
    .replace(/&quot;/gi, '"')
    .replace(/&nbsp;/gi, " ")
    // Entidades numericas ("Certid&#227;o" -> "Certidão"; tambem &#x hex)
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => fromCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => fromCode(Number(d)))
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
  // Descricoes vem de e-mails/editores e podem ser enormes; o modal nao precisa
  // de mais que isso e o espelho fica leve.
  return text.length > 8000 ? text.slice(0, 8000) + "…" : text || null;
}

/** "LORENA - TABELIONATO ... - Chamado: 746485" -> "LORENA - TABELIONATO ..." */
export function cleanNomeCliente(raw: string | null): string | null {
  if (!raw) return null;
  return raw.replace(/\s*-\s*Chamado:\s*\d+\s*$/i, "").trim() || null;
}

function toIsoDate(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

function mapRow(r: ViewRow) {
  return {
    numero_chamado: r.NumeroChamado,
    id_cliente_ellevo: r.IDCliente,
    cardcode_0800: r.CardCode0800,
    nome_cliente: cleanNomeCliente(r.ClienteChamado),
    solicitante: r.solicitante,
    titulo: r.TituloChamado,
    descricao: decodeDescricao(r.DescricaoChamado),
    natureza: r.natureza,
    status: r.StatusChamado,
    criticidade: r.Criticidade,
    software: r.Software,
    produto: r.Produto,
    equipe_responsavel: r.EquipeResponsavelChamado,
    data_abertura: toIsoDate(r.DataAberturaChamado),
    data_encerramento: toIsoDate(r.DataEncerramentoChamado),
    synced_at: new Date().toISOString(),
  };
}

async function upsertChamados(rows: ReturnType<typeof mapRow>[]): Promise<void> {
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await supabase
      .from("chamados_0800")
      .upsert(rows.slice(i, i + 200), { onConflict: "numero_chamado" });
    if (error) throw new Error(`upsert chamados_0800: ${error.message}`);
  }
}

async function runOnce(): Promise<string> {
  // 1. Projetos ativos com numero de chamado valido
  const { data: projects, error: projError } = await supabase
    .from("projects")
    .select("ticket_number, post_start_date, post_end_date")
    .eq("is_deleted", false);
  if (projError) throw new Error(`select projects: ${projError.message}`);

  const tickets = [
    ...new Set(
      (projects as ProjectRow[])
        .map((p) => (p.ticket_number || "").trim())
        .filter((t) => /^\d{4,}$/.test(t))
    ),
  ];
  if (tickets.length === 0) return "0 projetos com ticket valido";

  const pool = await new sql.ConnectionPool({
    server: config.mssqlHost,
    port: config.mssqlPort,
    database: config.mssqlDatabase,
    user: config.mssqlUser,
    password: config.mssqlPassword,
    options: { encrypt: false, trustServerCertificate: true },
    requestTimeout: 120000,
  }).connect();

  try {
    // 2. Chamados de origem dos projetos -> resolve ticket -> IDCliente
    //    (tickets ja validados como so-digitos acima; seguro interpolar)
    const inList = tickets.map((t) => `'${t}'`).join(",");
    const origem = await pool
      .request()
      .query<ViewRow>(CHAMADO_SELECT.replace("%COND%", `NumeroChamado IN (${inList})`));

    const ticketToCliente = new Map<string, number>();
    for (const r of origem.recordset) ticketToCliente.set(r.NumeroChamado, r.IDCliente);

    // 3. Janela de sync por cliente: menor post_start_date entre os projetos
    //    do cliente; cliente sai do escopo quando todo pos terminou ha mais de
    //    chamadosSyncGraceDays dias.
    const hoje = new Date();
    const limiteGraca = new Date(hoje.getTime() - config.chamadosSyncGraceDays * 86400000);
    const janelaPorCliente = new Map<number, string>(); // IDCliente -> data inicio (ISO)
    for (const p of projects as ProjectRow[]) {
      const ticket = (p.ticket_number || "").trim();
      const idCliente = ticketToCliente.get(ticket);
      if (!idCliente || !p.post_start_date) continue;
      if (p.post_end_date && new Date(p.post_end_date) < limiteGraca) continue;
      const atual = janelaPorCliente.get(idCliente);
      if (!atual || p.post_start_date < atual) janelaPorCliente.set(idCliente, p.post_start_date);
    }

    // 4. Chamados dos clientes em escopo (a partir da menor janela global;
    //    o corte fino por cliente e feito abaixo em JS)
    let doPeriodo: ViewRow[] = [];
    if (janelaPorCliente.size > 0) {
      const ids = [...janelaPorCliente.keys()].join(",");
      const minStart = [...janelaPorCliente.values()].sort()[0];
      const req = pool.request();
      req.input("minStart", sql.Date, minStart);
      const res = await req.query<ViewRow>(
        CHAMADO_SELECT.replace(
          "%COND%",
          `IDCliente IN (${ids}) AND DataAberturaChamado >= @minStart`
        )
      );
      doPeriodo = res.recordset.filter((r) => {
        const inicio = janelaPorCliente.get(r.IDCliente);
        const abertura = toIsoDate(r.DataAberturaChamado);
        return inicio !== undefined && abertura !== null && abertura >= inicio;
      });
    }

    // 5. Upsert (origem + periodo), dedupe entre os dois conjuntos
    const porNumero = new Map<string, ViewRow>();
    for (const r of [...origem.recordset, ...doPeriodo]) porNumero.set(r.NumeroChamado, r);
    const rows = [...porNumero.values()].map(mapRow);
    if (rows.length > 0) await upsertChamados(rows);

    const detail =
      `${rows.length} chamados (${origem.recordset.length} origem, ` +
      `${doPeriodo.length} do periodo, ${janelaPorCliente.size} clientes em pos)`;
    console.log(`[chamados-sync] ok: ${detail}`);
    return detail;
  } finally {
    await pool.close();
  }
}

/**
 * Marca como concluidos (ou com erro) os pedidos de "sincronizar agora" feitos
 * pelo botao do card de Pos (tabela chamados_sync_requests). Best-effort.
 */
async function resolvePendingRequests(status: "done" | "error", detail: string): Promise<void> {
  try {
    await supabase
      .from("chamados_sync_requests")
      .update({ status, detail, finished_at: new Date().toISOString() })
      .eq("status", "pending")
      .eq("scope", "chamados_0800");
  } catch {
    /* best-effort */
  }
}

let syncRunning = false;

export function startChamadosSync(): void {
  if (!config.mssqlHost || !config.mssqlUser || !config.mssqlPassword) {
    console.log("[chamados-sync] desligado (MSSQL_HOST/MSSQL_USER/MSSQL_PASSWORD ausentes no .env).");
    return;
  }
  const tick = async () => {
    if (syncRunning) return; // rodada anterior ainda em andamento
    syncRunning = true;
    try {
      const detail = await runOnce();
      await resolvePendingRequests("done", detail);
    } catch (err) {
      // Falha de rede/SQL nao derruba o worker: proxima rodada tenta de novo e
      // o front continua servindo o ultimo snapshot do espelho.
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[chamados-sync] erro:", msg);
      await resolvePendingRequests("error", msg);
    } finally {
      syncRunning = false;
    }
  };
  void tick();
  setInterval(() => { void tick(); }, config.chamadosSyncIntervalMs);

  // Botao "sincronizar agora" do card de Pos: INSERT em chamados_sync_requests
  // acorda o sync na hora (sem esperar o intervalo). Fallback: se o Realtime
  // falhar, o proprio tick periodico resolve os pedidos pendentes.
  supabase
    .channel(`chamados-sync-requests-${config.workerId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chamados_sync_requests",
        filter: "scope=eq.chamados_0800",
      },
      () => { void tick(); }
    )
    .subscribe();

  console.log(
    `[chamados-sync] ativo: ${config.mssqlHost}:${config.mssqlPort}/${config.mssqlDatabase} ` +
      `a cada ${Math.round(config.chamadosSyncIntervalMs / 1000)}s (+ sync sob demanda via Realtime)`
  );
}

async function runProcessoVendaOnce(startDate: string, endDate: string): Promise<string> {
  const pool = await new sql.ConnectionPool({
    server: config.mssqlHost,
    port: config.mssqlPort,
    database: config.mssqlDatabase,
    user: config.mssqlUser,
    password: config.mssqlPassword,
    options: { encrypt: false, trustServerCertificate: true },
    requestTimeout: config.processoVendaRequestTimeoutMs,
  }).connect();

  try {
    // Filtra a view antes do ROW_NUMBER para o SQL Server nao varrer todo o
    // historico a cada ciclo. O periodo pode ser a janela padrao ou uma faixa
    // historica solicitada pela tela.
    const res = await pool
      .request()
      .input("startDate", sql.Date, startDate)
      .input("endDate", sql.Date, endDate)
      .query<any>(`
      WITH processo AS (
        SELECT NumeroChamado, codigoCliente, NomeCliente, RazaoSocialCliente,
               DataPedidoVenda, NumeroPedidoVenda, TituloChamado, descricaotramite,
               Natureza, Software, SoftwareLicenciadoPV, ResumoItem,
               DataAberturaChamado, SolDataFechamento,
               ROW_NUMBER() OVER (
                 PARTITION BY NumeroChamado
                 ORDER BY DataAtividade DESC, DataPedidoVenda DESC, AbsID DESC
               ) AS rn
        FROM dbo.vw_2026_PROCESSO_VENDA_FATURAMENTO_ITEM_ATIVIDADES
        WHERE NumeroChamado IS NOT NULL
          AND DataAberturaChamado >= @startDate
          AND DataAberturaChamado < DATEADD(DAY, 1, @endDate)
      ),
      chamados AS (
        SELECT NumeroChamado, StatusChamado,
               ROW_NUMBER() OVER (
                 PARTITION BY NumeroChamado
                 ORDER BY DataAtividade DESC, DataAberturaChamado DESC
               ) AS rn
        FROM dbo.vw_2026_ChamadosTodosStatus
        WHERE DataAberturaChamado >= @startDate
          AND DataAberturaChamado < DATEADD(DAY, 1, @endDate)
      )
      SELECT p.*, c.StatusChamado
      FROM processo p
      LEFT JOIN chamados c
        ON c.NumeroChamado = CONVERT(varchar(50), p.NumeroChamado)
       AND c.rn = 1
      WHERE p.rn = 1
    `);

    const rows = res.recordset.map((r) => ({
      numero_chamado: String(r.NumeroChamado),
      codigo_cliente: r.codigoCliente ? String(r.codigoCliente) : null,
      nome_cliente: cleanNomeCliente(r.NomeCliente),
      razao_social_cliente: r.RazaoSocialCliente || null,
      data_pedido_venda: toIsoDate(r.DataPedidoVenda),
      numero_pedido_venda: r.NumeroPedidoVenda ? String(r.NumeroPedidoVenda) : null,
      titulo: r.TituloChamado || null,
      descricao: decodeDescricao(r.descricaotramite),
      natureza: r.Natureza || null,
      status: r.StatusChamado || "Não iniciado",
      software: r.Software || null,
      produto: r.SoftwareLicenciadoPV || r.ResumoItem || null,
      data_abertura: toIsoDate(r.DataAberturaChamado || r.DataPedidoVenda),
      data_encerramento: toIsoDate(r.SolDataFechamento),
      synced_at: new Date().toISOString(),
    }));

    if (rows.length > 0) {
      // Upsert em lotes de 200 na tabela chamados_processo_venda
      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await supabase
          .from("chamados_processo_venda")
          .upsert(rows.slice(i, i + 200), { onConflict: "numero_chamado" });
        if (error) throw new Error(`upsert chamados_processo_venda: ${error.message}`);
      }
    }

    const detail = `${rows.length} chamados sincronizados no periodo ${startDate} a ${endDate}`;
    console.log(`[processo-venda-sync] ok: ${detail}`);
    return detail;
  } finally {
    await pool.close();
  }
}

let processoVendaSyncRunning = false;
let processoVendaSyncRequested = false;

function isoDateDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

async function getPendingProcessoVendaRequest(): Promise<ProcessoVendaSyncRequest | null> {
  const { data, error } = await supabase
    .from("chamados_sync_requests")
    .select("id, start_date, end_date")
    .eq("scope", "processo_venda")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`select processo venda sync request: ${error.message}`);
  return data as ProcessoVendaSyncRequest | null;
}

async function resolveProcessoVendaRequest(
  id: string,
  status: "done" | "error",
  detail: string
): Promise<void> {
  const { error } = await supabase
    .from("chamados_sync_requests")
    .update({ status, detail, finished_at: new Date().toISOString() })
    .eq("id", id);
  if (error) console.error("[processo-venda-sync] erro ao concluir pedido:", error.message);
}

export function startProcessoVendaSync(): void {
  if (!config.mssqlHost || !config.mssqlUser || !config.mssqlPassword) {
    console.log("[processo-venda-sync] desligado (MSSQL_HOST/MSSQL_USER/MSSQL_PASSWORD ausentes).");
    return;
  }
  const tick = async () => {
    if (processoVendaSyncRunning) {
      processoVendaSyncRequested = true;
      return;
    }
    processoVendaSyncRunning = true;
    try {
      const request = await getPendingProcessoVendaRequest();
      if (request) {
        try {
          const detail = await runProcessoVendaOnce(request.start_date, request.end_date);
          await resolveProcessoVendaRequest(request.id, "done", detail);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await resolveProcessoVendaRequest(request.id, "error", msg);
          throw err;
        }
      } else {
        await runProcessoVendaOnce(
          isoDateDaysAgo(Math.max(config.processoVendaSyncDays - 1, 0)),
          isoDateDaysAgo(0)
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[processo-venda-sync] erro:", msg);
    } finally {
      processoVendaSyncRunning = false;
      if (processoVendaSyncRequested) {
        processoVendaSyncRequested = false;
        void tick();
      }
    }
  };
  void tick();
  // Roda a cada intervalo de sincronização configurado (ex: 5 min)
  setInterval(() => { void tick(); }, config.chamadosSyncIntervalMs);

  supabase
    .channel(`processo-venda-sync-requests-${config.workerId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chamados_sync_requests",
        filter: "scope=eq.processo_venda",
      },
      () => { void tick(); }
    )
    .subscribe();
}
