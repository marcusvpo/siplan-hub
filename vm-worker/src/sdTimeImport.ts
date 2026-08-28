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

async function claimRequest(): Promise<SdTimeImportRequest | null> {
  const { data, error } = await supabase.rpc("claim_sd_time_import_request", {
    p_worker_id: config.workerId,
  });
  if (error) throw new Error(`claim da importação de horas: ${error.message}`);
  const request = data as SdTimeImportRequest | null;
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

async function fetchEllevoHours(login: string, workDate: string) {
  const pool = await new sql.ConnectionPool({
    server: config.mssqlHost,
    port: config.mssqlPort,
    database: config.mssqlDatabase,
    user: config.mssqlUser,
    password: config.mssqlPassword,
    options: { encrypt: false, trustServerCertificate: true },
    requestTimeout: 120_000,
  }).connect();

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
          CONVERT(char(5), inicio, 108) AS horario_inicio,
          CONVERT(char(5), fim, 108) AS horario_fim,
          minutos,
          descricao_tramite,
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

async function completeRequest(requestId: string, items: SdTimeImportItem[]) {
  const { data, error } = await supabase.rpc("complete_sd_time_import", {
    p_request_id: requestId,
    p_items: items,
  });
  if (error) throw new Error(`gravação dos lançamentos importados: ${error.message}`);
  return data as { available_count: number; imported_count: number; skipped_count: number };
}

async function failRequest(requestId: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  await supabase
    .from("sd_time_import_requests")
    .update({
      status: "failed",
      error_message: message.slice(0, 2000),
      completed_at: new Date().toISOString(),
    })
    .eq("id", requestId);
  return message;
}

let running = false;

async function processPendingRequests() {
  if (running) return;
  running = true;
  try {
    while (true) {
      const request = await claimRequest();
      if (!request) return;

      try {
        const login = await profileLogin(request.user_id);
        const items = await fetchEllevoHours(login, request.work_date);
        const result = await completeRequest(request.id, items);
        console.log(
          `[sd-time-import ${request.id}] ${request.work_date}: ` +
            `${result.imported_count} importados, ${result.skipped_count} já existentes`,
        );
      } catch (error) {
        const message = await failRequest(request.id, error);
        console.error(`[sd-time-import ${request.id}] erro: ${message}`);
      }
    }
  } catch (error) {
    console.error(
      "[sd-time-import] erro ao consultar a fila:",
      error instanceof Error ? error.message : error,
    );
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
    .subscribe();

  void processPendingRequests();
  setInterval(() => { void processPendingRequests(); }, config.sdTimeImportIntervalMs);
  console.log(`[sd-time-import] ativo a cada ${Math.round(config.sdTimeImportIntervalMs / 1000)}s.`);
}
