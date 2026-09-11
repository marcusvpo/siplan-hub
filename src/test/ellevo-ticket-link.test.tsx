import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EllevoTicketLink } from "@/components/EllevoTicketLink";
import { buildEllevoTicketUrl, normalizeEllevoTicketNumber } from "@/lib/ellevo-ticket";

describe("EllevoTicketLink", () => {
  it("constroi o endereco do historico usando somente o numero do chamado", () => {
    expect(buildEllevoTicketUrl(756812)).toBe(
      "https://sac.siplancontrolm.com.br/indexAtendente.html#/main/paginaurl/Historico.asp/Sol=756812",
    );
    expect(buildEllevoTicketUrl(" #756782 ")).toBe(
      "https://sac.siplancontrolm.com.br/indexAtendente.html#/main/paginaurl/Historico.asp/Sol=756782",
    );
    expect(normalizeEllevoTicketNumber("chamado sem número")).toBeNull();
  });

  it("abre o Ellevo em nova aba com protecoes para links externos", () => {
    render(<EllevoTicketLink ticketNumber="747990" />);

    const link = screen.getByRole("link", { name: /abrir o chamado #747990/i });
    expect(link).toHaveAttribute(
      "href",
      "https://sac.siplancontrolm.com.br/indexAtendente.html#/main/paginaurl/Historico.asp/Sol=747990",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("preserva o clique do componente pai e nao cria link para valor invalido", () => {
    const parentClick = vi.fn();
    const { rerender } = render(
      <div onClick={parentClick}>
        <EllevoTicketLink ticketNumber="756812" />
      </div>,
    );

    fireEvent.click(screen.getByRole("link"));
    expect(parentClick).not.toHaveBeenCalled();

    rerender(<EllevoTicketLink ticketNumber="Sem Número">Sem número</EllevoTicketLink>);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Sem número")).toBeInTheDocument();
  });
});
