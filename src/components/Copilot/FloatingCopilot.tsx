import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCopilot } from "@/hooks/useCopilot";
import { CopilotChat } from "./CopilotChat";
import { Sparkles } from "lucide-react";

/**
 * Botao flutuante (FAB) do Copiloto, presente em todas as telas do app.
 * Abre o chat num painel lateral. So aparece para usuarios habilitados e fica
 * oculto na propria pagina /copilot (onde o chat ja esta em tela cheia).
 */
export function FloatingCopilot() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { hasAccess } = useCopilot();

  if (!hasAccess || location.pathname === "/copilot") return null;

  return (
    <>
      {/* FAB */}
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg shadow-primary/30 hover:scale-105 transition-transform"
        title="Copiloto Operacional"
        aria-label="Abrir Copiloto"
      >
        <Sparkles className="h-6 w-6" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md p-0 flex flex-col gap-0"
        >
          {/* Cabecalho (o X de fechar e o padrao do SheetContent, no canto) */}
          <div className="flex items-center gap-2 border-b px-4 h-16 shrink-0 pr-12">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-sm leading-tight">Copiloto Operacional</SheetTitle>
              <SheetDescription className="text-[11px]">Pergunte sobre o portfolio</SheetDescription>
            </div>
          </div>

          {/* Chat */}
          <div className="flex-1 min-h-0 p-3">
            <CopilotChat />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
