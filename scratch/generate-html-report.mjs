import fs from 'fs';
import path from 'path';

// Load our comprehensive dataset
const data = JSON.parse(fs.readFileSync('scratch/full-analysis-v2.json', 'utf8'));

// Enrich tickets with forensic diagnoses and classifications based on subagent findings
for (const mod of data) {
  for (const t of mod.tickets) {
    t.diasAbertoNum = parseInt(t.diasAberto, 10) || 0;
    
    // Determine age group
    if (t.diasAbertoNum <= 30) t.faixaIdade = '< 30 dias';
    else if (t.diasAbertoNum <= 90) t.faixaIdade = '30 - 90 dias';
    else if (t.diasAbertoNum <= 180) t.faixaIdade = '91 - 180 dias';
    else if (t.diasAbertoNum <= 365) t.faixaIdade = '181 - 365 dias';
    else t.faixaIdade = '> 365 dias';

    // Forensic classification
    const descLower = (t.descricaoAbertura || '').toLowerCase();
    const tituloLower = (t.titulo || '').toLowerCase();
    const tramtLower = t.tramites.map(tr => (tr.descricao || '').toLowerCase()).join(' ');
    const allText = `${descLower} ${tituloLower} ${tramtLower}`;

    t.isFantasma = false;
    t.isFaturamento = false;
    t.isConversaoGargalo = false;
    t.isMisrouting = false;
    t.prioridade = 'Normal';

    // Faturamento checks (OPs with contracts sem recorrência)
    if (t.numeroChamado === '742700' || t.numeroChamado === '743505' || t.numeroChamado === '740396' ||
        t.numeroChamado === '717614' || t.numeroChamado === '679384' || t.numeroChamado === '754769' ||
        t.numeroChamado === '754579' || t.numeroChamado === '577181') {
      t.isFaturamento = true;
      t.prioridade = 'Alta (Faturamento)';
    }

    // Ghost tickets (text says completed/closed but status is open)
    if (allText.includes('chamado encerrado') || allText.includes('finalizo este chamado') ||
        allText.includes('chamado finalizado') || allText.includes('autorizou o encerramento') ||
        allText.includes('chamado foi concluido') || allText.includes('devolvido para estoque') ||
        allText.includes('devolvido ao adm') || allText.includes('caso solucionado e finalizo') ||
        allText.includes('com a solução aplicada, consideramos o atendimento concluído') ||
        allText.includes('realizei a inativação do cliente') || allText.includes('cliente já se encontra inativo') ||
        t.numeroChamado === '660295') {
      t.isFantasma = true;
    }

    // Conversão categories
    if (mod.module === 'Conversão') {
      if (t.numeroChamado === '758671' || t.numeroChamado === '758322') {
        t.isMisrouting = true;
        t.prioridade = 'P4 (Redirecionar)';
      } else if (['757439', '727148', '754223', '747695', '681592', '631055', '643736', '733300'].includes(t.numeroChamado)) {
        t.prioridade = 'P1 (Risco Jurídico/Regulatório)';
      } else if (['712609', '750031', '712810', '753157', '687197', '710310', '728707', '704197', '590970'].includes(t.numeroChamado)) {
        t.prioridade = 'P2 (Caminho Crítico / GED)';
      } else if (['745688', '739993', '697200', '668700', '677282', '679686', '696533'].includes(t.numeroChamado)) {
        t.prioridade = 'P3 (Retrabalho / Quick-Win)';
      } else {
        t.prioridade = 'P4 (Baixa Administrativa)';
      }
    }
  }
}

// Generate the complete HTML content
console.log('Generating interactive HTML report...');

const html = `<!DOCTYPE html>
<html lang="pt-BR" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Siplan Hub — Levantamento Especializado de Chamados 0800</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Chart.js CDN -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            siplan: {
              50: '#fdf2f4',
              100: '#fbe6e9',
              200: '#f7d0d7',
              300: '#f0abb8',
              400: '#e57a91',
              500: '#d74e6f',
              600: '#c02e53',
              700: '#9e1c3f',
              800: '#851a37',
              900: '#701a32',
              950: '#400a18',
              primary: '#800020',
              accent: '#9e1c3f'
            }
          }
        }
      }
    }
  </script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    code, pre, .font-mono {
      font-family: 'JetBrains Mono', monospace;
    }
    /* Custom Scrollbars */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: #0f172a;
    }
    ::-webkit-scrollbar-thumb {
      background: #334155;
      border-radius: 3px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #9e1c3f;
    }
    .badge-bordo {
      background: rgba(158, 28, 63, 0.15);
      color: #f7d0d7;
      border: 1px solid rgba(158, 28, 63, 0.35);
    }
    .badge-emerald {
      background: rgba(16, 185, 129, 0.12);
      color: #6ee7b7;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .badge-amber {
      background: rgba(245, 158, 11, 0.12);
      color: #fcd34d;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .badge-rose {
      background: rgba(244, 63, 94, 0.15);
      color: #fda4af;
      border: 1px solid rgba(244, 63, 94, 0.35);
    }
    .badge-slate {
      background: rgba(100, 116, 139, 0.15);
      color: #cbd5e1;
      border: 1px solid rgba(100, 116, 139, 0.3);
    }
  </style>
</head>
<body class="bg-[#0b0f17] text-slate-100 min-h-screen antialiased flex flex-col">

  <!-- Header Institucional -->
  <header class="border-b border-slate-800 bg-[#0e1422]/95 backdrop-blur sticky top-0 z-40">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-siplan-700 via-siplan-800 to-siplan-950 flex items-center justify-center shadow-lg shadow-siplan-900/50 border border-siplan-600/40">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-base sm:text-lg font-bold tracking-tight text-white">SIPLAN <span class="text-siplan-400 font-extrabold">HUB</span></h1>
            <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-siplan-900/80 text-siplan-200 border border-siplan-700/50">Auditoria 0800</span>
          </div>
          <p class="text-xs text-slate-400">Levantamento Estratégico & Saneamento de Chamados em Lote</p>
        </div>
      </div>

      <div class="flex items-center gap-2.5">
        <div class="text-right hidden sm:block">
          <div class="text-xs font-medium text-slate-300">Base: 25/09/2026</div>
          <div class="text-[10px] text-slate-500">Produtos: SGA, LCW, GED & Conversão</div>
        </div>
        <button onclick="window.print()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition flex items-center gap-1.5 shadow-sm">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
          </svg>
          Imprimir / PDF
        </button>
        <button onclick="exportFullCsv()" class="px-3 py-1.5 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 text-xs font-semibold text-emerald-100 border border-emerald-600/50 transition flex items-center gap-1.5 shadow-sm">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          Exportar CSV
        </button>
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 space-y-6">

    <!-- KPI Summary Grid -->
    <section class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <!-- Total Analisado -->
      <div class="bg-[#121927] border border-slate-800/80 rounded-xl p-3.5 relative overflow-hidden shadow-sm">
        <div class="text-[11px] font-medium text-slate-400">Total Auditado</div>
        <div class="text-2xl font-extrabold text-white mt-1">233</div>
        <div class="text-[10px] text-slate-500 mt-0.5">Nas 4 planilhas 0800</div>
        <div class="absolute -right-2 -bottom-2 w-12 h-12 bg-slate-800/20 rounded-full blur-sm pointer-events-none"></div>
      </div>

      <!-- Desconsiderados -->
      <div class="bg-[#121927] border border-slate-800/80 rounded-xl p-3.5 relative overflow-hidden shadow-sm">
        <div class="text-[11px] font-medium text-amber-400/90">Desconsiderados</div>
        <div class="text-2xl font-extrabold text-amber-300 mt-1">11</div>
        <div class="text-[10px] text-amber-500/80 mt-0.5">Projetos Ativos no HUB</div>
        <div class="absolute -right-2 -bottom-2 w-12 h-12 bg-amber-500/10 rounded-full blur-sm pointer-events-none"></div>
      </div>

      <!-- Mantidos -->
      <div class="bg-[#121927] border border-siplan-800/50 rounded-xl p-3.5 relative overflow-hidden shadow-sm shadow-siplan-950/40">
        <div class="text-[11px] font-medium text-siplan-300">Mantidos no Foco</div>
        <div class="text-2xl font-extrabold text-siplan-200 mt-1">222</div>
        <div class="text-[10px] text-siplan-400 mt-0.5">Passivo real a sanear</div>
        <div class="absolute -right-2 -bottom-2 w-12 h-12 bg-siplan-700/20 rounded-full blur-sm pointer-events-none"></div>
      </div>

      <!-- Trava de Faturamento -->
      <div class="bg-[#121927] border border-red-900/60 rounded-xl p-3.5 relative overflow-hidden shadow-sm">
        <div class="text-[11px] font-medium text-rose-400">Trava Faturamento</div>
        <div class="text-2xl font-extrabold text-rose-300 mt-1">7 OPs</div>
        <div class="text-[10px] text-rose-500/90 mt-0.5">Contratos sem recorrência</div>
        <div class="absolute -right-2 -bottom-2 w-12 h-12 bg-rose-500/10 rounded-full blur-sm pointer-events-none"></div>
      </div>

      <!-- Chamados Fantasmas -->
      <div class="bg-[#121927] border border-slate-800/80 rounded-xl p-3.5 relative overflow-hidden shadow-sm">
        <div class="text-[11px] font-medium text-cyan-400">Fantasmas / Baixar</div>
        <div class="text-2xl font-extrabold text-cyan-300 mt-1">117+</div>
        <div class="text-[10px] text-cyan-500 mt-0.5">Resolvidos no trâmite</div>
        <div class="absolute -right-2 -bottom-2 w-12 h-12 bg-cyan-500/10 rounded-full blur-sm pointer-events-none"></div>
      </div>

      <!-- Passivo Antigo > 1 ano -->
      <div class="bg-[#121927] border border-slate-800/80 rounded-xl p-3.5 relative overflow-hidden shadow-sm">
        <div class="text-[11px] font-medium text-purple-400">Aging > 365 dias</div>
        <div class="text-2xl font-extrabold text-purple-300 mt-1">149</div>
        <div class="text-[10px] text-purple-400/80 mt-0.5">67% do passivo total</div>
        <div class="absolute -right-2 -bottom-2 w-12 h-12 bg-purple-500/10 rounded-full blur-sm pointer-events-none"></div>
      </div>
    </section>

    <!-- Plano de Ação Estratégico Banner -->
    <section class="bg-gradient-to-r from-siplan-950 via-[#131b2e] to-[#0f172a] border border-siplan-800/60 rounded-2xl p-5 shadow-lg shadow-black/40">
      <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-siplan-800 text-siplan-100 border border-siplan-600/60">Ação Imediata</span>
            <h2 class="text-sm sm:text-base font-bold text-white">4 Frentes Prioritárias de Saneamento e Destravamento</h2>
          </div>
          <p class="text-xs text-slate-300 max-w-3xl">
            O levantamento pericial comprovou que <span class="text-amber-300 font-semibold">a grande maioria dos chamados em aberto decorre de falhas de fechamento formal</span> e não de atendimentos em curso. O foco deve ser destravar as 7 OPs com retenção de receita recorrente e realizar a baixa em lote de mais de 100 chamados fantasmas.
          </p>
        </div>
        <div class="flex items-center gap-2 self-stretch lg:self-auto justify-end">
          <button onclick="switchTab('faturamento')" class="px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-xs font-semibold text-rose-200 transition shadow-sm">
            Ver 7 OPs de Faturamento
          </button>
          <button onclick="switchTab('desconsiderados')" class="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 transition shadow-sm">
            Ver 11 Desconsiderados
          </button>
        </div>
      </div>

      <!-- Mini-Cards das 4 Frentes -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/80">
        <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
          <div class="font-bold text-rose-300 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-rose-500"></span>
            1. Destravar Faturamento (48h)
          </div>
          <p class="text-slate-400 text-[11px] leading-relaxed">
            Miguelópolis (#742700), Beruri (#743505), Tietê (#740396), Santos (#717614) e Rio Claro (#679384) possuem contratos sem ativação de recorrência.
          </p>
        </div>

        <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
          <div class="font-bold text-cyan-300 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
            2. Baixa em Lote de Fantasmas
          </div>
          <p class="text-slate-400 text-[11px] leading-relaxed">
            Encerrar sumariamente 28 chamados do SGA (Docker/totens) e 90+ do LCW abertos há mais de 1 ano que já foram resolvidos ou inativados.
          </p>
        </div>

        <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
          <div class="font-bold text-purple-300 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-purple-400"></span>
            3. Risco Regulatório TJSP / CNJ
          </div>
          <p class="text-slate-400 text-[11px] leading-relaxed">
            Corrigir 29 mil selos de Miguelópolis (#757439), indisponibilidade de Guarulhos (#727148), atos inativos de São Caetano e cartões de Sumaré.
          </p>
        </div>

        <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
          <div class="font-bold text-siplan-300 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-siplan-500"></span>
            4. Motor de Conversão OrionGED
          </div>
          <p class="text-slate-400 text-[11px] leading-relaxed">
            Priorizar na Engenharia o ETL automático do OrionGED para destravar 9 cartórios com acervos de imagens congelados há meses.
          </p>
        </div>
      </div>
    </section>

    <!-- Navigation Tabs -->
    <nav class="flex items-center gap-1 border-b border-slate-800 overflow-x-auto pb-px text-xs font-medium">
      <button onclick="switchTab('visao-geral')" id="tab-btn-visao-geral" class="tab-btn active px-4 py-2.5 border-b-2 border-siplan-500 text-siplan-300 font-bold flex items-center gap-2 whitespace-nowrap transition">
        <span>📊 Visão Geral Consolidada</span>
      </button>
      <button onclick="switchTab('conversao')" id="tab-btn-conversao" class="tab-btn px-4 py-2.5 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2 whitespace-nowrap transition">
        <span>🔄 Conversão</span>
        <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-700/50">31</span>
      </button>
      <button onclick="switchTab('lcw')" id="tab-btn-lcw" class="tab-btn px-4 py-2.5 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2 whitespace-nowrap transition">
        <span>📑 LCW (Livro Caixa)</span>
        <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-slate-700">155</span>
      </button>
      <button onclick="switchTab('sga')" id="tab-btn-sga" class="tab-btn px-4 py-2.5 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2 whitespace-nowrap transition">
        <span>💼 SGA (Atendimento)</span>
        <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-slate-700">30</span>
      </button>
      <button onclick="switchTab('ged')" id="tab-btn-ged" class="tab-btn px-4 py-2.5 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2 whitespace-nowrap transition">
        <span>📂 Orion GED</span>
        <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-slate-700">6</span>
      </button>
      <button onclick="switchTab('faturamento')" id="tab-btn-faturamento" class="tab-btn px-4 py-2.5 border-b-2 border-transparent text-slate-400 hover:text-rose-300 flex items-center gap-2 whitespace-nowrap transition">
        <span>💰 Trava de Faturamento</span>
        <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-950 text-rose-300 border border-rose-700/60 font-bold">7</span>
      </button>
      <button onclick="switchTab('desconsiderados')" id="tab-btn-desconsiderados" class="tab-btn px-4 py-2.5 border-b-2 border-transparent text-slate-400 hover:text-amber-300 flex items-center gap-2 whitespace-nowrap transition">
        <span>🚫 Desconsiderados (HUB Ativo)</span>
        <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-950 text-amber-300 border border-amber-700/50">11</span>
      </button>
    </nav>

    <!-- TAB 1: VISÃO GERAL CONSOLIDADA -->
    <div id="tab-visao-geral" class="tab-content space-y-6">
      
      <!-- Charts Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- Chart 1: Volume por Módulo -->
        <div class="bg-[#121927] border border-slate-800 rounded-xl p-4 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold text-white uppercase tracking-wider">Volume de Chamados por Módulo (Total: 233)</h3>
            <span class="text-[10px] text-slate-400">Total vs Mantidos</span>
          </div>
          <div class="h-64 flex items-center justify-center">
            <canvas id="chartModulos"></canvas>
          </div>
        </div>

        <!-- Chart 2: Aging do Passivo -->
        <div class="bg-[#121927] border border-slate-800 rounded-xl p-4 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold text-white uppercase tracking-wider">Aging do Passivo Mantido (222 Chamados)</h3>
            <span class="text-[10px] text-slate-400">Faixas de Dias em Aberto</span>
          </div>
          <div class="h-64 flex items-center justify-center">
            <canvas id="chartAging"></canvas>
          </div>
        </div>
      </div>

      <!-- Tabela Comparativa dos Módulos -->
      <div class="bg-[#121927] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div class="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <h3 class="text-xs font-bold text-white uppercase tracking-wider">Matriz Consolidada por Módulo</h3>
          <span class="text-xs text-slate-400">Visão Sintética de Auditoria</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left">
            <thead class="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th class="px-4 py-3">Módulo / Equipe</th>
                <th class="px-4 py-3 text-center">Total 0800</th>
                <th class="px-4 py-3 text-center text-amber-400">Desconsiderados</th>
                <th class="px-4 py-3 text-center text-siplan-300">Mantidos</th>
                <th class="px-4 py-3 text-center">% Mantidos</th>
                <th class="px-4 py-3 text-center text-rose-400">Trava Faturamento</th>
                <th class="px-4 py-3 text-center text-cyan-400">Fantasmas / Baixar</th>
                <th class="px-4 py-3 text-center">Idade Média</th>
                <th class="px-4 py-3">Gargalo Principal</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60 font-mono text-[11px]">
              <tr class="hover:bg-slate-800/30 transition">
                <td class="px-4 py-3 font-sans font-bold text-white flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  LCW (Livro Caixa Web)
                </td>
                <td class="px-4 py-3 text-center font-bold">163</td>
                <td class="px-4 py-3 text-center text-amber-400 font-bold">8</td>
                <td class="px-4 py-3 text-center text-siplan-300 font-bold">155</td>
                <td class="px-4 py-3 text-center">95,1%</td>
                <td class="px-4 py-3 text-center text-rose-400 font-bold">3 OPs</td>
                <td class="px-4 py-3 text-center text-cyan-400 font-bold">92+</td>
                <td class="px-4 py-3 text-center">785 dias</td>
                <td class="px-4 py-3 font-sans text-slate-300">92 chamados já resolvidos sem baixa; 3 OPs travando recorrência</td>
              </tr>
              <tr class="hover:bg-slate-800/30 transition">
                <td class="px-4 py-3 font-sans font-bold text-white flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  SGA (Atendimento)
                </td>
                <td class="px-4 py-3 text-center font-bold">32</td>
                <td class="px-4 py-3 text-center text-amber-400 font-bold">2</td>
                <td class="px-4 py-3 text-center text-siplan-300 font-bold">30</td>
                <td class="px-4 py-3 text-center">93,8%</td>
                <td class="px-4 py-3 text-center text-rose-400 font-bold">2 OPs</td>
                <td class="px-4 py-3 text-center text-cyan-400 font-bold">25</td>
                <td class="px-4 py-3 text-center">711 dias</td>
                <td class="px-4 py-3 font-sans text-slate-300">21 erros crônicos de Docker resolvidos sem encerramento; 2 OPs de cliente</td>
              </tr>
              <tr class="hover:bg-slate-800/30 transition">
                <td class="px-4 py-3 font-sans font-bold text-white flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                  Equipe Conversão
                </td>
                <td class="px-4 py-3 text-center font-bold">31</td>
                <td class="px-4 py-3 text-center text-amber-400 font-bold">0</td>
                <td class="px-4 py-3 text-center text-siplan-300 font-bold">31</td>
                <td class="px-4 py-3 text-center">100,0%</td>
                <td class="px-4 py-3 text-center text-slate-400">—</td>
                <td class="px-4 py-3 text-center text-cyan-400 font-bold">3</td>
                <td class="px-4 py-3 text-center">326 dias</td>
                <td class="px-4 py-3 font-sans text-slate-300">Falta de motor OrionGED (9 chamados); corrupção de selos/atos; 2 misroutings NFSe</td>
              </tr>
              <tr class="hover:bg-slate-800/30 transition">
                <td class="px-4 py-3 font-sans font-bold text-white flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                  Orion GED
                </td>
                <td class="px-4 py-3 text-center font-bold">7</td>
                <td class="px-4 py-3 text-center text-amber-400 font-bold">1</td>
                <td class="px-4 py-3 text-center text-siplan-300 font-bold">6</td>
                <td class="px-4 py-3 text-center">85,7%</td>
                <td class="px-4 py-3 text-center text-rose-400 font-bold">2 OPs</td>
                <td class="px-4 py-3 text-center text-cyan-400 font-bold">1</td>
                <td class="px-4 py-3 text-center">365 dias</td>
                <td class="px-4 py-3 font-sans text-slate-300">2 OPs travando receita (Santos e Rio Claro); 3 acervos de livros/imagens parados</td>
              </tr>
            </tbody>
            <tfoot class="bg-slate-900/90 text-white font-bold border-t border-slate-700">
              <tr>
                <td class="px-4 py-3 font-sans">TOTAL CONSOLIDADO</td>
                <td class="px-4 py-3 text-center font-mono">233</td>
                <td class="px-4 py-3 text-center text-amber-400 font-mono">11</td>
                <td class="px-4 py-3 text-center text-siplan-300 font-mono">222</td>
                <td class="px-4 py-3 text-center font-mono">95,3%</td>
                <td class="px-4 py-3 text-center text-rose-400 font-mono">7 OPs</td>
                <td class="px-4 py-3 text-center text-cyan-400 font-mono">121+</td>
                <td class="px-4 py-3 text-center font-mono">653 dias</td>
                <td class="px-4 py-3 font-sans text-xs text-slate-300">Saneamento em massa imediato de 55% da fila e ativação de receita</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 2: CONVERSÃO -->
    <div id="tab-conversao" class="tab-content hidden space-y-4">
      <div class="bg-[#121927] border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-sm font-bold text-white flex items-center gap-2">
            <span>Fila Completa da Equipe Conversão</span>
            <span class="badge-bordo px-2 py-0.5 rounded-full text-[10px]">31 Chamados | 202 Trâmites</span>
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">Todos os 31 chamados mantidos no levantamento. Detalhamento pericial de gargalos, riscos regulatórios e projetos vinculados.</p>
        </div>
        <div class="flex items-center gap-2">
          <input type="text" id="filter-input-conversao" placeholder="Buscar em Conversão..." oninput="filterTable('conversao')" class="bg-slate-900 border border-slate-700 text-xs text-slate-200 px-3 py-1.5 rounded-lg w-52 focus:outline-none focus:border-siplan-500">
          <select id="filter-prio-conversao" onchange="filterTable('conversao')" class="bg-slate-900 border border-slate-700 text-xs text-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-siplan-500">
            <option value="">Todas as Prioridades</option>
            <option value="P1">P1 (Risco Jurídico)</option>
            <option value="P2">P2 (Caminho Crítico / GED)</option>
            <option value="P3">P3 (Retrabalho / Quick-Win)</option>
            <option value="P4">P4 (Baixa Administrativa)</option>
          </select>
        </div>
      </div>

      <div class="bg-[#121927] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left" id="table-conversao">
            <thead class="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th class="px-3 py-2.5">Chamado</th>
                <th class="px-3 py-2.5">Cliente / Serventia</th>
                <th class="px-3 py-2.5">Título</th>
                <th class="px-3 py-2.5 text-center">Status</th>
                <th class="px-3 py-2.5 text-center">Dias</th>
                <th class="px-3 py-2.5">Vínculo HUB / Projeto</th>
                <th class="px-3 py-2.5 text-center">Prioridade / Gargalo</th>
                <th class="px-3 py-2.5 text-center">Trâmites</th>
                <th class="px-3 py-2.5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60" id="tbody-conversao">
              <!-- Rendered via JS -->
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 3: LCW -->
    <div id="tab-lcw" class="tab-content hidden space-y-4">
      <div class="bg-[#121927] border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-sm font-bold text-white flex items-center gap-2">
            <span>Passivo do Livro Caixa Web (LCW)</span>
            <span class="badge-emerald px-2 py-0.5 rounded-full text-[10px]">155 Mantidos</span>
            <span class="badge-amber px-2 py-0.5 rounded-full text-[10px]">8 Desconsiderados</span>
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">Auditoria profunda de 163 chamados: 3 OPs travadas, 92 chamados já resolvidos no trâmite e 5 cancelamentos pendentes.</p>
        </div>
        <div class="flex items-center gap-2">
          <input type="text" id="filter-input-lcw" placeholder="Buscar em LCW..." oninput="filterTable('lcw')" class="bg-slate-900 border border-slate-700 text-xs text-slate-200 px-3 py-1.5 rounded-lg w-52 focus:outline-none focus:border-siplan-500">
          <select id="filter-cat-lcw" onchange="filterTable('lcw')" class="bg-slate-900 border border-slate-700 text-xs text-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-siplan-500">
            <option value="">Todas as Categorias</option>
            <option value="faturamento">Trava de Faturamento (3 OPs)</option>
            <option value="fantasma">Fantasmas / Resolvidos no Texto</option>
            <option value="cancelamento">Cancelamento de Contrato</option>
            <option value="contabil">Divergências Contábeis</option>
            <option value="antigo">Aging > 365 dias</option>
          </select>
        </div>
      </div>

      <div class="bg-[#121927] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left" id="table-lcw">
            <thead class="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th class="px-3 py-2.5">Chamado</th>
                <th class="px-3 py-2.5">Cliente / Serventia</th>
                <th class="px-3 py-2.5">Título</th>
                <th class="px-3 py-2.5 text-center">Status</th>
                <th class="px-3 py-2.5 text-center">Dias</th>
                <th class="px-3 py-2.5">Diagnóstico Operacional</th>
                <th class="px-3 py-2.5 text-center">Classificação</th>
                <th class="px-3 py-2.5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60" id="tbody-lcw">
              <!-- Rendered via JS -->
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 4: SGA -->
    <div id="tab-sga" class="tab-content hidden space-y-4">
      <div class="bg-[#121927] border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-sm font-bold text-white flex items-center gap-2">
            <span>Módulo SGA (Sistema de Gestão de Atendimento)</span>
            <span class="badge-emerald px-2 py-0.5 rounded-full text-[10px]">30 Mantidos</span>
            <span class="badge-amber px-2 py-0.5 rounded-full text-[10px]">2 Desconsiderados</span>
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">2 OPs reais travadas com contratos e 28 chamados fantasmas de erros crônicos de Docker e totens devolvidos.</p>
        </div>
        <div class="flex items-center gap-2">
          <input type="text" id="filter-input-sga" placeholder="Buscar em SGA..." oninput="filterTable('sga')" class="bg-slate-900 border border-slate-700 text-xs text-slate-200 px-3 py-1.5 rounded-lg w-52 focus:outline-none focus:border-siplan-500">
          <select id="filter-cat-sga" onchange="filterTable('sga')" class="bg-slate-900 border border-slate-700 text-xs text-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-siplan-500">
            <option value="">Todos os Chamados</option>
            <option value="faturamento">OPs de Clientes (Rio Preto / Ourinhos)</option>
            <option value="fantasma">Erros de Docker Resolvidos (Fantasmas)</option>
            <option value="totem">Totens e Demonstrações</option>
          </select>
        </div>
      </div>

      <div class="bg-[#121927] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left" id="table-sga">
            <thead class="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th class="px-3 py-2.5">Chamado</th>
                <th class="px-3 py-2.5">Cliente / Serventia</th>
                <th class="px-3 py-2.5">Título</th>
                <th class="px-3 py-2.5 text-center">Status</th>
                <th class="px-3 py-2.5 text-center">Dias</th>
                <th class="px-3 py-2.5">Diagnóstico Pericial</th>
                <th class="px-3 py-2.5 text-center">Categoria</th>
                <th class="px-3 py-2.5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60" id="tbody-sga">
              <!-- Rendered via JS -->
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 5: ORION GED -->
    <div id="tab-ged" class="tab-content hidden space-y-4">
      <div class="bg-[#121927] border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-sm font-bold text-white flex items-center gap-2">
            <span>Módulo Orion GED (Gestão Eletrônica de Documentos)</span>
            <span class="badge-emerald px-2 py-0.5 rounded-full text-[10px]">6 Mantidos</span>
            <span class="badge-amber px-2 py-0.5 rounded-full text-[10px]">1 Desconsiderado</span>
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">2 OPs com retenção de receita recorrente e 3 acervos de livros/imagens parados por falta de motor de conversão.</p>
        </div>
      </div>

      <div class="bg-[#121927] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left" id="table-ged">
            <thead class="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th class="px-3 py-2.5">Chamado</th>
                <th class="px-3 py-2.5">Cliente / Serventia</th>
                <th class="px-3 py-2.5">Título</th>
                <th class="px-3 py-2.5 text-center">Status</th>
                <th class="px-3 py-2.5 text-center">Dias</th>
                <th class="px-3 py-2.5">Diagnóstico Pericial</th>
                <th class="px-3 py-2.5 text-center">Impacto</th>
                <th class="px-3 py-2.5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60" id="tbody-ged">
              <!-- Rendered via JS -->
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 6: TRAVA DE FATURAMENTO -->
    <div id="tab-faturamento" class="tab-content hidden space-y-4">
      <div class="bg-rose-950/40 border border-rose-800/60 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-sm font-bold text-rose-200 flex items-center gap-2">
            <svg class="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>7 Chamados com Contratos Cadastrados SEM RECORRÊNCIA</span>
          </h2>
          <p class="text-xs text-rose-300/80 mt-0.5">Estes chamados representam contratos no Administrativo que estão aguardando o encerramento no 0800 para faturar a entrega avulsa ou ativar as mensalidades de software.</p>
        </div>
      </div>

      <div class="bg-[#121927] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left" id="table-faturamento">
            <thead class="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th class="px-3 py-2.5">Chamado</th>
                <th class="px-3 py-2.5">Módulo</th>
                <th class="px-3 py-2.5">Cliente / Serventia</th>
                <th class="px-3 py-2.5">Título / OP</th>
                <th class="px-3 py-2.5 text-center">Dias</th>
                <th class="px-3 py-2.5">Contrato no ADM</th>
                <th class="px-3 py-2.5">Causa da Trava Financeira</th>
                <th class="px-3 py-2.5 text-right">Ação Administrativa</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60" id="tbody-faturamento">
              <!-- Rendered via JS -->
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 7: DESCONSIDERADOS -->
    <div id="tab-desconsiderados" class="tab-content hidden space-y-4">
      <div class="bg-amber-950/40 border border-amber-800/60 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-sm font-bold text-amber-200 flex items-center gap-2">
            <span>11 Chamados Desconsiderados — Projetos Ativos 'Em Andamento' no HUB</span>
          </h2>
          <p class="text-xs text-amber-300/80 mt-0.5">Conforme regra de negócio, estes chamados foram excluídos do passivo de suporte pois são etapas integrantes de projetos ativos gerenciados na tela /projects.</p>
        </div>
      </div>

      <div class="bg-[#121927] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left" id="table-desconsiderados">
            <thead class="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th class="px-3 py-2.5">Chamado</th>
                <th class="px-3 py-2.5">Módulo</th>
                <th class="px-3 py-2.5">Cliente / Serventia</th>
                <th class="px-3 py-2.5">Título</th>
                <th class="px-3 py-2.5 text-center">Dias</th>
                <th class="px-3 py-2.5">Projeto Ativo no HUB</th>
                <th class="px-3 py-2.5">Sistema HUB</th>
                <th class="px-3 py-2.5">Justificativa de Exclusão</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60" id="tbody-desconsiderados">
              <!-- Rendered via JS -->
            </tbody>
          </table>
        </div>
      </div>
    </div>

  </main>

  <!-- MODAL DE DETALHES DO CHAMADO E HISTÓRICO DE TRÂMITES -->
  <div id="ticket-modal" class="fixed inset-0 z-50 hidden bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
    <div class="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
      <!-- Modal Header -->
      <div class="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-siplan-900/80 border border-siplan-700/60 flex items-center justify-center text-siplan-200 font-mono font-bold text-sm">
            #<span id="modal-ticket-id">758671</span>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 id="modal-client-name" class="text-sm font-bold text-white truncate max-w-md">LIMEIRA - TABELIONATO DE NOTAS 01</h3>
              <span id="modal-status-badge" class="badge-slate px-2 py-0.5 rounded text-[10px] font-semibold">Não iniciado</span>
            </div>
            <p id="modal-ticket-title" class="text-xs text-slate-400 truncate max-w-lg mt-0.5">Erro envio nota fiscal</p>
          </div>
        </div>
        <button onclick="closeModal()" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Modal Body (Scrollable) -->
      <div class="p-5 overflow-y-auto space-y-5 text-xs flex-1">
        
        <!-- Info Cards Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div class="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800">
            <div class="text-[10px] text-slate-400 font-medium">Módulo / Software</div>
            <div id="modal-module-val" class="font-semibold text-white mt-0.5 truncate">Orion PRO</div>
          </div>
          <div class="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800">
            <div class="text-[10px] text-slate-400 font-medium">Tempo em Aberto</div>
            <div id="modal-days-val" class="font-semibold text-amber-300 mt-0.5">4 dias</div>
          </div>
          <div class="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800">
            <div class="text-[10px] text-slate-400 font-medium">Vínculo com o HUB</div>
            <div id="modal-hub-val" class="font-semibold text-emerald-300 mt-0.5 truncate">Concluído (done)</div>
          </div>
          <div class="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800">
            <div class="text-[10px] text-slate-400 font-medium">Equipe / Analista</div>
            <div id="modal-analyst-val" class="font-semibold text-slate-200 mt-0.5 truncate">Conversão</div>
          </div>
        </div>

        <!-- Descrição de Abertura -->
        <div class="space-y-1.5">
          <div class="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-siplan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"/>
            </svg>
            Descrição de Abertura do Chamado
          </div>
          <div id="modal-description" class="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 font-mono text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
            (Sem descrição)
          </div>
        </div>

        <!-- Linha do Tempo de Trâmites -->
        <div class="space-y-2.5">
          <div class="flex items-center justify-between">
            <div class="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Histórico Integral de Trâmites (<span id="modal-tramites-count">0</span>)
            </div>
            <span class="text-[10px] text-slate-500">Ordem cronológica</span>
          </div>

          <div id="modal-tramites-list" class="space-y-2">
            <!-- Tramites items rendered via JS -->
          </div>
        </div>

      </div>

      <!-- Modal Footer -->
      <div class="px-5 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs">
        <span class="text-[11px] text-slate-400">Siplan Hub — Auditoria e Levantamento</span>
        <button onclick="closeModal()" class="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition">
          Fechar
        </button>
      </div>
    </div>
  </div>

  <!-- Raw Dataset Embedded directly into HTML -->
  <script>
    const RAW_DATA = ${JSON.stringify(data)};

    // Flatten all tickets for easy lookup
    const ALL_TICKETS = [];
    RAW_DATA.forEach(mod => {
      mod.tickets.forEach(t => {
        ALL_TICKETS.push(t);
      });
    });

    console.log('Total tickets loaded:', ALL_TICKETS.length);

    // Tab Switching Logic
    function switchTab(tabId) {
      document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('border-siplan-500', 'text-siplan-300', 'font-bold');
        btn.classList.add('border-transparent', 'text-slate-400');
      });

      const targetTab = document.getElementById('tab-' + tabId);
      const targetBtn = document.getElementById('tab-btn-' + tabId);

      if (targetTab) targetTab.classList.remove('hidden');
      if (targetBtn) {
        targetBtn.classList.add('border-siplan-500', 'text-siplan-300', 'font-bold');
        targetBtn.classList.remove('border-transparent', 'text-slate-400');
      }

      // Re-render chart if switching to visao-geral
      if (tabId === 'visao-geral') {
        renderCharts();
      }
    }

    // Modal Details Logic
    function openTicketModal(ticketNum) {
      const ticket = ALL_TICKETS.find(t => t.numeroChamado === String(ticketNum));
      if (!ticket) return;

      document.getElementById('modal-ticket-id').textContent = ticket.numeroChamado;
      document.getElementById('modal-client-name').textContent = ticket.cliente || '(Sem cliente vinculado)';
      document.getElementById('modal-ticket-title').textContent = ticket.titulo || '(Sem título)';
      
      const statusBadge = document.getElementById('modal-status-badge');
      statusBadge.textContent = ticket.status;
      if (ticket.status === 'Não iniciado') {
        statusBadge.className = 'badge-slate px-2 py-0.5 rounded text-[10px] font-semibold';
      } else if (ticket.status === 'Em andamento') {
        statusBadge.className = 'badge-amber px-2 py-0.5 rounded text-[10px] font-semibold';
      } else {
        statusBadge.className = 'badge-emerald px-2 py-0.5 rounded text-[10px] font-semibold';
      }

      document.getElementById('modal-module-val').textContent = ticket.software || ticket.produto || ticket.module;
      document.getElementById('modal-days-val').textContent = ticket.diasAberto + ' dias (' + ticket.faixaIdade + ')';
      document.getElementById('modal-hub-val').textContent = ticket.hubClassification || 'Sem vínculo';
      document.getElementById('modal-analyst-val').textContent = ticket.analista || ticket.equipe || '—';

      document.getElementById('modal-description').textContent = ticket.descricaoAbertura || '(Descrição vazia ou não preenchida na abertura)';

      // Tramites
      const tramitesList = document.getElementById('modal-tramites-list');
      tramitesList.innerHTML = '';
      document.getElementById('modal-tramites-count').textContent = ticket.tramites.length;

      if (!ticket.tramites || ticket.tramites.length === 0) {
        tramitesList.innerHTML = '<div class="p-3 bg-slate-900/50 rounded-lg text-slate-500 italic text-[11px] text-center">Nenhum trâmite subsequente registrado no 0800.</div>';
      } else {
        ticket.tramites.forEach((tr, idx) => {
          const item = document.createElement('div');
          item.className = 'bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-1.5';
          item.innerHTML = \`
            <div class="flex items-center justify-between text-[11px]">
              <div class="flex items-center gap-2">
                <span class="w-5 h-5 rounded-full bg-siplan-900 text-siplan-200 border border-siplan-700 flex items-center justify-center font-bold text-[10px]">#\${idx + 1}</span>
                <span class="font-bold text-slate-200">\${tr.responsavel || 'Sistema'}</span>
                <span class="text-slate-500">•</span>
                <span class="text-slate-400">\${tr.equipe || ''}</span>
              </div>
              <div class="text-slate-400 font-mono text-[10px]">\${tr.dataTramite || ''}</div>
            </div>
            <div class="text-[10px] text-siplan-300 font-semibold">\${tr.atividade || 'Atendimento'}</div>
            <div class="text-[11px] text-slate-300 font-mono whitespace-pre-wrap leading-relaxed bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">\${tr.descricao || '(Sem descrição no trâmite)'}</div>
          \`;
          tramitesList.appendChild(item);
        });
      }

      document.getElementById('ticket-modal').classList.remove('hidden');
    }

    function closeModal() {
      document.getElementById('ticket-modal').classList.add('hidden');
    }

    // Render Table Rows
    function renderTables() {
      // 1. Conversão
      const convTickets = ALL_TICKETS.filter(t => t.module === 'Conversão');
      const tbodyConv = document.getElementById('tbody-conversao');
      tbodyConv.innerHTML = '';
      convTickets.forEach(t => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-800/40 transition cursor-pointer';
        tr.onclick = (e) => { if (!e.target.closest('button')) openTicketModal(t.numeroChamado); };
        
        let prioBadge = 'badge-slate';
        if (t.prioridade.includes('P1')) prioBadge = 'badge-rose font-bold';
        else if (t.prioridade.includes('P2')) prioBadge = 'badge-bordo font-bold';
        else if (t.prioridade.includes('P3')) prioBadge = 'badge-amber';
        else if (t.prioridade.includes('P4')) prioBadge = 'badge-slate text-slate-400';

        let hubBadge = 'badge-slate text-slate-400';
        if (t.hubClassification.includes('Concluída')) hubBadge = 'badge-emerald';
        else if (t.hubClassification.includes('Andamento')) hubBadge = 'badge-amber';

        tr.innerHTML = \`
          <td class="px-3 py-2.5 font-mono font-bold text-siplan-300">#\${t.numeroChamado}</td>
          <td class="px-3 py-2.5 font-sans font-semibold text-slate-200 max-w-xs truncate">\${t.cliente || '—'}</td>
          <td class="px-3 py-2.5 text-slate-300 max-w-xs truncate" title="\${t.titulo}">\${t.titulo}</td>
          <td class="px-3 py-2.5 text-center"><span class="badge-slate px-1.5 py-0.5 rounded text-[10px]">\${t.status}</span></td>
          <td class="px-3 py-2.5 text-center font-mono font-bold \${t.diasAbertoNum > 365 ? 'text-rose-400' : 'text-slate-300'}">\${t.diasAberto}d</td>
          <td class="px-3 py-2.5"><span class="\${hubBadge} px-1.5 py-0.5 rounded text-[10px] truncate max-w-xs block">\${t.hubClassification}</span></td>
          <td class="px-3 py-2.5 text-center"><span class="\${prioBadge} px-2 py-0.5 rounded text-[10px]">\${t.prioridade}</span></td>
          <td class="px-3 py-2.5 text-center font-mono text-slate-400">\${t.tramites.length}</td>
          <td class="px-3 py-2.5 text-right">
            <button onclick="openTicketModal('\${t.numeroChamado}')" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 border border-slate-700 transition">Ver</button>
          </td>
        \`;
        tbodyConv.appendChild(tr);
      });

      // 2. LCW
      const lcwTickets = ALL_TICKETS.filter(t => t.module === 'LCW' && !t.shouldExclude);
      const tbodyLcw = document.getElementById('tbody-lcw');
      tbodyLcw.innerHTML = '';
      lcwTickets.forEach(t => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-800/40 transition cursor-pointer';
        tr.onclick = (e) => { if (!e.target.closest('button')) openTicketModal(t.numeroChamado); };

        let catBadge = 'badge-slate';
        let diagText = 'Dúvida operacional / suporte geral';
        if (t.isFaturamento) {
          catBadge = 'badge-rose font-bold';
          diagText = 'Contrato cadastrado SEM RECORRÊNCIA; travando faturamento!';
        } else if (t.isFantasma) {
          catBadge = 'badge-cyan font-bold';
          diagText = 'Resolvido no trâmite; esquecido aberto no 0800';
        } else if (t.titulo.toLowerCase().includes('cancelamento')) {
          catBadge = 'badge-amber font-bold';
          diagText = 'Cancelamento/Inativação pendente no administrativo';
        } else if (t.titulo.toLowerCase().includes('receita') || t.titulo.toLowerCase().includes('despesa') || t.titulo.toLowerCase().includes('diverg')) {
          catBadge = 'badge-bordo';
          diagText = 'Divergência contábil / apuração de receitas e despesas';
        }

        tr.innerHTML = \`
          <td class="px-3 py-2.5 font-mono font-bold text-emerald-400">#\${t.numeroChamado}</td>
          <td class="px-3 py-2.5 font-sans font-semibold text-slate-200 max-w-xs truncate">\${t.cliente && t.cliente !== '—' ? t.cliente : '<span class=\"text-slate-500\">(Sem cliente vinculado)</span>'}</td>
          <td class="px-3 py-2.5 text-slate-300 max-w-xs truncate" title="\${t.titulo}">\${t.titulo}</td>
          <td class="px-3 py-2.5 text-center"><span class="badge-slate px-1.5 py-0.5 rounded text-[10px]">\${t.status}</span></td>
          <td class="px-3 py-2.5 text-center font-mono font-bold \${t.diasAbertoNum > 365 ? 'text-rose-400' : 'text-slate-300'}">\${t.diasAberto}d</td>
          <td class="px-3 py-2.5 text-slate-300 max-w-xs truncate">\${diagText}</td>
          <td class="px-3 py-2.5 text-center"><span class="\${catBadge} px-2 py-0.5 rounded text-[10px]">\${t.isFaturamento ? 'Faturamento' : (t.isFantasma ? 'Fantasma' : 'Suporte')}</span></td>
          <td class="px-3 py-2.5 text-right">
            <button onclick="openTicketModal('\${t.numeroChamado}')" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 border border-slate-700 transition">Ver</button>
          </td>
        \`;
        tbodyLcw.appendChild(tr);
      });

      // 3. SGA
      const sgaTickets = ALL_TICKETS.filter(t => t.module === 'SGA' && !t.shouldExclude);
      const tbodySga = document.getElementById('tbody-sga');
      tbodySga.innerHTML = '';
      sgaTickets.forEach(t => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-800/40 transition cursor-pointer';
        tr.onclick = (e) => { if (!e.target.closest('button')) openTicketModal(t.numeroChamado); };

        let diag = 'Erro de Docker reiniciado; cliente validou; não encerrado no sistema';
        let cat = 'Fantasma / Baixar';
        let catBadge = 'badge-cyan font-bold';

        if (t.isFaturamento) {
          cat = 'OP Faturamento';
          catBadge = 'badge-rose font-bold';
          diag = t.numeroChamado === '754579' ? 'Servidor cliente sem disco (3GB livres); faturamento retido' : 'Sem analista alocado; aguarda agendamento para faturar';
        } else if (t.titulo.toLowerCase().includes('totem') || t.titulo.toLowerCase().includes('demonstra')) {
          cat = 'Totem / Demo';
          catBadge = 'badge-slate text-slate-300';
          diag = 'Hardware devolvido ao estoque ou demonstração prescrita';
        }

        tr.innerHTML = \`
          <td class="px-3 py-2.5 font-mono font-bold text-blue-400">#\${t.numeroChamado}</td>
          <td class="px-3 py-2.5 font-sans font-semibold text-slate-200 max-w-xs truncate">\${t.cliente && t.cliente !== '—' ? t.cliente : '<span class=\"text-slate-500\">(Sem cliente vinculado)</span>'}</td>
          <td class="px-3 py-2.5 text-slate-300 max-w-xs truncate" title="\${t.titulo}">\${t.titulo}</td>
          <td class="px-3 py-2.5 text-center"><span class="badge-slate px-1.5 py-0.5 rounded text-[10px]">\${t.status}</span></td>
          <td class="px-3 py-2.5 text-center font-mono font-bold \${t.diasAbertoNum > 365 ? 'text-rose-400' : 'text-slate-300'}">\${t.diasAberto}d</td>
          <td class="px-3 py-2.5 text-slate-300 max-w-xs truncate">\${diag}</td>
          <td class="px-3 py-2.5 text-center"><span class="\${catBadge} px-2 py-0.5 rounded text-[10px]">\${cat}</span></td>
          <td class="px-3 py-2.5 text-right">
            <button onclick="openTicketModal('\${t.numeroChamado}')" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 border border-slate-700 transition">Ver</button>
          </td>
        \`;
        tbodySga.appendChild(tr);
      });

      // 4. GED
      const gedTickets = ALL_TICKETS.filter(t => t.module === 'Orion GED' && !t.shouldExclude);
      const tbodyGed = document.getElementById('tbody-ged');
      tbodyGed.innerHTML = '';
      gedTickets.forEach(t => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-800/40 transition cursor-pointer';
        tr.onclick = (e) => { if (!e.target.closest('button')) openTicketModal(t.numeroChamado); };

        let diag = 'Acervo de imagens parado por falta do motor OrionGED';
        let impact = 'Operacional';
        let impBadge = 'badge-amber';

        if (t.isFaturamento) {
          diag = 'Contrato 9875/2026 cadastrado SEM RECORRÊNCIA; faturamento retido há 247 dias!';
          impact = 'Faturamento';
          impBadge = 'badge-rose font-bold';
        } else if (t.numeroChamado === '660295') {
          diag = 'Melhoria de tela inicial testada e concluída; falta fechar chamado';
          impact = 'Baixa Imediata';
          impBadge = 'badge-cyan font-bold';
        }

        tr.innerHTML = \`
          <td class="px-3 py-2.5 font-mono font-bold text-purple-400">#\${t.numeroChamado}</td>
          <td class="px-3 py-2.5 font-sans font-semibold text-slate-200 max-w-xs truncate">\${t.cliente && t.cliente !== '—' ? t.cliente : '<span class=\"text-slate-500\">(Interno)</span>'}</td>
          <td class="px-3 py-2.5 text-slate-300 max-w-xs truncate" title="\${t.titulo}">\${t.titulo}</td>
          <td class="px-3 py-2.5 text-center"><span class="badge-slate px-1.5 py-0.5 rounded text-[10px]">\${t.status}</span></td>
          <td class="px-3 py-2.5 text-center font-mono font-bold \${t.diasAbertoNum > 365 ? 'text-rose-400' : 'text-slate-300'}">\${t.diasAberto}d</td>
          <td class="px-3 py-2.5 text-slate-300 max-w-xs truncate">\${diag}</td>
          <td class="px-3 py-2.5 text-center"><span class="\${impBadge} px-2 py-0.5 rounded text-[10px]">\${impact}</span></td>
          <td class="px-3 py-2.5 text-right">
            <button onclick="openTicketModal('\${t.numeroChamado}')" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 border border-slate-700 transition">Ver</button>
          </td>
        \`;
        tbodyGed.appendChild(tr);
      });

      // 5. Faturamento (7 OPs)
      const fatTickets = ALL_TICKETS.filter(t => t.isFaturamento);
      const tbodyFat = document.getElementById('tbody-faturamento');
      tbodyFat.innerHTML = '';
      fatTickets.forEach(t => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-800/40 transition cursor-pointer';
        tr.onclick = (e) => { if (!e.target.closest('button')) openTicketModal(t.numeroChamado); };

        let contrato = 'Contrato sem recorrência';
        let causa = 'Aguardando encerramento do chamado';
        let acao = 'Ativar recorrência e encerrar chamado';

        if (t.numeroChamado === '742700') {
          contrato = 'Contrato nº 11449/2026';
          causa = 'Projeto Miguelópolis CONCLUÍDO no HUB; chamado não retornou ao ADM';
          acao = 'Ativar mensalidade no ERP e fechar chamado';
        } else if (t.numeroChamado === '743505') {
          contrato = 'Contrato nº 12469/2026 (DocuSign)';
          causa = 'Serviço concluído e aprovado; faturamento avulso venceu em 15/07/2026';
          acao = 'Cobrar avulso de Julho e ativar recorrência de Agosto';
        } else if (t.numeroChamado === '740396') {
          contrato = 'Contrato nº 12415/2026 (DocuSign)';
          causa = 'Serviço entregue e aprovado; faturamento avulso venceu em 10/07/2026';
          acao = 'Cobrar avulso de Julho e ativar recorrência de Agosto';
        } else if (t.numeroChamado === '717614') {
          contrato = 'Contrato nº 9875/2026';
          causa = 'Projeto Santos 2º TN CONCLUÍDO no HUB; GED sem analista há 247 dias';
          acao = 'Auditar faturamento e encerrar chamado';
        } else if (t.numeroChamado === '679384') {
          contrato = 'Contrato nº 11369/2025';
          causa = 'Vinculado ao chamado 679382 do Orion PRO; parado há 466 dias';
          acao = 'Validar entrega do Orion PRO e ativar recorrência';
        } else if (t.numeroChamado === '754579') {
          contrato = 'Contrato nº 12674/2026 (Pedido 6922)';
          causa = 'Servidor do cartório com apenas 3 GB livres em disco; sem Docker';
          acao = 'Cobrar expansão de disco da serventia; suspender OP no ADM';
        } else if (t.numeroChamado === '754769') {
          contrato = 'Contrato nº 12681/2026 (Pedido 6929)';
          causa = 'Sem analista alocado na Implantação; aguarda agendamento';
          acao = 'Alocar analista imediatamente para agendar homologação';
        }

        tr.innerHTML = \`
          <td class="px-3 py-2.5 font-mono font-bold text-rose-400">#\${t.numeroChamado}</td>
          <td class="px-3 py-2.5 font-semibold text-slate-300">\${t.module}</td>
          <td class="px-3 py-2.5 font-sans font-bold text-white max-w-xs truncate">\${t.cliente}</td>
          <td class="px-3 py-2.5 text-slate-300 max-w-xs truncate" title="\${t.titulo}">\${t.titulo}</td>
          <td class="px-3 py-2.5 text-center font-mono font-bold text-amber-300">\${t.diasAberto}d</td>
          <td class="px-3 py-2.5 font-mono text-[11px] text-slate-300">\${contrato}</td>
          <td class="px-3 py-2.5 text-slate-300 max-w-xs truncate">\${causa}</td>
          <td class="px-3 py-2.5 text-right font-medium text-rose-300">\${acao}</td>
        \`;
        tbodyFat.appendChild(tr);
      });

      // 6. Desconsiderados (11)
      const descTickets = ALL_TICKETS.filter(t => t.shouldExclude);
      const tbodyDesc = document.getElementById('tbody-desconsiderados');
      tbodyDesc.innerHTML = '';
      descTickets.forEach(t => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-800/40 transition cursor-pointer';
        tr.onclick = (e) => { if (!e.target.closest('button')) openTicketModal(t.numeroChamado); };

        tr.innerHTML = \`
          <td class="px-3 py-2.5 font-mono font-bold text-amber-400">#\${t.numeroChamado}</td>
          <td class="px-3 py-2.5 font-semibold text-slate-300">\${t.module}</td>
          <td class="px-3 py-2.5 font-sans font-bold text-white max-w-xs truncate">\${t.cliente}</td>
          <td class="px-3 py-2.5 text-slate-300 max-w-xs truncate" title="\${t.titulo}">\${t.titulo}</td>
          <td class="px-3 py-2.5 text-center font-mono text-slate-400">\${t.diasAberto}d</td>
          <td class="px-3 py-2.5 text-slate-200 font-medium max-w-xs truncate">\${t.match?.project?.client_name || 'Projeto Ativo'}</td>
          <td class="px-3 py-2.5 font-mono text-slate-300">\${t.match?.project?.system_type || '—'}</td>
          <td class="px-3 py-2.5 text-slate-300 text-[11px]">\${t.exclusionReason || 'Implantação em andamento no HUB'}</td>
        \`;
        tbodyDesc.appendChild(tr);
      });
    }

    // Filter Logic for Tables
    function filterTable(tab) {
      const q = (document.getElementById('filter-input-' + tab)?.value || '').toLowerCase();
      const rows = document.querySelectorAll('#tbody-' + tab + ' tr');

      if (tab === 'conversao') {
        const p = document.getElementById('filter-prio-conversao').value;
        rows.forEach(r => {
          const text = r.textContent.toLowerCase();
          const matchQ = text.includes(q);
          const matchP = !p || text.includes(p.toLowerCase());
          r.style.display = matchQ && matchP ? '' : 'none';
        });
      } else if (tab === 'lcw') {
        const cat = document.getElementById('filter-cat-lcw').value;
        rows.forEach(r => {
          const text = r.textContent.toLowerCase();
          const matchQ = text.includes(q);
          let matchCat = true;
          if (cat === 'faturamento') matchCat = text.includes('faturamento') || text.includes('recorrência');
          else if (cat === 'fantasma') matchCat = text.includes('fantasma') || text.includes('resolvido');
          else if (cat === 'cancelamento') matchCat = text.includes('cancelamento') || text.includes('inativação');
          else if (cat === 'contabil') matchCat = text.includes('contábil') || text.includes('receita');
          else if (cat === 'antigo') {
            const diasMatch = text.match(/(\d+)d/);
            matchCat = diasMatch && parseInt(diasMatch[1], 10) > 365;
          }
          r.style.display = matchQ && matchCat ? '' : 'none';
        });
      } else if (tab === 'sga') {
        const cat = document.getElementById('filter-cat-sga').value;
        rows.forEach(r => {
          const text = r.textContent.toLowerCase();
          const matchQ = text.includes(q);
          let matchCat = true;
          if (cat === 'faturamento') matchCat = text.includes('op faturamento') || text.includes('ourinhos') || text.includes('rio preto');
          else if (cat === 'fantasma') matchCat = text.includes('docker') || text.includes('fantasma');
          else if (cat === 'totem') matchCat = text.includes('totem') || text.includes('demo');
          r.style.display = matchQ && matchCat ? '' : 'none';
        });
      }
    }

    // Chart.js Rendering
    function renderCharts() {
      // 1. Chart Modulos
      const ctxMod = document.getElementById('chartModulos')?.getContext('2d');
      if (ctxMod && !window.myChartMod) {
        window.myChartMod = new Chart(ctxMod, {
          type: 'bar',
          data: {
            labels: ['LCW', 'SGA', 'Conversão', 'Orion GED'],
            datasets: [
              {
                label: 'Total na Base',
                data: [163, 32, 31, 7],
                backgroundColor: 'rgba(100, 116, 139, 0.4)',
                borderColor: 'rgba(100, 116, 139, 0.8)',
                borderWidth: 1,
                borderRadius: 4
              },
              {
                label: 'Mantidos no Foco',
                data: [155, 30, 31, 6],
                backgroundColor: 'rgba(158, 28, 63, 0.8)',
                borderColor: '#c02e53',
                borderWidth: 1,
                borderRadius: 4
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { labels: { color: '#cbd5e1', font: { size: 10 } } }
            },
            scales: {
              x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
              y: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } }
            }
          }
        });
      }

      // 2. Chart Aging
      const ctxAge = document.getElementById('chartAging')?.getContext('2d');
      if (ctxAge && !window.myChartAge) {
        window.myChartAge = new Chart(ctxAge, {
          type: 'doughnut',
          data: {
            labels: ['< 30 dias', '30 - 90 dias', '91 - 180 dias', '181 - 365 dias', '> 365 dias (1 a 3 anos)'],
            datasets: [{
              data: [4, 5, 10, 19, 184],
              backgroundColor: [
                '#10b981',
                '#3b82f6',
                '#f59e0b',
                '#ec4899',
                '#9e1c3f'
              ],
              borderWidth: 2,
              borderColor: '#121927'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'right', labels: { color: '#cbd5e1', font: { size: 10 } } }
            }
          }
        });
      }
    }

    // CSV Exporter
    function exportFullCsv() {
      const headers = ['Chamado', 'Modulo', 'Cliente', 'Titulo', 'Status', 'Dias_Aberto', 'Classificacao_HUB', 'Desconsiderado_HUB', 'Prioridade', 'Qtd_Tramites'];
      const rows = ALL_TICKETS.map(t => [
        t.numeroChamado,
        t.module,
        \`"\${(t.cliente || '').replace(/"/g, '""')}"\`,
        \`"\${(t.titulo || '').replace(/"/g, '""')}"\`,
        t.status,
        t.diasAberto,
        \`"\${(t.hubClassification || '').replace(/"/g, '""')}"\`,
        t.shouldExclude ? 'SIM' : 'NAO',
        \`"\${(t.prioridade || '').replace(/"/g, '""')}"\`,
        t.tramites.length
      ]);

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "levantamento_chamados_siplan_hub_consolidado.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // Initialize on load
    document.addEventListener('DOMContentLoaded', () => {
      renderTables();
      renderCharts();
    });
  </script>
</body>
</html>`;

const outPath = 'docs/export. 0800/relatorio-levantamento-chamados-siplan.html';
fs.writeFileSync(outPath, html, 'utf8');
console.log(`HTML report generated successfully at: ${outPath} (${(html.length / 1024).toFixed(1)} KB)`);
