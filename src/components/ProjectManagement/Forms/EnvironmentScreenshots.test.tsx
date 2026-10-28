import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EnvironmentScreenshots } from "./EnvironmentScreenshots";

describe("EnvironmentScreenshots", () => {
  it("inicia a galeria expandida", () => {
    render(
      <EnvironmentScreenshots
        projectId="project-1"
        screenshots={[]}
        onChange={() => undefined}
        canEdit
      />,
    );

    expect(screen.getByText("Galeria de Imagens")).toBeVisible();
    expect(screen.getByText("Nenhum print anexado. Arraste imagens para cá.")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Adicionar prints" }),
    ).toBeVisible();
  });
});
