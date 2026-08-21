import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@/components/theme-provider";
import { PosChatThemeMenu } from "@/components/pos-chat/PosChatThemeMenu";

const storageKey = "pos-chat-theme-test";

describe("seletor de tema do chat pós-implantação", () => {
  beforeEach(() => {
    localStorage.removeItem(storageKey);
    document.documentElement.classList.remove("light", "dark");
  });

  afterEach(() => {
    localStorage.removeItem(storageKey);
    document.documentElement.classList.remove("light", "dark");
  });

  it("permite escolher o tema escuro e salva a preferência", async () => {
    render(
      <ThemeProvider defaultTheme="light" storageKey={storageKey}>
        <PosChatThemeMenu />
      </ThemeProvider>,
    );

    fireEvent.keyDown(
      screen.getByRole("button", { name: "Escolher tema da conversa" }),
      { key: "Enter", code: "Enter" },
    );
    fireEvent.click(await screen.findByRole("menuitemradio", { name: "Escuro" }));

    await waitFor(() => {
      expect(document.documentElement).toHaveClass("dark");
      expect(localStorage.getItem(storageKey)).toBe("dark");
    });
  });

  it("reaplica o tema claro salvo anteriormente", async () => {
    localStorage.setItem(storageKey, "light");

    render(
      <ThemeProvider defaultTheme="dark" storageKey={storageKey}>
        <PosChatThemeMenu />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement).toHaveClass("light");
    });
  });
});
