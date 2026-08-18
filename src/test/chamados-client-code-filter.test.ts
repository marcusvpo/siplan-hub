import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("filtro estavel de clientes na Consulta de Chamados", () => {
  it("envia o codigo do cliente ao pedido de sincronizacao", () => {
    const hook = readSource("src/hooks/useChamados0800.ts");

    expect(hook).toContain("clientCodes?: string[] | null");
    expect(hook).toContain("client_codes: filters.clientCodes ?? []");
    expect(hook).toContain('q = q.in("codigo_cliente", clientCodes)');
  });

  it("faz o worker priorizar codigo e manter nome como fallback", () => {
    const worker = readSource("vm-worker/src/chamadosSync.ts");
    const codeFilter = worker.indexOf("filters.client_codes && filters.client_codes.length > 0");
    const nameFallback = worker.indexOf("else if (filters.client_names && filters.client_names.length > 0)");

    expect(codeFilter).toBeGreaterThan(-1);
    expect(nameFallback).toBeGreaterThan(codeFilter);
    expect(worker).toContain("LTRIM(RTRIM(codigoCliente))");
  });

  it("mantem aliases no filtro para workers ainda nao atualizados", () => {
    const page = readSource("src/pages/DeploymentsTickets.tsx");

    expect(page).toContain("selectedClientFilterNames");
    expect(page).toContain("option ? [option.nomeCliente, ...option.aliases] : [client]");
    expect(page).toContain("clientCodes: selectedClientCodes.length > 0");
  });
});
