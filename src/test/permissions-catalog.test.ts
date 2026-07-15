import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { menuItems } from "@/constants/menuItems";
import {
  PERMISSION_CATEGORY_ORDER,
  PERMISSION_RESOURCES,
  getResourceCategory,
  getResourceLabel,
} from "@/constants/permissions";

const catalogResources = new Set(PERMISSION_RESOURCES.map((r) => r.resource));
const catalogPairs = new Set(
  PERMISSION_RESOURCES.flatMap((r) => r.actions.map((a) => `${r.resource}:${a}`)),
);

const SRC = resolve(__dirname, "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

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

  // hasPermission com par inexistente é sempre-falso: trava a tela para todo
  // mundo que não é admin, silenciosamente. Só pega chamadas com literais.
  it("todo hasPermission(<literal>, <literal>) usa par existente no catálogo", () => {
    const call = /hasPermission\(\s*["']([a-z_]+)["']\s*,\s*["']([a-z_]+)["']\s*\)/g;
    const unknown: string[] = [];

    for (const file of sourceFiles(SRC)) {
      const code = readFileSync(file, "utf8");
      for (const [, resource, action] of code.matchAll(call)) {
        const pair = `${resource}:${action}`;
        if (!catalogPairs.has(pair)) {
          unknown.push(`${file.replace(SRC, "src")} → ${pair}`);
        }
      }
    }

    expect(unknown, "pares fora do catálogo").toEqual([]);
  });
});
