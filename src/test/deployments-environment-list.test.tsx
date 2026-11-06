import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import {
  EnvironmentListDialog,
  hasEnvironmentStageData,
  getEnvironmentData,
} from "@/components/EnvironmentConfig/EnvironmentListDialog";
import type { ProjectV2 } from "@/types/ProjectV2";
import * as csvExport from "@/lib/csv-export";
import * as xlsxExport from "@/lib/xlsx-export";

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("EnvironmentListDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleProjects: ProjectV2[] = [
    {
      id: "p-1",
      clientName: "1º Ofício de Notas de Santos",
      ticketNumber: "1001",
      systemType: "Cartório Extrajudicial",
      globalStatus: "in-progress",
      stages: {
        environment: {
          status: "in-progress",
          responsible: "Alex Silva",
          postgresHost: "192.168.1.50:5432",
          postgresVersion: "Versão 17",
          postgresUser: "postgres",
          osCredentials: [
            {
              id: "cred-1",
              title: "Servidor Linux",
              serverIp: "192.168.1.50",
              fields: [
                { id: "f-1", label: "IP", value: "192.168.1.50" },
                { id: "f-2", label: "Usuário", value: "root" },
              ],
            },
          ],
          remoteAccessList: [
            { system: "AnyDesk", id: "123456789", password: "pass" },
            {
              system: "VPN",
              id: "vpn_user",
              vpnFiles: [
                { id: "f-1", name: "config.ovpn", path: "vpn/config.ovpn", size: 1024, uploadedAt: "2026-11-06" },
              ],
            },
          ],
        } as any,
      } as any,
    } as ProjectV2,
    {
      id: "p-2",
      clientName: "Registro Civil de Campinas",
      ticketNumber: "1002",
      systemType: "Registro Civil",
      globalStatus: "done",
      stages: {
        environment: {
          status: "done",
          responsible: "Bruno Fernandes",
          postgresHost: "10.0.0.12:5432",
          postgresVersion: "Versão 12",
          postgresUser: "postgres",
          osCredentials: [
            {
              id: "cred-2",
              title: "Servidor Windows",
              serverIp: "10.0.0.12",
            },
          ],
          remoteAccessList: [{ system: "TeamViewer", id: "987654321" }],
        } as any,
      } as any,
    } as ProjectV2,
    {
      id: "p-custom",
      clientName: "Cartório com Dados em CustomFields",
      ticketNumber: "1004",
      systemType: "Notas",
      globalStatus: "in-progress",
      customFields: {
        environment_os_credentials: [
          {
            id: "cred-cf",
            title: "Servidor DB",
            serverIp: "172.16.0.5",
          },
        ],
        environment_remote_access_list: [
          { system: "RustDesk", id: "rust-999" },
        ],
        environment_postgres_host: "172.16.0.5:5432",
        environment_postgres_version: "Versão 18",
        environment_postgres_user: "postgres",
      },
      stages: {
        environment: {
          status: "in-progress",
          responsible: "Ademar Souza",
        } as any,
      } as any,
    } as unknown as ProjectV2,
    {
      id: "p-empty",
      clientName: "Cartório Sem Ambiente",
      ticketNumber: "1003",
      systemType: "Outro",
      globalStatus: "in-progress",
      stages: {
        environment: {
          status: "todo",
        } as any,
      } as any,
    } as ProjectV2,
  ];

  it("filtra corretamente projetos com dados cadastrados na etapa 4 (incluindo customFields)", () => {
    expect(hasEnvironmentStageData(sampleProjects[0])).toBe(true);
    expect(hasEnvironmentStageData(sampleProjects[1])).toBe(true);
    expect(hasEnvironmentStageData(sampleProjects[2])).toBe(true);
    expect(hasEnvironmentStageData(sampleProjects[3])).toBe(false);
  });

  it("extrai corretamente dados de ambiente de stages e customFields via getEnvironmentData", () => {
    const data1 = getEnvironmentData(sampleProjects[0]);
    expect(data1.postgresHost).toBe("192.168.1.50:5432");
    expect(data1.remoteAccessList).toHaveLength(2);
    expect(data1.osCredentials).toHaveLength(1);

    const dataCustom = getEnvironmentData(sampleProjects[2]);
    expect(dataCustom.postgresHost).toBe("172.16.0.5:5432");
    expect(dataCustom.postgresVersion).toBe("Versão 18");
    expect(dataCustom.remoteAccessList).toHaveLength(1);
    expect(dataCustom.remoteAccessList[0].system).toBe("RustDesk");
  });

  it("renderiza a tabela apenas com os projetos elegíveis e exibe botões de ação e exportação", () => {
    render(
      <MemoryRouter>
        <EnvironmentListDialog
          open={true}
          onOpenChange={vi.fn()}
          projects={sampleProjects}
          onSelectProject={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("1º Ofício de Notas de Santos")).toBeInTheDocument();
    expect(screen.getByText("Registro Civil de Campinas")).toBeInTheDocument();
    expect(screen.getByText("Cartório com Dados em CustomFields")).toBeInTheDocument();
    expect(screen.queryByText("Cartório Sem Ambiente")).not.toBeInTheDocument();

    // Botões de exportação visíveis
    expect(screen.getByRole("button", { name: /Exportar CSV/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Exportar XLSX/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Copiar Tabela/i })).toBeInTheDocument();
  });

  it("filtra por busca textual (nome, chamado ou IP)", () => {
    render(
      <MemoryRouter>
        <EnvironmentListDialog
          open={true}
          onOpenChange={vi.fn()}
          projects={sampleProjects}
          onSelectProject={vi.fn()}
        />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText(/Buscar por cliente, chamado ou IP.../i);

    // Busca por IP
    fireEvent.change(searchInput, { target: { value: "192.168.1.50" } });
    expect(screen.getByText("1º Ofício de Notas de Santos")).toBeInTheDocument();
    expect(screen.queryByText("Registro Civil de Campinas")).not.toBeInTheDocument();

    // Busca por número de chamado
    fireEvent.change(searchInput, { target: { value: "1002" } });
    expect(screen.queryByText("1º Ofício de Notas de Santos")).not.toBeInTheDocument();
    expect(screen.getByText("Registro Civil de Campinas")).toBeInTheDocument();
  });

  it("chama onSelectProject ao clicar no nome do projeto/cliente", () => {
    const onSelectProjectMock = vi.fn();
    const onOpenChangeMock = vi.fn();

    render(
      <MemoryRouter>
        <EnvironmentListDialog
          open={true}
          onOpenChange={onOpenChangeMock}
          projects={sampleProjects}
          onSelectProject={onSelectProjectMock}
        />
      </MemoryRouter>
    );

    const clientButton = screen.getByRole("button", { name: /1º Ofício de Notas de Santos/i });
    fireEvent.click(clientButton);

    expect(onSelectProjectMock).toHaveBeenCalledWith(sampleProjects[0]);
    expect(onOpenChangeMock).toHaveBeenCalledWith(false);
  });

  it("navega para /projects?id=... ao clicar no botão 'Abrir' na coluna Ações", () => {
    const onOpenChangeMock = vi.fn();

    render(
      <MemoryRouter>
        <EnvironmentListDialog
          open={true}
          onOpenChange={onOpenChangeMock}
          projects={sampleProjects}
          onSelectProject={vi.fn()}
        />
      </MemoryRouter>
    );

    const openButtons = screen.getAllByRole("button", { name: /Abrir/i });
    fireEvent.click(openButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith("/projects?id=p-1");
    expect(onOpenChangeMock).toHaveBeenCalledWith(false);
  });

  it("copia informações formatadas do projeto ao clicar no botão de copiar da linha", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <MemoryRouter>
        <EnvironmentListDialog
          open={true}
          onOpenChange={vi.fn()}
          projects={sampleProjects}
          onSelectProject={vi.fn()}
        />
      </MemoryRouter>
    );

    const copyProjectButtons = screen.getAllByTitle(/Copiar dados deste projeto para a área de transferência/i);
    fireEvent.click(copyProjectButtons[0]);

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    const copiedText = writeTextMock.mock.calls[0][0];
    expect(copiedText).toContain("1º Ofício de Notas de Santos");
    expect(copiedText).toContain("192.168.1.50:5432");
    expect(copiedText).toContain("AnyDesk");
    expect(copiedText).toContain("VPN");
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Dados do projeto copiados!" }));
  });

  it("exporta XLSX ao clicar no botão 'Exportar XLSX'", async () => {
    const buildXlsxSpy = vi.spyOn(xlsxExport, "buildXlsxWorkbook").mockResolvedValue(new Uint8Array([1, 2, 3]));
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    global.URL.createObjectURL = vi.fn(() => "mock-url");
    global.URL.revokeObjectURL = vi.fn();

    render(
      <MemoryRouter>
        <EnvironmentListDialog
          open={true}
          onOpenChange={vi.fn()}
          projects={sampleProjects}
          onSelectProject={vi.fn()}
        />
      </MemoryRouter>
    );

    const exportXlsxButton = screen.getByRole("button", { name: /Exportar XLSX/i });
    fireEvent.click(exportXlsxButton);

    expect(buildXlsxSpy).toHaveBeenCalledTimes(1);
    expect(buildXlsxSpy).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Ambientes & Conexões",
          headerRows: [0],
          frozenRows: 1,
        }),
      ])
    );

    buildXlsxSpy.mockRestore();
    clickSpy.mockRestore();
  });

  it("exporta CSV ao clicar no botão 'Exportar CSV'", () => {
    const downloadCsvSpy = vi.spyOn(csvExport, "downloadCsv").mockImplementation(() => {});

    render(
      <MemoryRouter>
        <EnvironmentListDialog
          open={true}
          onOpenChange={vi.fn()}
          projects={sampleProjects}
          onSelectProject={vi.fn()}
        />
      </MemoryRouter>
    );

    const exportButton = screen.getByRole("button", { name: /Exportar CSV/i });
    fireEvent.click(exportButton);

    expect(downloadCsvSpy).toHaveBeenCalledTimes(1);
    expect(downloadCsvSpy).toHaveBeenCalledWith(
      expect.stringContaining("ambientes_implantacao_"),
      expect.arrayContaining(["Cliente", "Chamado", "Status Geral", "Status Etapa 4"]),
      expect.any(Array)
    );

    downloadCsvSpy.mockRestore();
  });
});
