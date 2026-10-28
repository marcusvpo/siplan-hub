import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EnvironmentStageForm } from "@/components/ProjectManagement/Forms/StageForms/EnvironmentStageForm";
import type { EnvironmentStageV2 } from "@/types/ProjectV2";

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe("EnvironmentStageForm - Blocos de Acesso e Credenciais do SO", () => {
  const baseStage: EnvironmentStageV2 = {
    status: "in-progress",
    approvedByInfra: false,
    testAvailable: false,
    osCredentials: [],
  };

  it("exibe estado vazio e botões para adicionar blocos de acesso", () => {
    render(
      <EnvironmentStageForm
        stage={baseStage}
        canEditProjects={true}
        onUpdate={vi.fn()}
      />
    );

    expect(screen.getByText(/Credenciais do Sistema Operacional \(SO\) — Blocos de Acesso/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Servidor Linux/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Servidor Windows/i })).toBeInTheDocument();
    expect(screen.getByText(/Nenhum bloco de acesso cadastrado/i)).toBeInTheDocument();
  });

  it("adiciona um bloco 'Servidor Linux' com os campos padrão sugeridos (Host, Porta, IP, Usuário, Senha)", () => {
    const onUpdateMock = vi.fn();
    render(
      <EnvironmentStageForm
        stage={baseStage}
        canEditProjects={true}
        onUpdate={onUpdateMock}
      />
    );

    const linuxButton = screen.getByRole("button", { name: /Servidor Linux/i });
    fireEvent.click(linuxButton);

    expect(onUpdateMock).toHaveBeenCalledTimes(1);
    const updatedPayload = onUpdateMock.mock.calls[0][0];
    expect(updatedPayload.osCredentials).toHaveLength(1);

    const block = updatedPayload.osCredentials[0];
    expect(block.title).toBe("Servidor Linux");
    expect(block.fields).toHaveLength(5);
    expect(block.fields.map((f: any) => f.label)).toEqual(["Host", "Porta", "IP", "Usuário", "Senha"]);
  });

  it("permite editar o título de um bloco", () => {
    const onUpdateMock = vi.fn();
    const stageWithBlock: EnvironmentStageV2 = {
      ...baseStage,
      osCredentials: [
        {
          id: "blk-1",
          title: "Servidor Antigo",
          fields: [{ id: "f1", label: "Host", value: "servidor-1" }],
        },
      ],
    };

    render(
      <EnvironmentStageForm
        stage={stageWithBlock}
        canEditProjects={true}
        onUpdate={onUpdateMock}
      />
    );

    const titleInput = screen.getByDisplayValue("Servidor Antigo");
    fireEvent.change(titleInput, { target: { value: "Servidor VM08" } });

    expect(onUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        osCredentials: [
          expect.objectContaining({
            id: "blk-1",
            title: "Servidor VM08",
          }),
        ],
      })
    );
  });

  it("permite adicionar uma nova linha (+ Linha) dentro de um bloco", () => {
    const onUpdateMock = vi.fn();
    const stageWithBlock: EnvironmentStageV2 = {
      ...baseStage,
      osCredentials: [
        {
          id: "blk-1",
          title: "Servidor Linux",
          fields: [
            { id: "f1", label: "Host", value: "1tnguaruja-orion" },
          ],
        },
      ],
    };

    render(
      <EnvironmentStageForm
        stage={stageWithBlock}
        canEditProjects={true}
        onUpdate={onUpdateMock}
      />
    );

    const addLineButton = screen.getByRole("button", { name: /\+ linha/i });
    fireEvent.click(addLineButton);

    expect(onUpdateMock).toHaveBeenCalledTimes(1);
    const updated = onUpdateMock.mock.calls[0][0];
    expect(updated.osCredentials[0].fields).toHaveLength(2);
    expect(updated.osCredentials[0].fields[1]).toEqual(
      expect.objectContaining({
        label: "",
        value: "",
      })
    );
  });

  it("permite atualizar o Rótulo e o Valor de uma linha dinâmica", () => {
    const onUpdateMock = vi.fn();
    const stageWithBlock: EnvironmentStageV2 = {
      ...baseStage,
      osCredentials: [
        {
          id: "blk-1",
          title: "Servidor Linux",
          fields: [
            { id: "f1", label: "IP", value: "192.168.1.1" },
          ],
        },
      ],
    };

    render(
      <EnvironmentStageForm
        stage={stageWithBlock}
        canEditProjects={true}
        onUpdate={onUpdateMock}
      />
    );

    const labelInput = screen.getByDisplayValue("IP");
    fireEvent.change(labelInput, { target: { value: "IP Interno" } });

    expect(onUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        osCredentials: [
          expect.objectContaining({
            fields: [expect.objectContaining({ id: "f1", label: "IP Interno", value: "192.168.1.1" })],
          }),
        ],
      })
    );

    const valueInput = screen.getByDisplayValue("192.168.1.1");
    fireEvent.change(valueInput, { target: { value: "192.168.1.21" } });

    expect(onUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        osCredentials: [
          expect.objectContaining({
            fields: [expect.objectContaining({ id: "f1", value: "192.168.1.21" })],
            serverIp: "192.168.1.21",
          }),
        ],
      })
    );
  });

  it("permite remover uma linha específica do bloco", () => {
    const onUpdateMock = vi.fn();
    const stageWithBlock: EnvironmentStageV2 = {
      ...baseStage,
      osCredentials: [
        {
          id: "blk-1",
          title: "Servidor Linux",
          fields: [
            { id: "f1", label: "Host", value: "host1" },
            { id: "f2", label: "Porta", value: "8754" },
          ],
        },
      ],
    };

    render(
      <EnvironmentStageForm
        stage={stageWithBlock}
        canEditProjects={true}
        onUpdate={onUpdateMock}
      />
    );

    const removeLineButtons = screen.getAllByRole("button", { name: /remover campo/i });
    expect(removeLineButtons).toHaveLength(2);

    // Remove a primeira linha
    fireEvent.click(removeLineButtons[0]);

    expect(onUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        osCredentials: [
          expect.objectContaining({
            fields: [expect.objectContaining({ id: "f2", label: "Porta", value: "8754" })],
          }),
        ],
      })
    );
  });

  it("permite excluir o bloco inteiro", () => {
    const onUpdateMock = vi.fn();
    const stageWithBlocks: EnvironmentStageV2 = {
      ...baseStage,
      osCredentials: [
        {
          id: "blk-1",
          title: "Servidor Linux",
          fields: [{ id: "f1", label: "Host", value: "srv-linux" }],
        },
        {
          id: "blk-2",
          title: "Servidor Windows",
          fields: [{ id: "f2", label: "Host", value: "srv-win" }],
        },
      ],
    };

    render(
      <EnvironmentStageForm
        stage={stageWithBlocks}
        canEditProjects={true}
        onUpdate={onUpdateMock}
      />
    );

    const deleteBlockButtons = screen.getAllByRole("button", { name: /excluir bloco/i });
    expect(deleteBlockButtons).toHaveLength(2);

    // Exclui o primeiro bloco
    fireEvent.click(deleteBlockButtons[0]);

    expect(onUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        osCredentials: [
          expect.objectContaining({
            id: "blk-2",
            title: "Servidor Windows",
          }),
        ],
      })
    );
  });

  it("normaliza credenciais legadas automaticamente para o formato de bloco com campos", () => {
    const legacyStage: EnvironmentStageV2 = {
      ...baseStage,
      osCredentials: [
        {
          id: "leg-1",
          serverName: "SRV-ANTIGO",
          serverIp: "10.0.0.99",
          login: "admin",
          password: "pwd",
        },
      ],
    };

    render(
      <EnvironmentStageForm
        stage={legacyStage}
        canEditProjects={true}
        onUpdate={vi.fn()}
      />
    );

    // Deve exibir os campos migrados
    expect(screen.getAllByDisplayValue("SRV-ANTIGO").length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue("10.0.0.99")).toBeInTheDocument();
    expect(screen.getByDisplayValue("admin")).toBeInTheDocument();
    expect(screen.getByDisplayValue("pwd")).toBeInTheDocument();
  });

  it("migra automaticamente campos legados soLogin e soPassword sem perder dados", () => {
    const onUpdateMock = vi.fn();
    const legacyProjectStage: EnvironmentStageV2 = {
      ...baseStage,
      soLogin: "operador_cartorio",
      soPassword: "senha_ultra_secreta",
      osType: "Linux",
    };

    render(
      <EnvironmentStageForm
        stage={legacyProjectStage}
        canEditProjects={true}
        onUpdate={onUpdateMock}
      />
    );

    expect(onUpdateMock).toHaveBeenCalledWith({
      osCredentials: [
        expect.objectContaining({
          title: "Servidor Linux",
          login: "operador_cartorio",
          password: "senha_ultra_secreta",
          fields: expect.arrayContaining([
            expect.objectContaining({ label: "Usuário", value: "operador_cartorio" }),
            expect.objectContaining({ label: "Senha", value: "senha_ultra_secreta" }),
          ]),
        }),
      ],
    });
  });

  it("preserva campos de acessos remotos e PostgreSQL intactos sem qualquer interferência", () => {
    const fullStage: EnvironmentStageV2 = {
      ...baseStage,
      postgresVersion: "PostgreSQL 17",
      postgresHost: "192.168.1.200:5432",
      postgresUser: "postgres_admin",
      postgresPassword: "db_password_123",
      remoteAccessList: [
        { system: "AnyDesk", id: "987654321", password: "anydesk_pass" },
        { system: "TeamViewer", id: "123456789", password: "team_pass" },
      ],
    };

    render(
      <EnvironmentStageForm
        stage={fullStage}
        canEditProjects={true}
        onUpdate={vi.fn()}
      />
    );

    // Garante que campos de PostgreSQL continuam visíveis e intactos
    expect(screen.getByDisplayValue("PostgreSQL 17")).toBeInTheDocument();
    expect(screen.getByDisplayValue("192.168.1.200:5432")).toBeInTheDocument();
    expect(screen.getByDisplayValue("postgres_admin")).toBeInTheDocument();
    expect(screen.getByDisplayValue("db_password_123")).toBeInTheDocument();

    // Garante que acessos remotos continuam visíveis e intactos
    expect(screen.getByDisplayValue("987654321")).toBeInTheDocument();
    expect(screen.getByDisplayValue("anydesk_pass")).toBeInTheDocument();
    expect(screen.getByDisplayValue("123456789")).toBeInTheDocument();
    expect(screen.getByDisplayValue("team_pass")).toBeInTheDocument();
  });
});
