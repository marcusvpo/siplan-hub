import { describe, expect, it } from "vitest";
// @ts-expect-error O utilitário operacional é JavaScript ESM e não publica tipos.
import { csvCell, matchLegacyUsers } from "../../scripts/lib/cs-cx-user-matching.mjs";

const profiles = [
  { id: "p1", email: "ana@siplan.com.br", full_name: "Ana Souza" },
  { id: "p2", email: "bruno@siplan.com.br", full_name: "Bruno Lima" },
  { id: "p3", email: "duplicado@siplan.com.br", full_name: "Pessoa Um" },
  { id: "p4", email: "duplicado@siplan.com.br", full_name: "Pessoa Dois" },
  { id: "p5", email: null, full_name: "Nome Repetido" },
  { id: "p6", email: null, full_name: "Nome Repetido" },
];

describe("casamento de usuários legados CS/CX", () => {
  it("prioriza um e-mail exato e único", () => {
    const [match] = matchLegacyUsers([
      { id: 10, username: "ana", email: " ANA@SIPLAN.COM.BR ", nome_completo: "Outro Nome", ativo: true },
    ], profiles);

    expect(match).toMatchObject({ status: "exact_email", profile_id: "p1" });
  });

  it("sugere nome normalizado somente quando ele é único", () => {
    const [match] = matchLegacyUsers([
      { id: 11, username: "bruno", email: null, nome_completo: "  Brúno   Lima ", ativo: true },
    ], profiles);

    expect(match).toMatchObject({ status: "suggested_name", profile_id: "p2" });
  });

  it("não escolhe automaticamente entre e-mails ou nomes duplicados", () => {
    const result = matchLegacyUsers([
      { id: 12, username: "duplicado", email: "duplicado@siplan.com.br", nome_completo: "Pessoa Um", ativo: true },
      { id: 13, username: "repetido", email: null, nome_completo: "Nome Repetido", ativo: true },
    ], profiles);

    expect(result.map((match: { status: string }) => match.status)).toEqual(["ambiguous", "ambiguous"]);
    expect(result[0].profile_id).toBe("p3|p4");
    expect(result[1].profile_id).toBe("p5|p6");
  });

  it("marca ausência de candidato e escapa o CSV", () => {
    const [match] = matchLegacyUsers([
      { id: 14, username: "sem", email: "sem@siplan.com.br", nome_completo: "Sem Perfil", ativo: false },
    ], profiles);

    expect(match).toMatchObject({ status: "unmatched", profile_id: "" });
    expect(csvCell('Bruno "B"')).toBe('"Bruno ""B"""');
  });
});
