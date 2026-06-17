import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Plus, Search, FileText, Trash2, Copy, CheckCircle2,
  Building2, User, Clock, Eye, ClipboardCheck, ExternalLink, ShieldCheck,
  ChevronsUpDown, Check, Settings
} from "lucide-react";
import { useCommercialChecklists, type CommercialChecklistRecord } from "@/hooks/useCommercialChecklists";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FormRenderer } from "@/components/FormRenderer/FormRenderer";

export default function CommercialChecklists() {
  const { checklists, isLoading: isLoadingChecklists, createChecklist, deleteChecklist } = useCommercialChecklists();
  const { projects, isLoading: isLoadingProjects } = useProjectsV2();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [comboboxOpen, setComboboxOpen] = useState(false);
  
  const [viewChecklist, setViewChecklist] = useState<CommercialChecklistRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // If there's a ?view=<checklistId> query parameter, open that checklist details
  const viewParam = searchParams.get("view");
  useEffect(() => {
    if (viewParam && checklists.length > 0) {
      const found = checklists.find(c => c.id === viewParam);
      if (found) {
        setViewChecklist(found);
      }
    }
  }, [viewParam, checklists]);

  // Query the template associated with the viewChecklist
  const { data: viewTemplate, isLoading: isLoadingViewTemplate } = useQuery({
    queryKey: ["viewChecklistTemplate", viewChecklist?.template_id],
    queryFn: async () => {
      if (!viewChecklist?.template_id) return null;
      const { data, error } = await supabase
        .from("form_templates")
        .select("*")
        .eq("id", viewChecklist.template_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!viewChecklist?.template_id,
  });

  const handleOpenView = (checklist: CommercialChecklistRecord) => {
    setViewChecklist(checklist);
    setSearchParams({ view: checklist.id });
  };

  const handleCloseView = () => {
    setViewChecklist(null);
    setSearchParams({});
  };

  // Filter projects for the dropdown:
  // Must be in-progress, not in post stage done/in-progress, and doesn't already have a checklist created.
  const projectsWithChecklist = new Set(checklists.map(c => c.project_id));
  const eligibleProjects = projects.filter(
    (proj) =>
      proj.globalStatus === "in-progress" &&
      proj.stages?.post?.status !== "done" &&
      proj.stages?.post?.status !== "in-progress" &&
      !projectsWithChecklist.has(proj.id)
  );

  const handleCreate = () => {
    if (!selectedProjectId) {
      toast({ title: "Atenção", description: "Selecione um projeto para continuar.", variant: "destructive" });
      return;
    }

    createChecklist.mutate(selectedProjectId, {
      onSuccess: () => {
        setCreateDialogOpen(false);
        setSelectedProjectId("");
        // Show success notification and scroll to the new card
        toast({ title: "Criado!", description: "Checklist criado e pronto para envio." });
      }
    });
  };

  const handleCopyLink = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const link = `${window.location.origin}/public/checklist/${id}`;
    await navigator.clipboard.writeText(link);
    setCopiedId(id);
    toast({ title: "Link Copiado", description: "O link do checklist foi copiado para a área de transferência." });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Excluir este checklist permanentemente? O cliente não poderá mais respondê-lo.")) {
      deleteChecklist.mutate(id);
    }
  };

  const filteredChecklists = checklists.filter((item) => {
    const query = search.toLowerCase();
    const clientName = item.projects?.clientName?.toLowerCase() || "";
    const systemType = item.projects?.systemType?.toLowerCase() || "";
    const ticketNumber = item.projects?.ticketNumber?.toLowerCase() || "";
    const createdBy = item.created_by_name?.toLowerCase() || "";
    return (
      clientName.includes(query) ||
      systemType.includes(query) ||
      ticketNumber.includes(query) ||
      createdBy.includes(query)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-[calc(100vh-6rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Checklists de Implantação
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie e envie checklists estruturais para seus clientes</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={() => navigate("/commercial/checklists/questions")}
            className="border-muted-foreground/30 bg-card gap-2"
          >
            <Settings className="h-4 w-4" />
            Editar Perguntas
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 gap-2 shadow-lg shadow-indigo-500/20">
            <Plus className="h-4 w-4" />
            Novo Checklist
          </Button>
        </div>
      </div>

      {/* Stats row */}
      {checklists.length > 0 && (
        <div className="flex flex-wrap gap-3 shrink-0">
          {[
            { label: "Total", value: checklists.length, icon: FileText, color: "text-indigo-500" },
            { label: "Aguardando Resposta", value: checklists.filter(c => c.status === "pending").length, icon: Clock, color: "text-amber-500" },
            { label: "Respondidos", value: checklists.filter(c => c.status === "submitted").length, icon: CheckCircle2, color: "text-emerald-500" },
          ].map(stat => (
            <div key={stat.label} className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 border text-sm shadow-sm">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="font-bold">{stat.value}</span>
              <span className="text-muted-foreground text-xs">{stat.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente, sistema, chamado ou quem criou..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 bg-card/60"
        />
      </div>

      {/* List content */}
      <div className="flex-1 overflow-y-auto pr-1 -mr-1">
        {isLoadingChecklists || isLoadingProjects ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
              <p className="text-sm text-muted-foreground">Carregando checklists...</p>
            </div>
          </div>
        ) : filteredChecklists.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-2xl bg-muted/10 h-[280px]">
            <div className="p-4 rounded-full bg-indigo-50 dark:bg-indigo-950/30 mb-4">
              <ClipboardCheck className="h-10 w-10 text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold">Nenhum checklist encontrado</h3>
            <p className="text-muted-foreground text-sm max-w-sm mt-1">
              {search ? "Tente buscar por outro termo." : "Crie o primeiro checklist de implantação para enviar ao cliente."}
            </p>
            {!search && (
              <Button onClick={() => setCreateDialogOpen(true)} className="mt-4 bg-indigo-600 hover:bg-indigo-700 gap-2">
                <Plus className="h-4 w-4" /> Criar primeiro checklist
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 pb-8">
            {filteredChecklists.map((item) => {
              const isSubmitted = item.status === "submitted";
              return (
                <Card
                  key={item.id}
                  className="overflow-hidden hover:shadow-xl transition-all duration-200 cursor-pointer group bg-card border hover:border-indigo-300 dark:hover:border-indigo-700 hover:-translate-y-0.5"
                  onClick={() => handleOpenView(item)}
                >
                  <div className={`h-1.5 w-full ${isSubmitted ? "bg-emerald-500" : "bg-blue-500"}`} />
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-base leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                          {item.projects?.clientName || "Projeto Removido"}
                        </h3>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {item.projects?.systemType && (
                            <Badge variant="outline" className="text-[11px] px-2 py-0">{item.projects.systemType}</Badge>
                          )}
                          {item.projects?.ticketNumber && (
                            <Badge variant="secondary" className="text-[11px] font-mono px-2 py-0">#{item.projects.ticketNumber}</Badge>
                          )}
                          {isSubmitted ? (
                            <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[11px] px-2 py-0">
                              Respondido
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[11px] px-2 py-0">
                              Aguardando
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 shrink-0"
                        onClick={(e) => handleDelete(item.id, e)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground border-t pt-2.5">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate" title={item.created_by_name}>Criado por {item.created_by_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-end">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span>{new Date(item.created_at).toLocaleDateString("pt-BR")}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t mt-1">
                      {isSubmitted ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-1.5 h-8 text-xs hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400"
                          onClick={(e) => { e.stopPropagation(); handleOpenView(item); }}
                        >
                          <Eye className="h-3.5 w-3.5" /> Ver Respostas
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-1.5 h-8 text-xs hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-400"
                            onClick={(e) => handleCopyLink(item.id, e)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                            {copiedId === item.id ? "Copiado!" : "Copiar Link"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 px-0"
                            title="Acessar Formulário"
                            asChild
                          >
                            <a
                              href={`/public/checklist/${item.id}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                            </a>
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog for creating a checklist */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Gerar Novo Checklist</DialogTitle>
            <DialogDescription>
              Selecione um projeto em andamento. O checklist irá coletar dados da serventia e será preenchido pelo cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2 flex flex-col">
              <Label htmlFor="projectSelect" className="text-xs font-bold uppercase text-muted-foreground mb-1">Projeto Ativo *</Label>
              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen} modal={true}>
                <PopoverTrigger asChild>
                  <Button
                    id="projectSelect"
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboboxOpen}
                    className="w-full justify-between font-normal text-left h-auto min-h-10 py-2 border-muted-foreground/30 bg-card whitespace-normal pr-4"
                  >
                    {selectedProjectId ? (
                      (() => {
                        const proj = eligibleProjects.find(p => p.id === selectedProjectId);
                        return proj ? `${proj.clientName} (#${proj.ticketNumber} - ${proj.systemType})` : "Selecione o projeto...";
                      })()
                    ) : (
                      "Selecione o projeto em andamento..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[350px] max-w-[90vw] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Pesquisar projeto..." />
                    <CommandList className="max-h-60 overflow-y-auto">
                      <CommandEmpty>Nenhum projeto encontrado.</CommandEmpty>
                      <CommandGroup>
                        {eligibleProjects.length === 0 ? (
                          <div className="py-2 px-3 text-xs text-muted-foreground">Nenhum projeto qualificado sem checklist</div>
                        ) : (
                          eligibleProjects.map((proj) => (
                            <CommandItem
                              key={proj.id}
                              value={`${proj.clientName} ${proj.ticketNumber} ${proj.systemType}`}
                              onSelect={() => {
                                setSelectedProjectId(proj.id);
                                setComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4 shrink-0",
                                  selectedProjectId === proj.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col flex-1 min-w-0 pr-2 py-0.5">
                                <span className="font-semibold text-sm whitespace-normal leading-snug">{proj.clientName}</span>
                                <span className="text-xs text-muted-foreground font-mono">
                                  #{proj.ticketNumber} • {proj.systemType}
                                </span>
                              </div>
                            </CommandItem>
                          ))
                        )}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={createChecklist.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {createChecklist.isPending ? "Processando..." : "Gerar Checklist"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog for viewing checklist responses */}
      {viewChecklist && (
        <Dialog open={!!viewChecklist} onOpenChange={(open) => { if (!open) handleCloseView(); }}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader className="border-b pb-3 mb-4">
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-500" />
                Checklist - {viewChecklist.projects?.clientName || "Dados do Cartório"}
              </DialogTitle>
              <DialogDescription>
                Respostas enviadas pelo cliente. ID do checklist: <span className="font-mono text-xs select-all bg-muted px-1.5 py-0.5 rounded">{viewChecklist.id}</span>
              </DialogDescription>
            </DialogHeader>

            {viewChecklist.status === "pending" ? (
              <div className="flex flex-col items-center justify-center p-8 text-center bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl text-amber-800 dark:text-amber-200">
                <Clock className="h-10 w-10 text-amber-500 animate-pulse mb-3" />
                <h4 className="font-bold">Aguardando Resposta do Cliente</h4>
                <p className="text-xs text-muted-foreground max-w-sm mt-1">
                  Este checklist foi criado mas ainda não foi respondido. Envie o link abaixo para o cliente:
                </p>
                <div className="flex items-center gap-2 mt-4 max-w-full w-full bg-background border p-2 rounded-lg">
                  <span className="text-xs truncate text-left flex-1 font-mono">{`${window.location.origin}/public/checklist/${viewChecklist.id}`}</span>
                  <Button size="sm" variant="secondary" className="gap-1" onClick={(e) => handleCopyLink(viewChecklist.id, e)}>
                    <Copy className="h-3 w-3" /> Copiar
                  </Button>
                </div>
              </div>
            ) : viewChecklist.template_id ? (
              <div className="space-y-6">
                {/* IDENTIFICAÇÃO CARD */}
                <div className="bg-muted/30 rounded-xl p-4 border space-y-3">
                  <div className="flex items-center gap-2 border-b pb-2 mb-2">
                    <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dados de Identificação</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground block font-medium">Sistema a Implantar</span>
                      <span className="font-semibold">{viewChecklist.projects?.systemType || "Não cadastrado"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block font-medium">Nome do Cartório</span>
                      <span className="font-semibold">{viewChecklist.projects?.clientName || "Não cadastrado"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block font-medium">Responsável Siplan HUB</span>
                      <span className="font-semibold">{viewChecklist.created_by_name || "Comercial"}</span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-xl p-6 bg-card">
                  {isLoadingViewTemplate || !viewTemplate ? (
                    <div className="flex flex-col items-center justify-center p-8 gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
                      <span className="text-xs text-muted-foreground">Carregando perguntas dinâmicas...</span>
                    </div>
                  ) : (
                    <FormRenderer
                      projectId={viewChecklist.project_id}
                      schema={viewTemplate.schema_json}
                      uiSchema={viewTemplate.ui_json}
                      formData={viewChecklist.responses}
                      readonly={true}
                      onSubmit={() => {}}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* IDENTIFICAÇÃO CARD */}
                <div className="bg-muted/30 rounded-xl p-4 border space-y-3">
                  <div className="flex items-center gap-2 border-b pb-2 mb-2">
                    <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dados de Identificação</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground block font-medium">Sistema a Implantar</span>
                      <span className="font-semibold">{viewChecklist.projects?.systemType || "Não cadastrado"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block font-medium">Nome do Cartório</span>
                      <span className="font-semibold">{viewChecklist.projects?.clientName || "Não cadastrado"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block font-medium">Responsável Siplan HUB</span>
                      <span className="font-semibold">{viewChecklist.created_by_name || "Comercial"}</span>
                    </div>
                  </div>
                </div>

                {/* RESPONSAVEL PREENCHIMENTO */}
                <div className="border rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b pb-2">Responsável pelo Preenchimento</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground block font-medium">Nome Completo</span>
                      <span className="font-semibold text-foreground">{viewChecklist.responses.fullname || "—"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block font-medium">Cargo/Função</span>
                      <span className="font-semibold text-foreground">{viewChecklist.responses.role || "—"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block font-medium">E-mail</span>
                      <span className="font-semibold text-foreground">{viewChecklist.responses.email || "—"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block font-medium">Telefones/WhatsApp</span>
                      <div className="flex flex-wrap gap-1.5 mt-0.5">
                        {Array.isArray(viewChecklist.responses.phones) && viewChecklist.responses.phones.length > 0 ? (
                          viewChecklist.responses.phones.map((p: string, idx: number) => (
                            <Badge key={idx} variant="secondary" className="font-mono text-xs">{p}</Badge>
                          ))
                        ) : (
                          <span className="font-semibold text-foreground">—</span>
                        )}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs text-muted-foreground block font-medium">Data do Preenchimento</span>
                      <span className="font-semibold text-foreground">
                        {viewChecklist.responses.fill_date ? new Date(viewChecklist.responses.fill_date).toLocaleDateString("pt-BR") : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ESTRUTURA FISICA */}
                <div className="border rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b pb-2">Estrutura Física e Organizacional</h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground block font-medium">Quantos andares possui a serventia?</span>
                      <span className="font-semibold text-foreground">{viewChecklist.responses.floors || "—"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block font-medium">Observação</span>
                      <p className="mt-1 text-foreground/80 bg-muted/20 p-2.5 rounded-lg border text-xs whitespace-pre-wrap">{viewChecklist.responses.structure_obs || "Sem observações."}</p>
                    </div>
                  </div>
                </div>

                {/* SETORES */}
                <div className="border rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b pb-2">Distribuição por setores</h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground block font-medium">Quais setores existem no estabelecimento?</span>
                      <span className="font-semibold text-foreground">{viewChecklist.responses.sectors || "—"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block font-medium">Como os setores estão distribuídos nos andares?</span>
                      <p className="mt-1 text-foreground/80 bg-muted/20 p-2.5 rounded-lg border text-xs whitespace-pre-wrap">{viewChecklist.responses.sectors_distribution || "—"}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block font-medium">Observação</span>
                      <p className="mt-1 text-foreground/80 bg-muted/20 p-2.5 rounded-lg border text-xs whitespace-pre-wrap">{viewChecklist.responses.sectors_obs || "Sem observações."}</p>
                    </div>
                  </div>
                </div>

                {/* COLABORADORES */}
                <div className="border rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b pb-2">Estrutura de Colaboradores</h4>
                  
                  {/* Key People list */}
                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground block font-medium">Pessoa(s) Chave(s) para comunicação na Serventia</span>
                    {Array.isArray(viewChecklist.responses.key_people) && viewChecklist.responses.key_people.length > 0 ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {viewChecklist.responses.key_people.map((person: { name: string; role: string; contact: string }, idx: number) => (
                          <div key={idx} className="bg-muted/40 p-2.5 rounded-lg border text-xs space-y-1">
                            <div><strong className="text-muted-foreground">Nome:</strong> <span className="font-medium text-foreground">{person.name}</span></div>
                            <div><strong className="text-muted-foreground">Cargo:</strong> <span className="font-medium text-foreground">{person.role}</span></div>
                            <div><strong className="text-muted-foreground">Contato:</strong> <span className="font-medium text-foreground font-mono">{person.contact}</span></div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Nenhuma cadastrada.</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-2">
                    <div className="col-span-2">
                      <span className="text-xs text-muted-foreground block font-medium">Quantidade de colaboradores por setor</span>
                      <p className="mt-1 text-foreground/80 bg-muted/20 p-2.5 rounded-lg border text-xs whitespace-pre-wrap">{viewChecklist.responses.employees_by_sector || "—"}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block font-medium">Quantidade total de colaboradores</span>
                      <span className="font-semibold text-foreground">{viewChecklist.responses.total_employees || "—"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block font-medium">Equipe ciente da mudança de sistema?</span>
                      <Badge variant="secondary" className="font-bold text-xs">{viewChecklist.responses.aware_of_change || "—"}</Badge>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs text-muted-foreground block font-medium">Como a equipe lida com mudanças ou sistemas novos?</span>
                      <p className="mt-1 text-foreground/80 bg-muted/20 p-2.5 rounded-lg border text-xs whitespace-pre-wrap">{viewChecklist.responses.team_adaptability || "—"}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs text-muted-foreground block font-medium">Observação</span>
                      <p className="mt-1 text-foreground/80 bg-muted/20 p-2.5 rounded-lg border text-xs whitespace-pre-wrap">{viewChecklist.responses.employees_obs || "Sem observações."}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t pt-4 mt-6">
              <Button variant="outline" size="sm" onClick={handleCloseView}>Fechar</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
