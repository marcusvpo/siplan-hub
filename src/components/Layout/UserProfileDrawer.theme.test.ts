import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("tema do perfil do usuario", () => {
  it("usa uma superficie semantica neutra no pop-up", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/Layout/UserProfileDrawer.tsx"),
      "utf8",
    );

    expect(source).toContain(
      "border-border bg-popover text-popover-foreground",
    );
    expect(source).not.toContain("dark:bg-slate-900");
  });
});
