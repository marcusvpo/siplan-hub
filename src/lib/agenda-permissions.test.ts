import { describe, it, expect } from "vitest";
import { canManageAgenda, AGENDA_MANAGER_USER_IDS, AGENDA_MANAGER_EMAILS } from "./agenda-permissions";

describe("agenda-permissions (canManageAgenda)", () => {
  it("deve permitir acesso para role admin", () => {
    expect(canManageAgenda({ role: "admin" })).toBe(true);
    expect(canManageAgenda({ role: "admin", id: "qualquer-id" })).toBe(true);
  });

  it("deve permitir acesso para Maria Santos pelo UUID", () => {
    const mariaId = Array.from(AGENDA_MANAGER_USER_IDS)[0];
    expect(canManageAgenda({ id: mariaId, role: "CS/CX" })).toBe(true);
  });

  it("deve permitir acesso para Lunna Santana pelo UUID", () => {
    const lunnaId = Array.from(AGENDA_MANAGER_USER_IDS)[1];
    expect(canManageAgenda({ id: lunnaId, role: "CS/CX" })).toBe(true);
  });

  it("deve permitir acesso para Maria Santos pelo e-mail", () => {
    expect(canManageAgenda({ email: "maria.santos@siplan.com.br", role: "user" })).toBe(true);
  });

  it("deve permitir acesso para Lunna Santana pelo e-mail", () => {
    expect(canManageAgenda({ email: "lunna.santana@siplan.com.br", role: "user" })).toBe(true);
  });

  it("deve permitir acesso pelo nome aproximado", () => {
    expect(canManageAgenda({ fullName: "Maria Santos da Silva", role: "user" })).toBe(true);
    expect(canManageAgenda({ fullName: "Lunna Santana de Souza", role: "user" })).toBe(true);
  });

  it("deve permitir se hasPermission retornar true para calendar_analysts:manage/create/edit", () => {
    const hasPermManage = (res: string, act: string) => res === "calendar_analysts" && act === "manage";
    const hasPermCreate = (res: string, act: string) => res === "calendar_analysts" && act === "create";
    const hasPermEdit = (res: string, act: string) => res === "calendar_analysts" && act === "edit";
    const hasPermView = (res: string, act: string) => res === "calendar_analysts" && act === "view";

    expect(canManageAgenda({ id: "outro-id", role: "user" }, hasPermManage)).toBe(true);
    expect(canManageAgenda({ id: "outro-id", role: "user" }, hasPermCreate)).toBe(true);
    expect(canManageAgenda({ id: "outro-id", role: "user" }, hasPermEdit)).toBe(true);
    expect(canManageAgenda({ id: "outro-id", role: "user" }, hasPermView)).toBe(false);
  });

  it("deve negar acesso para usuários comuns sem permissões", () => {
    expect(canManageAgenda({ id: "user-comum", role: "user", email: "outro@siplan.com.br" })).toBe(false);
    expect(canManageAgenda(null)).toBe(false);
    expect(canManageAgenda(undefined)).toBe(false);
  });
});
