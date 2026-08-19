import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function hasExecutableSignature(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  const signatures = [
    [0x4d, 0x5a], // Windows PE
    [0x7f, 0x45, 0x4c, 0x46], // ELF
    [0xfe, 0xed, 0xfa, 0xce],
    [0xfe, 0xed, 0xfa, 0xcf],
    [0xcf, 0xfa, 0xed, 0xfe],
    [0xce, 0xfa, 0xed, 0xfe],
  ];
  return signatures.some((signature) =>
    signature.every((value, index) => bytes[index] === value)
  );
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  let attachmentId: string | undefined;

  try {
    const { data: authData, error: authError } = await callerClient.auth.getUser();
    if (authError || !authData.user) return jsonResponse({ error: "Unauthorized" }, 401);

    const { data: allowed, error: permissionError } = await admin.rpc("has_permission", {
      user_id: authData.user.id,
      req_resource: "sd_solutions",
      req_action: "view",
    });
    if (permissionError || !allowed) return jsonResponse({ error: "Forbidden" }, 403);

    ({ attachmentId } = await request.json());
    if (!attachmentId || typeof attachmentId !== "string") {
      return jsonResponse({ error: "attachmentId é obrigatório" }, 400);
    }

    const { data: attachment, error: attachmentError } = await admin
      .from("sd_solucao_anexos")
      .select("id, nome_arquivo, caminho_storage, tipo_mime")
      .eq("id", attachmentId)
      .single();
    if (attachmentError || !attachment) return jsonResponse({ error: "Anexo não encontrado" }, 404);

    const { data: fileBlob, error: downloadError } = await admin.storage
      .from("sd-solution-attachments")
      .download(attachment.caminho_storage);
    if (downloadError || !fileBlob) throw downloadError || new Error("Falha ao ler o anexo");

    const bytes = new Uint8Array(await fileBlob.arrayBuffer());
    if (hasExecutableSignature(bytes)) {
      await admin.from("sd_solucao_anexos").update({
        verificacao_status: "suspeito",
        verificacao_metodo: "assinatura-local",
        verificacao_detalhes: "Assinatura de arquivo executável detectada.",
        verificado_em: new Date().toISOString(),
      }).eq("id", attachmentId);
      return jsonResponse({ status: "suspeito", blocked: true });
    }

    const virusTotalKey = Deno.env.get("VIRUSTOTAL_API_KEY");
    if (virusTotalKey) {
      const form = new FormData();
      form.append(
        "file",
        new File([bytes], attachment.nome_arquivo, {
          type: attachment.tipo_mime || "application/octet-stream",
        }),
      );
      const uploadResponse = await fetch("https://www.virustotal.com/api/v3/files", {
        method: "POST",
        headers: { "x-apikey": virusTotalKey },
        body: form,
      });
      if (!uploadResponse.ok) throw new Error(`VirusTotal upload: ${uploadResponse.status}`);
      const uploadResult = await uploadResponse.json();
      const analysisId = uploadResult?.data?.id;

      for (let attempt = 0; attempt < 8 && analysisId; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const analysisResponse = await fetch(
          `https://www.virustotal.com/api/v3/analyses/${analysisId}`,
          { headers: { "x-apikey": virusTotalKey } },
        );
        if (!analysisResponse.ok) continue;
        const analysis = await analysisResponse.json();
        if (analysis?.data?.attributes?.status !== "completed") continue;
        const stats = analysis.data.attributes.stats || {};
        const threats = Number(stats.malicious || 0) + Number(stats.suspicious || 0);
        const status = threats > 0 ? "suspeito" : "seguro";
        await admin.from("sd_solucao_anexos").update({
          verificacao_status: status,
          verificacao_metodo: "virustotal",
          verificacao_detalhes: threats > 0
            ? `${threats} mecanismo(s) sinalizaram o arquivo.`
            : "Nenhuma ameaça detectada pelos mecanismos consultados.",
          verificado_em: new Date().toISOString(),
        }).eq("id", attachmentId);
        return jsonResponse({ status, blocked: threats > 0 });
      }
      throw new Error("A análise antivírus não terminou no tempo esperado.");
    }

    await admin.from("sd_solucao_anexos").update({
      verificacao_status: "seguro",
      verificacao_metodo: "assinatura-local",
      verificacao_detalhes: "Validação de extensão, MIME e assinatura executável concluída.",
      verificado_em: new Date().toISOString(),
    }).eq("id", attachmentId);
    return jsonResponse({ status: "seguro", blocked: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    try {
      if (attachmentId) {
        await admin.from("sd_solucao_anexos").update({
          verificacao_status: "erro",
          verificacao_metodo: "automatico",
          verificacao_detalhes: message.slice(0, 500),
          verificado_em: new Date().toISOString(),
        }).eq("id", attachmentId);
      }
    } catch {
      // A resposta abaixo já informa o erro ao cliente.
    }
    return jsonResponse({ error: message }, 500);
  }
});
