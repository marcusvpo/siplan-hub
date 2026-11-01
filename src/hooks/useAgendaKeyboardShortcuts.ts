import { useEffect } from "react";
import type { AgendaViewMode } from "@/components/agenda/AgendaToolbar";

export interface AgendaKeyboardShortcutsOptions {
  onToday: () => void;
  onViewChange: (view: AgendaViewMode) => void;
  onPrevious: () => void;
  onNext: () => void;
  onNewEntry?: () => void;
  onRefresh: () => void;
  onPrint: () => void;
  onFocusSearch?: () => void;
  canCreate?: boolean;
  disabled?: boolean;
}

/**
 * Hook para controle por atalhos de teclado de alta performance da Agenda Siplan:
 * - 'T': Ir para data de hoje
 * - 'D': Visão Diária
 * - 'W': Visão Semanal
 * - 'M': Visão Mensal
 * - 'ArrowLeft': Período anterior
 * - 'ArrowRight': Próximo período
 * - 'N': Novo agendamento (se tiver permissão)
 * - 'R': Atualizar dados da agenda
 * - 'P': Imprimir / Gerar PDF
 * - '/': Focar na pesquisa
 */
export function useAgendaKeyboardShortcuts({
  onToday,
  onViewChange,
  onPrevious,
  onNext,
  onNewEntry,
  onRefresh,
  onPrint,
  onFocusSearch,
  canCreate = false,
  disabled = false,
}: AgendaKeyboardShortcutsOptions) {
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora atalhos se o foco estiver dentro de campos de entrada ou áreas editáveis
      const target = e.target as HTMLElement | null;
      const isInput = Boolean(
        target &&
        typeof target.getAttribute === "function" &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable ||
          target.getAttribute("role") === "textbox")
      );

      if (isInput) return;

      // Atalhos simples (sem Ctrl, Cmd ou Alt para evitar conflitos de sistema)
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case "t":
            e.preventDefault();
            onToday();
            break;
          case "d":
            e.preventDefault();
            onViewChange("day");
            break;
          case "w":
            e.preventDefault();
            onViewChange("week");
            break;
          case "m":
            e.preventDefault();
            onViewChange("month");
            break;
          case "arrowleft":
            e.preventDefault();
            onPrevious();
            break;
          case "arrowright":
            e.preventDefault();
            onNext();
            break;
          case "/":
            e.preventDefault();
            onFocusSearch?.();
            break;
          case "n":
            if (canCreate && onNewEntry) {
              e.preventDefault();
              onNewEntry();
            }
            break;
          case "r":
            e.preventDefault();
            onRefresh();
            break;
          case "p":
            e.preventDefault();
            onPrint();
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    onToday,
    onViewChange,
    onPrevious,
    onNext,
    onNewEntry,
    onRefresh,
    onPrint,
    onFocusSearch,
    canCreate,
    disabled,
  ]);
}
