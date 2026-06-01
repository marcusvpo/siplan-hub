import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { CheckCircle2, ClipboardList, BookOpen, FileText, ArrowRight, ShieldCheck, Cog, Layers } from "lucide-react";

export default function Implantadores() {
  const { hasPermission } = usePermissions();
  const canManageTemplates = hasPermission("templates", "manage");

  const cards = [
    {
      title: "Editor de Form. Aderência",
      description: "Customize o formulário dinâmico de aderência (gaps de produto e riscos) para cada tipo de sistema.",
      icon: CheckCircle2,
      link: "/implantadores/aderencia",
      color: "from-amber-500 to-orange-600",
      textColor: "text-orange-500",
      bgLight: "bg-orange-500/10",
      borderLight: "border-orange-500/20",
      requiresPermission: true,
    },
    {
      title: "Editor de Checklist de Homologação",
      description: "Edite o roteiro de homologação contendo regras e validações necessárias para conversão de dados.",
      icon: ClipboardList,
      link: "/implantadores/homologacao",
      color: "from-indigo-500 to-blue-600",
      textColor: "text-indigo-500",
      bgLight: "bg-indigo-500/10",
      borderLight: "border-indigo-500/20",
      requiresPermission: true,
    },
    {
      title: "Roteiro de Treinamento",
      description: "Roteiros de capacitação operacional e cronograma de treinamento de usuários por sistema.",
      icon: BookOpen,
      link: "/implantadores/treinamento",
      color: "from-emerald-500 to-teal-600",
      textColor: "text-emerald-500",
      bgLight: "bg-emerald-500/10",
      borderLight: "border-emerald-500/20",
      requiresPermission: false,
      badge: "F4.5",
    },
    {
      title: "Documento de Transição",
      description: "Elabore e emita o documento de transição do projeto para a equipe de pós-implantação/suporte.",
      icon: FileText,
      link: "/implantadores/transicao",
      color: "from-rose-500 to-red-600",
      textColor: "text-rose-500",
      bgLight: "bg-rose-500/10",
      borderLight: "border-rose-500/20",
      requiresPermission: false,
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-6xl">
      {/* Upper Banner */}
      <div className="relative rounded-2xl overflow-hidden border bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 text-white p-8 md:p-10 shadow-2xl">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-10">
          <Layers className="h-64 w-64 text-slate-100" />
        </div>
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5" />
            Módulo de Implantadores
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Gestão Operacional de Implantações
          </h1>
          <p className="text-sm md:text-base text-slate-400 leading-relaxed">
            Painel consolidado para gerenciar e customizar formulários de aderência, checklists de homologação,
            capacitações e documentos de transição operacional de sistemas.
          </p>
        </div>
      </div>

      {/* Grid of options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card, idx) => {
          const isDisabled = card.requiresPermission && !canManageTemplates;

          return (
            <Card 
              key={idx} 
              className={`group shadow-lg border-muted/60 relative overflow-hidden transition-all duration-300 ${
                isDisabled ? "opacity-60" : "hover:shadow-xl hover:border-primary/20 hover:-translate-y-0.5"
              }`}
            >
              {/* Colored top line */}
              <div className={`h-1.5 w-full bg-gradient-to-r ${card.color}`} />
              
              <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                      {card.title}
                    </CardTitle>
                    {card.badge && (
                      <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 font-bold px-2 py-0.5 rounded-full">
                        {card.badge}
                      </span>
                    )}
                  </div>
                  <CardDescription className="text-xs pt-1.5 leading-relaxed">
                    {card.description}
                  </CardDescription>
                </div>
                <div className={`p-3.5 rounded-xl border ${card.bgLight} ${card.borderLight} ${card.textColor} shrink-0`}>
                  <card.icon className="h-6 w-6" />
                </div>
              </CardHeader>

              <CardContent className="pt-2 flex justify-end">
                {isDisabled ? (
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium py-2">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Requer permissão de Admin
                  </div>
                ) : (
                  <Link to={card.link} className="w-full sm:w-auto">
                    <Button variant="ghost" size="sm" className="w-full gap-1 text-xs font-semibold group-hover:text-primary group-hover:bg-primary/5">
                      Acessar Área
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Footer / System Status */}
      {canManageTemplates && (
        <div className="rounded-xl border bg-muted/30 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Cog className="h-5 w-5 animate-spin-slow" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">Permissões de Gerenciamento Ativas</h4>
              <p className="text-xs text-muted-foreground">Você possui autorização para criar, publicar e desativar templates de formulários.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
