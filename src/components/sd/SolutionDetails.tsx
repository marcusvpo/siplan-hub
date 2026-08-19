import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays, Check, Clock3, Download, Eye, FileSearch, FileText, FolderTree,
  History, Loader2, Paperclip, Pencil, RefreshCw, RotateCcw, Server, Share2,
  ShieldAlert, ShieldCheck, Tag, ThumbsDown, ThumbsUp, Trash2, UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { SdSolutionContent } from "@/components/sd/SdSolutionContent";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { usePermissions } from "@/hooks/usePermissions";
import { formatSdAttachmentSize } from "@/lib/sd-attachments";
import { canPreviewSdAttachment, isSdSolutionReviewOverdue, SD_SOLUTION_STATUS } from "@/lib/sd-solutions";
import {
  deleteSdSolution, getMySdSolutionFeedback, getSdAttachmentDownloadUrl,
  getSdAttachmentPreviewUrl, getSdSolution, listSdSolutionVersions,
  registerSdSolutionView, requestSdAttachmentScan, restoreSdSolutionVersion,
  setMySdSolutionFeedback,
} from "@/services/sd-solutions";
import type { SdAnexo, SdSolucao, SdSolutionVersion } from "@/types/sd";

interface SolutionDetailsProps {
  solutionId: string | null;
  onClose: () => void;
  onEdit: (solution: SdSolucao) => void;
  onDeleted: () => void;
  onUpdated?: () => void;
}

interface AttachmentPreview { attachment: SdAnexo; url: string; text: string | null; }

const PANEL_WIDTH_KEY = "sd-solution-details-width";
const MIN_PANEL_WIDTH = 520;
const DEFAULT_PANEL_WIDTH = 672;
const PANEL_VIEWPORT_MARGIN = 0.92;

function maxPanelWidth(): number { return Math.round(window.innerWidth * PANEL_VIEWPORT_MARGIN); }
function clampPanelWidth(width: number): number { return Math.max(MIN_PANEL_WIDTH, Math.min(width, maxPanelWidth())); }

function longDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

function shortDate(value: string | null): string {
  if (!value) return "Não definida";
  const dateValue = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value;
  return new Intl.DateTimeFormat("pt-BR").format(new Date(dateValue));
}

function attachmentSecurity(attachment: SdAnexo) {
  if (attachment.verificacao_status === "seguro") return { label: "Verificado", className: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: ShieldCheck };
  if (attachment.verificacao_status === "suspeito") return { label: "Bloqueado", className: "border-red-200 bg-red-50 text-red-700", icon: ShieldAlert };
  if (attachment.verificacao_status === "erro") return { label: "Falha na verificação", className: "border-amber-200 bg-amber-50 text-amber-700", icon: ShieldAlert };
  return { label: "Verificando", className: "border-sky-200 bg-sky-50 text-sky-700", icon: Loader2 };
}

export function SolutionDetails({ solutionId, onClose, onEdit, onDeleted, onUpdated }: SolutionDetailsProps) {
  const { hasPermission } = usePermissions();
  const [solution, setSolution] = useState<SdSolucao | null>(null);
  const [versions, setVersions] = useState<SdSolutionVersion[]>([]);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [versionToRestore, setVersionToRestore] = useState<SdSolutionVersion | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);
  const [scanningAttachmentId, setScanningAttachmentId] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<AttachmentPreview | null>(null);
  const [panelWidth, setPanelWidth] = useState(() => {
    const savedWidth = Number(localStorage.getItem(PANEL_WIDTH_KEY));
    return clampPanelWidth(savedWidth >= MIN_PANEL_WIDTH ? savedWidth : DEFAULT_PANEL_WIDTH);
  });
  const [resizing, setResizing] = useState(false);

  const loadDetails = useCallback(async (id: string) => {
    const [item, versionItems, myFeedback] = await Promise.all([
      getSdSolution(id), listSdSolutionVersions(id), getMySdSolutionFeedback(id),
    ]);
    const views = await registerSdSolutionView(id).catch(() => item.visualizacoes);
    setSolution({ ...item, visualizacoes: views });
    setVersions(versionItems);
    setFeedback(myFeedback?.util ?? null);
  }, []);

  const handleResizeMove = useCallback((event: PointerEvent) => setPanelWidth(clampPanelWidth(window.innerWidth - event.clientX)), []);
  const handleResizeEnd = useCallback(() => setResizing(false), []);

  useEffect(() => {
    if (!resizing) return;
    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", handleResizeMove);
    window.addEventListener("pointerup", handleResizeEnd);
    window.addEventListener("pointercancel", handleResizeEnd);
    window.addEventListener("blur", handleResizeEnd);
    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
      window.removeEventListener("pointermove", handleResizeMove);
      window.removeEventListener("pointerup", handleResizeEnd);
      window.removeEventListener("pointercancel", handleResizeEnd);
      window.removeEventListener("blur", handleResizeEnd);
    };
  }, [handleResizeEnd, handleResizeMove, resizing]);

  useEffect(() => { if (!resizing) localStorage.setItem(PANEL_WIDTH_KEY, String(panelWidth)); }, [panelWidth, resizing]);
  useEffect(() => {
    const handleWindowResize = () => setPanelWidth((current) => clampPanelWidth(current));
    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, []);

  useEffect(() => {
    if (!solutionId) { setSolution(null); setVersions([]); setFeedback(null); return; }
    let active = true;
    setLoading(true);
    loadDetails(solutionId)
      .catch(() => active && toast.error("Não foi possível abrir a solução."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [loadDetails, solutionId]);

  const share = async () => {
    if (!solution) return;
    const url = new URL(window.location.href);
    url.searchParams.set("solucao", solution.id);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { toast.error("Não foi possível copiar o link."); }
  };

  const remove = async () => {
    if (!solution) return;
    setDeleting(true);
    try {
      await deleteSdSolution(solution.id);
      toast.success("Solução excluída.");
      setConfirmDelete(false); onDeleted(); onClose();
    } catch { toast.error("Não foi possível excluir a solução."); }
    finally { setDeleting(false); }
  };

  const vote = async (nextValue: boolean) => {
    if (!solution) return;
    const value = feedback === nextValue ? null : nextValue;
    setFeedbackSaving(true);
    try {
      await setMySdSolutionFeedback(solution.id, value);
      setFeedback(value);
      setSolution(await getSdSolution(solution.id));
      onUpdated?.();
      toast.success(value === null ? "Avaliação removida." : "Obrigado pela avaliação.");
    } catch { toast.error("Não foi possível salvar sua avaliação."); }
    finally { setFeedbackSaving(false); }
  };

  const restoreVersion = async () => {
    if (!solution || !versionToRestore) return;
    setRestoring(true);
    try {
      await restoreSdSolutionVersion(versionToRestore.id);
      await loadDetails(solution.id);
      toast.success(`Versão ${versionToRestore.versao} restaurada como uma nova versão.`);
      setVersionToRestore(null); onUpdated?.();
    } catch { toast.error("Não foi possível restaurar esta versão."); }
    finally { setRestoring(false); }
  };

  const downloadAttachment = async (attachment: SdAnexo) => {
    setDownloadingAttachmentId(attachment.id);
    try {
      const signedUrl = await getSdAttachmentDownloadUrl(attachment);
      const link = document.createElement("a");
      link.href = signedUrl; link.download = attachment.nome_arquivo; link.rel = "noopener";
      document.body.appendChild(link); link.click(); link.remove();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível baixar o anexo."); }
    finally { setDownloadingAttachmentId(null); }
  };

  const openAttachmentPreview = async (attachment: SdAnexo) => {
    setPreviewLoading(true);
    try {
      const url = await getSdAttachmentPreviewUrl(attachment);
      const isText = attachment.tipo_mime?.startsWith("text/") || /\.(sql|txt|log|json|xml|csv|md)$/i.test(attachment.nome_arquivo);
      let text: string | null = null;
      if (isText) {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Não foi possível carregar o conteúdo do anexo.");
        const blob = await response.blob();
        if (blob.size > 1024 * 1024) throw new Error("A prévia de texto é limitada a 1 MB.");
        text = await blob.text();
      }
      setPreview({ attachment, url, text });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível abrir a prévia."); }
    finally { setPreviewLoading(false); }
  };

  const scanAttachment = async (attachment: SdAnexo) => {
    if (!solution) return;
    setScanningAttachmentId(attachment.id);
    try {
      const scanned = await requestSdAttachmentScan(attachment.id);
      if (!scanned) throw new Error();
      setSolution({ ...solution, anexos: solution.anexos?.map((item) => item.id === scanned.id ? scanned : item) });
      toast.success("Verificação de segurança concluída.");
    } catch { toast.error("Não foi possível verificar este anexo."); }
    finally { setScanningAttachmentId(null); }
  };

  const overdue = solution ? isSdSolutionReviewOverdue(solution) : false;
  const status = solution ? SD_SOLUTION_STATUS[solution.status] : null;

  return (
    <>
      <Sheet open={Boolean(solutionId)} onOpenChange={(open) => !open && onClose()}>
        <SheetContent style={{ width: panelWidth, maxWidth: `${PANEL_VIEWPORT_MARGIN * 100}vw` }} className={`w-full overflow-y-auto sm:max-w-none ${resizing ? "transition-none" : ""}`}>
          <div role="separator" aria-label="Redimensionar painel de detalhes" aria-orientation="vertical" aria-valuemin={MIN_PANEL_WIDTH} aria-valuemax={maxPanelWidth()} aria-valuenow={panelWidth} tabIndex={0} className="group absolute -left-1 top-0 z-50 hidden h-full w-2 cursor-col-resize touch-none outline-none sm:block" title="Arraste para redimensionar; duplo clique restaura o tamanho padrão" onPointerDown={(event) => { event.preventDefault(); setResizing(true); }} onDoubleClick={() => setPanelWidth(clampPanelWidth(DEFAULT_PANEL_WIDTH))} onKeyDown={(event) => {
            if (event.key === "ArrowLeft") setPanelWidth((current) => clampPanelWidth(current + 32));
            if (event.key === "ArrowRight") setPanelWidth((current) => clampPanelWidth(current - 32));
            if (event.key === "Home") setPanelWidth(clampPanelWidth(DEFAULT_PANEL_WIDTH));
          }}><span className="absolute left-1/2 top-1/2 h-16 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-border transition-colors group-hover:bg-primary group-focus:bg-primary" /></div>

          {!solution && <SheetHeader className="sr-only"><SheetTitle>{loading ? "Carregando solução" : "Solução não encontrada"}</SheetTitle><SheetDescription>Detalhes da solução cadastrada no SD</SheetDescription></SheetHeader>}
          {loading ? <div className="flex h-full items-center justify-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div> : !solution ? <div className="flex h-full items-center justify-center text-muted-foreground">Solução não encontrada.</div> : (
            <div className="space-y-5 pb-8">
              <SheetHeader className="pr-8">
                <div className="mb-1 flex flex-wrap items-center gap-2"><Badge variant="outline" className={status?.className}>{status?.label}</Badge><Badge variant="secondary">Versão {solution.versao}</Badge>{overdue && <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Revisão vencida</Badge>}</div>
                <SheetTitle className="text-2xl leading-tight">{solution.titulo}</SheetTitle><SheetDescription>Base técnica do SD</SheetDescription>
              </SheetHeader>

              <div className="flex flex-wrap gap-2 border-y py-3">
                <Button variant="outline" size="sm" className="gap-2" onClick={share}>{copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4" />}{copied ? "Link copiado" : "Compartilhar"}</Button>
                {hasPermission("sd_solutions", "edit") && <Button variant="outline" size="sm" className="gap-2" onClick={() => onEdit(solution)}><Pencil className="h-4 w-4" />Editar</Button>}
                {hasPermission("sd_solutions", "delete") && <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4" />Excluir</Button>}
              </div>

              <div className="grid gap-4 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2">
                <div className="flex items-center gap-3"><Server className="h-4 w-4 text-primary" /><div><p className="text-xs text-muted-foreground">Sistema</p><p className="text-sm font-medium">{solution.sistema?.nome || "—"}</p></div></div>
                <div className="flex items-center gap-3"><FolderTree className="h-4 w-4 text-primary" /><div><p className="text-xs text-muted-foreground">Rotina</p><p className="text-sm font-medium">{solution.rotina?.nome || "Sem rotina"}</p></div></div>
                <div className="flex items-center gap-3"><UserRound className="h-4 w-4 text-primary" /><div><p className="text-xs text-muted-foreground">Responsável</p><p className="text-sm font-medium">{solution.responsavel?.full_name || solution.responsavel?.email || "Não definido"}</p></div></div>
                <div className="flex items-center gap-3"><CalendarDays className={`h-4 w-4 ${overdue ? "text-amber-600" : "text-muted-foreground"}`} /><div><p className="text-xs text-muted-foreground">Próxima revisão</p><p className="text-sm font-medium">{shortDate(solution.proxima_revisao_em)}</p></div></div>
                <div className="flex items-center gap-3"><CalendarDays className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Cadastrada em</p><p className="text-sm font-medium">{longDate(solution.criado_em)}</p></div></div>
                <div className="flex items-center gap-3"><Clock3 className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Atualizada em</p><p className="text-sm font-medium">{longDate(solution.atualizado_em || solution.criado_em)}</p></div></div>
              </div>

              {solution.palavras_chave.length > 0 && <div className="space-y-2"><div className="flex items-center gap-2 text-sm font-semibold"><Tag className="h-4 w-4 text-primary" />Palavras-chave</div><div className="flex flex-wrap gap-2">{solution.palavras_chave.map((keyword) => <Badge key={keyword} variant="secondary">{keyword}</Badge>)}</div></div>}

              <div className="space-y-3"><h3 className="text-sm font-semibold">Descrição da solução</h3>{solution.descricao ? <SdSolutionContent value={solution.descricao} className="rounded-xl border bg-card p-5 text-sm leading-relaxed" /> : <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhuma descrição informada.</p>}</div>

              {solution.anexos && solution.anexos.length > 0 && <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold"><Paperclip className="h-4 w-4 text-primary" />Anexos <Badge variant="secondary">{solution.anexos.length}</Badge></div>
                <div className="space-y-2">{[...solution.anexos].sort((a, b) => a.nome_arquivo.localeCompare(b.nome_arquivo, "pt-BR")).map((attachment) => {
                  const security = attachmentSecurity(attachment); const SecurityIcon = security.icon; const blocked = attachment.verificacao_status === "suspeito";
                  return <div key={attachment.id} className="flex min-w-0 flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><FileText className="h-4 w-4" /></div>
                    <div className="min-w-48 flex-1"><p className="truncate text-sm font-medium" title={attachment.nome_arquivo}>{attachment.nome_arquivo}</p><div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>{formatSdAttachmentSize(attachment.tamanho_bytes)}{attachment.tipo_mime ? ` · ${attachment.tipo_mime}` : ""}</span><Badge variant="outline" className={`gap-1 ${security.className}`}><SecurityIcon className={`h-3 w-3 ${attachment.verificacao_status === "pendente" ? "animate-spin" : ""}`} />{security.label}</Badge></div></div>
                    {(attachment.verificacao_status === "erro" || attachment.verificacao_status === "pendente") && <Button type="button" variant="ghost" size="sm" className="gap-1" disabled={scanningAttachmentId === attachment.id} onClick={() => void scanAttachment(attachment)}><RefreshCw className={`h-4 w-4 ${scanningAttachmentId === attachment.id ? "animate-spin" : ""}`} />Verificar</Button>}
                    {canPreviewSdAttachment(attachment) && !blocked && <Button type="button" variant="outline" size="sm" className="gap-1" disabled={previewLoading} onClick={() => void openAttachmentPreview(attachment)}><FileSearch className="h-4 w-4" />Prévia</Button>}
                    <Button type="button" variant="outline" size="sm" className="gap-1" disabled={blocked || downloadingAttachmentId === attachment.id} onClick={() => void downloadAttachment(attachment)}>{downloadingAttachmentId === attachment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Baixar</Button>
                  </div>;
                })}</div>
              </div>}

              <div className="rounded-xl border bg-muted/15 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">Esta solução ajudou?</p><p className="text-xs text-muted-foreground">A avaliação melhora a ordem dos resultados.</p></div><div className="flex gap-2"><Button variant={feedback === true ? "default" : "outline"} size="sm" className="gap-2" disabled={feedbackSaving} onClick={() => void vote(true)}><ThumbsUp className="h-4 w-4" />Sim ({solution.votos_uteis})</Button><Button variant={feedback === false ? "destructive" : "outline"} size="sm" className="gap-2" disabled={feedbackSaving} onClick={() => void vote(false)}><ThumbsDown className="h-4 w-4" />Não ({solution.votos_nao_uteis})</Button></div></div><div className="mt-3 flex items-center gap-4 border-t pt-3 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{solution.visualizacoes} visualizações</span><span>Revisada em {shortDate(solution.revisado_em)}</span></div></div>

              <Accordion type="single" collapsible><AccordionItem value="history" className="rounded-xl border px-4"><AccordionTrigger className="hover:no-underline"><span className="flex items-center gap-2"><History className="h-4 w-4 text-primary" />Histórico de versões <Badge variant="secondary">{versions.length}</Badge></span></AccordionTrigger><AccordionContent><div className="space-y-2">{versions.map((version) => <div key={version.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div className="min-w-0"><div className="flex items-center gap-2"><span className="font-medium">Versão {version.versao}</span>{version.versao === solution.versao && <Badge>Atual</Badge>}</div><p className="mt-1 truncate text-xs text-muted-foreground">{version.titulo} · {longDate(version.criado_em)} · {version.autor?.full_name || version.autor?.email || "Sistema"}</p></div>{version.versao !== solution.versao && hasPermission("sd_solutions", "edit") && <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setVersionToRestore(version)}><RotateCcw className="h-4 w-4" />Restaurar</Button>}</div>)}</div></AccordionContent></AccordionItem></Accordion>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}><DialogContent className="max-w-5xl"><DialogHeader><DialogTitle>{preview?.attachment.nome_arquivo}</DialogTitle><DialogDescription>Pré-visualização segura do anexo</DialogDescription></DialogHeader>{preview?.text !== null && preview ? <pre className="max-h-[70vh] overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100"><code>{preview.text}</code></pre> : preview?.attachment.tipo_mime?.startsWith("image/") ? <img src={preview.url} alt={preview.attachment.nome_arquivo} className="mx-auto max-h-[72vh] max-w-full rounded-lg object-contain" /> : preview ? <iframe src={preview.url} title={preview.attachment.nome_arquivo} className="h-[72vh] w-full rounded-lg border" /> : null}</DialogContent></Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir solução?</AlertDialogTitle><AlertDialogDescription>“{solution?.titulo}” será removida permanentemente. Essa ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); void remove(); }} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <AlertDialog open={Boolean(versionToRestore)} onOpenChange={(open) => !open && setVersionToRestore(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Restaurar versão {versionToRestore?.versao}?</AlertDialogTitle><AlertDialogDescription>O conteúdo selecionado será copiado para uma nova versão. O histórico atual será preservado.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={restoring}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); void restoreVersion(); }} disabled={restoring}>{restoring && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Restaurar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
}
