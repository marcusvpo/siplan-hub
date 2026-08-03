import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ImplementerReportData } from "@/hooks/useImplementerReport";

interface ImplementerPDFExportProps {
  data: ImplementerReportData;
}

export function ImplementerPDFExport({ data }: ImplementerPDFExportProps) {
  const [exporting, setExporting] = useState(false);

  const generatePDF = useCallback(async () => {
    if (!data.implementer) return;
    setExporting(true);
    const toastId = toast.loading("Gerando PDF com layout do relatório oficial...");

    try {
      const { jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas")).default;

      const imp = data.implementer;
      const firstName = imp.name.split(" ")[0];
      const nowStr = new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      // ── Build Offscreen HTML matching official PDF layout ──────────────────

      const container = document.createElement("div");
      container.style.cssText =
        "position:fixed;left:-99999px;top:0;width:800px;background:#ffffff;color:#1e293b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;padding:0;box-sizing:border-box;";

      const phase1Details = data.phase1ProjectsDetails;
      const involved = data.allInvolvedProjects;

      container.innerHTML = `
        <div style="padding:30px;background:#fff;">
          
          <!-- TOP HEADER BANNER -->
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:20px;font-size:10px;font-weight:700;color:#64748b;">
            <span>SIPLAN HUB — RELATÓRIO GLOBAL DE IMPLANTAÇÕES (FASE 1)</span>
            <span>Gerado em: ${nowStr}</span>
          </div>

          <!-- MAIN TITLE BANNER -->
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:5px solid #b91c4a;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
            <div style="font-size:22px;font-weight:900;color:#0f172a;margin-bottom:6px;">
              Relatório Completo de Implantações — ${imp.name}
            </div>
            <div style="font-size:12px;font-weight:600;color:#475569;margin-bottom:12px;">
              Varredura Exaustiva em Todos os ${data.totalBaseProjects} Projetos da Base de Dados do Siplan HUB
            </div>
            <div style="font-size:11px;font-weight:700;color:#b91c4a;">
              Mapeamento Estrito: Responsável pela Fase 1 (Treinamento & Acompanhamento Presencial)
            </div>
          </div>

          <!-- SECTION 1: INDICADORES GLOBAIS -->
          <div style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:12px;">
            1. Indicadores Globais de Implantação e Desempenho
          </div>
          <div style="display:flex;gap:12px;margin-bottom:24px;">
            <div style="flex:1;border:1px solid #e2e8f0;border-top:3px solid #b91c4a;border-radius:6px;padding:14px 10px;text-align:center;background:#fff;">
              <div style="font-size:24px;font-weight:900;color:#b91c4a;margin-bottom:2px;">${data.totalBaseProjects}</div>
              <div style="font-size:11px;font-weight:800;color:#0f172a;">Total Base Siplan</div>
              <div style="font-size:9px;color:#64748b;">Projetos Cadastrados</div>
            </div>
            <div style="flex:1;border:1px solid #e2e8f0;border-top:3px solid #b91c4a;border-radius:6px;padding:14px 10px;text-align:center;background:#fff;">
              <div style="font-size:24px;font-weight:900;color:#b91c4a;margin-bottom:2px;">${data.totalInvolvedProjectsCount}</div>
              <div style="font-size:11px;font-weight:800;color:#0f172a;">Atuação de ${firstName}</div>
              <div style="font-size:9px;color:#64748b;">Todas as Etapas</div>
            </div>
            <div style="flex:1;border:1px solid #e2e8f0;border-top:3px solid #b91c4a;border-radius:6px;padding:14px 10px;text-align:center;background:#fff;">
              <div style="font-size:24px;font-weight:900;color:#b91c4a;margin-bottom:2px;">${data.totalPhase1ProjectsCount}</div>
              <div style="font-size:11px;font-weight:800;color:#0f172a;">Implantação Fase 1</div>
              <div style="font-size:9px;color:#64748b;">Treinamento & Virada</div>
            </div>
            <div style="flex:1;border:1px solid #e2e8f0;border-top:3px solid #b91c4a;border-radius:6px;padding:14px 10px;text-align:center;background:#fff;">
              <div style="font-size:24px;font-weight:900;color:#b91c4a;margin-bottom:2px;">${data.phase1CompletionRate}%</div>
              <div style="font-size:11px;font-weight:800;color:#0f172a;">Conclusão Virada</div>
              <div style="font-size:9px;color:#64748b;">${data.phase1SummaryStr}</div>
            </div>
          </div>

          <!-- SECTION 2: TABELA CONSOLIDADA FASE 1 -->
          <div style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:12px;">
            2. Tabela Consolidada das ${phase1Details.length} Implantações (Fase 1 — Treinamento & Acompanhamento)
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:32px;">
            <thead>
              <tr style="background:#0f172a;color:#fff;">
                <th style="text-align:left;padding:8px 10px;border:1px solid #1e293b;">Ticket</th>
                <th style="text-align:left;padding:8px 10px;border:1px solid #1e293b;">Cartório / Cliente</th>
                <th style="text-align:left;padding:8px 10px;border:1px solid #1e293b;">Sistema</th>
                <th style="text-align:left;padding:8px 10px;border:1px solid #1e293b;">Período Fase 1 (Virada)</th>
                <th style="text-align:center;padding:8px 10px;border:1px solid #1e293b;">Status F1</th>
                <th style="text-align:center;padding:8px 10px;border:1px solid #1e293b;">Global</th>
              </tr>
            </thead>
            <tbody>
              ${phase1Details
                .map(
                  (item) => `
                <tr style="border-bottom:1px solid #e2e8f0;">
                  <td style="padding:8px 10px;font-weight:700;color:#475569;">#${item.project.ticketNumber}</td>
                  <td style="padding:8px 10px;font-weight:800;color:#0f172a;">${item.project.clientName}</td>
                  <td style="padding:8px 10px;color:#334155;">${item.systemType}</td>
                  <td style="padding:8px 10px;font-weight:700;color:#b91c4a;">${item.periodText}</td>
                  <td style="padding:8px 10px;text-align:center;font-weight:700;color:${item.statusF1Text === "Concluído" ? "#15803d" : "#0284c7"};">${item.statusF1Text}</td>
                  <td style="padding:8px 10px;text-align:center;font-weight:800;color:${item.globalStatusText === "Concluído" ? "#166534" : "#b45309"};">${item.globalStatusText}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>

          <!-- PAGE BREAK FOR FICHAS -->
          <div style="page-break-before:always;margin-top:20px;"></div>

          <!-- SECTION 3: FICHAS DETALHADAS FASE 1 -->
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:20px;font-size:10px;font-weight:700;color:#64748b;">
            <span>SIPLAN HUB — RELATÓRIO GLOBAL DE IMPLANTAÇÕES (FASE 1)</span>
            <span>Gerado em: ${nowStr}</span>
          </div>

          <div style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:16px;">
            3. Fichas Detalhadas das Implantações Fase 1
          </div>

          ${phase1Details
            .map(
              (ficha, idx) => `
            <div style="border:1px solid #cbd5e1;border-left:5px solid #b91c4a;border-radius:8px;padding:16px 20px;margin-bottom:16px;background:#fff;page-break-inside:avoid;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;border-bottom:1px solid #f1f5f9;padding-bottom:8px;">
                <div style="font-size:13px;font-weight:900;color:#0f172a;">
                  ${idx + 1}. ${ficha.project.clientName} <span style="font-size:11px;color:#64748b;font-weight:700;">(Ticket: #${ficha.project.ticketNumber})</span>
                </div>
                <div style="background:${ficha.statusF1Text === "Concluído" ? "#dcfce7" : "#fef3c7"};color:${ficha.statusF1Text === "Concluído" ? "#15803d" : "#b45309"};font-size:9px;font-weight:800;padding:3px 10px;border-radius:4px;text-transform:uppercase;">
                  ${ficha.statusF1Text}
                </div>
              </div>

              <div style="font-size:10px;color:#475569;margin-bottom:8px;">
                Sistema: <strong style="color:#0f172a;">${ficha.systemType}</strong> | Tipo Implantação: <strong style="color:#0f172a;">${ficha.implantationType}</strong> | Líder: <strong style="color:#0f172a;">${ficha.leaderName}</strong>
              </div>

              <div style="font-size:10px;font-weight:800;color:#b91c4a;background:#fff5f7;padding:6px 10px;border-radius:4px;margin-bottom:10px;">
                Período da Fase 1 (Treinamento & Virada Presencial): ${ficha.periodText} ${ficha.presentialDaysText ? `(${ficha.presentialDaysText})` : ""}
              </div>

              <ul style="margin:0;padding-left:16px;font-size:10px;color:#334155;line-height:1.5;">
                ${ficha.observationsBullets.map((b) => `<li style="margin-bottom:4px;">${b}</li>`).join("")}
              </ul>
            </div>`
            )
            .join("")}

          <!-- PAGE BREAK FOR ALL CARTORIOS & SIGNATURES -->
          <div style="page-break-before:always;margin-top:20px;"></div>

          <!-- SECTION 4: VISÃO GERAL DE TODOS OS CARTÓRIOS -->
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:20px;font-size:10px;font-weight:700;color:#64748b;">
            <span>SIPLAN HUB — RELATÓRIO GLOBAL DE IMPLANTAÇÕES (FASE 1)</span>
            <span>Gerado em: ${nowStr}</span>
          </div>

          <div style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:4px;">
            4. Visão Geral dos ${involved.length} Cartórios com Atuação de ${imp.name} no Siplan HUB
          </div>
          <div style="font-size:10px;color:#64748b;margin-bottom:12px;">
            Mapeamento completo de todos os ${involved.length} projetos da base que possuem registro de atuação de ${imp.name} (incluindo Aderência, Homologações, Implantação Fase 1 e Pós-Implantação):
          </div>

          <table style="width:100%;border-collapse:collapse;font-size:9px;margin-bottom:32px;">
            <thead>
              <tr style="background:#0f172a;color:#fff;">
                <th style="text-align:left;padding:7px 9px;border:1px solid #1e293b;">Cartório / Cliente</th>
                <th style="text-align:left;padding:7px 9px;border:1px solid #1e293b;">Ticket</th>
                <th style="text-align:left;padding:7px 9px;border:1px solid #1e293b;">Sistema</th>
                <th style="text-align:left;padding:7px 9px;border:1px solid #1e293b;">Etapas de Atuação</th>
                <th style="text-align:center;padding:7px 9px;border:1px solid #1e293b;">Fase 1 Lead?</th>
              </tr>
            </thead>
            <tbody>
              ${involved
                .map(
                  (inv) => `
                <tr style="border-bottom:1px solid #e2e8f0;">
                  <td style="padding:6px 9px;font-weight:800;color:#0f172a;">${inv.project.clientName}</td>
                  <td style="padding:6px 9px;color:#64748b;font-weight:700;">#${inv.project.ticketNumber}</td>
                  <td style="padding:6px 9px;color:#334155;">${inv.project.systemType}</td>
                  <td style="padding:6px 9px;color:#334155;">${inv.involvedStagesText}</td>
                  <td style="padding:6px 9px;text-align:center;font-weight:800;color:${inv.isPhase1Lead ? "#15803d" : "#64748b"};">
                    ${inv.isPhase1Lead ? "SIM (Fase 1)" : "Não"}
                  </td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>

          <!-- SECTION 5: APROVAÇÃO E HOMOLOGAÇÃO -->
          <div style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:16px;">
            5. Aprovação e Homologação do Relatório Global
          </div>

          <div style="display:flex;gap:20px;margin-top:12px;">
            <div style="flex:1;border:1px solid #cbd5e1;border-radius:8px;padding:20px;background:#f8fafc;">
              <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;margin-bottom:30px;">
                Implantador Responsável (Fase 1)
              </div>
              <div style="border-top:1px solid #cbd5e1;padding-top:8px;">
                <div style="font-size:13px;font-weight:900;color:#0f172a;">${imp.name}</div>
                <div style="font-size:10px;color:#64748b;">Analista de Implantação — Siplan HUB</div>
              </div>
            </div>

            <div style="flex:1;border:1px solid #cbd5e1;border-radius:8px;padding:20px;background:#f8fafc;">
              <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;margin-bottom:30px;">
                Liderança de Operações e Projetos
              </div>
              <div style="border-top:1px solid #cbd5e1;padding-top:8px;">
                <div style="font-size:13px;font-weight:900;color:#0f172a;">Bruno Fernandes</div>
                <div style="font-size:10px;color:#64748b;">Líder de Implantação e Projetos</div>
              </div>
            </div>
          </div>

          <!-- FOOTER -->
          <div style="margin-top:40px;border-top:1px solid #e2e8f0;padding-top:10px;display:flex;justify-content:space-between;font-size:9px;color:#94a3b8;font-weight:600;">
            <span>Siplan HUB Ecosystem © 2026 — Varredura Exaustiva de Base de Projetos</span>
            <span>Relatório Oficial Gerado Via Intelligence Engine</span>
          </div>

        </div>
      `;

      document.body.appendChild(container);

      // ── Convert HTML element to canvas and export PDF ──────────────────────

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `Relatorio_Completo_Implantacoes_${imp.name.replace(/\s+/g, "_")}_SiplanHUB.pdf`;
      pdf.save(fileName);

      toast.success("Relatório PDF gerado com sucesso no formato oficial!", { id: toastId });
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      toast.error("Erro ao gerar relatório PDF", { id: toastId });
    } finally {
      setExporting(false);
    }
  }, [data]);

  if (!data.implementer) return null;

  return (
    <Button
      onClick={generatePDF}
      disabled={exporting}
      variant="default"
      className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md hover:shadow-lg transition-all"
    >
      {exporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4" />
      )}
      {exporting ? "Gerando PDF..." : "Baixar Relatório PDF"}
    </Button>
  );
}
