import { useMemo, useState } from "react";
import { ProjectV2 } from "@/types/ProjectV2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useChamados0800,
  useSolicitarSyncChamados0800,
  useBenchmarkPos,
  useParecerPos,
  Chamado0800,
} from "@/hooks/useChamados0800";
import {
  Chamado0800DetailDialog,
  fmtDateBr,
  statusBadgeClass,
} from "@/components/ProjectManagement/Chamado0800DetailDialog";
import { useModelWorkerStatus } from "@/hooks/useModelGenerationJobs";
import { toast } from "sonner";
import {
  RefreshCw,
  Loader2,
  Headset,
  CircleDot,
  CheckCircle2,
  Timer,
  GraduationCap,
  Bug,
  Shapes,
  X,
  Sparkles,
  FileDown,
  Scale,
  CalendarDays,
  Tags,
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

interface PosImplantacaoTabProps {
  project: ProjectV2;
}

type Eixo = "duvidas" | "erros" | "outros";
type Filtro =
  | { tipo: "natureza"; valor: string }
  | { tipo: "eixo"; valor: Eixo }
  | { tipo: "criticidade"; valor: string }
  | { tipo: "tema"; valor: string }
  | null;

const EIXO_LABEL: Record<Eixo, string> = {
  duvidas: "Dúvidas de uso",
  erros: "Erros e bugs",
  outros: "Outros",
};

/**
 * Classifica a natureza do chamado em uma das tres leituras de diagnostico:
 * - "duvidas": usuarios com dificuldade de uso -> capacitacao/treinamento
 * - "erros":   bugs e erros do produto/ambiente -> qualidade tecnica
 * - "outros":  comercial, solicitacoes, etc.
 */
function bucketNatureza(natureza?: string): Eixo {
  const n = (natureza || "").toLowerCase();
  if (n.includes("dúvida") || n.includes("duvida")) return "duvidas";
  if (n.includes("bug") || n.includes("erro")) return "erros";
  return "outros";
}

const hojeIso = (): string => new Date().toISOString().slice(0, 10);

const diasEntre = (a: string, b: string): number =>
  Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));

const escapeHtml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function montarLeitura(
  total: number,
  pctDuvidas: number,
  pctErros: number,
  concentradoNoInicio: boolean
): string {
  if (total === 0) return "";
  let leitura: string;
  if (pctDuvidas >= 50) {
    leitura =
      `A maioria dos chamados (${pctDuvidas}%) são dúvidas de uso — sinal de que o cliente precisa de reforço ` +
      `de capacitação. Vale revisar o treinamento aplicado na implantação e o material de apoio entregue.`;
  } else if (pctErros >= 50) {
    leitura =
      `A maioria dos chamados (${pctErros}%) são erros ou bugs — o atrito do pós está mais no produto/ambiente ` +
      `do que na capacitação. Vale revisar a preparação de ambiente e reportar os bugs recorrentes ao time de produto.`;
  } else {
    leitura =
      `Perfil misto: ${pctDuvidas}% dúvidas de uso e ${pctErros}% erros/bugs. Nenhuma causa domina — acompanhe ` +
      `os dois eixos (capacitação e qualidade técnica) nas próximas semanas do pós.`;
  }
  if (concentradoNoInicio) {
    leitura +=
      " Os chamados se concentram nas duas primeiras semanas do pós — curva de adaptação típica, tende a ceder.";
  }
  return leitura;
}

/**
 * Aba "Análise Pós-Implantação": leitura analítica dos chamados 0800 que o
 * cliente abriu durante o pós (mesma fonte do card da etapa 7 — espelho
 * chamados_0800, filtrado pelo produto do projeto): KPIs, natureza, temas IA,
 * criticidade, benchmark com a carteira, parecer com IA e exportação em PDF.
 * Todo gráfico/indicador é clicável e abre a lista de chamados do recorte.
 */
export function PosImplantacaoTab({ project }: PosImplantacaoTabProps) {
  const post = project.stages.post;
  const fimEfetivo = post?.status === "done" ? post?.endDate : undefined;
  const { chamados, clienteResolvido, lastSyncedAt, isLoading, error, parametrosIncompletos } =
    useChamados0800(project.ticketNumber, post?.startDate, fimEfetivo, project.systemType);
  const { solicitarSync, syncing } = useSolicitarSyncChamados0800();
  const { data: benchmark } = useBenchmarkPos(project.systemType, project.ticketNumber);
  const { gerarParecer, ativo: parecerAtivo, ultimo: ultimoParecer, ultimoErro } =
    useParecerPos(project.id);
  const { online: workerOnline } = useModelWorkerStatus();

  const [filtro, setFiltro] = useState<Filtro>(null);
  const [selecionado, setSelecionado] = useState<Chamado0800 | null>(null);
  const [exporting, setExporting] = useState(false);

  const stats = useMemo(() => {
    const hoje = hojeIso();
    const concluidos = chamados.filter((c) => !!c.dataEncerramento);
    const abertos = chamados.filter((c) => !c.dataEncerramento);
    const temposDias = concluidos
      .filter((c) => c.dataAbertura && c.dataEncerramento)
      .map((c) => diasEntre(c.dataAbertura as string, c.dataEncerramento as string));
    const tempoMedio =
      temposDias.length > 0
        ? Math.round((temposDias.reduce((s, n) => s + n, 0) / temposDias.length) * 10) / 10
        : null;
    const maisAntigoAberto = abertos
      .filter((c) => c.dataAbertura)
      .reduce<number>((max, c) => Math.max(max, diasEntre(c.dataAbertura as string, hoje)), 0);

    const contar = (key: (c: Chamado0800) => string | undefined) => {
      const map = new Map<string, number>();
      for (const c of chamados) {
        const k = key(c);
        if (!k) continue;
        map.set(k, (map.get(k) ?? 0) + 1);
      }
      return [...map.entries()].sort((a, b) => b[1] - a[1]);
    };

    const porNatureza = contar((c) => c.natureza || "Sem natureza").map(([natureza, total]) => ({
      natureza,
      total,
    }));
    const porCriticidade = contar((c) => c.criticidade || "Sem criticidade");
    const porTema = contar((c) => c.tema);
    const temPendenteTema = chamados.some((c) => !c.tema);

    const eixos: Record<Eixo, number> = { duvidas: 0, erros: 0, outros: 0 };
    for (const c of chamados) eixos[bucketNatureza(c.natureza)]++;
    const pct = (n: number) => (chamados.length ? Math.round((n / chamados.length) * 100) : 0);

    // Chamados por semana do pos (semana 1 = inicio do pos)
    const inicioPos = post?.startDate ? new Date(post.startDate) : null;
    const porSemanaMap = new Map<number, number>();
    if (inicioPos) {
      const inicioIso = inicioPos.toISOString().slice(0, 10);
      for (const c of chamados) {
        if (!c.dataAbertura) continue;
        const semana = Math.floor(diasEntre(inicioIso, c.dataAbertura) / 7) + 1;
        porSemanaMap.set(semana, (porSemanaMap.get(semana) ?? 0) + 1);
      }
    }
    const maxSemana = porSemanaMap.size ? Math.max(...porSemanaMap.keys()) : 0;
    const porSemana = Array.from({ length: maxSemana }, (_, i) => ({
      semana: `Sem ${i + 1}`,
      total: porSemanaMap.get(i + 1) ?? 0,
    }));
    const nasDuasPrimeiras = (porSemanaMap.get(1) ?? 0) + (porSemanaMap.get(2) ?? 0);
    const concentradoNoInicio =
      chamados.length >= 5 && maxSemana > 2 && nasDuasPrimeiras / chamados.length >= 0.6;

    return {
      total: chamados.length,
      abertos: abertos.length,
      concluidos: concluidos.length,
      tempoMedio,
      maisAntigoAberto,
      porNatureza,
      porCriticidade,
      porTema,
      temPendenteTema,
      eixos,
      leitura: montarLeitura(chamados.length, pct(eixos.duvidas), pct(eixos.erros), concentradoNoInicio),
      porSemana,
    };
  }, [chamados, post?.startDate]);

  const filtrados = useMemo(() => {
    if (!filtro) return [];
    return chamados.filter((c) => {
      if (filtro.tipo === "natureza") return (c.natureza || "Sem natureza") === filtro.valor;
      if (filtro.tipo === "eixo") return bucketNatureza(c.natureza) === filtro.valor;
      if (filtro.tipo === "criticidade") return (c.criticidade || "Sem criticidade") === filtro.valor;
      return c.tema === filtro.valor;
    });
  }, [chamados, filtro]);

  const filtroLabel = !filtro
    ? ""
    : filtro.tipo === "eixo"
    ? EIXO_LABEL[filtro.valor]
    : filtro.valor;

  const handleSyncAgora = async () => {
    try {
      await solicitarSync();
      toast.success("Chamados sincronizados com o 0800.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao sincronizar com o 0800.");
    }
  };

  const handleGerarParecer = async () => {
    try {
      const payload = {
        cliente: project.clientName,
        produto: project.systemType,
        periodo_pos: {
          inicio: post?.startDate ? new Date(post.startDate).toISOString().slice(0, 10) : null,
          termino_planejado: post?.endDate ? new Date(post.endDate).toISOString().slice(0, 10) : null,
          status: post?.status,
        },
        chamados: chamados.map((c) => ({
          numero: c.numeroChamado,
          titulo: c.titulo,
          natureza: c.natureza,
          tema: c.tema,
          status: c.status,
          criticidade: c.criticidade,
          abertura: c.dataAbertura,
          encerramento: c.dataEncerramento,
        })),
      };
      await gerarParecer(JSON.stringify(payload));
      toast.success("Gerando o parecer com IA. Isso pode levar alguns instantes.");
    } catch (err) {
      console.error("Erro ao enfileirar parecer:", err);
      toast.error("Não foi possível iniciar o parecer com IA.");
    }
  };

  const exportPdf = async () => {
    if (exporting || stats.total === 0) return;
    setExporting(true);
    toast.loading("Gerando PDF...", { id: "pos-analysis-pdf" });
    const holder = document.createElement("div");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const linhas = (pares: [string, string][]) =>
        pares
          .map(
            ([k, v]) =>
              `<tr><td class="k">${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`
          )
          .join("");
      const listaContagem = (itens: [string, number][]) =>
        itens
          .map(
            ([k, v]) =>
              `<tr><td>${escapeHtml(k)}</td><td style="text-align:right;font-weight:600;">${v}</td></tr>`
          )
          .join("");

      const periodo = `${post?.startDate ? fmtDateBr(new Date(post.startDate).toISOString().slice(0, 10)) : "—"} a ${
        post?.status === "done" && post?.endDate
          ? fmtDateBr(new Date(post.endDate).toISOString().slice(0, 10))
          : "hoje (pós em andamento)"
      }`;

      const chamadosRows = chamados
        .map(
          (c) => `<tr>
            <td>#${escapeHtml(c.numeroChamado)}</td>
            <td>${escapeHtml(c.titulo || "")}</td>
            <td>${escapeHtml(c.natureza || "")}</td>
            <td>${escapeHtml(c.tema || "")}</td>
            <td>${escapeHtml(c.status || "")}</td>
            <td>${escapeHtml(fmtDateBr(c.dataAbertura))}</td>
          </tr>`
        )
        .join("");

      holder.style.cssText = "position:fixed;left:-99999px;top:0;width:794px;background:#ffffff;";
      holder.innerHTML = `
        <div style="width:794px;padding:48px 56px;box-sizing:border-box;background:#ffffff;color:#0f172a;font-family:'Segoe UI',Calibri,Arial,sans-serif;">
          <div style="border-bottom:3px solid #ad0505;padding-bottom:14px;margin-bottom:20px;">
            <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#ad0505;font-weight:700;">Análise Pós-Implantação</div>
            <div style="font-size:22px;font-weight:700;margin-top:4px;">${escapeHtml(project.clientName || "")}</div>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:12.5px;margin-bottom:20px;">
            <style>td{padding:4px 8px;vertical-align:top;border-bottom:1px solid #eef2f7;} td.k{color:#64748b;font-weight:600;width:170px;white-space:nowrap;} h3{font-size:13px;margin:18px 0 6px;}</style>
            ${linhas([
              ["Produto", project.systemType || "—"],
              ["Período do pós", periodo],
              ["Chamados no período", String(stats.total)],
              ["Em aberto / concluídos", `${stats.abertos} / ${stats.concluidos}`],
              ["Resolução média", stats.tempoMedio !== null ? `${stats.tempoMedio} dias` : "—"],
              [
                "Benchmark da carteira",
                benchmark
                  ? `mediana ${benchmark.mediana} chamados (${benchmark.projetos} projetos ${project.systemType})`
                  : "sem base de comparação",
              ],
              ["Emitido em", new Date().toLocaleDateString("pt-BR")],
            ])}
          </table>
          <h3 style="font-size:13px;">Chamados por natureza</h3>
          <table style="width:100%;border-collapse:collapse;font-size:12px;">${listaContagem(
            stats.porNatureza.map((n) => [n.natureza, n.total] as [string, number])
          )}</table>
          ${
            stats.porTema.length
              ? `<h3 style="font-size:13px;">Temas (IA)</h3>
          <table style="width:100%;border-collapse:collapse;font-size:12px;">${listaContagem(stats.porTema)}</table>`
              : ""
          }
          <h3 style="font-size:13px;">Diagnóstico</h3>
          <table style="width:100%;border-collapse:collapse;font-size:12px;">${listaContagem([
            [EIXO_LABEL.duvidas, stats.eixos.duvidas],
            [EIXO_LABEL.erros, stats.eixos.erros],
            [EIXO_LABEL.outros, stats.eixos.outros],
          ])}</table>
          <p style="font-size:12px;line-height:1.55;color:#1e293b;">${escapeHtml(stats.leitura)}</p>
          ${
            ultimoParecer?.resultText
              ? `<h3 style="font-size:13px;">Parecer da IA</h3>
          <p style="font-size:12px;line-height:1.55;color:#1e293b;white-space:pre-wrap;">${escapeHtml(ultimoParecer.resultText)}</p>`
              : ""
          }
          <h3 style="font-size:13px;">Chamados do período</h3>
          <table style="width:100%;border-collapse:collapse;font-size:10.5px;">
            <tr style="color:#64748b;font-weight:600;"><td>Nº</td><td>Título</td><td>Natureza</td><td>Tema</td><td>Status</td><td>Abertura</td></tr>
            ${chamadosRows}
          </table>
          <div style="margin-top:32px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:10.5px;color:#94a3b8;text-align:center;">
            Gerado pelo SiplanHUB — ${escapeHtml(project.clientName || "")}
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
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`analise-pos-${(project.clientName || "projeto").replace(/[^\w-]+/g, "_")}.pdf`);
      toast.success("PDF gerado.", { id: "pos-analysis-pdf" });
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      toast.error("Falha ao gerar o PDF.", { id: "pos-analysis-pdf" });
    } finally {
      holder.remove();
      setExporting(false);
    }
  };

  // ----- Estados vazios -----
  if (parametrosIncompletos) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Para gerar a análise, o projeto precisa do <strong>nº do chamado</strong> válido e da{" "}
          <strong>data de início do Pós-Implantação</strong> (etapa 7, aba Etapas).
        </CardContent>
      </Card>
    );
  }
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando chamados do período…
      </div>
    );
  }
  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-red-600">
          Erro ao carregar os chamados do espelho 0800.
        </CardContent>
      </Card>
    );
  }
  if (!clienteResolvido) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Cliente ainda não sincronizado com o 0800 — o espelho atualiza a cada ~5 min.
        </CardContent>
      </Card>
    );
  }

  const tiles = [
    { label: "Chamados no pós", value: String(stats.total), sub: undefined as string | undefined, icon: Headset },
    {
      label: "Em aberto",
      value: String(stats.abertos),
      sub: stats.abertos > 0 ? `mais antigo há ${stats.maisAntigoAberto} d` : undefined,
      icon: CircleDot,
    },
    { label: "Concluídos", value: String(stats.concluidos), sub: undefined, icon: CheckCircle2 },
    {
      label: "Resolução média",
      value: stats.tempoMedio !== null ? `${stats.tempoMedio} d` : "—",
      sub: undefined,
      icon: Timer,
    },
  ];

  const bucketRows: { eixo: Eixo; hint: string; icon: typeof Bug; valor: number }[] = [
    { eixo: "duvidas", hint: "capacitação / treinamento", icon: GraduationCap, valor: stats.eixos.duvidas },
    { eixo: "erros", hint: "produto / ambiente", icon: Bug, valor: stats.eixos.erros },
    { eixo: "outros", hint: "comercial, solicitações…", icon: Shapes, valor: stats.eixos.outros },
  ];

  const benchmarkVeredito = !benchmark
    ? null
    : stats.total <= benchmark.mediana
    ? { texto: "dentro do esperado da carteira", classe: "text-emerald-600 dark:text-emerald-400" }
    : stats.total <= benchmark.mediana * 1.5
    ? { texto: "um pouco acima da carteira", classe: "text-amber-600 dark:text-amber-400" }
    : { texto: "bem acima da carteira — atenção", classe: "text-red-600 dark:text-red-400" };

  return (
    <div className="space-y-4 [--viz-bar:#2a78d6] dark:[--viz-bar:#3987e5]">
      {/* Cabecalho: periodo analisado + acoes */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground">
          Chamados 0800 de <strong>{project.systemType}</strong> abertos pelo cliente durante o
          pós-implantação
          {post?.status !== "done" && " (em andamento — período corre até hoje)"}.
        </p>
        <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {syncing
            ? "sincronizando…"
            : lastSyncedAt
            ? `sincronizado ${new Date(lastSyncedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`
            : null}
          <button
            type="button"
            onClick={handleSyncAgora}
            disabled={syncing}
            title="Sincronizar com o 0800 agora"
            className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
          </button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={exportPdf}
            disabled={exporting || stats.total === 0}
            title="Exportar esta análise em PDF"
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
            PDF
          </Button>
        </span>
      </div>

      {stats.total === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum chamado de {project.systemType} aberto pelo cliente no período do pós — nada a
            analisar (bom sinal!).
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {tiles.map((t) => (
              <Card key={t.label}>
                <CardContent className="p-4 flex items-center gap-3">
                  <t.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-2xl font-bold leading-none">{t.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {t.label}
                      {t.sub && <span className="text-amber-600 dark:text-amber-400"> · {t.sub}</span>}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Benchmark da carteira */}
          <Card>
            <CardContent className="p-4 flex items-center gap-3 text-sm flex-wrap">
              <Scale className="h-4 w-4 text-muted-foreground shrink-0" />
              {benchmark && benchmarkVeredito ? (
                <p>
                  Este pós: <strong>{stats.total}</strong> chamado{stats.total === 1 ? "" : "s"} · mediana da
                  carteira {project.systemType}: <strong>{benchmark.mediana}</strong> ({benchmark.projetos}{" "}
                  projetos) — <strong className={benchmarkVeredito.classe}>{benchmarkVeredito.texto}</strong>
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Benchmark da carteira: ainda não há outros projetos {project.systemType} com pós
                  sincronizado para comparar.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-4">
            {/* Chamados por natureza (clicavel) */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  Chamados por natureza
                  <span className="ml-2 text-[10px] font-normal text-muted-foreground">clique para ver os chamados</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(160, stats.porNatureza.length * 40)}>
                  <BarChart
                    data={stats.porNatureza}
                    layout="vertical"
                    margin={{ top: 0, right: 32, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeDasharray="0" />
                    <XAxis type="number" hide allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="natureza"
                      width={170}
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
                      barSize={18}
                      radius={[0, 4, 4, 0]}
                      className="cursor-pointer"
                      onClick={(d: { natureza?: string }) =>
                        d?.natureza && setFiltro({ tipo: "natureza", valor: d.natureza })
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
              </CardContent>
            </Card>

            {/* Diagnostico (clicavel) */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Diagnóstico do pós</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {bucketRows.map((b) => {
                    const pct = stats.total ? Math.round((b.valor / stats.total) * 100) : 0;
                    return (
                      <button
                        key={b.eixo}
                        type="button"
                        className="w-full text-left group"
                        onClick={() => b.valor > 0 && setFiltro({ tipo: "eixo", valor: b.eixo })}
                        title={b.valor > 0 ? "Ver os chamados deste eixo" : undefined}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="flex items-center gap-1.5 font-medium group-hover:text-foreground">
                            <b.icon className="h-3.5 w-3.5 text-muted-foreground" />
                            {EIXO_LABEL[b.eixo]}
                            <span className="text-muted-foreground font-normal">· {b.hint}</span>
                          </span>
                          <span className="font-semibold tabular-nums">
                            {b.valor} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: "var(--viz-bar)" }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Criticidade (clicavel) */}
                <div className="flex items-center gap-1.5 flex-wrap border-t pt-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-1">
                    Criticidade
                  </span>
                  {stats.porCriticidade.map(([crit, n]) => (
                    <button
                      key={crit}
                      type="button"
                      onClick={() => setFiltro({ tipo: "criticidade", valor: crit })}
                      title="Ver os chamados desta criticidade"
                    >
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-normal hover:bg-muted",
                          crit.toLowerCase().includes("crít") && !crit.toLowerCase().includes("não") &&
                            "border-red-300 text-red-700 dark:border-red-900 dark:text-red-400"
                        )}
                      >
                        {crit}: {n}
                      </Badge>
                    </button>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed border-t pt-3">{stats.leitura}</p>
              </CardContent>
            </Card>
          </div>

          {/* Temas IA (clicavel) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Tags className="h-4 w-4 text-indigo-500" />
                Temas recorrentes (IA)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.porTema.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {stats.temPendenteTema
                    ? "Os chamados ainda estão sendo categorizados pela IA na VM — os temas aparecem aqui em breve."
                    : "Sem temas para exibir."}
                </p>
              ) : (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {stats.porTema.map(([tema, n]) => (
                    <button
                      key={tema}
                      type="button"
                      onClick={() => setFiltro({ tipo: "tema", valor: tema })}
                      title="Ver os chamados deste tema"
                    >
                      <Badge variant="secondary" className="font-normal hover:bg-muted">
                        {tema} · {n}
                      </Badge>
                    </button>
                  ))}
                  {stats.temPendenteTema && (
                    <span className="text-[11px] text-muted-foreground italic">
                      (+ chamados aguardando categorização da IA)
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lista do recorte selecionado */}
          {filtro && (
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold">
                  Chamados — {filtroLabel}{" "}
                  <span className="text-muted-foreground font-normal">({filtrados.length})</span>
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setFiltro(null)}>
                  <X className="h-3.5 w-3.5" /> Limpar filtro
                </Button>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800/60 overflow-hidden">
                  {filtrados.map((c) => (
                    <button
                      key={c.numeroChamado}
                      type="button"
                      onClick={() => setSelecionado(c)}
                      className="w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-colors"
                      title="Ver detalhes do chamado"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold truncate">
                          <span className="text-indigo-600 dark:text-indigo-400 font-mono">#{c.numeroChamado}</span>{" "}
                          {c.titulo || "(sem título)"}
                        </span>
                        <Badge className={cn("shrink-0 text-[10px] pointer-events-none", statusBadgeClass(c.status))}>
                          {c.status || "—"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                        <span>{c.natureza || "—"}</span>
                        {c.tema && <span className="italic">“{c.tema}”</span>}
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {fmtDateBr(c.dataAbertura)}
                          {" → "}
                          {c.dataEncerramento
                            ? fmtDateBr(c.dataEncerramento)
                            : `aberto há ${diasEntre(c.dataAbertura || hojeIso(), hojeIso())} d`}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Parecer com IA */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                Parecer da IA
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={handleGerarParecer}
                disabled={!!parecerAtivo || !workerOnline || stats.total === 0}
                title={
                  !workerOnline
                    ? "O gerador da IA está offline no momento"
                    : parecerAtivo
                    ? "Aguarde o parecer em andamento"
                    : "Lê os chamados do período e escreve um parecer"
                }
              >
                {parecerAtivo ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {ultimoParecer ? "Atualizar parecer" : "Gerar parecer"}
              </Button>
            </CardHeader>
            <CardContent>
              {parecerAtivo ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {parecerAtivo.progress || "Gerando parecer com IA…"}
                </p>
              ) : ultimoParecer?.resultText ? (
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {ultimoParecer.resultText}
                  <p className="text-[10px] text-muted-foreground mt-2">
                    gerado em {new Date(ultimoParecer.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </div>
              ) : ultimoErro ? (
                <p className="text-xs text-red-600">Falha no último parecer: {ultimoErro.errorMessage}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  A IA lê os chamados do período (títulos, temas, status) e escreve uma leitura
                  qualitativa: o que se repete, causa provável e recomendações para a implantação.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Chamados por semana do pos */}
          {stats.porSemana.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Chamados por semana do pós</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.porSemana} margin={{ top: 16, right: 8, bottom: 0, left: 8 }}>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="0" />
                    <XAxis
                      dataKey="semana"
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
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Chamado0800DetailDialog chamado={selecionado} onClose={() => setSelecionado(null)} />
    </div>
  );
}
