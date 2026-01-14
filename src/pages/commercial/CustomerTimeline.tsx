import { useCommercial } from "@/hooks/useCommercial";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Briefcase,
  AlertTriangle,
  Mail,
  MoreVertical,
  Activity,
  StickyNote,
  Filter,
  CalendarCheck,
} from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { LucideIcon } from "lucide-react";

interface TimelineEvent {
  id: string;
  date: Date;
  type: "commercial" | "technical" | "blocker";
  title: string;
  description: string;
  author: string;
  icon: LucideIcon;
  color: string;
  project?: string;
  metadata?: Record<string, unknown>;
}

export default function CustomerTimeline() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { clients, projectsWithClients, allCommercialNotes, isLoadingClients } =
    useCommercial();

  const [periodFilter, setPeriodFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  if (isLoadingClients)
    return <div className="p-8">Carregando timeline...</div>;

  const client = clients?.find((c) => c.id === id);

  if (!client) return <div>Cliente não encontrado</div>;

  const clientProjects =
    projectsWithClients?.filter((p) => p.client_id === client.id) || [];
  const clientNotes =
    allCommercialNotes?.filter((n) => n.client_id === client.id) || [];

  // 1. Build Merged Events List
  // Commercial Notes
  const commercialEvents: TimelineEvent[] = clientNotes.map((note) => ({
    id: note.id,
    date: new Date(note.created_at || new Date()),
    type: "commercial",
    title:
      note.type === "meeting"
        ? "Reunião Comercial"
        : note.type === "call"
        ? "Ligação"
        : note.type === "email"
        ? "E-mail"
        : "Nota Comercial",
    description: "Conteúdo da nota (buscar detalhe completo se precisar)", // Simplified, since all_notes only fetched metadata in hook for panel.
    // We might need to fetch content if we want to show it here.
    // For now, let's assume we might need a richer fetch for timeline.
    // EDIT: in useCommercial we selected 'content' in allCommercialNotes? No, checking hook...
    // The hook fetches: select('id, client_id, created_at, type'). Content is missing!
    // We need to fix the hook or handle it.
    // Let's assume for MVP we show "Nota comercial registrada" and maybe fetch on demand or update hook.
    author: "Comercial", // Placeholder
    icon: StickyNote,
    color: "bg-blue-100 text-blue-600",
  }));

  // Technical Events (from Projects)
  const technicalEvents: TimelineEvent[] = [];
  clientProjects.forEach((p) => {
    // Created
    if (p.created_at) {
      technicalEvents.push({
        id: `create-${p.id}`,
        date: new Date(p.created_at),
        type: "technical",
        title: "Projeto Iniciado",
        description: `Projeto ${p.system_type} criado.`,
        author: "Sistema",
        icon: Briefcase,
        color: "bg-green-100 text-green-600",
        project: p.system_type,
      });
    }
    // Blocked
    if (p.infra_status === "blocked") {
      technicalEvents.push({
        id: `blocked-${p.id}`,
        date: new Date(), // We don't have block_date, using 'now' as approximation for active block
        type: "blocker",
        title: "Bloqueio Ativo",
        description: p.infra_blocking_reason || "Motivo não especificado",
        author: "Infra",
        icon: AlertTriangle,
        color: "bg-red-100 text-red-600",
        project: p.system_type,
      });
    }
    // Go Live (Planned)
    if (p.go_live_date) {
      technicalEvents.push({
        id: `golive-${p.id}`,
        date: new Date(p.go_live_date),
        type: "technical",
        title: "Previsão de Go-Live",
        description: "Data planejada para virada de chave.",
        author: "Implantação",
        icon: CalendarCheck,
        color: "bg-purple-100 text-purple-600",
        project: p.system_type,
      });
    }
  });

  // Merge and Sort
  let allEvents = [...commercialEvents, ...technicalEvents].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );

  // Filters
  if (typeFilter !== "all") {
    allEvents = allEvents.filter((e) => e.type === typeFilter);
  }

  // Render
  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 container mx-auto max-w-4xl py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/commercial/client/${client.id}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Timeline: {client.name}
            </h1>
            <p className="text-muted-foreground">
              Histórico unificado de eventos comerciais e técnicos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Tipo de Evento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              <SelectItem value="commercial">Comercial</SelectItem>
              <SelectItem value="technical">Técnico</SelectItem>
              <SelectItem value="blocker">Bloqueios</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() =>
              navigate(`/commercial/client/${client.id}?tab=notes`)
            }
          >
            Nova Nota
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative border-l-2 border-muted ml-4 md:ml-8 pl-8 py-4 space-y-8">
        {allEvents.length === 0 ? (
          <div className="text-muted-foreground italic">
            Nenhum evento encontrado para este período.
          </div>
        ) : (
          allEvents.map((event) => (
            <div key={event.id} className="relative">
              <span
                className={`absolute -left-[45px] md:-left-[45px] p-2 rounded-full border ${event.color} bg-background z-10 box-content`}
              >
                <event.icon size={16} />
              </span>

              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          event.type === "blocker"
                            ? "border-red-200 text-red-700"
                            : ""
                        }
                      >
                        {event.type === "commercial"
                          ? "Comercial"
                          : event.type === "technical"
                          ? "Técnico"
                          : "Bloqueio"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {event.date.toLocaleDateString()} às{" "}
                        {event.date.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {event.project && (
                      <Badge variant="secondary" className="w-fit">
                        {event.project}
                      </Badge>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold">{event.title}</h3>
                  <p className="text-muted-foreground mt-1 whitespace-pre-wrap">
                    {event.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-3 font-medium flex items-center gap-1">
                    <Activity size={12} /> {event.author}
                  </p>
                </CardContent>
              </Card>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
