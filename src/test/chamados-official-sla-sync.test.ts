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
    expect(worker).toContain("solicitacao.DataPrevistaPriResp");
    expect(worker).toContain("solicitacao.SolVencimento");
    expect(worker).toContain("solicitacao.VencimentoPausado");
    expect(worker).toContain("solicitacao.VencimentoInformadoManualmente");
    expect(worker).not.toMatch(/\b(?:UPDATE|INSERT|DELETE)\s+plataformaellevo\b/i);
  });

  it("não oferece parâmetros manuais de SLA na tela", () => {
    expect(slaScreen).toContain("SLA automático do Ellevo");
    expect(slaScreen).not.toContain("SLA primeiro atendimento (horas)");
    expect(slaScreen).not.toContain("SLA resolução (dias)");
  });
});
