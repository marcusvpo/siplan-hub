import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EnvironmentStageForm } from "@/components/ProjectManagement/Forms/StageForms/EnvironmentStageForm";
import type { EnvironmentStageV2 } from "@/types/ProjectV2";

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe("EnvironmentStageForm - Credenciais do SO e Servidores", () => {
  const baseStage: EnvironmentStageV2 = {
    status: "in-progress",
    approvedByInfra: false,
    testAvailable: false,
    osCredentials: [],
  };

  it("exibe mensagem vazia e botão de adicionar servidor quando não houver credenciais", () => {
    render(
      <EnvironmentStageForm
        stage={baseStage}
        canEditProjects={true}
        onUpdate={vi.fn()}
      />
    );

    expect(screen.getByText("Credenciais do Sistema Operacional (SO)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /adicionar servidor/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Nenhum servidor ou credencial cadastrada/i)
    ).toBeInTheDocument();
  });

  it("adiciona um novo servidor com campos de nome e IP vazios ao clicar em Adicionar Servidor", () => {
    const onUpdateMock = vi.fn();
    render(
      <EnvironmentStageForm
        stage={baseStage}
        canEditProjects={true}
        onUpdate={onUpdateMock}
      />
    );

    const addButton = screen.getByRole("button", { name: /adicionar servidor/i });
    fireEvent.click(addButton);

    expect(onUpdateMock).toHaveBeenCalledTimes(1);
    const updatedPayload = onUpdateMock.mock.calls[0][0];
    expect(updatedPayload.osCredentials).toHaveLength(1);
    expect(updatedPayload.osCredentials[0]).toEqual(
      expect.objectContaining({
        serverName: "",
        serverIp: "",
        osType: "",
        login: "",
        password: "",
      })
    );
  });

  it("renderiza campos de Nome do Servidor, IP, SO, Usuário e Senha para cada servidor cadastrado", () => {
    const stageWithServers: EnvironmentStageV2 = {
      ...baseStage,
      osCredentials: [
        {
          id: "srv-1",
          serverName: "Servidor Orion BD",
          serverIp: "192.168.1.100",
          osType: "Linux",
          login: "postgres",
          password: "dbpassword",
        },
        {
          id: "srv-2",
          serverName: "Servidor TS / Aplicação",
          serverIp: "192.168.1.101",
          osType: "Windows",
          login: "Administrator",
          password: "adminpassword",
        },
      ],
    };

    render(
      <EnvironmentStageForm
        stage={stageWithServers}
        canEditProjects={true}
        onUpdate={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue("Servidor Orion BD")).toBeInTheDocument();
    expect(screen.getByDisplayValue("192.168.1.100")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Servidor TS / Aplicação")).toBeInTheDocument();
    expect(screen.getByDisplayValue("192.168.1.101")).toBeInTheDocument();
  });

  it("permite atualizar o Nome e IP do servidor", () => {
    const onUpdateMock = vi.fn();
    const stageWithServer: EnvironmentStageV2 = {
      ...baseStage,
      osCredentials: [
        {
          id: "srv-1",
          serverName: "Servidor Antigo",
          serverIp: "10.0.0.1",
          osType: "Linux",
          login: "root",
          password: "secret",
        },
      ],
    };

    render(
      <EnvironmentStageForm
        stage={stageWithServer}
        canEditProjects={true}
        onUpdate={onUpdateMock}
      />
    );

    const nameInput = screen.getByDisplayValue("Servidor Antigo");
    fireEvent.change(nameInput, { target: { value: "Servidor Novo" } });

    expect(onUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        osCredentials: [
          expect.objectContaining({
            id: "srv-1",
            serverName: "Servidor Novo",
          }),
        ],
      })
    );

    const ipInput = screen.getByDisplayValue("10.0.0.1");
    fireEvent.change(ipInput, { target: { value: "10.0.0.25" } });

    expect(onUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        osCredentials: [
          expect.objectContaining({
            id: "srv-1",
            serverIp: "10.0.0.25",
          }),
        ],
      })
    );
  });

  it("permite remover um servidor da lista", () => {
    const onUpdateMock = vi.fn();
    const stageWithServers: EnvironmentStageV2 = {
      ...baseStage,
      osCredentials: [
        {
          id: "srv-1",
          serverName: "Servidor 1",
          serverIp: "192.168.1.10",
        },
        {
          id: "srv-2",
          serverName: "Servidor 2",
          serverIp: "192.168.1.20",
        },
      ],
    };

    render(
      <EnvironmentStageForm
        stage={stageWithServers}
        canEditProjects={true}
        onUpdate={onUpdateMock}
      />
    );

    const removeButtons = screen.getAllByRole("button", { name: /remover credencial de so/i });
    expect(removeButtons).toHaveLength(2);

    // Remove o primeiro servidor
    fireEvent.click(removeButtons[0]);

    expect(onUpdateMock).toHaveBeenCalledWith({
      osCredentials: [
        expect.objectContaining({
          id: "srv-2",
          serverName: "Servidor 2",
        }),
      ],
    });
  });

  it("renderiza datalist com os servidores de infraServers quando disponíveis", () => {
    const infraServers = [
      { hostname: "SRV-CARTORIO-01" },
      { hostname: "SRV-CARTORIO-02" },
    ];

    const stageWithServer: EnvironmentStageV2 = {
      ...baseStage,
      osCredentials: [
        {
          id: "srv-1",
          serverName: "",
          serverIp: "",
        },
      ],
    };

    const { container } = render(
      <EnvironmentStageForm
        stage={stageWithServer}
        canEditProjects={true}
        onUpdate={vi.fn()}
        infraServers={infraServers}
      />
    );

    const datalist = container.querySelector("#infra-servers-datalist-srv-1");
    expect(datalist).toBeInTheDocument();
    expect(datalist?.querySelectorAll("option")).toHaveLength(2);
  });
});
