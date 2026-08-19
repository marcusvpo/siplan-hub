import { supabase } from "@/integrations/supabase/client";
import type {
  SdAnexo,
  SdFamilia,
  SdRotina,
  SdSistema,
  SdSistemaComRotinas,
  SdSolucao,
  SdSolucaoPayload,
} from "@/types/sd";

const SOLUTION_SELECT = `
  *,
  sistema:sd_sistemas!sd_solucoes_sistema_id_fkey(id, nome),
  rotina:sd_rotinas!sd_solucoes_rotina_id_fkey(id, nome)
`;

const SOLUTION_DETAILS_SELECT = `
  ${SOLUTION_SELECT},
  anexos:sd_solucao_anexos!sd_solucao_anexos_solucao_id_fkey(*)
`;

const SD_ATTACHMENTS_BUCKET = "sd-solution-attachments";

export async function listSdSystems(): Promise<SdSistema[]> {
  const { data, error } = await supabase
    .from("sd_sistemas")
    .select(`
      *,
      familia:sd_familias!sd_sistemas_familia_id_fkey(id, nome, descricao)
    `)
    .order("nome");

  if (error) throw error;
  return (data || []) as SdSistema[];
}

export async function listSdFamilies(): Promise<SdFamilia[]> {
  const { data, error } = await supabase
    .from("sd_familias")
    .select("*")
    .order("nome");

  if (error) throw error;
  return (data || []) as SdFamilia[];
}

export async function listSdRoutines(systemId?: string): Promise<SdRotina[]> {
  let query = supabase.from("sd_rotinas").select("*").order("nome");
  if (systemId) query = query.eq("sistema_id", systemId);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as SdRotina[];
}

export async function listSdSystemsWithRoutines(): Promise<SdSistemaComRotinas[]> {
  const [systems, routines] = await Promise.all([listSdSystems(), listSdRoutines()]);
  return systems.map((system) => ({
    ...system,
    rotinas: routines.filter((routine) => routine.sistema_id === system.id),
  }));
}

export async function listSdSolutions(filters?: {
  systemId?: string;
  routineId?: string;
}): Promise<SdSolucao[]> {
  let query = supabase
    .from("sd_solucoes")
    .select(SOLUTION_SELECT)
    .order("atualizado_em", { ascending: false })
    .limit(250);

  if (filters?.systemId) query = query.eq("sistema_id", filters.systemId);
  if (filters?.routineId) query = query.eq("rotina_id", filters.routineId);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as SdSolucao[];
}

export async function getSdSolution(id: string): Promise<SdSolucao | null> {
  const { data, error } = await supabase
    .from("sd_solucoes")
    .select(SOLUTION_DETAILS_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as SdSolucao | null;
}

export async function createSdSolution(payload: SdSolucaoPayload): Promise<string> {
  const { data, error } = await supabase
    .from("sd_solucoes")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updateSdSolution(
  id: string,
  payload: SdSolucaoPayload,
): Promise<void> {
  const { error } = await supabase
    .from("sd_solucoes")
    .update(payload)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteSdSolution(id: string): Promise<void> {
  const { data: attachments, error: attachmentsError } = await supabase
    .from("sd_solucao_anexos")
    .select("caminho_storage")
    .eq("solucao_id", id);
  if (attachmentsError) throw attachmentsError;

  const { error } = await supabase.from("sd_solucoes").delete().eq("id", id);
  if (error) throw error;

  const paths = (attachments || []).map((attachment) => attachment.caminho_storage as string);
  if (paths.length > 0) {
    await supabase.storage.from(SD_ATTACHMENTS_BUCKET).remove(paths);
  }
}

function attachmentStorageName(fileName: string): string {
  const normalized = fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-120);
  return normalized || "anexo";
}

export async function uploadSdSolutionAttachment(
  solutionId: string,
  file: File,
): Promise<SdAnexo> {
  const uniqueId = crypto.randomUUID();
  const storagePath = `${solutionId}/${uniqueId}-${attachmentStorageName(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from(SD_ATTACHMENTS_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("sd_solucao_anexos")
    .insert({
      solucao_id: solutionId,
      nome_arquivo: file.name,
      caminho_storage: storagePath,
      tipo_mime: file.type || null,
      tamanho_bytes: file.size,
    })
    .select("*")
    .single();

  if (error) {
    await supabase.storage.from(SD_ATTACHMENTS_BUCKET).remove([storagePath]);
    throw error;
  }

  return data as SdAnexo;
}

export async function deleteSdSolutionAttachment(attachment: SdAnexo): Promise<void> {
  const { error } = await supabase
    .from("sd_solucao_anexos")
    .delete()
    .eq("id", attachment.id);
  if (error) throw error;

  await supabase.storage
    .from(SD_ATTACHMENTS_BUCKET)
    .remove([attachment.caminho_storage]);
}

export async function getSdAttachmentDownloadUrl(attachment: SdAnexo): Promise<string> {
  const { data, error } = await supabase.storage
    .from(SD_ATTACHMENTS_BUCKET)
    .createSignedUrl(attachment.caminho_storage, 60, {
      download: attachment.nome_arquivo,
    });
  if (error) throw error;
  return data.signedUrl;
}

export async function createSdSystem(name: string): Promise<void> {
  const { error } = await supabase.from("sd_sistemas").insert({ nome: name });
  if (error) throw error;
}

export async function updateSdSystem(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from("sd_sistemas")
    .update({ nome: name })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteSdSystem(id: string): Promise<void> {
  const { error } = await supabase.from("sd_sistemas").delete().eq("id", id);
  if (error) throw error;
}

export async function updateSdSystemFamily(
  id: string,
  familyId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("sd_sistemas")
    .update({ familia_id: familyId })
    .eq("id", id);
  if (error) throw error;
}

export async function createSdFamily(name: string, description: string | null): Promise<void> {
  const { error } = await supabase
    .from("sd_familias")
    .insert({ nome: name, descricao: description });
  if (error) throw error;
}

export async function updateSdFamily(
  id: string,
  name: string,
  description: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("sd_familias")
    .update({ nome: name, descricao: description })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteSdFamily(id: string): Promise<void> {
  const { error } = await supabase.from("sd_familias").delete().eq("id", id);
  if (error) throw error;
}

export async function createSdRoutine(systemId: string, name: string): Promise<void> {
  const { error } = await supabase
    .from("sd_rotinas")
    .insert({ sistema_id: systemId, nome: name });
  if (error) throw error;
}

export async function updateSdRoutine(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from("sd_rotinas")
    .update({ nome: name })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteSdRoutine(id: string): Promise<void> {
  const { error } = await supabase.from("sd_rotinas").delete().eq("id", id);
  if (error) throw error;
}
