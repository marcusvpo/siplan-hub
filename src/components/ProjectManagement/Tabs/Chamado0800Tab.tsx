import { ProjectV2 } from "@/types/ProjectV2";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, GitMerge, User, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Chamado0800TabProps {
  project: ProjectV2;
}

export function Chamado0800Tab({ project }: Chamado0800TabProps) {
  // Configurando cores bonitas e modernas para o perfil
  const avatarFallback = project.ResponsavelAtividade 
    ? project.ResponsavelAtividade.substring(0, 2).toUpperCase() 
    : "NA";

  return (
    <div className="space-y-6 pt-4 max-w-4xl mx-auto">
      {/* Profile Header Card */}
      <Card className="overflow-hidden border-none shadow-md bg-card/60 backdrop-blur-sm">
        <div className="h-12 md:h-16 bg-primary w-full relative">
          <div className="absolute inset-0 bg-black/10"></div>
          {/* Badge for Etapa */}
          {project.EtapasProjeto && (
             <div className="absolute top-1/2 -translate-y-1/2 right-4 z-10">
               <Badge className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-md shadow-sm h-7 px-3 flex items-center gap-1.5 transition-all">
                 <GitMerge className="w-3.5 h-3.5" />
                 {project.EtapasProjeto}
               </Badge>
             </div>
          )}
        </div>
        
        <div className="px-6 md:px-8 py-6 relative">
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground/90">
                {project.TituloChamado || "Chamado sem título"}
              </h2>
              <div className="text-muted-foreground flex items-center gap-2 font-medium mt-1">
                <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded-md border border-border/50 text-sm shadow-sm opacity-90">
                  <User className="h-3.5 w-3.5 text-primary/70" />
                  {project.ResponsavelAtividade || "Sem responsável"}
                </span>
                <span className="text-xs text-muted-foreground/60">•</span>
                <span className="flex items-center gap-1 shadow-sm px-2 py-0.5 rounded-md border border-border/50 text-sm bg-muted/40">
                  <span className="font-mono bg-foreground/5 dark:bg-foreground/10 px-1 rounded text-xs opacity-75">
                    #{project.ticketNumber}
                  </span>
                </span>
              </div>
            </div>

            <p className="text-sm md:text-base text-muted-foreground/90 leading-relaxed max-w-3xl">
              Dados atualizados pela automação do 0800. A etapa atual determina a fila e as prioridades no fluxo.
            </p>
          </div>
        </div>
      </Card>

      {/* Timeline/Feed Area */}
      <h3 className="tracking-tight text-lg font-bold flex items-center gap-2 opacity-90 pl-1 mt-8 mb-4">
        <MessageSquare className="w-5 h-5 text-indigo-500" /> Histórico de Integração
      </h3>

      <div className="space-y-6">
        {project.descricaotramite ? (
          <Card className="hover:shadow-lg transition-all border-l-4 border-l-indigo-500 group bg-card/80">
            <CardHeader className="pb-3 flex flex-row items-center gap-3">
              <Avatar className="w-10 h-10 border shadow-sm group-hover:ring-2 group-hover:ring-indigo-500/30 transition-all">
                <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold">08</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <CardTitle className="text-base font-semibold text-foreground/90">
                  Último Trâmite
                </CardTitle>
                <CardDescription className="flex items-center gap-1.5 text-xs">
                  <CalendarDays className="w-3.5 h-3.5" /> 
                  Sincronizado {format(new Date(), "dd 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR })}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div 
                className="p-4 bg-muted/30 rounded-lg border border-border/50 text-sm md:text-base text-foreground/80 leading-relaxed overflow-auto max-h-[500px] [&_div]:!text-current [&_span]:!text-current [&_p]:!text-current"
                dangerouslySetInnerHTML={{ __html: project.descricaotramite }}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl bg-muted/30 border border-dashed border-border/60">
            <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-foreground/80 mb-1">Nenhum trâmite registrado</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Quando a automação atualizar este chamado com uma descrição de trâmite, ela aparecerá aqui como um post.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
