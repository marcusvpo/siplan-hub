import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { usePosPanorama, usePanoramaParecer, ChamadoPanorama } from "@/hooks/usePosPanorama";
import {
  Chamado0800DetailDialog,
  fmtDateBr,
  statusBadgeClass,
} from "@/components/ProjectManagement/Chamado0800DetailDialog";
import { MarkdownLite, markdownLiteToHtml } from "@/components/MarkdownLite";
import { useModelWorkerStatus } from "@/hooks/useModelGenerationJobs";
import { toast } from "sonner";
import {
  Headset,
  Building2,
  Tags,
  Loader2,
  X,
  CalendarDays,
  Search,
  CheckCircle2,
  FolderKanban,
  Filter,
  Trophy,
  Sparkles,
  FileDown,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  TriangleAlert,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
} from "recharts";

const PRODUTOS = ["todos", "Orion TN", "Orion PRO", "Orion REG", "WEB RI"] as const;

const PERIODOS = [
  { valor: "30", rotulo: "Últimos 30 dias" },
  { valor: "90", rotulo: "Últimos 90 dias" },
  { valor: "180", rotulo: "Últimos 180 dias" },
  { valor: "365", rotulo: "Últimos 12 meses" },
  { valor: "tudo", rotulo: "Todo o histórico" },
  { valor: "custom", rotulo: "Período específico…" },
] as const;

const norm = (s: string): string =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Crítico E ainda em aberto — merece destaque visual na lista. */
const isCriticoAberto = (c: { criticidade?: string; dataEncerramento?: string }): boolean => {
  if (c.dataEncerramento) return false;
  const crit = (c.criticidade || "").toLowerCase();
  return crit.includes("crítico") && !crit.includes("não");
};

const diasDesde = (iso?: string): number =>
  iso ? Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86400000)) : 0;

interface PanoramaBaseProps {
  /** 'abertos' = só projetos com pós em andamento; 'todos' = inclui finalizados */
  escopo: "abertos" | "todos";
  titulo: string;
  descricao: string;
}

type MobileSection = "resumo" | "chamados" | "parecer";

/**
 * Base compartilhada dos panoramas de pós: visão de carteira dos chamados 0800
 * que caíram DENTRO da janela de pós de algum projeto (cliente + produto +
 * período — mesmo critério da aba por projeto). Foco em recorrência: o mesmo
 * tema (IA) em vários cartórios indica problema sistêmico, não caso isolado.
 *
 * Duas telas usam esta base:
 *  - Panorama Pós-Implantação (escopo 'abertos'): operacional, só pós em andamento
 *  - Panorama Geral (escopo 'todos'): histórico, inclui pós finalizados
 */
export function PanoramaBase({ escopo, titulo, descricao }: PanoramaBaseProps) {
  // ----- filtros -----
  const [produto, setProduto] = useState<string>("todos");
  const [natureza, setNatureza] = useState<string>("todas");
  const [status, setStatus] = useState<string>("todos");
  const [criticidade, setCriticidade] = useState<string>("todas");
  const [periodo, setPeriodo] = useState<string>("90");
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [busca, setBusca] = useState<string>("");
  const [tema, setTema] = useState<string | null>(null);
  const [cartorio, setCartorio] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<MobileSection>("resumo");

  const [inicioQuery, fimQuery] = useMemo((): [string | null, string | null] => {
    if (periodo === "custom") return [dataInicio || null, dataFim || null];
    if (periodo === "tudo") return [null, null];
    const inicio = new Date(Date.now() - Number(periodo) * 86400000).toISOString().slice(0, 10);
    return [inicio, null];
  }, [periodo, dataInicio, dataFim]);

  const { data, isLoading, error } = usePosPanorama(inicioQuery, fimQuery, escopo);
  const [chamadoSelecionado, setChamadoSelecionado] = useState<ChamadoPanorama | null>(null);
  const [exporting, setExporting] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(6);
  const navigate = useNavigate();
  const { gerarParecer, ativo: parecerAtivo, ultimo: ultimoParecer, ultimoErro } = usePanoramaParecer();
  const { online: workerOnline } = useModelWorkerStatus();

  // Opcoes derivadas do conjunto base (ja recortado pela janela de pos)
  const opcoes = useMemo(() => {
    const naturezas = new Set<string>();
    const criticidades = new Set<string>();
    for (const c of data?.chamados ?? []) {
      if (c.natureza) naturezas.add(c.natureza);
      if (c.criticidade) criticidades.add(c.criticidade);
    }
    return { naturezas: [...naturezas].sort(), criticidades: [...criticidades].sort() };
  }, [data]);

  // Aplicacao dos filtros finos
  const filtrados = useMemo(() => {
    let lista = data?.chamados ?? [];
    if (produto !== "todos") lista = lista.filter((c) => c.projetoProduto === produto || norm(c.projetoProduto).startsWith(norm(produto)));
    if (natureza !== "todas") lista = lista.filter((c) => c.natureza === natureza);
    if (status !== "todos")
      lista = lista.filter((c) => (status === "abertos" ? !c.dataEncerramento : !!c.dataEncerramento));
    if (criticidade !== "todas") lista = lista.filter((c) => c.criticidade === criticidade);
    if (tema) lista = lista.filter((c) => c.tema === tema);
    if (cartorio) lista = lista.filter((c) => c.projetoCliente === cartorio);
    const q = norm(busca.trim());
    if (q) {
      lista = lista.filter(
        (c) =>
          c.numeroChamado.includes(q) ||
          norm(c.titulo || "").includes(q) ||
          norm(c.projetoCliente || "").includes(q) ||
          norm(c.tema || "").includes(q)
      );
    }
    return lista;
  }, [data, produto, natureza, status, criticidade, tema, cartorio, busca]);

  // Agregacoes sobre o conjunto filtrado
  const agg = useMemo(() => {
    const cartorios = new Map<string, number>();
    const temasMap = new Map<string, { chamados: number; nomes: Set<string> }>();
    const natMap = new Map<string, number>();
    const mesMap = new Map<string, number>();
    let concluidos = 0;
    let semTema = 0;
    for (const c of filtrados) {
      if (c.dataEncerramento) concluidos++;
      cartorios.set(c.projetoCliente, (cartorios.get(c.projetoCliente) ?? 0) + 1);
      natMap.set(c.natureza || "Sem natureza", (natMap.get(c.natureza || "Sem natureza") ?? 0) + 1);
      if (c.dataAbertura) {
        const mes = c.dataAbertura.slice(0, 7); // yyyy-mm
        mesMap.set(mes, (mesMap.get(mes) ?? 0) + 1);
      }
      if (!c.tema || c.tema === "não classificado") semTema++;
      else {
        const t = temasMap.get(c.tema) ?? { chamados: 0, nomes: new Set<string>() };
        t.chamados++;
        t.nomes.add(c.projetoCliente);
        temasMap.set(c.tema, t);
      }
    }
    const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    const porMes = [...mesMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([ym, total]) => {
        const [y, m] = ym.split("-");
        return { mes: `${MESES[Number(m) - 1]}/${y.slice(2)}`, total };
      });
    return {
      concluidos,
      semTema,
      cartorios: [...cartorios.entries()].sort((a, b) => b[1] - a[1]),
      temas: [...temasMap.entries()]
        .map(([nome, v]) => ({
          tema: nome,
          chamados: v.chamados,
          cartorios: v.nomes.size,
          nomes: [...v.nomes].sort(),
        }))
        .sort((a, b) => b.cartorios - a.cartorios || b.chamados - a.chamados),
      porNatureza: [...natMap.entries()]
        .map(([n, total]) => ({ natureza: n, total }))
        .sort((a, b) => b.total - a.total),
      porMes,
    };
  }, [filtrados]);

  const projetosDoCartorio = useMemo(
    () => (cartorio && data ? data.projetos.filter((p) => p.cliente === cartorio) : []),
    [cartorio, data]
  );

  const handleGerarParecer = async () => {
    try {
      // Projetos cujos chamados estao no recorte: o worker usa os ids para
      // anexar o contexto das etapas (conversao, aderencia, DTC) ao parecer.
      const idsNoRecorte = [...new Set(filtrados.map((c) => c.projetoId))];
      const projetosDoRecorte = (data?.projetos ?? [])
        .filter((p) => idsNoRecorte.includes(p.id))
        .map((p) => ({ id: p.id, cliente: p.cliente, produto: p.produto }));
      const payload = {
        projetos: projetosDoRecorte,
        recorte: {
          produto,
          natureza,
          status,
          criticidade,
          abertura_de: inicioQuery,
          abertura_ate: fimQuery ?? "hoje",
        },
        totais: {
          chamados: filtrados.length,
          cartorios: agg.cartorios.length,
          concluidos: agg.concluidos,
          projetos_em_pos: data?.projetosEmPos ?? 0,
        },
        temas: agg.temas.slice(0, 15),
        naturezas: agg.porNatureza,
        cartorios_top: agg.cartorios.slice(0, 8).map(([nome, n]) => ({ cartorio: nome, chamados: n })),
        criticos_abertos: filtrados
          .filter((c) => !c.dataEncerramento && (c.criticidade || "").toLowerCase().includes("crítico") && !(c.criticidade || "").toLowerCase().includes("não"))
          .map((c) => ({ numero: c.numeroChamado, cartorio: c.projetoCliente, titulo: c.titulo, abertura: c.dataAbertura })),
      };
      await gerarParecer(JSON.stringify(payload));
      toast.success("Gerando o parecer da carteira com IA. Isso pode levar alguns instantes.");
    } catch (err) {
      console.error("Erro ao enfileirar parecer do panorama:", err);
      toast.error("Não foi possível iniciar o parecer com IA.");
    }
  };

  const exportPdf = async () => {
    if (exporting || filtrados.length === 0) return;
    setExporting(true);
    toast.loading("Gerando PDF...", { id: "panorama-pdf" });
    const holder = document.createElement("div");
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const contagem = (itens: [string, number][]) =>
        itens
          .map(([k, v]) => `<tr><td>${esc(k)}</td><td style="text-align:right;font-weight:600;">${v}</td></tr>`)
          .join("");
      holder.style.cssText = "position:fixed;left:-99999px;top:0;width:794px;background:#ffffff;";
      holder.innerHTML = `
        <div style="width:794px;padding:48px 56px;box-sizing:border-box;background:#ffffff;color:#0f172a;font-family:'Segoe UI',Calibri,Arial,sans-serif;">
          <div style="border-bottom:3px solid #ad0505;padding-bottom:14px;margin-bottom:20px;">
            <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#ad0505;font-weight:700;">Panorama Pós-Implantação</div>
            <div style="font-size:20px;font-weight:700;margin-top:4px;">${esc(produto === "todos" ? "Todos os produtos" : produto)} · ${esc(
              inicioQuery ? `de ${fmtDateBr(inicioQuery)}` : "todo o histórico"
            )}${fimQuery ? ` até ${fmtDateBr(fimQuery)}` : ""}</div>
          </div>
          <style>td{padding:4px 8px;vertical-align:top;border-bottom:1px solid #eef2f7;font-size:12px;} h3{font-size:13px;margin:16px 0 6px;}</style>
          <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
            ${contagem([
              ["Chamados no recorte", filtrados.length],
              ["Cartórios envolvidos", agg.cartorios.length],
              ["Projetos com pós", data?.projetosEmPos ?? 0],
              ["Concluídos", agg.concluidos],
            ])}
          </table>
          <h3>Temas recorrentes (IA)</h3>
          <table style="width:100%;border-collapse:collapse;">
            <tr style="color:#64748b;font-weight:600;"><td>Tema</td><td style="text-align:right;">Cartórios</td><td style="text-align:right;">Chamados</td></tr>
            ${agg.temas
              .slice(0, 15)
              .map(
                (t) =>
                  `<tr><td>${esc(t.tema)}</td><td style="text-align:right;">${t.cartorios}</td><td style="text-align:right;font-weight:600;">${t.chamados}</td></tr>`
              )
              .join("")}
          </table>
          <h3>Chamados por natureza</h3>
          <table style="width:100%;border-collapse:collapse;">${contagem(
            agg.porNatureza.map((n) => [n.natureza, n.total] as [string, number])
          )}</table>
          <h3>Cartórios com mais chamados</h3>
          <table style="width:100%;border-collapse:collapse;">${contagem(agg.cartorios.slice(0, 10))}</table>
          ${
            ultimoParecer?.resultText
              ? `<h3>Parecer da IA (carteira)</h3><div style="font-size:12px;color:#1e293b;">${markdownLiteToHtml(ultimoParecer.resultText)}</div>`
              : ""
          }
          <div style="margin-top:32px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:10.5px;color:#94a3b8;text-align:center;">
            Gerado pelo SiplanHUB em ${new Date().toLocaleDateString("pt-BR")}
          </div>
        </div>`;
      document.body.appendChild(holder);
      const canvas = await html2canvas(holder.firstElementChild as HTMLElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save("panorama-pos-implantacao.pdf");
      toast.success("PDF gerado.", { id: "panorama-pdf" });
    } catch (err) {
      console.error("Erro ao gerar PDF do panorama:", err);
      toast.error("Falha ao gerar o PDF.", { id: "panorama-pdf" });
    } finally {
      holder.remove();
      setExporting(false);
    }
  };

  // Paginacao da lista de chamados. Nao ha reset explicito ao filtrar: a pagina
  // atual e SEMPRE limitada ao total, entao encolher o recorte reposiciona sozinho.
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const paginados = useMemo(
    () => filtrados.slice((paginaAtual - 1) * porPagina, paginaAtual * porPagina),
    [filtrados, paginaAtual, porPagina]
  );

  const temFiltroFino =
    produto !== "todos" || natureza !== "todas" || status !== "todos" ||
    criticidade !== "todas" || !!tema || !!cartorio || !!busca.trim();

  const filtrosAtivos = [
    produto !== "todos",
    natureza !== "todas",
    status !== "todos",
    criticidade !== "todas",
    periodo !== "90",
    !!tema,
    !!cartorio,
  ].filter(Boolean).length;

  const limparFiltros = () => {
    setProduto("todos");
    setNatureza("todas");
    setStatus("todos");
    setCriticidade("todas");
    setTema(null);
    setCartorio(null);
    setBusca("");
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1400px] space-y-4 px-0 pb-4 pt-2 [--viz-bar:#2a78d6] dark:[--viz-bar:#3987e5] sm:p-4">
      {/* Cabecalho */}
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-start gap-2 text-xl font-bold leading-tight">
            <Headset className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            {titulo}
          </h1>
          <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">{descricao}</p>
        </div>
        <div className="flex w-full min-w-0 items-center justify-between gap-2 sm:w-auto sm:justify-end">
          {data?.lastSyncedAt && (
            <span className="min-w-0 text-[10px] leading-tight text-muted-foreground sm:text-right sm:text-[11px]">
              espelho sincronizado{" "}
              {new Date(data.lastSyncedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={exportPdf}
            disabled={exporting || filtrados.length === 0}
            title="Exportar o panorama em PDF"
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
            PDF
          </Button>
        </div>
      </div>

      {/* Barra de filtros */}
      <Card className="min-w-0">
        <CardContent className="space-y-2.5 p-3">
          <div className="space-y-2 md:hidden">
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar chamado, cartório ou tema…"
                className="h-10 min-w-0 pl-9"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full justify-between px-3"
              aria-expanded={mobileFiltersOpen}
              onClick={() => setMobileFiltersOpen((open) => !open)}
            >
              <span className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros avançados
                {filtrosAtivos > 0 && (
                  <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1.5 text-[10px]">
                    {filtrosAtivos}
                  </Badge>
                )}
              </span>
              <span className="text-xs text-muted-foreground">
                {mobileFiltersOpen ? "Ocultar" : "Mostrar"}
              </span>
            </Button>
          </div>

          <div
            className={cn(
              "grid min-w-0 grid-cols-1 gap-2 md:flex md:flex-wrap md:items-center",
              !mobileFiltersOpen && "hidden md:flex"
            )}
          >
            <Filter className="hidden h-4 w-4 shrink-0 text-muted-foreground md:block" />
            <Select value={produto} onValueChange={setProduto}>
              <SelectTrigger aria-label="Filtrar por produto" className="h-10 w-full md:h-8 md:w-[150px]"><SelectValue placeholder="Produto" /></SelectTrigger>
              <SelectContent>
                {PRODUTOS.map((p) => (
                  <SelectItem key={p} value={p}>{p === "todos" ? "Todos os produtos" : p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={natureza} onValueChange={setNatureza}>
              <SelectTrigger aria-label="Filtrar por natureza" className="h-10 w-full md:h-8 md:w-[190px]"><SelectValue placeholder="Natureza" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as naturezas</SelectItem>
                {opcoes.naturezas.map((n) => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger aria-label="Filtrar por status" className="h-10 w-full md:h-8 md:w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="abertos">Em aberto</SelectItem>
                <SelectItem value="concluidos">Concluídos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={criticidade} onValueChange={setCriticidade}>
              <SelectTrigger aria-label="Filtrar por criticidade" className="h-10 w-full md:h-8 md:w-[160px]"><SelectValue placeholder="Criticidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Toda criticidade</SelectItem>
                {opcoes.criticidades.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger aria-label="Filtrar por período" className="h-10 w-full md:h-8 md:w-[180px]"><SelectValue placeholder="Período" /></SelectTrigger>
              <SelectContent>
                {PERIODOS.map((p) => (
                  <SelectItem key={p.valor} value={p.valor}>{p.rotulo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {periodo === "custom" && (
              <div className="grid min-w-0 grid-cols-2 gap-2 md:flex md:items-center md:gap-1.5">
                <label className="min-w-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:contents">
                  <span className="mb-1 block md:sr-only">De</span>
                  <Input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="h-10 w-full min-w-0 px-2 md:h-8 md:w-[150px]"
                    title="Abertura a partir de"
                  />
                </label>
                <span className="hidden text-xs text-muted-foreground md:inline">até</span>
                <label className="min-w-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:contents">
                  <span className="mb-1 block md:sr-only">Até</span>
                  <Input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="h-10 w-full min-w-0 px-2 md:h-8 md:w-[150px]"
                    title="Abertura até"
                  />
                </label>
              </div>
            )}
            <div className="relative hidden min-w-[200px] flex-1 md:block">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar nº, título, cartório ou tema…"
                className="h-8 pl-8"
              />
            </div>
          </div>
          {(tema || cartorio || temFiltroFino) && (
            <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs">
              {tema && (
                <Badge variant="secondary" className="max-w-full gap-1">
                  <span className="truncate">tema: {tema}</span>
                  <button type="button" className="shrink-0" aria-label="Remover filtro de tema" onClick={() => setTema(null)}><X className="h-3 w-3" /></button>
                </Badge>
              )}
              {cartorio && (
                <Badge variant="secondary" className="max-w-full gap-1">
                  <span className="truncate">cartório: {cartorio}</span>
                  <button type="button" className="shrink-0" aria-label="Remover filtro de cartório" onClick={() => setCartorio(null)}><X className="h-3 w-3" /></button>
                </Badge>
              )}
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={limparFiltros}>
                Limpar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando panorama…
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-red-600">
            Erro ao carregar o panorama de chamados.
          </CardContent>
        </Card>
      ) : !data || filtrados.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-sm text-muted-foreground">
            Nenhum chamado de pós no recorte — ajuste os filtros ou amplie o período.
            {data && data.projetosEmPos > 0 && (
              <span className="block mt-1 text-[11px]">
                ({data.projetosEmPos} projetos com pós na base)
              </span>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <nav
            className="grid grid-cols-3 gap-1 rounded-xl border bg-muted/30 p-1 md:hidden"
            aria-label="Seções do panorama"
          >
            {([
              ["resumo", "Resumo"],
              ["chamados", `Chamados (${filtrados.length})`],
              ["parecer", "Parecer IA"],
            ] as const).map(([section, label]) => (
              <button
                key={section}
                type="button"
                aria-pressed={mobileSection === section}
                onClick={() => setMobileSection(section)}
                className={cn(
                  "min-w-0 rounded-lg px-2 py-2 text-[11px] font-bold leading-tight transition-colors",
                  mobileSection === section
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                <span className="break-words">{label}</span>
              </button>
            ))}
          </nav>

          {/* KPIs */}
          <div
            data-testid="panorama-mobile-summary"
            className={cn(
              "grid grid-cols-2 gap-2 lg:grid-cols-5",
              mobileSection !== "resumo" && "hidden md:grid"
            )}
          >
            {[
              { label: "Chamados no recorte", value: String(filtrados.length), icon: Headset },
              { label: "Cartórios envolvidos", value: String(agg.cartorios.length), icon: Building2 },
              {
                label: escopo === "abertos" ? "Projetos em pós agora" : "Projetos com pós",
                value: String(data.projetosEmPos),
                icon: FolderKanban,
              },
              {
                label: "Concluídos",
                value: `${agg.concluidos} (${Math.round((agg.concluidos / filtrados.length) * 100)}%)`,
                icon: CheckCircle2,
              },
              { label: "Temas distintos (IA)", value: String(agg.temas.length), icon: Tags },
            ].map((t, index) => (
              <Card key={t.label} className={cn("min-w-0", index === 4 && "col-span-2 lg:col-span-1")}>
                <CardContent className="flex min-w-0 items-center gap-2 p-2.5 sm:gap-2.5 sm:p-3">
                  <t.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="break-words text-base font-bold leading-none sm:text-lg">{t.value}</p>
                    <p className="mt-1 break-words text-[9px] leading-tight text-muted-foreground sm:text-[10px]">{t.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Grade 2x2 alinhada: todos os cards com a MESMA altura de conteudo */}
          <div
            className={cn(
              "grid min-w-0 gap-3 lg:grid-cols-2",
              mobileSection !== "resumo" && "hidden md:grid"
            )}
          >
            {/* Temas recorrentes */}
            <Card className="flex min-w-0 flex-col">
              <CardHeader className="px-4 py-2.5">
                <CardTitle className="min-w-0 text-sm font-semibold">
                  <span className="flex items-start gap-1.5">
                    <Tags className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                    <span className="break-words">Temas recorrentes entre cartórios</span>
                  </span>
                  <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">toque para filtrar</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[320px] overflow-y-auto px-3 pb-3 pt-0 sm:px-4 md:h-[280px]">
                {agg.temas.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {agg.semTema > 0
                      ? "Os chamados deste recorte ainda estão sendo categorizados pela IA na VM."
                      : "Sem temas neste recorte."}
                  </p>
                ) : (
                  <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                    {agg.temas.slice(0, 12).map((t) => (
                      <button
                        key={t.tema}
                        type="button"
                        onClick={() => setTema(tema === t.tema ? null : t.tema)}
                        className={cn(
                          "flex w-full min-w-0 flex-col items-stretch gap-1.5 rounded px-2 py-2 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/40 sm:flex-row sm:items-center sm:justify-between",
                          tema === t.tema && "bg-indigo-50 dark:bg-indigo-950/30"
                        )}
                      >
                        <span className="min-w-0 break-words text-sm font-medium sm:truncate">{t.tema}</span>
                        <span className="flex flex-wrap items-center gap-2 text-xs sm:shrink-0 sm:flex-nowrap">
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-normal pointer-events-none",
                              t.cartorios > 1 &&
                                "border-amber-300 text-amber-700 dark:border-amber-900 dark:text-amber-400"
                            )}
                          >
                            <Building2 className="h-3 w-3 mr-1" />
                            {t.cartorios} cartório{t.cartorios === 1 ? "" : "s"}
                          </Badge>
                          <span className="text-muted-foreground tabular-nums">
                            {t.chamados} chamado{t.chamados === 1 ? "" : "s"}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {agg.semTema > 0 && agg.temas.length > 0 && (
                  <p className="text-[11px] text-muted-foreground italic mt-2">
                    +{agg.semTema} chamado{agg.semTema === 1 ? "" : "s"} aguardando categorização da IA.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Naturezas */}
            <Card className="flex min-w-0 flex-col">
              <CardHeader className="px-4 py-2.5">
                <CardTitle className="text-sm font-semibold">
                  <span className="block">Chamados por natureza</span>
                  <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">toque para filtrar</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 pt-0 sm:px-4">
                <div className="space-y-1 md:hidden">
                  {agg.porNatureza.slice(0, 8).map((item) => {
                    const max = agg.porNatureza[0]?.total || 1;
                    return (
                      <button
                        key={item.natureza}
                        type="button"
                        onClick={() => setNatureza(natureza === item.natureza ? "todas" : item.natureza)}
                        className={cn(
                          "w-full min-w-0 rounded-lg px-2 py-2 text-left transition-colors",
                          natureza === item.natureza
                            ? "bg-indigo-50 dark:bg-indigo-950/30"
                            : "hover:bg-muted/50"
                        )}
                      >
                        <span className="flex min-w-0 items-start justify-between gap-2 text-xs">
                          <span className="break-words font-medium">{item.natureza}</span>
                          <span className="shrink-0 font-bold tabular-nums">{item.total}</span>
                        </span>
                        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-muted">
                          <span
                            className="block h-full rounded-full"
                            style={{ width: `${(item.total / max) * 100}%`, background: "var(--viz-bar)" }}
                          />
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="hidden h-[280px] md:block">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={agg.porNatureza.slice(0, 8)}
                      layout="vertical"
                      margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
                    >
                      <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeDasharray="0" />
                      <XAxis type="number" hide allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="natureza"
                        width={180}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      />
                      <Tooltip
                        cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                        formatter={(v: number) => [`${v} chamado${v === 1 ? "" : "s"}`, ""]}
                        separator=""
                        contentStyle={{
                          background: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Bar
                        dataKey="total"
                        fill="var(--viz-bar)"
                        barSize={16}
                        radius={[0, 4, 4, 0]}
                        className="cursor-pointer"
                        onClick={(d: { natureza?: string }) =>
                          d?.natureza && setNatureza(natureza === d.natureza ? "todas" : d.natureza)
                        }
                      >
                        <LabelList
                          dataKey="total"
                          position="right"
                          style={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 600 }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Ranking de cartorios */}
            <Card className="flex min-w-0 flex-col">
                <CardHeader className="px-4 py-2.5">
                  <CardTitle className="min-w-0 text-sm font-semibold">
                    <span className="flex items-start gap-1.5">
                      <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <span className="break-words">Cartórios com mais chamados no pós</span>
                    </span>
                    <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">toque para filtrar</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-[320px] space-y-0.5 overflow-y-auto px-3 pb-3 pt-0 sm:px-4 md:h-[280px]">
                  {agg.cartorios.slice(0, 8).map(([nome, n]) => {
                    const max = agg.cartorios[0]?.[1] || 1;
                    return (
                      <button
                        key={nome}
                        type="button"
                        onClick={() => setCartorio(cartorio === nome ? null : nome)}
                        className={cn(
                          "w-full text-left px-2 py-1 rounded hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-colors",
                          cartorio === nome && "bg-indigo-50 dark:bg-indigo-950/30"
                        )}
                      >
                        <div className="mb-1 flex min-w-0 items-start justify-between gap-2 text-xs">
                          <span className="break-words font-medium sm:truncate">{nome}</span>
                          <span className="tabular-nums font-semibold shrink-0">{n}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${(n / max) * 100}%`, background: "var(--viz-bar)" }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </CardContent>
            </Card>

            {/* Tendencia mensal */}
            <Card className="flex min-w-0 flex-col">
              <CardHeader className="px-4 py-2.5">
                <CardTitle className="text-sm font-semibold">
                  <span className="block">Tendência mensal</span>
                  <span className="mt-0.5 block text-[10px] font-normal leading-relaxed text-muted-foreground">
                    as implantações estão gerando menos chamados de pós ao longo do tempo?
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 pt-0 sm:px-4">
                {agg.porMes.length > 1 ? (
                  <>
                    <div className="grid grid-cols-3 gap-2 md:hidden">
                      {agg.porMes.slice(-6).map((item) => (
                        <div key={item.mes} className="rounded-lg border bg-muted/20 p-2 text-center">
                          <p className="text-base font-bold tabular-nums">{item.total}</p>
                          <p className="mt-0.5 text-[10px] uppercase text-muted-foreground">{item.mes}</p>
                        </div>
                      ))}
                    </div>
                    <div className="hidden h-[280px] md:block">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={agg.porMes} margin={{ top: 16, right: 8, bottom: 0, left: 8 }}>
                          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="0" />
                          <XAxis
                            dataKey="mes"
                            tickLine={false}
                            axisLine={{ stroke: "hsl(var(--border))" }}
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                          />
                          <YAxis hide allowDecimals={false} />
                          <Tooltip
                            cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                            formatter={(v: number) => [`${v} chamado${v === 1 ? "" : "s"}`, ""]}
                            separator=""
                            contentStyle={{
                              background: "hsl(var(--background))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: 8,
                              fontSize: 12,
                            }}
                          />
                          <Bar dataKey="total" fill="var(--viz-bar)" barSize={28} radius={[4, 4, 0, 0]}>
                            <LabelList
                              dataKey="total"
                              position="top"
                              style={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 600 }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                ) : (
                  <p className="pb-3 text-xs text-muted-foreground">
                    Sem meses suficientes no recorte para mostrar tendência.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Projetos do cartorio selecionado — atalho direto pro projeto */}
          {cartorio && (
            <Card className={cn("min-w-0", mobileSection !== "resumo" && "hidden md:block")}>
              <CardHeader className="flex flex-col items-stretch gap-2 space-y-0 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex min-w-0 items-start gap-1.5 text-sm font-semibold">
                  <FolderKanban className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                  <span className="break-words">Projetos de {cartorio}</span>
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-8 justify-center gap-1 text-xs sm:h-7 sm:shrink-0" onClick={() => setCartorio(null)}>
                  <X className="h-3.5 w-3.5" /> Fechar
                </Button>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0">
                {projetosDoCartorio.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum projeto com pós deste cartório.</p>
                ) : (
                  <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800/60 overflow-hidden">
                    {projetosDoCartorio.map((p) => (
                      <div key={p.id} className="flex min-w-0 flex-col items-stretch gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:py-1.5">
                        <div className="min-w-0">
                          <p className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-semibold">
                            <Badge variant="outline" className="text-[10px] font-normal pointer-events-none">
                              {p.produto}
                            </Badge>
                            <span className="font-mono text-muted-foreground">#{p.ticket}</span>
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            Pós: {fmtDateBr(p.inicioPos)} → {p.posConcluido ? fmtDateBr(p.fimPos) : "em andamento"}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 w-full gap-1 text-xs sm:h-7 sm:w-auto sm:shrink-0"
                          onClick={() => navigate(`/projects/${p.id}`)}
                          title="Abrir a tela do projeto"
                        >
                          Abrir projeto <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Lista de chamados do recorte */}
          <Card
            data-testid="panorama-mobile-tickets"
            className={cn("min-w-0", mobileSection !== "chamados" && "hidden md:block")}
          >
            <CardHeader className="px-4 py-2.5">
              <CardTitle className="text-sm font-semibold">
                Chamados do recorte{" "}
                <span className="text-muted-foreground font-normal">({filtrados.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0 sm:px-4">
              <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800/60 overflow-hidden">
                {paginados.map((c) => {
                  const critico = isCriticoAberto(c);
                  return (
                  <button
                    key={c.numeroChamado}
                    type="button"
                    onClick={() => setChamadoSelecionado(c)}
                    className={cn(
                      "w-full min-w-0 px-3 py-3 text-left transition-colors sm:py-1.5",
                      critico
                        ? "bg-red-50/70 dark:bg-red-950/20 border-l-2 border-l-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                        : "hover:bg-neutral-50 dark:hover:bg-neutral-900/40"
                    )}
                    title="Ver detalhes do chamado"
                  >
                    <div className="flex min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="min-w-0 break-words text-xs font-semibold sm:truncate">
                        <span className="text-indigo-600 dark:text-indigo-400 font-mono">#{c.numeroChamado}</span>{" "}
                        {c.titulo || "(sem título)"}
                      </span>
                      <span className="flex flex-wrap items-center gap-1.5 sm:shrink-0 sm:flex-nowrap">
                        {critico && (
                          <Badge className="text-[10px] pointer-events-none bg-red-600 hover:bg-red-600 text-white gap-0.5">
                            <TriangleAlert className="h-2.5 w-2.5" />
                            CRÍTICO
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] font-normal pointer-events-none">
                          {c.projetoProduto}
                        </Badge>
                        <Badge className={cn("text-[10px] pointer-events-none", statusBadgeClass(c.status))}>
                          {c.status || "—"}
                        </Badge>
                      </span>
                    </div>
                    <div className="mt-2 grid min-w-0 gap-1 text-[11px] text-muted-foreground sm:mt-0.5 sm:flex sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1">
                      <span className="break-words font-medium text-foreground/80 sm:min-w-0 sm:truncate">{c.projetoCliente}</span>
                      <span className="break-words">{c.natureza || "—"}</span>
                      {c.tema && <span className="break-words italic">“{c.tema}”</span>}
                      <span className="flex items-center gap-1 sm:shrink-0">
                        <CalendarDays className="h-3 w-3" />
                        {fmtDateBr(c.dataAbertura)}
                        {" → "}
                        {c.dataEncerramento ? (
                          fmtDateBr(c.dataEncerramento)
                        ) : critico ? (
                          <span className="text-red-600 dark:text-red-400 font-semibold">
                            aberto há {diasDesde(c.dataAbertura)} d
                          </span>
                        ) : (
                          "aberto"
                        )}
                      </span>
                    </div>
                  </button>
                  );
                })}
              </div>

              {/* Paginacao */}
              {filtrados.length > 0 && (
                <div className="mt-3 flex min-w-0 flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
                  <div className="flex min-w-0 items-center justify-between gap-2 sm:justify-start">
                    <Select
                      value={String(porPagina)}
                      onValueChange={(v) => {
                        setPorPagina(Number(v));
                        setPagina(1);
                      }}
                    >
                      <SelectTrigger aria-label="Itens por página" className="h-7 w-[64px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[6, 15, 30, 50].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="min-w-0 text-right sm:text-left">
                      por página · {(paginaAtual - 1) * porPagina + 1}–
                      {Math.min(paginaAtual * porPagina, filtrados.length)} de {filtrados.length}
                    </span>
                  </div>
                  <div className="grid w-full grid-cols-[2.25rem_1fr_2.25rem] items-center gap-2 sm:flex sm:w-auto sm:gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 gap-1 p-0 text-xs sm:h-7 sm:w-auto sm:px-3"
                      aria-label="Página anterior"
                      disabled={paginaAtual <= 1}
                      onClick={() => setPagina(paginaAtual - 1)}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Anterior</span>
                    </Button>
                    <span className="text-center tabular-nums sm:px-2">
                      página {paginaAtual} de {totalPaginas}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 gap-1 p-0 text-xs sm:h-7 sm:w-auto sm:px-3"
                      aria-label="Próxima página"
                      disabled={paginaAtual >= totalPaginas}
                      onClick={() => setPagina(paginaAtual + 1)}
                    >
                      <span className="hidden sm:inline">Próxima</span> <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Parecer IA da carteira */}
          <Card
            data-testid="panorama-mobile-ai"
            className={cn("min-w-0", mobileSection !== "parecer" && "hidden md:block")}
          >
            <CardHeader className="flex flex-col items-stretch gap-2 space-y-0 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-2.5">
              <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
                <Sparkles className="h-4 w-4 shrink-0 text-indigo-500" />
                <span className="break-words">Parecer da IA — carteira</span>
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 w-full gap-1 text-xs sm:h-7 sm:w-auto sm:shrink-0"
                onClick={handleGerarParecer}
                disabled={!!parecerAtivo || !workerOnline || filtrados.length === 0}
                title={
                  !workerOnline
                    ? "O gerador da IA está offline no momento"
                    : parecerAtivo
                    ? "Aguarde o parecer em andamento"
                    : "Analisa o recorte atual (temas, cartórios, críticos) e escreve o parecer executivo"
                }
              >
                {parecerAtivo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {ultimoParecer ? "Atualizar parecer" : "Gerar parecer"}
              </Button>
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              {parecerAtivo ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {parecerAtivo.progress || "Gerando parecer da carteira…"}
                </p>
              ) : ultimoParecer?.resultText ? (
                <div className="text-sm">
                  <MarkdownLite text={ultimoParecer.resultText} />
                  <p className="text-[10px] text-muted-foreground mt-2">
                    gerado em{" "}
                    {new Date(ultimoParecer.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}{" "}
                    — reflete o recorte usado no momento da geração
                  </p>
                </div>
              ) : ultimoErro ? (
                <p className="text-xs text-red-600">Falha no último parecer: {ultimoErro.errorMessage}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  A IA analisa o recorte atual — temas sistêmicos (2+ cartórios), equilíbrio dúvidas vs
                  bugs, críticos em aberto — e escreve o parecer executivo da carteira.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Chamado0800DetailDialog chamado={chamadoSelecionado} onClose={() => setChamadoSelecionado(null)} />
    </div>
  );
}

/** Tela operacional: só projetos com pós EM ANDAMENTO. */
export default function PosPanorama() {
  return (
    <PanoramaBase
      escopo="abertos"
      titulo="Panorama Pós-Implantação"
      descricao="Somente projetos com pós EM ANDAMENTO — chamados abertos dentro do período de pós de cada projeto (cliente + produto)."
    />
  );
}
