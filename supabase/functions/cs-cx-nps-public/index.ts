import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  parsePublicNpsSubmission,
  parsePublicNpsToken,
} from "../_shared/cs-cx-nps-public.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json; charset=utf-8",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: corsHeaders });
  if (!new Set(["GET", "POST"]).has(request.method))
    return respond({ erro: "Método não permitido." }, 405);

  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 64 * 1024)
      return respond({ erro: "Corpo da requisição excede 64 KB." }, 413);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    if (request.method === "GET") {
      const token = parsePublicNpsToken(
        new URL(request.url).searchParams.get("token"),
      );
      const { data, error } = await supabase.rpc(
        "cs_cx_get_public_nps_invitation",
        { p_token: token },
      );
      if (error) throw error;
      if (!data) return respond({ erro: "Convite NPS não encontrado." }, 404);
      return respond(data, 200);
    }

    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 64 * 1024)
      return respond({ erro: "Corpo da requisição excede 64 KB." }, 413);
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return respond({ erro: "JSON inválido." }, 400);
    }
    const submission = parsePublicNpsSubmission(payload);
    if (submission.honeypot)
      return respond({ mensagem: "Resposta recebida com sucesso." }, 201);

    const forwardedFor =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const { data, error } = await supabase.rpc("cs_cx_submit_public_nps", {
      p_token: submission.token,
      p_respondent_name: submission.respondentName,
      p_answers: submission.answers,
      p_ip_address: forwardedFor,
      p_user_agent: request.headers.get("user-agent")?.slice(0, 1000) ?? null,
    });
    if (error) throw error;
    return respond(
      { mensagem: "Obrigado! Sua avaliação foi registrada.", ...data },
      201,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido.";
    const notFound = /não encontrado/i.test(message);
    const unavailable = /expirado|cancelado/i.test(message);
    const clientError = /inválid|obrigatóri|informe|quantidade|formato/i.test(
      message,
    );
    console.error("cs-cx-nps-public", message);
    return respond(
      {
        erro:
          notFound || unavailable || clientError
            ? message
            : "Não foi possível registrar a avaliação.",
      },
      notFound ? 404 : unavailable ? 410 : clientError ? 400 : 500,
    );
  }
});

function respond(payload: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: jsonHeaders,
  });
}
