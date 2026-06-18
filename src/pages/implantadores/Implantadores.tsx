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
      title: "Análise de Aderência",
      description: "Customize o formulário dinâmico de aderência (gaps de produto e riscos) para cada tipo de sistema ou consulte respostas finalizadas.",
      icon: CheckCircle2,
      color: "from-amber-500 to-orange-600",
      textColor: "text-orange-500",
      bgLight: "bg-orange-500/10",
      borderLight: "border-orange-500/20",
      requiresPermission: true,
      actions: [
        {
          label: "Editor Form. Aderência",
          link: "/implantadores/aderencia",
          variant: "outline" as const,
          customColor: "border-rose-500/30 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/40 dark:hover:bg-rose-500/15 shadow-sm",
        },
        {
          label: "Aderências Finalizadas",
          link: "/implantadores/aderencia/finalizadas",
          variant: "outline" as const,
          customColor: "border-rose-500/30 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/40 dark:hover:bg-rose-500/15 shadow-sm",
        }
      ]
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
      highlighted: true,
      badge: "Importante",
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-6xl">
      {/* Upper Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-indigo-50/60 via-slate-50 to-amber-50/50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-8 md:p-10 shadow-md dark:shadow-2xl transition-all duration-300">
        <div className="absolute right-0 top-0 bottom-0 opacity-40 dark:opacity-10 flex items-center pr-10 pointer-events-none">
          <Layers className="h-64 w-64 text-indigo-500/20 dark:text-slate-100" />
        </div>
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-primary/20 border border-indigo-100 dark:border-primary/30 text-indigo-600 dark:text-primary text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5" />
            Módulo de Implantadores
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
            Gestão Operacional de Implantações
          </h1>
          <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
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
              className={`group shadow-lg relative overflow-hidden transition-all duration-300 ${
                isDisabled 
                  ? "opacity-60" 
                  : card.highlighted
                    ? "border-rose-500/30 dark:border-rose-500/20 bg-gradient-to-br from-card via-card to-rose-500/5 shadow-rose-500/5 hover:shadow-xl hover:shadow-rose-500/10 hover:border-rose-500/50 hover:-translate-y-0.5"
                    : "border-muted/60 hover:shadow-xl hover:border-primary/20 hover:-translate-y-0.5"
              }`}
            >
              {/* Colored top line */}
              <div className={`w-full bg-gradient-to-r ${card.color} ${card.highlighted ? "h-2.5" : "h-1.5"}`} />
              
              <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className={`text-lg font-bold transition-colors ${
                      card.highlighted ? "group-hover:text-rose-500" : "group-hover:text-primary"
                    }`}>
                      {card.title}
                    </CardTitle>
                    {card.badge && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        card.highlighted
                          ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                          : "bg-primary/10 text-primary border border-primary/20"
                      }`}>
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
                ) : card.actions ? (
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    {card.actions.map((act, actIdx) => (
                      <Link key={actIdx} to={act.link} className="w-full sm:w-auto">
                        <Button 
                          variant={act.variant} 
                          size="sm" 
                          className={`w-full gap-1 text-xs font-semibold ${
                            act.customColor 
                              ? act.customColor 
                              : "group-hover:text-primary group-hover:bg-primary/5"
                          }`}
                        >
                          {act.label}
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </Link>
                    ))}
                  </div>
                ) : card.link ? (
                  <Link to={card.link} className="w-full sm:w-auto">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={`w-full gap-1 text-xs font-semibold ${
                        card.highlighted
                          ? "group-hover:text-rose-500 group-hover:bg-rose-500/5"
                          : "group-hover:text-primary group-hover:bg-primary/5"
                      }`}
                    >
                      Acessar Área
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                ) : null}
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
