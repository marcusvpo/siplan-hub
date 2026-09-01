import { useMemo, useState } from "react";
import {
  CalendarRange,
  Building2,
  CircleHelp,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileDown,
  Frown,
  Link2,
  Meh,
  Pencil,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { type CsCxNpsResponse, useCsCxNps } from "@/hooks/useCsCxExperience";
import { useCsCxRecordPermissions } from "@/hooks/useCsCxRecordPermissions";
import { useToast } from "@/hooks/use-toast";
import { generateCsCxNpsPdf } from "@/lib/cs-cx-experience-pdf";
import { cn } from "@/lib/utils";
import {
  NpsInvitationsPanel,
  NpsQuestionnairesPanel,
} from "@/components/cs-cx/NpsSurveyManagement";
import { NpsAnalyticsPanel } from "@/components/cs-cx/NpsAnalytics";
import { answerLabel } from "@/lib/cs-cx-nps-survey";
import { useCsCxRegistryOffices } from "@/hooks/useCsCxCore";
import { useIsMobile } from "@/hooks/use-mobile";
const CLASS_LABELS: Record<string, string> = {
  PROMOTOR: "Promotor",
  NEUTRO: "Neutro",
  DETRATOR: "Detrator",
};
const DEFAULT_PAGE_SIZE = 5;
const NPS_SECTIONS = [
  { value: "analytics", label: "Análises" },
  { value: "responses", label: "Respostas" },
  { value: "invitations", label: "Solicitações" },
  { value: "questionnaires", label: "Questionários" },
  { value: "history", label: "Histórico consolidado" },
] as const;
type NpsSection = (typeof NPS_SECTIONS)[number]["value"];

export default function CsCxNps() {
  const isMobile = useIsMobile();
  const {
    responses,
    history,
    isLoading,
    error,
    refetch,
    deleteResponse,
    updateResponseProduct,
  } = useCsCxNps();
  const { offices, products } = useCsCxRegistryOffices();
  const { canCreate, canEditRecord, canDeleteRecord } =
    useCsCxRecordPermissions("cs_cx_nps");
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [classification, setClassification] = useState("all");
  const [responseProductId, setResponseProductId] = useState("all");
  const [responsePage, setResponsePage] = useState(1);
  const [responsePageSize, setResponsePageSize] = useState(DEFAULT_PAGE_SIZE);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [deleting, setDeleting] = useState<CsCxNpsResponse | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [viewing, setViewing] = useState<CsCxNpsResponse | null>(null);
  const [correctingProduct, setCorrectingProduct] =
    useState<CsCxNpsResponse | null>(null);
  const [correctedProductId, setCorrectedProductId] = useState("");
  const [activeTab, setActiveTab] = useState<NpsSection>("analytics");
  const [officeCoverage, setOfficeCoverage] = useState<
    "evaluated" | "not-evaluated" | null
  >(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return responses.filter(
      (response) =>
        (!term ||
          [
            response.respondent_name,
            response.respondent_office,
            response.registry_office?.name,
            response.product?.name,
            response.score_reason,
          ].some((value) =>
            value?.toLocaleLowerCase("pt-BR").includes(term),
          )) &&
        (classification === "all" ||
          response.classification === classification) &&
        (responseProductId === "all" ||
          (responseProductId === "unassigned"
            ? !response.product_id
            : response.product_id === responseProductId)),
    );
  }, [classification, responseProductId, responses, search]);
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
  const historySummary = useMemo(() => {
    const officeIds = new Set(history.map((item) => item.registry_office_id));
    const totalResponses = history.reduce(
      (total, item) => total + item.total_responses,
      0,
    );
    const starts = history.map((item) => item.period_start).sort();
    const ends = history.map((item) => item.period_end).sort();
    return {
      offices: officeIds.size,
      totalResponses,
      firstPeriod: starts.at(0) ?? null,
      lastPeriod: ends.at(-1) ?? null,
    };
  }, [history]);
  const updateSearch = (value: string) => {
    setSearch(value);
    setResponsePage(1);
  };
  const updateClassification = (value: string) => {
    setClassification(value);
    setResponsePage(1);
  };
  const updateResponseProductFilter = (value: string) => {
    setResponseProductId(value);
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
  const evaluatedOfficeIds = new Set(
    responses.map((response) => response.registry_office_id).filter(Boolean),
  );
  const evaluatedOfficeNames = new Set(
    responses.map((response) =>
      normalizeOfficeName(
        response.registry_office?.name ?? response.respondent_office,
      ),
    ),
  );
  const activeOffices = offices.filter((office) => office.active);
  const evaluatedOfficeList = activeOffices.filter(
    (office) =>
      evaluatedOfficeIds.has(office.id) ||
      evaluatedOfficeNames.has(normalizeOfficeName(office.name)),
  );
  const notEvaluatedOfficeList = activeOffices.filter(
    (office) =>
      !evaluatedOfficeList.some((evaluated) => evaluated.id === office.id),
  );
  const coverageOffices =
    officeCoverage === "evaluated"
      ? evaluatedOfficeList
      : notEvaluatedOfficeList;

  function showClassification(value: "PROMOTOR" | "NEUTRO" | "DETRATOR") {
    setClassification(value);
    setResponsePage(1);
    setActiveTab("responses");
  }

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
  async function handleCorrectProduct() {
    if (!correctingProduct || !correctedProductId) return;
    try {
      await updateResponseProduct.mutateAsync({
        id: correctingProduct.id,
        productId: correctedProductId,
      });
      setCorrectingProduct(null);
      setCorrectedProductId("");
      toast({ title: "Produto da avaliação atualizado" });
    } catch (mutationError) {
      toast({
        title: "Não foi possível atualizar o produto",
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
        responseProductId === "all"
          ? "Todos os produtos"
          : responseProductId === "unassigned"
            ? "Produto não informado"
            : `Produto: ${products.find((product) => product.id === responseProductId)?.name ?? "não encontrado"}`,
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
    <div data-testid="cs-cx-nps-page" className="container mx-auto w-full min-w-0 max-w-[1600px] space-y-4 overflow-x-hidden px-3 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-4 lg:px-6">
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
        <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:flex md:flex-wrap">
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
            <Button size="sm" className="w-full md:w-auto" onClick={() => setRequestOpen(true)}>
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
      <div data-testid="cs-cx-nps-metrics" className="grid auto-rows-fr grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-6">
        <Metric icon={Star} label="NPS geral" value={nps} />
        <Metric
          icon={Smile}
          label="Promotores"
          value={promoters}
          active={classification === "PROMOTOR" && activeTab === "responses"}
          onClick={() => showClassification("PROMOTOR")}
        />
        <Metric
          icon={Meh}
          label="Neutros"
          value={neutrals}
          active={classification === "NEUTRO" && activeTab === "responses"}
          onClick={() => showClassification("NEUTRO")}
        />
        <Metric
          icon={Frown}
          label="Detratores"
          value={detractors}
          active={classification === "DETRATOR" && activeTab === "responses"}
          onClick={() => showClassification("DETRATOR")}
        />
        <Metric
          icon={Building2}
          label="Cartórios avaliados"
          value={evaluatedOfficeList.length}
          active={officeCoverage === "evaluated"}
          onClick={() => setOfficeCoverage("evaluated")}
        />
        <Metric
          icon={CircleHelp}
          label="Cartórios não avaliados"
          value={notEvaluatedOfficeList.length}
          active={officeCoverage === "not-evaluated"}
          onClick={() => setOfficeCoverage("not-evaluated")}
        />
      </div>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as NpsSection)}>
        {isMobile ? (
          <div data-testid="cs-cx-nps-mobile-tabs" className="rounded-lg border bg-card p-2 shadow-sm">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Área do NPS
            </span>
            <Select value={activeTab} onValueChange={(value) => setActiveTab(value as NpsSection)}>
              <SelectTrigger aria-label="Área do NPS" className="h-10 w-full bg-background text-left">
                <SelectValue placeholder="Selecione uma área" />
              </SelectTrigger>
              <SelectContent>
                {NPS_SECTIONS.map((section) => (
                  <SelectItem key={section.value} value={section.value}>{section.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <TabsList className="h-9 w-auto justify-start">
            {NPS_SECTIONS.map((section) => (
              <TabsTrigger key={section.value} className="h-7" value={section.value}>{section.label}</TabsTrigger>
            ))}
          </TabsList>
        )}
        <TabsContent value="responses" className="mt-3 space-y-3">
          <Card>
            <CardContent className="grid gap-2 p-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_200px_200px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
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
              <Select
                value={responseProductId}
                onValueChange={updateResponseProductFilter}
              >
                <SelectTrigger
                  className="h-9"
                  aria-label="Filtrar respostas por produto"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os produtos</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="unassigned">Sem produto (legado)</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              {isMobile && <div data-testid="cs-cx-nps-responses-mobile-list" className="space-y-2 p-3 md:hidden">
                {pagedResponses.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma resposta encontrada.</p> : pagedResponses.map((response) => (
                  <article key={response.id} className="min-w-0 rounded-lg border bg-card p-3">
                    <div className="flex min-w-0 items-start justify-between gap-2"><div className="min-w-0"><p className="break-words text-sm font-bold">{response.registry_office?.name ?? response.respondent_office}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{response.respondent_name} · {formatDate(response.responded_at)}</p></div><span className="shrink-0 text-2xl font-black">{response.score}</span></div>
                    <div className="mt-2 flex flex-wrap gap-1.5"><ClassificationBadge value={response.classification} /><Badge variant="outline">{response.product?.name ?? "Sem produto"}</Badge></div>
                    <p className="mt-2 line-clamp-3 break-words text-xs leading-5 text-muted-foreground">{response.score_reason || "Motivo não informado"}</p>
                    <div className="mt-2 flex justify-end border-t pt-2"><Button variant="ghost" size="sm" className="h-8" onClick={() => setViewing(response)}><Eye className="mr-1.5 h-4 w-4" />Visualizar</Button>{canEditRecord(response.owner_profile_id) && <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Corrigir produto da resposta" onClick={() => { setCorrectingProduct(response); setCorrectedProductId(response.product_id ?? ""); }}><Pencil className="h-4 w-4" /></Button>}{canDeleteRecord(response.owner_profile_id) && <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Excluir resposta" onClick={() => setDeleting(response)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div>
                  </article>
                ))}
              </div>}
              {!isMobile && <Table className="hidden md:table [&_td]:px-3 [&_td]:py-2 [&_th]:h-9 [&_th]:px-3">
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Cartório</TableHead>
                    <TableHead>Produto</TableHead>
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
                      <TableCell>
                        <Badge variant="outline">
                          {response.product?.name ?? "Sem produto"}
                        </Badge>
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
                          {canEditRecord(response.owner_profile_id) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label="Corrigir produto da resposta"
                              onClick={() => {
                                setCorrectingProduct(response);
                                setCorrectedProductId(response.product_id ?? "");
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDeleteRecord(response.owner_profile_id) && (
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
                        colSpan={8}
                        className="h-24 text-center text-sm text-muted-foreground"
                      >
                        Nenhuma resposta encontrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>}
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
          <NpsAnalyticsPanel
            responses={responses}
            products={products}
            canGenerate={canCreate}
          />
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
            <CardHeader className="border-b px-4 py-3">
              <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                <div className="flex min-w-0 gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                    <CalendarRange className="h-4 w-4" />
                  </span>
                  <div>
                    <CardTitle className="text-sm">
                      Fechamentos históricos de NPS
                    </CardTitle>
                    <CardDescription className="mt-0.5 max-w-3xl text-xs leading-relaxed">
                      Consolidações importadas do sistema anterior. Cada linha
                      representa o resultado de um cartório em um período; as
                      respostas atuais ficam na aba Respostas e no BI de
                      Análises.
                    </CardDescription>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  <Badge variant="outline">{history.length} fechamentos</Badge>
                  <Badge variant="outline">
                    {historySummary.offices}{" "}
                    {historySummary.offices === 1 ? "cartório" : "cartórios"}
                  </Badge>
                  <Badge variant="outline">
                    {historySummary.totalResponses} respostas consolidadas
                  </Badge>
                </div>
              </div>
              {historySummary.firstPeriod && historySummary.lastPeriod && (
                <p className="pl-10 text-[10px] text-muted-foreground">
                  Cobertura histórica:{" "}
                  {formatDateOnly(historySummary.firstPeriod)} até{" "}
                  {formatDateOnly(historySummary.lastPeriod)}
                </p>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {isMobile && <div data-testid="cs-cx-nps-history-mobile-list" className="space-y-2 p-3 md:hidden">
                {pagedHistory.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhum fechamento histórico foi importado.</p> : pagedHistory.map((item) => { const status = npsHistoryStatus(item.nps_score); return (
                  <article key={item.id} className="min-w-0 rounded-lg border bg-card p-3">
                    <div className="flex min-w-0 items-start justify-between gap-2"><div className="min-w-0"><p className="break-words text-sm font-bold">{item.registry_office?.name ?? "Cartório não informado"}</p><p className="mt-0.5 text-xs text-muted-foreground">{formatDateOnly(item.period_start)} – {formatDateOnly(item.period_end)}</p></div><Badge variant="outline" className={status.className}>NPS {item.nps_score.toFixed(1)}</Badge></div>
                    <div className="mt-3 flex flex-wrap gap-1"><HistoryCount label="Promotores" shortLabel="P" value={item.total_promoters} tone="positive" /><HistoryCount label="Neutros" shortLabel="N" value={item.total_neutrals} tone="neutral" /><HistoryCount label="Detratores" shortLabel="D" value={item.total_detractors} tone="negative" /></div>
                    <p className="mt-2 text-xs text-muted-foreground">{item.total_responses} respostas · {status.label}</p>
                  </article>
                ); })}
              </div>}
              {!isMobile && <Table className="hidden md:table [&_td]:px-3 [&_td]:py-2 [&_th]:h-9 [&_th]:px-3">
                <TableHeader>
                  <TableRow>
                    <TableHead>Cartório</TableHead>
                    <TableHead>Período avaliado</TableHead>
                    <TableHead>Base da pesquisa</TableHead>
                    <TableHead>Composição das respostas</TableHead>
                    <TableHead>Resultado do período</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedHistory.map((item) => {
                    const status = npsHistoryStatus(item.nps_score);
                    return (
                      <TableRow key={item.id}>
                        <TableCell
                          className="max-w-64 truncate font-medium"
                          title={item.registry_office?.name}
                        >
                          {item.registry_office?.name ??
                            "Cartório não informado"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {formatDateOnly(item.period_start)} –{" "}
                          {formatDateOnly(item.period_end)}
                        </TableCell>
                        <TableCell>
                          <span className="font-bold">
                            {item.total_responses}
                          </span>
                          <span className="ml-1 text-[10px] text-muted-foreground">
                            respostas
                          </span>
                        </TableCell>
                        <TableCell>
                          <div
                            className="flex flex-wrap gap-1"
                            aria-label={`${item.total_promoters} promotores, ${item.total_neutrals} neutros e ${item.total_detractors} detratores`}
                          >
                            <HistoryCount
                              label="Promotores"
                              shortLabel="P"
                              value={item.total_promoters}
                              tone="positive"
                            />
                            <HistoryCount
                              label="Neutros"
                              shortLabel="N"
                              value={item.total_neutrals}
                              tone="neutral"
                            />
                            <HistoryCount
                              label="Detratores"
                              shortLabel="D"
                              value={item.total_detractors}
                              tone="negative"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={status.className}
                            >
                              NPS {item.nps_score.toFixed(1)}
                            </Badge>
                            <span className="text-[10px] font-medium text-muted-foreground">
                              {status.label}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!history.length && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-sm text-muted-foreground"
                      >
                        Nenhum fechamento histórico foi importado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>}
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
      <Dialog
        open={Boolean(officeCoverage)}
        onOpenChange={(open) => !open && setOfficeCoverage(null)}
      >
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none overflow-y-auto p-4 sm:max-h-[85vh] sm:max-w-2xl sm:p-6">
          <DialogHeader>
            <DialogTitle>
              {officeCoverage === "evaluated"
                ? "Cartórios avaliados"
                : "Cartórios ainda não avaliados"}
            </DialogTitle>
            <DialogDescription>
              {officeCoverage === "evaluated"
                ? "Cartórios ativos que já possuem ao menos uma resposta NPS."
                : "Cartórios ativos sem resposta NPS vinculada; use esta lista para planejar os próximos envios."}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cartório</TableHead>
                  <TableHead>Responsável</TableHead>
                  {officeCoverage === "evaluated" && (
                    <TableHead className="text-right">Respostas</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {coverageOffices.length ? (
                  coverageOffices.map((office) => {
                    const responseCount = responses.filter(
                      (response) =>
                        response.registry_office_id === office.id ||
                        normalizeOfficeName(
                          response.registry_office?.name ??
                            response.respondent_office,
                        ) === normalizeOfficeName(office.name),
                    ).length;
                    return (
                      <TableRow key={office.id}>
                        <TableCell className="font-medium">
                          {office.name}
                        </TableCell>
                        <TableCell>
                          {office.analyst?.full_name ||
                            office.analyst?.email ||
                            "Não informado"}
                        </TableCell>
                        {officeCoverage === "evaluated" && (
                          <TableCell className="text-right font-semibold">
                            {responseCount}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={officeCoverage === "evaluated" ? 3 : 2}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhum cartório nesta situação.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
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
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none overflow-y-auto p-4 sm:max-h-[85vh] sm:max-w-2xl sm:p-6">
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
                <ReadOnlyField
                  label="Data"
                  value={formatDate(viewing.responded_at)}
                />
                <ReadOnlyField
                  label="Cartório"
                  value={
                    viewing.registry_office?.name ?? viewing.respondent_office
                  }
                />
                <ReadOnlyField
                  label="Produto avaliado"
                  value={viewing.product?.name ?? "Sem produto informado"}
                />
                <ReadOnlyField
                  label="Respondente"
                  value={viewing.respondent_name}
                />
                <ReadOnlyField
                  label="Resultado"
                  value={`Nota ${viewing.score} · ${CLASS_LABELS[viewing.classification]}`}
                />
              </div>
              {viewing.score_reason && (
                <ReadOnlyAnswer
                  label="Motivo da nota"
                  value={viewing.score_reason}
                />
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
                Origem:{" "}
                {viewing.origin === "legacy"
                  ? "sistema legado"
                  : "formulário do Siplan HUB"}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(correctingProduct)}
        onOpenChange={(open) => {
          if (!open) {
            setCorrectingProduct(null);
            setCorrectedProductId("");
          }
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none overflow-y-auto p-4 sm:max-h-[92vh] sm:max-w-md sm:p-6">
          <DialogHeader>
            <DialogTitle>Corrigir produto da avaliação</DialogTitle>
            <DialogDescription>
              Apenas o produto será alterado. Nota, respostas e comentários
              permanecerão intactos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label
              className="text-sm font-medium"
              htmlFor="nps-correct-product"
            >
              Produto avaliado
            </label>
            <Select
              value={correctedProductId}
              onValueChange={setCorrectedProductId}
            >
              <SelectTrigger id="nps-correct-product">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {(offices.find(
                  (office) =>
                    office.id === correctingProduct?.registry_office_id,
                )?.products ?? [])
                  .filter((item) => item.product)
                  .map((item) => (
                    <SelectItem key={item.product_id} value={item.product_id}>
                      {item.product?.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCorrectingProduct(null);
                setCorrectedProductId("");
              }}
            >
              Cancelar
            </Button>
            <Button
              disabled={!correctedProductId || updateResponseProduct.isPending}
              onClick={handleCorrectProduct}
            >
              Salvar produto
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  onClick,
  active = false,
}: {
  icon: typeof Star;
  label: string;
  value: number;
  onClick?: () => void;
  active?: boolean;
}) {
  const card = (
    <Card
      className={cn(
        "h-full min-h-[76px]",
        active && "border-rose-400 ring-1 ring-rose-200",
      )}
    >
      <CardContent className="flex h-full items-center gap-2.5 px-3 py-2.5">
        <div className="shrink-0 rounded-lg bg-rose-50 p-1.5 text-rose-600 dark:bg-rose-950/40">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex min-h-6 items-center text-[10px] font-semibold uppercase leading-3 tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="text-xl font-black leading-6">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
  return onClick ? (
    <button
      type="button"
      className="h-full w-full rounded-lg text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-pressed={active}
      onClick={onClick}
    >
      {card}
    </button>
  ) : (
    card
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

function HistoryCount({
  label,
  shortLabel,
  value,
  tone,
}: {
  label: string;
  shortLabel: string;
  value: number;
  tone: "positive" | "neutral" | "negative";
}) {
  const toneClass = {
    positive:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
    neutral:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
    negative:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300",
  }[tone];
  return (
    <Badge
      variant="outline"
      className={`h-5 gap-1 px-1.5 text-[9px] font-semibold ${toneClass}`}
      title={`${value} ${label.toLocaleLowerCase("pt-BR")}`}
    >
      <span aria-hidden="true">{shortLabel}</span>
      {value}
    </Badge>
  );
}

function npsHistoryStatus(score: number) {
  if (score >= 75) {
    return {
      label: "Zona de excelência",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
    };
  }
  if (score >= 50) {
    return {
      label: "Zona de qualidade",
      className:
        "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300",
    };
  }
  if (score >= 0) {
    return {
      label: "Zona de aperfeiçoamento",
      className:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
    };
  }
  return {
    label: "Zona crítica",
    className:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300",
  };
}

function ClassificationBadge({ value }: { value: string }) {
  return (
    <Badge
      variant={
        value === "DETRATOR"
          ? "critical"
          : value === "PROMOTOR"
            ? "success"
            : "warning"
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

function normalizeOfficeName(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}
