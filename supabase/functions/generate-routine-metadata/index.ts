import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      bodyMarkdown,
      existingIds = [],
      sections = [],
      sectionIndex = 4,
      prefix = "D",
    } = await req.json();

    if (!bodyMarkdown || typeof bodyMarkdown !== "string" || bodyMarkdown.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "O conteúdo do passo a passo é obrigatório para gerar metadados." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY não configurada no servidor Supabase." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const systemPrompt = `Você é um especialista sênior em suporte e documentação técnica do sistema cartorário **Orion TN** (SiplanControl-M).
Sua missão é analisar o texto do procedimento/passo a passo escrito por um analista do Service Desk e gerar os metadados técnicos estruturados para a Base de Conhecimento do Assistente de IA.

REGRAS:
1. **ID:** O ID deve iniciar com o prefixo solicitado "${prefix}" (ex: se for "D", gere "D-3.{número}" ou "D-{número}"; se "R", "R-{número}"; etc.). NÃO repita nenhum dos IDs já existentes na lista: ${JSON.stringify(
      existingIds.slice(0, 100),
    )}.
2. **titulo:** Um título claro, profissional e direto, começando normalmente com verbos de ação como "Como...", "Emissão de...", "Configuração de...", "Cadastro de...", "Gerenciamento de...". O TÍTULO NÃO DEVE CONTER O PREFIXO DE ID (NUNCA coloque "D-3.3 - " ou similar dentro do título).
3. **objetivo:** Uma frase única e densa explicando a finalidade prática da rotina.
4. **tags:** Lista de 3 a 7 tags de categorização operacional em português com inicial maiúscula (ex: "Notas", "Firmas", "Cartão de Assinatura", "Editor", "Estoque", "Financeiro", "Configurações", etc.). NUNCA use prefixos como "#" ou termos genéricos em minúsculas como "orion_tn".
5. **perguntas_usuario:** Lista de 3 a 5 perguntas completas que um atendente de cartório faria para encontrar este tutorial (ex: "Como preencher o cartão de assinatura com IA?", "Onde anexo os documentos da firma usando scanner?").
6. **sintomas_comuns:** ⭐ OBRIGATÓRIO: Lista de 3 a 5 termos curtos de dor ou sintomas que o escrevente relata ao abrir chamado (ex: "não consigo digitar no cartão", "leitura de documento falhou", "foto do autógrafo não carrega", "botão salvar não aparece", "erro ao validar lote"). NUNCA use ponto de interrogação (?) nestes termos; devem ser expressões curtas de busca.
7. **sinonimos:** Lista de 3 a 5 termos e jargões alternativos de busca.

Retorne APENAS um JSON válido seguindo a estrutura:
{
  "id": "${prefix}-...",
  "titulo": "...",
  "sectionIndex": ${sectionIndex},
  "objetivo": "...",
  "tags": ["..."],
  "perguntas_usuario": ["..."],
  "sintomas_comuns": ["..."],
  "sinonimos": ["..."]
}`;

    const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Analise este passo a passo e gere os metadados com sintomas comuns:\n\n${bodyMarkdown.trim()}`,
          },
        ],
      }),
    });

    if (!openAiResponse.ok) {
      const errJson = await openAiResponse.json();
      console.error("OpenAI Error:", errJson);
      throw new Error(errJson?.error?.message || "Erro na chamada OpenAI");
    }

    const openAiData = await openAiResponse.json();
    const rawOutput = openAiData.choices?.[0]?.message?.content;
    const parsedMetadata = JSON.parse(rawOutput || "{}");

    return new Response(JSON.stringify({ success: true, metadata: parsedMetadata }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || "Erro ao processar solicitação com IA",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
