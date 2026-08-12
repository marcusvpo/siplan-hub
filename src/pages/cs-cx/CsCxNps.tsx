import { useMemo, useState } from "react";
import { Frown, Meh, Pencil, Plus, RefreshCw, Search, Smile, Star, Trash2, TriangleAlert } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCsCxRegistryOffices } from "@/hooks/useCsCxCore";
import { type CsCxNpsInput, type CsCxNpsResponse, useCsCxNps } from "@/hooks/useCsCxExperience";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";

const emptyForm: CsCxNpsInput = { registry_office_id: "", responded_at: toLocalInput(new Date()), respondent_name: "", respondent_office: "", score: 10, score_reason: "", improvement_suggestion: "" };
const CLASS_LABELS: Record<string, string> = { PROMOTOR: "Promotor", NEUTRO: "Neutro", DETRATOR: "Detrator" };

export default function CsCxNps() {
  const { responses, history, isLoading, error, refetch, saveResponse, deleteResponse } = useCsCxNps();
  const { offices } = useCsCxRegistryOffices();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [classification, setClassification] = useState("all");
  const [form, setForm] = useState<CsCxNpsInput>(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<CsCxNpsResponse | null>(null);
  const canCreate = hasPermission("cs_cx_nps", "create");
  const canEdit = hasPermission("cs_cx_nps", "edit");
  const canDelete = hasPermission("cs_cx_nps", "delete");

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return responses.filter((response) => (!term || [response.respondent_name, response.respondent_office, response.registry_office?.name, response.score_reason].some((value) => value?.toLocaleLowerCase("pt-BR").includes(term))) && (classification === "all" || response.classification === classification));
  }, [classification, responses, search]);
  const promoters = responses.filter((item) => item.classification === "PROMOTOR").length;
  const neutrals = responses.filter((item) => item.classification === "NEUTRO").length;
  const detractors = responses.filter((item) => item.classification === "DETRATOR").length;
  const nps = responses.length ? Math.round(((promoters - detractors) / responses.length) * 1000) / 10 : 0;

  function openCreate() { setForm({ ...emptyForm, responded_at: toLocalInput(new Date()) }); setDialogOpen(true); }
  function openEdit(response: CsCxNpsResponse) { setForm({ id: response.id, registry_office_id: response.registry_office_id, responded_at: toLocalInput(new Date(response.responded_at)), respondent_name: response.respondent_name, respondent_office: response.respondent_office, score: response.score, score_reason: response.score_reason ?? "", improvement_suggestion: response.improvement_suggestion ?? "" }); setDialogOpen(true); }
  async function handleSave() {
    try { await saveResponse.mutateAsync(form); setDialogOpen(false); toast({ title: form.id ? "Resposta atualizada" : "Resposta registrada" }); }
    catch (mutationError) { toast({ title: "Não foi possível salvar", description: messageOf(mutationError), variant: "destructive" }); }
  }
  async function handleDelete() {
    if (!deleting) return;
    try { await deleteResponse.mutateAsync(deleting.id); setDeleting(null); toast({ title: "Resposta excluída" }); }
    catch (mutationError) { toast({ title: "Não foi possível excluir", description: messageOf(mutationError), variant: "destructive" }); }
  }

  if (isLoading) return <div className="container mx-auto max-w-7xl space-y-4 p-6"><Skeleton className="h-28 w-full" /><Skeleton className="h-80 w-full" /></div>;
  return <div className="container mx-auto max-w-7xl space-y-6 p-6">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="flex items-center gap-2 text-sm font-medium text-rose-600 dark:text-rose-300"><Star className="h-4 w-4" />CS/CX</div><h1 className="mt-1 text-3xl font-black tracking-tight">NPS</h1><p className="text-sm text-muted-foreground">Satisfação, classificação e evolução das avaliações dos cartórios.</p></div>{canCreate && <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Nova resposta</Button>}</div>
    {error && <Card className="border-destructive/40"><CardContent className="flex items-center justify-between pt-6"><span className="flex items-center gap-2 text-sm text-destructive"><TriangleAlert className="h-4 w-4" />{messageOf(error)}</span><Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="mr-2 h-4 w-4" />Tentar novamente</Button></CardContent></Card>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={Star} label="NPS geral" value={nps} /><Metric icon={Smile} label="Promotores" value={promoters} /><Metric icon={Meh} label="Neutros" value={neutrals} /><Metric icon={Frown} label="Detratores" value={detractors} /></div>
    <Tabs defaultValue="responses" className="space-y-4"><TabsList><TabsTrigger value="responses">Respostas</TabsTrigger><TabsTrigger value="history">Histórico</TabsTrigger></TabsList><TabsContent value="responses" className="space-y-4"><Card><CardContent className="grid gap-3 pt-6 md:grid-cols-[1fr_220px]"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar respondente ou cartório..." /></div><Select value={classification} onValueChange={setClassification}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as classificações</SelectItem><SelectItem value="PROMOTOR">Promotores</SelectItem><SelectItem value="NEUTRO">Neutros</SelectItem><SelectItem value="DETRATOR">Detratores</SelectItem></SelectContent></Select></CardContent></Card><Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Cartório</TableHead><TableHead>Respondente</TableHead><TableHead>Nota</TableHead><TableHead>Classificação</TableHead><TableHead>Motivo</TableHead><TableHead className="w-24" /></TableRow></TableHeader><TableBody>{filtered.map((response) => <TableRow key={response.id}><TableCell>{formatDate(response.responded_at)}</TableCell><TableCell className="font-medium">{response.registry_office?.name ?? response.respondent_office}</TableCell><TableCell>{response.respondent_name}</TableCell><TableCell><span className="text-lg font-black">{response.score}</span></TableCell><TableCell><ClassificationBadge value={response.classification} /></TableCell><TableCell className="max-w-xs truncate text-muted-foreground">{response.score_reason || "—"}</TableCell><TableCell><div className="flex">{canEdit && <Button variant="ghost" size="icon" aria-label="Editar resposta" onClick={() => openEdit(response)}><Pencil className="h-4 w-4" /></Button>}{canDelete && <Button variant="ghost" size="icon" aria-label="Excluir resposta" onClick={() => setDeleting(response)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div></TableCell></TableRow>)}{!filtered.length && <TableRow><TableCell colSpan={7} className="h-28 text-center text-muted-foreground">Nenhuma resposta encontrada.</TableCell></TableRow>}</TableBody></Table></CardContent></Card></TabsContent><TabsContent value="history"><Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Cartório</TableHead><TableHead>Período</TableHead><TableHead>Respostas</TableHead><TableHead>Promotores</TableHead><TableHead>Neutros</TableHead><TableHead>Detratores</TableHead><TableHead>NPS</TableHead></TableRow></TableHeader><TableBody>{history.map((item) => <TableRow key={item.id}><TableCell className="font-medium">{item.registry_office?.name}</TableCell><TableCell>{formatDateOnly(item.period_start)} – {formatDateOnly(item.period_end)}</TableCell><TableCell>{item.total_responses}</TableCell><TableCell>{item.total_promoters}</TableCell><TableCell>{item.total_neutrals}</TableCell><TableCell>{item.total_detractors}</TableCell><TableCell className="font-black">{item.nps_score.toFixed(1)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></TabsContent></Tabs>
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{form.id ? "Editar resposta" : "Nova resposta NPS"}</DialogTitle><DialogDescription>A classificação é calculada automaticamente pela nota.</DialogDescription></DialogHeader><div className="grid gap-4 md:grid-cols-2"><Field label="Cartório"><Select value={form.registry_office_id} onValueChange={(value) => { const office = offices.find((item) => item.id === value); setForm((current) => ({ ...current, registry_office_id: value, respondent_office: current.respondent_office || office?.name || "" })); }}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{offices.map((office) => <SelectItem key={office.id} value={office.id}>{office.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Data e hora"><Input type="datetime-local" value={form.responded_at} onChange={(event) => setForm((current) => ({ ...current, responded_at: event.target.value }))} /></Field><Field label="Respondente"><Input value={form.respondent_name} onChange={(event) => setForm((current) => ({ ...current, respondent_name: event.target.value }))} /></Field><Field label="Cartório informado"><Input value={form.respondent_office} onChange={(event) => setForm((current) => ({ ...current, respondent_office: event.target.value }))} /></Field><Field label={`Nota: ${form.score}`}><Input type="range" min="0" max="10" value={form.score} onChange={(event) => setForm((current) => ({ ...current, score: Number(event.target.value) }))} /></Field><div className="flex items-end pb-2"><ClassificationBadge value={form.score >= 9 ? "PROMOTOR" : form.score >= 7 ? "NEUTRO" : "DETRATOR"} /></div><div className="md:col-span-2"><Label htmlFor="score-reason">Motivo da nota</Label><Textarea id="score-reason" value={form.score_reason} onChange={(event) => setForm((current) => ({ ...current, score_reason: event.target.value }))} /></div><div className="md:col-span-2"><Label htmlFor="improvement">Sugestão de melhoria</Label><Textarea id="improvement" value={form.improvement_suggestion} onChange={(event) => setForm((current) => ({ ...current, improvement_suggestion: event.target.value }))} /></div></div><DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button disabled={!form.registry_office_id || !form.respondent_name.trim() || !form.respondent_office.trim() || saveResponse.isPending} onClick={handleSave}>Salvar</Button></DialogFooter></DialogContent></Dialog>
    <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir resposta NPS?</AlertDialogTitle><AlertDialogDescription>A resposta de {deleting?.respondent_name} deixará de compor os indicadores.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof Star; label: string; value: number }) { return <Card><CardContent className="flex items-center gap-3 pt-6"><Icon className="h-5 w-5 text-rose-600" /><div><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-black">{value}</p></div></CardContent></Card>; }
function ClassificationBadge({ value }: { value: string }) { return <Badge variant={value === "DETRATOR" ? "destructive" : value === "PROMOTOR" ? "default" : "secondary"}>{CLASS_LABELS[value] ?? value}</Badge>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div><Label>{label}</Label>{children}</div>; }
function toLocalInput(date: Date) { const offset = date.getTimezoneOffset() * 60_000; return new Date(date.getTime() - offset).toISOString().slice(0, 16); }
function formatDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function formatDateOnly(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(`${value}T12:00:00`)); }
function messageOf(error: unknown) { return error instanceof Error ? error.message : "Erro inesperado."; }
