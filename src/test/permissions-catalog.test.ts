import { describe, it, expect } from "vitest";
import { menuItems } from "@/constants/menuItems";
import {
  PERMISSION_CATEGORY_ORDER,
  PERMISSION_RESOURCES,
  getResourceCategory,
  getResourceLabel,
} from "@/constants/permissions";

const catalogResources = new Set(PERMISSION_RESOURCES.map((r) => r.resource));

describe("catálogo de permissões", () => {
  it("não repete recursos", () => {
    expect(catalogResources.size).toBe(PERMISSION_RESOURCES.length);
  });

  it("dá pelo menos uma ação para cada recurso", () => {
    for (const r of PERMISSION_RESOURCES) {
      expect(r.actions.length, `${r.resource} sem ações`).toBeGreaterThan(0);
    }
  });

  it("usa apenas categorias declaradas na ordem de exibição", () => {
    for (const r of PERMISSION_RESOURCES) {
      expect(PERMISSION_CATEGORY_ORDER, `${r.resource}`).toContain(r.category);
    }
  });

  it("cataloga toda permissionKey usada no menu", () => {
    const keys: string[] = [];
    for (const item of menuItems) {
      if (item.permissionKey) keys.push(item.permissionKey);
      for (const sub of item.subItems ?? []) {
        if (sub.permissionKey) keys.push(sub.permissionKey);
      }
    }

    const missing = keys.filter((k) => !catalogResources.has(k));
    expect(missing, "chaves de menu fora do catálogo").toEqual([]);
  });

  it("dá ação 'view' a todo recurso ligado a um item de menu", () => {
    const byResource = new Map(PERMISSION_RESOURCES.map((r) => [r.resource, r]));
    for (const item of menuItems) {
      for (const sub of item.subItems ?? []) {
        if (!sub.permissionKey) continue;
        const def = byResource.get(sub.permissionKey);
        expect(def?.actions, `${sub.permissionKey} (${sub.path})`).toContain("view");
      }
    }
  });

  it("cai em 'Outros' para recurso desconhecido, sem quebrar", () => {
    expect(getResourceCategory("recurso_inexistente")).toBe("Outros");
    expect(getResourceLabel("recurso_inexistente")).toBe("recurso_inexistente");
  });
});
