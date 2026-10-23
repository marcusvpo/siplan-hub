import { ProjectV2 } from "@/types/ProjectV2";
import { EnrichedInfraProject } from "./types";

/**
 * Extracts clean plaintext from strings, Lexical AST JSON or RichContent objects
 */
export function extractTextFromRaw(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string") {
    if (!val.trim().startsWith("{")) return val.trim();
    try {
      const parsed = JSON.parse(val);
      return extractTextFromRaw(parsed);
    } catch {
      return val.trim();
    }
  }
  if (typeof val === "object" && val !== null) {
    const texts: string[] = [];
    const walk = (node: any) => {
      if (!node) return;
      if (typeof node.text === "string") texts.push(node.text);
      if (node.root) walk(node.root);
      if (Array.isArray(node.children)) node.children.forEach(walk);
      if (Array.isArray(node.blocks)) {
        node.blocks.forEach((b: any) => {
          if (typeof b.content === "string") texts.push(b.content);
        });
      }
    };
    walk(val);
    return texts.join(" ").replace(/\s+/g, " ").trim();
  }
  return String(val);
}

/**
 * Formats date into DD/MM/AAAA with timezone preservation
 */
export function formatDateBR(dateInput: Date | string | null | undefined): string | null {
  if (!dateInput) return null;
  const str = String(dateInput);
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR");
}

/**
 * Formats the infrastructure status line with hardware details
 * Ex: "Infra - Bloqueado (Servidor: Inadequado, Estações: Adequado)"
 */
export function formatInfraStatus(
  status: "in-progress" | "blocked",
  serverStatus?: string,
  workstationsStatus?: string
): string {
  const isBlocked = status === "blocked";
  const details: string[] = [];

  if (serverStatus && serverStatus !== "N/A" && serverStatus !== "") {
    details.push(`Servidor: ${serverStatus}`);
  }
  if (workstationsStatus && workstationsStatus !== "N/A" && workstationsStatus !== "") {
    details.push(`Estações: ${workstationsStatus}`);
  }

  if (isBlocked) {
    return details.length > 0
      ? `Infra - Bloqueado (${details.join(", ")})`
      : "Infra - Bloqueado";
  } else {
    return details.length > 0
      ? `Infra - Em Andamento (${details.join(", ")})`
      : "Infra - Em Andamento";
  }
}

/**
 * Filters and enriches the list of projects for the Infra Progress Report
 */
export function enrichInfraProjects(allProjects: ProjectV2[]): EnrichedInfraProject[] {
  // 1. Filter: global_status = in-progress, not post in-progress, infra in [in-progress, blocked]
  const eligible = allProjects.filter((p) => {
    const isGlobalInProgress = p.globalStatus === "in-progress";
    const isNotPost = p.stages?.post?.status !== "in-progress";
    const infraStatus = p.stages?.infra?.status;
    const isTargetInfra = infraStatus === "in-progress" || infraStatus === "blocked";

    return isGlobalInProgress && isNotPost && isTargetInfra;
  });

  // 2. Sort: blocked first, then alphabetical by client name
  eligible.sort((a, b) => {
    const aBlocked = a.stages?.infra?.status === "blocked";
    const bBlocked = b.stages?.infra?.status === "blocked";
    if (aBlocked && !bBlocked) return -1;
    if (!aBlocked && bBlocked) return 1;
    return a.clientName.localeCompare(b.clientName, "pt-BR");
  });

  // 3. Map into enriched model
  return eligible.map((p, index) => {
    const infra = p.stages?.infra;
    const infraStatus = (infra?.status === "blocked" ? "blocked" : "in-progress") as "in-progress" | "blocked";
    const serverStatus = infra?.serverStatus || "";
    const workstationsStatus = infra?.workstationsStatus || "";

    const p1 = p.stages?.implementation?.phase1 as any;
    const startDateRaw = p1?.startDate || p.stages?.implementation?.startDate;
    const endDateRaw = p1?.endDate || p.stages?.implementation?.endDate;

    const startDateBR = formatDateBR(startDateRaw);
    const endDateBR = formatDateBR(endDateRaw);

    const hasDates = Boolean(startDateBR && endDateBR);
    const isConfirmed = p1?.isConfirmed === true;
    const dateType = hasDates ? (isConfirmed ? "Data Confirmada" : "Data Prevista") : null;
    const responsibleP1 = p1?.responsible || p.stages?.implementation?.responsible || p.projectLeader || "";

    const existingObservations = extractTextFromRaw(infra?.observations);
    const projectGeneralNotes = extractTextFromRaw(p.notes);

    return {
      project: p,
      index: index + 1,
      clientName: p.clientName,
      ticketNumber: p.ticketNumber?.startsWith("#") ? p.ticketNumber : `#${p.ticketNumber || "000000"}`,
      systemType: p.systemType || "Não Informado",
      specialty: p.specialty,
      infraStatus,
      serverStatus,
      workstationsStatus,
      statusFormatted: formatInfraStatus(infraStatus, serverStatus, workstationsStatus),
      existingObservations,
      projectGeneralNotes,
      responsibleInfra: infra?.responsible || p.responsibleInfra || p.projectLeader || "Não atribuído",
      phase1: {
        hasDates,
        dateType,
        isConfirmed,
        startDate: startDateBR,
        endDate: endDateBR,
        responsible: responsibleP1 || null,
        observations: p1?.observations || null,
        status: p1?.status || "todo",
      },
    };
  });
}

/**
 * Generates and downloads a complete standalone HTML report with observations embedded
 */
export function exportStandaloneHTML(
  projects: EnrichedInfraProject[],
  observations: Record<string, string>
) {
  const serializedObs = JSON.stringify(observations, null, 2);
  const nowStr = new Date().toLocaleDateString("pt-BR") + " às " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const cardsHtml = projects.map((p) => {
    const rawTicket = p.ticketNumber.replace("#", "");
    const currentObs = observations[p.ticketNumber] || "";
    const isBlocked = p.infraStatus === "blocked";
    const statusIcon = isBlocked ? "🔴" : "🟡";
    const statusBadgeClass = isBlocked
      ? "background: #fff1f2; color: #be123c; border: 1px solid #fecdd3;"
      : "background: #fffbeb; color: #b45309; border: 1px solid #fde68a;";
    const borderAccent = isBlocked ? "border-left: 4px solid #f43f5e;" : "border-left: 4px solid #f59e0b;";

    return `
    <div class="project-card" style="background: #ffffff; border: 1px solid #e2e8f0; ${borderAccent} border-radius: 12px; padding: 18px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
        <div>
          <span style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; display: block;">Projeto #${p.index}</span>
          <h2 style="font-size: 16px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin: 2px 0 0 0;">${p.clientName}</h2>
        </div>
        <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
          ${p.phase1.hasDates ? `
            <span style="font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; ${p.phase1.isConfirmed ? 'background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7;' : 'background: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc;'}">
              📅 FASE 1: ${(p.phase1.dateType || 'AGENDADA').toUpperCase()}
            </span>
          ` : ''}
          <span style="font-family: monospace; font-size: 12px; font-weight: 700; padding: 3px 8px; border-radius: 6px; background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0;">
            ${p.ticketNumber}
          </span>
          <span style="font-size: 12px; font-weight: 700; padding: 3px 8px; border-radius: 6px; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;">
            ${p.systemType}
          </span>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 12px; flex-wrap: wrap; gap: 6px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-weight: 600; color: #64748b;">Status da Infra:</span>
          <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 6px; font-weight: 700; font-size: 12px; ${statusBadgeClass}">
            <span>${statusIcon}</span>
            <span>${p.statusFormatted}</span>
          </span>
        </div>
        <div style="color: #64748b; font-size: 11px;">
          Resp. Infra: <strong style="color: #334155;">${p.responsibleInfra}</strong>
        </div>
      </div>

      ${p.phase1.hasDates ? `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <strong style="font-size: 12px; color: #1e293b; text-transform: uppercase;">🎯 Fase 1 — Treinamento & Acompanhamento</strong>
            <span style="font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px; ${p.phase1.isConfirmed ? 'background: #d1fae5; color: #065f46;' : 'background: #e0f2fe; color: #0369a1;'}">
              ${p.phase1.dateType}
            </span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; font-size: 11px;">
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px;">
              <span style="color: #64748b; display: block; font-size: 9px; text-transform: uppercase;">Responsável</span>
              <strong style="color: #0f172a;">${p.phase1.responsible || 'A definir'}</strong>
            </div>
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px;">
              <span style="color: #64748b; display: block; font-size: 9px; text-transform: uppercase;">Data de Início</span>
              <strong style="color: #0f172a; font-family: monospace;">${p.phase1.startDate}</strong>
            </div>
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px;">
              <span style="color: #64748b; display: block; font-size: 9px; text-transform: uppercase;">Data de Término</span>
              <strong style="color: #0f172a; font-family: monospace;">${p.phase1.endDate}</strong>
            </div>
          </div>
          ${p.phase1.observations ? `
            <div style="font-size: 11px; color: #475569; font-style: italic; margin-top: 6px; padding: 6px; background: #ffffff; border-radius: 4px; border: 1px solid #f1f5f9;">
              <strong>Nota de Alinhamento:</strong> ${p.phase1.observations}
            </div>
          ` : ''}
        </div>
      ` : `
        <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; font-size: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
          <div style="color: #64748b; display: flex; align-items: center; gap: 6px;">
            <span>⚠️</span>
            <span>Sem datas previstas ou confirmadas para a implantação no momento.</span>
          </div>
          ${p.phase1.responsible ? `
            <div style="color: #94a3b8; font-size: 11px;">
              Responsável preliminar: <strong style="color: #475569;">${p.phase1.responsible}</strong>
            </div>
          ` : ''}
        </div>
      `}

      <div>
        <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #334155; display: block; margin-bottom: 4px;">
          [Observações]
        </label>
        <textarea 
          id="obs_${rawTicket}" 
          rows="3" 
          style="width: 100%; box-sizing: border-box; padding: 8px 10px; font-size: 12px; font-family: inherit; border: 1px solid #cbd5e1; border-radius: 6px; background: #fafafa; resize: vertical;"
          placeholder="Digite as observações para este projeto..."
          oninput="saveObs('${p.ticketNumber}', this.value)"
        >${currentObs}</textarea>
        <div class="print-obs" style="display: none; white-space: pre-wrap; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px; font-size: 11px; color: #1e293b;">
          ${currentObs.trim() ? currentObs : '[Nenhuma observação registrada]'}
        </div>
      </div>
    </div>
    `;
  }).join("\n");

  const fullHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Siplan HUB — Relatório Executivo de Andamento de Infraestrutura & Fase 1</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 20px; line-height: 1.5; }
    .container { max-width: 1000px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #800020; padding-bottom: 14px; margin-bottom: 20px; }
    .brand { font-size: 20px; font-weight: 800; color: #800020; text-transform: uppercase; }
    .btn { cursor: pointer; padding: 8px 14px; font-size: 12px; font-weight: 700; border-radius: 6px; border: none; transition: all 0.2s; }
    .btn-primary { background: #800020; color: #ffffff; }
    .btn-primary:hover { background: #600018; }
    @media print {
      body { background: #ffffff !important; padding: 0 !important; }
      .no-print { display: none !important; }
      .project-card { break-inside: avoid !important; page-break-inside: avoid !important; box-shadow: none !important; margin-bottom: 12px !important; }
      textarea { display: none !important; }
      .print-obs { display: block !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="brand">Siplan HUB — Relatório Andamento Infra</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
          Auditoria da Etapa 1 (Infra) & Fase 1 (Treinamento) • Gerado em ${nowStr}
        </div>
      </div>
      <div class="no-print">
        <button onclick="window.print()" class="btn btn-primary">Salvar / Exportar PDF</button>
      </div>
    </div>

    <div id="cardsList">
      ${cardsHtml}
    </div>
  </div>

  <script>
    window.PREFILLED_OBSERVATIONS = ${serializedObs};
    const obsState = { ...window.PREFILLED_OBSERVATIONS };

    function saveObs(ticket, val) {
      obsState[ticket] = val;
      try {
        localStorage.setItem('siplan_infra_obs_' + ticket.replace('#', ''), val);
      } catch(e) {}
    }

    document.addEventListener('DOMContentLoaded', () => {
      Object.entries(obsState).forEach(([ticket, text]) => {
        const ta = document.getElementById('obs_' + ticket.replace('#', ''));
        if (ta && !ta.value) ta.value = text;
      });
    });
  </script>
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().slice(0, 10);
  a.download = `relatorio-andamento-infra-${dateStr}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
