import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCopilot } from "@/hooks/useCopilot";
import { CopilotChat } from "./CopilotChat";
import { Sparkles } from "lucide-react";

const WIDTH_KEY = "copilot-panel-width";
const MIN_WIDTH = 360;
const DEFAULT_WIDTH = 448; // ~28rem (max-w-md)

// Largura maxima = 95% da viewport (evita cobrir a tela toda).
const maxWidth = () => Math.round(window.innerWidth * 0.95);
const clamp = (w: number) => Math.max(MIN_WIDTH, Math.min(w, maxWidth()));

/**
 * Botao flutuante (FAB) do Copiloto, presente em todas as telas do app.
 * Abre o chat num painel lateral REDIMENSIONAVEL (arraste a borda esquerda).
 * So aparece para usuarios habilitados e fica oculto na propria pagina /copilot.
 */
export function FloatingCopilot() {
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState<number>(() => {
    const saved = Number(localStorage.getItem(WIDTH_KEY));
    return saved && saved >= MIN_WIDTH ? saved : DEFAULT_WIDTH;
  });
  const [dragging, setDragging] = useState(false);
  const location = useLocation();
  const { hasAccess } = useCopilot();

  // Arraste da borda esquerda: o painel esta ancorado a direita, entao a largura
  // e (largura da viewport - posicao X do cursor).
  const onDragMove = useCallback((e: MouseEvent) => {
    setWidth(clamp(window.innerWidth - e.clientX));
  }, []);

  const onDragEnd = useCallback(() => {
    setDragging(false);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    window.addEventListener("mousemove", onDragMove);
    window.addEventListener("mouseup", onDragEnd);
    return () => {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", onDragMove);
      window.removeEventListener("mouseup", onDragEnd);
    };
  }, [dragging, onDragMove, onDragEnd]);

  // Persiste a largura escolhida ao terminar o arraste.
  useEffect(() => {
    if (!dragging) localStorage.setItem(WIDTH_KEY, String(width));
  }, [dragging, width]);

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
          style={{ width, maxWidth: "95vw" }}
          className="w-full sm:max-w-none p-0 flex flex-col gap-0"
        >
          {/* Handle de redimensionamento (borda esquerda) */}
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDoubleClick={() => setWidth(DEFAULT_WIDTH)}
            className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize z-50 group hidden sm:block"
            title="Arraste para redimensionar (duplo clique para o padrao)"
          >
            <div className="h-full w-full bg-transparent group-hover:bg-primary/40 transition-colors" />
          </div>

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
