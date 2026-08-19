import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SolutionDetails } from "@/components/sd/SolutionDetails";
import type { SdSolucao } from "@/types/sd";

const serviceMocks = vi.hoisted(() => ({
  deleteSdSolution: vi.fn(),
  getSdAttachmentDownloadUrl: vi.fn(),
  getSdSolution: vi.fn(),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}));

vi.mock("@/services/sd-solutions", () => serviceMocks);

const solution: SdSolucao = {
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
  anexos: [
    {
      id: "attachment-1",
      solucao_id: "solution-1",
      nome_arquivo: "ajuste-certificado.sql",
      caminho_storage: "solution-1/attachment-1-ajuste-certificado.sql",
      tipo_mime: "application/sql",
      tamanho_bytes: 1536,
      criado_em: "2026-08-19T12:00:00Z",
      criado_por: null,
    },
  ],
};

describe("SolutionDetails", () => {
  beforeEach(() => {
    localStorage.clear();
    serviceMocks.getSdSolution.mockReset();
    serviceMocks.getSdSolution.mockResolvedValue(solution);
    serviceMocks.getSdAttachmentDownloadUrl.mockReset();
    serviceMocks.getSdAttachmentDownloadUrl.mockResolvedValue("https://storage.test/anexo");
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1200 });
  });

  it("redimensiona o painel arrastando sua borda esquerda", async () => {
    render(
      <SolutionDetails
        solutionId="solution-1"
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDeleted={vi.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByText("Configurar certificado")).toBeInTheDocument());

    const handle = screen.getByRole("separator", { name: "Redimensionar painel de detalhes" });
    const panel = handle.parentElement;
    expect(panel).toHaveStyle({ width: "672px" });

    fireEvent.pointerDown(handle, { clientX: 528 });
    const moveEvent = new Event("pointermove");
    Object.defineProperty(moveEvent, "clientX", { value: 300 });
    fireEvent(window, moveEvent);
    fireEvent.pointerUp(window);

    expect(panel).toHaveStyle({ width: "900px" });
    await waitFor(() => {
      expect(localStorage.getItem("sd-solution-details-width")).toBe("900");
    });
  });

  it("permite ajustar pelo teclado e restaurar o tamanho padrão", async () => {
    localStorage.setItem("sd-solution-details-width", "800");
    render(
      <SolutionDetails
        solutionId="solution-1"
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDeleted={vi.fn()}
      />,
    );

    const handle = await screen.findByRole("separator", {
      name: "Redimensionar painel de detalhes",
    });
    const panel = handle.parentElement;
    expect(panel).toHaveStyle({ width: "800px" });

    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    expect(panel).toHaveStyle({ width: "832px" });

    fireEvent.doubleClick(handle);
    expect(panel).toHaveStyle({ width: "672px" });
  });

  it("exibe e baixa anexos usando uma URL assinada", async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(
      <SolutionDetails
        solutionId="solution-1"
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDeleted={vi.fn()}
      />,
    );

    expect(await screen.findByText("ajuste-certificado.sql")).toBeInTheDocument();
    expect(screen.getByText("1.5 KB · application/sql")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Baixar" }));

    await waitFor(() => {
      expect(serviceMocks.getSdAttachmentDownloadUrl).toHaveBeenCalledWith(
        solution.anexos?.[0],
      );
      expect(click).toHaveBeenCalledOnce();
    });
    click.mockRestore();
  });
});
