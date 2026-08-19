import { useEffect, useState } from "react";
import { BookOpenText, Plus, Search, Settings2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { SolutionDetails } from "@/components/sd/SolutionDetails";
import { SolutionForm } from "@/components/sd/SolutionForm";
import { SolutionsSearch } from "@/components/sd/SolutionsSearch";
import { SystemsManager } from "@/components/sd/SystemsManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/hooks/usePermissions";
import type { SdSolucao } from "@/types/sd";

type SolutionsTab = "search" | "create" | "manage";

export default function Solutions() {
  const { hasPermission } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<SolutionsTab>("search");
  const [editingSolution, setEditingSolution] = useState<SdSolucao | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const selectedId = searchParams.get("solucao");
  const canCreate = hasPermission("sd_solutions", "create");
  const canManage = hasPermission("sd_solutions", "manage");

  useEffect(() => {
    if (tab === "create" && !canCreate && !editingSolution) setTab("search");
    if (tab === "manage" && !canManage) setTab("search");
  }, [canCreate, canManage, editingSolution, tab]);

  const setSelectedId = (id: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set("solucao", id);
    else next.delete("solucao");
    setSearchParams(next, { replace: true });
  };

  const handleTabChange = (value: string) => {
    setEditingSolution(null);
    setTab(value as SolutionsTab);
  };

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto w-full max-w-7xl space-y-5 px-4 pb-4 pt-3 sm:px-6 sm:pb-6 sm:pt-4 lg:px-8 lg:pb-8">
        <div className="overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-5 shadow-sm sm:px-6 sm:py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <BookOpenText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">SD</p>
              <h1 className="mt-0.5 text-2xl font-bold tracking-tight">Soluções</h1>
              <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
                Consulte e compartilhe procedimentos técnicos usados pela equipe de suporte.
              </p>
            </div>
          </div>
        </div>

        <Tabs value={tab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl bg-muted/60 p-1 sm:w-auto">
            <TabsTrigger value="search" className="gap-2 px-4 py-2">
              <Search className="h-4 w-4" />
              Buscar
            </TabsTrigger>
            {(canCreate || editingSolution) && (
              <TabsTrigger value="create" className="gap-2 px-4 py-2">
                <Plus className="h-4 w-4" />
                {editingSolution ? "Editar" : "Cadastrar"}
              </TabsTrigger>
            )}
            {canManage && (
              <TabsTrigger value="manage" className="gap-2 px-4 py-2">
                <Settings2 className="h-4 w-4" />
                Sistemas e rotinas
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="search" className="mt-0">
            <SolutionsSearch
              refreshKey={refreshKey}
              onOpen={(solution) => setSelectedId(solution.id)}
            />
          </TabsContent>

          <TabsContent value="create" className="mt-0">
            <SolutionForm
              solution={editingSolution}
              onSaved={() => {
                setEditingSolution(null);
                setRefreshKey((current) => current + 1);
                setTab("search");
              }}
              onCancelEdit={() => {
                setEditingSolution(null);
                setTab("search");
              }}
            />
          </TabsContent>

          <TabsContent value="manage" className="mt-0">
            <SystemsManager />
          </TabsContent>
        </Tabs>
      </div>

      <SolutionDetails
        solutionId={selectedId}
        onClose={() => setSelectedId(null)}
        onEdit={(solution) => {
          setSelectedId(null);
          setEditingSolution(solution);
          setTab("create");
        }}
        onDeleted={() => setRefreshKey((current) => current + 1)}
      />
    </div>
  );
}
