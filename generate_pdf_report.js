import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const logoPath = path.resolve('public/assets/Siplan_logo.png');
const logoBase64 = fs.readFileSync(logoPath).toString('base64');

const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Próximas Implantações - Siplan HUB</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 10mm 10mm 10mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      font-size: 10.5px;
      line-height: 1.4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .container {
      width: 100%;
      max-width: 100%;
    }

    /* Top Brand Header */
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #881337 100%);
      color: #ffffff;
      padding: 16px 20px;
      border-radius: 12px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.12);
      position: relative;
      overflow: hidden;
    }

    .header::after {
      content: '';
      position: absolute;
      top: -50%;
      right: -10%;
      width: 280px;
      height: 280px;
      background: radial-gradient(circle, rgba(225, 29, 72, 0.22) 0%, rgba(0,0,0,0) 70%);
      pointer-events: none;
    }

    .header-brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .header-logo {
      height: 38px;
      width: auto;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
    }

    .header-title-group {
      border-left: 2px solid rgba(255, 255, 255, 0.2);
      padding-left: 14px;
    }

    .header-title {
      font-size: 19px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #ffffff;
    }

    .header-subtitle {
      font-size: 10.5px;
      color: #94a3b8;
      font-weight: 500;
      margin-top: 1px;
    }

    .header-meta {
      text-align: right;
    }

    .header-date-badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.14);
      backdrop-filter: blur(8px);
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 9.5px;
      font-weight: 600;
      color: #f1f5f9;
      border: 1px solid rgba(255, 255, 255, 0.18);
    }

    .header-dept {
      font-size: 9.5px;
      color: #cbd5e1;
      margin-top: 3px;
      font-weight: 500;
    }

    /* KPI Summary Row */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }

    .kpi-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 8px 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }

    .kpi-title {
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }

    .kpi-value {
      font-size: 17px;
      font-weight: 800;
      margin-top: 1px;
      color: #0f172a;
    }

    .kpi-value.accent-red { color: #be123c; }
    .kpi-value.accent-amber { color: #d97706; }
    .kpi-value.accent-blue { color: #2563eb; }
    .kpi-value.accent-purple { color: #7c3aed; }

    .kpi-desc {
      font-size: 8.5px;
      color: #94a3b8;
      margin-top: 1px;
    }

    /* Section Styling */
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 2px solid #e2e8f0;
    }

    .section-title-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-icon {
      width: 18px;
      height: 18px;
      border-radius: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 10px;
    }

    .section-icon.scheduled {
      background-color: #be123c;
      color: #ffffff;
    }

    .section-icon.paused {
      background-color: #d97706;
      color: #ffffff;
    }

    .section-title {
      font-size: 13.5px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.01em;
    }

    .count-badge {
      background: #f1f5f9;
      color: #475569;
      font-size: 9.5px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 12px;
      border: 1px solid #cbd5e1;
    }

    /* Grid Layout for Cards */
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }

    /* Deployment Card */
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 9px;
      padding: 9px 11px;
      position: relative;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
      break-inside: avoid;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .card.border-orion-tn {
      border-left: 4px solid #be123c;
    }

    .card.border-orion-pro {
      border-left: 4px solid #2563eb;
    }

    .card.border-paused {
      border-left: 4px solid #d97706;
      background-color: #fffbf5;
    }

    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 5px;
      gap: 6px;
    }

    .cartorio-name {
      font-size: 10.5px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      line-height: 1.3;
    }

    .ticket-badge {
      background: #f8fafc;
      color: #475569;
      font-size: 8.5px;
      font-weight: 700;
      padding: 2px 5px;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
      white-space: nowrap;
      font-family: monospace;
    }

    .meta-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      align-items: center;
      margin-bottom: 4px;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 2px 6px;
      border-radius: 5px;
      font-size: 9px;
      font-weight: 700;
    }

    .pill-tn {
      background: #ffe4e6;
      color: #9f1239;
      border: 1px solid #fecdd3;
    }

    .pill-pro {
      background: #dbeafe;
      color: #1e40af;
      border: 1px solid #bfdbfe;
    }

    .pill-date {
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #e2e8f0;
    }

    .pill-date-agendado {
      background: #dcfce7;
      color: #14532d;
      border: 1px solid #bbf7d0;
    }

    .pill-analyst {
      background: #f3e8ff;
      color: #6b21a8;
      border: 1px solid #e9d5ff;
    }

    /* Note Box */
    .note-box {
      margin-top: 5px;
      padding: 5px 7px;
      border-radius: 5px;
      font-size: 9px;
      line-height: 1.35;
    }

    .note-box.info {
      background-color: #f0f9ff;
      border: 1px solid #bae6fd;
      color: #0369a1;
    }

    .note-box.warning {
      background-color: #fff7ed;
      border: 1px solid #fed7aa;
      color: #9a3412;
    }

    .note-box.alert {
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
    }

    .note-label {
      font-weight: 700;
      margin-right: 3px;
    }

    /* Footer */
    .footer {
      margin-top: 14px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8.5px;
      color: #94a3b8;
    }

    .footer-left {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .dot {
      width: 4px;
      height: 4px;
      background: #be123c;
      border-radius: 50%;
    }
  </style>
</head>
<body>
  <div class="container">
    
    <!-- Top Header -->
    <header class="header">
      <div class="header-brand">
        <img src="data:image/png;base64,${logoBase64}" alt="Siplan HUB" class="header-logo" />
        <div class="header-title-group">
          <h1 class="header-title">Relatório de Próximas Implantações</h1>
          <div class="header-subtitle">Cronograma Operacional & Mapeamento de Pendências de Clientes</div>
        </div>
      </div>
      <div class="header-meta">
        <div class="header-date-badge">27 de Julho de 2026</div>
        <div class="header-dept">Gestão de Implantações • Siplan HUB</div>
      </div>
    </header>

    <!-- KPI Summary Row -->
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-title">Projetos Agendados</div>
        <div class="kpi-value accent-red">12</div>
        <div class="kpi-desc">Cronograma ativo de implantação</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Clientes Pausados</div>
        <div class="kpi-value accent-amber">7</div>
        <div class="kpi-desc">Aguardando adequação / infra</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Analistas Alocados</div>
        <div class="kpi-value accent-blue">3</div>
        <div class="kpi-desc">Brites, Vieira e Mizuno</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Sistemas Principais</div>
        <div class="kpi-value accent-purple">2</div>
        <div class="kpi-desc">Orion TN & Orion PRO</div>
      </div>
    </div>

    <!-- SECTION 1: PROJETOS AGENDADOS -->
    <div class="section-header">
      <div class="section-title-group">
        <div class="section-icon scheduled">🚀</div>
        <h2 class="section-title">Lista de Próximos Projetos Agendados</h2>
      </div>
      <span class="count-badge">12 Projetos</span>
    </div>

    <div class="cards-grid">
      
      <!-- 1 -->
      <div class="card border-orion-pro">
        <div class="card-top">
          <span class="cartorio-name">MIGUELÓPOLIS - TABELIONATO DE NOTAS E PROTESTO</span>
          <span class="ticket-badge">#742696</span>
        </div>
        <div class="meta-pills">
          <span class="pill pill-pro">Orion PRO</span>
          <span class="pill pill-date-agendado">📅 Agendado: 03/08 a 07/08</span>
          <span class="pill pill-analyst">👤 Brites</span>
        </div>
      </div>

      <!-- 2 -->
      <div class="card border-orion-tn">
        <div class="card-top">
          <span class="cartorio-name">MIGUELÓPOLIS - TABELIONATO DE NOTAS E PROTESTO</span>
          <span class="ticket-badge">#742699</span>
        </div>
        <div class="meta-pills">
          <span class="pill pill-tn">Orion TN</span>
          <span class="pill pill-date-agendado">📅 Agendado: 10/08 a 21/08</span>
          <span class="pill pill-analyst">👤 Brites</span>
        </div>
        <div class="note-box warning">
          <span class="note-label">⚠️ Obs:</span> Aguardando avanço do comercial em relação ao servidor que atualmente não comporta o Orion TN junto com o Orion PRO - apenas 26GB RAM.
        </div>
      </div>

      <!-- 3 -->
      <div class="card border-orion-pro">
        <div class="card-top">
          <span class="cartorio-name">UBATUBA – 1º TABELIONATO DE NOTAS E PROTESTO DE TITULOS</span>
          <span class="ticket-badge">#732672</span>
        </div>
        <div class="meta-pills">
          <span class="pill pill-pro">Orion PRO</span>
          <span class="pill pill-date">📅 Previsão: 10/08 a 14/08</span>
          <span class="pill pill-analyst">👤 Mizuno</span>
        </div>
        <div class="note-box info">
          <span class="note-label">ℹ️ Obs:</span> Aguardando retorno de férias do Mizuno.
        </div>
      </div>

      <!-- 4 -->
      <div class="card border-orion-tn">
        <div class="card-top">
          <span class="cartorio-name">SÃO PAULO - 26º TABELIONATO DE NOTAS</span>
          <span class="ticket-badge">#712605</span>
        </div>
        <div class="meta-pills">
          <span class="pill pill-tn">Orion TN</span>
          <span class="pill pill-date">📅 Previsão: 24/08 a 11/09</span>
          <span class="pill pill-analyst">👤 Vieira</span>
        </div>
        <div class="note-box info">
          <span class="note-label">ℹ️ Obs:</span> Aguardando retorno de férias do Vieira e Homologações da conversão.
        </div>
      </div>

      <!-- 5 -->
      <div class="card border-orion-pro">
        <div class="card-top">
          <span class="cartorio-name">OLÍMPIA – 1º TABELIONATO DE NOTAS E PROTESTO DE LETRAS E TITULOS</span>
          <span class="ticket-badge">#731855</span>
        </div>
        <div class="meta-pills">
          <span class="pill pill-pro">Orion PRO</span>
          <span class="pill pill-date">📅 Previsão: 24/08 a 28/08</span>
          <span class="pill pill-analyst">👤 Brites</span>
        </div>
        <div class="note-box info">
          <span class="note-label">ℹ️ Obs:</span> Na sequência de Miguelópolis (Data depende se Miguelópolis irá ampliar o servidor a tempo, se não, entrará no lugar do Orion TN em Miguelópolis).
        </div>
      </div>

      <!-- 6 -->
      <div class="card border-orion-tn">
        <div class="card-top">
          <span class="cartorio-name">OLÍMPIA – 1º TABELIONATO DE NOTAS E PROTESTO DE LETRAS E TITULOS</span>
          <span class="ticket-badge">#731844</span>
        </div>
        <div class="meta-pills">
          <span class="pill pill-tn">Orion TN</span>
          <span class="pill pill-date">📅 Previsão: 31/08 a 11/09</span>
          <span class="pill pill-analyst">👤 Brites</span>
        </div>
        <div class="note-box info">
          <span class="note-label">ℹ️ Obs:</span> Na sequência do Orion PRO, seguindo nas duas semanas seguintes da implantação do Protesto.
        </div>
      </div>

      <!-- 7 -->
      <div class="card border-orion-tn">
        <div class="card-top">
          <span class="cartorio-name">LINS - REGISTRO CIVIL</span>
          <span class="ticket-badge">#692363</span>
        </div>
        <div class="meta-pills">
          <span class="pill pill-tn">Orion TN</span>
          <span class="pill pill-date">📅 Previsão: 14/09 a 18/09</span>
          <span class="pill pill-analyst">👤 Brites</span>
        </div>
        <div class="note-box info">
          <span class="note-label">ℹ️ Obs:</span> Implantação somente do Orion Firmas.
        </div>
      </div>

      <!-- 8 -->
      <div class="card border-orion-tn">
        <div class="card-top">
          <span class="cartorio-name">SOROCABA - TABELIONATO DE NOTAS 01</span>
          <span class="ticket-badge">#552322</span>
        </div>
        <div class="meta-pills">
          <span class="pill pill-tn">Orion TN</span>
          <span class="pill pill-date">📅 Previsão: 14/09 a 25/09</span>
          <span class="pill pill-analyst">👤 Vieira</span>
        </div>
        <div class="note-box info">
          <span class="note-label">ℹ️ Obs:</span> Cliente solicitou para a segunda semana de Setembro.
        </div>
      </div>

      <!-- 9 -->
      <div class="card border-orion-pro">
        <div class="card-top">
          <span class="cartorio-name">EMBU DAS ARTES – 1º TABELIONATO DE NOTAS E DE PROTESTO DE TITULOS</span>
          <span class="ticket-badge">#743764</span>
        </div>
        <div class="meta-pills">
          <span class="pill pill-pro">Orion PRO</span>
          <span class="pill pill-date">📅 Previsão: 21/09 a 25/09</span>
          <span class="pill pill-analyst">👤 Brites</span>
        </div>
        <div class="note-box warning">
          <span class="note-label">⚠️ Obs:</span> Cliente solicitou para Setembro ou Outubro (Aguardando adequação do espaço em disco no servidor - apenas 22.5GB atualmente disponíveis).
        </div>
      </div>

      <!-- 10 -->
      <div class="card border-orion-tn">
        <div class="card-top">
          <span class="cartorio-name">EMBU DAS ARTES – 1º TABELIONATO DE NOTAS E DE PROTESTO DE TITULOS</span>
          <span class="ticket-badge">#743751</span>
        </div>
        <div class="meta-pills">
          <span class="pill pill-tn">Orion TN</span>
          <span class="pill pill-date">📅 Previsão: 28/09 a 09/10</span>
          <span class="pill pill-analyst">👤 Brites</span>
        </div>
        <div class="note-box info">
          <span class="note-label">ℹ️ Obs:</span> Na sequência do Orion PRO, seguindo nas duas semanas seguintes da implantação do Protesto.
        </div>
      </div>

      <!-- 11 -->
      <div class="card border-orion-tn">
        <div class="card-top">
          <span class="cartorio-name">MOGI DAS CRUZES - 1º TABELIÃO DE NOTAS E PROTESTO</span>
          <span class="ticket-badge">#687153</span>
        </div>
        <div class="meta-pills">
          <span class="pill pill-tn">Orion TN</span>
          <span class="pill pill-date">📅 Previsão: 28/09 a 09/10</span>
          <span class="pill pill-analyst">👤 Vieira</span>
        </div>
        <div class="note-box info">
          <span class="note-label">ℹ️ Obs:</span> Após a implantação de Sorocaba (Marcos está negociando as horas vendidas com o cliente pois ele insiste em 40h remotas).
        </div>
      </div>

      <!-- 12 -->
      <div class="card border-orion-tn">
        <div class="card-top">
          <span class="cartorio-name">OSASCO - TABELIONATO DE NOTAS 01</span>
          <span class="ticket-badge">#524568</span>
        </div>
        <div class="meta-pills">
          <span class="pill pill-tn">Orion TN</span>
          <span class="pill pill-date">📅 Previsão: 12/10 a 23/10</span>
        </div>
        <div class="note-box warning">
          <span class="note-label">⚠️ Obs:</span> Cliente solicitou treinamento antes da implantação, porém por conta de agenda dos analistas ainda não foi feito e segue sendo adiado.
        </div>
      </div>

    </div>

    <!-- SECTION 2: CLIENTES PAUSADOS -->
    <div class="section-header" style="margin-top: 12px;">
      <div class="section-title-group">
        <div class="section-icon paused">⏸️</div>
        <h2 class="section-title">Clientes Pausados (Dependem de adequações e sem previsão)</h2>
      </div>
      <span class="count-badge" style="background: #fef3c7; color: #92400e; border-color: #fde68a;">7 Clientes</span>
    </div>

    <div class="cards-grid">
      
      <!-- Pausado 1 -->
      <div class="card border-paused">
        <div class="card-top">
          <span class="cartorio-name">CAMPINAS - 3º TABELIONATO DE PROTESTO</span>
          <span class="ticket-badge">#740638</span>
        </div>
        <div class="meta-pills">
          <span class="pill pill-pro">Orion PRO</span>
        </div>
        <div class="note-box alert">
          <span class="note-label">🛑 Pendência:</span> Aguardando equipe de produtos de acordo com as solicitações feitas pelo cliente.
        </div>
      </div>

      <!-- Pausado 2 -->
      <div class="card border-paused">
        <div class="card-top">
          <span class="cartorio-name">PRAIA GRANDE - TABELIONATO DE NOTAS E PROTESTO 01</span>
          <span class="ticket-badge">#712810</span>
        </div>
        <div class="meta-pills">
          <span class="pill pill-tn">Orion TN</span>
        </div>
        <div class="note-box alert">
          <span class="note-label">🛑 Pendência:</span> Aguardando adequações constatadas na análise de aderência para agendar nova data.
        </div>
      </div>

      <!-- Pausado 3 -->
      <div class="card border-paused">
        <div class="card-top">
          <span class="cartorio-name">ARARAS - TAB.NOTAS 01</span>
          <div>
            <span class="ticket-badge">#716591</span>
            <span class="ticket-badge">#716596</span>
          </div>
        </div>
        <div class="meta-pills">
          <span class="pill pill-tn">Orion TN</span>
          <span class="pill pill-pro">Orion PRO</span>
        </div>
        <div class="note-box alert">
          <span class="note-label">🛑 Pendência:</span> Cliente muito difícil de contatar, com pendências de infra e ninguém consegue contato para agendar a aderência.
        </div>
      </div>

      <!-- Pausado 4 -->
      <div class="card border-paused">
        <div class="card-top">
          <span class="cartorio-name">ARARAQUARA – 1º TABELIONATO DE NOTAS E PROTESTO DE TITULOS</span>
          <div>
            <span class="ticket-badge">#732550</span>
            <span class="ticket-badge">#732553</span>
          </div>
        </div>
        <div class="meta-pills">
          <span class="pill pill-tn">Orion TN</span>
          <span class="pill pill-pro">Orion PRO</span>
        </div>
        <div class="note-box alert">
          <span class="note-label">🛑 Pendência:</span> Ambiente do cliente muito defasado. Comercial (Camila) está negociando locação de equipamentos e servidor. Sem data prevista.
        </div>
      </div>

      <!-- Pausado 5 -->
      <div class="card border-paused">
        <div class="card-top">
          <span class="cartorio-name">FRANCA - TABELIONATO DE NOTAS E PROTESTO DE LETRAS E TITULOS 01</span>
          <span class="ticket-badge">#715013</span>
        </div>
        <div class="meta-pills">
          <span class="pill pill-tn">Orion TN</span>
        </div>
        <div class="note-box alert">
          <span class="note-label">🛑 Pendência:</span> Dependendo da criação do conversor Viscon para Notas. Ademar está trabalhando no conversor conforme está mais livre de suas demandas do Protesto.
        </div>
      </div>

      <!-- Pausado 6 -->
      <div class="card border-paused">
        <div class="card-top">
          <span class="cartorio-name">PERUÍBE - TABELIONATO DE NOTAS E PROTESTO</span>
          <span class="ticket-badge">#696528</span>
        </div>
        <div class="meta-pills">
          <span class="pill pill-tn">Orion TN</span>
        </div>
        <div class="note-box alert">
          <span class="note-label">🛑 Pendência:</span> Depende da criação do conversor Argon. Luciane já pegou a base mas não conseguiu iniciar os trabalhos para montar o conversor por conta de demandas de outras implantações.
        </div>
      </div>

      <!-- Pausado 7 -->
      <div class="card border-paused" style="grid-column: span 2;">
        <div class="card-top">
          <span class="cartorio-name">TAUBATÉ - TABELIONATO DE NOTAS E PROTESTO DE LETRAS E TITULOS 03</span>
          <div>
            <span class="ticket-badge">#696474</span>
            <span class="ticket-badge">#696464</span>
          </div>
        </div>
        <div class="meta-pills">
          <span class="pill pill-pro">Orion PRO</span>
          <span class="pill pill-tn">Orion TN</span>
        </div>
        <div class="note-box alert">
          <span class="note-label">🛑 Pendência:</span> Infra defasada, estão em negociação com o comercial para alugar um servidor e máquinas. Orion PRO depende de adequações constatadas na análise de aderência - Cliente trabalha com 3 bancos para gerar boletos de intimação (Sicoob, Bradesco e Safra). O sistema atende apenas Bradesco atualmente.
        </div>
      </div>

    </div>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-left">
        <span class="dot"></span>
        <strong>Siplan HUB</strong> — Sistema Integrado de Gestão e Implantação
      </div>
      <div>Documento Interno de Gestão • Gerado em 27/07/2026</div>
    </footer>

  </div>
</body>
</html>`;

const tempHtmlPath = path.resolve('report_temp.html');
const pdfOutputPath = path.resolve('Relatorio_Proximas_Implantacoes.pdf');

fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];

let browserPath = chromePaths.find(p => fs.existsSync(p));

const cmd = `"${browserPath}" --headless=new --disable-gpu --no-sandbox --no-pdf-header-footer --print-to-pdf="${pdfOutputPath}" "${tempHtmlPath}"`;

try {
  execSync(cmd, { stdio: 'inherit' });
  console.log('PDF gerado com sucesso sem cabeçalho/rodapé do browser em:', pdfOutputPath);
} catch (err) {
  console.error('Erro ao gerar PDF:', err);
}
