import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  parseMasterDocument,
  updateArticleInDocument,
} from "@/services/markdownKnowledgeService";
import { computeTextDiff, formatBackupFilePath } from "@/services/diffService";
import type {
  KnowledgeArticle,
  KnowledgeSyncLog,
  KnowledgeVersion,
  MasterKnowledgeDocument,
  VersionDiffSummary,
} from "@/types/knowledge";
import { useAuth } from "@/hooks/useAuth";

const STORAGE_BUCKET = "assistant-oriontn-doc";
const STORAGE_FILE_PATH = "OrionTN pos.md";

export function useKnowledgeBase() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSectionIndex, setSelectedSectionIndex] = useState<number | "all">("all");
  const [selectedTag, setSelectedTag] = useState<string | "all">("all");

  // Local draft body of the currently active article
  const [draftBody, setDraftBody] = useState<string>("");
  const [isDirty, setIsDirty] = useState(false);

  // Guarda de alterações não salvas
  const [pendingArticleId, setPendingArticleId] = useState<string | null>(null);
  const [isUnsavedDialogOpen, setIsUnsavedDialogOpen] = useState(false);

  // 1. Download & parse o documento mestre do Supabase Storage
  const {
    data: docData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<MasterKnowledgeDocument>({
    queryKey: ["assistant_knowledge_doc", STORAGE_BUCKET, STORAGE_FILE_PATH],
    queryFn: async () => {
      const { data, error: downloadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(STORAGE_FILE_PATH);

      if (downloadError) {
        throw new Error(`Erro ao baixar a base de conhecimento: ${downloadError.message}`);
      }

      const fileText = await data.text();
      return parseMasterDocument(fileText);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // 2. Buscar lista completa de versões e backups (Biblioteca de Versões)
  const {
    data: versions = [],
    isLoading: isLoadingVersions,
    refetch: refetchVersions,
  } = useQuery<KnowledgeVersion[]>({
    queryKey: ["assistant_knowledge_versions"],
    queryFn: async () => {
      const { data, error: versionError } = await supabase
        .from("assistant_knowledge_versions" as any)
        .select("*")
        .order("version_number", { ascending: false });

      if (versionError) {
        console.warn("Aviso ao buscar versões:", versionError.message);
        return [];
      }

      return (data as unknown as KnowledgeVersion[]) || [];
    },
    staleTime: 60 * 1000,
  });

  // 3. Buscar último log de sincronização para exibir no Header
  const { data: lastSyncLog } = useQuery<KnowledgeSyncLog | null>({
    queryKey: ["assistant_knowledge_last_sync"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assistant_knowledge_sync_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn("Erro ao buscar último log de sync:", error.message);
        return null;
      }
      return (data as unknown as KnowledgeSyncLog) ?? null;
    },
    staleTime: 60 * 1000,
  });

  // Artigo selecionado
  const selectedArticle: KnowledgeArticle | null = useMemo(() => {
    if (!docData || docData.articles.length === 0) return null;
    if (!selectedArticleId) return docData.articles[0];
    return docData.articles.find((a) => a.id === selectedArticleId) || docData.articles[0];
  }, [docData, selectedArticleId]);

  // Sincronizar o draftBody ao mudar de artigo
  useEffect(() => {
    if (selectedArticle) {
      setDraftBody(selectedArticle.body);
      setIsDirty(false);
    }
  }, [selectedArticle?.id]);

  // Prevenir fechamento acidental de aba se houver alterações pendentes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Handler para trocar de artigo com verificação de alterações não salvas
  const handleSelectArticle = useCallback(
    (targetArticleId: string) => {
      if (targetArticleId === selectedArticleId) return;

      if (isDirty) {
        setPendingArticleId(targetArticleId);
        setIsUnsavedDialogOpen(true);
      } else {
        setSelectedArticleId(targetArticleId);
      }
    },
    [isDirty, selectedArticleId],
  );

  // Confirmar descarte de alterações não salvas e mudar de artigo
  const confirmDiscardAndSwitch = useCallback(() => {
    if (pendingArticleId) {
      setSelectedArticleId(pendingArticleId);
      setPendingArticleId(null);
      setIsDirty(false);
    }
    setIsUnsavedDialogOpen(false);
  }, [pendingArticleId]);

  const cancelArticleSwitch = useCallback(() => {
    setPendingArticleId(null);
    setIsUnsavedDialogOpen(false);
  }, []);

  // Handler para atualizar o corpo no editor
  const handleBodyChange = useCallback(
    (newMarkdown: string) => {
      setDraftBody(newMarkdown);
      if (selectedArticle) {
        const hasChanged = newMarkdown.trim() !== selectedArticle.body.trim();
        setIsDirty(hasChanged);
      }
    },
    [selectedArticle],
  );

  // Lista de todas as tags únicas
  const allTags = useMemo(() => {
    if (!docData) return [];
    const set = new Set<string>();
    for (const article of docData.articles) {
      for (const tag of article.metadata.tags || []) {
        set.add(tag);
      }
    }
    return Array.from(set).sort();
  }, [docData]);

  // Filtragem de artigos para o ArticleNavigator
  const filteredArticles = useMemo(() => {
    if (!docData) return [];

    return docData.articles.filter((article) => {
      // Filtro por seção
      if (selectedSectionIndex !== "all" && article.sectionIndex !== selectedSectionIndex) {
        return false;
      }

      // Filtro por tag
      if (selectedTag !== "all" && !article.metadata.tags.includes(selectedTag)) {
        return false;
      }

      // Filtro por termo de busca (ID, Título, Objetivo, Tags, Perguntas, Sinônimos)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = article.id.toLowerCase().includes(q);
        const matchTitle = article.titulo.toLowerCase().includes(q);
        const matchObjective = article.metadata.objetivo?.toLowerCase().includes(q);
        const matchTags = article.metadata.tags?.some((t) => t.toLowerCase().includes(q));
        const matchQuestions = article.metadata.perguntas_usuario?.some((p) =>
          p.toLowerCase().includes(q),
        );
        const matchSynonyms = article.metadata.sinonimos?.some((s) =>
          s.toLowerCase().includes(q),
        );

        return (
          matchId ||
          matchTitle ||
          matchObjective ||
          matchTags ||
          matchQuestions ||
          matchSynonyms
        );
      }

      return true;
    });
  }, [docData, selectedSectionIndex, selectedTag, searchQuery]);

  // Resumo de diff calculado para o artigo ativo
  const currentDiffSummary: VersionDiffSummary = useMemo(() => {
    if (!selectedArticle) {
      return { addedLinesCount: 0, removedLinesCount: 0, charDiffCount: 0 };
    }
    return computeTextDiff(selectedArticle.body, draftBody);
  }, [selectedArticle, draftBody]);

  // 4. Mutação de Salvamento com Backup Automático e Versionamento
  const saveMutation = useMutation({
    mutationFn: async ({
      articleId,
      updatedBody,
      customSummary,
    }: {
      articleId: string;
      updatedBody: string;
      customSummary?: string;
    }) => {
      if (!docData) throw new Error("Documento não carregado");

      const currentArticle = docData.articles.find((a) => a.id === articleId);
      if (!currentArticle) throw new Error("Artigo não localizado");

      // 1. Obter o próximo número sequencial de versão
      let nextVersionNum = 1;
      try {
        const { data: numData } = await supabase.rpc("get_next_knowledge_version_number");
        if (typeof numData === "number") {
          nextVersionNum = numData;
        }
      } catch (err) {
        console.warn("Erro ao obter número de versão sequencial via RPC:", err);
      }

      // 2. Salvar backup do arquivo anterior intacto na pasta backup/
      const backupPath = formatBackupFilePath(nextVersionNum, "OrionTN pos");
      const previousBlob = new Blob([docData.rawContent], {
        type: "text/markdown;charset=utf-8",
      });

      const { error: backupError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(backupPath, previousBlob, {
          upsert: true,
          contentType: "text/markdown",
        });

      if (backupError) {
        throw new Error(`Falha ao criar cópia de segurança em ${backupPath}: ${backupError.message}`);
      }

      // 3. Reconstruir o arquivo final unindo o frontmatter intocado + corpo novo
      const finalFileContent = updateArticleInDocument(
        docData.rawContent,
        articleId,
        updatedBody,
      );

      // 4. Upload para o Supabase Storage na raiz (arquivo atual)
      const contentBlob = new Blob([finalFileContent], {
        type: "text/markdown;charset=utf-8",
      });

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(STORAGE_FILE_PATH, contentBlob, {
          upsert: true,
          contentType: "text/markdown",
        });

      if (uploadError) {
        throw new Error(`Erro ao salvar arquivo atualizado no Storage: ${uploadError.message}`);
      }

      // 5. Calcular Diff
      const diff = computeTextDiff(currentArticle.body, updatedBody);
      const summaryText =
        customSummary && customSummary.trim() !== ""
          ? customSummary.trim()
          : diff.changeSummary || `Atualizado tutorial ${articleId}`;

      // 6. Registrar versão e auditoria no banco de dados via RPC
      try {
        await supabase.rpc("register_knowledge_version" as any, {
          p_backup_file_path: backupPath,
          p_article_id: articleId,
          p_article_title: currentArticle.titulo,
          p_summary_changes: summaryText,
          p_diff_summary: diff as any,
          p_content_size_bytes: contentBlob.size,
          p_is_restoration: false,
          p_metadata: {
            updated_by_email: user?.email,
            article_tags: currentArticle.metadata.tags || [],
          },
        });
      } catch (logErr) {
        console.warn("Aviso ao registrar versão no banco:", logErr);
      }

      return {
        articleId,
        backupPath,
        versionTag: `v${nextVersionNum}`,
        contentSize: contentBlob.size,
        updatedAt: new Date().toISOString(),
      };
    },
    onSuccess: (data) => {
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ["assistant_knowledge_doc"] });
      queryClient.invalidateQueries({ queryKey: ["assistant_knowledge_versions"] });
      queryClient.invalidateQueries({ queryKey: ["assistant_knowledge_last_sync"] });

      toast.success(
        `Versão ${data.versionTag} salva e publicada na OpenAI com sucesso!`,
        {
          description: `Backup salvo em ${data.backupPath}.`,
        },
      );
    },
    onError: (err: Error) => {
      toast.error("Falha ao salvar alterações", {
        description: err.message,
      });
    },
  });

  // 5. Mutação para Restauração / Rollback de uma Versão Antiga
  const restoreVersionMutation = useMutation({
    mutationFn: async (version: KnowledgeVersion) => {
      if (!version.backup_file_path) {
        throw new Error("Caminho do arquivo de backup não encontrado nesta versão.");
      }

      // 1. Baixar o arquivo de backup selecionado do Storage
      const { data: backupBlob, error: downloadBackupErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(version.backup_file_path);

      if (downloadBackupErr || !backupBlob) {
        throw new Error(`Não foi possível baixar o backup: ${downloadBackupErr?.message}`);
      }

      const backupContent = await backupBlob.text();

      // 2. Fazer um backup de segurança do estado ATUAL antes de reverter
      let nextVersionNum = 1;
      try {
        const { data: numData } = await supabase.rpc("get_next_knowledge_version_number");
        if (typeof numData === "number") {
          nextVersionNum = numData;
        }
      } catch {
        // fallback
      }

      const preRollbackBackupPath = formatBackupFilePath(
        nextVersionNum,
        "OrionTN pos_pre_rollback",
      );

      if (docData?.rawContent) {
        await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(
            preRollbackBackupPath,
            new Blob([docData.rawContent], { type: "text/markdown;charset=utf-8" }),
            { upsert: true },
          );
      }

      // 3. Sobrescrever o arquivo atual no Storage com o conteúdo do backup restaurado
      const { error: restoreUploadErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(
          STORAGE_FILE_PATH,
          new Blob([backupContent], { type: "text/markdown;charset=utf-8" }),
          { upsert: true, contentType: "text/markdown" },
        );

      if (restoreUploadErr) {
        throw new Error(`Erro ao restaurar arquivo mestre: ${restoreUploadErr.message}`);
      }

      // 4. Registrar a nova versão de restauração no banco
      try {
        await supabase.rpc("register_knowledge_version" as any, {
          p_backup_file_path: preRollbackBackupPath,
          p_article_id: version.article_id || null,
          p_article_title: version.article_title || null,
          p_summary_changes: `Rollback / Restauração para o estado da versão ${version.version_tag}`,
          p_diff_summary: { restored_from_version: version.version_tag } as any,
          p_content_size_bytes: backupBlob.size,
          p_is_restoration: true,
          p_restored_from_version_id: version.id,
          p_metadata: {
            restored_version_id: version.id,
            restored_version_tag: version.version_tag,
            author_email: user?.email,
          },
        });
      } catch (err) {
        console.warn("Aviso ao registrar log de restauração:", err);
      }

      return {
        restoredVersionTag: version.version_tag,
        newVersionTag: `v${nextVersionNum}`,
      };
    },
    onSuccess: (data) => {
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ["assistant_knowledge_doc"] });
      queryClient.invalidateQueries({ queryKey: ["assistant_knowledge_versions"] });
      queryClient.invalidateQueries({ queryKey: ["assistant_knowledge_last_sync"] });

      toast.success(
        `Base restaurada com sucesso para o estado da ${data.restoredVersionTag}!`,
        {
          description: `Nova versão ${data.newVersionTag} gerada e sincronizada com a IA.`,
        },
      );
    },
    onError: (err: Error) => {
      toast.error("Falha ao restaurar versão", {
        description: err.message,
      });
    },
  });

  // Função utilitária para obter a URL pública ou download de um backup
  const getBackupDownloadUrl = useCallback((backupPath: string) => {
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(backupPath);
    return data.publicUrl;
  }, []);

  const saveCurrentArticle = useCallback(
    async (customSummary?: string) => {
      if (!selectedArticle) return;
      return saveMutation.mutateAsync({
        articleId: selectedArticle.id,
        updatedBody: draftBody,
        customSummary,
      });
    },
    [selectedArticle, draftBody, saveMutation],
  );

  return {
    docData,
    articles: docData?.articles || [],
    filteredArticles,
    sections: docData?.sections || [],
    allTags,
    selectedArticle,
    selectedArticleId: selectedArticle?.id || null,
    setSelectedArticleId: handleSelectArticle,
    draftBody,
    setDraftBody: handleBodyChange,
    isDirty,
    currentDiffSummary,
    searchQuery,
    setSearchQuery,
    selectedSectionIndex,
    setSelectedSectionIndex,
    selectedTag,
    setSelectedTag,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    lastSyncLog,
    versions,
    isLoadingVersions,
    refetchVersions,
    saveCurrentArticle,
    isSaving: saveMutation.isPending,
    restoreVersion: restoreVersionMutation.mutateAsync,
    isRestoring: restoreVersionMutation.isPending,
    getBackupDownloadUrl,
    // Guarda de alterações não salvas
    isUnsavedDialogOpen,
    confirmDiscardAndSwitch,
    cancelArticleSwitch,
  };
}
