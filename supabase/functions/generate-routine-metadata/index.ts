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
    const { bodyMarkdown, existingIds = [], sections = [], sectionIndex = 5 } = await req.json();

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

    // Prompt de Engenharia Especializado no Sistema Orion TN com Seção 5 (Siplan HUB)
    const systemPrompt = `Você é um especialista sênior em suporte e documentação técnica do sistema cartorário **Orion TN** (SiplanControl-M).
Sua missão é analisar o texto do procedimento/passo a passo escrito por um analista do Service Desk e gerar os metadados técnicos estruturados para a Base de Conhecimento do Assistente de IA.

REGRAS:
1. **ID:** Para rotinas cadastradas no Siplan HUB, o ID DEVE SEMPRE começar com "S" seguindo o padrão "S-5.{número}" (ex: "S-5.1", "S-5.2", "S-5.3"). NÃO repita nenhum dos IDs já existentes na lista: ${JSON.stringify(
      existingIds.slice(0, 80),
    )}.
2. **sectionIndex e secao:** DEVE ser 5 e "SEÇÃO PRINCIPAL 5: Rotinas atualizadas via Siplan HUB".
3. **titulo:** Um título claro, profissional e direto, começando normalmente com verbos de ação como "Como...", "Emissão de...", "Configuração de...", "Cadastro de...", "Gerenciamento de...".
4. **objetivo:** Um resumo conciso de 1 ou 2 frases explicando o que esse procedimento resolve para o usuário final do cartório.
5. **tags:** Lista de 4 a 8 tags em minúsculas (snake_case ou simples), como: "orion_tn", "registro_civil", "balcao", "notas", "certidao", "cancelamento", etc.
6. **perguntas_usuario:** Lista de 3 a 6 perguntas reais que um atendente de cartório faria para encontrar este tutorial (ex: "Como faço para gerenciar orçamentos?", "Onde lanço a certidão de casamento?").
7. **sinonimos:** Lista de 3 a 6 termos de busca e palavras-chave alternativas.

Retorne APENAS um JSON válido seguindo a estrutura:
{
  "id": "S-5.1",
  "titulo": "...",
  "sectionIndex": 5,
  "secao": "SEÇÃO PRINCIPAL 5: Rotinas atualizadas via Siplan HUB",
  "objetivo": "...",
  "tags": ["..."],
  "perguntas_usuario": ["..."],
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
            content: `Analise este passo a passo e gere os metadados para a Seção 5:\n\n${bodyMarkdown.trim()}`,
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
