import { useState, useEffect, useMemo, useRef } from "react";
import { ProjectV2 } from "@/types/ProjectV2";
import { EnrichedInfraProject, InfraFilterType } from "./types";
import { enrichInfraProjects, exportStandaloneHTML } from "./utils";
import { InfraProgressKPIs } from "./InfraProgressKPIs";
import { InfraProgressProjectCard } from "./InfraProgressProjectCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Printer,
  Download,
  Upload,
  FileCode,
  X,
  Server,
} from "lucide-react";
import { toast } from "sonner";

interface InfraProgressReportTabProps {
  projects: ProjectV2[];
}

export function InfraProgressReportTab({ projects }: InfraProgressReportTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<InfraFilterType>("all");
  const [observations, setObservations] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Enrich projects from live data
  const enrichedProjects = useMemo(() => enrichInfraProjects(projects), [projects]);

  // 2. Pre-load observations from localStorage
  useEffect(() => {
    const loaded: Record<string, string> = {};
    enrichedProjects.forEach((p) => {
      const key = `siplan_infra_obs_${p.ticketNumber.replace("#", "")}`;
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        loaded[p.ticketNumber] = saved;
      } else if (p.existingObservations) {
        loaded[p.ticketNumber] = p.existingObservations;
      } else {
        loaded[p.ticketNumber] = "";
      }
    });
    setObservations(loaded);
  }, [enrichedProjects]);

  // Save observation to state & localStorage
  const handleSaveObservation = (ticketNumber: string, value: string) => {
    setObservations((prev) => ({ ...prev, [ticketNumber]: value }));
    const key = `siplan_infra_obs_${ticketNumber.replace("#", "")}`;
    localStorage.setItem(key, value);
  };

  // Filter & Search logic
  const filteredProjects = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return enrichedProjects.filter((p) => {
      const p1 = p.phase1;
      const obs = (observations[p.ticketNumber] || "").trim();

      // Preset Filter
      if (activeFilter === "blocked" && p.infraStatus !== "blocked") return false;
      if (activeFilter === "in-progress" && p.infraStatus !== "in-progress") return false;
      if (activeFilter === "phase1-scheduled" && !p1.hasDates) return false;
      if (activeFilter === "phase1-none" && p1.hasDates) return false;
      if (activeFilter === "with-notes" && !obs) return false;

      // Search Query
      if (q) {
        const matchClient = p.clientName.toLowerCase().includes(q);
        const matchTicket = p.ticketNumber.toLowerCase().includes(q);
        const matchSystem = p.systemType.toLowerCase().includes(q);
        const matchStatus = p.statusFormatted.toLowerCase().includes(q);
        const matchObs = obs.toLowerCase().includes(q);
        const matchRespInfra = p.responsibleInfra.toLowerCase().includes(q);
        const matchRespP1 = (p1.responsible || "").toLowerCase().includes(q);
        const matchP1Dates = (p1.startDate || "").includes(q) || (p1.endDate || "").includes(q);

        if (
          !matchClient &&
          !matchTicket &&
          !matchSystem &&
          !matchStatus &&
          !matchObs &&
          !matchRespInfra &&
          !matchRespP1 &&
          !matchP1Dates
        ) {
          return false;
        }
      }

      return true;
    });
  }, [enrichedProjects, activeFilter, searchQuery, observations]);

  // Count notes filled
  const notesCount = useMemo(() => {
    return Object.values(observations).filter((v) => v && v.trim().length > 0).length;
  }, [observations]);

  // Export JSON backup
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(observations, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `observacoes_infra_siplan_hub_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("Anotações exportadas em JSON!");
  };

  // Import JSON backup
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (typeof imported === "object" && imported !== null) {
          Object.entries(imported).forEach(([ticket, text]) => {
            if (typeof text === "string") {
              handleSaveObservation(ticket, text);
            }
          });
          toast.success("Anotações importadas e salvas com sucesso!");
        }
      } catch {
        toast.error("Arquivo JSON inválido.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Export Standalone HTML with observations baked in
  const handleDownloadStandaloneHTML = () => {
    exportStandaloneHTML(enrichedProjects, observations);
    toast.success("Arquivo HTML baixado com todas as suas anotações salvas dentro dele!");
  };

  // Print PDF
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/60 backdrop-blur-sm border border-border/80 rounded-xl p-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-1 bg-primary rounded-full" />
            <h3 className="text-base sm:text-lg font-black tracking-tight text-foreground flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" />
              <span>Relatório Andamento Infraestrutura</span>
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Auditoria em tempo real da Etapa 1 (Infraestrutura) e Cronograma da Fase 1 (Treinamento & Acompanhamento).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJSON}
            className="h-8 text-xs font-semibold gap-1.5"
            title="Exportar anotações em arquivo JSON de backup"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Exportar Notas</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="h-8 text-xs font-semibold gap-1.5"
            title="Importar anotações salvas em JSON"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Importar</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportJSON}
            />
          </Button>

          {/* BAIXAR HTML COM NOTAS */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadStandaloneHTML}
            className="h-8 text-xs font-bold gap-1.5 bg-primary/5 hover:bg-primary/10 border-primary/30 text-foreground"
            title="Baixar uma cópia em arquivo HTML autônomo com todas as anotações preenchidas para enviar a qualquer pessoa"
          >
            <FileCode className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Baixar HTML com Notas</span>
            <span className="sm:hidden">Baixar HTML</span>
          </Button>

          {/* IMPRIMIR / PDF */}
          <Button
            size="sm"
            onClick={handlePrintPDF}
            className="h-8 text-xs font-bold gap-1.5 shadow-sm"
            title="Imprimir ou salvar este relatório em PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Salvar / Exportar PDF</span>
          </Button>
        </div>
      </div>

      {/* KPI METRICS BAR */}
      <InfraProgressKPIs projects={enrichedProjects} notesCount={notesCount} />

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-card/60 backdrop-blur-sm border border-border/80 rounded-xl p-3.5 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Live Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar por cliente, cartório, #chamado, sistema ou responsável..."
              className="pl-9 pr-8 h-9 text-xs sm:text-sm bg-background/50 focus:bg-background border-border"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                title="Limpar pesquisa"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 shrink-0">
            <Button
              variant={activeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("all")}
              className="h-8 text-xs font-bold px-2.5"
            >
              Todos ({enrichedProjects.length})
            </Button>
            <Button
              variant={activeFilter === "blocked" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("blocked")}
              className="h-8 text-xs font-bold px-2.5 text-rose-600 dark:text-rose-400"
            >
              🔴 Bloqueados ({enrichedProjects.filter((p) => p.infraStatus === "blocked").length})
            </Button>
            <Button
              variant={activeFilter === "in-progress" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("in-progress")}
              className="h-8 text-xs font-bold px-2.5 text-amber-600 dark:text-amber-400"
            >
              🟡 Em Andamento ({enrichedProjects.filter((p) => p.infraStatus === "in-progress").length})
            </Button>
            <Button
              variant={activeFilter === "phase1-scheduled" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("phase1-scheduled")}
              className="h-8 text-xs font-bold px-2.5 text-emerald-600 dark:text-emerald-400"
            >
              📅 Fase 1 Agendada ({enrichedProjects.filter((p) => p.phase1.hasDates).length})
            </Button>
            <Button
              variant={activeFilter === "phase1-none" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("phase1-none")}
              className="h-8 text-xs font-bold px-2.5"
            >
              ⚠️ Fase 1 Sem Data ({enrichedProjects.filter((p) => !p.phase1.hasDates).length})
            </Button>
            <Button
              variant={activeFilter === "with-notes" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("with-notes")}
              className="h-8 text-xs font-bold px-2.5"
            >
              📝 Com Notas ({notesCount})
            </Button>
          </div>
        </div>

        {/* Counter Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/60">
          <div>
            Exibindo <strong className="text-foreground">{filteredProjects.length}</strong> de{" "}
            {enrichedProjects.length} projetos
          </div>
          {(searchQuery || activeFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setActiveFilter("all");
              }}
              className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            >
              Limpar Filtros
            </Button>
          )}
        </div>
      </div>

      {/* CARDS LIST */}
      {filteredProjects.length > 0 ? (
        <div className="space-y-3">
          {filteredProjects.map((p) => (
            <InfraProgressProjectCard
              key={p.project.id}
              project={p}
              observation={observations[p.ticketNumber] || ""}
              onSaveObservation={handleSaveObservation}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-card/40 border border-border/80 rounded-xl p-8">
          <div className="w-12 h-12 rounded-full bg-muted text-muted-foreground mx-auto flex items-center justify-center text-xl mb-3">
            🔍
          </div>
          <h4 className="text-sm font-bold text-foreground">Nenhum projeto encontrado</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Nenhum projeto corresponde ao filtro ou busca selecionada.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setActiveFilter("all");
            }}
            className="mt-4 text-xs font-semibold"
          >
            Restaurar Filtros
          </Button>
        </div>
      )}
    </div>
  );
}
