import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AgendaAnalistas from "./AgendaAnalistas";

describe("Agenda dos Analistas no mobile", () => {
  it("empilha o cabeçalho e mantém o Power BI dentro da largura da página", () => {
    render(<AgendaAnalistas />);

    expect(screen.getByTestId("analyst-agenda-page")).toHaveClass(
      "min-w-0",
      "overflow-x-hidden",
      "md:h-[calc(100vh-8rem)]",
    );
    expect(screen.getByRole("heading", { name: "Agenda dos Analistas" })).toHaveClass(
      "text-xl",
      "sm:text-2xl",
    );
    expect(screen.getByRole("button", { name: "Abrir agenda em tela cheia" })).toHaveClass(
      "w-full",
      "sm:w-auto",
    );
    expect(screen.getByTestId("analyst-agenda-embed")).toHaveClass(
      "min-w-0",
      "overflow-hidden",
    );

    const report = screen.getByTitle("Agenda dos Analistas - Power BI");
    expect(report).toHaveClass("w-full", "min-w-0", "border-0");
    expect(report).toHaveAttribute("allow", "fullscreen");
    expect(report).toHaveAttribute("src", expect.stringContaining("pageView=fitToWidth"));
  });

  it("abre a agenda em um modal que ocupa todo o viewport mobile", () => {
    render(<AgendaAnalistas />);

    fireEvent.click(screen.getByRole("button", { name: "Abrir agenda em tela cheia" }));

    expect(screen.getByTestId("analyst-agenda-fullscreen")).toHaveClass(
      "inset-0",
      "h-[100dvh]",
      "w-screen",
      "max-h-none",
      "rounded-none",
    );
    expect(screen.getByTitle("Agenda dos Analistas - Power BI Tela Cheia")).toHaveClass(
      "h-full",
      "w-full",
      "min-w-0",
    );
  });
});
