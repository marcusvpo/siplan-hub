import { CopilotChat } from "@/components/Copilot/CopilotChat";
import { Sparkles } from "lucide-react";

export default function Copilot() {
  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full">
      {/* Cabecalho */}
      <div className="flex items-center gap-2 py-4 px-1">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold leading-tight">Copiloto Operacional</h1>
          <p className="text-xs text-muted-foreground">Pergunte sobre o portfolio de projetos</p>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <CopilotChat />
      </div>
    </div>
  );
}
