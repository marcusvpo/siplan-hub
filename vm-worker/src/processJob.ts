import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { supabase } from "./supabase.js";
import { config, Job } from "./config.js";
import { runSkill } from "./runSkill.js";

// Mesma sanitizacao do frontend (useProjectFiles.ts) para chaves validas no Storage.
function sanitize(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\w.\-() ]+/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 200);
}

// Percorre modelos_criados atras de *.json modificados a partir de `since` (ms).
async function findJsonAfter(dir: string, since: number): Promise<string[]> {
  const out: string[] = [];
  async function walk(d: string) {
    let entries;
    try {
      entries = await readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.isFile() && e.name.endsWith(".json")) {
        const st = await stat(p);
        if (st.mtimeMs >= since) out.push(p);
      }
    }
  }
  await walk(dir);
  return out;
}

function buildPrompt(inputPath: string, cartorioSlug: string, name: string, descricao: string): string {
  return `/criar-modelo-mesclado

O documento do cliente esta em ${inputPath}.

Execute o fluxo COMPLETO de forma TOTALMENTE AUTONOMA (headless), sem me fazer nenhuma pergunta e sem parar para confirmacao. Sempre que a skill pedir uma decisao (tipo do modelo, exemplo-base, mapeamento de variavel ambiguo, modalidade, nome/descricao do cartorio), ESCOLHA VOCE MESMO a opcao recomendada/mais provavel e siga em frente ate finalizar.

Ao final, gere o pacote de importacao (modelo.json via tools/empacotar_modelo.py). Metadados: nome do cartorio "${cartorioSlug}", name "${name}", descricao "${descricao}".

NAO execute git add/commit/push - apenas gere os artefatos (modelo.rtf/odt/json). Ao terminar, imprima em UMA linha: JSON_GERADO=<caminho absoluto do modelo.json>.`;
}

/**
 * Pipeline de um job headless (ja marcado 'processing' pelo claim):
 * baixa o doc do cliente -> roda a skill autonoma -> localiza o modelo.json
 * gerado -> sobe no bucket -> project_files -> append -> done.
 * Lanca em qualquer falha; o loop principal marca o job como 'error'.
 */
export async function processJob(job: Job): Promise<void> {
  // 0. Metadados a partir do projeto (nome do cliente = cartorio)
  const { data: proj } = await supabase
    .from("projects")
    .select("client_name")
    .eq("id", job.project_id)
    .single();
  const cliente = (proj?.client_name as string) || "cliente";
  const cartorioSlug = (sanitize(cliente).toLowerCase().replace(/_/g, "-") || "cartorio");

  // 1. Baixar o documento de origem para a pasta de entrada da VM
  const jobDir = path.join(config.entradaDir, job.id);
  await mkdir(jobDir, { recursive: true });
  const { data: blob, error: dlError } = await supabase.storage
    .from(config.bucket)
    .download(job.source_file_path);
  if (dlError || !blob) throw new Error(`Falha ao baixar origem: ${dlError?.message || "vazio"}`);

  const inputPath = path.join(jobDir, sanitize(job.source_file_name) || "documento");
  await writeFile(inputPath, Buffer.from(await blob.arrayBuffer()));

  // 2. Rodar a skill de forma autonoma
  const baseName = path.basename(job.source_file_name, path.extname(job.source_file_name));
  const startTime = Date.now();
  const prompt = buildPrompt(inputPath, cartorioSlug, baseName, cliente);
  const { stdout, stderr, code } = await runSkill(prompt);
  if (code !== 0) {
    const tail = (stderr || stdout || "").slice(-1200);
    throw new Error(`Claude encerrou com codigo ${code}. Fim da saida: ${tail}`);
  }

  // 3. Localizar o modelo.json gerado (via marcador JSON_GERADO= ou por mtime)
  let jsonPath: string | undefined;
  const marker = stdout.match(/JSON_GERADO=([^\r\n]+)/);
  if (marker) {
    const p = marker[1].trim();
    try { await stat(p); jsonPath = p; } catch { /* cai no fallback */ }
  }
  if (!jsonPath) {
    const found = await findJsonAfter(config.modelosCriadosDir, startTime);
    jsonPath = found.find((f) => path.basename(f) === "modelo.json") || found[0];
  }
  if (!jsonPath) {
    throw new Error(`Nenhum modelo.json gerado. Fim da saida: ${stdout.slice(-800)}`);
  }

  // 4. Validar que e JSON valido
  const jsonBuffer = await readFile(jsonPath);
  try {
    JSON.parse(jsonBuffer.toString("utf-8"));
  } catch {
    throw new Error(`O modelo gerado (${jsonPath}) nao e um JSON valido.`);
  }

  // 5. Upload para o mesmo bucket do frontend
  const jsonName = `${sanitize(baseName) || "modelo"}.json`;
  const storagePath = `${job.project_id}/${randomUUID()}-${jsonName}`;
  const { error: upError } = await supabase.storage
    .from(config.bucket)
    .upload(storagePath, jsonBuffer, { contentType: "application/json" });
  if (upError) throw new Error(`Falha no upload do JSON: ${upError.message}`);

  // 6. INSERT em project_files (mesmo formato do useProjectFiles)
  const { data: fileRow, error: pfError } = await supabase
    .from("project_files")
    .insert({
      project_id: job.project_id,
      file_name: jsonName,
      file_path: storagePath,
      file_size: jsonBuffer.length,
      mime_type: "application/json",
      uploaded_by: "Modelo Automático (Orion)",
    })
    .select()
    .single();
  if (pfError || !fileRow) throw new Error(`Falha ao registrar project_files: ${pfError?.message}`);

  // 7. APPEND atomico do AttachedFile em modelos_editor_available_files
  const attachedFile = {
    id: fileRow.id,
    name: jsonName,
    path: storagePath,
    size: jsonBuffer.length,
    uploadedAt: fileRow.uploaded_at,
    modelType: job.model_type,
  };
  const { error: appendError } = await supabase.rpc("append_available_model", {
    p_project_id: job.project_id,
    p_file: attachedFile,
  });
  if (appendError) throw new Error(`Falha no append do modelo: ${appendError.message}`);

  // 8. Concluir job
  const { error: doneError } = await supabase
    .from("model_generation_jobs")
    .update({
      status: "done",
      result_file_path: storagePath,
      result_file_id: fileRow.id,
      finished_at: new Date().toISOString(),
    })
    .eq("id", job.id);
  if (doneError) throw new Error(`Falha ao concluir job: ${doneError.message}`);

  console.log(`[job ${job.id}] concluido -> ${storagePath} (origem: ${jsonPath})`);
}
