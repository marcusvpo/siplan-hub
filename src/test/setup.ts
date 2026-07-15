import "@testing-library/jest-dom";
import { vi } from "vitest";

// jsdom não implementa matchMedia, e o tema (use-theme) consulta na renderização.
// Sem isto, qualquer teste que renderize uma página quebra com
// "window.matchMedia is not a function".
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});
