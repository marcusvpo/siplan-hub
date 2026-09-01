import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarCheck2, CheckCircle2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import {
  createSdSolution,
  deleteSdSolutionAttachment,
  listSdRoutines,
  listSdProfiles,
  listSdSystems,
  updateSdSolution,
  uploadSdSolutionAttachment,
} from "@/services/sd-solutions";
import type {
  SdAnexo,
  SdProfile,
  SdRotina,
  SdSistema,
  SdSolucao,
  SdSolutionStatus,
} from "@/types/sd";
import { SolutionRichTextEditor } from "./SolutionRichTextEditor";

interface SolutionFormProps {
  solution?: SdSolucao | null;
  onSaved: () => void;
  onCancelEdit: () => void;
}

export function SolutionForm({ solution, onSaved, onCancelEdit }: SolutionFormProps) {
  const { hasPermission } = usePermissions();
  const { user } = useAuth();
  const [systems, setSystems] = useState<SdSistema[]>([]);
  const [profiles, setProfiles] = useState<SdProfile[]>([]);
  const [routines, setRoutines] = useState<SdRotina[]>([]);
  const [systemId, setSystemId] = useState("");
  const [routineId, setRoutineId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [status, setStatus] = useState<SdSolutionStatus>("publicado");
  const [responsibleId, setResponsibleId] = useState("");
  const [reviewedAt, setReviewedAt] = useState<string | null>(null);
  const [nextReviewDate, setNextReviewDate] = useState("");
  const [attachments, setAttachments] = useState<SdAnexo[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);
  const [removedAttachments, setRemovedAttachments] = useState<SdAnexo[]>([]);
  const [persistedSolutionId, setPersistedSolutionId] = useState<string | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attachmentUpload, setAttachmentUpload] = useState<{
    fileName: string;
    completed: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState("");

  const editing = Boolean(solution);
  const allowed = hasPermission("sd_solutions", editing ? "edit" : "create");

  useEffect(() => {
    setLoadingOptions(true);
    Promise.all([listSdSystems(), listSdProfiles()])
      .then(([systemItems, profileItems]) => {
        setSystems(systemItems);
        setProfiles(profileItems);
      })
      .catch(() => setError("Não foi possível carregar os sistemas e responsáveis."))
      .finally(() => setLoadingOptions(false));
  }, []);

  useEffect(() => {
    setSystemId(solution?.sistema_id || "");
    setRoutineId(solution?.rotina_id || "");
    setTitle(solution?.titulo || "");
    setDescription(solution?.descricao || "");
    setKeywords(solution?.palavras_chave || []);
    setStatus(solution?.status || "publicado");
    setResponsibleId(solution?.responsavel_id || user?.id || "");
    setReviewedAt(solution?.revisado_em || new Date().toISOString());
    setNextReviewDate(
      solution?.proxima_revisao_em
        || new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
    );
    setAttachments(
      [...(solution?.anexos || [])].sort((a, b) =>
        a.nome_arquivo.localeCompare(b.nome_arquivo, "pt-BR"),
      ),
    );
    setPendingAttachments([]);
    setRemovedAttachments([]);
    setPersistedSolutionId(solution?.id || null);
    setError("");
  }, [solution, user?.id]);

  useEffect(() => {
    if (!systemId) {
      setRoutines([]);
      setRoutineId("");
      return;
    }

    listSdRoutines(systemId)
      .then((items) => {
        setRoutines(items);
        setRoutineId((current) =>
          current && items.some((routine) => routine.id === current) ? current : "",
        );
      })
      .catch(() => setError("Não foi possível carregar as rotinas."));
  }, [systemId]);

  const actionLabel = useMemo(
    () => (editing ? "Salvar alterações" : "Salvar solução"),
    [editing],
  );

  const clearForm = () => {
    setSystemId("");
    setRoutineId("");
    setTitle("");
    setDescription("");
    setKeywords([]);
    setStatus("publicado");
    setResponsibleId(user?.id || "");
    setReviewedAt(new Date().toISOString());
    setNextReviewDate(new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10));
    setAttachments([]);
    setPendingAttachments([]);
    setRemovedAttachments([]);
    setPersistedSolutionId(null);
    setAttachmentUpload(null);
    setError("");
  };

  const save = async () => {
    setError("");
    if (!systemId) {
      setError("Selecione um sistema.");
      return;
    }
    if (!title.trim()) {
      setError("Informe o título da solução.");
      return;
    }

    setSaving(true);
    let contentSaved = false;
    try {
      const payload = {
        titulo: title.trim(),
        descricao: description.trim() || null,
        sistema_id: systemId,
        rotina_id: routineId || null,
        palavras_chave: keywords,
        status,
        responsavel_id: responsibleId || null,
        revisado_em: reviewedAt,
        proxima_revisao_em: nextReviewDate || null,
      };

      let targetSolutionId = solution?.id || persistedSolutionId;
      if (solution) {
        await updateSdSolution(solution.id, payload);
        contentSaved = true;
      } else if (!targetSolutionId) {
        targetSolutionId = await createSdSolution(payload);
        setPersistedSolutionId(targetSolutionId);
        contentSaved = true;
      }

      if (!targetSolutionId) throw new Error("Solução sem identificador após o salvamento.");

      for (const attachment of [...removedAttachments]) {
        await deleteSdSolutionAttachment(attachment);
        setRemovedAttachments((current) =>
          current.filter((item) => item.id !== attachment.id),
        );
      }

      const filesToUpload = [...pendingAttachments];
      for (const [fileIndex, file] of filesToUpload.entries()) {
        setAttachmentUpload({
          fileName: file.name,
          completed: fileIndex,
          total: filesToUpload.length,
        });
        const uploadedAttachment = await uploadSdSolutionAttachment(targetSolutionId, file);
        setAttachments((current) =>
          [...current, uploadedAttachment].sort((a, b) =>
            a.nome_arquivo.localeCompare(b.nome_arquivo, "pt-BR"),
          ),
        );
        setPendingAttachments((current) => current.filter((item) => item !== file));
        setAttachmentUpload((current) => current
          ? { ...current, completed: fileIndex + 1 }
          : null);
      }

      toast.success(editing ? "Solução atualizada." : "Solução cadastrada.");
      clearForm();
      onSaved();
    } catch {
      setError(
        contentSaved || persistedSolutionId
          ? "A solução foi salva, mas não foi possível concluir todos os anexos. Tente salvar novamente."
          : "Não foi possível salvar a solução. Tente novamente.",
      );
    } finally {
      setAttachmentUpload(null);
      setSaving(false);
    }
  };

  if (!allowed) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Você não tem permissão para {editing ? "editar" : "cadastrar"} soluções.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="mx-auto min-w-0 max-w-5xl overflow-hidden">
      <CardHeader>
        <CardTitle>{editing ? "Editar solução" : "Cadastrar solução"}</CardTitle>
        <CardDescription>
          {editing
            ? "Atualize o conteúdo e salve as alterações."
            : "Registre um procedimento para consulta da equipe de suporte."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 px-4 sm:px-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sd-system">Sistema *</Label>
            <Select value={systemId} onValueChange={setSystemId} disabled={loadingOptions}>
              <SelectTrigger id="sd-system">
                <SelectValue placeholder="Selecione um sistema" />
              </SelectTrigger>
              <SelectContent>
                {systems.map((system) => (
                  <SelectItem key={system.id} value={system.id}>
                    {system.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sd-routine">Rotina (opcional)</Label>
            <Select
              value={routineId || "none"}
              onValueChange={(value) => setRoutineId(value === "none" ? "" : value)}
              disabled={!systemId}
            >
              <SelectTrigger id="sd-routine">
                <SelectValue placeholder="Selecione uma rotina" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem rotina</SelectItem>
                {routines.map((routine) => (
                  <SelectItem key={routine.id} value={routine.id}>
                    {routine.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sd-title">Título *</Label>
          <Input
            id="sd-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex.: Como corrigir falha na emissão de nota"
            maxLength={180}
          />
        </div>

        <div className="grid gap-5 rounded-xl border bg-muted/20 p-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="sd-status">Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as SdSolutionStatus)}>
              <SelectTrigger id="sd-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="publicado">Publicado</SelectItem>
                <SelectItem value="desatualizado">Desatualizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sd-responsible">Responsável</Label>
            <Select
              value={responsibleId || "none"}
              onValueChange={(value) => setResponsibleId(value === "none" ? "" : value)}
            >
              <SelectTrigger id="sd-responsible">
                <SelectValue placeholder="Sem responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem responsável</SelectItem>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.full_name || profile.email || "Usuário sem nome"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sd-next-review">Próxima revisão</Label>
            <Input
              id="sd-next-review"
              type="date"
              value={nextReviewDate}
              onChange={(event) => setNextReviewDate(event.target.value)}
            />
          </div>

          <div className="flex flex-col items-start gap-3 md:col-span-3 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-muted-foreground">
              Última revisão: {reviewedAt
                ? new Intl.DateTimeFormat("pt-BR").format(new Date(reviewedAt))
                : "não informada"}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-2 md:w-auto"
              onClick={() => {
                setReviewedAt(new Date().toISOString());
                setNextReviewDate(new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10));
                if (status === "desatualizado") setStatus("publicado");
              }}
            >
              <CalendarCheck2 className="h-4 w-4" />
              Marcar como revisada hoje
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Descrição da solução</Label>
          <SolutionRichTextEditor
            value={description}
            keywords={keywords}
            attachments={attachments}
            pendingAttachments={pendingAttachments}
            disabled={saving}
            attachmentUpload={attachmentUpload}
            onAddAttachments={(files) => {
              setPendingAttachments((current) => [...current, ...files]);
            }}
            onRemoveAttachment={(attachment) => {
              setAttachments((current) =>
                current.filter((item) => item.id !== attachment.id),
              );
              setRemovedAttachments((current) =>
                current.some((item) => item.id === attachment.id)
                  ? current
                  : [...current, attachment],
              );
            }}
            onRemovePendingAttachment={(file) => {
              setPendingAttachments((current) => current.filter((item) => item !== file));
            }}
            onChange={(html, nextKeywords) => {
              setDescription(html);
              setKeywords(nextKeywords);
            }}
          />
          <p className="text-xs text-muted-foreground">
            Selecione um trecho e use “Marcar seleção” para incluí-lo na busca por palavras-chave.
            Você também pode anexar até 10 arquivos de 20 MB; formatos executáveis são bloqueados.
          </p>
        </div>

        <div className="grid gap-3 border-t pt-5 sm:flex sm:flex-wrap sm:items-center">
          <Button onClick={save} disabled={saving} className="w-full gap-2 sm:w-auto">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Salvando..." : actionLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => {
              clearForm();
              if (editing) onCancelEdit();
            }}
          >
            {editing ? "Cancelar edição" : "Limpar"}
          </Button>
          {!saving && title && systemId && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Campos obrigatórios preenchidos
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
