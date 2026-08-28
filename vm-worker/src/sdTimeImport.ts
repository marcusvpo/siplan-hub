import sql from "mssql";
import { config } from "./config.js";
import { supabase } from "./supabase.js";
import {
  type EllevoHourRow,
  type SdTimeImportItem,
  mapEllevoHour,
} from "./sdTimeImportMapper.js";

interface SdTimeImportRequest {
  id: string;
  user_id: string;
  work_date: string;
}

interface SdTimeBulkImportRequest {
  id: string;
  start_date: string;
  end_date: string;
}

interface SdTimeBulkImportItem extends SdTimeImportItem {
  user_id: string;
  work_date: string;
}

const SD_ELLEVO_GROUPS = [
  "SD - TN/RC",
  "SD - GLOBAL",
  "SD - Protesto",
  "SD - RI/TD",
] as const;

async function claimRequest(): Promise<SdTimeImportRequest | null> {
  const { data, error } = await supabase.rpc("claim_sd_time_import_request", {
    p_worker_id: config.workerId,
  });
  if (error) throw new Error(`claim da importação de horas: ${error.message}`);
  const request = data as SdTimeImportRequest | null;
  return request?.id ? request : null;
}

async function claimBulkRequest(): Promise<SdTimeBulkImportRequest | null> {
  const { data, error } = await supabase.rpc("claim_sd_time_bulk_import_request", {
    p_worker_id: config.workerId,
  });
  if (error) throw new Error(`claim da importação geral de horas: ${error.message}`);
  const request = data as SdTimeBulkImportRequest | null;
  return request?.id ? request : null;
}

async function profileLogin(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();
  if (error) throw new Error(`perfil do usuário: ${error.message}`);

  const email = String(data?.email || "").trim().toLowerCase();
  const login = email.split("@")[0]?.trim();
  if (!login) {
    throw new Error("O perfil do HUB não possui um e-mail válido para localizar o usuário no 0800.");
  }
  return login;
}

function createMssqlPool() {
  return new sql.ConnectionPool({
    server: config.mssqlHost,
    port: config.mssqlPort,
    database: config.mssqlDatabase,
    user: config.mssqlUser,
    password: config.mssqlPassword,
    options: { encrypt: false, trustServerCertificate: true },
    requestTimeout: 120_000,
  });
}

async function fetchEllevoHours(login: string, workDate: string) {
  const pool = await createMssqlPool().connect();
  try {
    const result = await pool
      .request()
      .input("login", sql.NVarChar(200), login)
      .input("workDate", sql.Date, workDate)
      .query<EllevoHourRow>(`
        SELECT
          id_lancamento_0800,
          numero_chamado,
          sequencia_tramite,
          titulo_chamado,
          atividade,
          id_analista_0800,
          nome_analista,
          login_analista,
          id_grupo_analista_0800,
          grupo_analista,
          CONVERT(char(5), inicio, 108) AS horario_inicio,
          CONVERT(char(5), fim, 108) AS horario_fim,
          minutos,
          descricao_tramite,
          ultima_sequencia_tramite,
          data_ultimo_tramite_iso,
          descricao_ultimo_tramite,
          hora_extra,
          retrabalho,
          tipo_tempo,
          considera_contrato
        FROM dbo.horas_analistas_0800
        WHERE login_analista = @login
          AND data_lancamento = @workDate
        ORDER BY inicio, id_lancamento_0800;
      `);
    return result.recordset.map(mapEllevoHour);
  } finally {
    await pool.close();
  }
}

async function hubProfilesByLogin() {
  const { data, error } = await supabase.from("profiles").select("id, email");
  if (error) throw new Error(`perfis do HUB: ${error.message}`);

  const profiles = new Map<string, string>();
  for (const profile of data ?? []) {
    const login = String(profile.email || "").trim().toLowerCase().split("@")[0]?.trim();
    if (login && !profiles.has(login)) profiles.set(login, String(profile.id));
  }
  return profiles;
}

async function fetchEllevoWeek(startDate: string, endDate: string) {
  const pool = await createMssqlPool().connect();
  try {
    const request = pool
      .request()
      .input("startDate", sql.Date, startDate)
      .input("endDate", sql.Date, endDate);
    SD_ELLEVO_GROUPS.forEach((group, index) => {
      request.input(`group${index}`, sql.NVarChar(200), group);
    });

    const result = await request.query<EllevoHourRow & { data_lancamento_iso: string }>(`
      SELECT
        id_lancamento_0800,
        numero_chamado,
        sequencia_tramite,
        titulo_chamado,
        atividade,
        id_analista_0800,
        nome_analista,
        login_analista,
        id_grupo_analista_0800,
        grupo_analista,
        CONVERT(char(10), data_lancamento, 23) AS data_lancamento_iso,
        CONVERT(char(5), inicio, 108) AS horario_inicio,
        CONVERT(char(5), fim, 108) AS horario_fim,
        minutos,
        descricao_tramite,
        ultima_sequencia_tramite,
        data_ultimo_tramite_iso,
        descricao_ultimo_tramite,
        hora_extra,
        retrabalho,
        tipo_tempo,
        considera_contrato
      FROM dbo.horas_analistas_0800
      WHERE data_lancamento BETWEEN @startDate AND @endDate
        AND grupo_analista IN (@group0, @group1, @group2, @group3)
      ORDER BY data_lancamento, login_analista, inicio, id_lancamento_0800;
    `);
    return result.recordset;
  } finally {
    await pool.close();
  }
}

async function completeRequest(requestId: string, items: SdTimeImportItem[]) {
  const { data, error } = await supabase.rpc("complete_sd_time_import", {
    p_request_id: requestId,
    p_items: items,
  });
  if (error) throw new Error(`gravação dos lançamentos importados: ${error.message}`);
  return data as { available_count: number; imported_count: number; skipped_count: number };
}

async function refreshImportDetails(items: SdTimeImportItem[]) {
  const { error } = await supabase.rpc("refresh_sd_time_import_details", {
    p_items: items,
  });
  if (error) throw new Error(`atualização das descrições importadas: ${error.message}`);
}

async function completeBulkRequest(
  requestId: string,
  items: SdTimeBulkImportItem[],
  analystCount: number,
  matchedUserCount: number,
  unmatchedAnalystCount: number,
) {
  const { data, error } = await supabase.rpc("complete_sd_time_bulk_import", {
    p_request_id: requestId,
    p_items: items,
    p_analyst_count: analystCount,
    p_matched_user_count: matchedUserCount,
    p_unmatched_analyst_count: unmatchedAnalystCount,
  });
  if (error) throw new Error(`gravação da importação geral: ${error.message}`);
  return data as {
    available_count: number;
    imported_count: number;
    skipped_count: number;
    analyst_count: number;
    matched_user_count: number;
    unmatched_analyst_count: number;
  };
}

async function failRequest(requestId: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  await supabase
    .from("sd_time_import_requests")
    .update({ status: "failed", error_message: message.slice(0, 2000), completed_at: new Date().toISOString() })
    .eq("id", requestId);
  return message;
}

async function failBulkRequest(requestId: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  await supabase
    .from("sd_time_bulk_import_requests")
    .update({ status: "failed", error_message: message.slice(0, 2000), completed_at: new Date().toISOString() })
    .eq("id", requestId);
  return message;
}

async function processBulkRequest(request: SdTimeBulkImportRequest) {
  const [rows, profiles] = await Promise.all([
    fetchEllevoWeek(request.start_date, request.end_date),
    hubProfilesByLogin(),
  ]);
  const analysts = new Set(rows.map((row) => row.login_analista.trim().toLowerCase()));
  const matchedAnalysts = new Set<string>();
  const uniqueRows = new Map<number, (typeof rows)[number]>();
  rows.forEach((row) => uniqueRows.set(row.id_lancamento_0800, row));

  const items: SdTimeBulkImportItem[] = [];
  for (const row of uniqueRows.values()) {
    const login = row.login_analista.trim().toLowerCase();
    const userId = profiles.get(login);
    if (!userId) continue;
    matchedAnalysts.add(login);
    items.push({ ...mapEllevoHour(row), user_id: userId, work_date: row.data_lancamento_iso });
  }

  await refreshImportDetails(items);
  return completeBulkRequest(
    request.id,
    items,
    analysts.size,
    matchedAnalysts.size,
    analysts.size - matchedAnalysts.size,
  );
}

let running = false;

async function processPendingRequests() {
  if (running) return;
  running = true;
  try {
    while (true) {
      const request = await claimRequest();
      if (request) {
        try {
          const login = await profileLogin(request.user_id);
          const items = await fetchEllevoHours(login, request.work_date);
          await refreshImportDetails(items);
          const result = await completeRequest(request.id, items);
          console.log(`[sd-time-import ${request.id}] ${request.work_date}: ${result.imported_count} importados, ${result.skipped_count} já existentes`);
        } catch (error) {
          const message = await failRequest(request.id, error);
          console.error(`[sd-time-import ${request.id}] erro: ${message}`);
        }
        continue;
      }

      const bulkRequest = await claimBulkRequest();
      if (!bulkRequest) return;
      try {
        const result = await processBulkRequest(bulkRequest);
        console.log(
          `[sd-time-bulk-import ${bulkRequest.id}] ${bulkRequest.start_date}/${bulkRequest.end_date}: ` +
            `${result.imported_count} importados, ${result.skipped_count} já existentes, ` +
            `${result.unmatched_analyst_count} analistas sem vínculo no HUB`,
        );
      } catch (error) {
        const message = await failBulkRequest(bulkRequest.id, error);
        console.error(`[sd-time-bulk-import ${bulkRequest.id}] erro: ${message}`);
      }
    }
  } catch (error) {
    console.error("[sd-time-import] erro ao consultar a fila:", error instanceof Error ? error.message : error);
  } finally {
    running = false;
  }
}

export function startSdTimeImport(): void {
  if (!config.mssqlHost || !config.mssqlUser || !config.mssqlPassword) {
    console.log("[sd-time-import] desligado (credenciais MSSQL ausentes).");
    return;
  }

  supabase
    .channel(`sd-time-import-${config.workerId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "sd_time_import_requests" },
      () => { void processPendingRequests(); },
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "sd_time_bulk_import_requests" },
      () => { void processPendingRequests(); },
    )
    .subscribe();

  void processPendingRequests();
  setInterval(() => { void processPendingRequests(); }, config.sdTimeImportIntervalMs);
  console.log(`[sd-time-import] ativo a cada ${Math.round(config.sdTimeImportIntervalMs / 1000)}s.`);
}
