import { describe, expect, it } from "vitest";
import { canAccessCsCxRecord } from "@/hooks/useCsCxRecordPermissions";

describe("CS/CX record ownership permissions", () => {
  it("permite a ação base sobre um lançamento próprio", () => {
    expect(canAccessCsCxRecord(true, "user-a", "user-a", false)).toBe(true);
  });

  it("exige a permissão adicional para um lançamento de outro usuário", () => {
    expect(canAccessCsCxRecord(true, "user-b", "user-a", false)).toBe(false);
    expect(canAccessCsCxRecord(true, "user-b", "user-a", true)).toBe(true);
  });

  it("não substitui a permissão base de editar ou excluir", () => {
    expect(canAccessCsCxRecord(false, "user-b", "user-a", true)).toBe(false);
  });

  it("reconhece um responsavel adicional como dono do escopo", () => {
    expect(
      canAccessCsCxRecord(
        true,
        "user-a",
        "user-b",
        false,
        ["user-b", "user-c"],
      ),
    ).toBe(true);
  });

  it("trata registros sem autor como registros de terceiros", () => {
    expect(canAccessCsCxRecord(true, null, "user-a", false)).toBe(false);
    expect(canAccessCsCxRecord(true, null, "user-a", true)).toBe(true);
  });
});
