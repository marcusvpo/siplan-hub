import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Boxes,
  Layers3,
  ListChecks,
  Pencil,
  Plus,
  RefreshCw,
  Settings2,
  Tags,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  type CsCxRoutineCategory,
  type CsCxRoutineModel,
  type CsCxRoutineModelItem,
  type CsCxRoutineType,
  useCsCxRoutineAdmin,
} from "@/hooks/useCsCxRoutines";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";

type CatalogKind = "category" | "type";
type DeleteTarget =
  | { kind: "model"; id: string; name: string }
  | { kind: "item"; id: string; name: string }
  | { kind: CatalogKind; id: string; name: string };

const EMPTY_MODEL = { id: "", name: "", description: "", active: true, productIds: [] as string[] };
const EMPTY_ITEM = {
  id: "",
  routineModelId: "",
  name: "",
  description: "",
  categoryId: "",
  routineTypeId: "",
  required: false,
  defaultStatus: "analyze",
};
const EMPTY_CATALOG = { kind: "category" as CatalogKind, id: "", name: "", description: "", active: true, color: "#6c757d" };

export default function CsCxAdmin() {
  const admin = useCsCxRoutineAdmin();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const canManage = hasPermission("cs_cx_admin", "manage");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [modelOpen, setModelOpen] = useState(false);
  const [modelForm, setModelForm] = useState(EMPTY_MODEL);
  const [itemOpen, setItemOpen] = useState(false);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogForm, setCatalogForm] = useState(EMPTY_CATALOG);
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null);

  useEffect(() => {
    if (!selectedModelId && admin.models.length) setSelectedModelId(admin.models[0].id);
    if (selectedModelId && !admin.models.some((model) => model.id === selectedModelId)) {
      setSelectedModelId(admin.models[0]?.id ?? "");
    }
  }, [admin.models, selectedModelId]);

  const selectedModel = admin.models.find((model) => model.id === selectedModelId) ?? null;
  const selectedItems = useMemo(
    () => admin.items.filter((item) => item.routine_model_id === selectedModelId).sort((a, b) => a.sort_order - b.sort_order),
    [admin.items, selectedModelId],
  );

  function openModel(model?: CsCxRoutineModel) {
    setModelForm(model ? {
      id: model.id,
      name: model.name,
      description: model.description ?? "",
      active: model.active,
      productIds: model.products.map((product) => product.id),
    } : EMPTY_MODEL);
    setModelOpen(true);
  }

  function openItem(item?: CsCxRoutineModelItem) {
    if (!selectedModel) return;
    setItemForm(item ? {
      id: item.id,
      routineModelId: item.routine_model_id,
      name: item.name,
      description: item.description ?? "",
      categoryId: item.category_id,
      routineTypeId: item.routine_type_id,
      required: item.required,
      defaultStatus: item.default_active === true ? "active" : item.default_active === false ? "inactive" : "analyze",
    } : { ...EMPTY_ITEM, routineModelId: selectedModel.id });
    setItemOpen(true);
  }

  function openCatalog(kind: CatalogKind, item?: CsCxRoutineCategory | CsCxRoutineType) {
    setCatalogForm({
      kind,
      id: item?.id ?? "",
      name: item?.name ?? "",
      description: item?.description ?? "",
      active: item?.active ?? true,
      color: kind === "category" && item && "display_color" in item ? item.display_color : "#6c757d",
    });
    setCatalogOpen(true);
  }

  async function handleModelSave() {
    try {
      const id = await admin.saveModel.mutateAsync({
        id: modelForm.id || undefined,
        name: modelForm.name,
        description: modelForm.description,
        active: modelForm.active,
        productIds: modelForm.productIds,
      });
      setSelectedModelId(id);
      setModelOpen(false);
      toast({ title: modelForm.id ? "Modelo atualizado" : "Modelo criado" });
    } catch (error) {
      showError(toast, "Não foi possível salvar o modelo", error);
    }
  }

  async function handleItemSave() {
    try {
      await admin.saveItem.mutateAsync({
        id: itemForm.id || undefined,
        routineModelId: itemForm.routineModelId,
        name: itemForm.name,
        description: itemForm.description,
        categoryId: itemForm.categoryId,
        routineTypeId: itemForm.routineTypeId,
        required: itemForm.required,
        defaultActive: itemForm.defaultStatus === "active" ? true : itemForm.defaultStatus === "inactive" ? false : null,
      });
      setItemOpen(false);
      toast({
        title: itemForm.id ? "Item atualizado" : "Item criado",
        description: itemForm.id ? undefined : "O item também foi incluído nas aplicações ativas deste modelo.",
      });
    } catch (error) {
      showError(toast, "Não foi possível salvar o item", error);
    }
  }

  async function handleCatalogSave() {
    try {
      if (catalogForm.kind === "category") {
        await admin.saveCategory.mutateAsync({
          id: catalogForm.id || undefined,
          name: catalogForm.name,
          description: catalogForm.description,
          display_color: catalogForm.color,
          active: catalogForm.active,
        });
      } else {
        await admin.saveType.mutateAsync({
          id: catalogForm.id || undefined,
          name: catalogForm.name,
          description: catalogForm.description,
          active: catalogForm.active,
        });
      }
      setCatalogOpen(false);
      toast({ title: catalogForm.id ? "Cadastro atualizado" : "Cadastro criado" });
    } catch (error) {
      showError(toast, "Não foi possível salvar o cadastro", error);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      if (deleting.kind === "model") await admin.deleteModel.mutateAsync(deleting.id);
      else if (deleting.kind === "item") await admin.deleteItem.mutateAsync(deleting.id);
      else if (deleting.kind === "category") await admin.deleteCategory.mutateAsync(deleting.id);
      else await admin.deleteType.mutateAsync(deleting.id);
      setDeleting(null);
      toast({ title: "Cadastro excluído" });
    } catch (error) {
      showError(toast, "Não foi possível excluir", error);
    }
  }

  async function moveItem(item: CsCxRoutineModelItem, direction: -1 | 1) {
    try {
      await admin.reorderItem.mutateAsync({ id: item.id, newOrder: item.sort_order + direction });
    } catch (error) {
      showError(toast, "Não foi possível reordenar o item", error);
    }
  }

  if (admin.isLoading) {
    return <div className="container mx-auto max-w-[1600px] space-y-4 px-4 py-4 lg:px-6"><Skeleton className="h-20 w-full" /><Skeleton className="h-72 w-full" /></div>;
  }

  return (
    <div className="container mx-auto max-w-[1600px] space-y-4 px-4 py-4 lg:px-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300"><Settings2 className="h-4 w-4" /></span>
          <div><h1 className="text-2xl font-black leading-none tracking-tight">Administração de rotinas</h1><p className="mt-1 text-xs text-muted-foreground">Gerencie modelos, itens, categorias, tipos e produtos vinculados</p></div>
        </div>
        {!canManage && <Badge variant="outline">Somente leitura</Badge>}
      </div>

      {admin.error && <Card className="border-destructive/40"><CardContent className="flex items-center justify-between gap-3 p-3"><div className="flex items-center gap-2 text-sm text-destructive"><TriangleAlert className="h-4 w-4" />{messageOf(admin.error)}</div><Button variant="outline" size="sm" onClick={() => admin.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Tentar novamente</Button></CardContent></Card>}

      <div className="grid gap-2 sm:grid-cols-3">
        <Metric icon={Layers3} label="Modelos" value={admin.models.length} />
        <Metric icon={Tags} label="Categorias" value={admin.categories.length} />
        <Metric icon={ListChecks} label="Itens" value={admin.items.length} />
      </div>

      <Tabs defaultValue="models">
        <TabsList className="h-9"><TabsTrigger className="h-7" value="models">Modelos e itens</TabsTrigger><TabsTrigger className="h-7" value="categories">Categorias</TabsTrigger><TabsTrigger className="h-7" value="types">Tipos</TabsTrigger></TabsList>

        <TabsContent value="models" className="mt-3 grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Card className="min-h-0">
            <CardHeader className="px-3 pb-2 pt-3"><div className="flex items-center justify-between"><div><CardTitle className="text-sm">Modelos</CardTitle><CardDescription className="text-xs">Selecione para administrar os itens.</CardDescription></div>{canManage && <Button className="h-8 w-8" size="icon" variant="outline" aria-label="Criar modelo" onClick={() => openModel()}><Plus className="h-4 w-4" /></Button>}</div></CardHeader>
            <CardContent className="max-h-[calc(100vh-330px)] space-y-1.5 overflow-y-auto px-3 pb-3 lg:min-h-64">
              {admin.models.map((model) => <button key={model.id} type="button" onClick={() => setSelectedModelId(model.id)} className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${selectedModelId === model.id ? "border-rose-300 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/20" : "hover:bg-muted/50"}`}><div className="flex items-start justify-between gap-2"><span className="truncate text-sm font-semibold" title={model.name}>{model.name}</span><Badge variant={model.active ? "default" : "secondary"} className="h-5 px-1.5 text-[10px] font-normal">{model.active ? "Ativo" : "Inativo"}</Badge></div><p className="mt-0.5 text-[11px] text-muted-foreground">{model.item_count} itens · {model.products.length} produtos</p></button>)}
              {!admin.models.length && <p className="py-6 text-center text-sm text-muted-foreground">Nenhum modelo cadastrado.</p>}
            </CardContent>
          </Card>

          <Card className="min-h-0">
            {selectedModel ? <>
              <CardHeader className="px-4 pb-2 pt-3"><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start"><div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><CardTitle className="truncate text-base" title={selectedModel.name}>{selectedModel.name}</CardTitle>{selectedModel.origin === "legacy" && <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">Legado</Badge>}</div><CardDescription className="mt-0.5 truncate text-xs" title={selectedModel.description || "Sem descrição"}>{selectedModel.description || "Sem descrição"}</CardDescription><div className="mt-1.5 flex flex-wrap gap-1">{selectedModel.products.map((product) => <Badge key={product.id} variant="secondary" className="h-5 px-1.5 text-[10px] font-normal">{product.name}</Badge>)}</div></div>{canManage && <div className="flex gap-1"><Button className="h-8" variant="outline" size="sm" onClick={() => openModel(selectedModel)}><Pencil className="mr-1.5 h-3.5 w-3.5" />Editar</Button><Button className="h-8 w-8" variant="ghost" size="icon" aria-label="Excluir modelo" onClick={() => setDeleting({ kind: "model", id: selectedModel.id, name: selectedModel.name })}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>}</div></CardHeader>
              <CardContent className="border-t p-3"><div className="mb-2 flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">Itens do modelo</h2><p className="text-[11px] text-muted-foreground">A ordem abaixo é usada nas aplicações dos cartórios.</p></div>{canManage && <Button className="h-8" size="sm" onClick={() => openItem()}><Plus className="mr-1.5 h-4 w-4" />Novo item</Button>}</div><div className="max-h-[calc(100vh-405px)] space-y-1.5 overflow-y-auto pr-1 lg:min-h-52">
                {selectedItems.map((item, index) => <div key={item.id} className="flex flex-col justify-between gap-2 rounded-lg border px-3 py-2 sm:flex-row sm:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><span className="truncate text-sm font-semibold" title={`${item.sort_order}. ${item.name}`}>{item.sort_order}. {item.name}</span>{item.required && <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-normal">Obrigatório</Badge>}<Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal" style={{ borderColor: item.category?.display_color }}>{item.category?.name ?? "Sem categoria"}</Badge></div><p className="mt-0.5 text-[11px] text-muted-foreground">{item.routine_type?.name ?? "Sem tipo"} · padrão: {statusLabel(item.default_active)}</p></div>{canManage && <div className="flex shrink-0 gap-0.5"><Button className="h-8 w-8" variant="ghost" size="icon" aria-label={`Subir ${item.name}`} disabled={index === 0 || admin.reorderItem.isPending} onClick={() => moveItem(item, -1)}><ArrowUp className="h-4 w-4" /></Button><Button className="h-8 w-8" variant="ghost" size="icon" aria-label={`Descer ${item.name}`} disabled={index === selectedItems.length - 1 || admin.reorderItem.isPending} onClick={() => moveItem(item, 1)}><ArrowDown className="h-4 w-4" /></Button><Button className="h-8 w-8" variant="ghost" size="icon" aria-label={`Editar ${item.name}`} onClick={() => openItem(item)}><Pencil className="h-4 w-4" /></Button><Button className="h-8 w-8" variant="ghost" size="icon" aria-label={`Excluir ${item.name}`} onClick={() => setDeleting({ kind: "item", id: item.id, name: item.name })}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>}</div>)}
                {!selectedItems.length && <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">Este modelo ainda não possui itens.</div>}
              </div>
              </CardContent>
            </> : <CardContent className="py-16 text-center text-sm text-muted-foreground">Selecione ou crie um modelo.</CardContent>}
          </Card>
        </TabsContent>

        <TabsContent value="categories"><CatalogPanel kind="category" items={admin.categories} canManage={canManage} onEdit={(item) => openCatalog("category", item)} onCreate={() => openCatalog("category")} onDelete={(item) => setDeleting({ kind: "category", id: item.id, name: item.name })} /></TabsContent>
        <TabsContent value="types"><CatalogPanel kind="type" items={admin.types} canManage={canManage} onEdit={(item) => openCatalog("type", item)} onCreate={() => openCatalog("type")} onDelete={(item) => setDeleting({ kind: "type", id: item.id, name: item.name })} /></TabsContent>
      </Tabs>

      <Dialog open={modelOpen} onOpenChange={setModelOpen}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>{modelForm.id ? "Editar modelo" : "Novo modelo"}</DialogTitle><DialogDescription>Defina o modelo e os produtos aos quais ele se aplica.</DialogDescription></DialogHeader><div className="space-y-4"><div><Label htmlFor="model-name">Nome</Label><Input id="model-name" value={modelForm.name} onChange={(event) => setModelForm((current) => ({ ...current, name: event.target.value }))} /></div><div><Label htmlFor="model-description">Descrição</Label><Textarea id="model-description" value={modelForm.description} onChange={(event) => setModelForm((current) => ({ ...current, description: event.target.value }))} /></div><div><Label>Produtos</Label><div className="mt-2 grid max-h-40 gap-2 overflow-y-auto rounded-lg border p-3 sm:grid-cols-2">{admin.products.map((product) => <label key={product.id} className="flex items-center gap-2 text-sm"><Checkbox checked={modelForm.productIds.includes(product.id)} onCheckedChange={(checked) => setModelForm((current) => ({ ...current, productIds: checked ? [...current.productIds, product.id] : current.productIds.filter((id) => id !== product.id) }))} />{product.name}</label>)}</div></div><div className="flex items-center justify-between rounded-lg border p-3"><Label htmlFor="model-active">Modelo ativo</Label><Switch id="model-active" checked={modelForm.active} onCheckedChange={(active) => setModelForm((current) => ({ ...current, active }))} /></div></div><DialogFooter><Button variant="outline" onClick={() => setModelOpen(false)}>Cancelar</Button><Button disabled={!modelForm.name.trim() || admin.saveModel.isPending} onClick={handleModelSave}>Salvar modelo</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={itemOpen} onOpenChange={setItemOpen}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>{itemForm.id ? "Editar item" : "Novo item"}</DialogTitle><DialogDescription>Novos itens são propagados automaticamente às aplicações ativas do modelo.</DialogDescription></DialogHeader><div className="space-y-4"><div><Label htmlFor="item-name">Nome</Label><Input id="item-name" value={itemForm.name} onChange={(event) => setItemForm((current) => ({ ...current, name: event.target.value }))} /></div><div><Label htmlFor="item-description">Descrição</Label><Textarea id="item-description" value={itemForm.description} onChange={(event) => setItemForm((current) => ({ ...current, description: event.target.value }))} /></div><div className="grid gap-4 sm:grid-cols-2"><div><Label>Categoria</Label><Select value={itemForm.categoryId} onValueChange={(categoryId) => setItemForm((current) => ({ ...current, categoryId }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{admin.categories.filter((item) => item.active || item.id === itemForm.categoryId).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Tipo</Label><Select value={itemForm.routineTypeId} onValueChange={(routineTypeId) => setItemForm((current) => ({ ...current, routineTypeId }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{admin.types.filter((item) => item.active || item.id === itemForm.routineTypeId).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div></div><div className="grid gap-4 sm:grid-cols-2"><div><Label>Status padrão</Label><Select value={itemForm.defaultStatus} onValueChange={(defaultStatus) => setItemForm((current) => ({ ...current, defaultStatus }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="analyze">Analisar</SelectItem><SelectItem value="active">Ativo</SelectItem><SelectItem value="inactive">Inativo</SelectItem></SelectContent></Select></div><div className="flex items-center justify-between rounded-lg border p-3"><Label htmlFor="item-required">Obrigatório</Label><Switch id="item-required" checked={itemForm.required} onCheckedChange={(required) => setItemForm((current) => ({ ...current, required }))} /></div></div></div><DialogFooter><Button variant="outline" onClick={() => setItemOpen(false)}>Cancelar</Button><Button disabled={!itemForm.name.trim() || !itemForm.categoryId || !itemForm.routineTypeId || admin.saveItem.isPending} onClick={handleItemSave}>Salvar item</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={catalogOpen} onOpenChange={setCatalogOpen}><DialogContent><DialogHeader><DialogTitle>{catalogForm.id ? "Editar" : "Criar"} {catalogForm.kind === "category" ? "categoria" : "tipo"}</DialogTitle></DialogHeader><div className="space-y-4"><div><Label htmlFor="catalog-name">Nome</Label><Input id="catalog-name" value={catalogForm.name} onChange={(event) => setCatalogForm((current) => ({ ...current, name: event.target.value }))} /></div><div><Label htmlFor="catalog-description">Descrição</Label><Textarea id="catalog-description" value={catalogForm.description} onChange={(event) => setCatalogForm((current) => ({ ...current, description: event.target.value }))} /></div>{catalogForm.kind === "category" && <div><Label htmlFor="catalog-color">Cor de exibição</Label><div className="mt-1 flex gap-2"><Input id="catalog-color" type="color" className="w-14 p-1" value={catalogForm.color} onChange={(event) => setCatalogForm((current) => ({ ...current, color: event.target.value }))} /><Input value={catalogForm.color} onChange={(event) => setCatalogForm((current) => ({ ...current, color: event.target.value }))} /></div></div>}<div className="flex items-center justify-between rounded-lg border p-3"><Label htmlFor="catalog-active">Cadastro ativo</Label><Switch id="catalog-active" checked={catalogForm.active} onCheckedChange={(active) => setCatalogForm((current) => ({ ...current, active }))} /></div></div><DialogFooter><Button variant="outline" onClick={() => setCatalogOpen(false)}>Cancelar</Button><Button disabled={!catalogForm.name.trim() || admin.saveCategory.isPending || admin.saveType.isPending} onClick={handleCatalogSave}>Salvar</Button></DialogFooter></DialogContent></Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir “{deleting?.name}”?</AlertDialogTitle><AlertDialogDescription>{deleting?.kind === "item" ? "As configurações deste item nas rotinas aplicadas também serão removidas e a ação ficará registrada no histórico." : deleting?.kind === "model" ? "Modelos que já possuem aplicações não podem ser excluídos." : "Cadastros utilizados por itens não podem ser excluídos."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

function CatalogPanel({ kind, items, canManage, onCreate, onEdit, onDelete }: {
  kind: CatalogKind;
  items: Array<CsCxRoutineCategory | CsCxRoutineType>;
  canManage: boolean;
  onCreate: () => void;
  onEdit: (item: CsCxRoutineCategory | CsCxRoutineType) => void;
  onDelete: (item: CsCxRoutineCategory | CsCxRoutineType) => void;
}) {
  const label = kind === "category" ? "Categoria" : "Tipo";
  return <Card><CardHeader className="px-4 pb-2 pt-3"><div className="flex items-center justify-between gap-3"><div><CardTitle className="text-sm">{label}s de rotina</CardTitle><CardDescription className="text-xs">Cadastros usados para classificar os itens dos modelos.</CardDescription></div>{canManage && <Button className="h-8" size="sm" onClick={onCreate}><Plus className="mr-1.5 h-4 w-4" />Novo {label.toLocaleLowerCase("pt-BR")}</Button>}</div></CardHeader><CardContent className="grid max-h-[calc(100vh-330px)] gap-2 overflow-y-auto px-4 pb-4 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <div key={item.id} className="rounded-lg border px-3 py-2.5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-1.5">{kind === "category" && "display_color" in item && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.display_color }} />}<h3 className="truncate text-sm font-semibold" title={item.name}>{item.name}</h3></div><p className="mt-0.5 truncate text-[11px] text-muted-foreground" title={item.description || "Sem descrição"}>{item.description || "Sem descrição"}</p></div><Badge variant={item.active ? "default" : "secondary"} className="h-5 px-1.5 text-[10px] font-normal">{item.active ? "Ativo" : "Inativo"}</Badge></div><div className="mt-2 flex items-center justify-between"><span className="text-[11px] text-muted-foreground">{item.item_count} itens vinculados</span>{canManage && <div className="flex gap-0.5"><Button className="h-8 w-8" variant="ghost" size="icon" aria-label={`Editar ${item.name}`} onClick={() => onEdit(item)}><Pencil className="h-4 w-4" /></Button><Button className="h-8 w-8" variant="ghost" size="icon" aria-label={`Excluir ${item.name}`} disabled={item.item_count > 0} onClick={() => onDelete(item)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>}</div></div>)}{!items.length && <div className="col-span-full py-10 text-center text-sm text-muted-foreground">Nenhum cadastro encontrado.</div>}</CardContent></Card>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof Boxes; label: string; value: number }) {
  return <Card><CardContent className="flex items-center gap-2.5 px-3 py-2.5"><div className="rounded-lg bg-rose-50 p-1.5 text-rose-600 dark:bg-rose-950/40"><Icon className="h-4 w-4" /></div><div><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="text-xl font-black leading-6">{value}</p></div></CardContent></Card>;
}

function statusLabel(active: boolean | null) {
  return active === true ? "ativo" : active === false ? "inativo" : "analisar";
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Erro inesperado.";
}

function showError(toast: ReturnType<typeof useToast>["toast"], title: string, error: unknown) {
  toast({ title, description: messageOf(error), variant: "destructive" });
}
