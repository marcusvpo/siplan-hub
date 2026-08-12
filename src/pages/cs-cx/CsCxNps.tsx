import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileDown,
  Frown,
  Link2,
  Meh,
  RefreshCw,
  Search,
  Smile,
  Star,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type CsCxNpsResponse,
  useCsCxNps,
} from "@/hooks/useCsCxExperience";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { generateCsCxNpsPdf } from "@/lib/cs-cx-experience-pdf";
import {
  NpsInvitationsPanel,
  NpsQuestionnairesPanel,
} from "@/components/cs-cx/NpsSurveyManagement";
import { NpsAnalyticsPanel } from "@/components/cs-cx/NpsAnalytics";
import { answerLabel } from "@/lib/cs-cx-nps-survey";
const CLASS_LABELS: Record<string, string> = {
  PROMOTOR: "Promotor",
  NEUTRO: "Neutro",
  DETRATOR: "Detrator",
};
const DEFAULT_PAGE_SIZE = 5;

export default function CsCxNps() {
  const {
    responses,
    history,
    isLoading,
    error,
    refetch,
    deleteResponse,
  } = useCsCxNps();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [classification, setClassification] = useState("all");
  const [responsePage, setResponsePage] = useState(1);
  const [responsePageSize, setResponsePageSize] = useState(DEFAULT_PAGE_SIZE);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [deleting, setDeleting] = useState<CsCxNpsResponse | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [viewing, setViewing] = useState<CsCxNpsResponse | null>(null);
  const canCreate = hasPermission("cs_cx_nps", "create");
  const canDelete = hasPermission("cs_cx_nps", "delete");

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return responses.filter(
      (response) =>
        (!term ||
          [
            response.respondent_name,
            response.respondent_office,
            response.registry_office?.name,
            response.score_reason,
          ].some((value) =>
            value?.toLocaleLowerCase("pt-BR").includes(term),
          )) &&
        (classification === "all" ||
          response.classification === classification),
    );
  }, [classification, responses, search]);
  const responseTotalPages = Math.max(
    1,
    Math.ceil(filtered.length / responsePageSize),
  );
  const currentResponsePage = Math.min(responsePage, responseTotalPages);
  const pagedResponses = useMemo(
    () =>
      filtered.slice(
        (currentResponsePage - 1) * responsePageSize,
        currentResponsePage * responsePageSize,
      ),
    [currentResponsePage, filtered, responsePageSize],
  );
  const historyTotalPages = Math.max(
    1,
    Math.ceil(history.length / historyPageSize),
  );
  const currentHistoryPage = Math.min(historyPage, historyTotalPages);
  const pagedHistory = useMemo(
    () =>
      history.slice(
        (currentHistoryPage - 1) * historyPageSize,
        currentHistoryPage * historyPageSize,
      ),
    [currentHistoryPage, history, historyPageSize],
  );
  const updateSearch = (value: string) => {
    setSearch(value);
    setResponsePage(1);
  };
  const updateClassification = (value: string) => {
    setClassification(value);
    setResponsePage(1);
  };
  const updateResponsePageSize = (value: string) => {
    setResponsePageSize(Number(value));
    setResponsePage(1);
  };
  const updateHistoryPageSize = (value: string) => {
    setHistoryPageSize(Number(value));
    setHistoryPage(1);
  };
  const promoters = responses.filter(
    (item) => item.classification === "PROMOTOR",
  ).length;
  const neutrals = responses.filter(
    (item) => item.classification === "NEUTRO",
  ).length;
  const detractors = responses.filter(
    (item) => item.classification === "DETRATOR",
  ).length;
  const nps = responses.length
    ? Math.round(((promoters - detractors) / responses.length) * 1000) / 10
    : 0;

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteResponse.mutateAsync(deleting.id);
      setDeleting(null);
      toast({ title: "Resposta excluída" });
    } catch (mutationError) {
      toast({
        title: "Não foi possível excluir",
        description: messageOf(mutationError),
        variant: "destructive",
      });
    }
  }
  async function handleExport() {
    setIsExporting(true);
    try {
      const filters = [
        classification === "all"
          ? "Todas as classificações"
          : `Classificação: ${CLASS_LABELS[classification] ?? classification}`,
        search.trim() ? `Busca: ${search.trim()}` : "Sem filtro de busca",
      ];
      await generateCsCxNpsPdf(filtered, filters.join(" · "));
    } catch (exportError) {
      toast({
        title: "Não foi possível gerar o PDF",
        description: messageOf(exportError),
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }

  if (isLoading)
    return (
      <div className="container mx-auto max-w-[1600px] space-y-4 px-4 py-4 lg:px-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  return (
    <div className="container mx-auto max-w-[1600px] space-y-4 px-4 py-4 lg:px-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
            <Star className="h-4 w-4" />
          </span>
          <div>
            <h1 className="text-2xl font-black leading-none tracking-tight">
              NPS
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Satisfação, classificação e evolução das avaliações dos cartórios
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!filtered.length || isExporting}
            onClick={handleExport}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
          {canCreate && (
            <Button size="sm" onClick={() => setRequestOpen(true)}>
              <Link2 className="mr-2 h-4 w-4" />
              Solicitar NPS
            </Button>
          )}
        </div>
      </div>
      {error && (
        <Card className="border-destructive/40">
          <CardContent className="flex items-center justify-between gap-3 p-3">
            <span className="flex items-center gap-2 text-sm text-destructive">
              <TriangleAlert className="h-4 w-4" />
              {messageOf(error)}
            </span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Star} label="NPS geral" value={nps} />
        <Metric icon={Smile} label="Promotores" value={promoters} />
        <Metric icon={Meh} label="Neutros" value={neutrals} />
        <Metric icon={Frown} label="Detratores" value={detractors} />
      </div>
      <Tabs defaultValue="responses">
        <TabsList className="h-9">
          <TabsTrigger className="h-7" value="responses">
            Respostas
          </TabsTrigger>
          <TabsTrigger className="h-7" value="analytics">
            Análises
          </TabsTrigger>
          <TabsTrigger className="h-7" value="invitations">
            Solicitações
          </TabsTrigger>
          <TabsTrigger className="h-7" value="questionnaires">
            Questionários
          </TabsTrigger>
          <TabsTrigger className="h-7" value="history">
            Histórico
          </TabsTrigger>
        </TabsList>
        <TabsContent value="responses" className="mt-3 space-y-3">
          <Card>
            <CardContent className="grid gap-2 p-3 md:grid-cols-[minmax(260px,1fr)_220px]">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="h-9 pl-9"
                  value={search}
                  onChange={(event) => updateSearch(event.target.value)}
                  placeholder="Buscar respondente ou cartório..."
                />
              </div>
              <Select
                value={classification}
                onValueChange={updateClassification}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as classificações</SelectItem>
                  <SelectItem value="PROMOTOR">Promotores</SelectItem>
                  <SelectItem value="NEUTRO">Neutros</SelectItem>
                  <SelectItem value="DETRATOR">Detratores</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <Table className="[&_td]:px-3 [&_td]:py-2 [&_th]:h-9 [&_th]:px-3">
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Cartório</TableHead>
                    <TableHead>Respondente</TableHead>
                    <TableHead>Nota</TableHead>
                    <TableHead>Classificação</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedResponses.map((response) => (
                    <TableRow key={response.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatDate(response.responded_at)}
                      </TableCell>
                      <TableCell
                        className="max-w-56 truncate font-medium"
                        title={
                          response.registry_office?.name ??
                          response.respondent_office
                        }
                      >
                        {response.registry_office?.name ??
                          response.respondent_office}
                      </TableCell>
                      <TableCell
                        className="max-w-48 truncate"
                        title={response.respondent_name}
                      >
                        {response.respondent_name}
                      </TableCell>
                      <TableCell>
                        <span className="text-base font-black">
                          {response.score}
                        </span>
                      </TableCell>
                      <TableCell>
                        <ClassificationBadge value={response.classification} />
                      </TableCell>
                      <TableCell
                        className="max-w-xs truncate text-muted-foreground"
                        title={response.score_reason || undefined}
                      >
                        {response.score_reason || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label="Visualizar resposta"
                            onClick={() => setViewing(response)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label="Excluir resposta"
                              onClick={() => setDeleting(response)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!filtered.length && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-24 text-center text-sm text-muted-foreground"
                      >
                        Nenhuma resposta encontrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="px-3 pb-3">
                <NpsPaginationBar
                  currentPage={currentResponsePage}
                  pageSize={responsePageSize}
                  totalItems={filtered.length}
                  totalPages={responseTotalPages}
                  itemLabel="respostas"
                  selectLabel="Respostas por página"
                  onPageChange={setResponsePage}
                  onPageSizeChange={updateResponsePageSize}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="analytics" className="mt-3">
          <NpsAnalyticsPanel responses={responses} canGenerate={canCreate} />
        </TabsContent>
        <TabsContent
          forceMount
          value="invitations"
          className="mt-3 data-[state=inactive]:hidden"
        >
          <NpsInvitationsPanel
            requestOpen={requestOpen}
            onRequestOpenChange={setRequestOpen}
          />
        </TabsContent>
        <TabsContent value="questionnaires" className="mt-3">
          <NpsQuestionnairesPanel />
        </TabsContent>
        <TabsContent value="history" className="mt-3">
          <Card>
            <CardContent className="p-0">
              <Table className="[&_td]:px-3 [&_td]:py-2 [&_th]:h-9 [&_th]:px-3">
                <TableHeader>
                  <TableRow>
                    <TableHead>Cartório</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Respostas</TableHead>
                    <TableHead>Promotores</TableHead>
                    <TableHead>Neutros</TableHead>
                    <TableHead>Detratores</TableHead>
                    <TableHead>NPS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell
                        className="max-w-64 truncate font-medium"
                        title={item.registry_office?.name}
                      >
                        {item.registry_office?.name}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatDateOnly(item.period_start)} –{" "}
                        {formatDateOnly(item.period_end)}
                      </TableCell>
                      <TableCell>{item.total_responses}</TableCell>
                      <TableCell>{item.total_promoters}</TableCell>
                      <TableCell>{item.total_neutrals}</TableCell>
                      <TableCell>{item.total_detractors}</TableCell>
                      <TableCell className="font-black">
                        {item.nps_score.toFixed(1)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!history.length && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-24 text-center text-sm text-muted-foreground"
                      >
                        Nenhum histórico encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="px-3 pb-3">
                <NpsPaginationBar
                  currentPage={currentHistoryPage}
                  pageSize={historyPageSize}
                  totalItems={history.length}
                  totalPages={historyTotalPages}
                  itemLabel="períodos"
                  selectLabel="Períodos por página"
                  onPageChange={setHistoryPage}
                  onPageSizeChange={updateHistoryPageSize}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir resposta NPS?</AlertDialogTitle>
            <AlertDialogDescription>
              A resposta de {deleting?.respondent_name} deixará de compor os
              indicadores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
      >
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visualizar resposta NPS</DialogTitle>
            <DialogDescription>
              Somente leitura. Respostas enviadas pelos clientes não podem ser
              alteradas.
            </DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-3">
              <div className="grid gap-2 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2">
                <ReadOnlyField label="Data" value={formatDate(viewing.responded_at)} />
                <ReadOnlyField
                  label="Cartório"
                  value={viewing.registry_office?.name ?? viewing.respondent_office}
                />
                <ReadOnlyField label="Respondente" value={viewing.respondent_name} />
                <ReadOnlyField
                  label="Resultado"
                  value={`Nota ${viewing.score} · ${CLASS_LABELS[viewing.classification]}`}
                />
              </div>
              {viewing.score_reason && (
                <ReadOnlyAnswer label="Motivo da nota" value={viewing.score_reason} />
              )}
              {viewing.improvement_suggestion && (
                <ReadOnlyAnswer
                  label="Sugestão de melhoria"
                  value={viewing.improvement_suggestion}
                />
              )}
              {viewing.questionnaire_snapshot?.questions
                .filter((question) => !question.semantic_key)
                .map((question) => (
                  <ReadOnlyAnswer
                    key={question.id}
                    label={question.title}
                    value={answerLabel(question, viewing.answers)}
                  />
                ))}
              {!viewing.score_reason &&
                !viewing.improvement_suggestion &&
                !viewing.questionnaire_snapshot?.questions.some(
                  (question) => !question.semantic_key,
                ) && (
                  <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                    Esta resposta possui somente os dados resumidos acima.
                  </p>
                )}
              <p className="text-[10px] text-muted-foreground">
                Origem: {viewing.origin === "legacy" ? "sistema legado" : "formulário do Siplan HUB"}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Star;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="rounded-lg bg-rose-50 p-1.5 text-rose-600 dark:bg-rose-950/40">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="text-xl font-black leading-6">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
function NpsPaginationBar({
  currentPage,
  pageSize,
  totalItems,
  totalPages,
  itemLabel,
  selectLabel,
  onPageChange,
  onPageSizeChange,
}: {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  itemLabel: string;
  selectLabel: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: string) => void;
}) {
  const firstItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalItems);
  return (
    <div className="flex flex-col gap-2 border-t pt-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span
        aria-label={`Mostrando ${firstItem} a ${lastItem} de ${totalItems} ${itemLabel}`}
      >
        Mostrando{" "}
        <strong className="font-semibold text-foreground">
          {firstItem}–{lastItem}
        </strong>{" "}
        de{" "}
        <strong className="font-semibold text-foreground">{totalItems}</strong>
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <span>Por página</span>
        <Select value={String(pageSize)} onValueChange={onPageSizeChange}>
          <SelectTrigger aria-label={selectLabel} className="h-8 w-[72px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
        <span className="min-w-[92px] text-center">
          Página {currentPage} de {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label={`Página anterior de ${itemLabel}`}
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label={`Próxima página de ${itemLabel}`}
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
function ClassificationBadge({ value }: { value: string }) {
  return (
    <Badge
      variant={
        value === "DETRATOR"
          ? "destructive"
          : value === "PROMOTOR"
            ? "default"
            : "secondary"
      }
    >
      {CLASS_LABELS[value] ?? value}
    </Badge>
  );
}
function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold">{value || "—"}</p>
    </div>
  );
}

function ReadOnlyAnswer({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm font-medium">
        {value || "—"}
      </p>
    </div>
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
    new Date(`${value}T12:00:00`),
  );
}
function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Erro inesperado.";
}
