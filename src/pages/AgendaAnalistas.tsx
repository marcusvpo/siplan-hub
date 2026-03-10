import { CalendarDays } from "lucide-react";

export default function AgendaAnalistas() {
  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] animate-in fade-in duration-500 flex flex-col">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" />
          Agenda dos Analistas
        </h2>
        <p className="text-muted-foreground">
          Acompanhamento centralizado de alocações e agendas.
        </p>
      </div>

      <div className="flex-1 bg-card rounded-xl border shadow-sm overflow-hidden">
        <iframe
          title="Agenda dos Analistas - Power BI"
          width="100%"
          height="100%"
          src="https://app.powerbi.com/reportEmbed?reportId=62c9128b-57a1-465d-9058-0518de0ee720&autoAuth=true&ctid=6e43926c-f725-4395-92da-762cce4965a3&config=eyJjbHVzdGVyVXJsIjoiaHR0cHM6Ly93YWJpLXNvdXRoLWNlbnRyYWwtdXMtcmVkaXJlY3QuYW5hbHlzaXMud2luZG93cy5uZXQvIn0%3D"
          frameBorder="0"
          allowFullScreen={true}
          className="w-full h-full"
        ></iframe>
      </div>
    </div>
  );
}
