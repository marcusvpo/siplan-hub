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
} from "lucide-react";
import { toast } from "sonner";
import { MarkdownTiptapEditor } from "./MarkdownTiptapEditor";
import {
  suggestNextArticleId,
  validateArticleIdUniqueness,
  parseTimestampToSeconds,
  SIPLAN_HUB_SECTION_INDEX,
  SIPLAN_HUB_SECTION_TITLE,
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
}

export function CreateRoutineModal({
  isOpen,
  onClose,
  articles,
  sections,
  onCreateRoutine,
  isCreating,
}: CreateRoutineModalProps) {
  // 1. Estados dos Campos Principais
  const [stepByStepBody, setStepByStepBody] = useState("");
  const [routineId, setRoutineId] = useState("");
  const [title, setTitle] = useState("");
  const [selectedSectionIndex, setSelectedSectionIndex] = useState<number>(SIPLAN_HUB_SECTION_INDEX);
  const [objective, setObjective] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [userQuestions, setUserQuestions] = useState<string[]>([]);
  const [newQuestionInput, setNewQuestionInput] = useState("");
  const [synonyms, setSynonyms] = useState<string[]>([]);
  const [newSynonymInput, setNewSynonymInput] = useState("");

  // Vídeo Bunny.net (Foco Principal: URL Direct Play)
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
    if (isOpen) {
      setSelectedSectionIndex(SIPLAN_HUB_SECTION_INDEX);
      setRoutineId(suggestNextArticleId(articles, SIPLAN_HUB_SECTION_INDEX));
      setStepByStepBody("");
      setTitle("");
      setObjective("");
      setTags([]);
      setUserQuestions([]);
      setSynonyms([]);
      setHasVideo(false);
      setVideoUrl("");
      setBunnyLibraryId("467408");
      setBunnyVideoId("");
      setVideoTitle("");
      setVideoTimestamp("00:00");
      setBunnyVideoInfo(null);
      setIsValidatingBunny(false);
    }
  }, [isOpen, sections, articles]);

  // Handler Principal para a URL do Vídeo (Extração Automática dos Outros Campos)
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

  // Consulta automática / Debounced na API da Bunny ao preencher a URL ou ID do Vídeo
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
        if (info.title) {
          setVideoTitle(info.title);
        }
      } catch {
        // Fallback silencioso
      } finally {
        setIsValidatingBunny(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [hasVideo, bunnyLibraryId, bunnyVideoId]);

  // 2. Validação de ID Único em tempo real
  const idValidation = useMemo(() => {
    if (!routineId.trim()) {
      return { isValid: false, message: "ID é obrigatório" };
    }
    const check = validateArticleIdUniqueness(articles, routineId);
    if (!check.isUnique) {
      return {
        isValid: false,
        message: `ID já existente (Conflito: ${check.conflictArticle?.titulo})`,
      };
    }
    return { isValid: true, message: "ID disponível" };
  }, [articles, routineId]);

  // Atualizar sugestão de ID se o usuário mudar a seção e o ID ainda for o gerado
  const handleSectionChange = (newSecIndexStr: string) => {
    const secIdx = parseInt(newSecIndexStr, 10);
    setSelectedSectionIndex(secIdx);
    setRoutineId(suggestNextArticleId(articles, secIdx));
  };

  // 3. Auto-Preenchimento com IA a partir do Passo a Passo
  const handleGenerateWithAi = async () => {
    if (!stepByStepBody.trim() || stepByStepBody.trim().length < 15) {
      toast.warning("Preencha o Passo a Passo primeiro", {
        description: "Escreva as instruções do procedimento na Seção 1 para que a IA possa analisar e preencher automaticamente todos os metadados técnicos.",
      });
      return;
    }

    setIsGeneratingAi(true);
    try {
      const result = await generateRoutineMetadataWithAi({
        bodyMarkdown: stepByStepBody,
        articles,
        sections,
        preferredSectionIndex: selectedSectionIndex,
      });

      setRoutineId(result.id);
      setTitle(result.titulo);
      if (result.sectionIndex) {
        setSelectedSectionIndex(result.sectionIndex);
      }
      setObjective(result.objetivo);
      setTags(result.tags);
      setUserQuestions(result.perguntas_usuario);
      setSynonyms(result.sinonimos);

      toast.success("Metadados gerados pela IA com sucesso!", {
        description: "Todos os campos técnicos foram preenchidos com base no seu passo a passo.",
      });
    } catch (err: any) {
      toast.error("Não foi possível gerar com IA", {
        description: err.message,
      });
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Funções de manipulação de tags com casing natural
  const handleAddTag = () => {
    const trimmed = newTagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
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
    if (trimmed && !userQuestions.includes(trimmed)) {
      setUserQuestions([...userQuestions, trimmed]);
      setNewQuestionInput("");
    }
  };

  const handleRemoveQuestion = (qToRemove: string) => {
    setUserQuestions(userQuestions.filter((q) => q !== qToRemove));
  };

  // Funções de manipulação de sinônimos
  const handleAddSynonym = () => {
    const trimmed = newSynonymInput.trim();
    if (trimmed && !synonyms.includes(trimmed)) {
      setSynonyms([...synonyms, trimmed]);
      setNewSynonymInput("");
    }
  };

  const handleRemoveSynonym = (sToRemove: string) => {
    setSynonyms(synonyms.filter((s) => s !== sToRemove));
  };

  // 4. Submissão do Formulário
  const handleSubmit = async () => {
    if (!stepByStepBody.trim()) {
      toast.error("Passo a Passo Obrigatório", {
        description: "Escreva o procedimento da rotina na Seção 1.",
      });
      return;
    }

    if (!idValidation.isValid) {
      toast.error("ID Inválido ou Duplicado", {
        description: "Por favor, informe um ID único para a rotina.",
      });
      return;
    }

    if (!title.trim()) {
      toast.error("Título Obrigatório", {
        description: "Informe o título da rotina ou clique em 'Preencher Metadados com IA'.",
      });
      return;
    }

    if (!objective.trim()) {
      toast.error("Objetivo Obrigatório", {
        description: "Informe o objetivo da rotina ou use o botão 'Preencher Metadados com IA'.",
      });
      return;
    }

    if (tags.length === 0) {
      toast.error("Tags Obrigatórias", {
        description: "Adicione ao menos uma tag ou use 'Preencher Metadados com IA'.",
      });
      return;
    }

    if (userQuestions.length === 0) {
      toast.error("Perguntas de Usuário Obrigatórias", {
        description: "Adicione perguntas típicas ou use 'Preencher Metadados com IA'.",
      });
      return;
    }

    if (synonyms.length === 0) {
      toast.error("Sinônimos Obrigatórios", {
        description: "Adicione ao menos um sinônimo ou use 'Preencher Metadados com IA'.",
      });
      return;
    }

    let videoData: BunnyVideoMetadata | undefined = undefined;
    if (hasVideo) {
      const cleanTimestamp = videoTimestamp.trim() || "00:00";
      const startSecs = parseTimestampToSeconds(cleanTimestamp);
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
        video_title: videoTitle.trim() || bunnyVideoInfo?.title || title.trim(),
        video_url: finalEmbedUrl,
        video_timestamp: cleanTimestamp,
        video_start_seconds: startSecs,
      };
    }

    const metadata: KnowledgeArticleMetadata = {
      id: routineId.trim().toUpperCase(),
      titulo: title.trim(),
      objetivo: objective.trim(),
      tags,
      perguntas_usuario: userQuestions,
      sinonimos: synonyms,
      video: videoData,
    };

    try {
      await onCreateRoutine({
        metadata,
        body: stepByStepBody.trim(),
        sectionIndex: selectedSectionIndex,
        hasVideo,
        customSummary: `Cadastrada nova rotina ${routineId.trim().toUpperCase()}: ${title.trim()}`,
      });
      onClose();
    } catch {
      // Notificações já tratadas pelo hook
    }
  };

  const isFormIncomplete =
    !stepByStepBody.trim() ||
    !idValidation.isValid ||
    !title.trim() ||
    !objective.trim() ||
    tags.length === 0 ||
    userQuestions.length === 0 ||
    synonyms.length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isCreating && onClose()}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] max-w-4xl flex-col overflow-hidden border-border bg-background p-0 shadow-2xl sm:max-h-[90vh]">
        {/* Header Fixo */}
        <DialogHeader className="p-5 border-b bg-muted/20 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <PlusCircle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Cadastrar Nova Rotina Orion TN
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Preencha o passo a passo na Seção 1 e use o botão da IA na Seção 2 para gerar os metadados automaticamente.
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="font-mono text-xs bg-background">
              {articles.length} rotinas cadastradas
            </Badge>
          </div>
        </DialogHeader>

        {/* Corpo com Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* ================= SEÇÃO 1: PASSO A PASSO (FOCO PRINCIPAL DO USUÁRIO) ================= */}
          <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4.5">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-primary" />
                1. Passo a Passo do Procedimento (Corpo da Rotina)
                <span className="text-destructive">*</span>
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Escreva detalhadamente o passo a passo que o cliente ou atendente do cartório deve executar.
              </p>
            </div>

            <div className="rounded-lg border bg-background overflow-hidden">
              <MarkdownTiptapEditor
                value={stepByStepBody}
                onChange={setStepByStepBody}
                disabled={isCreating}
              />
            </div>
          </div>

          {/* ================= SEÇÃO 2: METADADOS E CLASSIFICAÇÃO ================= */}
          <div className="space-y-4 rounded-xl border bg-card p-4.5">
            <div className="flex items-center justify-between border-b pb-2 text-foreground font-bold text-xs">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                <span>2. Metadados & Classificação Técnica</span>
              </div>
              <span className="text-[11px] text-muted-foreground font-normal">
                Preenchimento automático recomendado
              </span>
            </div>

            {/* Banner de Destaque: Botão Preencher com IA (Primeira Opção antes dos campos) */}
            <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-background p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                  <span>Auto-Preenchimento Inteligente</span>
                  <Badge variant="outline" className="text-[10px] border-primary/40 text-primary bg-primary/10">
                    Recomendado
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  A IA analisará o <strong>Passo a Passo</strong> preenchido acima e preencherá automaticamente todos os metadados (ID, Título, Objetivo, Tags, Perguntas e Sinônimos).
                </p>
              </div>

              <Button
                type="button"
                size="default"
                onClick={handleGenerateWithAi}
                disabled={isGeneratingAi || isCreating}
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md hover:shadow-lg transition-all text-xs h-10 px-5 shrink-0"
              >
                {isGeneratingAi ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analisando Passo a Passo...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Preencher Metadados com IA</span>
                  </>
                )}
              </Button>
            </div>

            {/* Grid com os Campos de Metadados Técnicos */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-1">
              {/* ID com Validação em Tempo Real */}
              <div className="md:col-span-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="routine-id" className="font-semibold text-foreground">
                    ID da Rotina <span className="text-destructive">*</span>
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
                        <CheckCircle2 className="h-3 w-3" /> Disponível
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Duplicado
                      </span>
                    )}
                  </Badge>
                </div>
                <Input
                  id="routine-id"
                  value={routineId}
                  onChange={(e) => setRoutineId(e.target.value.toUpperCase().trim())}
                  placeholder="Ex: S-5.1"
                  className="font-mono text-xs font-bold h-9 uppercase"
                  disabled={isCreating}
                />
                {!idValidation.isValid && (
                  <p className="text-[10px] text-destructive font-medium">
                    {idValidation.message}
                  </p>
                )}
              </div>

              {/* Seção Principal */}
              <div className="md:col-span-8 space-y-1.5">
                <Label htmlFor="section-select" className="font-semibold text-foreground">
                  Seção do Documento <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={selectedSectionIndex.toString()}
                  onValueChange={handleSectionChange}
                  disabled={isCreating}
                >
                  <SelectTrigger id="section-select" className="h-9 text-xs font-medium">
                    <SelectValue placeholder="Selecione a Seção" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((sec) => (
                      <SelectItem key={sec.index} value={sec.index.toString()} className="text-xs">
                        {sec.title} ({sec.articleIds.length} rotinas)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Título da Rotina */}
              <div className="md:col-span-12 space-y-1.5">
                <Label htmlFor="routine-title" className="font-semibold text-foreground">
                  Título da Rotina <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="routine-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Como Realizar o Gerenciamento de Orçamentos no Orion TN"
                  className="text-xs font-semibold h-9"
                  disabled={isCreating}
                />
              </div>

              {/* Objetivo / Resumo */}
              <div className="md:col-span-12 space-y-1.5">
                <Label htmlFor="routine-objective" className="font-semibold text-foreground">
                  Objetivo / Resumo Operacional <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="routine-objective"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Ex: Orientar o usuário no processo de consulta e cancelamento de orçamentos..."
                  rows={2}
                  className="text-xs resize-none"
                  disabled={isCreating}
                />
              </div>
            </div>

            {/* Tags Interativas */}
            <div className="space-y-2 pt-2">
              <Label className="font-semibold text-foreground flex items-center justify-between">
                <span>
                  Tags de Indexação <span className="text-destructive">*</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  Pressione Enter para adicionar
                </span>
              </Label>
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
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Input
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Adicionar tag..."
                  className="h-7 w-32 text-xs border-0 focus-visible:ring-0 p-1 bg-transparent"
                  disabled={isCreating}
                />
              </div>
            </div>

            {/* Perguntas Frequentes do Usuário */}
            <div className="space-y-2 pt-2">
              <Label className="font-semibold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-primary" />
                  Perguntas Típicas do Usuário <span className="text-destructive">*</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  Pressione Enter para adicionar
                </span>
              </Label>
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
                    placeholder="Ex: Como gerenciar orçamentos em aberto no Orion TN?"
                    className="h-8 text-xs"
                    disabled={isCreating}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddQuestion}
                    className="h-8 text-xs shrink-0"
                  >
                    Adicionar
                  </Button>
                </div>
                {userQuestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {userQuestions.map((q, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="text-[11px] gap-1.5 py-1 px-2.5 bg-background text-foreground"
                      >
                        <span>{q}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(q)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sinônimos */}
            <div className="space-y-2 pt-2">
              <Label className="font-semibold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5 text-primary" />
                  Sinônimos e Palavras-Chave de Busca <span className="text-destructive">*</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  Pressione Enter para adicionar
                </span>
              </Label>
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
                    placeholder="Ex: cotação, orçamento cancelado, desistência..."
                    className="h-8 text-xs"
                    disabled={isCreating}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddSynonym}
                    className="h-8 text-xs shrink-0"
                  >
                    Adicionar
                  </Button>
                </div>
                {synonyms.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {synonyms.map((s, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="text-[11px] gap-1.5 py-0.5 px-2 text-foreground"
                      >
                        <span>{s}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSynonym(s)}
                          className="text-muted-foreground hover:text-destructive"
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

          {/* ================= SEÇÃO 3: VÍDEO BUNNY.NET (FOCO NA URL DO DIRECT PLAY) ================= */}
          <div className="space-y-4 rounded-xl border bg-card p-4.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-primary" />
                <span className="font-bold text-foreground text-xs">
                  3. Vídeo Tutorial (Bunny.net - Opcional)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="toggle-has-video" className="text-xs text-muted-foreground cursor-pointer">
                  {hasVideo ? "Rotina com Vídeo" : "Sem Vídeo"}
                </Label>
                <Switch
                  id="toggle-has-video"
                  checked={hasVideo}
                  onCheckedChange={setHasVideo}
                  disabled={isCreating}
                />
              </div>
            </div>

            {hasVideo ? (
              <div className="space-y-4 pt-2 border-t border-border/50 animate-in fade-in-50 duration-200">
                {/* CAMPO PRINCIPAL (FOCO): URL DO DIRECT PLAY DA BUNNY */}
                <div className="space-y-1.5 p-3.5 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-background">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <Label htmlFor="video-url" className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5 text-primary" />
                      URL do Vídeo no Bunny.net (Direct Play ou Embed)
                      <span className="text-destructive">*</span>
                    </Label>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      Cole a URL do Direct Play para extrair todos os dados automaticamente
                    </span>
                  </div>
                  <Input
                    id="video-url"
                    value={videoUrl}
                    onChange={(e) => handleVideoUrlChange(e.target.value)}
                    placeholder="https://iframe.mediadelivery.net/play/467408/dd1681df-2c50-4b21-8ca9-e175ee298621"
                    className="h-9 text-xs font-mono bg-background border-primary/40 focus-visible:ring-primary shadow-xs"
                    disabled={isCreating}
                  />
                </div>

                {/* Status de Verificação em Andamento */}
                {isValidatingBunny && (
                  <div className="flex items-center gap-2 p-3 rounded-lg border border-primary/30 bg-primary/5 text-xs text-primary font-medium">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Conectando à API da Bunny.net e sincronizando dados do vídeo...</span>
                  </div>
                )}

                {/* CARD DE VINCULAÇÃO COM SUCESSO & FOTO DE CAPA */}
                {!isValidatingBunny && bunnyVideoId.trim() && (
                  <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-background p-4 flex flex-col sm:flex-row gap-4 items-center shadow-xs animate-in fade-in-50 duration-200">
                    {/* Foto de Capa (Thumbnail do Vídeo na Bunny) */}
                    <div className="relative w-40 sm:w-48 aspect-video rounded-lg overflow-hidden bg-black/90 border border-emerald-500/40 shrink-0 shadow-md flex items-center justify-center">
                      {bunnyVideoInfo?.thumbnailUrl ? (
                        <img
                          src={bunnyVideoInfo.thumbnailUrl}
                          alt={videoTitle || bunnyVideoInfo?.title || title || "Capa do Vídeo Bunny"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted/30 text-muted-foreground">
                          <Video className="h-8 w-8 text-muted-foreground/60" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                        <div className="h-9 w-9 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-lg">
                          <Play className="h-4 w-4 fill-white ml-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* Metadados e Confirmação de Vinculação */}
                    <div className="flex-1 space-y-1.5 min-w-0 text-xs w-full">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-bold text-[10px] gap-1 shadow-xs">
                          <CheckCircle2 className="h-3 w-3" />
                          Vídeo Vinculado com Sucesso via Bunny.net
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-mono border-border bg-background">
                          <Clock className="h-2.5 w-2.5 mr-1 text-primary" />
                          Início: {videoTimestamp || "00:00"}
                        </Badge>
                        {bunnyVideoInfo?.formattedTimestamp && bunnyVideoInfo.formattedTimestamp !== "00:00" && (
                          <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                            Duração total: {bunnyVideoInfo.formattedTimestamp}
                          </Badge>
                        )}
                      </div>

                      <div className="font-bold text-foreground truncate text-sm">
                        {videoTitle || bunnyVideoInfo?.title || title || "Vídeo Tutorial Orion TN"}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground font-mono pt-1">
                        <span className="truncate">
                          <strong className="text-foreground">GUID:</strong> {bunnyVideoId}
                        </span>
                        <span>
                          <strong className="text-foreground">Library ID:</strong> {bunnyLibraryId}
                        </span>
                      </div>

                      {videoUrl && (
                        <div className="pt-1">
                          <a
                            href={videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold"
                          >
                            <span>Testar link no player da Bunny</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Campos Preenchidos Automaticamente a partir da URL */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 pt-1">
                  {/* Título do Vídeo (Auto-Preenchido via Bunny) */}
                  <div className="md:col-span-12 space-y-1">
                    <Label htmlFor="bunny-video-title" className="font-semibold text-[11px] text-muted-foreground flex items-center justify-between">
                      <span>Título do Vídeo Tutorial</span>
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">Sincronizado da Bunny</span>
                    </Label>
                    <Input
                      id="bunny-video-title"
                      value={videoTitle}
                      onChange={(e) => setVideoTitle(e.target.value)}
                      placeholder="Título oficial do vídeo no Bunny.net"
                      className="h-8 text-xs font-semibold bg-background"
                      disabled={isCreating}
                    />
                  </div>

                  {/* Bunny Library ID */}
                  <div className="md:col-span-4 space-y-1">
                    <Label htmlFor="bunny-lib-id" className="font-semibold text-[11px] text-muted-foreground flex items-center justify-between">
                      <span>Bunny Library ID</span>
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">Automático</span>
                    </Label>
                    <Input
                      id="bunny-lib-id"
                      value={bunnyLibraryId}
                      onChange={(e) => setBunnyLibraryId(e.target.value)}
                      placeholder="467408"
                      className="h-8 text-xs font-mono bg-muted/30"
                      disabled={isCreating}
                    />
                  </div>

                  {/* Bunny Video ID (GUID) */}
                  <div className="md:col-span-4 space-y-1">
                    <Label htmlFor="bunny-video-id" className="font-semibold text-[11px] text-muted-foreground flex items-center justify-between">
                      <span>Bunny Video ID (GUID)</span>
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">Automático</span>
                    </Label>
                    <Input
                      id="bunny-video-id"
                      value={bunnyVideoId}
                      onChange={(e) => setBunnyVideoId(e.target.value)}
                      placeholder="dd1681df-2c50-4b21-8ca9-e175ee298621"
                      className="h-8 text-xs font-mono bg-muted/30"
                      disabled={isCreating}
                    />
                  </div>

                  {/* Tempo de Início / Ponto Exato da Rotina (Manual) */}
                  <div className="md:col-span-4 space-y-1">
                    <Label htmlFor="video-timestamp" className="font-semibold text-[11px] text-foreground flex items-center justify-between">
                      <span>Início da Rotina (mm:ss)</span>
                      <span className="text-[9px] text-primary font-bold">Definir Manual</span>
                    </Label>
                    <Input
                      id="video-timestamp"
                      value={videoTimestamp}
                      onChange={(e) => setVideoTimestamp(e.target.value)}
                      placeholder="00:00 (Ex: 02:30)"
                      className="h-8 text-xs font-mono border-primary/30"
                      disabled={isCreating}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-muted-foreground/80" />
                Esta rotina será salva sem o bloco de vídeo no cabeçalho YAML.
              </p>
            )}
          </div>
        </div>

        {/* Rodapé Fixo */}
        <DialogFooter className="p-4 border-t bg-muted/20 shrink-0 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isCreating}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={isCreating || isFormIncomplete}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Cadastrando e Publicando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Cadastrar e Publicar na IA
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
