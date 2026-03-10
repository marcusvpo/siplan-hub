import { useState } from "react";
import { CalendarDays, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function AgendaAnalistas() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const powerBiUrl = "https://app.powerbi.com/reportEmbed?reportId=62c9128b-57a1-465d-9058-0518de0ee720&autoAuth=true&ctid=6e43926c-f725-4395-92da-762cce4965a3&config=eyJjbHVzdGVyVXJsIjoiaHR0cHM6Ly93YWJpLXNvdXRoLWNlbnRyYWwtdXMtcmVkaXJlY3QuYW5hbHlzaXMud2luZG93cy5uZXQvIn0%3D";

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] animate-in fade-in duration-500 flex flex-col">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Agenda dos Analistas
          </h2>
          <p className="text-muted-foreground">
            Acompanhamento centralizado de alocações e agendas.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setIsFullscreen(true)}
          className="gap-2"
        >
          <Maximize2 className="h-4 w-4" />
          Ver em Tela Cheia
        </Button>
      </div>

      <div className="flex-1 bg-card rounded-xl border shadow-sm overflow-hidden">
        <iframe
          title="Agenda dos Analistas - Power BI"
          width="100%"
          height="100%"
          src={powerBiUrl}
          frameBorder="0"
          allowFullScreen={true}
          className="w-full h-full"
        ></iframe>
      </div>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[98vw] w-full max-h-[98vh] h-full p-0 flex flex-col overflow-hidden border-none bg-background/95 backdrop-blur-sm">
           {/* Header accessível oculto para leitores de tela */}
          <div className="sr-only">
             <DialogTitle>Agenda dos Analistas - Tela Cheia</DialogTitle>
             <DialogDescription>Visão expandida do dashboard do Power BI</DialogDescription>
          </div>
          <div className="w-full flex justify-end p-2 bg-muted/20 absolute top-0 right-0 z-10 pointer-events-none">
             {/* O DialogContent do shadcn já tem um botão de X padrao que aparece no canto, vamos usar ele mesmo para fechar */}
          </div>
          <div className="flex-1 w-full h-full pt-8 pb-2 px-2">
            <iframe
              title="Agenda dos Analistas - Power BI Tela Cheia"
              width="100%"
              height="100%"
              src={powerBiUrl}
              frameBorder="0"
              allowFullScreen={true}
              className="w-full h-full rounded-md shadow-2xl"
            ></iframe>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
