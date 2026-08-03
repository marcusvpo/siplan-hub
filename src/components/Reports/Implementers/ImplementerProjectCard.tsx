import React, { useState } from 'react';
import type { ProjectV2 } from '@/types/ProjectV2';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ImplementerProjectCardProps {
  project: ProjectV2;
  roles: string[];
}

const formatDate = (d?: Date | string | null) => {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR');
};

const formatCurrency = (val?: number) => {
  if (val === undefined || val === null) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const daysBetweenStr = (start?: Date | string, end?: Date | string) => {
  if (!start || !end) return '—';
  const d1 = new Date(String(start));
  const d2 = new Date(String(end));
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return '—';
  return `${Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / 86400000)}`;
};

const implantationTypeLabels: Record<string, string> = {
  new: 'Nova',
  migration_siplan: 'Migração Siplan',
  migration_competitor: 'Migração Concorrente',
  upgrade: 'Upgrade',
};

const priorityLabels: Record<string, string> = {
  critical: 'Crítica', high: 'Alta', normal: 'Normal', low: 'Baixa',
};

const satisfactionLabels: Record<string, string> = {
  very_satisfied: 'Muito Satisfeito', satisfied: 'Satisfeito', neutral: 'Neutro', dissatisfied: 'Insatisfeito',
};

const stageStatusLabels: Record<string, string> = {
  todo: 'A Fazer', 'in-progress': 'Em Andamento', done: 'Concluído', blocked: 'Bloqueado', waiting_adjustment: 'Aguardando Ajuste',
};

const globalStatusLabels: Record<string, string> = {
  'in-progress': 'Em Andamento', done: 'Finalizado', blocked: 'Bloqueado', archived: 'Arquivado',
};

const stageStatusColors: Record<string, string> = {
  todo: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  'in-progress': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  done: 'bg-green-500/10 text-green-500 border-green-500/20',
  blocked: 'bg-red-500/10 text-red-500 border-red-500/20',
  waiting_adjustment: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
};

const globalStatusColors: Record<string, string> = {
  'in-progress': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  done: 'bg-green-500/10 text-green-500 border-green-500/20',
  blocked: 'bg-red-500/10 text-red-500 border-red-500/20',
  archived: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

const healthColors: Record<string, string> = {
  ok: 'bg-green-500/10 text-green-500 border-green-500/20',
  warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  critical: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const healthLabels: Record<string, string> = {
  ok: 'Estável', warning: 'Atenção', critical: 'Crítico',
};

export const ImplementerProjectCard: React.FC<ImplementerProjectCardProps> = ({ project, roles }) => {
  const [isOpen, setIsOpen] = useState(false);

  const renderStageRow = (stageName: string, stageData: any) => {
    if (!stageData) return null;
    const statusColor = stageStatusColors[stageData.status] || stageStatusColors['todo'];
    return (
      <tr className="border-b border-border/50 last:border-0 hover:bg-muted/50 transition-colors">
        <td className="py-2 px-3 text-sm font-medium">{stageName}</td>
        <td className="py-2 px-3">
          <Badge variant="outline" className={`font-normal ${statusColor}`}>
            {stageStatusLabels[stageData.status] || stageData.status || '—'}
          </Badge>
        </td>
        <td className="py-2 px-3 text-sm text-muted-foreground">{stageData.responsible || '—'}</td>
        <td className="py-2 px-3 text-sm text-muted-foreground">{formatDate(stageData.startDate)}</td>
        <td className="py-2 px-3 text-sm text-muted-foreground">{formatDate(stageData.endDate)}</td>
        <td className="py-2 px-3 text-sm text-muted-foreground">{daysBetweenStr(stageData.startDate, stageData.endDate)}</td>
      </tr>
    );
  };

  const renderPhaseSection = (phase: any, title: string) => {
    if (!phase) return null;
    return (
      <>
        <Separator />
        <div>
          <h4 className="text-sm font-semibold mb-3 text-foreground/80">{title}</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs text-muted-foreground">Responsável</p>
              <p className="text-sm font-medium">{phase.responsible || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant="outline" className={`mt-1 font-normal ${stageStatusColors[phase.status] || ''}`}>
                {stageStatusLabels[phase.status] || phase.status || '—'}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Data Instalação Remota</p>
              <p className="text-sm font-medium">{formatDate(phase.remoteInstallDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tipo Virada / Horário</p>
              <p className="text-sm font-medium">
                {phase.switchType || '—'}
                {phase.switchStartTime ? ` (${phase.switchStartTime} - ${phase.switchEndTime || '?'})` : ''}
              </p>
            </div>
          </div>

          <div className="bg-muted/30 p-3 rounded-md grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Trein. Início</p>
              <p className="text-sm font-medium">{formatDate(phase.trainingStartDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Trein. Fim</p>
              <p className="text-sm font-medium">{formatDate(phase.trainingEndDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tipo</p>
              <p className="text-sm font-medium">{phase.trainingType || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Local</p>
              <p className="text-sm font-medium">{phase.trainingLocation || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Participantes</p>
              <p className="text-sm font-medium">{phase.participantsCount || 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <p className="text-xs text-muted-foreground">Feedback do Cliente</p>
              <p className="text-sm">{phase.clientFeedback || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status Aceite</p>
              <p className="text-sm">{phase.acceptanceStatus || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Confirmado</p>
              <p className="text-sm">{phase.isConfirmed ? 'Sim ✓' : 'Não'}</p>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-base font-bold truncate">{project.clientName}</h3>
                <span className="text-xs text-muted-foreground shrink-0">#{project.ticketNumber}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              <Badge variant="secondary" className="text-[10px]">{project.systemType}</Badge>
              <Badge variant="outline" className={`text-[10px] ${healthColors[project.healthScore] || ''}`}>
                {healthLabels[project.healthScore] || project.healthScore}
              </Badge>
              <Badge variant="outline" className={`text-[10px] ${globalStatusColors[project.globalStatus] || ''}`}>
                {globalStatusLabels[project.globalStatus] || project.globalStatus}
              </Badge>
              {roles.map(role => (
                <Badge key={role} variant="outline" className="text-[10px] border-primary/20 text-primary">
                  {role}
                </Badge>
              ))}
            </div>

            <div className="w-full">
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">{project.overallProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500 rounded-full"
                  style={{ width: `${project.overallProgress}%` }}
                />
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="animate-in slide-in-from-top-1 duration-300">
          <div className="p-4 pt-0 space-y-5">
            <Separator />

            {/* Informações Gerais */}
            <div>
              <h4 className="text-sm font-semibold mb-3 text-foreground/80">Informações Gerais</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Tipo Implantação</p>
                  <p className="text-sm font-medium">{implantationTypeLabels[project.implantationType] || project.implantationType}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Prioridade</p>
                  <p className="text-sm font-medium">{priorityLabels[project.priority] || project.priority}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Líder</p>
                  <p className="text-sm font-medium">{project.projectLeader || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor Contrato</p>
                  <p className="text-sm font-medium">{formatCurrency(project.contractValue)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">OP</p>
                  <p className="text-sm font-medium">{project.opNumber || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Horas Vendidas / Trabalhadas</p>
                  <p className="text-sm font-medium">{project.soldHours || 0}h / {project.workHours || 0}h</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Datas */}
            <div>
              <h4 className="text-sm font-semibold mb-3 text-foreground/80">Datas</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Data Criação</p>
                  <p className="text-sm font-medium">{formatDate(project.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Início Real</p>
                  <p className="text-sm font-medium">{formatDate(project.startDateActual)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fim Real</p>
                  <p className="text-sm font-medium">{formatDate(project.endDateActual)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Última Atualização</p>
                  <p className="text-sm font-medium">{formatDate(project.lastUpdatedAt)}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Status por Etapa */}
            <div>
              <h4 className="text-sm font-semibold mb-3 text-foreground/80">Status por Etapa</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="py-2 px-3 text-xs font-semibold text-muted-foreground">Etapa</th>
                      <th className="py-2 px-3 text-xs font-semibold text-muted-foreground">Status</th>
                      <th className="py-2 px-3 text-xs font-semibold text-muted-foreground">Responsável</th>
                      <th className="py-2 px-3 text-xs font-semibold text-muted-foreground">Início</th>
                      <th className="py-2 px-3 text-xs font-semibold text-muted-foreground">Fim</th>
                      <th className="py-2 px-3 text-xs font-semibold text-muted-foreground">Duração</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderStageRow('Infraestrutura', project.stages?.infra)}
                    {renderStageRow('Aderência', project.stages?.adherence)}
                    {renderStageRow('Prep. Ambiente', project.stages?.environment)}
                    {renderStageRow('Conversão', project.stages?.conversion)}
                    {renderStageRow('Implementação', project.stages?.implementation)}
                    {renderStageRow('Pós-Implantação', project.stages?.post)}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Fase 1 */}
            {renderPhaseSection(project.stages?.implementation?.phase1, 'Fase 1 (Treinamento & Acompanhamento)')}

            {/* Fase 2 */}
            {renderPhaseSection(project.stages?.implementation?.phase2, 'Fase 2 (Possível Retorno)')}

            {/* Pós-Implantação */}
            {project.stages?.post && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-foreground/80">Pós-Implantação</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Satisfação</p>
                      <p className="text-sm font-medium">
                        {satisfactionLabels[project.stages.post.clientSatisfaction || ''] || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Período Suporte</p>
                      <p className="text-sm font-medium">{project.stages.post.supportPeriodDays || '—'} dias</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">ROI</p>
                      <p className="text-sm font-medium">{project.stages.post.roiEstimated || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Followup</p>
                      <p className="text-sm font-medium">
                        {project.stages.post.followupNeeded ? `Sim (${formatDate(project.stages.post.followupDate)})` : 'Não'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {project.stages.post.benefitsDelivered && (
                      <div>
                        <p className="text-xs text-muted-foreground">Benefícios</p>
                        <p className="text-sm">{project.stages.post.benefitsDelivered}</p>
                      </div>
                    )}
                    {project.stages.post.challengesFound && (
                      <div>
                        <p className="text-xs text-muted-foreground">Desafios</p>
                        <p className="text-sm">{project.stages.post.challengesFound}</p>
                      </div>
                    )}
                    {project.stages.post.recommendations && (
                      <div>
                        <p className="text-xs text-muted-foreground">Recomendações</p>
                        <p className="text-sm">{project.stages.post.recommendations}</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Tickets Relacionados */}
            <div>
              <h4 className="text-sm font-semibold mb-3 text-foreground/80">Tickets Relacionados</h4>
              <div className="flex flex-wrap gap-2">
                {project.relatedTickets && project.relatedTickets.length > 0 ? (
                  project.relatedTickets.map((ticket, idx) => (
                    <Badge key={idx} variant="outline" className="bg-muted/50 text-muted-foreground">
                      {ticket.name} (#{ticket.number})
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">Nenhum</span>
                )}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
