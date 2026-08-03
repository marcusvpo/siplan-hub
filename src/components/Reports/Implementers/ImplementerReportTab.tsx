import { useState, useMemo } from "react";
import { useImplementerReport } from "@/hooks/useImplementerReport";
import { ImplementerSelector } from "./ImplementerSelector";
import { ImplementerHeaderBanner } from "./ImplementerHeaderBanner";
import { ImplementerKPIs } from "./ImplementerKPIs";
import { ImplementerPhase1ConsolidatedTable } from "./ImplementerPhase1ConsolidatedTable";
import { ImplementerPhase1Fichas } from "./ImplementerPhase1Fichas";
import { ImplementerAllCartoriosTable } from "./ImplementerAllCartoriosTable";
import { ImplementerSignaturesBlock } from "./ImplementerSignaturesBlock";
import { ImplementerCharts } from "./ImplementerCharts";
import { ImplementerStageAnalysis } from "./ImplementerStageAnalysis";
import { ImplementerPhaseMetrics } from "./ImplementerPhaseMetrics";
import { ImplementerPDFExport } from "./ImplementerPDFExport";
import { Loader2, Users, BarChart3, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export function ImplementerReportTab() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [systemFilter, setSystemFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { implementers, isLoading, reportData } = useImplementerReport(selectedId);

  // Filtered Phase 1 details for interactive mode
  const filteredPhase1Details = useMemo(() => {
    let list = reportData.phase1ProjectsDetails || [];
    if (systemFilter !== "all") {
      list = list.filter((item) => item.systemType === systemFilter);
    }
    if (statusFilter !== "all") {
      if (statusFilter === "done") {
        list = list.filter((item) => item.statusF1Text === "Concluído" || item.globalStatusText === "Concluído");
      } else if (statusFilter === "in-progress") {
        list = list.filter((item) => item.statusF1Text !== "Concluído");
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.project.clientName.toLowerCase().includes(q) ||
          item.project.ticketNumber.toLowerCase().includes(q)
      );
    }
    return list;
  }, [reportData.phase1ProjectsDetails, systemFilter, statusFilter, searchQuery]);

  // Filtered involved projects for interactive mode
  const filteredInvolvedProjects = useMemo(() => {
    let list = reportData.allInvolvedProjects || [];
    if (systemFilter !== "all") {
      list = list.filter((item) => item.project.systemType === systemFilter);
    }
    if (statusFilter !== "all") {
      if (statusFilter === "done") {
        list = list.filter((item) => item.project.globalStatus === "done");
      } else if (statusFilter === "in-progress") {
        list = list.filter((item) => item.project.globalStatus === "in-progress");
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.project.clientName.toLowerCase().includes(q) ||
          item.project.ticketNumber.toLowerCase().includes(q)
      );
    }
    return list;
  }, [reportData.allInvolvedProjects, systemFilter, statusFilter, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground font-medium">
          Carregando dados dos implantadores...
        </p>
      </div>
    );
  }

  const firstName = reportData.implementer?.name ? reportData.implementer.name.split(" ")[0] : "Implantador";
  const uniqueSystems = Array.from(
    new Set((reportData.allInvolvedProjects || []).map((i) => i.project.systemType).filter(Boolean))
  ).sort();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header bar with Selector and PDF export button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card/50 backdrop-blur-sm p-3 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
          <ImplementerSelector
            implementers={implementers || []}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
        {selectedId && reportData.implementer && (
          <ImplementerPDFExport data={reportData} />
        )}
      </div>

      {/* Empty State Prompt */}
      {!selectedId && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-in fade-in duration-700 bg-card/30 rounded-xl border border-dashed border-border/80">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Users className="h-8 w-8 text-primary/60" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-foreground">
              Selecione um Implantador
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm font-medium">
              Escolha um profissional da equipe para gerar o relatório completo com varredura exaustiva da base, gráficos e exportação em PDF.
            </p>
          </div>
        </div>
      )}

      {/* Main Unified Report Content */}
      {selectedId && reportData.implementer && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          
          {/* Top Header Banner matching Reference PDF */}
          <ImplementerHeaderBanner
            implementer={reportData.implementer}
            totalBaseProjects={reportData.totalBaseProjects}
          />

          {/* Interactive Filters Bar */}
          <div className="bg-card/40 backdrop-blur-sm p-3 rounded-xl border border-border flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground pr-2 border-r border-border">
                <Filter className="h-3.5 w-3.5 text-primary" />
                Filtros Dinâmicos:
              </div>

              {/* Search query */}
              <Input
                placeholder="Buscar por cliente ou ticket..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs w-full sm:w-[220px] bg-background/60"
              />

              {/* System selector */}
              <Select value={systemFilter} onValueChange={setSystemFilter}>
                <SelectTrigger className="h-8 text-xs w-full sm:w-[160px] bg-background/60">
                  <SelectValue placeholder="Sistema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Sistemas</SelectItem>
                  {uniqueSystems.map((sys) => (
                    <SelectItem key={sys} value={sys}>
                      {sys}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status selector */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs w-full sm:w-[160px] bg-background/60">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="done">Concluídos</SelectItem>
                  <SelectItem value="in-progress">Em Andamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* SECTION 1: Indicadores Globais */}
          <ImplementerKPIs
            totalBaseProjects={reportData.totalBaseProjects}
            totalInvolvedProjectsCount={reportData.totalInvolvedProjectsCount}
            totalPhase1ProjectsCount={reportData.totalPhase1ProjectsCount}
            phase1CompletionRate={reportData.phase1CompletionRate}
            phase1SummaryStr={reportData.phase1SummaryStr}
            implementerFirstName={firstName}
          />

          {/* SECTION 2: Tabela Consolidada Fase 1 */}
          <ImplementerPhase1ConsolidatedTable
            details={filteredPhase1Details}
          />

          {/* SECTION 3: Painel de Gráficos & Métricas Avançadas */}
          <div className="space-y-4 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold tracking-tight text-foreground/90">
                3. Painel de Gráficos, Tendências e Performance
              </h3>
            </div>

            {/* Recharts Grid (Status, Saúde, Sistemas, Radar Chart, Evolução Mensal) */}
            <ImplementerCharts
              statusDistribution={reportData.statusDistribution}
              healthDistribution={reportData.healthDistribution}
              systemTypeDistribution={reportData.systemTypeDistribution}
              implantationTypeDistribution={reportData.implantationTypeDistribution}
              projectsByMonth={reportData.projectsByMonth}
              stageRadarData={reportData.stageRadarData}
            />

            {/* Stage Performance Analysis vs Benchmark */}
            <ImplementerStageAnalysis
              stageTimeAnalysis={reportData.stageTimeAnalysis || []}
            />

            {/* Phase 1 and 2 Metrics */}
            <ImplementerPhaseMetrics
              phase1Metrics={reportData.phase1Metrics}
              phase2Metrics={reportData.phase2Metrics}
            />
          </div>

          {/* SECTION 4: Fichas Detalhadas e Projetos Envolvidos (Merged Section 3 & 6) */}
          <div className="pt-2 border-t border-border">
            <ImplementerPhase1Fichas
              details={filteredPhase1Details}
            />
          </div>

          {/* SECTION 5: Visão Geral dos Cartórios com Atuação */}
          <div className="pt-2 border-t border-border">
            <ImplementerAllCartoriosTable
              involvements={filteredInvolvedProjects}
              implementerName={reportData.implementer.name}
            />
          </div>

          {/* SECTION 6: Aprovação e Homologação */}
          <div className="pt-2 border-t border-border">
            <ImplementerSignaturesBlock
              implementerName={reportData.implementer.name}
            />
          </div>

        </div>
      )}
    </div>
  );
}
