import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ProjectV2 } from "@/types/ProjectV2";
import { DeploymentDetailsDialog } from "./DeploymentDetailsDialog";

vi.mock("@/hooks/useProjectsV2", () => ({
  useProjectsV2: () => ({
    updateProject: { mutateAsync: vi.fn() },
  }),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ canEditProjects: true }),
}));

vi.mock("@/hooks/useTeamMembers", () => ({
  useTeamMembers: () => ({ members: [] }),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const original = await importOriginal<typeof import("react-router-dom")>();
  return { ...original, useNavigate: () => vi.fn() };
});

const project = {
  id: "deployment-dialog",
  clientName: "Cliente com nome muito extenso para o modal no celular",
  ticketNumber: "701234",
  systemType: "Orion TN",
  soldHours: 32,
  specialty: "Notas e protestos",
  stages: {
    infra: { status: "done" },
    adherence: { status: "done" },
    environment: { status: "done" },
    conversion: { status: "done" },
    implementation: {
      status: "in-progress",
      phase1: {
        status: "in-progress",
        responsible: "Implantador",
        startDate: new Date("2099-09-02T12:00:00Z"),
        endDate: new Date("2099-09-03T12:00:00Z"),
      },
    },
    post: { status: "todo" },
  },
} as unknown as ProjectV2;

describe("Detalhes da implantação no mobile", () => {
  it("limita o modal ao viewport e mantém ações e textos legíveis", () => {
    render(
      <DeploymentDetailsDialog
        project={project}
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("deployment-details-dialog")).toHaveClass(
      "w-[calc(100vw-1rem)]",
      "max-h-[calc(100dvh-1rem)]",
      "overflow-x-hidden",
      "p-3",
      "sm:p-5",
    );
    expect(screen.getByRole("heading", { name: project.clientName })).toHaveClass(
      "break-words",
      "pr-10",
    );
    expect(screen.getByRole("button", { name: "Fechar" })).toHaveClass(
      "w-full",
      "sm:w-auto",
    );
    expect(
      screen.getByRole("button", { name: /Ver Projeto Completo/i }),
    ).toHaveClass("w-full", "sm:w-auto");
  });
});
