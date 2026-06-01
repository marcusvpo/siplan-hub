import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, BookOpen, Calendar, Users, ShieldAlert, Sparkles } from "lucide-react";

export default function TreinamentoPlaceholder() {
  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-2">
        <Link to="/implantadores">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Voltar ao Painel</span>
      </div>

      <div className="text-center py-12 space-y-4">
        <div className="inline-flex p-4 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mb-2">
          <BookOpen className="h-12 w-12" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-foreground bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
          Roteiro de Treinamento
        </h1>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Capacitação estruturada de usuários finais por sistema. Planeje e valide o cronograma de treinamento
          e a evolução operacional de analistas e líderes do projeto.
        </p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
          <Sparkles className="h-3 w-3 animate-pulse" />
          Agendado para F4.5
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-muted/50 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-500">
              <Calendar className="h-4 w-4" />
              Cronograma Integrado
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed">
            Organize as datas de início e conclusão de treinamentos de maneira integrada ao calendário geral de implantações do Siplan HUB.
          </CardContent>
        </Card>

        <Card className="border-muted/50 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-500">
              <Users className="h-4 w-4" />
              Verificação de Usuários
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed">
            Cadastre os participantes das capacitações operacionais, audite presenças e registre notas de aproveitamento individual.
          </CardContent>
        </Card>

        <Card className="border-muted/50 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-500">
              <ShieldAlert className="h-4 w-4" />
              Termo de Capacitação
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed">
            Assinatura e emissão de atestados comprovando que o cliente final está apto a utilizar os módulos do sistema após o Go-Live.
          </CardContent>
        </Card>
      </div>

      <div className="bg-muted/30 border rounded-2xl p-6 text-center">
        <p className="text-xs text-muted-foreground">
          O desenvolvimento desta funcionalidade faz parte do planejamento da etapa F4 (Treinamento e Capacitação).
          Para obter suporte sobre a liberação antecipada, contate o administrador.
        </p>
      </div>
    </div>
  );
}
