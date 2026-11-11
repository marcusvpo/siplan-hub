import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SdClosures from "@/pages/sd/SdClosures";

const state = vi.hoisted(() => ({
  mobile: false,
  refetch: vi.fn(),
  syncClosures: vi.fn(),
  downloadPdfDocument: vi.fn(),
  requestedTicket: null as string | null,
}));

const reportData = {
  period: { start_date: "2026-10-13", end_date: "2026-11-11" },
  metrics: {
    total_closed: 3,
    within_sla: 1,
    outside_sla: 1,
    without_deadline: 1,
    reopened: 0,
    analyst_count: 2,
    client_count: 2,
  },
  by_analyst: [
    {
      analyst_name: "Analista Teste",
      group_name: "SD - Protesto",
      total_closed: 2,
      within_sla: 1,
      outside_sla: 1,
      without_deadline: 0,
      reopened: 0,
      within_percent: 50,
      outside_percent: 50,
    },
    {
      analyst_name: "Outra Analista",
      group_name: "SD - TN/RC",
      total_closed: 1,
      within_sla: 0,
      outside_sla: 0,
      without_deadline: 1,
      reopened: 0,
      within_percent: 0,
      outside_percent: 0,
    },
  ],
  by_product: [
    { product: "Orion PRO", total_closed: 2, within_sla: 1, outside_sla: 1, without_deadline: 0 },
    { product: "Orion TN", total_closed: 1, within_sla: 0, outside_sla: 0, without_deadline: 1 },
  ],
  details: [
    {
      ticket_number: "1001",
      client_name: "Cartório Modelo",
      ticket_title: "Ajuste de configuração",
      product: "Orion PRO",
      analyst_name: "Analista Teste",
      group_name: "SD - Protesto",
      nature: "Configuração",
      status: "Concluído",
      opened_at: "2026-11-10T08:00:00",
      closed_at: "2026-11-10T10:00:00",
      due_at: "2026-11-10T12:00:00",
      sla_status: "within" as const,
      duration_minutes: 120,
      reopened: false,
    },
  ],
  filters: {
    products: ["Orion PRO", "Orion TN"],
    analysts: ["Analista Teste", "Outra Analista"],
    clients: ["Cartório Modelo", "Cartório Dois"],
    groups: ["SD - Protesto", "SD - TN/RC"],
  },
};

vi.mock("@/hooks/useSdClosures", () => ({
  useSdClosuresReport: () => ({
    data: reportData,
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: state.refetch,
  }),
  useSyncSdClosures: () => ({
    syncClosures: state.syncClosures,
    isSyncing: false,
  }),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => state.mobile,
}));

vi.mock("@/modules/pdf/services/pdfService", () => ({
  downloadPdfDocument: (...args: unknown[]) => state.downloadPdfDocument(...args),
}));

vi.mock("@/modules/pdf/templates/SdClosuresReportTemplate", () => ({
  SdClosuresReportTemplate: () => null,
}));

vi.mock("@/hooks/useChamados0800", () => ({
  useChamado0800ByNumber: (ticketNumber?: string | null) => {
    if (ticketNumber) state.requestedTicket = ticketNumber;
    return {
      data: ticketNumber ? { numeroChamado: ticketNumber, titulo: "Ajuste de configuração" } : null,
      isLoading: false,
      isError: false,
      isSuccess: Boolean(ticketNumber),
    };
  },
}));

vi.mock("@/components/ProjectManagement/Chamado0800DetailDialog", () => ({
  Chamado0800DetailDialog: ({ chamado }: { chamado: { numeroChamado: string } | null }) =>
    chamado ? <div role="dialog">Detalhes do chamado {chamado.numeroChamado}</div> : null,
}));

describe("Encerramentos do SD", () => {
  beforeEach(() => {
    state.mobile = false;
    state.requestedTicket = null;
    state.refetch.mockReset();
    state.syncClosures.mockReset().mockResolvedValue(undefined);
    state.downloadPdfDocument.mockReset().mockResolvedValue(undefined);
  });

  it("apresenta o consolidado por analista e os indicadores de SLA", () => {
    render(<SdClosures />);

    expect(screen.getByRole("heading", { name: "Encerramentos" })).toBeInTheDocument();
    expect(screen.getByText("Encerramentos por analista")).toBeInTheDocument();
    expect(screen.getAllByText("Analista Teste").length).toBeGreaterThan(0);
    expect(screen.getByText("Distribuição por produto")).toBeInTheDocument();
    expect(screen.getByText("50% dos chamados com SLA")).toBeInTheDocument();
  });

  it("alterna para o analítico e abre os detalhes do chamado", () => {
    render(<SdClosures />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Analítico" }), { button: 0, ctrlKey: false });

    expect(screen.getByText("Chamados encerrados")).toBeInTheDocument();
    expect(screen.getByText("#1001")).toBeInTheDocument();
    expect(screen.getByText("Cartório Modelo")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ver detalhes do chamado 1001" }));
    expect(state.requestedTicket).toBe("1001");
    expect(screen.getByRole("dialog")).toHaveTextContent("Detalhes do chamado 1001");
  });

  it("atualiza o período na origem ao aplicar os filtros", async () => {
    render(<SdClosures />);
    fireEvent.click(screen.getByRole("button", { name: /Aplicar filtros/i }));

    await waitFor(() => expect(state.syncClosures).toHaveBeenCalledTimes(1));
    expect(state.syncClosures).toHaveBeenCalledWith(expect.any(String), expect.any(String));
  });

  it("exporta a visão atual pelo serviço oficial de PDF", async () => {
    render(<SdClosures />);
    fireEvent.click(screen.getByRole("button", { name: "Exportar PDF" }));

    await waitFor(() => expect(state.downloadPdfDocument).toHaveBeenCalledTimes(1));
    expect(state.downloadPdfDocument.mock.calls[0][1]).toContain("encerramentos-sd-consolidado");
  });

  it("usa cards no mobile e mantém a tela sem rolagem horizontal", () => {
    state.mobile = true;
    render(<SdClosures />);

    expect(screen.getByTestId("sd-closures-page")).toHaveClass("w-full", "min-w-0", "overflow-x-hidden");
    expect(screen.getByTestId("sd-closures-analyst-mobile-list")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Analítico" }), { button: 0, ctrlKey: false });
    expect(screen.getByTestId("sd-closures-detail-mobile-list")).toBeInTheDocument();
  });
});
