import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Chamado0800 } from "@/hooks/useChamados0800";
import { TicketsSlaInfoDialog } from "./TicketsSlaInfoDialog";

const chamados: Chamado0800[] = [
  {
    numeroChamado: "1",
    equipeResponsavel: "SD - TN/RC",
    criticidade: "Crítico",
    slaTempoPrimeiraRespostaMinutos: 60,
    slaTempoVencimentoMinutos: 720,
  },
  {
    numeroChamado: "2",
    equipeResponsavel: "SD - TN/RC",
    criticidade: "Crítico",
    slaTempoPrimeiraRespostaMinutos: 60,
    slaTempoVencimentoMinutos: 720,
  },
  {
    numeroChamado: "3",
    equipeResponsavel: "SD - TN/RC",
    criticidade: "Crítico",
    slaTempoPrimeiraRespostaMinutos: 120,
    slaTempoVencimentoMinutos: 1_080,
  },
  {
    numeroChamado: "4",
    equipeResponsavel: "Infraestrutura",
    criticidade: "Sem impacto operacional",
    slaTempoPrimeiraRespostaMinutos: 240,
    slaTempoVencimentoMinutos: 2_880,
  },
  {
    numeroChamado: "5",
    equipeResponsavel: "Implantação",
    criticidade: "Não crítico",
    slaTempoPrimeiraRespostaMinutos: 0,
    slaTempoVencimentoMinutos: 0,
  },
];

describe("TicketsSlaInfoDialog", () => {
  it("explica o cálculo e mostra o padrão predominante por área e criticidade", () => {
    render(<TicketsSlaInfoDialog chamados={chamados} />);

    fireEvent.click(screen.getByRole("button", { name: "Entender o cálculo do SLA" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Entenda o cálculo do SLA" })).toBeInTheDocument();

    const supportRow = screen.getByRole("row", { name: /SD - TN\/RC Crítico/ });
    expect(within(supportRow).getByText("1 h")).toBeInTheDocument();
    expect(within(supportRow).getByText("12 h")).toBeInTheDocument();
    expect(within(supportRow).getByText("2 de 3 iguais")).toBeInTheDocument();
    expect(within(supportRow).getByText("2 configurações")).toBeInTheDocument();

    const infrastructureRow = screen.getByRole("row", { name: /Infraestrutura Sem impacto operacional/ });
    expect(within(infrastructureRow).getByText("4 h")).toBeInTheDocument();
    expect(within(infrastructureRow).getByText("48 h")).toBeInTheDocument();

    const implementationRow = screen.getByRole("row", { name: /Implantação Não crítico/ });
    expect(within(implementationRow).getAllByText("Sem regra numérica")).toHaveLength(2);
    expect(within(implementationRow).getByText("Sem prazo numérico neste recorte")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Como ler a Jornada setorial do SLA" })).toBeInTheDocument();
    expect(screen.getAllByText("Repasse antes do vencimento").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Resolvido fora do SLA").length).toBeGreaterThan(0);
    expect(screen.getByText("Oficial no HUB")).toBeInTheDocument();
    expect(screen.getByText("Indicativo por setor")).toBeInTheDocument();
    expect(screen.getByText(/Se voltar a uma equipe, ela aparece novamente como/)).toBeInTheDocument();
  });
});
