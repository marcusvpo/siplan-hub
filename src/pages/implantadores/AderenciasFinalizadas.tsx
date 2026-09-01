import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ClipboardCheck, Eye, Printer, RefreshCw, Trash2, ArrowLeft, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { ProjectFormResponse } from "@/hooks/useProjectFormResponse";
import { useIsMobile } from "@/hooks/use-mobile";

interface CompletedFormWithProject extends Omit<ProjectFormResponse, "projects"> {
  projects: {
    client_name: string;
    ticket_number: string | null;
    system_type: string;
  } | null;
}

export default function AderenciasFinalizadas() {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const isMobile = useIsMobile();
  const canDeleteAderencias = hasPermission("implantadores_aderencia_finalizadas", "delete");
  const [completedForms, setCompletedForms] = useState<CompletedFormWithProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);

  const loadCompletedForms = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch profiles to map IDs to names
      const { data: profilesData, error: profilesError } = await supabase.from("profiles").select("id, full_name");

      if (profilesError) throw profilesError;

      const profileMap: Record<string, string> = {};
      profilesData?.forEach((p) => {
        profileMap[p.id] = p.full_name;
      });
      setProfiles(profileMap);

      const { data, error } = await supabase
        .from("project_form_responses")
        .select(
          `
          id,
          project_id,
          status,
          updated_at,
          data,
          filled_by,
          approved_by,
          projects (
            client_name,
            ticket_number,
            system_type
          )
        `,
        )
        .eq("stage", "adherence")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setCompletedForms((data as CompletedFormWithProject[]) || []);
    } catch (err) {
      console.error("Error loading completed forms:", err);
      toast({
        title: "Erro ao carregar biblioteca",
        description: err instanceof Error ? err.message : "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCompletedForms();
  }, [loadCompletedForms]);

  const handleDeleteForm = async (formId: string) => {
    // defesa: sem permissao de exclusao nao remove
    if (!canDeleteAderencias) return;

    if (!window.confirm("Deseja realmente excluir esta resposta de formulário? O status de aderência do projeto correspondente será resetado.")) {
      return;
    }

    try {
      const { error } = await supabase.from("project_form_responses").delete().eq("id", formId);

      if (error) throw error;

      toast({
        title: "Formulário excluído",
        description: "A resposta do formulário foi removida com sucesso.",
        className: "bg-green-500 text-white border-green-600",
      });

      // Reload the list
      loadCompletedForms();
    } catch (err) {
      console.error("Error deleting form:", err);
      toast({
        title: "Erro ao excluir formulário",
        description: err instanceof Error ? err.message : "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  };

  // Filter completed forms based on search query
  const filteredForms = completedForms.filter((form) => {
    const proj = form.projects;
    if (!proj) return false;

    const query = searchQuery.toLowerCase();
    const matchesClient = proj.client_name.toLowerCase().includes(query);
    const matchesSystem = proj.system_type.toLowerCase().includes(query);
    const matchesTicket = proj.ticket_number ? proj.ticket_number.includes(query) : false;

    const filledByName = form.filled_by ? (profiles[form.filled_by] || "").toLowerCase() : "";
    const approvedByName = form.approved_by ? (profiles[form.approved_by] || "").toLowerCase() : "";
    const matchesResponsible = filledByName.includes(query) || approvedByName.includes(query);

    return matchesClient || matchesSystem || matchesTicket || matchesResponsible;
  });

  const pageSize = isMobile ? 3 : 8;
  const totalPages = Math.max(1, Math.ceil(filteredForms.length / pageSize));
  const paginatedForms = filteredForms.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  return (
    <div
      className="container mx-auto w-full min-w-0 max-w-5xl space-y-4 overflow-x-hidden px-0 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:space-y-6 animate-in fade-in duration-300"
      data-testid="implantadores-adherence-finished-mobile-layout"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-3.5 min-w-0 flex-wrap">
        <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
          <Link to="/implantadores/aderencia">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-full border-muted-foreground/20 hover:bg-muted">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 break-words text-lg font-bold leading-6 tracking-tight text-foreground sm:text-xl">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Aderências Finalizadas
            </h1>
            <p className="mt-0.5 break-words text-xs text-muted-foreground">Consulte e gerencie todos os formulários de aderência já preenchidos e finalizados.</p>
          </div>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto sm:shrink-0">
          <Button variant="outline" onClick={loadCompletedForms} className="h-9 w-full gap-1.5 border-muted-foreground/30 bg-card px-3 text-xs hover:bg-muted sm:w-auto" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por cliente, sistema, ticket ou responsável..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-10 border-muted-foreground/30 bg-card" />
      </div>

      {/* Main Content */}
      <Card className="shadow-lg border-muted/50 overflow-hidden bg-card flex flex-col relative pt-1">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-600" />
        <CardHeader className="bg-muted/30 pb-3 border-b shrink-0">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-rose-500 flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Formulários de Aderência Preenchidos
          </CardTitle>
          <CardDescription className="text-xs">Lista de diagnósticos de aderência gerados para projetos em andamento ou concluídos.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <RefreshCw className="h-8 w-8 text-primary animate-spin" />
              <span className="text-xs text-muted-foreground">Carregando formulários...</span>
            </div>
          ) : filteredForms.length === 0 ? (
            <div className="text-center py-20 text-xs text-muted-foreground border-b">{searchQuery ? "Nenhum formulário corresponde aos critérios de busca." : "Nenhum formulário finalizado ou preenchido encontrado."}</div>
          ) : (
            <>
              <div className="space-y-2 p-3 md:hidden" data-testid="adherence-finished-mobile-list">
                {paginatedForms.map((form) => {
                  const proj = form.projects;
                  if (!proj) return null;
                  const isFinalized = form.status === "approved" || form.status === "approved_with_restrictions" || form.status === "rejected";
                  const responsible = profiles[form.approved_by || ""] || profiles[form.filled_by || ""] || "Não atribuído";

                  return (
                    <article key={form.id} className="min-w-0 space-y-3 rounded-xl border bg-background p-3 shadow-sm">
                      <div className="flex min-w-0 items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="break-words text-sm font-bold leading-5">{proj.client_name}</h3>
                          <p className="mt-0.5 break-words text-[10px] text-muted-foreground">
                            Ticket: #{proj.ticket_number || "Sem Número"} · {proj.system_type}
                          </p>
                        </div>
                        <span
                          className={`max-w-[45%] shrink-0 break-words rounded-full border px-2 py-0.5 text-center text-[9px] font-bold uppercase ${
                            isFinalized
                              ? form.data?.finalVerdict === "Totalmente Aderente"
                                ? "border-green-500/20 bg-green-500/10 text-green-600"
                                : form.data?.finalVerdict === "Aderente com Restrições"
                                  ? "border-amber-500/20 bg-amber-500/10 text-amber-600"
                                  : "border-rose-500/20 bg-rose-500/10 text-rose-600"
                              : "border-slate-500/20 bg-slate-500/10 text-slate-600"
                          }`}
                        >
                          {isFinalized ? form.data?.finalVerdict || "Finalizado" : "Rascunho"}
                        </span>
                      </div>

                      <dl className="grid min-w-0 grid-cols-2 gap-2 rounded-lg bg-muted/30 p-2 text-[10px]">
                        <div className="min-w-0">
                          <dt className="uppercase tracking-wide text-muted-foreground">Responsável</dt>
                          <dd className="break-words font-semibold text-foreground">{responsible}</dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="uppercase tracking-wide text-muted-foreground">Atualização</dt>
                          <dd className="break-words font-semibold text-foreground">{new Date(form.updated_at).toLocaleString()}</dd>
                        </div>
                      </dl>

                      <div className={`grid gap-2 ${canDeleteAderencias ? "grid-cols-3" : "grid-cols-2"}`}>
                        <Button variant="outline" size="sm" onClick={() => window.open(`/projects/${form.project_id}/adherence`, "_blank")} className="h-9 min-w-0 gap-1 px-1.5 text-[10px]">
                          <Eye className="h-3.5 w-3.5" /> Visualizar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => window.open(`/projects/${form.project_id}/adherence?print=true`, "_blank")} className="h-9 min-w-0 gap-1 px-1.5 text-[10px] text-primary">
                          <Printer className="h-3.5 w-3.5" /> PDF
                        </Button>
                        {canDeleteAderencias && (
                          <Button variant="outline" size="sm" onClick={() => handleDeleteForm(form.id)} className="h-9 min-w-0 gap-1 px-1.5 text-[10px] text-rose-600">
                            <Trash2 className="h-3.5 w-3.5" /> Excluir
                          </Button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/40 border-b text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                      <th className="p-4">Cliente / Projeto</th>
                      <th className="p-4">Produto</th>
                      <th className="p-4">Responsável</th>
                      <th className="p-4">Status / Veredito</th>
                      <th className="p-4">Última Atualização</th>
                      <th className="p-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paginatedForms.map((form) => {
                      const proj = form.projects;
                      if (!proj) return null;

                      return (
                        <tr key={form.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-4 font-semibold text-foreground/90">
                            {proj.client_name}
                            <span className="block text-[10px] text-muted-foreground font-normal mt-0.5">Ticket: #{proj.ticket_number || "Sem Número"}</span>
                          </td>
                          <td className="p-4">
                            <span className="font-medium bg-slate-700 text-white px-2 py-0.5 rounded text-[10px] whitespace-nowrap">{proj.system_type}</span>
                          </td>
                          <td className="p-4 font-medium text-foreground/80 whitespace-nowrap">{profiles[form.approved_by || ""] || profiles[form.filled_by || ""] || "Não atribuído"}</td>
                          <td className="p-4">
                            {(() => {
                              const isFinalized = form.status === "approved" || form.status === "approved_with_restrictions" || form.status === "rejected";
                              return (
                                <span
                                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase whitespace-nowrap ${
                                    isFinalized
                                      ? form.data?.finalVerdict === "Totalmente Aderente"
                                        ? "bg-green-500/10 text-green-600 border-green-500/20"
                                        : form.data?.finalVerdict === "Aderente com Restrições"
                                          ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                          : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                      : "bg-slate-500/10 text-slate-600 border-slate-500/20"
                                  }`}
                                >
                                  {isFinalized ? form.data?.finalVerdict || "Finalizado" : "Rascunho"}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="p-4 text-muted-foreground whitespace-nowrap">{new Date(form.updated_at).toLocaleString()}</td>
                          <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                            <Button variant="ghost" size="sm" onClick={() => window.open(`/projects/${form.project_id}/adherence`, "_blank")} className="h-8 px-2.5 text-[11px] gap-1 hover:bg-muted">
                              <Eye className="h-3.5 w-3.5" />
                              Visualizar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(`/projects/${form.project_id}/adherence?print=true`, "_blank")}
                              className="h-8 px-2.5 text-[11px] gap-1 border-primary/20 text-primary hover:bg-primary/5"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              PDF
                            </Button>
                            {canDeleteAderencias && (
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteForm(form.id)} className="h-8 px-2.5 text-[11px] gap-1 hover:bg-rose-50 text-rose-600 hover:text-rose-700">
                                <Trash2 className="h-3.5 w-3.5" />
                                Excluir
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredForms.length > pageSize && (
                <div className="flex flex-col gap-2 border-t px-3 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    Mostrando{" "}
                    <strong className="text-foreground">
                      {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredForms.length)}
                    </strong>{" "}
                    de <strong className="text-foreground">{filteredForms.length}</strong>
                  </span>
                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <span>
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button type="button" variant="outline" size="icon" className="h-9 w-9" aria-label="Página anterior" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => page - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="outline" size="icon" className="h-9 w-9" aria-label="Próxima página" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => page + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
