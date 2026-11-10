import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PlusCircle,
  Sparkles,
  Loader2,
  Video,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  FileText,
  Tag,
  HelpCircle,
  Search,
  BookOpen,
  Info,
  Play,
  Clock,
  ExternalLink,
  Link2,
  Stethoscope,
  Pencil,
  Check,
  Eraser,
  Code,
  Eye,
  FileCode,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MarkdownTiptapEditor } from "./MarkdownTiptapEditor";
import {
  suggestNextArticleId,
  validateArticleIdUniqueness,
  parseTimestampToSeconds,
  formatSecondsToTimestamp,
  hasIdPrefixInTitle,
  stripIdPrefixFromTitle,
  validateSintomasComuns,
  validatePerguntasUsuario,
  validateTags,
  validateVideo,
  validateRoutineBody,
  sanitizeRoutineBody,
  ROUTINE_PREFIX_OPTIONS,
  RoutinePrefix,
  SIPLAN_HUB_SECTION_INDEX,
  CANONICAL_ROUTINE_BODY_TEMPLATE,
  CANONICAL_ROUTINE_EXAMPLE_METADATA,
  validateRoutineSchemaV3,
  checkArticleIdUniquenessInDatabase,
} from "@/services/markdownKnowledgeService";
import { generateRoutineMetadataWithAi } from "@/services/aiRoutineGeneratorService";
import {
  extractBunnyVideoIdentifiers,
  fetchBunnyVideoInfo,
  type BunnyVideoInfo,
} from "@/services/bunnyService";
import type {
  BunnyVideoMetadata,
  KnowledgeArticle,
  KnowledgeArticleMetadata,
  KnowledgeSection,
} from "@/types/knowledge";

interface CreateRoutineModalProps {
  isOpen: boolean;
  onClose: () => void;
  articles: KnowledgeArticle[];
  sections: KnowledgeSection[];
  onCreateRoutine: (params: {
    metadata: KnowledgeArticleMetadata;
    body: string;
    sectionIndex: number;
    hasVideo: boolean;
    customSummary?: string;
  }) => Promise<any>;
  isCreating: boolean;
  // Suporte opcional a modo de Edição de Rotina existente
  mode?: "create" | "edit";
  initialArticle?: KnowledgeArticle | null;
  onUpdateRoutine?: (params: {
    articleId: string;
    metadata: KnowledgeArticleMetadata;
    body: string;
    customSummary?: string;
  }) => Promise<any>;
  isUpdating?: boolean;
}

const DEFAULT_ROUTINE_BODY_TEMPLATE = `#### Descrição:
[1 a 2 frases claras e conceituais explicando o que a rotina faz]

#### Passo a passo:
1. Acesse o menu **Menu > Submenu**.
2. Na aba **Geral**, preencha os campos destacados.
3. Clique no botão **Concluir e Salvar** para finalizar.

* **Observação:** [Regra operacional ou dica técnica relevante]`;

export function CreateRoutineModal({
  isOpen,
  onClose,
  articles,
  sections,
  onCreateRoutine,
  isCreating,
  mode = "create",
  initialArticle = null,
  onUpdateRoutine,
  isUpdating = false,
}: CreateRoutineModalProps) {
  const isEditMode = mode === "edit" && Boolean(initialArticle);

  // 1. Estados dos Campos Principais
  const [selectedPrefix, setSelectedPrefix] = useState<RoutinePrefix>("D");
  const [routineId, setRoutineId] = useState("");
  const [title, setTitle] = useState("");
  const [selectedSectionIndex, setSelectedSectionIndex] = useState<number>(4);
  const [objective, setObjective] = useState("");
  const [stepByStepBody, setStepByStepBody] = useState("");

  // Tags (3 a 7)
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");

  // Perguntas do Usuário (3 a 5)
  const [userQuestions, setUserQuestions] = useState<string[]>([]);
  const [newQuestionInput, setNewQuestionInput] = useState("");

  // ⭐ Sintomas Comuns de Dor (3 a 5 - Novo Campo Obrigatório)
  const [sintomasComuns, setSintomasComuns] = useState<string[]>([]);
  const [newSintomaInput, setNewSintomaInput] = useState("");

  // Sinônimos e Jargões Alternativos
  const [synonyms, setSynonyms] = useState<string[]>([]);
  const [newSynonymInput, setNewSynonymInput] = useState("");

  // Vídeo Bunny.net Stream
  const [hasVideo, setHasVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [bunnyLibraryId, setBunnyLibraryId] = useState("467408");
  const [bunnyVideoId, setBunnyVideoId] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoTimestamp, setVideoTimestamp] = useState("00:00");

  // Estado de Validação do Vídeo Bunny
  const [bunnyVideoInfo, setBunnyVideoInfo] = useState<BunnyVideoInfo | null>(null);
  const [isValidatingBunny, setIsValidatingBunny] = useState(false);

  // Estado da Geração por IA
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Inicializar formulário ao abrir o modal
  useEffect(() => {
    if (!isOpen) return;

    if (isEditMode && initialArticle) {
      const meta = initialArticle.metadata;
      // Extrair prefixo do ID
      const prefixMatch = initialArticle.id.toUpperCase().match(/^([RVMDS])-/);
      const pref = (prefixMatch ? prefixMatch[1] : "D") as RoutinePrefix;
      setSelectedPrefix(pref);
      setRoutineId(initialArticle.id);
      setTitle(stripIdPrefixFromTitle(meta.titulo || initialArticle.titulo));
      setSelectedSectionIndex(initialArticle.sectionIndex);
      setObjective(meta.objetivo || "");
      setTags(meta.tags || []);
      setUserQuestions(meta.perguntas_usuario || []);
      setSintomasComuns(meta.sintomas_comuns || []);
      setSynonyms(meta.sinonimos || []);
      setStepByStepBody(initialArticle.body || DEFAULT_ROUTINE_BODY_TEMPLATE);

      const hasVid = Boolean(meta.video?.tem_video);
      setHasVideo(hasVid);
      if (hasVid && meta.video) {
        setVideoUrl(meta.video.video_url || "");
        setBunnyLibraryId(meta.video.bunny_library_id || "467408");
        setBunnyVideoId(meta.video.bunny_video_id || "");
        setVideoTitle(meta.video.video_title || "");
        setVideoTimestamp(meta.video.video_timestamp || "00:00");
      } else {
        setVideoUrl("");
        setBunnyLibraryId("467408");
        setBunnyVideoId("");
        setVideoTitle("");
        setVideoTimestamp("00:00");
      }
      setBunnyVideoInfo(null);
      setIsValidatingBunny(false);
    } else {
      // Modo Create
      const defaultPref: RoutinePrefix = "R";
      setSelectedPrefix(defaultPref);
      setSelectedSectionIndex(1);
      setRoutineId(suggestNextArticleId(articles, defaultPref));
      setTitle("");
      setObjective("");
      setTags([]);
      setUserQuestions([]);
      setSintomasComuns([]);
      setSynonyms([]);
      setStepByStepBody(CANONICAL_ROUTINE_BODY_TEMPLATE);
      setHasVideo(false);
      setVideoUrl("");
      setBunnyLibraryId("467408");
      setBunnyVideoId("");
      setVideoTitle("");
      setVideoTimestamp("00:00");
      setBunnyVideoInfo(null);
      setIsValidatingBunny(false);
    }
  }, [isOpen, isEditMode, initialArticle, articles]);

  const [isYamlPreviewOpen, setIsYamlPreviewOpen] = useState(false);

  // Carregar Template Canônico Homologado (Schema V3.0)
  const handleLoadCanonicalTemplate = () => {
    setSelectedPrefix("R");
    const nextRId = suggestNextArticleId(articles, "R");
    setRoutineId(nextRId);
    setTitle(CANONICAL_ROUTINE_EXAMPLE_METADATA.titulo);
    setObjective(CANONICAL_ROUTINE_EXAMPLE_METADATA.objetivo);
    setTags([...CANONICAL_ROUTINE_EXAMPLE_METADATA.tags]);
    setUserQuestions([...CANONICAL_ROUTINE_EXAMPLE_METADATA.perguntas_usuario]);
    setSintomasComuns([...CANONICAL_ROUTINE_EXAMPLE_METADATA.sintomas_comuns]);
    setSynonyms([...CANONICAL_ROUTINE_EXAMPLE_METADATA.sinonimos]);
    setStepByStepBody(CANONICAL_ROUTINE_BODY_TEMPLATE);
    setHasVideo(false);
    setVideoUrl("");
    setBunnyLibraryId("467408");
    setBunnyVideoId("");
    setVideoTitle("");
    setVideoTimestamp("00:00");
    setBunnyVideoInfo(null);
    setIsValidatingBunny(false);
    toast.success("Template Canônico (Schema V3) carregado!", {
      description: "Estrutura pré-formatada injetada com sucesso nos campos da rotina.",
    });
  };

  // Handler para troca de Prefixo (D, R, V, M, S)
  const handlePrefixChange = (newPrefixStr: string) => {
    const newPref = newPrefixStr as RoutinePrefix;
    setSelectedPrefix(newPref);

    const prefixConfig = ROUTINE_PREFIX_OPTIONS.find((p) => p.prefix === newPref);
    if (prefixConfig) {
      setSelectedSectionIndex(prefixConfig.sectionIndex);
    }

    // Se estiver em modo create ou se o ID atual ainda começar com o prefixo anterior, recalcula
    if (!isEditMode) {
      setRoutineId(suggestNextArticleId(articles, newPref));
    } else {
      // No modo edição, se trocar o prefixo, altera o prefixo inicial do ID mantendo o resto
      const currentRest = routineId.replace(/^[RVMDS]-/, "");
      setRoutineId(`${newPref}-${currentRest}`);
    }
  };

  // Handler para troca de URL de Vídeo da Bunny
  const handleVideoUrlChange = (inputVal: string) => {
    setVideoUrl(inputVal);

    if (!inputVal.trim()) {
      setBunnyVideoId("");
      setBunnyVideoInfo(null);
      return;
    }

    const extracted = extractBunnyVideoIdentifiers(inputVal, bunnyLibraryId || "467408");
    if (extracted.isValid && extracted.videoId) {
      setBunnyLibraryId(extracted.libraryId);
      setBunnyVideoId(extracted.videoId);
      if (extracted.timestamp && (!videoTimestamp || videoTimestamp === "00:00")) {
        setVideoTimestamp(extracted.timestamp);
      }
    }
  };

  // Consulta automática / Debounced na API da Bunny
  useEffect(() => {
    if (!hasVideo || !bunnyVideoId.trim()) {
      setBunnyVideoInfo(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsValidatingBunny(true);
      try {
        const info = await fetchBunnyVideoInfo(bunnyLibraryId, bunnyVideoId);
        setBunnyVideoInfo(info);
        if (info.title && !videoTitle) {
          setVideoTitle(info.title);
        }
      } catch {
        // Fallback silencioso
      } finally {
        setIsValidatingBunny(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [hasVideo, bunnyLibraryId, bunnyVideoId, videoTitle]);

  // Validação do ID
  const idValidation = useMemo(() => {
    if (!routineId.trim()) {
      return { isValid: false, message: "ID é obrigatório" };
    }
    // No modo edição, se for o próprio ID, é válido
    if (isEditMode && initialArticle && routineId.trim().toLowerCase() === initialArticle.id.trim().toLowerCase()) {
      return { isValid: true, message: "ID inalterado" };
    }

    const otherArticles = isEditMode && initialArticle
      ? articles.filter((a) => a.id.toLowerCase() !== initialArticle.id.toLowerCase())
      : articles;

    const check = validateArticleIdUniqueness(otherArticles, routineId);
    if (!check.isUnique) {
      return {
        isValid: false,
        message: `ID já existente (Conflito: ${check.conflictArticle?.titulo})`,
      };
    }
    return { isValid: true, message: "ID disponível" };
  }, [articles, routineId, isEditMode, initialArticle]);

  // Validação do Título
  const titleHasIdPrefix = useMemo(() => {
    return hasIdPrefixInTitle(title);
  }, [title]);

  const handleStripTitlePrefix = () => {
    setTitle(stripIdPrefixFromTitle(title));
  };

  // Validações dos campos estruturais
  const tagsValidation = useMemo(() => validateTags(tags), [tags]);
  const questionsValidation = useMemo(() => validatePerguntasUsuario(userQuestions), [userQuestions]);
  const sintomasValidation = useMemo(() => validateSintomasComuns(sintomasComuns), [sintomasComuns]);

  const videoCalculatedSeconds = useMemo(() => {
    return parseTimestampToSeconds(videoTimestamp);
  }, [videoTimestamp]);

  const videoValidation = useMemo(() => {
    return validateVideo(
      {
        tem_video: hasVideo,
        bunny_video_id: bunnyVideoId,
        video_timestamp: videoTimestamp,
        video_start_seconds: videoCalculatedSeconds,
      },
      hasVideo,
    );
  }, [hasVideo, bunnyVideoId, videoTimestamp, videoCalculatedSeconds]);

  const bodyValidation = useMemo(() => validateRoutineBody(stepByStepBody), [stepByStepBody]);

  // Checagem se o corpo contém delimitadores soltos de traço triplo (---)
  const bodyHasTripleDash = useMemo(() => {
    return /(?:^|\r?\n)\s*---+\s*(?:\r?\n|$)/.test(stepByStepBody);
  }, [stepByStepBody]);

  const handleSanitizeBodyDashes = () => {
    setStepByStepBody(sanitizeRoutineBody(stepByStepBody));
    toast.success("Traços triplos (---) substituídos por *** no corpo.");
  };

  // Auto-Preenchimento com IA a partir do Passo a Passo
  const handleGenerateWithAi = async () => {
    const effectiveBody = (isEditMode ? initialArticle?.body : null) || stepByStepBody;
    if (!effectiveBody.trim() || effectiveBody.trim().length < 15) {
      toast.warning(
        isEditMode
          ? "Rotina sem passo a passo suficiente"
          : "Preencha o Passo a Passo primeiro",
        {
          description: isEditMode
            ? "A rotina selecionada não possui instruções suficientes para a IA analisar os metadados."
            : "Escreva as instruções do procedimento para que a IA possa analisar e sugerir os metadados.",
        },
      );
      return;
    }

    setIsGeneratingAi(true);
    try {
      const result = await generateRoutineMetadataWithAi({
        bodyMarkdown: effectiveBody,
        articles,
        sections,
        preferredSectionIndex: selectedSectionIndex,
        preferredPrefix: selectedPrefix,
      });

      if (!isEditMode) {
        setRoutineId(result.id);
      }
      setTitle(result.titulo);
      setObjective(result.objetivo);
      setTags(result.tags);
      setUserQuestions(result.perguntas_usuario);
      setSintomasComuns(result.sintomas_comuns);
      setSynonyms(result.sinonimos);

      toast.success("Metadados gerados com IA!", {
        description: "Título, objetivo, tags, perguntas, sintomas e sinônimos foram preenchidos.",
      });
    } catch (err: any) {
      toast.error("Não foi possível gerar com IA", {
        description: err.message,
      });
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Funções de manipulação de tags
  const handleAddTag = () => {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    if (tags.length >= 7) {
      toast.warning("Limite de 7 tags atingido");
      return;
    }
    if (!tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Funções de manipulação de perguntas
  const handleAddQuestion = () => {
    const trimmed = newQuestionInput.trim();
    if (!trimmed) return;
    if (userQuestions.length >= 5) {
      toast.warning("Limite de 5 perguntas atingido");
      return;
    }
    if (!userQuestions.includes(trimmed)) {
      setUserQuestions([...userQuestions, trimmed]);
      setNewQuestionInput("");
    }
  };

  const handleRemoveQuestion = (qToRemove: string) => {
    setUserQuestions(userQuestions.filter((q) => q !== qToRemove));
  };

  // Funções de manipulação de sintomas comuns
  const handleAddSintoma = () => {
    const trimmed = newSintomaInput.trim();
    if (!trimmed) return;
    if (sintomasComuns.length >= 5) {
      toast.warning("Limite de 5 sintomas atingido");
      return;
    }
    if (trimmed.includes("?")) {
      toast.error("Sintomas não devem conter '?'", {
        description: "Dúvidas e perguntas devem ser adicionadas no campo 'Perguntas do Usuário'.",
      });
      return;
    }
    if (!sintomasComuns.includes(trimmed)) {
      setSintomasComuns([...sintomasComuns, trimmed]);
      setNewSintomaInput("");
    }
  };

  const handleRemoveSintoma = (sToRemove: string) => {
    setSintomasComuns(sintomasComuns.filter((s) => s !== sToRemove));
  };

  // Funções de manipulação de sinônimos
  const handleAddSynonym = () => {
    const trimmed = newSynonymInput.trim();
    if (!trimmed) return;
    if (!synonyms.includes(trimmed)) {
      setSynonyms([...synonyms, trimmed]);
      setNewSynonymInput("");
    }
  };

  const handleRemoveSynonym = (sToRemove: string) => {
    setSynonyms(synonyms.filter((s) => s !== sToRemove));
  };

  // Submissão do Formulário com Validação Estrita do Schema V3.0
  const handleSubmit = async () => {
    const cleanTitle = stripIdPrefixFromTitle(title);
    const cleanBody = isEditMode
      ? (initialArticle?.body || "")
      : sanitizeRoutineBody(stepByStepBody.trim());

    let videoData: BunnyVideoMetadata | undefined = undefined;
    if (hasVideo) {
      const cleanTimestamp = videoTimestamp.trim() || "00:00";
      const startSecs = videoCalculatedSeconds;
      const cleanLibId = bunnyLibraryId.trim() || "467408";
      const cleanVidId = bunnyVideoId.trim();
      const finalEmbedUrl =
        videoUrl.trim() ||
        (cleanLibId && cleanVidId
          ? `https://iframe.mediadelivery.net/embed/${cleanLibId}/${cleanVidId}?t=${startSecs}`
          : "");

      videoData = {
        tem_video: true,
        bunny_library_id: cleanLibId,
        bunny_video_id: cleanVidId,
        video_title: videoTitle.trim() || bunnyVideoInfo?.title || cleanTitle,
        video_url: finalEmbedUrl,
        video_timestamp: cleanTimestamp,
        video_start_seconds: startSecs,
      };
    } else {
      videoData = { tem_video: false };
    }

    const metadata: KnowledgeArticleMetadata = {
      id: routineId.trim().toUpperCase(),
      titulo: cleanTitle,
      objetivo: objective.trim(),
      tags,
      perguntas_usuario: userQuestions,
      sintomas_comuns: sintomasComuns,
      sinonimos: synonyms,
      video: videoData,
    };

    // 1. Validação Prévia Completa do Schema V3.0
    const schemaValidation = validateRoutineSchemaV3(
      metadata,
      cleanBody,
      articles,
      isEditMode ? initialArticle?.id : undefined,
    );

    if (!schemaValidation.isValid) {
      toast.error("Rotina fora do padrão canônico do Schema V3", {
        description: schemaValidation.errors[0] || "Corrija os campos obrigatórios antes de prosseguir.",
      });
      return;
    }

    // 2. Checagem de Unicidade Remota no Banco (assistant_knowledge_files)
    const dbCheck = await checkArticleIdUniquenessInDatabase(
      supabase,
      routineId,
      isEditMode ? initialArticle?.id : undefined,
    );
    if (!dbCheck.isUnique) {
      toast.error("ID já cadastrado na base de conhecimento", {
        description: `O identificador "${routineId}" já existe registrado na tabela assistant_knowledge_files. Escolha outro ID exclusivo.`,
      });
      return;
    }

    try {
      if (isEditMode && onUpdateRoutine && initialArticle) {
        await onUpdateRoutine({
          articleId: initialArticle.id,
          metadata,
          body: cleanBody,
          customSummary: `Atualizados metadados da rotina ${routineId.trim().toUpperCase()}: ${cleanTitle}`,
        });
      } else {
        await onCreateRoutine({
          metadata,
          body: cleanBody,
          sectionIndex: selectedSectionIndex,
          hasVideo,
          customSummary: `Cadastrada nova rotina ${routineId.trim().toUpperCase()}: ${cleanTitle}`,
        });
      }
      onClose();
    } catch {
      // Notificações já tratadas pelo hook
    }
  };

  const isBusy = isCreating || isUpdating;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && !isBusy && onClose()}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] max-w-4xl flex-col overflow-hidden border-border bg-background p-0 shadow-2xl sm:max-h-[92vh]">
        {/* ===================== HEADER ===================== */}
        <DialogHeader className="p-4 sm:p-5 border-b bg-muted/20 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                {isEditMode ? <Pencil className="h-5 w-5" /> : <PlusCircle className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm sm:text-base font-bold text-foreground truncate">
                  PAINEL DE GESTÃO DA BASE DE CONHECIMENTO — ORION TN
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground truncate">
                  {isEditMode
                    ? `Edição dos metadados da rotina ${initialArticle?.id}: ${initialArticle?.metadata?.titulo || initialArticle?.titulo} (o passo a passo continua sendo editado na tela principal)`
                    : "Cadastro e padronização estruturada de rotinas e tutoriais da base oficial"}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge variant="outline" className="font-mono text-xs bg-background hidden sm:inline-flex">
                {articles.length} rotinas
              </Badge>
              <Badge
                className={
                  isEditMode
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs"
                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs"
                }
              >
                {isEditMode ? "Edição de Metadados" : "Nova Rotina"}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* ===================== CORPO DO FORMULÁRIO COM SCROLL ===================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
          {/* Ações Rápidas: Template Canônico V3 & Preencher com IA */}
          <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-background p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                <Sparkles className="h-4 w-4 text-primary animate-pulse shrink-0" />
                <span>Criação Assistida & Padrão Canônico V3</span>
                <Badge variant="outline" className="text-[10px] border-primary/40 text-primary bg-primary/10">
                  Schema V3.0
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {isEditMode ? (
                  "Utilize os campos abaixo para editar metadados ou clique em preencher com IA para refinar os termos."
                ) : (
                  "Carregue o template oficial pré-formatado ou escreva o passo a passo para preencher os metadados automaticamente com IA."
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {!isEditMode && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleLoadCanonicalTemplate}
                  disabled={isBusy}
                  className="gap-1.5 text-xs h-9 font-semibold border-primary/30 hover:bg-primary/5"
                  title="Injeta a estrutura canônica homologada com placeholders pré-formatados"
                >
                  <FileCode className="h-4 w-4 text-primary" />
                  <span>Template Canônico V3</span>
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsYamlPreviewOpen(true)}
                disabled={isBusy}
                className="gap-1.5 text-xs h-9 font-semibold"
                title="Visualizar o YAML resultante estruturado"
              >
                <Code className="h-4 w-4 text-primary" />
                <span className="hidden sm:inline">Visualizar YAML</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleGenerateWithAi}
                disabled={isGeneratingAi || isBusy}
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md hover:shadow-lg transition-all text-xs h-9 px-3.5"
              >
                {isGeneratingAi ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analisando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Preencher com IA</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* ================= SEÇÃO A: IDENTIFICAÇÃO E TÍTULO ================= */}
          <div className="rounded-xl border bg-card p-4 space-y-4">
            <div className="border-b pb-2 text-foreground font-bold text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Tag className="h-4 w-4 text-primary" />
                1. Identificação, Título Oficial e Objetivo
              </span>
              <span className="text-[10px] text-muted-foreground font-normal">
                {selectedPrefix} — {ROUTINE_PREFIX_OPTIONS.find((p) => p.prefix === selectedPrefix)?.label.split("—")[1]}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
              {/* Prefixo: [ D ▼ ] */}
              <div className="md:col-span-4 space-y-1.5">
                <Label htmlFor="routine-prefix" className="font-semibold text-foreground text-[11px]">
                  Prefixo Oficial <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={selectedPrefix}
                  onValueChange={handlePrefixChange}
                  disabled={isBusy}
                >
                  <SelectTrigger id="routine-prefix" className="h-9 text-xs font-bold font-mono">
                    <SelectValue placeholder="Prefixo" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROUTINE_PREFIX_OPTIONS.map((opt) => (
                      <SelectItem key={opt.prefix} value={opt.prefix} className="text-xs">
                        <span className="font-mono font-bold mr-1.5">[{opt.prefix}]</span>
                        <span>{opt.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Identificador (ID): [ D-3.80 ] */}
              <div className="md:col-span-8 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="routine-id" className="font-semibold text-foreground text-[11px]">
                    Identificador (ID) Único <span className="text-destructive">*</span>
                  </Label>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-mono font-bold ${
                      idValidation.isValid
                        ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                        : "border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/10"
                    }`}
                  >
                    {idValidation.isValid ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> {idValidation.message}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {idValidation.message}
                      </span>
                    )}
                  </Badge>
                </div>
                <Input
                  id="routine-id"
                  value={routineId}
                  onChange={(e) => setRoutineId(e.target.value.toUpperCase().trim())}
                  placeholder="Ex: D-3.80"
                  className="font-mono text-xs font-bold h-9 uppercase"
                  disabled={isBusy}
                />
              </div>

              {/* Título Oficial (sem prefixo de ID) */}
              <div className="md:col-span-12 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="routine-title" className="font-semibold text-foreground text-[11px]">
                    Título Oficial da Rotina <span className="text-destructive">*</span>
                  </Label>
                  {titleHasIdPrefix && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleStripTitlePrefix}
                      className="h-6 text-[10px] text-amber-600 dark:text-amber-400 gap-1 px-1.5 hover:bg-amber-500/10"
                      title="Remover prefixo de ID do título"
                    >
                      <Eraser className="h-3 w-3" />
                      <span>Limpar Prefixo do Título</span>
                    </Button>
                  )}
                </div>
                <Input
                  id="routine-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Como Cadastrar Novo Cliente com IA"
                  className={`text-xs font-semibold h-9 ${
                    titleHasIdPrefix ? "border-amber-500 focus-visible:ring-amber-500" : ""
                  }`}
                  disabled={isBusy}
                />
                {titleHasIdPrefix ? (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    O título deve ser limpo e funcional, sem o código de ID (ex: apenas "Cadastrar Novo Cliente..."). Clique em "Limpar Prefixo".
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground">
                    Título funcional, limpo e sem código de ID (o ID já é gerenciado no campo acima).
                  </p>
                )}
              </div>

              {/* Objetivo da Rotina */}
              <div className="md:col-span-12 space-y-1.5">
                <Label htmlFor="routine-objective" className="font-semibold text-foreground text-[11px]">
                  Objetivo da Rotina (Frase Única e Densa) <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="routine-objective"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Ex: Cadastrar ficha do cliente no balcão de notas utilizando OCR e inteligência artificial para captura de dados..."
                  rows={2}
                  className="text-xs resize-none"
                  disabled={isBusy}
                />
              </div>
            </div>
          </div>

          {/* ================= SEÇÃO B: TAGS, PERGUNTAS E SINTOMAS DE DOR ================= */}
          <div className="rounded-xl border bg-card p-4 space-y-4">
            <div className="border-b pb-2 text-foreground font-bold text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-primary" />
                2. Categorização, Dúvidas e Sintomas de Dor (IA Search)
              </span>
            </div>

            {/* Tags (3 a 7) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-foreground text-[11px]">
                  Tags de Categorização <span className="text-destructive">*</span>
                </Label>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-mono ${
                    tagsValidation.isValid
                      ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                      : "border-amber-500/40 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {tags.length} / 7 (mínimo 3)
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border bg-background min-h-10">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-[11px] font-medium gap-1 py-0.5 px-2 bg-muted hover:bg-muted/80 text-foreground"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-muted-foreground hover:text-destructive"
                      disabled={isBusy}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <div className="flex items-center gap-1 flex-1 min-w-36">
                  <Input
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="+ Adicionar Tag..."
                    className="h-7 text-xs border-0 focus-visible:ring-0 p-1 bg-transparent"
                    disabled={isBusy || tags.length >= 7}
                  />
                  {newTagInput.trim() && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleAddTag}
                      className="h-6 px-1.5 text-[10px] text-primary"
                    >
                      Adicionar
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Perguntas do Usuário (3 a 5) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-foreground text-[11px] flex items-center gap-1">
                  <HelpCircle className="h-3.5 w-3.5 text-primary" />
                  Perguntas do Usuário (Dúvidas Completas) <span className="text-destructive">*</span>
                </Label>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-mono ${
                    questionsValidation.isValid
                      ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                      : "border-amber-500/40 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {userQuestions.length} / 5 (mínimo 3)
                </Badge>
              </div>

              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <Input
                    value={newQuestionInput}
                    onChange={(e) => setNewQuestionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddQuestion();
                      }
                    }}
                    placeholder="Ex: Como preencher o cartão de assinatura com IA?"
                    className="h-8 text-xs"
                    disabled={isBusy || userQuestions.length >= 5}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddQuestion}
                    className="h-8 text-xs shrink-0"
                    disabled={isBusy || userQuestions.length >= 5 || !newQuestionInput.trim()}
                  >
                    + Adicionar Pergunta
                  </Button>
                </div>

                {userQuestions.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {userQuestions.map((q, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 p-1.5 px-2.5 rounded-lg border bg-background text-[11px]"
                      >
                        <span className="font-mono text-muted-foreground font-semibold">{idx + 1}.</span>
                        <span className="flex-1 text-foreground break-words">"{q}"</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(q)}
                          className="text-muted-foreground hover:text-destructive shrink-0"
                          disabled={isBusy}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ⭐ Sintomas Comuns de Dor (3 a 5 - Novo Campo Obrigatório) */}
            <div className="space-y-2 pt-1 border-t border-border/50">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="font-semibold text-foreground text-[11px] flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                    <Stethoscope className="h-3.5 w-3.5 text-amber-500" />
                    ⭐ Sintomas Comuns de Dor (O que o escrevente reclama) <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-[10px] text-muted-foreground">
                    Termos curtos de dor/busca (ex: "tela travada em cinza", "leitura de documento falhou"). <strong>Sem ponto de interrogação (?)</strong>.
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-mono ${
                    sintomasValidation.isValid
                      ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                      : "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                  }`}
                >
                  {sintomasComuns.length} / 5 (mínimo 3)
                </Badge>
              </div>

              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <Input
                    value={newSintomaInput}
                    onChange={(e) => setNewSintomaInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSintoma();
                      }
                    }}
                    placeholder="Ex: não consigo digitar no cartão"
                    className="h-8 text-xs border-amber-500/40 focus-visible:ring-amber-500"
                    disabled={isBusy || sintomasComuns.length >= 5}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddSintoma}
                    className="h-8 text-xs shrink-0 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                    disabled={isBusy || sintomasComuns.length >= 5 || !newSintomaInput.trim()}
                  >
                    + Adicionar Sintoma
                  </Button>
                </div>

                {sintomasComuns.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {sintomasComuns.map((s, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 p-1.5 px-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-[11px]"
                      >
                        <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{idx + 1}.</span>
                        <span className="flex-1 text-foreground font-medium break-words">"{s}"</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSintoma(s)}
                          className="text-muted-foreground hover:text-destructive shrink-0"
                          disabled={isBusy}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sinônimos e Jargões Alternativos */}
            <div className="space-y-2 pt-1 border-t border-border/50">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-foreground text-[11px] flex items-center gap-1">
                  <Search className="h-3.5 w-3.5 text-primary" />
                  Sinônimos e Jargões Alternativos
                </Label>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {synonyms.length} termos
                </Badge>
              </div>

              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <Input
                    value={newSynonymInput}
                    onChange={(e) => setNewSynonymInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSynonym();
                      }
                    }}
                    placeholder="Ex: cadastro com ocr, ficha de firma, autógrafo..."
                    className="h-8 text-xs"
                    disabled={isBusy}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddSynonym}
                    className="h-8 text-xs shrink-0"
                    disabled={isBusy || !newSynonymInput.trim()}
                  >
                    + Adicionar Sinônimo
                  </Button>
                </div>

                {synonyms.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {synonyms.map((s, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="text-[11px] gap-1 py-0.5 px-2 text-foreground"
                      >
                        <span>{s}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSynonym(s)}
                          className="text-muted-foreground hover:text-destructive"
                          disabled={isBusy}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ================= SEÇÃO C: VÍDEO TUTORIAL (BUNNY.NET) ================= */}
          <div className="rounded-xl border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-primary" />
                <span className="font-bold text-foreground text-xs">
                  3. Vídeo Tutorial (Bunny.net Stream)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="toggle-has-video" className="text-xs text-muted-foreground cursor-pointer font-medium">
                  {hasVideo ? "Possui videoaula gravada demonstrando a tela" : "Sem gravação de tela"}
                </Label>
                <Switch
                  id="toggle-has-video"
                  checked={hasVideo}
                  onCheckedChange={setHasVideo}
                  disabled={isBusy}
                />
              </div>
            </div>

            {hasVideo ? (
              <div className="space-y-4 pt-2 border-t border-border/50 animate-in fade-in-50 duration-200">
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    <strong>Regra Obrigatória:</strong> Apenas marque vídeo se houver gravação demonstrando especificamente esta rotina em execução na tela do Orion TN. Se for apenas áudio ou assunto genérico, mantenha desligado.
                  </span>
                </div>

                {/* URL do Direct Play da Bunny */}
                <div className="space-y-1.5 p-3 rounded-xl border border-primary/30 bg-primary/5">
                  <Label htmlFor="video-url" className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <Link2 className="h-3.5 w-3.5 text-primary" />
                    URL do Vídeo (Cole a URL do Direct Play para extrair GUID e Minutagem)
                  </Label>
                  <Input
                    id="video-url"
                    value={videoUrl}
                    onChange={(e) => handleVideoUrlChange(e.target.value)}
                    placeholder="https://iframe.mediadelivery.net/play/467408/8b0225b8-ab00-44a2-a03e-5a3cb3f07f99"
                    className="h-8 text-xs font-mono bg-background"
                    disabled={isBusy}
                  />
                </div>

                {/* Verificação em andamento */}
                {isValidatingBunny && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg border border-primary/30 bg-primary/5 text-xs text-primary font-medium">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Conectando à API da Bunny.net...</span>
                  </div>
                )}

                {/* Card de Vinculação com Capa */}
                {!isValidatingBunny && bunnyVideoId.trim() && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 flex flex-col sm:flex-row gap-3 items-center">
                    <div className="relative w-36 aspect-video rounded-lg overflow-hidden bg-black shrink-0 border border-emerald-500/40 flex items-center justify-center">
                      {bunnyVideoInfo?.thumbnailUrl ? (
                        <img
                          src={bunnyVideoInfo.thumbnailUrl}
                          alt={videoTitle || "Capa do Vídeo Bunny"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Video className="h-6 w-6 text-muted-foreground" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                        <div className="h-7 w-7 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md">
                          <Play className="h-3.5 w-3.5 fill-white ml-0.5" />
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 space-y-1 text-xs w-full min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge className="bg-emerald-600 text-white text-[9px] gap-1">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Vinculado com Sucesso
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          Início: {videoTimestamp || "00:00"} ({videoCalculatedSeconds}s)
                        </Badge>
                      </div>
                      <div className="font-bold text-foreground truncate text-xs">
                        {videoTitle || bunnyVideoInfo?.title || title || "Vídeo Tutorial Orion TN"}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono truncate">
                        GUID: {bunnyVideoId} | Library: {bunnyLibraryId}
                      </div>
                    </div>
                  </div>
                )}

                {/* Campos do Vídeo */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
                  {/* GUID do Vídeo */}
                  <div className="md:col-span-5 space-y-1">
                    <Label htmlFor="bunny-video-id" className="font-semibold text-[11px] text-foreground">
                      GUID do Vídeo (bunny_video_id) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="bunny-video-id"
                      value={bunnyVideoId}
                      onChange={(e) => setBunnyVideoId(e.target.value)}
                      placeholder="8b0225b8-ab00-44a2-a03e-5a3cb3f07f99"
                      className="h-8 text-xs font-mono"
                      disabled={isBusy}
                    />
                  </div>

                  {/* Título do Vídeo */}
                  <div className="md:col-span-4 space-y-1">
                    <Label htmlFor="bunny-video-title" className="font-semibold text-[11px] text-foreground">
                      Título do Vídeo
                    </Label>
                    <Input
                      id="bunny-video-title"
                      value={videoTitle}
                      onChange={(e) => setVideoTitle(e.target.value)}
                      placeholder="Cadastro Cartão de Assinatura pt 1 - Orion TN"
                      className="h-8 text-xs"
                      disabled={isBusy}
                    />
                  </div>

                  {/* Minutagem de Início */}
                  <div className="md:col-span-3 space-y-1">
                    <Label htmlFor="video-timestamp" className="font-semibold text-[11px] text-foreground flex items-center justify-between">
                      <span>Início (MM:SS) <span className="text-destructive">*</span></span>
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                        {videoCalculatedSeconds}s
                      </span>
                    </Label>
                    <Input
                      id="video-timestamp"
                      value={videoTimestamp}
                      onChange={(e) => setVideoTimestamp(e.target.value)}
                      placeholder="00:18"
                      className="h-8 text-xs font-mono"
                      disabled={isBusy}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1 border-t border-border/50">
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                Esta rotina será gravada com <code className="font-mono text-[10px] bg-muted px-1 py-0.5 rounded">video: tem_video: false</code> no YAML.
              </p>
            )}
          </div>

          {/* ================= SEÇÃO D: CORPO DA ROTINA (MARKDOWN FORMATADO) - APENAS MODO CRIAÇÃO ================= */}
          {!isEditMode && (
          <div className="rounded-xl border border-primary/20 bg-card p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary" />
                  4. Corpo da Rotina (Markdown Formatado) <span className="text-destructive">*</span>
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  Deve iniciar com <code>#### Descrição:</code> e conter <code>#### Passo a passo:</code>.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {bodyHasTripleDash && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSanitizeBodyDashes}
                    className="h-6 text-[10px] text-destructive border-destructive/40 gap-1 bg-destructive/5 hover:bg-destructive/10"
                    title="Substituir '---' por '***'"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    <span>Corrigir Traços '---'</span>
                  </Button>
                )}
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    bodyValidation.isValid
                      ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                      : "border-amber-500/40 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {bodyValidation.isValid ? "Formato Válido" : "Requer Atenção"}
                </Badge>
              </div>
            </div>

            {bodyHasTripleDash && (
              <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-[11px] text-destructive flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Traços triplos isolados (---) não são permitidos dentro do corpo pois quebram a separação dos artigos.
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleSanitizeBodyDashes}
                  className="h-6 text-[10px] shrink-0"
                >
                  Substituir por ***
                </Button>
              </div>
            )}

            <div className="rounded-lg border bg-background overflow-hidden">
              <MarkdownTiptapEditor
                value={stepByStepBody}
                onChange={setStepByStepBody}
                disabled={isBusy}
              />
            </div>
          </div>
          )}
        </div>

        {/* ===================== FOOTER ===================== */}
        <DialogFooter className="p-3.5 sm:p-4 border-t bg-muted/20 shrink-0 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isBusy}
            className="text-xs"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={isBusy}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md"
          >
            {isBusy ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {isEditMode ? "Salvando Alterações..." : "Cadastrando e Publicando..."}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {isEditMode ? "Salvar Metadados" : "Salvar Rotina"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Dialog Secundário: Visualização do YAML Canônico (Schema V3.0) */}
    <Dialog open={isYamlPreviewOpen} onOpenChange={setIsYamlPreviewOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden border-border bg-background shadow-2xl">
        <DialogHeader className="p-4 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Code className="h-4 w-4 text-primary" />
              Estrutura YAML Canônica — Schema V3.0
            </DialogTitle>
            <Badge variant="outline" className="font-mono text-xs">
              {routineId.trim().toUpperCase() || "NOVA-ROTINA"}
            </Badge>
          </div>
          <DialogDescription className="text-xs">
            Pré-visualização da formatação serializada conforme os padrões homologados para a OpenAI Vector Store.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 bg-muted/30 font-mono text-[11px] leading-relaxed select-all">
          <pre className="p-3.5 rounded-lg bg-background border whitespace-pre-wrap">
{`---
id: ${routineId.trim().toUpperCase() || "[PREFIXO]-[ID]"}
titulo: "${stripIdPrefixFromTitle(title) || "Título da Rotina"}"
tags:
${tags.map((t) => `  - ${t}`).join("\n") || "  - [tag 1]\n  - [tag 2]\n  - [tag 3]"}
objetivo: "${objective.trim() || "Descrição em 1 a 2 linhas iniciada por verbo no infinitivo"}"
sinonimos:
${synonyms.map((s) => `  - ${s}`).join("\n") || "  - [termo alternativo 1]"}
perguntas_usuario:
${userQuestions.map((q) => `  - "${q}"`).join("\n") || '  - "Como faço para cadastrar X?"'}
sintomas_comuns:
${sintomasComuns.map((s) => `  - "${s}"`).join("\n") || '  - "tela travada em cinza"'}
video:
  tem_video: ${hasVideo ? "true" : "false"}
${hasVideo ? `  bunny_library_id: "${bunnyLibraryId.trim() || "467408"}"
  bunny_video_id: "${bunnyVideoId.trim() || "GUID"}"
  video_title: "${videoTitle.trim() || stripIdPrefixFromTitle(title)}"
  video_url: "${videoUrl.trim() || `https://iframe.mediadelivery.net/embed/${bunnyLibraryId.trim() || "467408"}/${bunnyVideoId.trim() || "GUID"}?t=${videoCalculatedSeconds}`}"
  video_timestamp: "${videoTimestamp.trim() || "00:00"}"
  video_start_seconds: ${videoCalculatedSeconds}` : ""}
---
${stepByStepBody || CANONICAL_ROUTINE_BODY_TEMPLATE}`}
          </pre>
        </div>

        <DialogFooter className="p-3 border-t bg-muted/20 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const fullText = `---
id: ${routineId.trim().toUpperCase() || "[PREFIXO]-[ID]"}
titulo: "${stripIdPrefixFromTitle(title) || "Título da Rotina"}"
tags:
${tags.map((t) => `  - ${t}`).join("\n")}
objetivo: "${objective.trim()}"
sinonimos:
${synonyms.map((s) => `  - ${s}`).join("\n")}
perguntas_usuario:
${userQuestions.map((q) => `  - "${q}"`).join("\n")}
sintomas_comuns:
${sintomasComuns.map((s) => `  - "${s}"`).join("\n")}
video:
  tem_video: ${hasVideo ? "true" : "false"}
---
${stepByStepBody}`;
              navigator.clipboard.writeText(fullText);
              toast.success("Estrutura copiada para a área de transferência!");
            }}
            className="text-xs gap-1.5"
          >
            <Copy className="h-3.5 w-3.5" />
            Copiar YAML
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setIsYamlPreviewOpen(false)}
            className="text-xs"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
