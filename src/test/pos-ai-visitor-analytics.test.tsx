import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PosAiVisitorAnalytics } from "@/components/Admin/PosAiVisitorAnalytics";
import type { PosAiVisitorAnalyticsData } from "@/hooks/usePosAiVisitorAnalytics";

const analytics: PosAiVisitorAnalyticsData = {
  kpis: {
    registered_users: 3,
    active_users: 2,
    active_sectors: 2,
    user_questions: 18,
    total_sessions: 5,
    total_messages: 40,
    identified_messages: 36,
    unidentified_messages: 4,
    total_tokens: 12500,
    estimated_cost_usd: 0.075,
    unidentified_cost_usd: 0.01,
    identification_rate: 90,
    avg_questions_per_user: 9,
  },
  by_user: [
    {
      visitor_id: "visitor-1",
      project_id: "project-1",
      client_name: "Cartório Central",
      name: "Ana Souza",
      sector: "Atendimento",
      user_questions: 12,
      assistant_replies: 12,
      total_messages: 24,
      total_sessions: 3,
      total_tokens: 8000,
      estimated_cost_usd: 0.05,
      helpful_count: 3,
      unhelpful_count: 1,
      satisfaction_rate: 75,
      last_activity: "2026-08-21T12:00:00.000Z",
    },
  ],
  by_sector: [
    {
      sector: "Atendimento",
      active_users: 1,
      user_questions: 12,
      assistant_replies: 12,
      total_messages: 24,
      total_sessions: 3,
      total_tokens: 8000,
      estimated_cost_usd: 0.05,
      helpful_count: 3,
      unhelpful_count: 1,
      satisfaction_rate: 75,
      last_activity: "2026-08-21T12:00:00.000Z",
    },
  ],
};

describe("painel de uso por usuário e setor", () => {
  it("mostra ranking, setor, custo e cobertura de identificação", () => {
    render(
      <PosAiVisitorAnalytics data={analytics} isLoading={false} showProject />,
    );

    expect(screen.getAllByText("Ana Souza").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Atendimento").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cartório Central").length).toBeGreaterThan(0);
    expect(screen.getByText("90.0%")).toBeInTheDocument();
    expect(screen.getAllByText("$0.0500").length).toBeGreaterThan(0);
  });

  it("explica quando ainda não há uso identificado", () => {
    render(
      <PosAiVisitorAnalytics
        data={{
          ...analytics,
          kpis: { ...analytics.kpis, active_users: 0 },
          by_user: [],
          by_sector: [],
        }}
        isLoading={false}
        showProject={false}
      />,
    );

    expect(screen.getByText("Nenhum uso identificado neste período")).toBeInTheDocument();
  });
});
