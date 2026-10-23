import { useState } from "react";
import { EnrichedInfraProject } from "./types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Calendar,
  User,
  Clock,
  Sparkles,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface InfraProgressProjectCardProps {
  project: EnrichedInfraProject;
  observation: string;
  onSaveObservation: (ticket: string, value: string) => void;
}

export function InfraProgressProjectCard({
  project,
  observation,
  onSaveObservation,
}: InfraProgressProjectCardProps) {
  const [showDbNotes, setShowDbNotes] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const isBlocked = project.infraStatus === "blocked";
  const p1 = project.phase1;

  // Handle local change and auto-save
  const handleChange = (val: string) => {
    onSaveObservation(project.ticketNumber, val);
    setSaveStatus("Salvo");
    setTimeout(() => setSaveStatus(null), 1500);
  };

  // Pre-fill with DB notes
  const handlePrefillFromDb = () => {
    const note = project.existingObservations || project.projectGeneralNotes;
    if (!note) return;
    handleChange(note);
    toast.success("Observação preenchida com a nota da base!");
  };

  // Clear note
  const handleClear = () => {
    if (confirm(`Deseja limpar as anotações do projeto ${project.clientName}?`)) {
      handleChange("");
      toast.info("Anotação limpa.");
    }
  };

  // System Badge styling
  const getSystemBadgeColor = (sys: string) => {
    const s = sys.toLowerCase();
    if (s.includes("orion tn")) return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    if (s.includes("orion pro")) return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
    if (s.includes("orion reg")) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
  };

  const hasDbNotes = Boolean(project.existingObservations || project.projectGeneralNotes);

  return (
    <Card
      className={`p-4 sm:p-5 transition-all hover:shadow-md border-border/80 bg-card/70 backdrop-blur-sm ${
        isBlocked ? "border-l-4 border-l-rose-500" : "border-l-4 border-l-amber-500"
      }`}
    >
      {/* LINHA 1: Nome do Cliente/Projeto + Chamado + Sistema + Tag Destaque Fase 1 */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 border-b border-border/60 pb-3">
        <div className="min-w-0">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">
            Projeto #{project.index}
          </span>
          <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight leading-snug uppercase">
            {project.clientName}
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* TAG DE DESTAQUE FASE 1 (SE CADASTRADA) */}
          {p1.hasDates && (
            <Badge
              variant="outline"
              className={`text-xs font-bold py-1 px-2.5 gap-1.5 shadow-sm ${
                p1.isConfirmed
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                  : "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>FASE 1: {(p1.dateType || "AGENDADA").toUpperCase()}</span>
            </Badge>
          )}

          {/* LINHA 2: Número do Chamado */}
          <span className="font-mono text-xs px-2.5 py-1 rounded-md font-bold bg-muted text-foreground border border-border">
            {project.ticketNumber}
          </span>

          {/* LINHA 3: Sistema */}
          <Badge variant="outline" className={`text-xs font-bold py-1 px-2.5 ${getSystemBadgeColor(project.systemType)}`}>
            {project.systemType}
          </Badge>
        </div>
      </div>

      {/* LINHA 4: Status da Infra: Em Andamento ou Bloqueado (com status do que está bloqueado) */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-muted-foreground">Status da Infra:</span>
          <Badge
            variant="outline"
            className={`text-xs font-bold py-1 px-3 gap-1.5 ${
              isBlocked
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
            }`}
          >
            <span>{isBlocked ? "🔴" : "🟡"}</span>
            <span>{project.statusFormatted}</span>
          </Badge>
        </div>

        <div className="text-[11px] text-muted-foreground">
          Resp. Infra: <strong className="text-foreground font-semibold">{project.responsibleInfra}</strong>
        </div>
      </div>

      {/* BLOCO DA ETAPA FASE 1 TREINAMENTO & ACOMPANHAMENTO */}
      {p1.hasDates ? (
        <div className="mt-3.5 bg-muted/40 border border-border/80 rounded-xl p-3 sm:p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <span>🎯 Fase 1 — Treinamento & Acompanhamento</span>
            </span>
            <Badge
              variant="outline"
              className={`text-[11px] font-bold ${
                p1.isConfirmed
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
              }`}
            >
              {p1.dateType}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5 text-xs">
            {/* Responsável */}
            <div className="bg-card border border-border/60 rounded-lg p-2.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Responsável
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <User className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="font-bold text-foreground text-xs truncate">
                  {p1.responsible || "A definir"}
                </span>
              </div>
            </div>

            {/* Data de Início */}
            <div className="bg-card border border-border/60 rounded-lg p-2.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Data de Início
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="font-mono font-bold text-foreground text-xs">{p1.startDate}</span>
              </div>
            </div>

            {/* Data de Término */}
            <div className="bg-card border border-border/60 rounded-lg p-2.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Data de Término
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="font-mono font-bold text-foreground text-xs">{p1.endDate}</span>
              </div>
            </div>
          </div>

          {p1.observations && (
            <div className="text-[11px] text-muted-foreground italic bg-card/60 rounded-lg p-2 border border-border/60">
              <strong className="font-bold not-italic text-foreground">Nota de Alinhamento:</strong> {p1.observations}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3.5 bg-muted/20 border border-dashed border-border/80 rounded-xl p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="font-medium">Sem datas previstas ou confirmadas para a implantação no momento.</span>
          </div>
          {p1.responsible && (
            <div className="text-[11px] text-muted-foreground shrink-0">
              Responsável preliminar: <strong className="text-foreground font-semibold">{p1.responsible}</strong>
            </div>
          )}
        </div>
      )}

      {/* LINHA 5: [Campo para observações] */}
      <div className="mt-3.5 space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
            <span>[Observações]</span>
            {saveStatus && (
              <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                ✓ {saveStatus}
              </span>
            )}
          </label>

          <div className="flex items-center gap-2">
            {hasDbNotes && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrefillFromDb}
                className="h-6 px-2 text-[11px] text-primary hover:text-primary/80 gap-1"
                title="Preencher com a nota técnica da base de dados"
              >
                <Sparkles className="w-3 h-3" />
                <span className="hidden sm:inline">Preencher c/ Nota do Banco</span>
              </Button>
            )}

            {observation && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-6 px-2 text-[11px] text-muted-foreground hover:text-destructive gap-1"
                title="Limpar observação"
              >
                <Trash2 className="w-3 h-3" />
                <span>Limpar</span>
              </Button>
            )}
          </div>
        </div>

        <Textarea
          rows={3}
          value={observation}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Digite aqui as observações para este projeto..."
          className="text-xs sm:text-sm bg-background/50 focus:bg-background border-border"
        />

        {/* Histórico e notas originais colapsáveis */}
        {hasDbNotes && (
          <div className="pt-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDbNotes(!showDbNotes)}
              className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground gap-1"
            >
              {showDbNotes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span>{showDbNotes ? "Ocultar notas do banco" : "Ver histórico e notas do banco"}</span>
            </Button>

            {showDbNotes && (
              <div className="mt-1.5 p-2.5 rounded-lg bg-muted/40 border border-border/60 text-xs text-muted-foreground space-y-1 animate-in fade-in">
                {project.existingObservations && (
                  <div>
                    <strong className="text-foreground font-semibold">Nota Infra:</strong>{" "}
                    {project.existingObservations}
                  </div>
                )}
                {project.projectGeneralNotes && (
                  <div>
                    <strong className="text-foreground font-semibold">Nota Geral:</strong>{" "}
                    {project.projectGeneralNotes}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
