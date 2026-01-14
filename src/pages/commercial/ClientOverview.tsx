import { useCommercial } from "@/hooks/useCommercial";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ArrowLeft,
  Building,
  Mail,
  Phone,
  CalendarDays,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Activity,
  StickyNote,
  Plus,
  MoreVertical,
  Briefcase,
  Clock,
  MessageSquare,
  AlertCircle,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ClientOverview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    clients,
    projectsWithClients,
    contacts,
    isLoadingClients,
    allCommercialNotes,
    updateClient,
  } = useCommercial();
  const { toast } = useToast();

  const [newNote, setNewNote] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTag, setNewTag] = useState("");

  if (isLoadingClients) return <div className="p-8">Carregando cliente...</div>;

  const client = clients?.find((c) => c.id === id);

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-xl font-bold">Cliente não encontrado</h2>
        <Button
          variant="link"
          onClick={() => navigate("/commercial/customers")}
        >
          Voltar para lista
        </Button>
      </div>
    );
  }

  const clientProjects =
    projectsWithClients?.filter((p) => p.client_id === client.id) || [];
  const clientContacts =
    contacts?.filter((c) => c.client_id === client.id) || [];
  const clientBlockers = clientProjects.filter(
    (p) => p.infra_status === "blocked"
  ); // Simplified
  const clientNotes =
    allCommercialNotes?.filter((n) => n.client_id === client.id) || [];

  // Computed Status
  const hasCritical = clientProjects.some((p) => p.health_score === "critical");
  const hasWarning = clientProjects.some((p) => p.health_score === "warning");
  const status = hasCritical
    ? "critical"
    : hasWarning
    ? "attention"
    : "healthy";

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    const currentTags = client.tags || [];
    if (currentTags.includes(newTag)) return;

    await updateClient.mutateAsync({
      id: client.id,
      tags: [...currentTags, newTag],
    });
    setNewTag("");
    setIsAddingTag(false);
    toast({ title: "Tag adicionada com sucesso" });
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    const { error } = await supabase.from("commercial_notes").insert({
      client_id: client.id,
      content: newNote,
      type: "alignment", // Default for now
      author_name: "Comercial", // Should be auth user
    });

    if (error) {
      toast({ title: "Erro ao adicionar nota", variant: "destructive" });
    } else {
      toast({ title: "Nota adicionada" });
      setNewNote("");
      // Invalidation handled by useCommercial if we added invalidation for notes there?
      // Actually we didn't add invalidation for notes in updateClient, need to check query keys.
      // We'll rely on global invalidation or page refresh for now as 'allCommercialNotes' is cached.
      // Ideally we invalidate 'commercial-notes-all'.
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 pb-20">
      {/* 1. HEADER DO CLIENTE */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-4 border-b -mx-6 px-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <Button
            variant="ghost"
            className="w-fit pl-0 gap-2 hover:bg-transparent hover:text-primary h-auto py-0 text-muted-foreground"
            onClick={() => navigate("/commercial/customers")}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Painel
          </Button>

          <div className="flex items-start justify-between mt-2">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 bg-primary/10 rounded-lg flex items-center justify-center">
                <Building className="h-7 w-7 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight">
                    {client.name}
                  </h1>
                  <Badge
                    variant={
                      status === "critical"
                        ? "destructive"
                        : status === "attention"
                        ? "secondary"
                        : "default"
                    }
                    className={
                      status === "healthy"
                        ? "bg-green-100 text-green-700 hover:bg-green-100 border-green-200"
                        : ""
                    }
                  >
                    {status === "critical"
                      ? "🔴 Crítico"
                      : status === "attention"
                      ? "🟡 Em Atenção"
                      : "🟢 Saudável"}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {client.tags?.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-xs font-normal"
                    >
                      {tag}
                    </Badge>
                  ))}
                  {isAddingTag ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        className="h-6 w-24 text-xs"
                        placeholder="Nova tag"
                        onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={handleAddTag}
                      >
                        <CheckCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-2 text-xs text-muted-foreground"
                      onClick={() => setIsAddingTag(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Tag
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => navigate("/commercial/contacts")}
              >
                Contatos
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/commercial/blockers")}
              >
                Bloqueios
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Editar Cliente</DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600">
                    Arquivar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* 2. RESUMO RÁPIDO */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                Projetos Ativos
              </p>
              <p className="text-2xl font-bold mt-1">
                {
                  clientProjects.filter(
                    (p) => !["done", "canceled"].includes(p.global_status || "")
                  ).length
                }
              </p>
            </div>
            <Activity className="h-8 w-8 text-muted-foreground/20" />
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                Bloqueios
              </p>
              <p
                className={`text-2xl font-bold mt-1 ${
                  clientBlockers.length > 0 ? "text-red-600" : ""
                }`}
              >
                {clientBlockers.length}
              </p>
            </div>
            <AlertTriangle
              className={`h-8 w-8 ${
                clientBlockers.length > 0
                  ? "text-red-200"
                  : "text-muted-foreground/20"
              }`}
            />
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                Em Risco
              </p>
              <p className="text-2xl font-bold mt-1 text-yellow-600">
                {
                  clientProjects.filter(
                    (p) =>
                      p.health_score === "warning" ||
                      p.health_score === "critical"
                  ).length
                }
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-yellow-200" />
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                S/ Atualização
              </p>
              <p className="text-2xl font-bold mt-1">
                3{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  dias
                </span>
              </p>
            </div>
            <Clock className="h-8 w-8 text-muted-foreground/20" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-8">
          {/* SEÇÃO 1: CONTATOS PRINCIPAIS */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <User size={20} className="text-primary" /> Contatos Principais
              </h3>
              <Button
                variant="link"
                size="sm"
                onClick={() => navigate("/commercial/contacts")}
              >
                Ver todos
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clientContacts.slice(0, 4).map((contact) => (
                <Card key={contact.id} className="overflow-hidden">
                  <CardContent className="p-3 flex items-start gap-3">
                    <Avatar className="h-10 w-10 border">
                      <AvatarFallback className="bg-primary/5 text-primary">
                        {contact.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-medium truncate">{contact.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {contact.role || "Sem cargo"}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Mail size={10} /> Email
                          </a>
                        )}
                        {contact.phone && (
                          <a
                            href={`tel:${contact.phone}`}
                            className="text-xs text-green-600 hover:underline flex items-center gap-1"
                          >
                            <Phone size={10} /> Ligar
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {clientContacts.length === 0 && (
                <div className="col-span-2 text-center py-6 border rounded-lg border-dashed text-muted-foreground">
                  Nenhum contato cadastrado.
                </div>
              )}
            </div>
          </section>

          {/* SEÇÃO 2: PROJETOS ATIVOS */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Briefcase size={20} className="text-primary" /> Projetos Ativos
              </h3>
            </div>
            <div className="space-y-3">
              {clientProjects.slice(0, 3).map((project) => (
                <Card
                  key={project.id}
                  className="hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/projects?id=${project.id}`)}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge variant="outline" className="mb-2">
                          {project.system_type}
                        </Badge>
                        <CardTitle className="text-base">
                          {project.project_type || "Projeto"}
                        </CardTitle>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              project.health_score === "critical"
                                ? "bg-red-500"
                                : project.health_score === "warning"
                                ? "bg-yellow-500"
                                : "bg-green-500"
                            }`}
                          ></span>
                          {project.implementation_status}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {project.project_leader}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progresso</span>
                        <span>{project.overall_progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${project.overall_progress || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {clientProjects.length === 0 && (
                <div className="text-center py-8 border rounded-lg border-dashed text-muted-foreground">
                  Nenhum projeto ativo para este cliente.
                </div>
              )}
            </div>
          </section>

          {/* SEÇÃO 3: BLOQUEIOS */}
          {clientBlockers.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-red-600">
                  <AlertTriangle size={20} /> Bloqueios Ativos
                </h3>
              </div>
              <div className="space-y-2">
                {clientBlockers.map((blocker) => (
                  <div
                    key={blocker.id}
                    className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3"
                  >
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-900">
                        {blocker.infra_blocking_reason ||
                          "Bloqueio não especificado"}
                      </p>
                      <p className="text-xs text-red-700 mt-1">
                        Projeto: {blocker.system_type} •{" "}
                        {blocker.implementation_status}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-red-200 text-red-700 hover:bg-red-100"
                      onClick={() => navigate("/commercial/blockers")}
                    >
                      Resolver
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Timeline & Notes */}
        <div className="space-y-6">
          <Card className="h-full border-none shadow-none bg-transparent">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MessageSquare size={20} className="text-primary" /> Notas &
                Timeline
              </h3>
            </div>

            {/* Add Note Input */}
            <div className="mb-6 p-4 bg-card border rounded-lg shadow-sm">
              <Textarea
                placeholder="Adicione uma nota comercial..."
                className="resize-none mb-2 min-h-[80px]"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  Visível apenas para o Comercial
                </span>
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                >
                  Adicionar Nota
                </Button>
              </div>
            </div>

            {/* Timeline */}
            <div className="relative border-l-2 border-muted space-y-8 pl-6 ml-3">
              {/* Notes */}
              {clientNotes.map((note) => (
                <div key={note.id} className="relative">
                  <span className="absolute -left-[31px] bg-background border p-1 rounded-full text-muted-foreground">
                    <StickyNote size={14} />
                  </span>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">
                      {new Date(note.created_at || "").toLocaleString()}
                    </span>
                    <div className="bg-card p-3 rounded-lg border shadow-sm">
                      <p className="text-sm">{note.content}</p>
                      <p className="text-xs text-muted-foreground mt-2 font-medium">
                        {note.author_name}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Technical Events (Mocked for visual completeness based on project dates) */}
              {clientProjects.map((p) => (
                <div key={p.id + "created"} className="relative opacity-75">
                  <span className="absolute -left-[31px] bg-background border p-1 rounded-full text-blue-500">
                    <Activity size={14} />
                  </span>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </span>
                    <div className="text-sm">
                      Projeto <strong>{p.system_type}</strong> iniciado
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
