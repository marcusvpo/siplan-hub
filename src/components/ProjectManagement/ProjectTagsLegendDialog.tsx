import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  HelpCircle,
  PlayCircle,
  CheckCircle2,
  Calendar,
  Sparkles,
  Layers,
  Info,
  Clock,
  Tag,
} from "lucide-react";

export function ProjectTagsLegendDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2.5 text-xs gap-1.5 font-semibold text-slate-600 dark:text-slate-300 hover:text-primary hover:border-primary/40 rounded-full border-slate-200 dark:border-slate-700 bg-background/80 shadow-sm transition-all"
          title="Legenda de Tags e Cores"
        >
          <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
          <span>Guia de Tags & Cores</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 flex flex-col gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-3 border-b bg-slate-50/50 dark:bg-slate-900/50 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Guia de Tags e Cores dos Cards
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Entenda o significado de cada tag, indicador visual e cor de status nos projetos ativos.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="p-4 max-h-[calc(85vh-80px)] overflow-y-auto">
          <div className="space-y-5 text-xs">
            {/* Seção 1: Status de Implantação e Agenda */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5 pb-1 border-b border-slate-100 dark:border-slate-800">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                Tags de Status da Implantação (Canto Superior Esquerdo)
              </h4>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-start gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/60">
                  <Badge className="text-[9px] px-2 py-0.5 font-bold bg-blue-600 text-white shrink-0 flex items-center gap-1 mt-0.5">
                    <PlayCircle className="w-2.5 h-2.5" />
                    Implantação em Andamento
                  </Badge>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    A implantação se encontra em andamento atualmente no cliente.
                  </p>
                </div>

                <div className="flex items-start gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/60">
                  <Badge className="text-[9px] px-2 py-0.5 font-bold bg-emerald-600 text-white shrink-0 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Implantação Confirmada
                  </Badge>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    Data já agendada ao implantador e confirmada pelo cliente.
                  </p>
                </div>

                <div className="flex items-start gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/60">
                  <Badge className="text-[9px] px-2 py-0.5 font-bold bg-slate-600 dark:bg-slate-600 text-white shrink-0 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-2.5 h-2.5 text-slate-200" />
                    Previsão Agendada
                  </Badge>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    Data já encaixada na agenda do implantador, porém ainda não confirmada com o cliente.
                  </p>
                </div>
              </div>
            </div>

            {/* Seção 2: Origem e Status Global */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5 pb-1 border-b border-slate-100 dark:border-slate-800">
                <Tag className="w-3.5 h-3.5 text-purple-500" />
                Tags de Origem e Status Global (Canto Superior Direito)
              </h4>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-start gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/60">
                  <Badge className="text-[9px] px-2 py-0.5 font-bold bg-purple-600 text-white shrink-0 mt-0.5">
                    Autom. N8N
                  </Badge>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    Projeto criado via automação puxando dados do chamado no 0800.
                  </p>
                </div>

                <div className="flex items-start gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/60">
                  <Badge className="text-[9px] px-2 py-0.5 font-bold bg-[#0dcaf0] text-white shrink-0 mt-0.5">
                    Projeto Ativo
                  </Badge>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    Projeto que se encontra em execução dentro do fluxo regular de etapas.
                  </p>
                </div>

                <div className="flex items-start gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/60">
                  <Badge className="text-[9px] px-2 py-0.5 font-bold bg-amber-500 text-white shrink-0 mt-0.5">
                    Pausado
                  </Badge>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    Projeto com andamento suspenso temporariamente devido a pendências ou bloqueios.
                  </p>
                </div>

                <div className="flex items-start gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/60">
                  <Badge className="text-[9px] px-2 py-0.5 font-bold bg-slate-700 text-white shrink-0 mt-0.5">
                    Finalizado
                  </Badge>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    Projeto concluído com sucesso em todas as suas fases.
                  </p>
                </div>
              </div>
            </div>

            {/* Seção 3: Saúde do Projeto e Borda Lateral */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5 pb-1 border-b border-slate-100 dark:border-slate-800">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Saúde do Projeto (Barra Lateral Esquerda & Indicador de Saúde)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/60">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 block text-[11px]">Saudável (OK)</span>
                    <span className="text-[10px] text-slate-500">Atualizado recentemente</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/60">
                  <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                  <div>
                    <span className="font-bold text-amber-600 dark:text-amber-400 block text-[11px]">Atenção</span>
                    <span className="text-[10px] text-slate-500">Sem atualização {">"} 3 dias</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/60">
                  <div className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
                  <div>
                    <span className="font-bold text-rose-600 dark:text-rose-400 block text-[11px]">Crítico</span>
                    <span className="text-[10px] text-slate-500">Sem atualização {">"} 7 dias</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Seção 4: Etapas da Pipeline e Cores */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5 pb-1 border-b border-slate-100 dark:border-slate-800">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                Cores dos Status das Etapas no Pipeline (Bolinhas)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/60">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">Concluído</span>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/60">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">Em Andamento</span>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/60">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">Bloqueado</span>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/60">
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">Aguardando Ajuste</span>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/60">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">Não Iniciado (Pendente)</span>
                </div>
              </div>
            </div>

            {/* Seção 5: Metadados Adicionais */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5 pb-1 border-b border-slate-100 dark:border-slate-800">
                <Info className="w-3.5 h-3.5 text-slate-500" />
                Informações Complementares no Card
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/60 space-y-0.5">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                    <Clock className="w-3 h-3 text-primary" />
                    UAT (Última Atualização)
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Data e horário exatos em que a última alteração foi gravada no projeto.
                  </p>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/60 space-y-0.5">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                    <Tag className="w-3 h-3 text-blue-500" />
                    0800: Etapas do Projeto
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Exibe a etapa correspondente vinda da automação com o sistema de chamados do 0800.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
