import type { ReactNode } from "react";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CsCxNpsResponse } from "@/hooks/useCsCxExperience";
import type { Chamado0800 } from "@/hooks/useChamados0800";
import type { PosPanoramaData } from "@/hooks/usePosPanorama";
import type { SdTimeManagementReport } from "@/hooks/useSdTimeTracking";
import type { ProjectV2 } from "@/types/ProjectV2";

const mocks = vi.hoisted(() => ({
  barData: [] as Array<Record<string, unknown>>,
  monthlyData: [] as Array<Record<string, unknown>>,
  barClicks: new Map<string, (bar: { payload: unknown }) => void>(),
  monthlyClick: null as ((event: { activeTooltipIndex: number | string | null | undefined }) => void) | null,
  chamados: [] as Chamado0800[],
  panorama: null as PosPanoramaData | null,
  report: null as SdTimeManagementReport | null,
  reportCalls: vi.fn(),
  mobile: false,
}));

// Reproduz a forma dos eventos do Recharts 3 sem depender de medidas SVG no jsdom.
vi.mock("recharts", () => {
  const childrenOnly = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  const empty = () => null;
  return {
    ResponsiveContainer: childrenOnly,
    BarChart: ({ data, children }: { data: Array<Record<string, unknown>>; children?: ReactNode }) => {
      mocks.barData = data;
      return <div>{children}</div>;
    },
    LineChart: ({ data, children, onClick }: { data: Array<Record<string, unknown>>; children?: ReactNode; onClick: NonNullable<typeof mocks.monthlyClick> }) => {
      mocks.monthlyData = data;
      mocks.monthlyClick = onClick;
      return <div>{children}</div>;
    },
    Bar: ({ dataKey, onClick, children }: { dataKey: string; onClick?: (bar: { payload: unknown }) => void; children?: ReactNode }) => {
      if (onClick) mocks.barClicks.set(dataKey, onClick);
      return <div>{children}</div>;
    },
    PieChart: childrenOnly,
    Pie: childrenOnly,
    Cell: empty,
    XAxis: empty,
    YAxis: empty,
    CartesianGrid: empty,
    Tooltip: empty,
    LabelList: empty,
    Legend: empty,
    Line: empty,
    ReferenceLine: empty,
  };
});

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "viewer" } }) }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => mocks.mobile }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/hooks/useCsCxNpsAiReport", () => ({
  useCsCxNpsAiReport: () => ({ generate: vi.fn(), active: null, latest: null, latestError: null }),
}));
vi.mock("@/lib/cs-cx-experience-pdf", () => ({ generateCsCxNpsAnalysisPdf: vi.fn() }));
vi.mock("@/hooks/useModelGenerationJobs", () => ({ useModelWorkerStatus: () => ({ online: true }) }));
vi.mock("@/hooks/usePosPanorama", () => ({
  usePosPanorama: () => ({ data: mocks.panorama, isLoading: false, error: null }),
  usePanoramaParecer: () => ({ gerarParecer: vi.fn(), ativo: null, ultimo: null, ultimoErro: null }),
}));
vi.mock("@/hooks/useChamados0800", () => ({
  useChamados0800: () => ({ chamados: mocks.chamados, clienteResolvido: "Cartório Modelo", isLoading: false, error: null, parametrosIncompletos: false }),
  useSolicitarSyncChamados0800: () => ({ solicitarSync: vi.fn(), syncing: false }),
  useBenchmarkPos: () => ({ data: null }),
  useParecerPos: () => ({ gerarParecer: vi.fn(), ativo: null, ultimo: null, ultimoErro: null }),
}));
vi.mock("@/components/ProjectManagement/PosAiAssistantSection", () => ({ PosAiAssistantSection: () => null }));
vi.mock("@/components/ProjectManagement/Chamado0800DetailDialog", () => ({
  Chamado0800DetailDialog: () => null,
  fmtDateBr: (value?: string) => value || "—",
  statusBadgeClass: () => "",
}));
vi.mock("@/components/sd/Chamado0800DetailsButton", () => ({ Chamado0800DetailsButton: () => null }));
vi.mock("@/hooks/useSdTimeTracking", () => ({
  useImportSdTeamWeek: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useManagedSdTimeReport: (...args: unknown[]) => {
    mocks.reportCalls(...args);
    return { data: mocks.report, isLoading: false, isError: false };
  },
  useManagedSdTimeEntries: () => ({ data: { entries: [], totalCount: 0 }, isLoading: false, isError: false }),
}));

import { NpsAnalyticsPanel } from "@/components/cs-cx/NpsAnalytics";
import { PosImplantacaoTab } from "@/components/ProjectManagement/Tabs/PosImplantacaoTab";
import { PanoramaBase } from "@/pages/PosPanorama";
import TimeManagementReport from "@/pages/sd/TimeManagementReport";

function npsResponse(id: string, month: string): CsCxNpsResponse {
  return {
    id, legacy_id: null, registry_office_id: id, product_id: null,
    responded_at: `${month}-01T12:00:00Z`, respondent_name: "Responsável", respondent_office: id,
    score: 9, score_reason: "Atendimento rápido", improvement_suggestion: null, classification: "PROMOTOR",
    origin: "hub", owner_profile_id: null, invitation_id: null, questionnaire_id: null,
    questionnaire_snapshot: null, answers: {}, registry_office: { id, name: id }, product: null,
  };
}

function postProject(): ProjectV2 {
  return {
    id: "project", clientName: "Cartório Modelo", ticketNumber: "70001", systemType: "Orion PRO",
    implantationType: "new", tags: [], priority: "normal", projectType: "new", healthScore: "ok",
    globalStatus: "in-progress", overallProgress: 80, projectLeader: "Líder", createdAt: new Date(),
    lastUpdatedAt: new Date(), lastUpdatedBy: "Líder", isDeleted: false, isArchived: false,
    stages: {
      infra: { status: "done" },
      adherence: { status: "done", hasProductGap: false, analysisComplete: true },
      environment: { status: "done", approvedByInfra: true, testAvailable: true },
      conversion: { status: "done" },
      implementation: { status: "done", phase1: { status: "done" }, phase2: { status: "done" } },
      post: { status: "in-progress", startDate: new Date("2026-08-01"), followupNeeded: false },
    },
  };
}

describe("interações dos gráficos no Recharts 3", () => {
  beforeEach(() => {
    mocks.barClicks.clear();
    mocks.barData = [];
    mocks.monthlyData = [];
    mocks.monthlyClick = null;
    mocks.reportCalls.mockClear();
    mocks.mobile = false;
    mocks.chamados = [
      { numeroChamado: "80001", natureza: "Erro operacional", titulo: "Erro selecionado", status: "Em atendimento", dataAbertura: "2026-08-01" },
      { numeroChamado: "80002", natureza: "Dúvida", titulo: "Dúvida fora do filtro", status: "Concluído", dataAbertura: "2026-08-01" },
    ];
    mocks.panorama = {
      projetosEmPos: 1, projetos: [],
      chamados: mocks.chamados.map((item) => ({ ...item, nomeCliente: "Cartório Modelo", projetoCliente: "Cartório Modelo", projetoProduto: "Orion PRO", projetoId: "project" })),
    };
    mocks.report = {
      total_minutes: 240, manual_minutes: 120, imported_minutes: 120, analyst_count: 1,
      worked_user_days: 1, daily: [], available_groups: [],
      available_analysts: [{ user_id: "analyst", user_name: "Maria Silva", user_email: null, user_team: null }],
      analyst_totals: [{ user_id: "analyst", user_name: "Maria Silva", user_email: null, user_team: null, total_minutes: 240, manual_minutes: 120, imported_minutes: 120, worked_days: 1 }],
    };
  });

  afterEach(cleanup);

  it("abre o mês de NPS pelo activeTooltipIndex e ignora clique sem ponto", () => {
    render(<NpsAnalyticsPanel responses={[npsResponse("Cartório Agosto", "2026-08"), npsResponse("Cartório Setembro", "2026-09")]} products={[]} canGenerate={false} />);

    act(() => mocks.monthlyClick?.({ activeTooltipIndex: null }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const label = String(mocks.monthlyData[0].label);
    act(() => mocks.monthlyClick?.({ activeTooltipIndex: "0" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: `NPS de ${label}` })).toBeInTheDocument();
    expect(within(dialog).getByText("Cartório Agosto")).toBeInTheDocument();
    expect(within(dialog).queryByText("Cartório Setembro")).not.toBeInTheDocument();
  });

  it("filtra os chamados do projeto pela natureza contida no payload da barra", () => {
    render(<PosImplantacaoTab project={postProject()} />);
    const point = mocks.barData.find((item) => item.natureza === "Erro operacional");
    act(() => mocks.barClicks.get("total")?.({ payload: point }));

    expect(screen.getByRole("button", { name: "Limpar filtro" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Erro selecionado" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dúvida fora do filtro" })).not.toBeInTheDocument();
  });

  it("alterna o filtro de natureza do panorama e ignora payload inválido", () => {
    render(<MemoryRouter><PanoramaBase escopo="abertos" titulo="Panorama" descricao="Resumo" /></MemoryRouter>);
    act(() => mocks.barClicks.get("total")?.({ payload: null }));
    expect(screen.getByRole("button", { name: "Chamados (2)" })).toBeInTheDocument();

    const point = mocks.barData.find((item) => item.natureza === "Erro operacional");
    act(() => mocks.barClicks.get("total")?.({ payload: point }));
    expect(screen.getByRole("button", { name: "Chamados (1)" })).toBeInTheDocument();

    act(() => mocks.barClicks.get("total")?.({ payload: point }));
    expect(screen.getByRole("button", { name: "Chamados (2)" })).toBeInTheDocument();
  });

  it.each([false, true])("seleciona dia e analista nas barras SD com mobile=%s", (mobile) => {
    mocks.mobile = mobile;
    render(<TimeManagementReport />);
    const point = mocks.barData[2];
    const dateKey = point.dateKey;
    act(() => mocks.barClicks.get("hubHours")?.({ payload: point }));
    expect(mocks.reportCalls).toHaveBeenLastCalledWith(dateKey, dateKey, undefined, "", []);

    act(() => mocks.barClicks.get("importedHours")?.({ payload: mocks.barData[0] }));
    expect(mocks.reportCalls).toHaveBeenLastCalledWith(dateKey, dateKey, "analyst", "", []);
  });
});
