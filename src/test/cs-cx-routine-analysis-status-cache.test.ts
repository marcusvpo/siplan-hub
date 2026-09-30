import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isMissingSetRegistryOfficeAnalysisStatusRpc,
  updateRegistryOfficeAnalysisStatusCache,
} from "@/hooks/useCsCxCore";

const hook = readFileSync(resolve(process.cwd(), "src/hooks/useCsCxCore.ts"), "utf8");

describe("CS/CX routine analysis status cache", () => {
  it("updates only the confirmed registry office without mutating cached entries", () => {
    const firstOffice = { id: "office-1", is_analyzed: false, name: "Cartório Central" };
    const secondOffice = { id: "office-2", is_analyzed: true, name: "Cartório Norte" };
    const offices = [firstOffice, secondOffice];

    const updated = updateRegistryOfficeAnalysisStatusCache(offices, {
      id: "office-1",
      is_analyzed: true,
    });

    expect(updated).toEqual([
      { id: "office-1", is_analyzed: true, name: "Cartório Central" },
      secondOffice,
    ]);
    expect(updated).not.toBe(offices);
    expect(updated?.[0]).not.toBe(firstOffice);
    expect(updated?.[1]).toBe(secondOffice);
    expect(firstOffice.is_analyzed).toBe(false);
  });

  it("preserves the cache when no effective status change exists", () => {
    const offices = [{ id: "office-1", is_analyzed: true }];

    expect(
      updateRegistryOfficeAnalysisStatusCache(offices, {
        id: "office-1",
        is_analyzed: true,
      }),
    ).toBe(offices);
    expect(
      updateRegistryOfficeAnalysisStatusCache(offices, {
        id: "missing-office",
        is_analyzed: false,
      }),
    ).toBe(offices);
    expect(
      updateRegistryOfficeAnalysisStatusCache(undefined, {
        id: "office-1",
        is_analyzed: false,
      }),
    ).toBeUndefined();
  });

  it("recognizes only the missing analysis status RPC in the schema cache", () => {
    expect(
      isMissingSetRegistryOfficeAnalysisStatusRpc({
        code: "PGRST202",
        message:
          "Could not find the function public.cs_cx_set_registry_office_analysis_status(p_is_analyzed, p_registry_office_id) in the schema cache",
      }),
    ).toBe(true);

    expect(
      isMissingSetRegistryOfficeAnalysisStatusRpc({
        code: "PGRST202",
        message: "Could not find another_function in the schema cache",
      }),
    ).toBe(false);
    expect(
      isMissingSetRegistryOfficeAnalysisStatusRpc({
        code: "42501",
        message: "permission denied for cs_cx_set_registry_office_analysis_status",
      }),
    ).toBe(false);
    expect(
      isMissingSetRegistryOfficeAnalysisStatusRpc({
        code: "PGRST202",
        message: "cs_cx_set_registry_office_analysis_status failed",
      }),
    ).toBe(false);
  });

  it("reports the pending RPC without an unsafe table fallback and caches only success", () => {
    const mutationStart = hook.indexOf("const toggleOfficeAnalyzed = useMutation");
    const mutationEnd = hook.indexOf("  return {", mutationStart);
    const mutation = hook.slice(mutationStart, mutationEnd);

    expect(mutation).toContain('db.rpc("cs_cx_set_registry_office_analysis_status", {');
    expect(mutation).toContain("p_registry_office_id: input.id");
    expect(mutation).toContain("p_is_analyzed: input.is_analyzed");
    expect(mutation).toContain("if (isMissingSetRegistryOfficeAnalysisStatusRpc(error))");
    expect(mutation).toContain(
      "A atualização do status de análise ainda não está disponível no banco.",
    );
    expect(mutation).toContain("throw error");
    expect(mutation).not.toContain('.from("cs_cx_registry_offices")');
    expect(mutation).not.toContain("onMutate");

    const successIndex = mutation.indexOf("onSuccess: (input)");
    const cacheIndex = mutation.indexOf("queryClient.setQueryData<CsCxRegistryOffice[]>");
    const invalidateIndex = mutation.indexOf("invalidateCore(queryClient)");
    expect(successIndex).toBeGreaterThan(-1);
    expect(cacheIndex).toBeGreaterThan(successIndex);
    expect(invalidateIndex).toBeGreaterThan(cacheIndex);
    expect(hook).toContain(
      'const REGISTRY_OFFICES_QUERY_KEY = ["cs-cx", "registry-offices"] as const;',
    );
    expect(mutation).toContain("REGISTRY_OFFICES_QUERY_KEY");
    expect(mutation).toContain("updateRegistryOfficeAnalysisStatusCache(offices, input)");
    expect(hook).toContain('queryClient.invalidateQueries({ queryKey: ["cs-cx"] })');
  });
});
