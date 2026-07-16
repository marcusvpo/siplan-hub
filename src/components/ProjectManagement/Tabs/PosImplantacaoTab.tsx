import { useMemo } from "react";
import { ProjectV2 } from "@/types/ProjectV2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  useChamados0800,
  useSolicitarSyncChamados0800,
  Chamado0800,
} from "@/hooks/useChamados0800";
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

/**
 * Classifica a natureza do chamado em uma das tres leituras de diagnostico:
 * - "duvidas": usuarios com dificuldade de uso -> capacitacao/treinamento
 * - "erros":   bugs e erros do produto/ambiente -> qualidade tecnica
 * - "outros":  comercial, solicitacoes, etc.
 */
function bucketNatureza(natureza?: string): "duvidas" | "erros" | "outros" {
  const n = (natureza || "").toLowerCase();
  if (n.includes("dúvida") || n.includes("duvida")) return "duvidas";
  if (n.includes("bug") || n.includes("erro")) return "erros";
  return "outros";
}

const diasEntre = (a: string, b: string): number =>
  Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));

interface Diagnostico {
  duvidas: number;
  erros: number;
  outros: number;
  leitura: string;
}

function montarDiagnostico(chamados: Chamado0800[], concentradoNoInicio: boolean): Diagnostico {
  const total = chamados.length;
  const count = { duvidas: 0, erros: 0, outros: 0 };
  for (const c of chamados) count[bucketNatureza(c.natureza)]++;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const d = pct(count.duvidas);
  const e = pct(count.erros);

  let leitura: string;
  if (total === 0) {
    leitura = "";
  } else if (d >= 50) {
    leitura =
      `A maioria dos chamados (${d}%) são dúvidas de uso — sinal de que o cliente precisa de reforço ` +
      `de capacitação. Vale revisar o treinamento aplicado na implantação e o material de apoio entregue.`;
  } else if (e >= 50) {
    leitura =
      `A maioria dos chamados (${e}%) são erros ou bugs — o atrito do pós está mais no produto/ambiente ` +
      `do que na capacitação. Vale revisar a preparação de ambiente e reportar os bugs recorrentes ao time de produto.`;
  } else {
    leitura =
      `Perfil misto: ${d}% dúvidas de uso e ${e}% erros/bugs. Nenhuma causa domina — acompanhe os dois ` +
      `eixos (capacitação e qualidade técnica) nas próximas semanas do pós.`;
  }
  if (total > 0 && concentradoNoInicio) {
    leitura +=
      " Os chamados se concentram nas duas primeiras semanas do pós — curva de adaptação típica, tende a ceder.";
  }
  return { ...count, leitura };
}

/**
 * Aba "Análise Pós-Implantação": leitura analítica dos chamados 0800 que o
 * cliente abriu durante o pós (mesma fonte do card da etapa 7 — espelho
 * chamados_0800, filtrado pelo produto do projeto). Objetivo: apontar se o
 * atrito do pós vem de capacitação (dúvidas), do produto (erros/bugs) ou de
 * outros fatores, para direcionar a melhoria das implantações.
 */
export function PosImplantacaoTab({ project }: PosImplantacaoTabProps) {
  const post = project.stages.post;
  const fimEfetivo = post?.status === "done" ? post?.endDate : undefined;
  const { chamados, clienteResolvido, lastSyncedAt, isLoading, error, parametrosIncompletos } =
    useChamados0800(project.ticketNumber, post?.startDate, fimEfetivo, project.systemType);
  const { solicitarSync, syncing } = useSolicitarSyncChamados0800();

  const stats = useMemo(() => {
    const concluidos = chamados.filter((c) => !!c.dataEncerramento);
    const abertos = chamados.length - concluidos.length;
    const temposDias = concluidos
      .filter((c) => c.dataAbertura && c.dataEncerramento)
      .map((c) => diasEntre(c.dataAbertura as string, c.dataEncerramento as string));
    const tempoMedio =
      temposDias.length > 0
        ? Math.round((temposDias.reduce((s, n) => s + n, 0) / temposDias.length) * 10) / 10
        : null;

    const porNaturezaMap = new Map<string, number>();
    for (const c of chamados) {
      const key = c.natureza || "Sem natureza";
      porNaturezaMap.set(key, (porNaturezaMap.get(key) ?? 0) + 1);
    }
    const porNatureza = [...porNaturezaMap.entries()]
      .map(([natureza, total]) => ({ natureza, total }))
      .sort((a, b) => b.total - a.total);

    // Chamados por semana do pos (semana 1 = inicio do pos)
    const inicioPos = post?.startDate ? new Date(post.startDate) : null;
    const porSemanaMap = new Map<number, number>();
    if (inicioPos) {
      for (const c of chamados) {
        if (!c.dataAbertura) continue;
        const semana =
          Math.floor(diasEntre(inicioPos.toISOString().slice(0, 10), c.dataAbertura) / 7) + 1;
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
      abertos,
      concluidos: concluidos.length,
      tempoMedio,
      porNatureza,
      porSemana,
      diagnostico: montarDiagnostico(chamados, concentradoNoInicio),
    };
  }, [chamados, post?.startDate]);

  const handleSyncAgora = async () => {
    try {
      await solicitarSync();
      toast.success("Chamados sincronizados com o 0800.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao sincronizar com o 0800.");
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
    { label: "Chamados no pós", value: stats.total, icon: Headset },
    { label: "Em aberto", value: stats.abertos, icon: CircleDot },
    { label: "Concluídos", value: stats.concluidos, icon: CheckCircle2 },
    {
      label: "Resolução média",
      value: stats.tempoMedio !== null ? `${stats.tempoMedio} d` : "—",
      icon: Timer,
    },
  ];

  const bucketRows = [
    {
      label: "Dúvidas de uso",
      hint: "capacitação / treinamento",
      icon: GraduationCap,
      valor: stats.diagnostico.duvidas,
    },
    {
      label: "Erros e bugs",
      hint: "produto / ambiente",
      icon: Bug,
      valor: stats.diagnostico.erros,
    },
    { label: "Outros", hint: "comercial, solicitações…", icon: Shapes, valor: stats.diagnostico.outros },
  ];

  return (
    <div className="space-y-4 [--viz-bar:#2a78d6] dark:[--viz-bar:#3987e5]">
      {/* Cabecalho: periodo analisado + sync */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground">
          Chamados 0800 de <strong>{project.systemType}</strong> abertos pelo cliente durante o
          pós-implantação
          {post?.status !== "done" && " (em andamento — período corre até hoje)"}.
        </p>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
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
                    <p className="text-[11px] text-muted-foreground mt-1">{t.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {/* Chamados por natureza */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Chamados por natureza</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(160, stats.porNatureza.length * 40)}
                >
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
                    <Bar dataKey="total" fill="var(--viz-bar)" barSize={18} radius={[0, 4, 4, 0]}>
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

            {/* Diagnostico */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Diagnóstico do pós</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {bucketRows.map((b) => {
                    const pct = stats.total ? Math.round((b.valor / stats.total) * 100) : 0;
                    return (
                      <div key={b.label}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="flex items-center gap-1.5 font-medium">
                            <b.icon className="h-3.5 w-3.5 text-muted-foreground" />
                            {b.label}
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
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed border-t pt-3">
                  {stats.diagnostico.leitura}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Chamados por semana do pos */}
          {stats.porSemana.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  Chamados por semana do pós
                </CardTitle>
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
    </div>
  );
}
