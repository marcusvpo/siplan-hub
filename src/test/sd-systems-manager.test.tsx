import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SystemsManager } from "@/components/sd/SystemsManager";
import type { SdSistemaComRotinas } from "@/types/sd";

const serviceMocks = vi.hoisted(() => ({
  listSdSystemsWithRoutines: vi.fn(),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}));

vi.mock("@/services/sd-solutions", () => ({
  createSdRoutine: vi.fn(),
  createSdSystem: vi.fn(),
  deleteSdRoutine: vi.fn(),
  deleteSdSystem: vi.fn(),
  listSdSystemsWithRoutines: serviceMocks.listSdSystemsWithRoutines,
  updateSdRoutine: vi.fn(),
  updateSdSystem: vi.fn(),
}));

const expectedNames = [
  "alpha",
  "Árvore",
  "Beta",
  "delta",
  "Épsilon",
  "Gama",
  "Sistema 2",
  "Sistema 10",
  "Zulu",
];

const systems: SdSistemaComRotinas[] = [...expectedNames]
  .reverse()
  .map((nome, index) => ({
    id: `system-${index}`,
    nome,
    familia_id: null,
    criado_em: "2026-08-19T12:00:00Z",
    rotinas: [],
  }));

describe("SystemsManager", () => {
  beforeEach(() => {
    serviceMocks.listSdSystemsWithRoutines.mockReset();
    serviceMocks.listSdSystemsWithRoutines.mockResolvedValue(systems);
  });

  it("ordena alfabeticamente e pagina os sistemas de quatro em quatro", async () => {
    render(<SystemsManager />);

    await waitFor(() => {
      expect(screen.getAllByTestId("sd-system-name")).toHaveLength(4);
    });

    expect(screen.getAllByTestId("sd-system-name").map((item) => item.textContent)).toEqual(
      expectedNames.slice(0, 4),
    );
    expect(screen.queryByText("Zulu")).not.toBeInTheDocument();
    expect(screen.getByText("Página 1 de 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Próxima página de sistemas" }));

    expect(screen.getAllByTestId("sd-system-name").map((item) => item.textContent)).toEqual(
      expectedNames.slice(4, 8),
    );
    expect(screen.getByText("Página 2 de 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Próxima página de sistemas" }));

    expect(screen.getAllByTestId("sd-system-name").map((item) => item.textContent)).toEqual(["Zulu"]);
    expect(screen.getByText("Página 3 de 3")).toBeInTheDocument();
  });
});
