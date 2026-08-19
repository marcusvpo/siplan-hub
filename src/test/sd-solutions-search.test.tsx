import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SolutionsSearch } from "@/components/sd/SolutionsSearch";
import type { SdFamilia, SdSistema, SdSolucao } from "@/types/sd";

const serviceMocks = vi.hoisted(() => ({
  listSdFamilies: vi.fn(),
  listSdRoutines: vi.fn(),
  listSdSolutions: vi.fn(),
  listSdSystems: vi.fn(),
}));

vi.mock("@/services/sd-solutions", () => serviceMocks);

const families: SdFamilia[] = [
  {
    id: "family-1",
    nome: "Atendimento",
    descricao: "Sistemas de atendimento",
    criado_em: "2026-08-19T12:00:00Z",
  },
];

const systems: SdSistema[] = [
  {
    id: "system-1",
    nome: "SiplanPRO",
    familia_id: "family-1",
    criado_em: "2026-08-19T12:00:00Z",
  },
  {
    id: "system-2",
    nome: "Legado",
    familia_id: null,
    criado_em: "2026-08-19T12:00:00Z",
  },
];

const solutions: SdSolucao[] = [
  {
    id: "solution-1",
    titulo: "Configurar certificado",
    descricao: "<p>Procedimento técnico.</p>",
    sistema_id: "system-1",
    rotina_id: null,
    palavras_chave: [],
    criado_em: "2026-08-19T12:00:00Z",
    atualizado_em: "2026-08-19T12:00:00Z",
    criado_por: null,
    atualizado_por: null,
    sistema: { id: "system-1", nome: "SiplanPRO" },
    rotina: null,
  },
];

describe("SolutionsSearch", () => {
  it("mostra famílias primeiro e abre as soluções da família selecionada", async () => {
    serviceMocks.listSdFamilies.mockResolvedValue(families);
    serviceMocks.listSdSystems.mockResolvedValue(systems);
    serviceMocks.listSdRoutines.mockResolvedValue([]);
    serviceMocks.listSdSolutions.mockResolvedValue(solutions);

    render(<SolutionsSearch refreshKey={0} onOpen={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Atendimento")).toBeInTheDocument();
    });
    expect(screen.getByText("Sem família")).toBeInTheDocument();
    expect(screen.queryByText("Configurar certificado")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Atendimento/i }));

    expect(screen.getByText("Configurar certificado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Voltar para todas as famílias" })).toBeInTheDocument();
  });
});
