import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CsCxMultiSelect } from "@/components/cs-cx/CsCxMultiSelect";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

const options = Array.from({ length: 20 }, (_, index) => ({
  value: `office-${index + 1}`,
  label: `Cartorio ${index + 1}`,
}));

describe("CsCxMultiSelect", () => {
  it("permite usar a roda do mouse na lista dentro de um modal", async () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Novo contato</DialogTitle>
          <DialogDescription>Selecione os cartorios.</DialogDescription>
          <CsCxMultiSelect
            ariaLabel="Cartorios do contato"
            options={options}
            values={[]}
            onChange={vi.fn()}
          />
        </DialogContent>
      </Dialog>,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "Cartorios do contato" }));
    const lastOption = await screen.findByText("Cartorio 20");
    const list = lastOption.closest("[cmdk-list]");
    expect(list).not.toBeNull();
    Object.defineProperties(list, {
      clientHeight: { configurable: true, value: 300 },
      scrollHeight: { configurable: true, value: 600 },
      scrollTop: { configurable: true, value: 0, writable: true },
    });

    await waitFor(() => {
      expect(fireEvent.wheel(lastOption, { deltaY: 120 })).toBe(true);
    });
  });
});
