import sql from "mssql";
import { supabase } from "./supabase.js";
import { config } from "./config.js";
import { normalizeChamadoStatus } from "./chamadosStatus.js";

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
  requested_by: string | null;
  filters: ProcessoVendaSyncFilters | null;
}

interface ProcessoVendaSyncFilters {
  client_names?: string[];
  product?: string | null;
  nature?: string | null;
  statuses?: string[];
  search_term?: string | null;
}

interface ProcessoVendaSyncResult {
  detail: string;
  ticketNumbers: string[];
}

interface ProcessoVendaRunControl {
  cancelled: boolean;
  reason: string;
  activeSqlRequest: sql.Request | null;
}

class ProcessoVendaSyncCancelledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProcessoVendaSyncCancelledError";
  }
}

function cancelProcessoVendaRun(
  control: ProcessoVendaRunControl | null,
  reason: string
): void {
  if (!control || control.cancelled) return;
  control.cancelled = true;
  control.reason = reason;
  try {
    control.activeSqlRequest?.cancel();
  } catch (err) {
    console.warn("[processo-venda-sync] falha ao cancelar request MSSQL:", err);
  }
}

function assertProcessoVendaRunActive(control?: ProcessoVendaRunControl): void {
  if (control?.cancelled) {
    throw new ProcessoVendaSyncCancelledError(control.reason || "Consulta cancelada.");
  }
}

async function executeControlledQuery<T>(
  request: sql.Request,
  query: string,
  control?: ProcessoVendaRunControl
) {
  assertProcessoVendaRunActive(control);
  if (control) control.activeSqlRequest = request;
  try {
    return await request.query<T>(query);
  } catch (err) {
    assertProcessoVendaRunActive(control);
    throw err;
  } finally {
    if (control?.activeSqlRequest === request) control.activeSqlRequest = null;
  }
}

interface ProcessoVendaTramiteRow {
  NumeroChamado: string;
  NumeroTramite: number | null;
  SequenciaTramite: number;
  DataTramiteIso: string | null;
  ResponsavelTramite: string | null;
  ResponsavelAtividade: string | null;
  EquipeResponsavelAtividade: string | null;
  DescricaoAtividade: string | null;
  descricaotramite: string | null;
}

interface ProcessoVendaViewRow {
  NumeroChamado: string | number;
  codigoCliente: string | number | null;
  NomeCliente: string | null;
  RazaoSocialCliente: string | null;
  TituloChamado: string | null;
  descricaotramite: string | null;
  Natureza: string | null;
  StatusChamado: string | null;
  Software: string | null;
  Produto: string | null;
  DataAberturaChamado: Date | null;
  SolDataFechamento: Date | null;
}

function cleanFilterValues(values?: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(
    values
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean)
  )];
}

function normalizeProcessoVendaFilters(
  filters?: ProcessoVendaSyncFilters | null
): ProcessoVendaSyncFilters {
  return {
    client_names: cleanFilterValues(filters?.client_names),
    product: typeof filters?.product === "string" ? filters.product.trim() : null,
    nature: typeof filters?.nature === "string" ? filters.nature.trim() : null,
    statuses: cleanFilterValues(filters?.statuses)
      .map((status) => normalizeChamadoStatus(status))
      .filter((status): status is string => Boolean(status)),
    search_term:
      typeof filters?.search_term === "string" && filters.search_term.trim()
        ? filters.search_term.trim()
        : null,
  };
}

function getWorkerOrionProductPattern(product?: string | null): string | null {
  const normalized = (product || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!normalized || normalized === "todos") return null;
  if (normalized === "oriontn") return "orion%tn%";
  if (normalized === "orionpro") return "orion%pro%";
  if (normalized === "orionreg") return "orion%reg%";
  return "orion%";
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

async function runProcessoVendaOnce(
  startDate: string,
  endDate: string,
  requestedFilters: ProcessoVendaSyncFilters = {},
  control?: ProcessoVendaRunControl
): Promise<ProcessoVendaSyncResult> {
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
    const filters = normalizeProcessoVendaFilters(requestedFilters);
    const chamadoRequest = pool
      .request()
      .input("startDate", sql.Date, startDate)
      .input("endDate", sql.Date, endDate);
    const whereClauses = [
      "DataAberturaChamado >= @startDate",
      "DataAberturaChamado < DATEADD(DAY, 1, @endDate)",
    ];

    if (filters.client_names && filters.client_names.length > 0) {
      const parameters = filters.client_names.map((client, index) => {
        const name = `client${index}`;
        chamadoRequest.input(name, sql.NVarChar(500), client);
        return `@${name}`;
      });
      whereClauses.push(
        `LTRIM(RTRIM(NomeCliente)) COLLATE Latin1_General_CI_AI IN (${parameters.join(", ")})`
      );
    }

    const productPattern = getWorkerOrionProductPattern(filters.product);
    if (productPattern) {
      chamadoRequest.input("softwarePattern", sql.NVarChar(100), productPattern);
      whereClauses.push(
        "LTRIM(RTRIM(Software)) COLLATE Latin1_General_CI_AI LIKE @softwarePattern"
      );
    }

    if (filters.nature && filters.nature.toLowerCase() !== "todas") {
      chamadoRequest.input("nature", sql.NVarChar(300), filters.nature);
      whereClauses.push(
        "LTRIM(RTRIM(Natureza)) COLLATE Latin1_General_CI_AI = @nature"
      );
    }

    if (filters.statuses && filters.statuses.length > 0) {
      const parameters = filters.statuses.map((status, index) => {
        const name = `status${index}`;
        chamadoRequest.input(name, sql.NVarChar(100), status);
        return `@${name}`;
      });
      whereClauses.push(
        `LTRIM(RTRIM(StatusChamado)) COLLATE Latin1_General_CI_AI IN (${parameters.join(", ")})`
      );
    }

    if (filters.search_term) {
      chamadoRequest.input("searchLike", sql.NVarChar(1000), `%${filters.search_term}%`);
      const searchParts = [
        "NomeCliente COLLATE Latin1_General_CI_AI LIKE @searchLike",
        "TituloChamado COLLATE Latin1_General_CI_AI LIKE @searchLike",
        "CAST(descricaotramite AS nvarchar(max)) COLLATE Latin1_General_CI_AI LIKE @searchLike",
      ];
      if (/^\d+$/.test(filters.search_term)) {
        chamadoRequest.input("searchNumber", sql.VarChar(50), filters.search_term);
        searchParts.unshift("CONVERT(varchar(50), NumeroChamado) = @searchNumber");
      }
      whereClauses.push(`(${searchParts.join(" OR ")})`);
    }

    // View exclusiva da Consulta de Chamados: ja entrega uma linha por chamado,
    // somente produtos Orion e sem o join 1:N de itens de venda/faturamento.
    // O periodo continua no SQL para o otimizador consultar apenas a janela.
    const res = await executeControlledQuery<ProcessoVendaViewRow>(chamadoRequest, `
      SELECT NumeroChamado, codigoCliente, NomeCliente, RazaoSocialCliente,
             TituloChamado, descricaotramite, Natureza, StatusChamado,
             Software, Produto, DataAberturaChamado, SolDataFechamento
      FROM dbo.vw_2026_HUB_CONSULTA_CHAMADOS_ORION
      WHERE ${whereClauses.join("\n        AND ")}
    `, control);

    assertProcessoVendaRunActive(control);

    const rows = res.recordset.map((r) => ({
      numero_chamado: String(r.NumeroChamado),
      codigo_cliente: r.codigoCliente ? String(r.codigoCliente) : null,
      nome_cliente: cleanNomeCliente(r.NomeCliente),
      razao_social_cliente: r.RazaoSocialCliente || null,
      data_pedido_venda: null,
      numero_pedido_venda: null,
      titulo: r.TituloChamado || null,
      descricao: decodeDescricao(r.descricaotramite),
      natureza: r.Natureza || null,
      status: normalizeChamadoStatus(r.StatusChamado) || "Não iniciado",
      software: r.Software || null,
      produto: r.Produto || null,
      data_abertura: toIsoDate(r.DataAberturaChamado),
      data_encerramento: toIsoDate(r.SolDataFechamento),
      synced_at: new Date().toISOString(),
    }));

    if (rows.length > 0) {
      // Upsert em lotes de 200 na tabela chamados_processo_venda
      for (let i = 0; i < rows.length; i += 200) {
        assertProcessoVendaRunActive(control);
        const { error } = await supabase
          .from("chamados_processo_venda")
          .upsert(rows.slice(i, i + 200), { onConflict: "numero_chamado" });
        if (error) throw new Error(`upsert chamados_processo_venda: ${error.message}`);
      }
    }

    // A view usada acima mantem uma linha por chamado. O historico 1:N vem da
    // view base do Ellevo, que possui uma linha por tramite. SequenciaTramite e
    // a chave estavel; SELECT DISTINCT elimina repeticoes causadas pelos joins
    // internos da view sem descartar movimentacoes diferentes.
    const ticketNumbers = [...new Set(rows.map((row) => row.numero_chamado))];
    const tramiteRows: ProcessoVendaTramiteRow[] = [];
    const tramiteTicketBatchSize = 500;

    // O historico e a parte mais pesada da view 1:N. Consultar somente os IDs
    // encontrados pelo SELECT filtrado evita reler todos os tramites do periodo.
    for (let from = 0; from < ticketNumbers.length; from += tramiteTicketBatchSize) {
      assertProcessoVendaRunActive(control);
      const batch = ticketNumbers.slice(from, from + tramiteTicketBatchSize);
      const tramiteRequest = pool
        .request()
        .input("startDate", sql.Date, startDate)
        .input("endDate", sql.Date, endDate);
      const ticketParameters = batch.map((ticket, index) => {
        const name = `ticket${index}`;
        tramiteRequest.input(name, sql.VarChar(50), ticket);
        return `@${name}`;
      });

      const tramitesResult = await executeControlledQuery<ProcessoVendaTramiteRow>(tramiteRequest, `
        SELECT DISTINCT
               NumeroChamado, NumeroTramite, SequenciaTramite,
               CONVERT(varchar(19), DataTramite, 126) AS DataTramiteIso,
               ResponsavelTramite, ResponsavelAtividade,
               EquipeResponsavelAtividade, DescricaoAtividade,
               CAST(descricaotramite AS nvarchar(max)) AS descricaotramite
        FROM plataformaellevo..vw_ChamadosTodosStatus_Tramites_Tempos
        WHERE DataAberturaChamado >= @startDate
          AND DataAberturaChamado < DATEADD(DAY, 1, @endDate)
          AND LTRIM(RTRIM(Software)) LIKE 'Orion%'
          AND CONVERT(varchar(50), NumeroChamado) IN (${ticketParameters.join(", ")})
          AND SequenciaTramite IS NOT NULL
          AND NULLIF(LTRIM(RTRIM(CAST(descricaotramite AS nvarchar(max)))), '') IS NOT NULL
      `, control);
      tramiteRows.push(...tramitesResult.recordset);
    }

    const tramitesPorChave = new Map<string, {
      numero_chamado: string;
      sequencia_tramite: number;
      numero_tramite: number | null;
      data_tramite: string | null;
      responsavel: string | null;
      equipe_responsavel: string | null;
      atividade: string | null;
      descricao: string | null;
      synced_at: string;
    }>();

    for (const tramite of tramiteRows) {
      const numeroChamado = String(tramite.NumeroChamado);
      const sequenciaTramite = Number(tramite.SequenciaTramite);
      const chave = `${numeroChamado}:${sequenciaTramite}`;
      tramitesPorChave.set(chave, {
        numero_chamado: numeroChamado,
        sequencia_tramite: sequenciaTramite,
        numero_tramite: tramite.NumeroTramite ?? null,
        data_tramite: tramite.DataTramiteIso || null,
        responsavel: tramite.ResponsavelTramite || tramite.ResponsavelAtividade || null,
        equipe_responsavel: tramite.EquipeResponsavelAtividade || null,
        atividade: tramite.DescricaoAtividade || null,
        descricao: decodeDescricao(tramite.descricaotramite),
        synced_at: new Date().toISOString(),
      });
    }

    const tramites = [...tramitesPorChave.values()];
    for (let i = 0; i < tramites.length; i += 200) {
      assertProcessoVendaRunActive(control);
      const { error } = await supabase
        .from("chamados_processo_venda_tramites")
        .upsert(tramites.slice(i, i + 200), {
          onConflict: "numero_chamado,sequencia_tramite",
        });
      if (error) {
        throw new Error(`upsert chamados_processo_venda_tramites: ${error.message}`);
      }
    }

    const detail =
      `${rows.length} chamados e ${tramites.length} tramites sincronizados ` +
      `no periodo ${startDate} a ${endDate}`;
    console.log(`[processo-venda-sync] ok: ${detail}`);
    return { detail, ticketNumbers };
  } finally {
    await pool.close();
  }
}

let processoVendaGeneralSyncRunning = false;
let processoVendaRequestSyncRunning = false;
let processoVendaRequestSyncRequested = false;
let activeProcessoVendaRequest: {
  request: ProcessoVendaSyncRequest;
  control: ProcessoVendaRunControl;
} | null = null;
let activeProcessoVendaGeneralControl: ProcessoVendaRunControl | null = null;

const PROCESSO_VENDA_QUEUE_POLL_MS = 3_000;
const SUPERSEDED_REQUEST_DETAIL =
  "Substituida por uma consulta mais recente do mesmo usuario.";

function isoDateDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

async function getPendingProcessoVendaRequest(): Promise<ProcessoVendaSyncRequest | null> {
  const { data, error } = await supabase
    .from("chamados_sync_requests")
    .select("id, start_date, end_date, requested_by, filters")
    .eq("scope", "processo_venda")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`select processo venda sync request: ${error.message}`);
  return data as ProcessoVendaSyncRequest | null;
}

async function recoverInterruptedProcessoVendaRequests(): Promise<void> {
  const { error } = await supabase
    .from("chamados_sync_requests")
    .update({
      status: "pending",
      detail: "Retomada apos reinicio do worker.",
      finished_at: null,
    })
    .eq("scope", "processo_venda")
    .eq("status", "processing");
  if (error) throw new Error(`recover processo venda requests: ${error.message}`);
}

async function supersedeDuplicatePendingRequests(): Promise<void> {
  const { data, error } = await supabase
    .from("chamados_sync_requests")
    .select("id, requested_by, created_at")
    .eq("scope", "processo_venda")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`coalesce processo venda requests: ${error.message}`);

  const newestByRequester = new Set<string>();
  const supersededIds: string[] = [];
  for (const row of data || []) {
    const requesterKey = row.requested_by || "__sem_solicitante__";
    if (newestByRequester.has(requesterKey)) supersededIds.push(row.id);
    else newestByRequester.add(requesterKey);
  }

  for (let i = 0; i < supersededIds.length; i += 100) {
    const { error: updateError } = await supabase
      .from("chamados_sync_requests")
      .update({
        status: "error",
        detail: SUPERSEDED_REQUEST_DETAIL,
        finished_at: new Date().toISOString(),
      })
      .in("id", supersededIds.slice(i, i + 100))
      .eq("status", "pending");
    if (updateError) {
      throw new Error(`supersede processo venda requests: ${updateError.message}`);
    }
  }

  if (supersededIds.length > 0) {
    console.log(
      `[processo-venda-sync] ${supersededIds.length} pedido(s) antigo(s) descartado(s); mantido apenas o mais recente por usuario.`
    );
  }
}

async function claimProcessoVendaRequest(id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("chamados_sync_requests")
    .update({ status: "processing", detail: "Consultando filtro na origem..." })
    .eq("id", id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`claim processo venda request: ${error.message}`);
  return Boolean(data?.id);
}

async function cancelActiveRequestWhenSuperseded(): Promise<void> {
  if (!activeProcessoVendaRequest) return;
  const { data, error } = await supabase
    .from("chamados_sync_requests")
    .select("status, detail")
    .eq("id", activeProcessoVendaRequest.request.id)
    .maybeSingle();
  if (error) {
    console.warn("[processo-venda-sync] falha ao conferir cancelamento:", error.message);
    return;
  }
  if (data?.status !== "processing") {
    cancelProcessoVendaRun(
      activeProcessoVendaRequest.control,
      data?.detail || "Consulta substituida ou cancelada."
    );
  }
}

async function resolveProcessoVendaRequest(
  id: string,
  status: "done" | "error",
  detail: string,
  ticketNumbers: string[] = []
): Promise<void> {
  const { error } = await supabase
    .from("chamados_sync_requests")
    .update({
      status,
      detail,
      result_ticket_ids: status === "done" ? ticketNumbers : null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "processing");
  if (error) console.error("[processo-venda-sync] erro ao concluir pedido:", error.message);
}

export function startProcessoVendaSync(): void {
  if (!config.mssqlHost || !config.mssqlUser || !config.mssqlPassword) {
    console.log("[processo-venda-sync] desligado (MSSQL_HOST/MSSQL_USER/MSSQL_PASSWORD ausentes).");
    return;
  }

  const syncPendingRequests = async () => {
    if (processoVendaRequestSyncRunning) {
      processoVendaRequestSyncRequested = true;
      await cancelActiveRequestWhenSuperseded();
      return;
    }
    if (processoVendaGeneralSyncRunning) {
      processoVendaRequestSyncRequested = true;
      cancelProcessoVendaRun(
        activeProcessoVendaGeneralControl,
        "Atualizacao horaria interrompida para priorizar um filtro da tela."
      );
      return;
    }
    processoVendaRequestSyncRunning = true;
    try {
      await supersedeDuplicatePendingRequests();
      let request = await getPendingProcessoVendaRequest();
      while (request) {
        if (!(await claimProcessoVendaRequest(request.id))) {
          request = await getPendingProcessoVendaRequest();
          continue;
        }

        const control: ProcessoVendaRunControl = {
          cancelled: false,
          reason: "",
          activeSqlRequest: null,
        };
        activeProcessoVendaRequest = { request, control };
        try {
          const result = await runProcessoVendaOnce(
            request.start_date,
            request.end_date,
            request.filters || {},
            control
          );
          await resolveProcessoVendaRequest(
            request.id,
            "done",
            result.detail,
            result.ticketNumbers
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (control.cancelled) {
            console.log(`[processo-venda-sync] pedido ${request.id} cancelado: ${msg}`);
          } else {
            await resolveProcessoVendaRequest(request.id, "error", msg);
            console.error("[processo-venda-sync] erro no pedido sob demanda:", msg);
          }
        } finally {
          activeProcessoVendaRequest = null;
        }
        await supersedeDuplicatePendingRequests();
        request = await getPendingProcessoVendaRequest();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[processo-venda-sync] erro ao consultar pedidos pendentes:", msg);
    } finally {
      processoVendaRequestSyncRunning = false;
      if (processoVendaRequestSyncRequested) {
        processoVendaRequestSyncRequested = false;
        void syncPendingRequests();
      }
    }
  };

  const syncGeneralPeriod = async () => {
    if (processoVendaGeneralSyncRunning || processoVendaRequestSyncRunning) return;
    processoVendaGeneralSyncRunning = true;
    const control: ProcessoVendaRunControl = {
      cancelled: false,
      reason: "",
      activeSqlRequest: null,
    };
    activeProcessoVendaGeneralControl = control;
    try {
      await runProcessoVendaOnce(
        isoDateDaysAgo(Math.max(config.processoVendaSyncDays - 1, 0)),
        isoDateDaysAgo(0),
        {},
        control
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (control.cancelled) {
        console.log(`[processo-venda-sync] ${msg}`);
      } else {
        console.error("[processo-venda-sync] erro na atualizacao horaria:", msg);
      }
    } finally {
      activeProcessoVendaGeneralControl = null;
      processoVendaGeneralSyncRunning = false;
      if (processoVendaRequestSyncRequested) {
        processoVendaRequestSyncRequested = false;
        void syncPendingRequests();
      }
    }
  };

  // Realtime reduz a latencia; o polling garante recuperacao automatica se o
  // canal desconectar. As rotinas compartilham prioridade para nunca executar
  // duas consultas MSSQL pesadas em paralelo.
  void (async () => {
    try {
      await recoverInterruptedProcessoVendaRequests();
      await syncPendingRequests();
      await syncGeneralPeriod();
    } catch (err) {
      console.error("[processo-venda-sync] erro na inicializacao:", err);
    }
  })();
  setInterval(() => { void syncPendingRequests(); }, PROCESSO_VENDA_QUEUE_POLL_MS);
  setInterval(() => { void syncGeneralPeriod(); }, config.processoVendaSyncIntervalMs);

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
      (payload) => {
        const inserted = payload.new as { id?: string; requested_by?: string | null };
        const active = activeProcessoVendaRequest;
        if (
          active
          && inserted.id !== active.request.id
          && inserted.requested_by
          && inserted.requested_by === active.request.requested_by
        ) {
          void resolveProcessoVendaRequest(
            active.request.id,
            "error",
            SUPERSEDED_REQUEST_DETAIL
          ).finally(() => {
            cancelProcessoVendaRun(active.control, SUPERSEDED_REQUEST_DETAIL);
          });
        }
        void syncPendingRequests();
      }
    )
    .subscribe();

  console.log(
    `[processo-venda-sync] fila resiliente ativa (poll ${PROCESSO_VENDA_QUEUE_POLL_MS / 1000}s, latest-wins por usuario).`
  );
}
