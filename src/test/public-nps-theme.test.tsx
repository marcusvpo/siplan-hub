import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PublicNpsResponse from "@/pages/public/PublicNpsResponse";

const token = "4f7bd865-ec4a-4d81-94ac-a81551aac007";

describe("tema da pesquisa pública NPS", () => {
  afterEach(() => vi.restoreAllMocks());

  it("aplica a identidade visual congelada no convite", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "PENDENTE",
          office_name: "Cartório Central",
          recipient_name: "Maria",
          questionnaire: {
            title: "Pesquisa Azul",
            description: "Conte como foi sua experiência.",
            questions: [
              {
                id: "score",
                type: "nps",
                semantic_key: "score",
                title: "Quanto você recomenda a Siplan?",
                required: true,
              },
            ],
            theme: {
              primary_color: "#2563EB",
              background_color: "#EFF6FF",
              background_image_path:
                "themes/4f7bd865-ec4a-4d81-94ac-a81551aac007.webp",
              background_overlay: 55,
            },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/nps/responder/${token}`]}>
          <Routes>
            <Route
              path="/nps/responder/:token"
              element={<PublicNpsResponse />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Pesquisa Azul")).toBeInTheDocument();
    const shell = screen.getByTestId("nps-public-shell");
    expect(shell.style.getPropertyValue("--nps-primary")).toBe("#2563EB");
    expect(
      screen.getByTestId("nps-background-image").style.backgroundImage,
    ).toContain(
      "/storage/v1/object/public/cs-cx-nps-assets/themes/4f7bd865-ec4a-4d81-94ac-a81551aac007.webp",
    );
  });
});
