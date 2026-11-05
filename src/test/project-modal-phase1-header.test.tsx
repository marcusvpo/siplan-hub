import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Phase1HeaderTag, formatPhase1Date } from "@/components/ProjectManagement/ProjectModal";
import type { ProjectV2 } from "@/types/ProjectV2";

describe("Phase1HeaderTag - Cabeçalho do Modal de Projetos", () => {
  it("formata datas no padrão dd/MM corretamente a partir de string ISO ou Date", () => {
    expect(formatPhase1Date("2026-11-30")).toBe("30/11");
    expect(formatPhase1Date("2026-12-04T12:00:00.000Z")).toBe("04/12");
    expect(formatPhase1Date(null)).toBe("");
    expect(formatPhase1Date(undefined)).toBe("");
  });

  it("renderiza a tag verde confirmada com o padrão exato solicitado quando isConfirmed está ativo", () => {
    const mockProject = {
      id: "proj-1",
      clientName: "Cartório Modelo",
      stages: {
        implementation: {
          status: "in-progress",
          responsible: "Rodrigo Brites",
          startDate: new Date("2026-11-30T00:00:00"),
          endDate: new Date("2026-12-04T00:00:00"),
          phase1: {
            status: "in-progress",
            responsible: "Rodrigo Brites",
            startDate: new Date("2026-11-30T00:00:00"),
            endDate: new Date("2026-12-04T00:00:00"),
            isConfirmed: true,
          },
          phase2: {
            status: "pending",
          },
        },
      },
    } as unknown as ProjectV2;

    const onClick = vi.fn();
    render(<Phase1HeaderTag project={mockProject} onClick={onClick} />);

    // Texto solicitado: "Implantação confirmada de 30/11 a 04/12 - Rodrigo Brites"
    const button = screen.getByRole("button", {
      name: /Implantação confirmada de 30\/11 a 04\/12 - Rodrigo Brites/i,
    });
    expect(button).toBeInTheDocument();
    expect(button.className).toContain("text-emerald-700");

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renderiza a tag laranja prevista quando o interruptor isConfirmed está inativo", () => {
    const mockProject = {
      id: "proj-2",
      clientName: "2º Ofício de Notas",
      stages: {
        implementation: {
          status: "pending",
          responsible: "Rodrigo Mizuno",
          startDate: new Date("2026-11-20T00:00:00"),
          endDate: new Date("2026-11-25T00:00:00"),
          phase1: {
            status: "pending",
            responsible: "Rodrigo Mizuno",
            startDate: new Date("2026-11-20T00:00:00"),
            endDate: new Date("2026-11-25T00:00:00"),
            isConfirmed: false,
          },
          phase2: {
            status: "pending",
          },
        },
      },
    } as unknown as ProjectV2;

    const onClick = vi.fn();
    render(<Phase1HeaderTag project={mockProject} onClick={onClick} />);

    const button = screen.getByRole("button", {
      name: /Implantação prevista de 20\/11 a 25\/11 - Rodrigo Mizuno/i,
    });
    expect(button).toBeInTheDocument();
    expect(button.className).toContain("text-amber-800");

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("não renderiza nada se o projeto não tiver responsável ou datas preenchidas na etapa", () => {
    const projectWithoutDates = {
      id: "proj-3",
      clientName: "Cartório Sem Datas",
      stages: {
        implementation: {
          status: "pending",
          responsible: "",
          phase1: {
            status: "pending",
            isConfirmed: false,
          },
          phase2: {
            status: "pending",
          },
        },
      },
    } as unknown as ProjectV2;

    const { container } = render(
      <Phase1HeaderTag project={projectWithoutDates} onClick={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });
});
