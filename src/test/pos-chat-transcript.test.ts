import { describe, expect, it } from "vitest";
import { formatPosChatTranscript } from "@/hooks/usePosAiChat";

describe("exportação do histórico do chat", () => {
  it("gera um arquivo textual com contexto, autores e conteúdo", () => {
    const transcript = formatPosChatTranscript(
      [
        {
          id: "1",
          role: "user",
          content: "Como consultar protocolos?",
          created_at: "2026-08-21T10:00:00.000Z",
        },
        {
          id: "2",
          role: "assistant",
          content: "Acesse Notas > Protocolos.",
          created_at: "2026-08-21T10:00:10.000Z",
        },
      ],
      {
        title: "Consulta de protocolos",
        clientName: "Cartório Central",
        systemType: "Orion TN",
      },
    );

    expect(transcript).toContain("Consulta de protocolos");
    expect(transcript).toContain("Cliente: Cartório Central");
    expect(transcript).toContain("Sistema: Orion TN");
    expect(transcript).toContain("CLIENTE —");
    expect(transcript).toContain("Como consultar protocolos?");
    expect(transcript).toContain("ASSISTENTE —");
    expect(transcript).toContain("Acesse Notas > Protocolos.");
  });
});
