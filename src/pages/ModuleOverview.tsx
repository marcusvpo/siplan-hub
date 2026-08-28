import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, LayoutDashboard, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { menuItems } from "@/constants/menuItems";
import { usePermissions } from "@/hooks/usePermissions";

export type ModuleOverviewName =
  | "Dashboard"
  | "Implantação"
  | "Calendário"
  | "Comercial"
  | "Conversão"
  | "Modelos Editor OrionTN"
  | "Implantadores"
  | "CS/CX"
  | "Assistentes";

interface ModuleOverviewProps {
  moduleName: ModuleOverviewName;
}

export default function ModuleOverview({ moduleName }: ModuleOverviewProps) {
  const { hasPermission, isAdmin } = usePermissions();
  const shouldReduceMotion = useReducedMotion();
  const module = menuItems.find((item) => item.title === moduleName);

  if (!module) return null;

  const ModuleIcon = module.icon;
  const visibleAreas = (module.subItems ?? []).filter(
    (area) =>
      area.path !== module.path &&
      (isAdmin || !area.permissionKey || hasPermission(area.permissionKey, "view")),
  );

  return (
    <div className="container mx-auto h-full max-w-7xl space-y-5 overflow-y-auto px-1 pb-4 pt-1 md:px-3 md:pb-6">
      <section className="relative overflow-hidden rounded-xl border border-rose-200/70 bg-gradient-to-br from-rose-50 via-background to-slate-50 px-5 py-4 shadow-sm dark:border-rose-950/70 dark:from-rose-950/20 dark:via-background dark:to-slate-950 md:px-6 md:py-5">
        <motion.div
          aria-hidden="true"
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.94, y: 6 }}
          animate={
            shouldReduceMotion
              ? { opacity: 1, scale: 1, y: 0 }
              : { opacity: 1, scale: 1, y: [0, -4, 0] }
          }
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : {
                  opacity: { duration: 0.6, ease: "easeOut" },
                  scale: { duration: 0.7, ease: "easeOut" },
                  y: {
                    delay: 0.7,
                    duration: 6,
                    ease: "easeInOut",
                    repeat: Infinity,
                  },
                }
          }
          className="pointer-events-none absolute -bottom-10 -right-6 h-40 w-40 text-rose-500/10"
        >
          <ModuleIcon className="h-full w-full" />
        </motion.div>
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { delay: 0.08, duration: 0.5, ease: "easeOut" }
          }
          className="relative z-10 max-w-3xl space-y-2.5"
        >
          <Badge
            variant="outline"
            className="gap-1.5 border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Central do módulo
          </Badge>
          <div>
            <h1 className="text-2xl font-black tracking-tight md:text-3xl">{module.title}</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              {module.description}
            </p>
          </div>
        </motion.div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-bold">Áreas do módulo</h2>
          <p className="text-sm text-muted-foreground">
            Acesse as telas disponíveis para o seu perfil.
          </p>
        </div>

        {visibleAreas.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleAreas.map((area, index) => {
              const AreaIcon = area.icon;

              return (
                <motion.div
                  key={area.path}
                  layout={!shouldReduceMotion}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={
                    shouldReduceMotion
                      ? { duration: 0 }
                      : { delay: index * 0.05 }
                  }
                  className="h-full"
                >
                  <Link to={area.path} className="group block h-full">
                    <Card className="flex h-full flex-col border-muted/70 transition-all group-hover:-translate-y-0.5 group-hover:border-rose-300 group-hover:shadow-md dark:group-hover:border-rose-900">
                      <CardHeader className="flex-row items-start gap-3 space-y-0 p-4 pb-2">
                        <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-rose-600 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                          <AreaIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base leading-5">{area.title}</CardTitle>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {area.description}
                          </p>
                        </div>
                      </CardHeader>
                      <CardContent className="mt-auto flex items-center justify-end gap-1 px-4 pb-3 pt-1 text-xs font-semibold text-rose-600 dark:text-rose-300">
                        Acessar
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
              <LayoutDashboard className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium">Nenhuma área disponível para o seu perfil.</p>
              <p className="text-sm text-muted-foreground">
                Solicite ao administrador a permissão para uma das telas deste módulo.
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
