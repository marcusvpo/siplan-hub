import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { pdfTokens } from '../styles/tokens';
import { PdfHeader } from '../components/PdfHeader';
import { PdfFooter } from '../components/PdfFooter';
import { PdfTable } from '../components/PdfTable';
import { PdfStatusBadge } from '../components/PdfStatusBadge';
import { PdfSignatureBlock } from '../components/PdfSignatureBlock';
import type {
  WeeklyExecutiveReportData,
  AdvancedProjectItem,
  StartingPhase1Item,
  InfraGargaloItem,
  EnvironmentDeadlineItem,
  DeploymentScheduleItem,
  ConversionQueueAnalystGroup,
  StartingPostImplantationItem,
  PlatformChangelogItem,
} from '../types/weeklyReport';

export interface WeeklyExecutiveReportTemplateProps {
  data: WeeklyExecutiveReportData;
}

const styles = StyleSheet.create({
  page: {
    fontFamily: pdfTokens.fonts.family,
    fontSize: pdfTokens.fontSizes.xs,
    color: pdfTokens.colors.text,
    backgroundColor: '#ffffff',
    paddingTop: pdfTokens.page.margin,
    paddingBottom: pdfTokens.page.margin + 16,
    paddingHorizontal: pdfTokens.page.margin,
    lineHeight: 1.4,
  },
  sectionTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: pdfTokens.spacing.xs,
    marginTop: pdfTokens.spacing.sm,
    marginBottom: pdfTokens.spacing.xs,
    borderBottomWidth: 1.5,
    borderBottomColor: pdfTokens.colors.primary,
    paddingBottom: 3,
  },
  sectionTitle: {
    fontFamily: pdfTokens.fonts.familyBold,
    fontSize: pdfTokens.fontSizes.md,
    color: pdfTokens.colors.navy,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontFamily: pdfTokens.fonts.family,
    fontSize: pdfTokens.fontSizes.xxs,
    color: pdfTokens.colors.textMuted,
    marginBottom: pdfTokens.spacing.xs,
  },

  // Box do Parecer Executivo IA
  aiBox: {
    backgroundColor: pdfTokens.colors.background,
    borderColor: pdfTokens.colors.border,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderLeftColor: pdfTokens.colors.primary,
    borderRadius: pdfTokens.radii.sm,
    padding: pdfTokens.spacing.sm,
    marginBottom: pdfTokens.spacing.sm,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: pdfTokens.spacing.xs,
  },
  aiTitle: {
    fontFamily: pdfTokens.fonts.familyBold,
    fontSize: pdfTokens.fontSizes.sm,
    color: pdfTokens.colors.navy,
  },
  aiBadge: {
    backgroundColor: pdfTokens.colors.primary,
    borderRadius: pdfTokens.radii.full,
    paddingHorizontal: pdfTokens.spacing.xs,
    paddingVertical: 2,
  },
  aiBadgeText: {
    fontFamily: pdfTokens.fonts.familyBold,
    fontSize: pdfTokens.fontSizes.xxs,
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  aiOverview: {
    fontSize: pdfTokens.fontSizes.xs,
    color: pdfTokens.colors.text,
    lineHeight: 1.45,
    marginBottom: pdfTokens.spacing.xs,
    textAlign: 'justify',
  },
  aiColumnsRow: {
    flexDirection: 'row',
    gap: pdfTokens.spacing.xs,
    marginTop: pdfTokens.spacing.xxs,
  },
  aiColumn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: pdfTokens.radii.sm,
    padding: pdfTokens.spacing.xs,
    borderWidth: 0.5,
    borderColor: pdfTokens.colors.border,
  },
  aiColTitle: {
    fontFamily: pdfTokens.fonts.familyBold,
    fontSize: pdfTokens.fontSizes.xxs,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  aiColItem: {
    fontSize: 7.5,
    color: pdfTokens.colors.textMuted,
    marginBottom: 3,
    lineHeight: 1.3,
  },

  // Grid de KPIs
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: pdfTokens.spacing.xs,
    marginBottom: pdfTokens.spacing.sm,
  },
  kpiCard: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: pdfTokens.colors.border,
    borderRadius: pdfTokens.radii.sm,
    paddingVertical: pdfTokens.spacing.xs,
    paddingHorizontal: pdfTokens.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    fontFamily: pdfTokens.fonts.familyBold,
    fontSize: pdfTokens.fontSizes.xl,
    color: pdfTokens.colors.primary,
    marginBottom: 2,
  },
  kpiLabel: {
    fontFamily: pdfTokens.fonts.family,
    fontSize: 7.5,
    color: pdfTokens.colors.textMuted,
    textAlign: 'center',
    textTransform: 'uppercase',
  },

  // Badges e tags
  tagText: {
    fontFamily: pdfTokens.fonts.family,
    fontSize: pdfTokens.fontSizes.xxs,
    color: pdfTokens.colors.textMuted,
  },
  boldText: {
    fontFamily: pdfTokens.fonts.familyBold,
  },
  clientName: {
    fontFamily: pdfTokens.fonts.familyBold,
    fontSize: pdfTokens.fontSizes.xs,
    color: pdfTokens.colors.navy,
  },
  ticketNumber: {
    fontSize: pdfTokens.fontSizes.xxs,
    color: pdfTokens.colors.textMuted,
  },

  // Caixa de destaque Pós-Implantação
  highlightBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderLeftWidth: 3,
    borderLeftColor: '#0284c7', // azul
    borderRadius: pdfTokens.radii.sm,
    padding: pdfTokens.spacing.xs,
    marginBottom: pdfTokens.spacing.sm,
  },
  highlightText: {
    fontSize: pdfTokens.fontSizes.xxs,
    color: pdfTokens.colors.textMuted,
  },

  // Changelog
  changelogItem: {
    borderBottomWidth: 0.5,
    borderBottomColor: pdfTokens.colors.border,
    paddingVertical: 4,
  },
  changelogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  changelogTitle: {
    fontFamily: pdfTokens.fonts.familyBold,
    fontSize: pdfTokens.fontSizes.xs,
    color: pdfTokens.colors.navy,
  },
  changelogDate: {
    fontSize: pdfTokens.fontSizes.xxs,
    color: pdfTokens.colors.textMuted,
  },
  changelogBody: {
    fontSize: 7.5,
    color: pdfTokens.colors.textMuted,
    lineHeight: 1.3,
  },
});

export const WeeklyExecutiveReportTemplate: React.FC<WeeklyExecutiveReportTemplateProps> = ({ data }) => {
  const { referencePeriod, kpis, aiExecutiveSummary } = data;

  return (
    <Document
      title={`${data.title} - Semana ${referencePeriod.weekNumber}/${referencePeriod.year}`}
      author={data.generatedBy}
      subject="Relatório Executivo Semanal de Gestão de Implantação de Cartórios"
      keywords="implantação, siplan hub, relatório semanal, diretoria, kpi, cartórios"
    >
      {/* ========================================================
          PÁGINA 1: VISÃO GERAL, PARECER DA IA E KPIS EXECUTIVOS
          ======================================================== */}
      <Page size="A4" orientation="portrait" style={styles.page}>
        <PdfHeader
          title={data.title}
          subtitle={data.subtitle}
          moduleName="Diretoria de Operações & Implantação"
          generatedAt={data.generatedAt}
          badge={`Semana ${referencePeriod.weekNumber}`}
        />

        {/* Parecer Executivo da IA (Antigravity Brain) */}
        <View style={styles.aiBox}>
          <View style={styles.aiHeaderRow}>
            <Text style={styles.aiTitle}>Parecer Executivo & Análise Estratégica (Antigravity AI)</Text>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>Inteligência Ativa</Text>
            </View>
          </View>
          <Text style={styles.aiOverview}>{aiExecutiveSummary.overview}</Text>

          <View style={styles.aiColumnsRow}>
            {/* Destaques Positivos */}
            <View style={styles.aiColumn}>
              <Text style={[styles.aiColTitle, { color: pdfTokens.colors.successText }]}>
                Destaques Positivos
              </Text>
              {aiExecutiveSummary.highlights.map((h, i) => (
                <Text key={i} style={styles.aiColItem}>• {h}</Text>
              ))}
            </View>

            {/* Riscos Críticos & Gargalos */}
            <View style={styles.aiColumn}>
              <Text style={[styles.aiColTitle, { color: pdfTokens.colors.dangerText }]}>
                Pontos de Atenção & Riscos
              </Text>
              {aiExecutiveSummary.criticalRisks.map((r, i) => (
                <Text key={i} style={styles.aiColItem}>• {r}</Text>
              ))}
            </View>

            {/* Ações Táticas Recomendadas */}
            <View style={styles.aiColumn}>
              <Text style={[styles.aiColTitle, { color: pdfTokens.colors.navy }]}>
                Diretrizes & Próximas Ações
              </Text>
              {aiExecutiveSummary.strategicActions.map((a, i) => (
                <Text key={i} style={styles.aiColItem}>• {a}</Text>
              ))}
            </View>
          </View>
        </View>

        {/* Grid de KPIs */}
        <View style={styles.sectionTitleBox}>
          <Text style={styles.sectionTitle}>Indicadores & Métricas da Semana</Text>
        </View>
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{kpis.totalActiveProjects}</Text>
            <Text style={styles.kpiLabel}>Projetos Ativos</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiValue, { color: pdfTokens.colors.successText }]}>
              {kpis.advancedStagesLastWeekCount}
            </Text>
            <Text style={styles.kpiLabel}>Avanços de Etapa</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiValue, { color: '#0284c7' }]}>
              {kpis.startingPhase1ThisWeekCount}
            </Text>
            <Text style={styles.kpiLabel}>Iniciando Fase 1</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiValue, { color: '#7c3aed' }]}>
              {kpis.startingPostThisWeekCount}
            </Text>
            <Text style={styles.kpiLabel}>Iniciando Pós-Imp.</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiValue, { color: pdfTokens.colors.warningText }]}>
              {kpis.infraGargalosCount}
            </Text>
            <Text style={styles.kpiLabel}>Aguardando Infra</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiValue, { color: pdfTokens.colors.dangerText }]}>
              {kpis.environmentUrgentCount}
            </Text>
            <Text style={styles.kpiLabel}>Ambientes Críticos</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiValue, { color: pdfTokens.colors.navy }]}>
              {kpis.activeConversionsCount}
            </Text>
            <Text style={styles.kpiLabel}>Fila de Conversão</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiValue, { color: pdfTokens.colors.dangerText }]}>
              {kpis.criticalHealthCount}
            </Text>
            <Text style={styles.kpiLabel}>Projetos em Alerta</Text>
          </View>
        </View>

        {/* 1. Avanços de Etapa na Semana Anterior */}
        <View style={styles.sectionTitleBox}>
          <Text style={styles.sectionTitle}>1. Projetos que Avançaram de Etapa (Semana Anterior)</Text>
        </View>
        <PdfTable<AdvancedProjectItem>
          data={data.advancedProjects.slice(0, 7)}
          emptyMessage="Nenhuma movimentação de etapa registrada no período analisado."
          columns={[
            {
              id: 'client',
              header: 'Cartório / Projeto',
              width: '40%',
              renderCell: (row) => (
                <View>
                  <Text style={styles.clientName}>{row.clientName}</Text>
                  {row.ticketNumber ? <Text style={styles.ticketNumber}>Chamado: #{row.ticketNumber}</Text> : null}
                </View>
              ),
            },
            {
              id: 'system',
              header: 'Sistema',
              width: '18%',
              renderCell: (row) => <Text style={styles.tagText}>{row.systemType || 'Geral'}</Text>,
            },
            {
              id: 'stage',
              header: 'Etapa / Atualização',
              width: '24%',
              renderCell: (row) => (
                <PdfStatusBadge
                  label={row.currentStage}
                  variant={row.currentStage.toLowerCase().includes('conclu') ? 'success' : 'info'}
                />
              ),
            },
            {
              id: 'responsible',
              header: 'Responsável',
              width: '18%',
              renderCell: (row) => <Text style={styles.tagText}>{row.responsible || 'Equipe'}</Text>,
            },
          ]}
        />

        <PdfFooter
          confidentialityNotice="Relatório Executivo Confidencial • Uso Interno da Diretoria Siplan"
          systemTag="Siplan HUB"
        />
      </Page>

      {/* ========================================================
          PÁGINA 2: IMPLANTAÇÃO FASE 1 & PÓS-IMPLANTAÇÃO
          ======================================================== */}
      <Page size="A4" orientation="portrait" style={styles.page}>
        <PdfHeader
          title="Agenda & Entregas de Campo"
          subtitle={`Fase 1 (Treinamento & Acompanhamento) e Transição para Pós-Implantação`}
          moduleName="Operações de Implantação"
          generatedAt={data.generatedAt}
          badge={`Semana ${referencePeriod.weekNumber}`}
        />

        {/* 2. Iniciando Implantação Fase 1 Nesta Semana */}
        <View style={styles.sectionTitleBox}>
          <Text style={styles.sectionTitle}>2. Iniciando Implantação nesta Semana (Fase 1)</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Cartórios com início da Fase 1 (Treinamento & Acompanhamento) previsto para o intervalo de {referencePeriod.currentWeekStartDate} a {referencePeriod.currentWeekEndDate}.
        </Text>
        <PdfTable<StartingPhase1Item>
          data={data.startingPhase1Projects}
          emptyMessage="Nenhum projeto com início de Fase 1 agendado para esta semana."
          columns={[
            {
              id: 'client',
              header: 'Cartório / Projeto',
              width: '38%',
              renderCell: (row) => (
                <View>
                  <Text style={styles.clientName}>{row.clientName}</Text>
                  {row.ticketNumber ? <Text style={styles.ticketNumber}>Chamado: #{row.ticketNumber}</Text> : null}
                </View>
              ),
            },
            {
              id: 'period',
              header: 'Período Fase 1',
              width: '26%',
              renderCell: (row) => (
                <Text style={styles.tagText}>
                  {row.startDate} até {row.endDate}
                </Text>
              ),
            },
            {
              id: 'responsible',
              header: 'Implantador Responsável',
              width: '22%',
              renderCell: (row) => <Text style={[styles.tagText, styles.boldText]}>{row.responsible}</Text>,
            },
            {
              id: 'status',
              header: 'Status',
              width: '14%',
              align: 'center',
              renderCell: (row) => (
                <PdfStatusBadge
                  label={row.status}
                  variant={row.status.toLowerCase().includes('andamento') ? 'warning' : 'info'}
                />
              ),
            },
          ]}
        />

        {/* 3. Iniciando Pós-Implantação Nesta Semana */}
        <View style={styles.sectionTitleBox}>
          <Text style={styles.sectionTitle}>3. Iniciando Pós-Implantação nesta Semana</Text>
        </View>
        <View style={styles.highlightBox}>
          <Text style={styles.highlightText}>
            Regra Oficial Operacional: O ciclo de Pós-Implantação (2 semanas) inicia pontualmente na segunda-feira subsequente ao término da Fase 1 ({referencePeriod.currentWeekStartDate}).
          </Text>
        </View>
        <PdfTable<StartingPostImplantationItem>
          data={data.startingPostProjects}
          emptyMessage="Nenhuma implantação encerrou a Fase 1 na semana anterior para ingresso em Pós-Implantação nesta semana."
          columns={[
            {
              id: 'client',
              header: 'Cartório',
              width: '38%',
              renderCell: (row) => (
                <View>
                  <Text style={styles.clientName}>{row.clientName}</Text>
                  {row.ticketNumber ? <Text style={styles.ticketNumber}>Chamado: #{row.ticketNumber}</Text> : null}
                </View>
              ),
            },
            {
              id: 'phase1End',
              header: 'Término Fase 1',
              width: '18%',
              renderCell: (row) => <Text style={styles.tagText}>{row.phase1EndDate}</Text>,
            },
            {
              id: 'postPeriod',
              header: 'Período Pós (2 semanas)',
              width: '24%',
              renderCell: (row) => (
                <Text style={[styles.tagText, styles.boldText, { color: '#0284c7' }]}>
                  {row.postStartDate} a {row.postEndDate}
                </Text>
              ),
            },
            {
              id: 'responsible',
              header: 'Responsável CS / Pós',
              width: '20%',
              renderCell: (row) => <Text style={styles.tagText}>{row.responsible}</Text>,
            },
          ]}
        />

        {/* 4. Implantações Confirmadas vs Previstas (Horizonte Próximo) */}
        <View style={styles.sectionTitleBox}>
          <Text style={styles.sectionTitle}>4. Implantações Confirmadas vs Previstas (Próximos 45 Dias)</Text>
        </View>
        <PdfTable<DeploymentScheduleItem>
          data={data.deploymentsSchedule.slice(0, 6)}
          emptyMessage="Nenhum agendamento futuro localizado no horizonte de 45 dias."
          columns={[
            {
              id: 'client',
              header: 'Cartório',
              width: '38%',
              renderCell: (row) => (
                <View>
                  <Text style={styles.clientName}>{row.clientName}</Text>
                  <Text style={styles.ticketNumber}>{row.systemType}</Text>
                </View>
              ),
            },
            {
              id: 'dates',
              header: 'Data Prevista',
              width: '26%',
              renderCell: (row) => <Text style={styles.tagText}>{row.startDate} a {row.endDate}</Text>,
            },
            {
              id: 'responsible',
              header: 'Implantador',
              width: '20%',
              renderCell: (row) => <Text style={styles.tagText}>{row.responsible}</Text>,
            },
            {
              id: 'badge',
              header: 'Confirmação',
              width: '16%',
              align: 'center',
              renderCell: (row) => (
                <PdfStatusBadge
                  label={row.isConfirmed ? 'Confirmada' : 'Prevista'}
                  variant={row.isConfirmed ? 'success' : 'default'}
                />
              ),
            },
          ]}
        />

        <PdfFooter
          confidentialityNotice="Relatório Executivo Confidencial • Uso Interno da Diretoria Siplan"
          systemTag="Siplan HUB"
        />
      </Page>

      {/* ========================================================
          PÁGINA 3: INFRAESTRUTURA, AMBIENTE & FILA DE CONVERSÃO
          ======================================================== */}
      <Page size="A4" orientation="portrait" style={styles.page}>
        <PdfHeader
          title="Riscos Técnicos & Preparação"
          subtitle="Gargalos de Infraestrutura, Configuração de Ambiente e Fila de Conversão"
          moduleName="Engenharia & Infraestrutura"
          generatedAt={data.generatedAt}
          badge={`Semana ${referencePeriod.weekNumber}`}
        />

        {/* 5. Alertas de Infraestrutura (Gargalos mais antigos) */}
        <View style={styles.sectionTitleBox}>
          <Text style={styles.sectionTitle}>5. Projetos Aguardando Liberação de Infraestrutura</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Projetos na etapa &quot;1. Análise de Infraestrutura&quot; ordenados pelo maior tempo em aberto (risco direto para início da Fase 1).
        </Text>
        <PdfTable<InfraGargaloItem>
          data={data.infraGargalos.slice(0, 6)}
          emptyMessage="Nenhum projeto com análise de infraestrutura retida ou em atraso."
          columns={[
            {
              id: 'client',
              header: 'Cartório',
              width: '38%',
              renderCell: (row) => (
                <View>
                  <Text style={styles.clientName}>{row.clientName}</Text>
                  {row.blockingReason ? (
                    <Text style={[styles.ticketNumber, { color: pdfTokens.colors.dangerText }]}>
                      Motivo: {row.blockingReason}
                    </Text>
                  ) : null}
                </View>
              ),
            },
            {
              id: 'startDate',
              header: 'Início Análise',
              width: '18%',
              renderCell: (row) => <Text style={styles.tagText}>{row.startDate}</Text>,
            },
            {
              id: 'days',
              header: 'Tempo em Espera',
              width: '22%',
              align: 'center',
              renderCell: (row) => (
                <PdfStatusBadge
                  label={`${row.daysWaiting} dias`}
                  variant={row.daysWaiting > 15 ? 'danger' : row.daysWaiting > 7 ? 'warning' : 'info'}
                />
              ),
            },
            {
              id: 'responsible',
              header: 'Responsável Infra',
              width: '22%',
              renderCell: (row) => <Text style={styles.tagText}>{row.responsible}</Text>,
            },
          ]}
        />

        {/* 6. Configurações de Ambiente com Prazo na Semana */}
        <View style={styles.sectionTitleBox}>
          <Text style={styles.sectionTitle}>6. Configurações de Ambiente para Finalizar nesta Semana</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Prazos de entrega baseados no Kanban de Ambiente (última sexta-feira útil anterior à data de implantação Fase 1).
        </Text>
        <PdfTable<EnvironmentDeadlineItem>
          data={data.environmentDeadlines.slice(0, 6)}
          emptyMessage="Todas as configurações de ambiente com prazo para esta semana já foram concluídas."
          columns={[
            {
              id: 'client',
              header: 'Cartório',
              width: '36%',
              renderCell: (row) => (
                <View>
                  <Text style={styles.clientName}>{row.clientName}</Text>
                  <Text style={styles.ticketNumber}>Início Fase 1: {row.phase1StartDate || '-'}</Text>
                </View>
              ),
            },
            {
              id: 'targetDate',
              header: 'Data Limite Ambiente',
              width: '24%',
              renderCell: (row) => (
                <Text style={[styles.tagText, styles.boldText]}>{row.targetDate}</Text>
              ),
            },
            {
              id: 'urgency',
              header: 'SLA / Prazo',
              width: '20%',
              align: 'center',
              renderCell: (row) => (
                <PdfStatusBadge
                  label={
                    row.daysRemaining < 0
                      ? `${Math.abs(row.daysRemaining)}d Atrasado`
                      : row.daysRemaining === 0
                      ? 'Hoje'
                      : `${row.daysRemaining}d restantes`
                  }
                  variant={
                    row.daysRemaining <= 0 || row.urgencyLevel === 'critical'
                      ? 'danger'
                      : row.daysRemaining <= 3 || row.urgencyLevel === 'danger'
                      ? 'warning'
                      : 'info'
                  }
                />
              ),
            },
            {
              id: 'responsible',
              header: 'Responsável',
              width: '20%',
              renderCell: (row) => <Text style={styles.tagText}>{row.responsible}</Text>,
            },
          ]}
        />

        {/* 7. Fila de Conversão por Responsável */}
        <View style={styles.sectionTitleBox}>
          <Text style={styles.sectionTitle}>7. Fila de Conversão por Responsável</Text>
        </View>
        <PdfTable<ConversionQueueAnalystGroup>
          data={data.conversionQueueGroups}
          emptyMessage="Nenhuma demanda na fila de conversão pendente de execução."
          columns={[
            {
              id: 'analyst',
              header: 'Analista de Conversão',
              width: '40%',
              renderCell: (row) => <Text style={styles.clientName}>{row.analystName}</Text>,
            },
            {
              id: 'total',
              header: 'Total Ativas',
              width: '18%',
              align: 'center',
              renderCell: (row) => <Text style={[styles.tagText, styles.boldText]}>{row.totalActive}</Text>,
            },
            {
              id: 'inProgress',
              header: 'Em Andamento',
              width: '22%',
              align: 'center',
              renderCell: (row) => (
                <PdfStatusBadge label={`${row.inProgress} em execução`} variant="warning" />
              ),
            },
            {
              id: 'homolog',
              header: 'Em Homologação',
              width: '20%',
              align: 'center',
              renderCell: (row) => (
                <PdfStatusBadge label={`${row.homologation} validando`} variant="info" />
              ),
            },
          ]}
        />

        <PdfFooter
          confidentialityNotice="Relatório Executivo Confidencial • Uso Interno da Diretoria Siplan"
          systemTag="Siplan HUB"
        />
      </Page>

      {/* ========================================================
          PÁGINA 4: EVOLUÇÃO TÉCNICA SIPLAN HUB & ENCERRAMENTO
          ======================================================== */}
      <Page size="A4" orientation="portrait" style={styles.page}>
        <PdfHeader
          title="Inovação & Plataforma"
          subtitle="Evolução Técnica, Novidades e Atualizações do Siplan HUB"
          moduleName="Tecnologia & Produto"
          generatedAt={data.generatedAt}
          badge={`Semana ${referencePeriod.weekNumber}`}
        />

        {/* 8. Evolução Técnica da Plataforma (Changelog) */}
        <View style={styles.sectionTitleBox}>
          <Text style={styles.sectionTitle}>8. Novidades & Atualizações Recentes no Siplan HUB</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Funcionalidades, melhorias operacionais e correções entregues recentemente para apoiar a esteira de implantação.
        </Text>

        <View style={{ marginBottom: pdfTokens.spacing.md }}>
          {data.platformChangelog.map((c, i) => (
            <View key={i} style={styles.changelogItem}>
              <View style={styles.changelogHeader}>
                <Text style={styles.changelogTitle}>• {c.title}</Text>
                <PdfStatusBadge
                  label={
                    c.type === 'release_feature'
                      ? 'Nova Funcionalidade'
                      : c.type === 'release_screen'
                      ? 'Nova Tela'
                      : c.type === 'release_fix'
                      ? 'Correção'
                      : 'Melhoria'
                  }
                  variant={
                    c.type === 'release_feature' || c.type === 'release_screen'
                      ? 'success'
                      : c.type === 'release_fix'
                      ? 'warning'
                      : 'info'
                  }
                />
              </View>
              <Text style={styles.changelogBody}>{c.message}</Text>
            </View>
          ))}
        </View>

        <PdfSignatureBlock
          title="Validação & Ciência da Diretoria"
          disclaimer="Este relatório foi sintetizado automaticamente pela inteligência de dados do Antigravity AI com base nos registros auditados do Siplan HUB."
          parties={[
            {
              role: 'Validação Operacional e Gestão de Prazos',
              name: 'Coordenação de Implantação',
              date: data.referencePeriod.currentWeekStartDate,
            },
            {
              role: 'Ciência Executiva e Deliberações Estratégicas',
              name: 'Diretoria de Operações Siplan',
              date: data.referencePeriod.currentWeekStartDate,
            },
          ]}
        />

        <PdfFooter
          confidentialityNotice="Relatório Executivo Confidencial • Uso Interno da Diretoria Siplan"
          systemTag="Siplan HUB"
        />
      </Page>
    </Document>
  );
};
