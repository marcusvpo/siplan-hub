import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { StageDispatchBadge } from "@/components/ProjectManagement/StageDispatchBadge";
import { formatDispatchedDate } from "@/utils/date-formatters";

describe("StageDispatchBadge", () => {
  it("deve renderizar o badge neutro quando a notificação estiver aguardando início da etapa", () => {
    render(<StageDispatchBadge stageId="infra" dispatchDone={false} />);

    const badge = screen.getByTestId("stage-dispatch-badge-infra");
    expect(badge).toBeDefined();
    expect(badge.textContent).toContain("✉️");
    expect(badge.textContent).toContain("Notificação:");
    expect(badge.textContent).toContain("Aguardando primeiro início da etapa (Em Andamento)");
    expect(badge.className).toContain("bg-slate-50");
  });

  it("deve renderizar o badge verde discreto com data formatada quando disparado", () => {
    const dispatchedDate = new Date(2026, 10, 4, 14, 30); // 04/11/2026 às 14:30
    render(
      <StageDispatchBadge
        stageId="adherence"
        dispatchDone={true}
        dispatchedAt={dispatchedDate}
      />
    );

    const badge = screen.getByTestId("stage-dispatch-badge-adherence");
    expect(badge).toBeDefined();
    expect(badge.textContent).toContain("✉️");
    expect(badge.textContent).toContain("Notificação:");
    expect(badge.textContent).toContain("Disparado em 04/11/2026 às 14:30 (Bloqueado contra duplicidade)");
    expect(badge.className).toContain("bg-emerald-50");
  });

  it("deve renderizar o texto correto quando disparado apenas com booleano dispatchDone sem data", () => {
    render(<StageDispatchBadge stageId="conversion" dispatchDone={true} />);

    const badge = screen.getByTestId("stage-dispatch-badge-conversion");
    expect(badge).toBeDefined();
    expect(badge.textContent).toContain("Disparado (Bloqueado contra duplicidade)");
    expect(badge.className).toContain("bg-emerald-50");
  });

  it("deve renderizar versão compacta para o cabeçalho", () => {
    const { unmount } = render(
      <StageDispatchBadge compact stageId="environment" dispatchDone={false} />
    );
    const compactPending = screen.getByTestId("stage-dispatch-badge-compact-environment");
    expect(compactPending.textContent).toContain("Aguardando");
    unmount();

    render(
      <StageDispatchBadge compact stageId="environment" dispatchDone={true} />
    );
    const compactDone = screen.getByTestId("stage-dispatch-badge-compact-environment");
    expect(compactDone.textContent).toContain("Disparado");
  });

  it("deve lidar com strings ISO em dispatchedAt com segurança", () => {
    const isoString = "2026-11-04T15:45:00.000Z";
    render(
      <StageDispatchBadge
        stageId="infra"
        dispatchedAt={isoString}
      />
    );

    const badge = screen.getByTestId("stage-dispatch-badge-infra");
    expect(badge.textContent).toContain("Disparado em");
    expect(badge.textContent).toContain("(Bloqueado contra duplicidade)");
  });

  it("garante classes de responsividade sem transbordamento horizontal", () => {
    render(<StageDispatchBadge stageId="infra" dispatchDone={true} />);
    const badge = screen.getByTestId("stage-dispatch-badge-infra");
    expect(badge.className).toContain("flex-wrap");
    expect(badge.className).toContain("max-w-full");
    expect(badge.className).toContain("break-words");
  });
});

describe("date-formatters helper", () => {
  it("deve formatar data no padrão DD/MM/AAAA às HH:mm", () => {
    const d = new Date(2026, 10, 4, 9, 5);
    expect(formatDispatchedDate(d)).toBe("04/11/2026 às 09:05");
  });

  it("deve retornar null para entradas vazias ou inválidas", () => {
    expect(formatDispatchedDate(null)).toBeNull();
    expect(formatDispatchedDate(undefined)).toBeNull();
    expect(formatDispatchedDate("")).toBeNull();
    expect(formatDispatchedDate("invalid-date-string")).toBeNull();
  });
});
