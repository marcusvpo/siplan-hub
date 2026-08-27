import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const migration = readSource(
  "supabase/migrations/20260826140000_chamados_official_sla.sql",
);
const worker = readSource("vm-worker/src/chamadosSync.ts");
const slaScreen = readSource(
  "src/components/DeploymentsTickets/TicketsSlaAnalysis.tsx",
);
const slaInfoDialog = readSource(
  "src/components/DeploymentsTickets/TicketsSlaInfoDialog.tsx",
);
const slaSectorScreen = readSource(
  "src/components/DeploymentsTickets/TicketsSlaSectorAnalysis.tsx",
);
const ticketsPage = readSource("src/pages/DeploymentsTickets.tsx");

describe("SLA oficial da Consulta de Chamados", () => {
  it("espelha primeira resposta, vencimento, pausa e auditoria manual", () => {
    expect(migration).toContain("sla_primeira_resposta_prevista_em");
    expect(migration).toContain("sla_primeira_resposta_real_em");
    expect(migration).toContain("sla_vencimento_em");
    expect(migration).toContain("sla_vencimento_pausado");
    expect(migration).toContain("sla_vencimento_manual");
  });

  it("consulta os relógios oficiais sem alterar o SQL Server", () => {
    expect(worker).toContain("plataformaellevo.dbo.Solicitacao");
    expect(worker).toContain("c.Severidade AS Criticidade");
    expect(worker).toContain("solicitacao.DataPrevistaPriResp");
    expect(worker).toContain("solicitacao.SolVencimento");
    expect(worker).toContain("solicitacao.VencimentoPausado");
    expect(worker).toContain("solicitacao.VencimentoInformadoManualmente");
    expect(worker).not.toMatch(/\b(?:UPDATE|INSERT|DELETE)\s+plataformaellevo\b/i);
  });

  it("não oferece parâmetros manuais de SLA na tela", () => {
    expect(slaScreen).toContain("SLA automático do Ellevo");
    expect(slaScreen).toContain("1ª resposta fora");
    expect(slaScreen).toContain("Resolução no prazo");
    expect(slaScreen).toContain("Resolução fora");
    expect(slaScreen).not.toContain("SLA primeiro atendimento (horas)");
    expect(slaScreen).not.toContain("SLA resolução (dias)");
  });

  it("explica o cálculo e as diferenças de SLA por área e criticidade", () => {
    expect(slaScreen).toContain("TicketsSlaInfoDialog");
    expect(slaInfoDialog).toContain("Entender o cálculo do SLA");
    expect(slaInfoDialog).toContain("Padrão predominante por área e criticidade");
    expect(slaInfoDialog).toContain("Equipe/área");
    expect(slaInfoDialog).toContain("Meta da 1ª resposta");
    expect(slaInfoDialog).toContain("Meta de resolução");
    expect(slaInfoDialog).toContain("slaTempoPrimeiraRespostaMinutos");
    expect(slaInfoDialog).toContain("slaTempoVencimentoMinutos");
    expect(slaInfoDialog).toContain("Tempo por área");
    expect(slaInfoDialog).toContain("não representa um SLA independente de cada setor");
    expect(slaInfoDialog).toContain("descarta `0`/vazio como prazo válido");
    expect(slaInfoDialog).toContain("Como ler a Jornada setorial do SLA");
    expect(slaInfoDialog).toContain("Oficial no HUB");
    expect(slaInfoDialog).toContain("Indicativo por setor");
    expect(slaInfoDialog).toContain("Passagem 2");
    expect(slaInfoDialog).toContain("vencimento atualmente conhecido");
    expect(slaScreen).toContain("Jornada setorial do SLA");
    expect(slaScreen).toContain("Indicativo — não é SLA oficial por setor");
    expect(slaScreen).toContain("Repasse antes do vencimento");
    expect(slaScreen).toContain("SLA vencido na etapa atual");
  });

  it("oferece uma análise indicativa dos chamados por setor", () => {
    expect(ticketsPage).toContain('value="sla-sector"');
    expect(ticketsPage).toContain("SLA por setor");
    expect(slaSectorScreen).toContain("Análise indicativa de SLA por setor");
    expect(slaSectorScreen).toContain("Setor para analisar");
    expect(slaSectorScreen).toContain("Comparativo dos setores");
    expect(slaSectorScreen).toContain("Somente com falha");
    expect(slaSectorScreen).toContain("primeira resposta atrasada");
    expect(slaSectorScreen).toContain("repasse após o vencimento");
    expect(slaSectorScreen).toContain("não substitui o SLA oficial");
  });
});
