import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://hub.siplan.com.br",
  "https://siplanhub.vercel.app",
];

function isAllowedOrigin(origin: string | null): origin is string {
  if (!origin) return false;
  if (DEFAULT_ALLOWED_ORIGINS.includes(origin)) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  const extra = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return extra.includes(origin);
}

function buildCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin");
  const allowOrigin = isAllowedOrigin(origin) ? origin : DEFAULT_ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value.trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const PROMPT_ID =
  Deno.env.get("OPENAI_PROMPT_ID") ||
  "pmpt_6a85e041a0e08196a659d0560497de3402bd152c918f12f4";
const VECTOR_STORE_ID = "vs_6a85e00895f081918844a28887a34a17";
const MAX_MESSAGE_LENGTH = 4000;
const VISITOR_RATE_LIMIT_PER_MIN = 30;
const PROJECT_RATE_LIMIT_PER_HOUR = 200;

const orionAssistantConfig = {
  model: "gpt-4o-mini",
  temperature: 0.1,
  max_output_tokens: 1200,
  top_p: 0.9,
  tools: [
    {
      type: "file_search",
      vector_store_ids: [VECTOR_STORE_ID],
      max_num_results: 5,
      ranking_options: {
        score_threshold: 0.25,
      },
    },
  ],
};

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const body = await req.json();
    const action = body.action || "chat";

    // 1. Action: feedback
    if (action === "feedback") {
      const { message_id, visitor_id, visitor_token, feedback, comment } = body;
      if (!message_id || !visitor_id || !visitor_token || !feedback) {
        return new Response(
          JSON.stringify({
            error: "message_id, visitor_id, visitor_token e feedback são obrigatórios",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (feedback !== "helpful" && feedback !== "unhelpful") {
        return new Response(
          JSON.stringify({ error: "Feedback inválido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tokenHash = await sha256Hex(String(visitor_token));
      const { data: visitorRecord } = await supabaseAdmin
        .from("pos_ai_chat_visitors")
        .select("id, is_active, access_token_hash")
        .eq("id", visitor_id)
        .maybeSingle();

      if (
        !visitorRecord ||
        visitorRecord.is_active === false ||
        !visitorRecord.access_token_hash ||
        visitorRecord.access_token_hash !== tokenHash
      ) {
        return new Response(
          JSON.stringify({ error: "Sessão de visitante não autorizada" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: updated, error: fbError } = await supabaseAdmin
        .from("pos_ai_chat_messages")
        .update({
          feedback,
          feedback_comment: comment ? String(comment).slice(0, 1000) : null,
        })
        .eq("id", message_id)
        .eq("visitor_id", visitor_id)
        .eq("role", "assistant")
        .select("id, feedback, feedback_comment")
        .single();

      if (fbError) throw fbError;

      return new Response(
        JSON.stringify({ success: true, data: updated }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Action: chat
    const {
      project_id,
      visitor_id,
      visitor_token,
      session_id,
      message,
      previous_response_id,
    } = body;

    if (!project_id || !visitor_id || !visitor_token || !session_id || !message?.trim()) {
      return new Response(
        JSON.stringify({
          error: "project_id, visitor_id, visitor_token, session_id e message são obrigatórios",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedMessage = String(message).trim();
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      return new Response(
        JSON.stringify({
          error: `A mensagem excede o limite de ${MAX_MESSAGE_LENGTH} caracteres.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: project, error: projError } = await supabaseAdmin.rpc(
      "get_pos_assistant_project_info",
      { p_id: project_id }
    );

    if (projError || !project) {
      return new Response(
        JSON.stringify({ error: "Link não encontrado ou inativo" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (project.pos_assistant_enabled === false) {
      return new Response(
        JSON.stringify({ error: "O acesso a este chat foi encerrado" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenHash = await sha256Hex(String(visitor_token));
    const { data: visitor, error: visitorError } = await supabaseAdmin
      .from("pos_ai_chat_visitors")
      .select("id, is_active, access_token_hash")
      .eq("id", visitor_id)
      .eq("project_id", project_id)
      .maybeSingle();

    if (
      visitorError ||
      !visitor ||
      visitor.is_active === false ||
      !visitor.access_token_hash ||
      visitor.access_token_hash !== tokenHash
    ) {
      return new Response(
        JSON.stringify({ error: "Sessão não identificada ou não autorizada para este cartório" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Impede injecao em sessao pertencente a outro visitante
    const { data: foreignSessionMsg } = await supabaseAdmin
      .from("pos_ai_chat_messages")
      .select("id")
      .eq("project_id", project_id)
      .eq("session_id", session_id)
      .neq("visitor_id", visitor_id)
      .limit(1)
      .maybeSingle();

    if (foreignSessionMsg) {
      return new Response(
        JSON.stringify({ error: "Esta conversa pertence a outro usuário." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit por visitante (1 minuto) e por link (1 hora)
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    const { count: visitorRecentCount } = await supabaseAdmin
      .from("pos_ai_chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project_id)
      .eq("visitor_id", visitor_id)
      .eq("role", "user")
      .gte("created_at", oneMinuteAgo);

    if ((visitorRecentCount ?? 0) >= VISITOR_RATE_LIMIT_PER_MIN) {
      return new Response(
        JSON.stringify({
          error: "Muitas perguntas em sequência. Aguarde alguns segundos e tente novamente.",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const { count: projectHourCount } = await supabaseAdmin
      .from("pos_ai_chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project_id)
      .eq("role", "user")
      .gte("created_at", oneHourAgo);

    if ((projectHourCount ?? 0) >= PROJECT_RATE_LIMIT_PER_HOUR) {
      return new Response(
        JSON.stringify({
          error: "Limite temporário de consultas atingido para este link. Tente novamente em instantes.",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabaseAdmin
      .from("pos_ai_chat_visitors")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", visitor_id);

    const { data: userMsg, error: userMsgErr } = await supabaseAdmin
      .from("pos_ai_chat_messages")
      .insert({
        project_id,
        visitor_id,
        session_id,
        role: "user",
        content: trimmedMessage,
      })
      .select()
      .single();

    if (userMsgErr) {
      console.error("Error storing user message:", userMsgErr);
    }

    const configuredPromptVersion = Deno.env.get("OPENAI_PROMPT_VERSION")?.trim();

    const openAiPayload: Record<string, unknown> = {
      prompt: {
        id: PROMPT_ID,
        ...(configuredPromptVersion ? { version: configuredPromptVersion } : {}),
      },
      input: [
        {
          role: "user",
          content: trimmedMessage,
        },
      ],
      tools: orionAssistantConfig.tools,
      store: true,
    };

    if (previous_response_id) {
      openAiPayload.previous_response_id = previous_response_id;
    }

    const openAiApiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
    if (!openAiApiKey) {
      console.error("OPENAI_API_KEY is not configured in Supabase Secrets");
      return new Response(
        JSON.stringify({
          error: "Assistente temporariamente indisponível por configuração.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const startTime = performance.now();

    const openAiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify(openAiPayload),
    });

    const latencyMs = Math.round(performance.now() - startTime);
    const openAiJson = await openAiRes.json();

    if (!openAiRes.ok) {
      console.error("OpenAI API error:", openAiJson);
      return new Response(
        JSON.stringify({
          error: openAiJson?.error?.message || "Erro ao consultar o assistente de IA",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let replyText = "";
    if (Array.isArray(openAiJson.output)) {
      for (const item of openAiJson.output) {
        if (item.type === "message" && Array.isArray(item.content)) {
          for (const c of item.content) {
            if ((c.type === "output_text" || c.type === "text") && c.text) {
              replyText += (replyText ? "\n\n" : "") + c.text;
            }
          }
        }
      }
    }

    if (!replyText) {
      replyText = "Desculpe, não consegui formular uma resposta no momento. Por favor, tente novamente.";
    }

    const responseId = openAiJson.id || null;
    const model = openAiJson.model || orionAssistantConfig.model;
    const usage = openAiJson.usage || {};
    const inputTokens = usage.input_tokens || 0;
    const outputTokens = usage.output_tokens || 0;
    const totalTokens = usage.total_tokens || (inputTokens + outputTokens);
    const reasoningTokens = usage.output_tokens_details?.reasoning_tokens || 0;
    const cachedTokens = usage.input_tokens_details?.cached_tokens || 0;

    const resolvedPromptVersion =
      openAiJson.prompt?.version ||
      configuredPromptVersion ||
      "latest";

    const { data: assistantMsg, error: asstMsgErr } = await supabaseAdmin
      .from("pos_ai_chat_messages")
      .insert({
        project_id,
        visitor_id,
        session_id,
        role: "assistant",
        content: replyText,
        response_id: responseId,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        reasoning_tokens: reasoningTokens,
        cached_tokens: cachedTokens,
        latency_ms: latencyMs,
        model: model,
        prompt_id: PROMPT_ID,
        prompt_version: resolvedPromptVersion,
      })
      .select()
      .single();

    if (asstMsgErr) {
      console.error("Error storing assistant message:", asstMsgErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_message_id: userMsg?.id,
        assistant_message_id: assistantMsg?.id,
        response_id: responseId,
        reply: replyText,
        created_at: assistantMsg?.created_at || new Date().toISOString(),
        metrics: {
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: totalTokens,
          reasoning_tokens: reasoningTokens,
          latency_ms: latencyMs,
          model: model,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Internal edge function error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Erro interno no servidor",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
