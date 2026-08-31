import React, { useState } from "react";
import type { Phase1ProjectDetail } from "@/hooks/useImplementerReport";
import type { ProjectV2 } from "@/types/ProjectV2";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Layers, CheckCircle2, Clock } from "lucide-react";
import { ReportListPagination } from "./ReportListPagination";
import { useReportPagination } from "./useReportPagination";

const PAGE_SIZE = 3;
const LIST_ID = "implementer-phase1-detail-list";

interface ImplementerPhase1FichasProps {
  details: Phase1ProjectDetail[];
}

const formatDate = (d?: Date | string | null) => {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR");
};

const formatCurrency = (val?: number) => {
  if (val === undefined || val === null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
};

const daysBetweenStr = (start?: Date | string | null, end?: Date | string | null) => {
  if (!start || !end) return "—";
  const d1 = new Date(String(start));
  const d2 = new Date(String(end));
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return "—";
  return `${Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / 86400000)} dias`;
};

const stageStatusLabels: Record<string, string> = {
  todo: "A Fazer",
  "in-progress": "Em Andamento",
  done: "Concluído",
  blocked: "Bloqueado",
  waiting_adjustment: "Aguardando Ajuste",
};

const stageStatusColors: Record<string, string> = {
  todo: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  "in-progress": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  done: "bg-green-500/10 text-green-600 border-green-500/20",
  blocked: "bg-red-500/10 text-red-500 border-red-500/20",
  waiting_adjustment: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
};

const priorityLabels: Record<string, string> = {
  critical: "Crítica",
  high: "Alta",
  normal: "Normal",
  low: "Baixa",
};

const satisfactionLabels: Record<string, string> = {
  very_satisfied: "Muito Satisfeito",
  satisfied: "Satisfeito",
  neutral: "Neutro",
  dissatisfied: "Insatisfeito",
};

type ReportStage =
  | ProjectV2["stages"]["adherence"]
  | ProjectV2["stages"]["conversion"]
  | ProjectV2["stages"]["implementation"]
  | ProjectV2["stages"]["post"];

const getReportStages = (project: ProjectV2): Array<[string, ReportStage]> => [
  ["Aderência", project.stages.adherence],
  ["Homologação Conversão", project.stages.conversion],
  ["Implementação", project.stages.implementation],
  ["Pós-Implantação", project.stages.post],
];

export const ImplementerPhase1Fichas: React.FC<ImplementerPhase1FichasProps> = ({
  details,
}) => {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const pagination = useReportPagination(details, PAGE_SIZE);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div id={LIST_ID} className="min-w-0 scroll-mt-20 space-y-4">
      <div className="flex min-w-0 items-center justify-between">
        <h3 className="flex min-w-0 items-start gap-2 break-words text-sm font-bold tracking-tight text-foreground/90">
          <Layers className="h-4 w-4 text-primary" />
          3. Fichas Detalhadas e Projetos Envolvidos ({details.length} implantações)
        </h3>
      </div>

      {details.length === 0 ? (
        <div className="text-center text-xs text-muted-foreground py-8 border border-dashed rounded-xl">
          Nenhuma ficha de implantação cadastrada.
        </div>
      ) : (
        <div className="space-y-4">
          {pagination.pageItems.map((ficha, index) => {
            const project = ficha.project;
            const isDone = ficha.statusF1Text === "Concluído";
            const isExpanded = !!expandedIds[project.id];

            return (
              <Card
                key={project.id}
                className="relative overflow-hidden border border-border/80 shadow-sm border-l-4 border-l-primary transition-all hover:shadow-md"
              >
                <CardContent className="p-4 md:p-5 space-y-3">
                  {/* Title & Badge */}
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/50 pb-2.5">
                    <div className="min-w-0">
                      <h4 className="break-words text-sm font-black text-foreground md:text-base">
                        {(pagination.currentPage - 1) * pagination.pageSize + index + 1}. {project.clientName}{" "}
                        <span className="text-xs font-bold text-muted-foreground font-mono">
                          (Ticket: #{project.ticketNumber})
                        </span>
                      </h4>
                      <p className="mt-0.5 break-words text-xs font-medium leading-relaxed text-muted-foreground">
                        Sistema: <strong className="text-foreground">{ficha.systemType}</strong> |{" "}
                        Tipo Implantação: <strong className="text-foreground">{ficha.implantationType}</strong> |{" "}
                        Líder: <strong className="text-foreground">{ficha.leaderName}</strong>
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 ${
                        isDone
                          ? "bg-green-500/10 text-green-600 border-green-500/30"
                          : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                      }`}
                    >
                      {ficha.statusF1Text}
                    </Badge>
                  </div>

                  {/* Period highlight */}
                  <div className="text-xs font-bold text-primary bg-primary/5 p-2 rounded-lg border border-primary/15 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="min-w-0 break-words">Período da Fase 1 (Treinamento & Virada Presencial): {ficha.periodText}</span>
                      {ficha.presentialDaysText && (
                        <span className="text-muted-foreground font-normal">
                          ({ficha.presentialDaysText})
                        </span>
                      )}
                    </div>
                    {project.overallProgress !== undefined && (
                      <div className="text-[10px] font-bold text-muted-foreground">
                        Progresso Global: <span className="text-foreground">{project.overallProgress}%</span>
                      </div>
                    )}
                  </div>

                  {/* Dynamic Real Bullet points */}
                  <ul className="space-y-1.5 pt-1 text-xs text-foreground/90 font-medium">
                    {ficha.observationsBullets.map((bullet, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Collapsible toggle for deep details */}
                  <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(project.id)}>
                    <div className="pt-2 flex justify-end">
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto min-h-10 max-w-full gap-1.5 whitespace-normal px-2 py-2 text-right text-xs font-bold text-primary hover:bg-primary/10 sm:h-7 sm:min-h-0 sm:whitespace-nowrap sm:py-0"
                        >
                          {isExpanded ? (
                            <>
                              Ocultar Especificações
                              <ChevronUp className="h-3.5 w-3.5" />
                            </>
                          ) : (
                            <>
                              Ver Detalhes Completos do Projeto
                              <ChevronDown className="h-3.5 w-3.5" />
                            </>
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>

                    <CollapsibleContent className="space-y-4 pt-3 animate-in fade-in duration-300">
                      <Separator />

                      {/* Informações Gerais */}
                      <div className="space-y-2">
                        <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">
                          Informações Gerais do Projeto
                        </h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/20 p-3 rounded-lg text-xs">
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Valor do Contrato</span>
                            <span className="font-bold text-foreground">{formatCurrency(project.contractValue)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px]">OP / Pedido</span>
                            <span className="font-bold text-foreground">{project.opNumber || "—"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Prioridade</span>
                            <span className="font-bold text-foreground">{priorityLabels[project.priority] || project.priority}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Horas Vendidas / Trab.</span>
                            <span className="font-bold text-foreground">{project.soldHours || 0}h / {project.workHours || 0}h</span>
                          </div>
                        </div>
                      </div>

                      {/* Status por Etapa */}
                      <div className="space-y-2">
                        <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">
                          Status e Retenção por Etapa
                        </h5>
                        <div className="space-y-2 md:hidden" data-testid="phase-stages-mobile-list">
                          {getReportStages(project).map(([label, stageData], sIdx) => {
                            return (
                              <div key={sIdx} className="min-w-0 space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
                                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                                  <span className="break-words text-xs font-bold text-foreground">{label}</span>
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] ${stageStatusColors[stageData.status] || ""}`}
                                  >
                                    {stageStatusLabels[stageData.status] || stageData.status || "—"}
                                  </Badge>
                                </div>
                                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
                                  <div className="col-span-2 min-w-0">
                                    <dt className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Responsável</dt>
                                    <dd className="break-words font-medium text-foreground">{stageData.responsible || "—"}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Início</dt>
                                    <dd className="font-medium text-foreground">{formatDate(stageData.startDate)}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Fim</dt>
                                    <dd className="font-medium text-foreground">{formatDate(stageData.endDate)}</dd>
                                  </div>
                                  <div className="col-span-2">
                                    <dt className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Duração</dt>
                                    <dd className="font-medium text-foreground">{daysBetweenStr(stageData.startDate, stageData.endDate)}</dd>
                                  </div>
                                </dl>
                              </div>
                            );
                          })}
                        </div>

                        <div className="hidden overflow-x-auto rounded-lg border border-border/60 md:block">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-muted/50 border-b border-border">
                              <tr>
                                <th className="py-2 px-3 font-semibold text-muted-foreground">Etapa</th>
                                <th className="py-2 px-3 font-semibold text-muted-foreground">Status</th>
                                <th className="py-2 px-3 font-semibold text-muted-foreground">Responsável</th>
                                <th className="py-2 px-3 font-semibold text-muted-foreground">Início</th>
                                <th className="py-2 px-3 font-semibold text-muted-foreground">Fim</th>
                                <th className="py-2 px-3 font-semibold text-muted-foreground">Duração</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getReportStages(project).map(([label, stageData], sIdx) => {
                                return (
                                  <tr key={sIdx} className="border-b border-border/40 last:border-0 hover:bg-muted/30">
                                    <td className="py-2 px-3 font-bold text-foreground">{label}</td>
                                    <td className="py-2 px-3">
                                      <Badge
                                        variant="outline"
                                        className={`text-[10px] ${stageStatusColors[stageData.status] || ""}`}
                                      >
                                        {stageStatusLabels[stageData.status] || stageData.status || "—"}
                                      </Badge>
                                    </td>
                                    <td className="py-2 px-3 text-muted-foreground">{stageData.responsible || "—"}</td>
                                    <td className="py-2 px-3 text-muted-foreground">{formatDate(stageData.startDate)}</td>
                                    <td className="py-2 px-3 text-muted-foreground">{formatDate(stageData.endDate)}</td>
                                    <td className="py-2 px-3 text-muted-foreground">{daysBetweenStr(stageData.startDate, stageData.endDate)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Phase 1 & Phase 2 Specifics */}
                      {project.stages?.implementation && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {project.stages.implementation.phase1 && (
                            <div className="bg-muted/20 border border-border/60 p-3 rounded-lg text-xs space-y-1.5">
                              <div className="font-bold text-foreground flex items-center justify-between">
                                <span>Fase 1: Treinamento & Virada</span>
                                {project.stages.implementation.phase1.isConfirmed && (
                                  <span className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" /> Confirmado
                                  </span>
                                )}
                              </div>
                              <p className="text-muted-foreground">
                                Virada: {project.stages.implementation.phase1.switchType || "Presencial"}{" "}
                                {project.stages.implementation.phase1.switchStartTime ? `(${project.stages.implementation.phase1.switchStartTime})` : ""}
                              </p>
                              <p className="text-muted-foreground">
                                Treinamento: {project.stages.implementation.phase1.trainingType || "Presencial"}{" "}
                                ({project.stages.implementation.phase1.participantsCount || 0} participantes)
                              </p>
                            </div>
                          )}

                          {project.stages.implementation.phase2 && (
                            <div className="bg-muted/20 border border-border/60 p-3 rounded-lg text-xs space-y-1.5">
                              <div className="font-bold text-foreground flex items-center justify-between">
                                <span>Fase 2: Possível Retorno</span>
                                {project.stages.implementation.phase2.isConfirmed && (
                                  <span className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" /> Confirmado
                                  </span>
                                )}
                              </div>
                              <p className="text-muted-foreground">
                                Responsável: {project.stages.implementation.phase2.responsible || "—"}
                              </p>
                              <p className="text-muted-foreground">
                                Treinamento: {project.stages.implementation.phase2.trainingType || "—"}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Pós-Implantação & Satisfaction */}
                      {project.stages?.post && (
                        <div className="bg-muted/20 border border-border/60 p-3 rounded-lg text-xs space-y-1">
                          <div className="font-bold text-foreground mb-1">Pós-Implantação & Satisfação</div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-muted-foreground">
                            <div>Satisfação: <strong className="text-foreground">{satisfactionLabels[project.stages.post.clientSatisfaction || ""] || "—"}</strong></div>
                            <div>Período Suporte: <strong className="text-foreground">{project.stages.post.supportPeriodDays || "—"} dias</strong></div>
                            <div>ROI Estimado: <strong className="text-foreground">{project.stages.post.roiEstimated || "—"}</strong></div>
                            <div>Followup: <strong className="text-foreground">{project.stages.post.followupNeeded ? `Sim (${formatDate(project.stages.post.followupDate)})` : "Não"}</strong></div>
                          </div>
                        </div>
                      )}

                      {/* Tickets Relacionados */}
                      {project.relatedTickets && project.relatedTickets.length > 0 && (
                        <div className="text-xs space-y-1">
                          <span className="font-bold text-foreground block">Tickets Chamados Relacionados:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {project.relatedTickets.map((t, tIdx) => (
                              <Badge key={tIdx} variant="outline" className="text-[10px] bg-background">
                                {t.name} (#{t.number})
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <ReportListPagination
        anchorId={LIST_ID}
        currentPage={pagination.currentPage}
        itemLabel="fichas detalhadas"
        onPageChange={pagination.setCurrentPage}
        pageSize={pagination.pageSize}
        totalItems={details.length}
        totalPages={pagination.totalPages}
      />
    </div>
  );
};
