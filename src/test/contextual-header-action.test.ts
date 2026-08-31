import { describe, expect, it } from "vitest";
import { getContextualHeaderAction } from "@/components/Layout/contextualHeaderAction";

const allowAll = () => true;

describe("ação contextual do cabeçalho", () => {
  it("não exibe uma ação redundante na página inicial", () => {
    expect(getContextualHeaderAction("/", allowAll)).toBeNull();
  });

  it("volta para a visão geral do módulo em telas internas", () => {
    expect(getContextualHeaderAction("/sd/consulta-horas", allowAll)).toMatchObject({
      label: "Visão geral · SD",
      path: "/sd",
    });
    expect(getContextualHeaderAction("/projects/123", allowAll)).toMatchObject({
      label: "Visão geral · Implantação",
      path: "/implantacao",
    });
  });

  it("oferece a principal tela permitida quando está na visão geral", () => {
    expect(getContextualHeaderAction("/commercial", allowAll)).toMatchObject({
      label: "Painel de Clientes",
      path: "/commercial/customers",
    });

    const onlyManagementReport = (permissionKey?: string) =>
      permissionKey === "menu_sd" || permissionKey === "sd_time_management";
    expect(getContextualHeaderAction("/sd", onlyManagementReport)).toMatchObject({
      label: "Consulta de horas",
      path: "/sd/consulta-horas",
    });
  });

  it("não oferece ação para rotas sem módulo ou sem permissão", () => {
    expect(getContextualHeaderAction("/perfil", allowAll)).toBeNull();
    expect(getContextualHeaderAction("/sd/horas", () => false)).toBeNull();
  });
});
