import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { collectWeeklyExecutiveReportData } from '../../src/modules/pdf/services/weeklyReportDataCollector';
import { WeeklyExecutiveReportTemplate } from '../../src/modules/pdf/templates/WeeklyExecutiveReportTemplate';
import type { AiExecutiveSummary } from '../../src/modules/pdf/types/weeklyReport';

async function main() {
  console.log('=====================================================');
  console.log('📊 Gerador Oficial do Relatório Executivo Semanal Siplan HUB');
  console.log('   Tecnologia: @react-pdf/renderer • Antigravity AI Engine');
  console.log('=====================================================\n');

  try {
    // 1. Verificar se foi passada uma análise customizada da IA via arquivo temporário ou argumento
    let customAiSummary: Partial<AiExecutiveSummary> | undefined = undefined;
    const aiSummaryArg = process.argv[2];
    if (aiSummaryArg && fs.existsSync(aiSummaryArg)) {
      try {
        const rawContent = fs.readFileSync(aiSummaryArg, 'utf-8');
        customAiSummary = JSON.parse(rawContent);
        console.log(`🤖 Parecer de IA personalizado carregado de: ${aiSummaryArg}`);
      } catch (e) {
        console.warn('Aviso: Não foi possível ler o arquivo de análise de IA fornecido:', e);
      }
    }

    console.log('🔄 1/3 Consultando base do Supabase em tempo real...');
    const reportData = await collectWeeklyExecutiveReportData(customAiSummary);

    console.log(`✅ Dados consolidados:`);
    console.log(`   - Período Analisado: ${reportData.referencePeriod.startDate} a ${reportData.referencePeriod.endDate}`);
    console.log(`   - Semana Corrente: ${reportData.referencePeriod.currentWeekStartDate} a ${reportData.referencePeriod.currentWeekEndDate}`);
    console.log(`   - Total de Projetos Ativos: ${reportData.kpis.totalActiveProjects}`);
    console.log(`   - Avanços de Etapa: ${reportData.kpis.advancedStagesLastWeekCount}`);
    console.log(`   - Iniciando Fase 1 nesta Semana: ${reportData.kpis.startingPhase1ThisWeekCount}`);
    console.log(`   - Iniciando Pós-Implantação nesta Semana: ${reportData.kpis.startingPostThisWeekCount}`);
    console.log(`   - Gargalos de Infraestrutura: ${reportData.kpis.infraGargalosCount}`);
    console.log(`   - Configurações de Ambiente Críticas: ${reportData.kpis.environmentUrgentCount}`);
    console.log(`   - Fila de Conversão: ${reportData.kpis.activeConversionsCount} demandas abertas\n`);

    console.log('📄 2/3 Montando documento oficial em @react-pdf/renderer...');
    const element = React.createElement(WeeklyExecutiveReportTemplate, { data: reportData });
    const pdfInstance = pdf(element);
    const blob = await pdfInstance.toBlob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('💾 3/3 Gravando arquivo PDF físico em disco...');
    const outputDir = path.resolve(process.cwd(), 'relatorios');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    const fileName = `Relatorio_Executivo_Implantacao_${todayIso}_Semana_${reportData.referencePeriod.weekNumber}.pdf`;
    const outputPath = path.join(outputDir, fileName);

    fs.writeFileSync(outputPath, buffer);

    const stats = fs.statSync(outputPath);
    const sizeKb = (stats.size / 1024).toFixed(1);

    console.log('\n=====================================================');
    console.log('🎉 Relatório Executivo Gerado com Sucesso!');
    console.log(`📁 Arquivo: ${outputPath}`);
    console.log(`📏 Tamanho: ${sizeKb} KB`);
    console.log(`🕒 Gerado em: ${reportData.generatedAt}`);
    console.log('=====================================================\n');

    // Imprimir resumo formatado em JSON na última linha para consumo programático
    console.log('__REPORT_JSON_METADATA_START__');
    console.log(JSON.stringify({
      outputPath,
      fileName,
      sizeKb,
      kpis: reportData.kpis,
      referencePeriod: reportData.referencePeriod,
    }));
    console.log('__REPORT_JSON_METADATA_END__');

  } catch (error) {
    console.error('❌ Erro fatal durante a geração do relatório semanal:', error);
    process.exit(1);
  }
}

main();
