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
} from "lucide-react";
import { toast } from "sonner";
import { MarkdownTiptapEditor } from "./MarkdownTiptapEditor";
import {
  suggestNextArticleId,
  validateArticleIdUniqueness,
  SIPLAN_HUB_SECTION_INDEX,
  SIPLAN_HUB_SECTION_TITLE,
} from "@/services/markdownKnowledgeService";
import { generateRoutineMetadataWithAi } from "@/services/aiRoutineGeneratorService";
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
  // 1. Estados dos Campos
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

  // Vídeo Bunny.net
  const [hasVideo, setHasVideo] = useState(false);
  const [bunnyLibraryId, setBunnyLibraryId] = useState("354152");
  const [bunnyVideoId, setBunnyVideoId] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTimestamp, setVideoTimestamp] = useState("00:00");

  // Estado da Geração por IA
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Inicializar ID sugerido ao abrir o modal (padrão Seção 5: S-5.X)
  useEffect(() => {
    if (isOpen) {
      setSelectedSectionIndex(SIPLAN_HUB_SECTION_INDEX);
      setRoutineId(suggestNextArticleId(articles, SIPLAN_HUB_SECTION_INDEX));
      setStepByStepBody("");
      setTitle("");
      setObjective("");
      setTags(["orion_tn"]);
      setUserQuestions([]);
      setSynonyms([]);
      setHasVideo(false);
      setBunnyLibraryId("354152");
      setBunnyVideoId("");
      setVideoTitle("");
      setVideoUrl("");
      setVideoTimestamp("00:00");
    }
  }, [isOpen, sections, articles]);

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

  // 3. Auto-Preenchimento com IA
  const handleGenerateWithAi = async () => {
    if (!stepByStepBody.trim() || stepByStepBody.trim().length < 15) {
      toast.warning("Escreva o passo a passo primeiro", {
        description: "Digite ou cole as instruções do procedimento para que a IA possa gerar o título, ID, tags e perguntas.",
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

      toast.success("Metadados gerados pela IA!", {
        description: "Revise e ajuste as informações abaixo antes de salvar.",
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
    const trimmed = newTagInput.trim().toLowerCase().replace(/\s+/g, "_");
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
    const trimmed = newSynonymInput.trim().toLowerCase();
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
    if (!idValidation.isValid) {
      toast.error("ID Inválido ou Duplicado", {
        description: "Por favor, corrija o ID da rotina antes de continuar.",
      });
      return;
    }

    if (!title.trim()) {
      toast.error("Título Obrigatório", {
        description: "Informe o título da nova rotina.",
      });
      return;
    }

    if (!stepByStepBody.trim()) {
      toast.error("Conteúdo Obrigatório", {
        description: "Escreva o passo a passo da rotina.",
      });
      return;
    }

    let videoData: BunnyVideoMetadata | undefined = undefined;
    if (hasVideo) {
      videoData = {
        tem_video: true,
        bunny_library_id: bunnyLibraryId.trim() || "354152",
        bunny_video_id: bunnyVideoId.trim(),
        video_title: videoTitle.trim() || title.trim(),
        video_url: videoUrl.trim(),
        video_timestamp: videoTimestamp.trim() || "00:00",
      };
    }

    const metadata: KnowledgeArticleMetadata = {
      id: routineId.trim(),
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
        customSummary: `Cadastrada nova rotina ${routineId.trim()}: ${title.trim()}`,
      });
      onClose();
    } catch {
      // Notificações já tratadas pelo hook
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isCreating && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-background border-border shadow-2xl flex flex-col p-0 overflow-hidden">
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
                  Preencha o passo a passo e use a IA para gerar os metadados automaticamente.
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
          {/* ================= SEÇÃO 1: PASSO A PASSO (FOCO PRINCIPAL) ================= */}
          <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary" />
                  1. Passo a Passo do Procedimento (Corpo da Rotina)
                  <span className="text-destructive">*</span>
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Escreva detalhadamente o passo a passo que o atendente/cliente deve executar.
                </p>
              </div>

              {/* Botão Mágico Preencher com IA */}
              <Button
                type="button"
                size="sm"
                onClick={handleGenerateWithAi}
                disabled={isGeneratingAi || isCreating}
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md hover:shadow-lg transition-all text-xs h-8.5 px-3.5"
              >
                {isGeneratingAi ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Analisando e Preenchendo com IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Preencher Metadados com IA</span>
                  </>
                )}
              </Button>
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
            <div className="flex items-center gap-2 border-b pb-2 text-foreground font-bold text-xs">
              <Tag className="h-4 w-4 text-primary" />
              <span>2. Metadados & Classificação Técnica</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
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
                  Seção do Documento
                </Label>
                <Select
                  value={selectedSectionIndex.toString()}
                  onValueChange={handleSectionChange}
                  disabled={isCreating}
                >
                  <SelectTrigger id="section-select" className="h-9 text-xs">
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
                  placeholder="Ex: Como Emitir Certidão de Inteiro Teor no Orion TN"
                  className="text-xs font-semibold h-9"
                  disabled={isCreating}
                />
              </div>

              {/* Objetivo / Resumo */}
              <div className="md:col-span-12 space-y-1.5">
                <Label htmlFor="routine-objective" className="font-semibold text-foreground">
                  Objetivo / Resumo Operacional
                </Label>
                <Textarea
                  id="routine-objective"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Ex: Orientar o usuário no processo de emissão da certidão de inteiro teor..."
                  rows={2}
                  className="text-xs resize-none"
                  disabled={isCreating}
                />
              </div>
            </div>

            {/* Tags Interativas */}
            <div className="space-y-2 pt-2">
              <Label className="font-semibold text-foreground flex items-center justify-between">
                <span>Tags de Indexação</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  Pressione Enter para adicionar
                </span>
              </Label>
              <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border bg-background min-h-10">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-[11px] font-mono gap-1 py-0.5 px-2 bg-muted hover:bg-muted/80 text-foreground"
                  >
                    #{tag}
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
                  Perguntas Típicas do Usuário
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
                    placeholder="Ex: Como faço para emitir a certidão de inteiro teor?"
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
                  Sinônimos e Palavras-Chave de Busca
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
                    placeholder="Ex: certidão completa, 2ª via inteiro teor..."
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

          {/* ================= SEÇÃO 3: VÍDEO BUNNY.NET (OPCIONAL) ================= */}
          <div className="space-y-4 rounded-xl border bg-card p-4.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-primary" />
                <span className="font-bold text-foreground text-xs">
                  3. Vídeo Tutorial (Bunny.net)
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
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 pt-2 border-t border-border/50 animate-in fade-in-50 duration-200">
                <div className="md:col-span-4 space-y-1">
                  <Label htmlFor="bunny-lib-id" className="font-semibold text-[11px]">
                    Bunny Library ID
                  </Label>
                  <Input
                    id="bunny-lib-id"
                    value={bunnyLibraryId}
                    onChange={(e) => setBunnyLibraryId(e.target.value)}
                    placeholder="354152"
                    className="h-8 text-xs font-mono"
                    disabled={isCreating}
                  />
                </div>

                <div className="md:col-span-8 space-y-1">
                  <Label htmlFor="bunny-video-id" className="font-semibold text-[11px]">
                    Bunny Video ID (GUID)
                  </Label>
                  <Input
                    id="bunny-video-id"
                    value={bunnyVideoId}
                    onChange={(e) => setBunnyVideoId(e.target.value)}
                    placeholder="Ex: 8b7d9a1c-4e2f-48d0-8f92-5b9c1d2e3f4a"
                    className="h-8 text-xs font-mono"
                    disabled={isCreating}
                  />
                </div>

                <div className="md:col-span-8 space-y-1">
                  <Label htmlFor="video-url" className="font-semibold text-[11px]">
                    URL Direta do Vídeo / Iframe
                  </Label>
                  <Input
                    id="video-url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://iframe.mediadelivery.net/play/354152/..."
                    className="h-8 text-xs"
                    disabled={isCreating}
                  />
                </div>

                <div className="md:col-span-4 space-y-1">
                  <Label htmlFor="video-timestamp" className="font-semibold text-[11px]">
                    Tempo de Início / Duração
                  </Label>
                  <Input
                    id="video-timestamp"
                    value={videoTimestamp}
                    onChange={(e) => setVideoTimestamp(e.target.value)}
                    placeholder="Ex: 02:30"
                    className="h-8 text-xs font-mono"
                    disabled={isCreating}
                  />
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
            disabled={isCreating || !idValidation.isValid || !title.trim() || !stepByStepBody.trim()}
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
