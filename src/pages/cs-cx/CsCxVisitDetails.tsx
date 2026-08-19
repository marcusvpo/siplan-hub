import { useRef, useState } from "react";
import { Download, FilePlus2, Link2, Paperclip, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type CsCxChecklistInput, type CsCxVisit, type CsCxVisitPendingInput, useCsCxVisits } from "@/hooks/useCsCxExperience";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";

interface Props { visit: CsCxVisit; canEdit: boolean; canDelete: boolean }

export default function CsCxVisitDetails({ visit, canEdit, canDelete }: Props) {
  const { toggleChecklist, saveChecklistItem, deleteChecklistItem, savePendingItem, deletePendingItem, generateRequest, uploadAttachment, deleteAttachment, downloadAttachment } = useCsCxVisits();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [checkForm, setCheckForm] = useState<CsCxChecklistInput | null>(null);
  const [pendingForm, setPendingForm] = useState<CsCxVisitPendingInput | null>(null);
  const [attachmentDescription, setAttachmentDescription] = useState("");
  const canGenerateRequest = canEdit && hasPermission("cs_cx_registros", "create");

  async function saveChecklist() {
    if (!checkForm) return;
    try { await saveChecklistItem.mutateAsync(checkForm); setCheckForm(null); toast({ title: "Item do checklist salvo" }); }
    catch (error) { showError("Não foi possível salvar o item", error); }
  }

  async function savePending() {
    if (!pendingForm) return;
    try { await savePendingItem.mutateAsync(pendingForm); setPendingForm(null); toast({ title: "Pendência salva" }); }
    catch (error) { showError("Não foi possível salvar a pendência", error); }
  }

  async function uploadFile(file?: File) {
    if (!file) return;
    try {
      await uploadAttachment.mutateAsync({ visitId: visit.id, file, description: attachmentDescription });
      setAttachmentDescription("");
      if (fileRef.current) fileRef.current.value = "";
      toast({ title: "Anexo enviado" });
    } catch (error) { showError("Não foi possível enviar o anexo", error); }
  }

  async function openAttachment(id: string) {
    const attachment = visit.attachments.find((item) => item.id === id);
    if (!attachment) return;
    try { window.open(await downloadAttachment(attachment), "_blank", "noopener,noreferrer"); }
    catch (error) { showError("Arquivo indisponível", error); }
  }

  function showError(title: string, error: unknown) {
    toast({ title, description: error instanceof Error ? error.message : "Erro inesperado.", variant: "destructive" });
  }

  return <div className="grid gap-6 lg:grid-cols-2">
    <section>
      <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold">Checklist ({visit.checklist.filter((item) => item.checked).length}/{visit.checklist.length})</h3>{canEdit && <Button size="sm" variant="outline" onClick={() => setCheckForm({ visit_id: visit.id, name: "", description: "", notes: "", sort_order: visit.checklist.length })}><Plus className="mr-2 h-3.5 w-3.5" />Item</Button>}</div>
      <div className="space-y-2">{visit.checklist.map((item) => <div key={item.id} className="flex gap-3 rounded-lg border p-3 text-sm"><Checkbox checked={item.checked} disabled={!canEdit || toggleChecklist.isPending} onCheckedChange={(checked) => toggleChecklist.mutate({ id: item.id, checked: checked === true })} /><div className="min-w-0 flex-1"><strong>{item.name}</strong>{item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}{item.notes && <p className="mt-1 text-xs">{item.notes}</p>}</div>{canEdit && <Button size="icon" variant="ghost" aria-label="Editar item" onClick={() => setCheckForm({ id: item.id, visit_id: visit.id, name: item.name, description: item.description ?? "", notes: item.notes ?? "", sort_order: item.sort_order })}><Pencil className="h-3.5 w-3.5" /></Button>}{canDelete && <Button size="icon" variant="ghost" aria-label="Excluir item" onClick={() => deleteChecklistItem.mutate(item.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}</div>)}{!visit.checklist.length && <p className="text-sm text-muted-foreground">Nenhum item cadastrado.</p>}</div>
    </section>

    <section>
      <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold">Pendências ({visit.pending_items.length})</h3>{canEdit && <Button size="sm" variant="outline" onClick={() => setPendingForm({ visit_id: visit.id, title: "", description: "", priority: "media", category: "", notes: "", due_date: "", status: "pendente" })}><Plus className="mr-2 h-3.5 w-3.5" />Pendência</Button>}</div>
      <div className="space-y-2">{visit.pending_items.map((item) => <div key={item.id} className="rounded-lg border p-3"><div className="flex items-start justify-between gap-2"><div><strong className="text-sm">{item.title}</strong><p className="mt-1 text-xs text-muted-foreground">{item.description}</p></div><Badge variant={item.priority === "critica" ? "destructive" : "outline"}>{item.priority}</Badge></div><div className="mt-2 flex flex-wrap gap-2">{item.request_id ? <Badge variant="secondary"><Link2 className="mr-1 h-3 w-3" />Solicitação gerada</Badge> : canGenerateRequest && <Button size="sm" variant="secondary" disabled={generateRequest.isPending} onClick={() => generateRequest.mutateAsync(item.id).then(() => toast({ title: "Solicitação gerada" })).catch((error) => showError("Não foi possível gerar a solicitação", error))}><FilePlus2 className="mr-2 h-3.5 w-3.5" />Gerar solicitação</Button>}{canEdit && <Button size="sm" variant="ghost" onClick={() => setPendingForm({ id: item.id, visit_id: visit.id, title: item.title, description: item.description, priority: item.priority, category: item.category ?? "", notes: item.notes ?? "", due_date: item.due_date ?? "", status: item.status })}><Pencil className="mr-2 h-3.5 w-3.5" />Editar</Button>}{canDelete && <Button size="sm" variant="ghost" onClick={() => deletePendingItem.mutate(item.id)}><Trash2 className="mr-2 h-3.5 w-3.5 text-destructive" />Excluir</Button>}</div></div>)}{!visit.pending_items.length && <p className="text-sm text-muted-foreground">Nenhuma pendência registrada.</p>}</div>
    </section>

    <section className="lg:col-span-2">
      <div className="mb-3 flex items-center gap-2"><Paperclip className="h-4 w-4" /><h3 className="text-sm font-bold">Anexos ({visit.attachments.length})</h3></div>
      {canEdit && <div className="mb-3 grid gap-2 md:grid-cols-[1fr_1fr_auto]"><Input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,.txt" /><Input value={attachmentDescription} onChange={(event) => setAttachmentDescription(event.target.value)} placeholder="Descrição opcional" /><Button disabled={uploadAttachment.isPending} onClick={() => uploadFile(fileRef.current?.files?.[0])}>Enviar</Button></div>}
      <div className="space-y-2">{visit.attachments.map((attachment) => <div key={attachment.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{attachment.original_name}</p><p className="text-xs text-muted-foreground">{attachment.description || formatBytes(attachment.size_bytes)}</p></div><div className="flex"><Button size="icon" variant="ghost" aria-label="Baixar anexo" onClick={() => openAttachment(attachment.id)}><Download className="h-4 w-4" /></Button>{canDelete && <Button size="icon" variant="ghost" aria-label="Excluir anexo" onClick={() => deleteAttachment.mutate(attachment)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div></div>)}{!visit.attachments.length && <p className="text-sm text-muted-foreground">Nenhum anexo registrado.</p>}</div>
    </section>
    {visit.general_notes && <p className="text-sm text-muted-foreground lg:col-span-2"><strong>Observações:</strong> {visit.general_notes}</p>}

    <Dialog open={Boolean(checkForm)} onOpenChange={(open) => !open && setCheckForm(null)}><DialogContent><DialogHeader><DialogTitle>Item do checklist</DialogTitle><DialogDescription>Cadastre ou ajuste uma verificação da visita.</DialogDescription></DialogHeader>{checkForm && <div className="space-y-3"><Field label="Nome"><Input value={checkForm.name} onChange={(event) => setCheckForm({ ...checkForm, name: event.target.value })} /></Field><Field label="Descrição"><Textarea value={checkForm.description} onChange={(event) => setCheckForm({ ...checkForm, description: event.target.value })} /></Field><Field label="Observação"><Textarea value={checkForm.notes} onChange={(event) => setCheckForm({ ...checkForm, notes: event.target.value })} /></Field></div>}<DialogFooter><Button variant="outline" onClick={() => setCheckForm(null)}>Cancelar</Button><Button disabled={!checkForm?.name.trim() || saveChecklistItem.isPending} onClick={saveChecklist}>Salvar</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={Boolean(pendingForm)} onOpenChange={(open) => !open && setPendingForm(null)}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Pendência da visita</DialogTitle><DialogDescription>Registre prioridade, prazo e andamento.</DialogDescription></DialogHeader>{pendingForm && <div className="grid gap-3 md:grid-cols-2"><Field label="Título"><Input value={pendingForm.title} onChange={(event) => setPendingForm({ ...pendingForm, title: event.target.value })} /></Field><Field label="Categoria"><Input value={pendingForm.category} onChange={(event) => setPendingForm({ ...pendingForm, category: event.target.value })} /></Field><Field label="Prioridade"><Select value={pendingForm.priority} onValueChange={(value) => setPendingForm({ ...pendingForm, priority: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["baixa", "media", "alta", "critica"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Field><Field label="Status"><Select value={pendingForm.status} onValueChange={(value) => setPendingForm({ ...pendingForm, status: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["pendente", "emandamento", "resolvida"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Field><Field label="Prazo"><Input type="date" value={pendingForm.due_date} onChange={(event) => setPendingForm({ ...pendingForm, due_date: event.target.value })} /></Field><div className="md:col-span-2"><Field label="Descrição"><Textarea value={pendingForm.description} onChange={(event) => setPendingForm({ ...pendingForm, description: event.target.value })} /></Field></div><div className="md:col-span-2"><Field label="Observação"><Textarea value={pendingForm.notes} onChange={(event) => setPendingForm({ ...pendingForm, notes: event.target.value })} /></Field></div></div>}<DialogFooter><Button variant="outline" onClick={() => setPendingForm(null)}>Cancelar</Button><Button disabled={!pendingForm?.title.trim() || !pendingForm?.description.trim() || savePendingItem.isPending} onClick={savePending}>Salvar</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div><Label>{label}</Label>{children}</div>; }
function formatBytes(value: number | null) { if (!value) return "Tamanho não informado"; if (value < 1024) return `${value} B`; if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`; return `${(value / 1024 ** 2).toFixed(1)} MB`; }
