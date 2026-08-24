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

// Radix Select rola a opção ativa; jsdom não implementa esta API.
Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
  configurable: true,
  value: vi.fn(),
});

// cmdk observa o tamanho da lista de resultados; jsdom não oferece ResizeObserver.
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

Object.defineProperty(globalThis, "ResizeObserver", {
  configurable: true,
  writable: true,
  value: ResizeObserverMock,
});
