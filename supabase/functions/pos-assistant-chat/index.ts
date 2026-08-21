import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

const PROMPT_ID = "pmpt_6a85e041a0e08196a659d0560497de3402bd152c918f12f4";
const PROMPT_VERSION = "3";
const VECTOR_STORE_ID = "vs_6a85e00895f081918844a28887a34a17";

Deno.serve(async (req: Request) => {
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
      const { message_id, visitor_id, feedback, comment } = body;
      if (!message_id || !visitor_id || !feedback) {
        return new Response(
          JSON.stringify({ error: "message_id, visitor_id e feedback são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: updated, error: fbError } = await supabaseAdmin
        .from("pos_ai_chat_messages")
        .update({
          feedback,
          feedback_comment: comment || null,
        })
        .eq("id", message_id)
        .eq("visitor_id", visitor_id)
        .eq("role", "assistant")
        .select()
        .single();

      if (fbError) throw fbError;

      return new Response(
        JSON.stringify({ success: true, data: updated }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Action: chat
    const { project_id, visitor_id, session_id, message, previous_response_id } = body;

    if (!project_id || !visitor_id || !session_id || !message?.trim()) {
      return new Response(
        JSON.stringify({ error: "project_id, visitor_id, session_id e message são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify project exists
    const { data: project, error: projError } = await supabaseAdmin
      .from("projects")
      .select("id, client_name, system_type, products")
      .eq("id", project_id)
      .eq("is_deleted", false)
      .maybeSingle();

    if (projError || !project) {
      return new Response(
        JSON.stringify({ error: "Projeto não encontrado ou inativo" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: visitor, error: visitorError } = await supabaseAdmin
      .from("pos_ai_chat_visitors")
      .select("id")
      .eq("id", visitor_id)
      .eq("project_id", project_id)
      .maybeSingle();

    if (visitorError || !visitor) {
      return new Response(
        JSON.stringify({ error: "Usuário não identificado para este cartório" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabaseAdmin
      .from("pos_ai_chat_visitors")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", visitor_id);

    // Record user message in DB
    const { data: userMsg, error: userMsgErr } = await supabaseAdmin
      .from("pos_ai_chat_messages")
      .insert({
        project_id,
        visitor_id,
        session_id,
        role: "user",
        content: message.trim(),
      })
      .select()
      .single();

    if (userMsgErr) {
      console.error("Error storing user message:", userMsgErr);
    }

    // Prepare OpenAI Responses API payload
    const openAiPayload: Record<string, unknown> = {
      prompt: {
        id: PROMPT_ID,
        version: PROMPT_VERSION,
      },
      input: [
        {
          role: "user",
          content: message.trim(),
        },
      ],
      reasoning: {
        effort: "low",
      },
      tools: [
        {
          type: "file_search",
          vector_store_ids: [VECTOR_STORE_ID],
        },
      ],
      store: true,
      include: [
        "reasoning.encrypted_content",
        "web_search_call.action.sources",
      ],
    };

    if (previous_response_id) {
      openAiPayload.previous_response_id = previous_response_id;
    }

    // Start timing for latency measurement
    const startTime = performance.now();

    // Call OpenAI
    const openAiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
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
          details: openAiJson,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract text output
    let replyText = "";
    if (Array.isArray(openAiJson.output)) {
      for (const item of openAiJson.output) {
        if (item.type === "message" && Array.isArray(item.content)) {
          for (const c of item.content) {
            if (c.type === "output_text" && c.text) {
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
    const model = openAiJson.model || "gpt-5-nano";
    const usage = openAiJson.usage || {};
    const inputTokens = usage.input_tokens || 0;
    const outputTokens = usage.output_tokens || 0;
    const totalTokens = usage.total_tokens || (inputTokens + outputTokens);
    const reasoningTokens = usage.output_tokens_details?.reasoning_tokens || 0;
    const cachedTokens = usage.input_tokens_details?.cached_tokens || 0;

    // Record assistant response in DB with metrics
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
        prompt_version: PROMPT_VERSION,
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
