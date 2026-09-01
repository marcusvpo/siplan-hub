import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, BookOpen, Calendar, Users, ShieldAlert, Sparkles } from "lucide-react";

export default function TreinamentoPlaceholder() {
  return (
    <div className="container mx-auto w-full min-w-0 max-w-4xl space-y-4 overflow-x-hidden px-0 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:space-y-6" data-testid="implantadores-training-mobile-layout">
      <div className="flex items-center gap-2">
        <Link to="/implantadores">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Voltar ao Painel</span>
      </div>

      <div className="space-y-3 py-7 text-center sm:space-y-4 sm:py-12">
        <div className="mb-1 inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-500 sm:mb-2 sm:p-4">
          <BookOpen className="h-10 w-10 sm:h-12 sm:w-12" />
        </div>
        <h1 className="break-words bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-2xl font-black tracking-tight text-transparent sm:text-3xl">Roteiro de Treinamento</h1>
        <p className="mx-auto max-w-lg break-words text-sm leading-5 text-muted-foreground sm:leading-6">
          Capacitação estruturada de usuários finais por sistema. Planeje e valide o cronograma de treinamento e a evolução operacional de analistas e líderes do projeto.
        </p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
          <Sparkles className="h-3 w-3 animate-pulse" />
          Agendado para F4.5
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3 md:gap-6">
        <Card className="border-muted/50 shadow-md">
          <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-500">
              <Calendar className="h-4 w-4" />
              Cronograma Integrado
            </CardTitle>
          </CardHeader>
          <CardContent className="break-words p-4 pt-0 text-xs leading-relaxed text-muted-foreground sm:p-6 sm:pt-0">
            Organize as datas de início e conclusão de treinamentos de maneira integrada ao calendário geral de implantações do Siplan HUB.
          </CardContent>
        </Card>

        <Card className="border-muted/50 shadow-md">
          <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-500">
              <Users className="h-4 w-4" />
              Verificação de Usuários
            </CardTitle>
          </CardHeader>
          <CardContent className="break-words p-4 pt-0 text-xs leading-relaxed text-muted-foreground sm:p-6 sm:pt-0">
            Cadastre os participantes das capacitações operacionais, audite presenças e registre notas de aproveitamento individual.
          </CardContent>
        </Card>

        <Card className="border-muted/50 shadow-md">
          <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-500">
              <ShieldAlert className="h-4 w-4" />
              Termo de Capacitação
            </CardTitle>
          </CardHeader>
          <CardContent className="break-words p-4 pt-0 text-xs leading-relaxed text-muted-foreground sm:p-6 sm:pt-0">
            Assinatura e emissão de atestados comprovando que o cliente final está apto a utilizar os módulos do sistema após o Go-Live.
          </CardContent>
        </Card>
      </div>

      <div className="rounded-2xl border bg-muted/30 p-4 text-center sm:p-6">
        <p className="text-xs text-muted-foreground">O desenvolvimento desta funcionalidade faz parte do planejamento da etapa F4 (Treinamento e Capacitação). Para obter suporte sobre a liberação antecipada, contate o administrador.</p>
      </div>
    </div>
  );
}
