import * as yaml from "js-yaml";
import type {
  BunnyVideoMetadata,
  KnowledgeArticle,
  KnowledgeArticleMetadata,
  KnowledgeSection,
  MasterKnowledgeDocument,
} from "@/types/knowledge";

export const SIPLAN_HUB_SECTION_INDEX = 5;
export const SIPLAN_HUB_SECTION_TITLE = "SEÇÃO PRINCIPAL 5: Rotinas atualizadas via Siplan HUB";
export const SIPLAN_HUB_ID_PREFIX = "S-";

export type RoutinePrefix = "D" | "R" | "V" | "M" | "S" | "C";

export const ROUTINE_PREFIX_OPTIONS: { prefix: RoutinePrefix; label: string; sectionIndex: number }[] = [
  { prefix: "R", label: "R — Rotinas e Procedimentos (Seção 1)", sectionIndex: 1 },
  { prefix: "V", label: "V — Transcrições de Videoaulas (Seção 2)", sectionIndex: 2 },
  { prefix: "M", label: "M — Manuais do Produto (Seção 3)", sectionIndex: 3 },
  { prefix: "D", label: "D — Demonstrações do Sistema (Seção 4)", sectionIndex: 4 },
  { prefix: "C", label: "C — Suporte 0800 / Troubleshooting (Seção 1)", sectionIndex: 1 },
  { prefix: "S", label: "S — Siplan HUB / Atualizações (Seção 5)", sectionIndex: 5 },
];

/**
 * Template Canônico Homologado (Schema V3.0) para o corpo de novas rotinas.
 */
export const CANONICAL_ROUTINE_BODY_TEMPLATE = `#### Descrição:
[Resumo conciso de 1 a 2 parágrafos contextualizando a funcionalidade]

#### Passo a passo:
1. No menu **[Menu Principal]**, acesse a tela **[Submenu/Tela]**.
2. Clique no botão **[Botão em Negrito]** e preencha o campo **[Campo]**.
3. Selecione a opção **[Opção]** e clique em **[Salvar]**.

* **Dica / Alerta:** [Orientação prática de Corregedoria, ITCMD ou boas práticas].`;

/**
 * Exemplo de estrutura canônica de metadados para preenchimento guiado.
 */
export const CANONICAL_ROUTINE_EXAMPLE_METADATA: KnowledgeArticleMetadata = {
  id: "R-39.0",
  titulo: "Título Claro e Autoexplicativo da Rotina",
  tags: ["modulo", "funcionalidade", "tela"],
  objetivo: "Descrição em 1 a 2 linhas iniciada por verbo no infinitivo",
  sinonimos: ["termo alternativo 1", "termo alternativo 2", "gíria de balcão 3"],
  perguntas_usuario: [
    "Como o escrevente pergunta no dia a dia 1?",
    "Dúvida comum 2?",
    "Pergunta real 3?",
  ],
  sintomas_comuns: [
    "dor ou trava do usuário 1",
    "mensagem de tela ou botão cinza 2",
    "comportamento observado 3",
  ],
  video: {
    tem_video: false,
  },
};

/**
 * Normaliza quebras de linha para o padrão Windows CRLF (\r\n).
 * Obrigatório no salvamento do arquivo mestre OrionTN pos.md.
 */
export function ensureCrlf(content: string): string {
  if (!content) return "";
  return content.replace(/\r?\n/g, "\r\n");
}

/**
 * Converte timestamp textual (ex: "02:30", "01:15:00", "45") para segundos inteiros.
 */
export function parseTimestampToSeconds(ts: string): number {
  if (!ts) return 0;
  const parts = ts.trim().split(":").map((p) => parseInt(p, 10));
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return 0;
}

/**
 * Converte segundos inteiros para formato textual MM:SS ou HH:MM:SS.
 */
export function formatSecondsToTimestamp(seconds?: number | null): string {
  if (seconds === undefined || seconds === null || isNaN(seconds) || seconds < 0) {
    return "00:00";
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Detecta se o título informado contém prefixo de ID (ex: "D-3.3 - ", "R-1.0: ").
 * Conforme regra da base, o título deve ser limpo e funcional, sem código de ID.
 */
export interface RoutineValidationResult {
  isValid: boolean;
  valid: boolean;
  message?: string;
  errors: string[];
}

export const ID_PREFIX_REGEX = /^\s*\[?[A-Z]{1,4}-\d+(?:\.\d+)*\]?(?:\s*[-–—:]\s*|\s+)/i;

export function hasIdPrefixInTitle(title: string): boolean {
  if (!title) return false;
  return ID_PREFIX_REGEX.test(title.trim());
}

/**
 * Remove qualquer prefixo de ID do início do título.
 */
export function stripIdPrefixFromTitle(title: string): string {
  if (!title) return "";
  return title.trim().replace(ID_PREFIX_REGEX, "").trim();
}

/**
 * Validação do campo sintomas_comuns:
 * - Obrigar no mínimo 3 e no máximo 5 termos.
 * - Não aceitar ponto de interrogação (?) pois devem ser expressões curtas de busca, e não perguntas.
 */
export function validateSintomasComuns(sintomas: string[]): RoutineValidationResult {
  if (!sintomas || sintomas.length < 3) {
    const msg = `Cadastre pelo menos 3 sintomas comuns de dor (atualmente: ${sintomas?.length || 0}).`;
    return { isValid: false, valid: false, message: msg, errors: [msg] };
  }
  if (sintomas.length > 5) {
    const msg = `Cadastre no máximo 5 sintomas comuns (atualmente: ${sintomas.length}).`;
    return { isValid: false, valid: false, message: msg, errors: [msg] };
  }
  for (const s of sintomas) {
    if (s.includes("?")) {
      const msg = `O termo "${s}" contém ponto de interrogação '?'. Dores e sintomas não devem ser perguntas; adicione dúvidas em 'Perguntas do Usuário'.`;
      return { isValid: false, valid: false, message: msg, errors: [msg] };
    }
    if (s.trim().length > 70) {
      const msg = `O termo "${s.slice(0, 30)}..." é muito longo. Sintomas devem ser expressões curtas de busca (ex: "tela travada", "erro ao validar lote").`;
      return { isValid: false, valid: false, message: msg, errors: [msg] };
    }
  }
  return { isValid: true, valid: true, errors: [] };
}

/**
 * Validação das perguntas_usuario:
 * - Obrigar no mínimo 3 e no máximo 5 perguntas completas.
 */
export function validatePerguntasUsuario(perguntas: string[]): RoutineValidationResult {
  if (!perguntas || perguntas.length < 3) {
    const msg = `Cadastre no mínimo 3 perguntas completas que um usuário faria (atualmente: ${perguntas?.length || 0}).`;
    return { isValid: false, valid: false, message: msg, errors: [msg] };
  }
  if (perguntas.length > 5) {
    const msg = `Cadastre no máximo 5 perguntas do usuário permitido (atualmente: ${perguntas.length}).`;
    return { isValid: false, valid: false, message: msg, errors: [msg] };
  }
  return { isValid: true, valid: true, errors: [] };
}

/**
 * Validação de tags:
 * - Obrigar no mínimo 3 e no máximo 7 tags de categorização.
 */
export function validateTags(tags: string[]): RoutineValidationResult {
  if (!tags || tags.length < 3) {
    const msg = `Cadastre no mínimo 3 tags de categorização (atualmente: ${tags?.length || 0}).`;
    return { isValid: false, valid: false, message: msg, errors: [msg] };
  }
  if (tags.length > 7) {
    const msg = `Máximo de 7 tags permitido (atualmente: ${tags.length}).`;
    return { isValid: false, valid: false, message: msg, errors: [msg] };
  }
  return { isValid: true, valid: true, errors: [] };
}

/**
 * Validação do vídeo Bunny.net:
 * - Se tem_video for true, exigir GUID e minutagem de início.
 */
export function validateVideo(
  video: BunnyVideoMetadata | undefined,
  hasVideo: boolean,
): RoutineValidationResult {
  if (!hasVideo || !video?.tem_video) {
    return { isValid: true, valid: true, errors: [] };
  }
  if (!video.bunny_video_id || !video.bunny_video_id.trim()) {
    const msg = "Informe o GUID do vídeo Bunny.net (ou cole a URL de Direct Play).";
    return { isValid: false, valid: false, message: msg, errors: [msg] };
  }
  if (!video.video_timestamp || !video.video_timestamp.trim()) {
    const msg = "A minutagem de início do vídeo (MM:SS) é obrigatória quando há vídeo.";
    return { isValid: false, valid: false, message: msg, errors: [msg] };
  }
  return { isValid: true, valid: true, errors: [] };
}

/**
 * Validação e higienização do corpo da rotina:
 * - Deve começar com #### Descrição:
 * - Deve conter #### Passo a passo:
 * - Bloqueia delimitadores soltos de traço triplo (---) dentro do corpo.
 */
export function validateRoutineBody(body: string): RoutineValidationResult {
  const trimmed = body?.trim() || "";
  if (!trimmed) {
    const msg = "O corpo da rotina é obrigatório.";
    return { isValid: false, valid: false, message: msg, errors: [msg] };
  }

  // Verifica delimitadores triplos soltos (---)
  const hasTripleDash = /(?:^|\r?\n)\s*---+\s*(?:\r?\n|$)/.test(trimmed);
  if (hasTripleDash) {
    const msg = "Delimitadores de traço triplo ('---') não são permitidos dentro do corpo da rotina para não corromper o arquivo mestre. Utilize '***' se desejar uma linha horizontal divisória.";
    return { isValid: false, valid: false, message: msg, errors: [msg] };
  }

  // Começar com #### Descrição: (aceita ### ou ####)
  if (!/^#{3,4}\s+Descrição:/i.test(trimmed)) {
    const msg = "O corpo da rotina deve obrigatoriamente começar com o cabeçalho '#### Descrição:'.";
    return { isValid: false, valid: false, message: msg, errors: [msg] };
  }

  // Conter #### Passo a passo: (aceita ### ou ####)
  if (!/#{3,4}\s+Passo a passo:/i.test(trimmed)) {
    const msg = "O corpo da rotina deve conter a seção '#### Passo a passo:'.";
    return { isValid: false, valid: false, message: msg, errors: [msg] };
  }

  return { isValid: true, valid: true, errors: [] };
}

/**
 * Validação Integral de Integridade do Schema V3.0 (Pré-voo antes de salvar no Storage e n8n).
 * Regras:
 * 1. O 'id' é obrigatório e único;
 * 2. O YAML deve ser parseável sem erros sintáticos;
 * 3. Presença obrigatória dos campos: id, titulo, objetivo, tags, sinonimos, perguntas_usuario, sintomas_comuns e do nó video;
 * 4. Proibição estrita do campo legado 'video_id' (deve ser exclusivamente 'bunny_video_id' conforme ADR-003);
 * 5. O corpo markdown deve conter os cabeçalhos '#### Descrição:' e '#### Passo a passo:'.
 */
export interface SchemaV3ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateRoutineSchemaV3(
  metadata: Partial<KnowledgeArticleMetadata>,
  body: string,
  existingArticles: KnowledgeArticle[] = [],
  currentArticleId?: string,
): SchemaV3ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Validação de ID
  const id = (metadata.id || "").trim();
  if (!id) {
    errors.push("O identificador 'id' é obrigatório (ex: R-39.0, V-8.1.0, M-71.0, D-10.0 ou C-NOTAS-01).");
  } else {
    // Unicidade na memória
    const normalizedTarget = id.toUpperCase();
    const conflict = existingArticles.find(
      (a) =>
        a.id.toUpperCase() === normalizedTarget &&
        a.id.toUpperCase() !== currentArticleId?.toUpperCase(),
    );
    if (conflict) {
      errors.push(`O ID "${id}" já está em uso pela rotina "${conflict.titulo}". Cada rotina deve possuir um ID exclusivo.`);
    }
  }

  // 2. Validação do Título (Título funcional, limpo e SEM código de ID)
  const rawTitle = (metadata.titulo || "").trim();
  if (!rawTitle) {
    errors.push("O campo 'titulo' é obrigatório.");
  } else if (hasIdPrefixInTitle(rawTitle)) {
    errors.push(`O título não deve conter o prefixo do ID no texto (ex: remova o prefixo de "${rawTitle}").`);
  }

  // 3. Validação do Objetivo (Frase única e densa)
  const objetivo = (metadata.objetivo || "").trim();
  if (!objetivo) {
    errors.push("O campo 'objetivo' é obrigatório (frase concisa definindo a finalidade prática).");
  } else if (!/^[A-ZÀ-Úa-zà-ú]/i.test(objetivo)) {
    warnings.push("Recomenda-se iniciar o objetivo com um verbo no infinitivo (ex: 'Orientar o escrevente a...').");
  }

  // 4. Validação de Tags (3 a 7)
  const tags = (metadata.tags || []).map((t) => t.trim()).filter(Boolean);
  if (tags.length < 3 || tags.length > 7) {
    errors.push(`O campo 'tags' deve conter entre 3 e 7 itens de categorização (atualmente: ${tags.length}).`);
  }

  // 5. Validação de Sinônimos (Mínimo 1)
  const sinonimos = (metadata.sinonimos || []).map((s) => s.trim()).filter(Boolean);
  if (sinonimos.length === 0) {
    errors.push("O campo 'sinonimos' é obrigatório (informe ao menos 1 termo alternativo ou jargão de balcão).");
  }

  // 6. Validação de Perguntas do Usuário (3 a 5)
  const perguntas = (metadata.perguntas_usuario || []).map((p) => p.trim()).filter(Boolean);
  if (perguntas.length < 3 || perguntas.length > 5) {
    errors.push(`O campo 'perguntas_usuario' deve conter entre 3 e 5 perguntas completas que um usuário faria (atualmente: ${perguntas.length}).`);
  }

  // 7. Validação de Sintomas Comuns (3 a 5, sem '?')
  const sintomas = (metadata.sintomas_comuns || []).map((s) => s.trim()).filter(Boolean);
  if (sintomas.length < 3 || sintomas.length > 5) {
    errors.push(`O campo 'sintomas_comuns' deve conter entre 3 e 5 termos de dor/sintoma (atualmente: ${sintomas.length}).`);
  } else {
    for (const s of sintomas) {
      if (s.includes("?")) {
        errors.push(`O sintoma "${s}" contém ponto de interrogação '?'. Dores de sistema não devem ser perguntas.`);
      }
    }
  }

  // 8. Nó Video e Proibição Estrita de 'video_id' (ADR-003)
  if (!metadata.video || typeof metadata.video !== "object") {
    errors.push("O nó 'video' é obrigatório no frontmatter YAML.");
  } else {
    const rawVideo = metadata.video as Record<string, any>;

    // Proibição estrita de video_id
    if ("video_id" in rawVideo && rawVideo.video_id) {
      errors.push("PROIBIÇÃO ESTRITA: O campo legado 'video_id' é proibido conforme ADR-003. Utilize exclusivamente 'bunny_video_id'.");
    }

    if (rawVideo.tem_video) {
      if (!rawVideo.bunny_video_id || !String(rawVideo.bunny_video_id).trim()) {
        errors.push("Quando 'tem_video: true', o campo 'bunny_video_id' (GUID) é obrigatório.");
      }
      if (!rawVideo.video_timestamp || !String(rawVideo.video_timestamp).trim()) {
        errors.push("Quando 'tem_video: true', a minutagem inicial 'video_timestamp' (MM:SS) é obrigatória.");
      }
    }
  }

  // 9. YAML Parseável sem erros sintáticos
  try {
    const yamlString = yaml.dump({
      id,
      titulo: stripIdPrefixFromTitle(rawTitle),
      tags,
      objetivo,
      sinonimos,
      perguntas_usuario: perguntas,
      sintomas_comuns: sintomas,
      video: metadata.video,
    });
    yaml.load(yamlString);
  } catch (yamlErr: any) {
    errors.push(`Erro de sintaxe no YAML: ${yamlErr?.message || "Estrutura inválida"}`);
  }

  // 10. Validação do Corpo Markdown (#### Descrição: e #### Passo a passo:)
  const bodyValidation = validateRoutineBody(body);
  if (!bodyValidation.valid) {
    errors.push(...bodyValidation.errors);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Consulta assíncrona na tabela assistant_knowledge_files do Supabase
 * para garantir unicidade do ID mesmo fora do arquivo mestre.
 */
export async function checkArticleIdUniquenessInDatabase(
  supabaseClient: any,
  articleId: string,
  excludeArticleId?: string,
): Promise<{ isUnique: boolean; conflictId?: string }> {
  const cleanId = articleId?.trim();
  if (!cleanId) return { isUnique: false };

  try {
    const { data, error } = await supabaseClient
      .from("assistant_knowledge_files")
      .select("article_id")
      .ilike("article_id", cleanId)
      .limit(1);

    if (error) {
      console.warn("Aviso na consulta de unicidade de ID no Supabase:", error.message);
      return { isUnique: true };
    }

    if (data && data.length > 0) {
      const found = data[0].article_id;
      if (!excludeArticleId || found.toLowerCase() !== excludeArticleId.toLowerCase()) {
        return { isUnique: false, conflictId: found };
      }
    }
    return { isUnique: true };
  } catch {
    return { isUnique: true };
  }
}

/**
 * Sanitiza o corpo da rotina substituindo traços triplos soltos (---) por ***.
 */
export function sanitizeRoutineBody(body: string): string {
  if (!body) return "";
  return body.replace(/(^|\r?\n)\s*---+\s*(\r?\n|$)/g, "$1***$2");
}

/**
 * Faz o parse seguro do frontmatter YAML de um artigo individual.
 */
export function parseArticleFrontmatter(frontmatterRaw: string): KnowledgeArticleMetadata {
  try {
    const loaded = yaml.load(frontmatterRaw) as Record<string, unknown> | null;
    if (!loaded || typeof loaded !== "object") {
      throw new Error("YAML inválido ou vazio");
    }

    const id = String(loaded.id ?? "").trim();
    const titulo = String(loaded.titulo ?? "").trim();
    const objetivo = String(loaded.objetivo ?? "").trim();

    const tags = Array.isArray(loaded.tags)
      ? loaded.tags.map((t) => String(t).trim()).filter(Boolean)
      : [];

    const sinonimos = Array.isArray(loaded.sinonimos)
      ? loaded.sinonimos.map((s) => String(s).trim()).filter(Boolean)
      : [];

    const perguntas_usuario = Array.isArray(loaded.perguntas_usuario)
      ? loaded.perguntas_usuario.map((p) => String(p).trim()).filter(Boolean)
      : [];

    // ⭐ Novo campo obrigatório: sintomas_comuns
    const sintomas_comuns = Array.isArray(loaded.sintomas_comuns)
      ? loaded.sintomas_comuns.map((s) => String(s).trim()).filter(Boolean)
      : [];

    let video: BunnyVideoMetadata | undefined;
    if (loaded.video && typeof loaded.video === "object") {
      const v = loaded.video as Record<string, unknown>;
      const isTemVideo = Boolean(v.tem_video);

      if (isTemVideo) {
        const rawSec = v.video_start_seconds;
        let startSec: number | undefined;
        if (typeof rawSec === "number" && !isNaN(rawSec)) {
          startSec = rawSec;
        } else if (rawSec !== undefined && rawSec !== null && String(rawSec).trim() !== "") {
          const parsed = parseInt(String(rawSec), 10);
          startSec = isNaN(parsed) ? undefined : parsed;
        }

        let rawTs =
          v.video_timestamp !== undefined && v.video_timestamp !== null
            ? String(v.video_timestamp).trim()
            : undefined;

        if (startSec !== undefined && !rawTs) {
          rawTs = formatSecondsToTimestamp(startSec);
        }
        if (rawTs && startSec === undefined) {
          startSec = parseTimestampToSeconds(rawTs);
        }

        const libId = v.bunny_library_id ? String(v.bunny_library_id).trim() : "467408";
        const vidId = v.bunny_video_id ? String(v.bunny_video_id).trim() : undefined;
        let videoUrl = v.video_url ? String(v.video_url).trim() : undefined;

        if (startSec === undefined && videoUrl) {
          try {
            const parsed = new URL(videoUrl);
            const tParam = parsed.searchParams.get("t");
            if (tParam) {
              const parsedVal = parseInt(tParam, 10);
              if (!isNaN(parsedVal)) {
                startSec = parsedVal;
                rawTs = formatSecondsToTimestamp(startSec);
              }
            }
          } catch {
            const match = videoUrl.match(/[?&]t=(\d+)/);
            if (match) {
              startSec = parseInt(match[1], 10);
              rawTs = formatSecondsToTimestamp(startSec);
            }
          }
        }

        if (videoUrl) {
          try {
            const parsed = new URL(videoUrl);
            parsed.searchParams.set("t", String(startSec ?? 0));
            videoUrl = parsed.toString();
          } catch {
            if (videoUrl.includes("?")) {
              videoUrl = videoUrl.replace(/([?&])t=[^&]*/, `$1t=${startSec || 0}`);
              if (!videoUrl.includes("t=")) {
                videoUrl = `${videoUrl}&t=${startSec || 0}`;
              }
            } else {
              videoUrl = `${videoUrl}?t=${startSec || 0}`;
            }
          }
        } else if (libId && vidId) {
          videoUrl = `https://iframe.mediadelivery.net/embed/${libId}/${vidId}?t=${startSec || 0}`;
        }

        video = {
          tem_video: true,
          bunny_library_id: libId,
          bunny_video_id: vidId,
          video_title: v.video_title ? String(v.video_title).trim() : undefined,
          video_url: videoUrl,
          video_timestamp: rawTs,
          video_start_seconds: startSec,
        };
      } else {
        video = { tem_video: false };
      }
    } else {
      video = { tem_video: false };
    }

    return {
      ...loaded,
      id,
      titulo,
      tags,
      objetivo,
      sinonimos,
      perguntas_usuario,
      sintomas_comuns,
      video,
    };
  } catch {
    // Fallback por regex robusto
    const id = frontmatterRaw.match(/id:\s*([^\n\r]+)/)?.[1]?.trim() || "";
    const tituloMatch =
      frontmatterRaw.match(/titulo:\s*"([^"]+)"/) ||
      frontmatterRaw.match(/titulo:\s*([^\n\r]+)/);
    const titulo = tituloMatch ? tituloMatch[1].trim() : "";
    const objetivoMatch =
      frontmatterRaw.match(/objetivo:\s*"([^"]+)"/) ||
      frontmatterRaw.match(/objetivo:\s*([^\n\r]+)/);
    const objetivo = objetivoMatch ? objetivoMatch[1].trim() : "";

    const extractList = (blockName: string) => {
      const match = frontmatterRaw.match(
        new RegExp(`${blockName}:[\\r\\n]+((?:\\s+-[^\\r\\n]+[\\r\\n]*)+)`, "i"),
      );
      if (!match) return [];
      return match[1]
        .split(/\r?\n/)
        .map((l) => l.replace(/^\s*-\s*"?|"?,?$/g, "").trim())
        .filter(Boolean);
    };

    const tags = extractList("tags");
    const sinonimos = extractList("sinonimos");
    const perguntas_usuario = extractList("perguntas_usuario");
    const sintomas_comuns = extractList("sintomas_comuns");

    let video: BunnyVideoMetadata = { tem_video: false };
    if (frontmatterRaw.includes("video:")) {
      const temVideo = /tem_video:\s*true/i.test(frontmatterRaw);
      if (temVideo) {
        const bunnyLibraryId = frontmatterRaw.match(/bunny_library_id:\s*"?([^"\r\n]+)"?/)?.[1]?.trim() || "467408";
        const bunnyVideoId = frontmatterRaw.match(/bunny_video_id:\s*"?([^"\r\n]+)"?/)?.[1]?.trim();
        const videoTitle = frontmatterRaw.match(/video_title:\s*"?([^"\r\n]+)"?/)?.[1]?.trim();
        let videoUrl = frontmatterRaw.match(/video_url:\s*"?([^"\r\n]+)"?/)?.[1]?.trim();
        let videoTimestamp = frontmatterRaw.match(/video_timestamp:\s*"?([^"\r\n]+)"?/)?.[1]?.trim();
        const startSecMatch = frontmatterRaw.match(/video_start_seconds:\s*(\d+)/);
        let startSec = startSecMatch ? parseInt(startSecMatch[1], 10) : undefined;

        if (startSec !== undefined && !videoTimestamp) {
          videoTimestamp = formatSecondsToTimestamp(startSec);
        }
        if (videoTimestamp && startSec === undefined) {
          startSec = parseTimestampToSeconds(videoTimestamp);
        }
        if (startSec === undefined && videoUrl) {
          try {
            const parsed = new URL(videoUrl);
            const tParam = parsed.searchParams.get("t");
            if (tParam) {
              const parsedVal = parseInt(tParam, 10);
              if (!isNaN(parsedVal)) {
                startSec = parsedVal;
                videoTimestamp = formatSecondsToTimestamp(startSec);
              }
            }
          } catch {
            const match = videoUrl.match(/[?&]t=(\d+)/);
            if (match) {
              startSec = parseInt(match[1], 10);
              videoTimestamp = formatSecondsToTimestamp(startSec);
            }
          }
        }

        if (videoUrl) {
          try {
            const parsed = new URL(videoUrl);
            parsed.searchParams.set("t", String(startSec ?? 0));
            videoUrl = parsed.toString();
          } catch {
            if (videoUrl.includes("?")) {
              videoUrl = videoUrl.replace(/([?&])t=[^&]*/, `$1t=${startSec || 0}`);
              if (!videoUrl.includes("t=")) {
                videoUrl = `${videoUrl}&t=${startSec || 0}`;
              }
            } else {
              videoUrl = `${videoUrl}?t=${startSec || 0}`;
            }
          }
        } else if (bunnyLibraryId && bunnyVideoId) {
          videoUrl = `https://iframe.mediadelivery.net/embed/${bunnyLibraryId}/${bunnyVideoId}?t=${startSec || 0}`;
        }

        video = {
          tem_video: true,
          bunny_library_id: bunnyLibraryId,
          bunny_video_id: bunnyVideoId,
          video_title: videoTitle,
          video_url: videoUrl,
          video_timestamp: videoTimestamp,
          video_start_seconds: startSec,
        };
      }
    }

    return {
      id,
      titulo,
      tags,
      objetivo,
      sinonimos,
      perguntas_usuario,
      sintomas_comuns,
      video,
    };
  }
}

/**
 * Analisa o documento mestre consolidado (`OrionTN pos.md`) e extrai as seções e todos os artigos.
 */
export function parseMasterDocument(rawContent: string): MasterKnowledgeDocument {
  const versionMatch = rawContent.match(/VERSÃO_BASE_CONHECIMENTO:\s*([^\n\r]+)/i);
  const dateMatch = rawContent.match(/DATA_ULTIMA_ATUALIZACAO_BASE:\s*([^\n\r]+)/i);

  const version = versionMatch ? versionMatch[1].trim() : "2.1.0";
  const lastUpdated = dateMatch ? dateMatch[1].trim() : "";

  // Mapear seções principais
  const sectionRegex = /(?:^|\r?\n)\s*(SEÇÃO PRINCIPAL\s*(\d+)?:?\s*([^\n\r]+))/g;
  const sectionMarkers: { index: number; title: string; pos: number }[] = [];
  let sMatch: RegExpExecArray | null;

  while ((sMatch = sectionRegex.exec(rawContent)) !== null) {
    const sectionTitle = sMatch[1].trim();
    const sectionIndex = sMatch[2] ? parseInt(sMatch[2], 10) : sectionMarkers.length + 1;
    sectionMarkers.push({
      index: sectionIndex,
      title: sectionTitle,
      pos: sMatch.index,
    });
  }

  if (sectionMarkers.length === 0) {
    sectionMarkers.push({
      index: 1,
      title: "Seção Geral - Orion TN",
      pos: 0,
    });
  }

  // Extrair artigos delimitados por frontmatter YAML
  const articleRegex =
    /---\r?\n(id:[\s\S]*?)\r?\n---\r?\n([\s\S]*?)(?=(?:\r?\n---\r?\n(?:id:| SEÇÃO PRINCIPAL|===)|$))/g;

  const articles: KnowledgeArticle[] = [];
  let aMatch: RegExpExecArray | null;

  while ((aMatch = articleRegex.exec(rawContent)) !== null) {
    const fullMatch = aMatch[0];
    const frontmatterRaw = aMatch[1];
    const body = aMatch[2].trim();
    const startIndex = aMatch.index;
    const endIndex = startIndex + fullMatch.length;

    let currentSection = sectionMarkers[0];
    for (const marker of sectionMarkers) {
      if (startIndex >= marker.pos) {
        currentSection = marker;
      } else {
        break;
      }
    }

    const metadata = parseArticleFrontmatter(frontmatterRaw);

    articles.push({
      id: metadata.id || `ART-${articles.length + 1}`,
      titulo: metadata.titulo || "Artigo sem título",
      sectionIndex: currentSection.index,
      sectionName: currentSection.title,
      metadata,
      frontmatterRaw,
      body,
      startIndex,
      endIndex,
      fullLength: fullMatch.length,
    });
  }

  // Montar lista de seções agregadas únicas (deduplica por index)
  const uniqueSectionMap = new Map<number, KnowledgeSection>();
  for (const marker of sectionMarkers) {
    if (!uniqueSectionMap.has(marker.index)) {
      uniqueSectionMap.set(marker.index, {
        index: marker.index,
        title: marker.title,
        articleIds: articles.filter((a) => a.sectionIndex === marker.index).map((a) => a.id),
      });
    }
  }

  const sections: KnowledgeSection[] = Array.from(uniqueSectionMap.values());

  // Garantir Seção 5 (Siplan HUB) se não estiver mapeada
  if (!sections.some((s) => s.index === SIPLAN_HUB_SECTION_INDEX)) {
    sections.push({
      index: SIPLAN_HUB_SECTION_INDEX,
      title: SIPLAN_HUB_SECTION_TITLE,
      articleIds: articles
        .filter((a) => a.sectionIndex === SIPLAN_HUB_SECTION_INDEX || a.id.startsWith("S-"))
        .map((a) => a.id),
    });
  }

  const header = rawContent.slice(0, articles[0]?.startIndex ?? 0).trim();

  return {
    header,
    version,
    lastUpdated,
    sections,
    articles,
    rawContent,
  };
}

/**
 * Valida se um ID de artigo já existe na base de conhecimento.
 */
export function validateArticleIdUniqueness(
  articles: KnowledgeArticle[],
  targetId: string,
): { isUnique: boolean; conflictArticle?: KnowledgeArticle } {
  const normalized = targetId.trim().toLowerCase();
  if (!normalized) return { isUnique: false };

  const conflict = articles.find((a) => a.id.trim().toLowerCase() === normalized);
  return {
    isUnique: !conflict,
    conflictArticle: conflict,
  };
}

/**
 * Sugere o próximo ID sequencial livre com base no prefixo ou seção.
 * Suporta os 5 prefixos oficiais:
 * - D: D-X.Y (ex: D-3.80)
 * - R: R-X.Y (ex: R-1.12)
 * - V: V-X.Y (ex: V-2.15)
 * - M: M-X.Y (ex: M-10.1)
 * - S: S-5.X (ex: S-5.1)
 */
export function suggestNextArticleId(
  articles: KnowledgeArticle[],
  prefixOrSection: string | number = "D",
): string {
  let prefix: string = "D";

  if (typeof prefixOrSection === "number") {
    switch (prefixOrSection) {
      case 1:
        prefix = "R";
        break;
      case 2:
        prefix = "V";
        break;
      case 3:
        prefix = "M";
        break;
      case 4:
        prefix = "D";
        break;
      case 5:
        prefix = "S";
        break;
      default:
        prefix = "D";
    }
  } else {
    const raw = prefixOrSection.trim().toUpperCase();
    if (raw.startsWith("D")) prefix = "D";
    else if (raw.startsWith("R")) prefix = "R";
    else if (raw.startsWith("V")) prefix = "V";
    else if (raw.startsWith("M")) prefix = "M";
    else if (raw.startsWith("S")) prefix = "S";
    else if (raw.startsWith("C")) prefix = "C";
    else prefix = "D";
  }

  // Filtrar artigos que começam com esse prefixo
  const prefixUpper = `${prefix}-`;
  const matchingArticles = articles.filter((a) => a.id.toUpperCase().startsWith(prefixUpper));

  if (prefix === "C") {
    // Para C (ex: C-NOTAS-01 ou C-01)
    const cNumbers: number[] = [];
    let detectedSubprefix = "NOTAS";
    for (const a of matchingArticles) {
      const match = a.id.toUpperCase().match(/^C-([A-Z]+)-(\d+)$/);
      if (match) {
        detectedSubprefix = match[1];
        cNumbers.push(parseInt(match[2], 10));
      } else {
        const simpleMatch = a.id.toUpperCase().match(/^C-(\d+)$/);
        if (simpleMatch) cNumbers.push(parseInt(simpleMatch[1], 10));
      }
    }
    const nextNum = cNumbers.length > 0 ? Math.max(...cNumbers) + 1 : 1;
    const padded = String(nextNum).padStart(2, "0");
    return `C-${detectedSubprefix}-${padded}`;
  }

  if (prefix === "S") {
    const numbers: number[] = [];
    for (const a of matchingArticles) {
      const match = a.id.toUpperCase().match(/^S-(?:5\.)?(\d+)$/);
      if (match) numbers.push(parseInt(match[1], 10));
    }
    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    return `S-5.${nextNum}`;
  }

  if (prefix === "D") {
    // Para D, analisa agrupamento de D-3.X (que concentra a maioria das rotinas de atendimento)
    const d3Numbers: number[] = [];
    for (const a of matchingArticles) {
      const match = a.id.toUpperCase().match(/^D-3\.(\d+)$/);
      if (match) d3Numbers.push(parseInt(match[1], 10));
    }
    if (d3Numbers.length > 0) {
      const nextNum = Math.max(...d3Numbers) + 1;
      return `D-3.${nextNum}`;
    }
  }

  // Heurística geral: extrai os números após o prefixo (ex: R-X.Y ou R-X)
  let detectedMajor = 1;
  const majorToMinors = new Map<number, { val: number; raw: string }[]>();

  for (const a of matchingArticles) {
    const match = a.id.toUpperCase().match(new RegExp(`^${prefix}-(\\d+)(?:\\.(\\d+))?`));
    if (match) {
      const maj = parseInt(match[1], 10);
      const rawMin = match[2] || "";
      const min = rawMin ? parseInt(rawMin, 10) : 0;
      if (maj > detectedMajor) {
        detectedMajor = maj;
      }
      if (!majorToMinors.has(maj)) {
        majorToMinors.set(maj, []);
      }
      majorToMinors.get(maj)!.push({ val: min, raw: rawMin });
    }
  }

  const minors = majorToMinors.get(detectedMajor) || [];
  if (minors.length > 0) {
    let maxMinVal = -1;
    let sampleRaw = "";
    for (const m of minors) {
      if (m.val > maxMinVal) {
        maxMinVal = m.val;
        sampleRaw = m.raw;
      }
    }
    const nextVal = maxMinVal + 1;
    if (sampleRaw.startsWith("0") && sampleRaw.length > 1) {
      const padded = String(nextVal).padStart(sampleRaw.length, "0");
      return `${prefix}-${detectedMajor}.${padded}`;
    }
    return `${prefix}-${detectedMajor}.${nextVal}`;
  }

  return `${prefix}-1.01`;
}

/**
 * Serializa uma rotina completa (Frontmatter YAML + Corpo Markdown) no novo padrão estrito da base.
 * Ordem dos campos:
 * 1. id
 * 2. titulo
 * 3. tags
 * 4. objetivo
 * 5. sinonimos
 * 6. perguntas_usuario
 * 7. sintomas_comuns
 * 8. video (tem_video: true com metadados ou tem_video: false)
 */
export function serializeArticleToMarkdown(
  metadata: KnowledgeArticleMetadata,
  body: string,
  hasVideo: boolean = false,
): string {
  const isVideoEnabled = hasVideo && Boolean(metadata.video?.tem_video);

  let videoObj: Record<string, unknown> = { tem_video: false };

  if (isVideoEnabled && metadata.video) {
    const v = metadata.video;
    const cleanTimestamp = v.video_timestamp?.trim() || "00:00";
    const startSecs =
      typeof v.video_start_seconds === "number"
        ? v.video_start_seconds
        : parseTimestampToSeconds(cleanTimestamp);

    const cleanLibId = v.bunny_library_id?.trim() || "467408";
    const cleanVidId = v.bunny_video_id?.trim() || "";
    let cleanEmbedUrl = v.video_url?.trim() || "";

    if (cleanEmbedUrl) {
      try {
        const parsed = new URL(cleanEmbedUrl);
        parsed.searchParams.set("t", String(startSecs));
        cleanEmbedUrl = parsed.toString();
      } catch {
        if (cleanEmbedUrl.includes("?")) {
          cleanEmbedUrl = cleanEmbedUrl.replace(/([?&])t=[^&]*/, `$1t=${startSecs}`);
          if (!cleanEmbedUrl.includes("t=")) {
            cleanEmbedUrl = `${cleanEmbedUrl}&t=${startSecs}`;
          }
        } else {
          cleanEmbedUrl = `${cleanEmbedUrl}?t=${startSecs}`;
        }
      }
    } else if (cleanLibId && cleanVidId) {
      cleanEmbedUrl = `https://iframe.mediadelivery.net/embed/${cleanLibId}/${cleanVidId}?t=${startSecs}`;
    }

    videoObj = {
      tem_video: true,
      bunny_library_id: cleanLibId,
      bunny_video_id: cleanVidId,
      video_title: v.video_title?.trim() || metadata.titulo.trim(),
      video_url: cleanEmbedUrl,
      video_timestamp: cleanTimestamp,
      video_start_seconds: startSecs,
    };
  }

  // Objeto YAML estruturado rigorosamente na ordem definida
  const yamlObj: Record<string, unknown> = {
    id: metadata.id.trim(),
    titulo: stripIdPrefixFromTitle(metadata.titulo), // Garante título sem prefixo de ID
    tags: (metadata.tags || []).map((t) => t.trim()).filter(Boolean),
    objetivo: metadata.objetivo?.trim() || "",
    sinonimos: (metadata.sinonimos || []).map((s) => s.trim()).filter(Boolean),
    perguntas_usuario: (metadata.perguntas_usuario || []).map((p) => p.trim()).filter(Boolean),
    sintomas_comuns: (metadata.sintomas_comuns || []).map((s) => s.trim()).filter(Boolean),
    video: videoObj,
  };

  const yamlString = yaml
    .dump(yamlObj, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
    })
    .trim();

  // Sanitiza o corpo removendo delimitadores isolados de --- para evitar conflito com frontmatter
  const cleanBody = sanitizeRoutineBody(body.trim());
  return ensureCrlf(`---\r\n${yamlString}\r\n---\r\n${cleanBody}`);
}

/**
 * Insere cirurgicamente uma nova rotina dentro do documento mestre OrionTN pos.md.
 */
export function insertNewArticleIntoDocument(
  fullDoc: string,
  newArticle: {
    metadata: KnowledgeArticleMetadata;
    body: string;
    sectionIndex?: number;
    hasVideo?: boolean;
  },
): string {
  const parsed = parseMasterDocument(fullDoc);

  const { isUnique, conflictArticle } = validateArticleIdUniqueness(
    parsed.articles,
    newArticle.metadata.id,
  );

  if (!isUnique) {
    throw new Error(
      `Já existe uma rotina cadastrada com o ID "${newArticle.metadata.id}" (${conflictArticle?.titulo}). Escolha um ID único.`,
    );
  }

  const serialized = serializeArticleToMarkdown(
    newArticle.metadata,
    newArticle.body,
    newArticle.hasVideo ?? Boolean(newArticle.metadata.video?.tem_video),
  );

  const targetSectionIndex = newArticle.sectionIndex ?? SIPLAN_HUB_SECTION_INDEX;
  const sectionArticles = parsed.articles.filter((a) => a.sectionIndex === targetSectionIndex);

  let result: string;
  if (sectionArticles.length > 0) {
    const lastArticleOfSection = sectionArticles[sectionArticles.length - 1];
    const insertionPoint = lastArticleOfSection.endIndex;

    const before = fullDoc.slice(0, insertionPoint);
    const after = fullDoc.slice(insertionPoint);

    result = `${before}\r\n\r\n${serialized}\r\n${after.replace(/^[\r\n]+/, "")}`;
  } else if (targetSectionIndex === SIPLAN_HUB_SECTION_INDEX) {
    const sectionHeader = `\r\n\r\n${SIPLAN_HUB_SECTION_TITLE}\r\n\r\n`;
    result = `${fullDoc.trim()}${sectionHeader}${serialized}\r\n`;
  } else {
    result = `${fullDoc.trim()}\r\n\r\n${serialized}\r\n`;
  }

  return ensureCrlf(result);
}

/**
 * Atualiza cirurgicamente uma rotina dentro do documento mestre.
 * Pode atualizar tanto o corpo markdown quanto os metadados YAML (ou ambos).
 */
export function updateArticleInDocument(
  fullDoc: string,
  articleId: string,
  updatedBody: string,
  updatedMetadata?: KnowledgeArticleMetadata,
): string {
  const parsed = parseMasterDocument(fullDoc);
  const target = parsed.articles.find((a) => a.id.toLowerCase() === articleId.toLowerCase());

  if (!target) {
    throw new Error(`Artigo com ID "${articleId}" não encontrado no documento.`);
  }

  // Se o ID foi modificado nos metadados, valida unicidade
  if (updatedMetadata && updatedMetadata.id.trim().toLowerCase() !== articleId.trim().toLowerCase()) {
    const otherArticles = parsed.articles.filter((a) => a.id.toLowerCase() !== articleId.toLowerCase());
    const { isUnique, conflictArticle } = validateArticleIdUniqueness(
      otherArticles,
      updatedMetadata.id,
    );
    if (!isUnique) {
      throw new Error(`O novo ID "${updatedMetadata.id}" já está em uso pela rotina "${conflictArticle?.titulo}".`);
    }
  }

  const before = fullDoc.slice(0, target.startIndex);
  const after = fullDoc.slice(target.endIndex);
  const cleanBody = sanitizeRoutineBody(updatedBody ? updatedBody.trim() : "");
  const bodyToUse = cleanBody || target.body;

  let reconstructedArticle: string;
  if (updatedMetadata) {
    reconstructedArticle = serializeArticleToMarkdown(
      updatedMetadata,
      bodyToUse,
      Boolean(updatedMetadata.video?.tem_video),
    );
  } else {
    reconstructedArticle = `---\r\n${target.frontmatterRaw}\r\n---\r\n${bodyToUse}`;
  }

  const result = `${before}${reconstructedArticle}\r\n${after.replace(/^[\r\n]+/, "")}`;
  return ensureCrlf(result);
}

/**
 * Remove completamente uma rotina do documento mestre OrionTN pos.md.
 */
export function deleteArticleFromDocument(
  fullDoc: string,
  articleId: string,
): string {
  const parsed = parseMasterDocument(fullDoc);
  const target = parsed.articles.find(
    (a) => a.id.trim().toLowerCase() === articleId.trim().toLowerCase(),
  );

  if (!target) {
    throw new Error(`Rotina com ID "${articleId}" não encontrada no documento.`);
  }

  const before = fullDoc.slice(0, target.startIndex);
  const after = fullDoc.slice(target.endIndex);

  const cleanedBefore = before.replace(/\r?\n\s*$/, "");
  const cleanedAfter = after.replace(/^\s*\r?\n/, "");

  let result: string;
  if (!cleanedBefore) {
    result = cleanedAfter;
  } else if (!cleanedAfter) {
    result = cleanedBefore;
  } else {
    result = `${cleanedBefore}\r\n\r\n${cleanedAfter}`;
  }

  return ensureCrlf(result);
}

/**
 * Normaliza o texto markdown para comparação confiável de dirty state.
 */
export function normalizeMarkdown(str: string): string {
  if (!str) return "";
  return str
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}
