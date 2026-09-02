import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Info,
  Sparkles,
  BookOpen,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet"; // Wait, let's check standard Sheet imports from @/components/ui/sheet
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getPageHelp } from "@/constants/pageHelpRegistry";

export function PageHelpDrawer() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const helpInfo = getPageHelp(location.pathname);
  const IconComponent = helpInfo.icon || Info;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 rounded-full transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Informações e ajuda desta tela"
              >
                <Info className="h-5 w-5 text-muted-foreground transition-transform hover:scale-110 hover:text-primary" />
                <span className="sr-only">Informações da tela</span>
              </Button>
            </SheetTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="end" className="text-xs font-medium">
            Sobre esta tela (Guia & Ajuda)
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <SheetContent className="flex w-full flex-col sm:max-w-lg p-0 gap-0 border-l border-border/50 bg-background/95 backdrop-blur-xl">
        {/* Cabeçalho do Drawer */}
        <SheetHeader className="p-5 border-b border-border/40 bg-muted/20">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <Badge variant="outline" className="gap-1 px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary border-primary/20">
              <IconComponent className="h-3.5 w-3.5" />
              {helpInfo.moduleName}
            </Badge>

            <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-2 py-0.5 rounded">
              {helpInfo.route}
            </span>
          </div>

          <SheetTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            {helpInfo.title}
          </SheetTitle>
          {helpInfo.subtitle && (
            <SheetDescription className="text-sm text-muted-foreground">
              {helpInfo.subtitle}
            </SheetDescription>
          )}
        </SheetHeader>

        {/* Conteúdo com Abas */}
        <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
          <div className="px-5 pt-3 border-b border-border/30 bg-muted/10">
            <TabsList className="grid w-full grid-cols-2 h-10 p-1 bg-muted/50 overflow-hidden">
              <TabsTrigger value="overview" className="text-xs gap-1.5 font-medium h-full">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Visão Geral
              </TabsTrigger>
              <TabsTrigger value="tutorial" className="text-xs gap-1.5 font-medium h-full">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                Guia Rápido ({helpInfo.steps.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 p-5">
            {/* Aba 1: Visão Geral */}
            <TabsContent value="overview" className="mt-0 space-y-5">
              {/* O que a tela faz */}
              <div className="rounded-xl p-4 bg-card border border-border/50 shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Info className="h-4 w-4" />
                  <span>O que esta tela faz</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {helpInfo.description}
                </p>
              </div>

              {/* Principais Recursos */}
              {helpInfo.keyFeatures && helpInfo.keyFeatures.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    Principais Recursos
                  </h4>
                  <ul className="grid gap-2">
                    {helpInfo.keyFeatures.map((feature, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 text-xs text-foreground bg-muted/30 p-2.5 rounded-lg border border-border/30"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Dicas e Boas Práticas */}
              {helpInfo.tips && helpInfo.tips.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                    Dicas e Boas Práticas
                  </h4>
                  <div className="grid gap-2.5">
                    {helpInfo.tips.map((tip, idx) => {
                      const isWarning = tip.variant === "warning";
                      const isTip = tip.variant === "tip";
                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border text-xs space-y-1 ${
                            isWarning
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
                              : isTip
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                              : "bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-200"
                          }`}
                        >
                          <div className="font-semibold flex items-center gap-1.5">
                            {isWarning ? (
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                            ) : (
                              <Lightbulb className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            )}
                            {tip.title}
                          </div>
                          <p className="opacity-90 leading-normal">{tip.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Atalhos Rápidos Relacionados */}
              {helpInfo.quickLinks && helpInfo.quickLinks.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Atalhos Relacionados
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {helpInfo.quickLinks.map((link, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        onClick={() => {
                          setIsOpen(false);
                          navigate(link.path);
                        }}
                      >
                        {link.label}
                        <ExternalLink className="h-3 w-3 opacity-60" />
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Aba 2: Tutorial Passo a Passo */}
            <TabsContent value="tutorial" className="mt-0 space-y-4">
              <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/40 mb-4">
                Siga o passo a passo abaixo para aproveitar ao máximo os recursos disponíveis nesta tela.
              </div>

              <div className="relative border-l-2 border-primary/20 ml-3.5 pl-6 space-y-6">
                {helpInfo.steps.map((step) => {
                  const StepIcon = step.icon || ArrowRight;
                  return (
                    <div key={step.stepNumber} className="relative group">
                      {/* Indicador de Passo */}
                      <div className="absolute -left-[35px] top-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-md ring-4 ring-background">
                        {step.stepNumber}
                      </div>

                      <div className="rounded-xl p-4 bg-card border border-border/50 shadow-sm space-y-1.5 transition-all hover:border-primary/40">
                        <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                          <StepIcon className="h-4 w-4 text-primary shrink-0" />
                          <span>{step.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Rodapé com Fechamento e Suporte */}
        <div className="p-4 border-t border-border/40 bg-muted/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <HelpCircle className="h-3.5 w-3.5 text-primary" />
            <span>Precisa de mais ajuda? Consulte a equipe TI</span>
          </div>

          <Button variant="secondary" size="sm" className="h-8 text-xs font-medium" onClick={() => setIsOpen(false)}>
            Entendi!
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
