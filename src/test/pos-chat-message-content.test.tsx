import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import {
  PosChatMessageContent,
  isBunnyStreamUrl,
} from "@/components/pos-chat/PosChatMessageContent";
import { isTriageMessage } from "@/pages/public/PublicPosChat";
import { formatBunnyEmbedUrl } from "@/components/pos-chat/BunnyVideoPlayer";

describe("PosChatMessageContent & BunnyVideoPlayer", () => {
  it("correctly identifies Bunny.net stream URLs", () => {
    expect(
      isBunnyStreamUrl("https://iframe.mediadelivery.net/embed/467408/41549f54-b53a-4703-9765-3d5e2c8d221b?t=0")
    ).toBe(true);
    expect(
      isBunnyStreamUrl("https://iframe.mediadelivery.net/embed/467408/8b0225b8-ab00-44a2-a03e-5a3cb3f07f99?t=0")
    ).toBe(true);
    expect(
      isBunnyStreamUrl("https://iframe.mediadelivery.net/embed/467408/bb9395dc-a4e9-4140-92ba-bd8195e75c82?t=0")
    ).toBe(true);
    expect(isBunnyStreamUrl("https://e-notariado.org.br")).toBe(false);
    expect(isBunnyStreamUrl("https://google.com")).toBe(false);
    expect(isBunnyStreamUrl("")).toBe(false);
  });

  it("enforces autoplay=false and preload=true on Bunny embed URLs", () => {
    const formatted = formatBunnyEmbedUrl(
      "https://iframe.mediadelivery.net/embed/467408/bb9395dc-a4e9-4140-92ba-bd8195e75c82?t=0"
    );
    expect(formatted).toContain("autoplay=false");
    expect(formatted).toContain("preload=true");
  });

  it("identifies triage messages vs substantive step-by-step resolution answers", () => {
    const triageMsg = `Olá! Para te ajudar da melhor forma, encontrei as seguintes rotinas no sistema. Por favor, digite o número da opção desejada:

1. D-3.43 - Consultar Protocolos
2. V-6.1.4 - Consulta Avançada de Protocolos com Mais Filtros, Escrevente Assinante e Situações Customizadas
3. V-6.2.3 - Pesquisa Rápida na Barra Superior da Tela de Protocolos em Aberto
4. V-6.1.5 - Operações na Consulta de Protocolos

Se a sua dúvida for outra, fique à vontade para me dar mais detalhes!`;

    expect(isTriageMessage(triageMsg)).toBe(true);
    expect(isTriageMessage(triageMsg, 0)).toBe(true);

    const promptV3TriageMsg = `Ótimo! Para te ajudar a consultar protocolos de notas no Orion TN, selecione uma das rotinas abaixo. Cada opção traz um caminho distinto conforme o que você precisa.

Para te orientar, aqui vão as opções encontradas:

1) ID: D-3.43 — Título: Consultar Protocolos
- Descrição: Origina uma busca avançada de protocolos com múltiplos filtros.
- Vídeo: tem_video: false

2) ID: V-6.1.4 — Título: Consulta Avançada de Protocolos com Mais Filtros
- Descrição: Edição e consulta avançadas na tela de Consulta de Protocolos.

Observação: Esta é a Etapa 1. Não vou fornecer o passo a passo ainda. Diga qual opção deseja (digite 1 ou 2) e eu envio o passo a passo completo correspondente.`;

    expect(isTriageMessage(promptV3TriageMsg)).toBe(true);
    expect(isTriageMessage(promptV3TriageMsg, 0)).toBe(true);

    const resolutionMsg = `R-23.0 - Como Realizar a Distribuição de Produtos no Estoque

Passo a passo:

- 1) Acesse o módulo **Orion Estoque**.
- Vá em **Administração > Distribuição**.
- 2) Na aba "Distribuição", selecione a Categoria e o Produto.
- 3) Após revisar todas as informações, finalize o processo clicando no botão Concluir.

▶️ Assista ao tutorial: [[Aquisição e Distribuição - Orion TN]](https://iframe.mediadelivery.net/embed/467408/bb9395dc-a4e9-4140-92ba-bd8195e75c82?t=0)`;

    expect(isTriageMessage(resolutionMsg, 1)).toBe(false);
  });

  it("intercepts double-bracket video link and renders iframe player without autoplay", () => {
    const markdown = `▶️ Assista ao tutorial: [[Aquisição e Distribuição - Orion TN]](https://iframe.mediadelivery.net/embed/467408/bb9395dc-a4e9-4140-92ba-bd8195e75c82?t=0)`;

    render(<PosChatMessageContent content={markdown} />);

    const iframe = document.querySelector("iframe");
    expect(iframe).toBeInTheDocument();
    expect(iframe?.getAttribute("src")).toContain("autoplay=false");
    expect(iframe?.getAttribute("src")).toContain("https://iframe.mediadelivery.net/embed/467408/bb9395dc-a4e9-4140-92ba-bd8195e75c82");
    expect(screen.getByText(/Aquisição e Distribuição - Orion TN/i)).toBeInTheDocument();
  });

  it("renders complex routine with numbered steps, sub-items and callouts cleanly", () => {
    const markdown = `R-23.0 - Como Realizar a Distribuição de Produtos no Estoque

Passo a passo:

- 1) Acesse o módulo **Orion Estoque**.
- Vá em **Administração > Distribuição**.
- 2) Na aba "Distribuição", selecione a Categoria e o Produto.
- 3) Selecione a série que deseja distribuir.
- 4) No campo Portador, selecione para quem o produto será enviado. É possível direcionar para:
- Usuários individuais
- Grupos de usuários
- Máquinas (estações de trabalho)
- 5) Após revisar todas as informações, finalize o processo clicando no botão Concluir.

Parte 2: Consultar ou Estornar uma Distribuição

- 1) Ainda na tela de Distribuição, acesse a aba "Consulta".
- 2) Filtre pela categoria, produto, data ou portador.
- 3) O sistema mostrará o resultado e permitirá:
- Estornar: Devolver o produto ao estoque principal.
- Andamentos: Exibe o histórico de logs.

Observação importante: as distribuições são registradas para o portador correspondente.`;

    render(<PosChatMessageContent content={markdown} />);

    // Routine Code Badge
    expect(screen.getByText("R-23.0")).toBeInTheDocument();
    expect(screen.getByText(/Como Realizar a Distribuição de Produtos no Estoque/i)).toBeInTheDocument();

    // Section header
    expect(screen.getByText(/Parte 2: Consultar ou Estornar uma Distribuição/i)).toBeInTheDocument();

    // Sub-items
    expect(screen.getByText(/Usuários individuais/i)).toBeInTheDocument();
    expect(screen.getByText(/Grupos de usuários/i)).toBeInTheDocument();
    expect(screen.getByText(/Máquinas \(estações de trabalho\)/i)).toBeInTheDocument();

    // Callout
    expect(screen.getByText(/Observação importante/i)).toBeInTheDocument();
  });

  it("renders Exemplo A (single video) with iframe and markdown elements", () => {
    const markdown = `### **V-7.0.1 - Geração e Qualificação de Partes e Imóveis no Editor**

Passo a passo:
1. Acesse o menu **Notas > Protocolo**.
2. Abra a aba **Partes** e clique no botão **Qualificação**.
3. Verifique os campos destacados em vermelho e utilize o botão **Remesclar**.
4. Clique em **Salvar**.

---
🎬 **Prefere ver na prática?**  
Nós preparamos uma videoaula detalhada mostrando o passo a passo desta rotina no sistema!  
▶️ **Assista ao tutorial:** [Geração de Atos - Editor - Orion TN](https://iframe.mediadelivery.net/embed/467408/41549f54-b53a-4703-9765-3d5e2c8d221b?t=0)

*Ficou com alguma dúvida ao executar? Estou por aqui para te acompanhar!*`;

    render(<PosChatMessageContent content={markdown} />);

    // Check heading badge and text
    expect(screen.getByText("V-7.0.1")).toBeInTheDocument();
    expect(
      screen.getByText(/Geração e Qualificação de Partes e Imóveis no Editor/i)
    ).toBeInTheDocument();

    // Check list items
    expect(screen.getByText(/Acesse o menu/i)).toBeInTheDocument();
    expect(screen.getByText(/Notas > Protocolo/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Qualificação/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Remesclar/i)).toBeInTheDocument();

    // Check video iframe
    const iframe = document.querySelector("iframe");
    expect(iframe).toBeInTheDocument();
    expect(iframe?.getAttribute("src")).toContain("autoplay=false");
    expect(iframe?.getAttribute("src")).toContain("https://iframe.mediadelivery.net/embed/467408/41549f54-b53a-4703-9765-3d5e2c8d221b");
  });

  it("renders Exemplo B (multi-part video) with both iframes stacked", () => {
    const markdown = `### **V-CCA.1.1 - Abertura e Preenchimento do Cartão de Assinatura**

Passo a passo:
1. Acesse **Firmas > Cadastros > Cartão de Assinatura**.

---
🎬 **Prefere ver na prática?**  
Essa rotina conta com uma videoaula em etapas para facilitar seu aprendizado:  
▶️ **Parte 1:** [Cadastro Cartão de Assinatura pt 1 - Orion TN](https://iframe.mediadelivery.net/embed/467408/8b0225b8-ab00-44a2-a03e-5a3cb3f07f99?t=0)  
▶️ **Parte 2:** [Cadastro Cartão de Assinatura pt 2 - Orion TN](https://iframe.mediadelivery.net/embed/467408/76bede7b-b314-4776-9e6f-3af28af1b54d?t=0)  

*Qualquer dúvida durante a execução, é só me chamar!*`;

    render(<PosChatMessageContent content={markdown} />);

    const iframes = document.querySelectorAll("iframe");
    expect(iframes.length).toBe(2);
    expect(iframes[0]?.getAttribute("src")).toContain("autoplay=false");
    expect(iframes[1]?.getAttribute("src")).toContain("autoplay=false");
    expect(iframes[0]?.getAttribute("src")).toContain("https://iframe.mediadelivery.net/embed/467408/8b0225b8-ab00-44a2-a03e-5a3cb3f07f99");
    expect(iframes[1]?.getAttribute("src")).toContain("https://iframe.mediadelivery.net/embed/467408/76bede7b-b314-4776-9e6f-3af28af1b54d");
  });

  it("keeps regular external links as anchor tags opening in new tab", () => {
    const markdown = `Para mais detalhes, consulte o [Portal e-Notariado](https://e-notariado.org.br) e também o [CNJ](https://www.cnj.jus.br).`;

    render(<PosChatMessageContent content={markdown} />);

    // No iframes should be created
    const iframes = document.querySelectorAll("iframe");
    expect(iframes.length).toBe(0);

    // Regular links
    const link1 = screen.getByRole("link", { name: /Portal e-Notariado/i });
    expect(link1).toHaveAttribute("href", "https://e-notariado.org.br");
    expect(link1).toHaveAttribute("target", "_blank");

    const link2 = screen.getByRole("link", { name: /CNJ/i });
    expect(link2).toHaveAttribute("href", "https://www.cnj.jus.br");
    expect(link2).toHaveAttribute("target", "_blank");
  });
});
