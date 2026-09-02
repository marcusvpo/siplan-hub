import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ConversionPostDrawer } from "./ConversionPostDrawer";

vi.mock("@/hooks/useConversionPosts", () => ({
  useConversionPosts: () => ({ posts: [], loading: false }),
}));

vi.mock("@/hooks/useHomologationEvents", () => ({
  useHomologationEvents: () => ({ events: [], loading: false }),
}));

describe("layout do pop-up do feed de conversao", () => {
  it("amplia o modal e mantem as abas sem barras de rolagem", () => {
    render(
      <ConversionPostDrawer
        isOpen
        onClose={vi.fn()}
        projectId="project-1"
        clientName="Cliente de teste"
        ticketNumber="12345"
        queueStatus="in_progress"
        assignedToName="Analista"
      />,
    );

    expect(screen.getByTestId("conversion-feed-dialog")).toHaveClass(
      "max-w-4xl",
      "sm:h-[82dvh]",
      "sm:max-h-[760px]",
      "overflow-hidden",
    );

    expect(screen.getByTestId("conversion-feed-tabs")).toHaveClass(
      "grid",
      "h-auto",
      "overflow-hidden",
      "sm:grid-cols-2",
    );
    expect(screen.getByTestId("conversion-feed-tabs")).not.toHaveClass(
      "overflow-x-auto",
    );
  });
});
