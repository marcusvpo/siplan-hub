import { useNavigate } from "react-router-dom";
import { ArrowRight, Bot, Link2, MessageSquareText, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ProjectV2 } from "@/types/ProjectV2";

interface PosAiAssistantSectionProps {
  project: ProjectV2;
}

export function PosAiAssistantSection({ project }: PosAiAssistantSectionProps) {
  const navigate = useNavigate();
  const customFields = (project.customFields || {}) as Record<string, unknown>;
  const configured =
    typeof customFields.pos_assistant_enabled === "boolean" ||
    typeof customFields.pos_assistant_activated_at === "string";
  const isEnabled = customFields.pos_assistant_enabled === true;

  const openCentral = () => {
    const params = new URLSearchParams({ projectId: project.id });
    if (!configured) params.set("new", "1");
    navigate(`/assistentes/links-chats?${params.toString()}`);
  };

  return (
    <Card className="overflow-hidden border-rose-200/80 bg-gradient-to-r from-card via-card to-rose-50/50 shadow-sm dark:border-rose-950/70 dark:to-rose-950/10">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3.5 sm:items-center">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
            <Bot className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold">Assistente com IA Pós-Implantação</h3>
              <Badge
                variant="outline"
                className={
                  isEnabled
                    ? "border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
                    : "border-rose-200 bg-rose-50 text-[10px] text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
                }
              >
                <Sparkles className="mr-1 h-3 w-3" />
                {isEnabled ? "Link ativo" : configured ? "Acesso encerrado" : "Não configurado"}
              </Badge>
            </div>
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
              Links, acessos e conversas agora são administrados em uma central única no menu Assistentes.
            </p>
            {configured && (
              <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><Link2 className="h-3 w-3" />Link do cliente</span>
                <span className="flex items-center gap-1"><MessageSquareText className="h-3 w-3" />Histórico centralizado</span>
              </div>
            )}
          </div>
        </div>

        <Button type="button" onClick={openCentral} className="shrink-0 gap-2 bg-rose-600 text-xs text-white hover:bg-rose-700">
          {configured ? "Abrir Links e Chats" : "Gerar link"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
