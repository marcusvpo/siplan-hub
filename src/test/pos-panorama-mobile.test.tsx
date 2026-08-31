import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PosPanoramaData } from "@/hooks/usePosPanorama";

const mocks = vi.hoisted(() => ({
  data: null as PosPanoramaData | null,
  gerarParecer: vi.fn(),
}));

vi.mock("@/hooks/usePosPanorama", () => ({
  usePosPanorama: () => ({ data: mocks.data, isLoading: false, error: null }),
  usePanoramaParecer: () => ({
    gerarParecer: mocks.gerarParecer,
    ativo: null,
    ultimo: null,
    ultimoErro: null,
  }),
}));

vi.mock("@/hooks/useModelGenerationJobs", () => ({
  useModelWorkerStatus: () => ({ online: true }),
}));

vi.mock("@/components/ProjectManagement/Chamado0800DetailDialog", () => ({
  Chamado0800DetailDialog: () => null,
  fmtDateBr: (value?: string) => value || "—",
  statusBadgeClass: () => "",
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  LabelList: () => null,
}));

import { PanoramaBase } from "@/pages/PosPanorama";

const longTitle =
  "Falha crítica durante a emissão de documentos com informações complementares";
const longClient =
  "Cartório de Registro de Imóveis e Tabelionato de Notas de São Paulo";

function renderPanorama() {
  return render(
    <MemoryRouter>
      <PanoramaBase
        escopo="abertos"
        titulo="Panorama Pós-Implantação"
        descricao="Projetos em acompanhamento operacional."
      />
    </MemoryRouter>,
  );
}

describe("Panorama pós-implantação no mobile", () => {
  beforeEach(() => {
    mocks.data = {
      projetosEmPos: 2,
      lastSyncedAt: "2026-08-31T12:00:00.000Z",
      projetos: [
        {
          id: "project-1",
          cliente: longClient,
          produto: "Orion TN",
          ticket: "70001",
          inicioPos: "2026-07-01",
          fimPos: "2026-08-31",
          posConcluido: false,
        },
      ],
      chamados: [
        {
          numeroChamado: "80001",
          titulo: longTitle,
          nomeCliente: longClient,
          projetoCliente: longClient,
          projetoProduto: "Orion TN",
          projetoId: "project-1",
          natureza: "Erro operacional",
          criticidade: "Crítico",
          status: "Em atendimento",
          tema: "Tema fiscal recorrente",
          dataAbertura: "2026-08-01",
        },
        {
          numeroChamado: "80002",
          titulo: "Dúvida de configuração",
          nomeCliente: "Cartório Modelo",
          projetoCliente: "Cartório Modelo",
          projetoProduto: "Orion PRO",
          projetoId: "project-2",
          natureza: "Dúvida",
          criticidade: "Normal",
          status: "Concluído",
          tema: "Tema fiscal recorrente",
          dataAbertura: "2026-07-12",
          dataEncerramento: "2026-07-13",
        },
      ],
    } as PosPanoramaData;
    mocks.gerarParecer.mockReset();
  });

  it("mantém a busca visível e recolhe os filtros avançados", () => {
    renderPanorama();

    expect(screen.getByPlaceholderText("Buscar chamado, cartório ou tema…")).toHaveClass("min-w-0");
    const filterButton = screen.getByRole("button", { name: /Filtros avançados/ });
    expect(filterButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(filterButton);

    expect(filterButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Filtrar por produto")).toHaveClass("w-full");
    expect(screen.getByLabelText("Filtrar por período")).toHaveClass("w-full");
  });

  it("divide o conteúdo em resumo, chamados e parecer no celular", () => {
    renderPanorama();

    const summary = screen.getByTestId("panorama-mobile-summary");
    const tickets = screen.getByTestId("panorama-mobile-tickets");
    const ai = screen.getByTestId("panorama-mobile-ai");

    expect(summary).not.toHaveClass("hidden");
    expect(tickets).toHaveClass("hidden");
    expect(ai).toHaveClass("hidden");

    fireEvent.click(screen.getByRole("button", { name: "Chamados (2)" }));

    expect(summary).toHaveClass("hidden");
    expect(tickets).not.toHaveClass("hidden");

    fireEvent.click(screen.getByRole("button", { name: "Parecer IA" }));
    expect(ai).not.toHaveClass("hidden");
  });

  it("quebra textos longos e usa rankings compactos no resumo", () => {
    renderPanorama();

    const ticketButton = screen.getByRole("button", { name: new RegExp(longTitle) });
    expect(ticketButton).toHaveClass("w-full", "min-w-0");
    expect(within(ticketButton).getByText(longClient)).toHaveClass("break-words");

    const themeButton = screen
      .getAllByText("Tema fiscal recorrente")
      .find((element) => element.classList.contains("text-sm"))
      ?.closest("button");
    expect(themeButton).not.toBeNull();
    if (!themeButton) throw new Error("Botão de tema não encontrado");
    expect(within(themeButton).getByText("Tema fiscal recorrente")).toHaveClass("break-words");

    const natureButton = screen
      .getByText("Erro operacional", { selector: "span.font-medium" })
      .closest("button");
    expect(natureButton).not.toBeNull();
    if (!natureButton) throw new Error("Botão de natureza não encontrado");
    expect(natureButton).toHaveClass("w-full", "min-w-0");
  });
});
