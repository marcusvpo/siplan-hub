import type { LucideIcon } from "lucide-react";
import { Construction, DatabaseZap, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface CsCxMigrationPlaceholderProps {
  title: string;
  description: string;
  icon?: LucideIcon;
}

export default function CsCxMigrationPlaceholder({
  title,
  description,
  icon: Icon = Construction,
}: CsCxMigrationPlaceholderProps) {
  return (
    <div className="container mx-auto flex min-h-[65vh] max-w-5xl items-center justify-center p-6">
      <Card className="w-full overflow-hidden border-rose-200/70 shadow-sm dark:border-rose-950/70">
        <div className="h-1.5 bg-gradient-to-r from-rose-500 via-pink-500 to-orange-400" />
        <CardContent className="flex flex-col items-center gap-5 p-10 text-center">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-600 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            <Icon className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <Badge variant="secondary" className="gap-1.5">
              <DatabaseZap className="h-3.5 w-3.5" />
              Migração controlada
            </Badge>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
          <div className="flex max-w-2xl items-start gap-2 rounded-lg border bg-muted/30 p-3 text-left text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              Esta área está sendo reconstruída com validação de paridade. O sistema de produção
              permanece como fonte oficial até a carga incremental e a homologação final.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
