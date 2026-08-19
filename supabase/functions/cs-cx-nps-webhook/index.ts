import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isValidWebhookToken, parseNpsWebhookPayload } from "../_shared/cs-cx-nps-webhook.ts";

const jsonHeaders = { "Content-Type": "application/json; charset=utf-8" };

Deno.serve(async (request) => {
  if (request.method !== "POST") return respond({ erro: "Método não permitido." }, 405);
  try {
    const expectedToken = Deno.env.get("NPS_WEBHOOK_TOKEN") ?? "";
    const authorization = request.headers.get("authorization");
    const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
    const headerToken = request.headers.get("x-nps-webhook-token");
    const queryToken = new URL(request.url).searchParams.get("token");
    const receivedToken = headerToken || bearerToken || queryToken;
    if (!isValidWebhookToken(expectedToken, receivedToken)) return respond({ erro: "Não autorizado. Token inválido." }, 401);

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 64 * 1024) return respond({ erro: "Corpo da requisição excede 64 KB." }, 413);
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 64 * 1024) return respond({ erro: "Corpo da requisição excede 64 KB." }, 413);
    let payload: unknown;
    try { payload = JSON.parse(rawBody); }
    catch { return respond({ erro: "JSON inválido." }, 400); }
    const parsed = parseNpsWebhookPayload(payload);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const { data, error } = await supabase.rpc("cs_cx_receive_nps_webhook", {
      p_responded_at: parsed.respondedAt,
      p_respondent_name: parsed.respondentName,
      p_office_name: parsed.officeName,
      p_score: parsed.score,
      p_score_reason: parsed.scoreReason,
      p_improvement_suggestion: parsed.improvementSuggestion,
      p_ip_address: forwardedFor,
      p_user_agent: request.headers.get("user-agent")?.slice(0, 1000) ?? null,
    });
    if (error) throw error;
    const result = data as { id: string; duplicate: boolean; registry_office: string };
    return respond(result.duplicate
      ? { mensagem: "Resposta ignorada pois já existe avaliação similar neste dia.", ...result }
      : { mensagem: "Resposta NPS registrada com sucesso.", ...result }, result.duplicate ? 200 : 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido.";
    const clientError = /obrigat|inválid|objeto JSON|Unexpected end of JSON/i.test(message);
    console.error("cs-cx-nps-webhook", message);
    return respond({ erro: clientError ? message : "Erro interno ao registrar a resposta NPS." }, clientError ? 400 : 500);
  }
});

function respond(payload: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(payload), { status, headers: jsonHeaders });
}
