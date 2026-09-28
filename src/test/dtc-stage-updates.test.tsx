import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAutoSave } from "@/hooks/useAutoSave";
import type { EnvironmentStageV2, PostStageV2, ProjectUpdate, ProjectV2 } from "@/types/ProjectV2";
import { buildDtcPostStage, buildDtcStageUpdates, type DtcStageFields } from "@/utils/dtc-stage-updates";
import { transformToDB } from "@/utils/project-transformers";

const startDate = new Date("2026-09-01T12:00:00Z");
const endDate = new Date("2026-09-15T12:00:00Z");
const followupDate = new Date("2026-10-01T12:00:00Z");

function stages(): ProjectV2["stages"] {
  return {
    infra: { status: "done", workstationsCount: 10 },
    adherence: { status: "done", hasProductGap: false, analysisComplete: true },
    environment: {
      status: "done",
      responsible: "Equipe de Infraestrutura",
      approvedByInfra: true,
      testAvailable: true,
      startDate,
      endDate,
      observations: "Ambiente revisado",
      version: "06.03.03",
      soLogin: "operador",
      soPassword: "senha-de-teste",
      postgresHost: "servidor.local",
      postgresUser: "postgres",
      postgresPassword: "senha-postgres-de-teste",
      postgresVersion: "16",
      osType: "Windows",
      osVersion: "Server 2022",
      osCredentials: [{ id: "os-1", osType: "Linux", login: "suporte", password: "outra-senha-de-teste" }],
      remoteAccessList: [{ system: "AnyDesk", id: "123456" }],
      screenshots: [{ path: "project/ambiente.webp", name: "Ambiente" }],
    },
    conversion: { status: "done", recordCount: 1234 },
    implementation: { status: "done", phase1: { status: "done" }, phase2: { status: "done" } },
    post: {
      status: "in-progress",
      responsible: "Analista anterior",
      startDate,
      endDate,
      followupNeeded: true,
      followupDate,
      supportPeriodDays: 30,
      supportEndDate: followupDate,
      recommendations: "Retorno mensal",
      observations: "Acompanhar estabilidade",
    },
  };
}

const draft: DtcStageFields = { status: "draft", analystResponsible: "Analista do DTC" };

describe("gravação dos estágios pelo DTC", () => {
  it.each([
    ["draft", "in-progress"],
    ["submitted", "waiting_adjustment"],
    ["approved", "done"],
  ] as const)("mapeia %s sem apagar acompanhamento, datas e observações", (status, expectedStatus) => {
    const previous = stages().post;
    const updated = buildDtcPostStage(previous, { ...draft, status });

    expect(updated).toEqual({ ...previous, status: expectedStatus, responsible: "Analista do DTC" });
    expect(previous.status).toBe("in-progress");
    expect(previous.responsible).toBe("Analista anterior");
  });

  it("cria os campos obrigatórios quando ainda não existem estágios e aplica o responsável do projeto", () => {
    const updated = buildDtcStageUpdates({}, { status: "submitted", analystResponsible: "" }, "Responsável do projeto");
    const post: PostStageV2 = updated.post;
    const environment: EnvironmentStageV2 = updated.environment;

    expect(post).toEqual({ status: "waiting_adjustment", responsible: "Responsável do projeto", followupNeeded: false });
    expect(environment).toEqual({ status: "todo", approvedByInfra: false, testAvailable: false });
  });

  it("mantém acessos omitidos no formulário, flags aprovadas e datas do ambiente", () => {
    const previous = stages();
    const updated = buildDtcStageUpdates(previous, draft);

    expect(updated.environment).toEqual(previous.environment);
    expect(updated.post.followupNeeded).toBe(true);
    expect(Object.keys(updated).sort()).toEqual(["environment", "post"]);
  });

  it("permite alterar credenciais e limpar valores explicitamente sem perder os demais dados", () => {
    const previous = stages();
    const updated = buildDtcStageUpdates(previous, {
      ...draft,
      soLogin: "novo-operador",
      soPassword: "",
      remoteAccessList: [],
      postgresUser: "novo-usuario",
    });

    expect(updated.environment).toEqual({
      ...previous.environment,
      soLogin: "novo-operador",
      soPassword: "",
      remoteAccessList: [],
      postgresUser: "novo-usuario",
    });
    expect(previous.environment.soLogin).toBe("operador");
    expect(previous.environment.remoteAccessList).toHaveLength(1);
  });

  it("gera um patch de banco que mantém acompanhamento e acessos sem incluir estágios não alterados", () => {
    const patch: ProjectUpdate = { stages: buildDtcStageUpdates(stages(), { ...draft, status: "approved" }) };
    const row = transformToDB(patch);

    expect(row).toMatchObject({
      post_status: "done",
      post_followup_needed: true,
      post_followup_date: followupDate.toISOString(),
      post_start_date: startDate.toISOString(),
      post_end_date: endDate.toISOString(),
      post_support_period_days: 30,
      post_recommendations: "Retorno mensal",
      environment_status: "done",
      environment_start_date: startDate.toISOString(),
      environment_end_date: endDate.toISOString(),
      environment_test_available: true,
      environment_approved_by_infra: true,
      custom_fields: {
        environment_so_login: "operador",
        environment_so_password: "senha-de-teste",
        environment_postgres_host: "servidor.local",
        environment_postgres_password: "senha-postgres-de-teste",
        environment_os_credentials: stages().environment.osCredentials,
        environment_remote_access_list: stages().environment.remoteAccessList,
      },
    });
    expect(Object.keys(row).some(key => /^(infra|adherence|conversion|implementation|modelos_editor)_/.test(key))).toBe(false);
  });

  it("a alteração imediata de status preserva o pós-implantação sem escrever campos do ambiente", () => {
    const previous = stages();
    const patch: ProjectUpdate = { stages: { post: buildDtcPostStage(previous.post, { ...draft, status: "submitted" }) } };
    const row = transformToDB(patch);

    expect(row).toMatchObject({ post_status: "waiting_adjustment", post_followup_needed: true, post_followup_date: followupDate.toISOString() });
    expect(Object.keys(row).some(key => key.startsWith("environment_"))).toBe(false);
    expect(row).not.toHaveProperty("custom_fields");
  });
});

describe("edição local e autosave do DTC", () => {
  afterEach(() => vi.useRealTimers());

  it("recebe alterações funcionais pelo setData e salva os últimos campos após o debounce", async () => {
    vi.useFakeTimers();
    const previous = stages();
    const save = vi.fn(async (data: DtcStageFields | null) => {
      if (!data) return;
      return buildDtcStageUpdates(previous, data);
    });
    const { result } = renderHook(() => useAutoSave<DtcStageFields | null>(draft, async data => { await save(data); }, { debounceMs: 1000 }));

    act(() => result.current.setData(value => value ? { ...value, status: "submitted" } : value));
    act(() => result.current.setData(value => value ? { ...value, soLogin: "novo-operador" } : value));
    expect(result.current.data).toEqual({ ...draft, status: "submitted", soLogin: "novo-operador" });
    expect(save).not.toHaveBeenCalled();

    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(save).toHaveBeenCalledOnce();
    const saved = await save.mock.results[0].value;
    expect(saved?.post).toMatchObject({ status: "waiting_adjustment", followupNeeded: true, followupDate });
    expect(saved?.environment).toMatchObject({ soLogin: "novo-operador", soPassword: "senha-de-teste", approvedByInfra: true, testAvailable: true });
    expect(result.current.saveState.status).toBe("success");
  });

  it("sincroniza o DTC após carregar o projeto sem disparar gravação por conta da consulta", async () => {
    vi.useFakeTimers();
    const save = vi.fn();
    const { result, rerender } = renderHook(
      ({ initial }: { initial: DtcStageFields | null }) => useAutoSave(initial, save, { debounceMs: 1000 }),
      { initialProps: { initial: null } },
    );

    act(() => result.current.setData(value => value ? { ...value, status: "submitted" } : value));
    expect(result.current.data).toBeNull();
    rerender({ initial: draft });
    expect(result.current.data).toEqual(draft);
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(save).not.toHaveBeenCalled();
  });
});
