import { describe, it, expect } from 'vitest';
import React from 'react';
import {
  WeeklyExecutiveReportTemplate,
  calculateReferencePeriods,
  generatePdfBlob,
  type WeeklyExecutiveReportData,
} from '@/modules/pdf';

describe('Weekly Executive Report Module (@react-pdf/renderer)', () => {
  it('calcula corretamente os períodos de referência semanais', () => {
    // Simular uma terça-feira (03/11/2026)
    const testDate = new Date(2026, 10, 3); // Mês 10 = Novembro (0-indexed)
    const periods = calculateReferencePeriods(testDate);

    expect(periods.weekNumber).toBeGreaterThan(0);
    expect(periods.year).toBe(2026);
    expect(periods.currentWeekStartDate).toBe('02/11/2026'); // Segunda-feira
    expect(periods.currentWeekEndDate).toBe('08/11/2026');   // Domingo
    expect(periods.previousWeekStartDate).toBe('26/10/2026'); // Segunda anterior
    expect(periods.previousWeekEndDate).toBe('01/11/2026');   // Domingo anterior
  });

  it('renderiza o template WeeklyExecutiveReportTemplate sem erros para PDF Blob', async () => {
    const mockData: WeeklyExecutiveReportData = {
      title: 'Relatório Executivo Semanal de Implantação',
      subtitle: 'Semana 45/2026 • Período de Análise: 26/10/2026 a 01/11/2026',
      generatedAt: '03/11/2026, 08:30:00',
      generatedBy: 'Antigravity AI Assistant',
      referencePeriod: {
        startDate: '26/10/2026',
        endDate: '01/11/2026',
        currentWeekStartDate: '02/11/2026',
        currentWeekEndDate: '08/11/2026',
        previousWeekStartDate: '26/10/2026',
        previousWeekEndDate: '01/11/2026',
        weekNumber: 45,
        year: 2026,
      },
      kpis: {
        totalActiveProjects: 42,
        advancedStagesLastWeekCount: 8,
        startingPhase1ThisWeekCount: 2,
        startingPostThisWeekCount: 1,
        infraGargalosCount: 4,
        environmentUrgentCount: 2,
        activeConversionsCount: 15,
        criticalHealthCount: 3,
      },
      aiExecutiveSummary: {
        overview: 'Semana produtiva com estabilização na esteira de implantações.',
        highlights: ['2 cartórios iniciaram Fase 1 com sucesso.', 'Taxa de avanço de 19%.'],
        criticalRisks: ['Cartório Modelo com infraestrutura pendente há 18 dias.'],
        strategicActions: ['Alinhar reunião emergencial com suporte de TI local.'],
      },
      advancedProjects: [
        {
          id: 'proj-1',
          clientName: '1º Ofício de Notas de Teste',
          systemType: 'Orion',
          currentStage: 'Treinamento Concluído',
          updatedAt: '30/10/2026',
          responsible: 'Implantador Alfa',
        },
      ],
      startingPhase1Projects: [
        {
          id: 'proj-2',
          clientName: 'Cartório Central de Registro',
          startDate: '02/11/2026',
          endDate: '06/11/2026',
          responsible: 'Implantador Beta',
          systemType: 'Siplan',
          status: 'Confirmada',
        },
      ],
      infraGargalos: [
        {
          id: 'proj-3',
          clientName: 'Registro Civil da Capital',
          startDate: '10/10/2026',
          daysWaiting: 24,
          responsible: 'Equipe Infra',
          blockingReason: 'Aguardando liberação de porta de VPN pelo cliente',
        },
      ],
      environmentDeadlines: [
        {
          id: 'proj-4',
          clientName: 'Cartório de Paz e Notas',
          targetDate: '06/11/2026',
          daysRemaining: 3,
          urgencyLevel: 'warning',
          responsible: 'Luciane Lima',
          phase1StartDate: '09/11/2026',
        },
      ],
      deploymentsSchedule: [
        {
          id: 'proj-5',
          clientName: 'Ofício de Títulos e Documentos',
          startDate: '16/11/2026',
          endDate: '20/11/2026',
          responsible: 'Implantador Gamma',
          systemType: 'Orion',
          status: 'Confirmada',
          isConfirmed: true,
        },
      ],
      conversionQueueGroups: [
        {
          analystName: 'Carlos Analista',
          totalActive: 4,
          inProgress: 2,
          waiting: 1,
          homologation: 1,
          items: [
            {
              clientName: 'Cartório A',
              status: 'in_progress',
              priority: 1,
            },
          ],
        },
      ],
      startingPostProjects: [
        {
          id: 'proj-6',
          clientName: 'Cartório que Encerrou Fase 1',
          phase1EndDate: '30/10/2026',
          postStartDate: '02/11/2026',
          postEndDate: '16/11/2026',
          responsible: 'CS Analista',
          systemType: 'Siplan',
        },
      ],
      platformChangelog: [
        {
          title: 'Nova Super Agenda Geral',
          message: 'Integração em tempo real com implantações Fase 1 e puxada do Ellevo 0800.',
          date: '31/10/2026',
          type: 'release_feature',
        },
      ],
    };

    const docElement = <WeeklyExecutiveReportTemplate data={mockData} />;
    const blob = await generatePdfBlob(docElement as React.ReactElement);

    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe('application/pdf');
  });
});
