import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { SearchableClientSelect } from "@/components/Admin/SearchableClientSelect";
import { paginateItems } from "@/lib/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

describe("seletor pesquisavel de clientes", () => {
  it("mantem a roda do mouse dentro da lista quando usado em um modal", async () => {
    const parentWheel = vi.fn();
    const options = Array.from({ length: 20 }, (_, index) => ({
      value: `client-${index + 1}`,
      label: `Cliente ${index + 1}`,
    }));

    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Gerar novo link</DialogTitle>
          <DialogDescription>Selecione um cliente.</DialogDescription>
          <div onWheel={parentWheel}>
            <SearchableClientSelect
              value=""
              options={options}
              placeholder="Selecione um cliente"
              onValueChange={vi.fn()}
            />
          </div>
        </DialogContent>
      </Dialog>,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "Selecione um cliente" }));
    const lastOption = await screen.findByText("Cliente 20");

    expect(fireEvent.wheel(lastOption, { deltaY: 120 })).toBe(true);
    expect(parentWheel).not.toHaveBeenCalled();
  });

  it("permite usar um nome digitado que ainda nao existe no catalogo", async () => {
    const onValueChange = vi.fn();

    render(
      <SearchableClientSelect
        value=""
        options={[{ value: "Cliente Existente", label: "Cliente Existente" }]}
        placeholder="Selecione ou digite um cliente"
        searchPlaceholder="Buscar na base de clientes..."
        allowCustomValue
        onValueChange={onValueChange}
      />,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "Selecione ou digite um cliente" }));
    fireEvent.change(screen.getByPlaceholderText("Buscar na base de clientes..."), {
      target: { value: "Nova Serventia" },
    });
    fireEvent.click(await screen.findByText("Usar “Nova Serventia”"));

    expect(onValueChange).toHaveBeenCalledWith("Nova Serventia");
  });
});

describe("paginacao das conversas", () => {
  it("retorna somente os itens da pagina solicitada", () => {
    const result = paginateItems(Array.from({ length: 12 }, (_, index) => index + 1), 2, 5);

    expect(result.items).toEqual([6, 7, 8, 9, 10]);
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(3);
    expect(result.firstItem).toBe(6);
    expect(result.lastItem).toBe(10);
  });

  it("ajusta a pagina quando a quantidade filtrada diminui", () => {
    const result = paginateItems(Array.from({ length: 12 }, (_, index) => index + 1), 9, 5);

    expect(result.items).toEqual([11, 12]);
    expect(result.page).toBe(3);
    expect(result.totalPages).toBe(3);
  });
});
