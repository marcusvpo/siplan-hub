import { useState } from "react";
import { CalendarDays, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function AgendaAnalistas() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const powerBiUrl = "https://app.powerbi.com/reportEmbed?reportId=62c9128b-57a1-465d-9058-0518de0ee720&autoAuth=true&ctid=6e43926c-f725-4395-92da-762cce4965a3&config=eyJjbHVzdGVyVXJsIjoiaHR0cHM6Ly93YWJpLXNvdXRoLWNlbnRyYWwtdXMtcmVkaXJlY3QuYW5hbHlzaXMud2luZG93cy5uZXQvIn0%3D&pageView=fitToWidth";

  return (
    <div
      className="flex min-h-[calc(100dvh-5rem)] min-w-0 flex-col gap-4 overflow-x-hidden animate-in fade-in duration-500 sm:gap-6 md:h-[calc(100vh-8rem)] md:min-h-0"
      data-testid="analyst-agenda-page"
    >
      <div className="flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h2 className="flex min-w-0 items-center gap-2 text-xl font-bold leading-tight tracking-tight sm:text-2xl">
            <CalendarDays className="h-5 w-5 shrink-0 text-primary sm:h-6 sm:w-6" />
            Agenda dos Analistas
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            Acompanhamento centralizado de alocações e agendas.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsFullscreen(true)}
          className="w-full shrink-0 gap-2 sm:w-auto"
          aria-label="Abrir agenda em tela cheia"
        >
          <Maximize2 className="h-4 w-4" />
          Ver em Tela Cheia
        </Button>
      </div>

      <div
        className="relative min-h-[28rem] min-w-0 flex-1 overflow-hidden rounded-xl border bg-card shadow-sm sm:min-h-[34rem] md:min-h-0"
        data-testid="analyst-agenda-embed"
      >
        <iframe
          title="Agenda dos Analistas - Power BI"
          src={powerBiUrl}
          allow="fullscreen"
          allowFullScreen
          className="block h-full min-h-[28rem] w-full min-w-0 border-0 sm:min-h-[34rem] md:min-h-0"
        />
      </div>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent
          className="inset-0 left-0 top-0 flex h-[100dvh] max-h-none w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-background p-0 sm:left-[50%] sm:top-[50%] sm:h-[96vh] sm:w-[96vw] sm:max-w-[96vw] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-xl"
          data-testid="analyst-agenda-fullscreen"
        >
          {/* Header acessível oculto para leitores de tela */}
          <div className="sr-only">
            <DialogTitle>Agenda dos Analistas - Tela Cheia</DialogTitle>
            <DialogDescription>Visão expandida do dashboard do Power BI</DialogDescription>
          </div>
          <div className="h-full min-h-0 w-full overflow-hidden pb-[env(safe-area-inset-bottom)] pt-[calc(env(safe-area-inset-top)+3rem)] sm:p-2 sm:pt-12">
            <iframe
              title="Agenda dos Analistas - Power BI Tela Cheia"
              src={powerBiUrl}
              allow="fullscreen"
              allowFullScreen
              className="block h-full min-h-0 w-full min-w-0 border-0 bg-card sm:rounded-md sm:shadow-2xl"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
