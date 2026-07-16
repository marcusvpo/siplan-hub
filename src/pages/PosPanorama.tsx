import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { usePosPanorama, TemaAgregado } from "@/hooks/usePosPanorama";
import { Chamado0800 } from "@/hooks/useChamados0800";
import {
  Chamado0800DetailDialog,
  fmtDateBr,
  statusBadgeClass,
} from "@/components/ProjectManagement/Chamado0800DetailDialog";
import { Headset, Building2, Tags, Loader2, X, CalendarDays } from "lucide-react";
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
] as const;

function inicioDoPeriodo(periodo: string): string | null {
  if (periodo === "tudo") return null;
  const dias = Number(periodo);
  return new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10);
}

/**
 * Panorama Pós-Implantação: visão geral (Dashboard) dos chamados 0800 abertos
 * pelos clientes nos períodos de pós, agregados por produto e período. O foco é
 * RECORRÊNCIA: o mesmo tema (gerado por IA no worker) aparecendo em vários
 * cartórios indica problema sistêmico — de produto, de ambiente ou do material
 * de capacitação — e não um caso isolado.
 */
export default function PosPanorama() {
  const [produto, setProduto] = useState<string>("todos");
  const [periodo, setPeriodo] = useState<string>("90");
  const inicio = useMemo(() => inicioDoPeriodo(periodo), [periodo]);
  const { data, isLoading, error } = usePosPanorama(produto, inicio);

  const [temaSelecionado, setTemaSelecionado] = useState<TemaAgregado | null>(null);
  const [chamadoSelecionado, setChamadoSelecionado] = useState<Chamado0800 | null>(null);

  const chamadosDoTema = useMemo(() => {
    if (!data || !temaSelecionado) return [];
    return data.chamados.filter((c) => c.tema === temaSelecionado.tema);
  }, [data, temaSelecionado]);

  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto [--viz-bar:#2a78d6] dark:[--viz-bar:#3987e5]">
      {/* Cabecalho + filtros */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Headset className="h-6 w-6 text-primary" />
            Panorama Pós-Implantação
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Chamados 0800 abertos pelos clientes durante os períodos de pós — recorrência de
            temas entre cartórios, por produto.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={produto} onValueChange={setProduto}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Produto" />
            </SelectTrigger>
            <SelectContent>
              {PRODUTOS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p === "todos" ? "Todos os produtos" : p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-[170px] h-9">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {PERIODOS.map((p) => (
                <SelectItem key={p.valor} value={p.valor}>
                  {p.rotulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

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
      ) : !data || data.chamados.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-sm text-muted-foreground">
            Nenhum chamado no recorte selecionado — ajuste o produto ou amplie o período.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Chamados no recorte", value: data.chamados.length, icon: Headset },
              { label: "Cartórios envolvidos", value: data.totalCartorios, icon: Building2 },
              { label: "Temas identificados (IA)", value: data.temas.length, icon: Tags },
              {
                label: "Aguardando categorização",
                value: data.semTema,
                icon: Loader2,
              },
            ].map((t) => (
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

          <div className="grid lg:grid-cols-2 gap-4 items-start">
            {/* Temas recorrentes */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Tags className="h-4 w-4 text-indigo-500" />
                  Temas recorrentes entre cartórios
                  <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                    clique para ver os chamados
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.temas.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Os chamados deste recorte ainda estão sendo categorizados pela IA na VM.
                  </p>
                ) : (
                  <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                    {data.temas.slice(0, 15).map((t) => (
                      <button
                        key={t.tema}
                        type="button"
                        onClick={() => setTemaSelecionado(t)}
                        className="w-full flex items-center justify-between gap-2 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900/40 px-2 rounded transition-colors"
                      >
                        <span className="text-sm font-medium truncate">{t.tema}</span>
                        <span className="flex items-center gap-2 shrink-0 text-xs">
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
                {data.semTema > 0 && data.temas.length > 0 && (
                  <p className="text-[11px] text-muted-foreground italic mt-2">
                    +{data.semTema} chamado{data.semTema === 1 ? "" : "s"} aguardando categorização da IA.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Naturezas */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Chamados por natureza</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(180, Math.min(data.porNatureza.length, 10) * 38)}
                >
                  <BarChart
                    data={data.porNatureza.slice(0, 10)}
                    layout="vertical"
                    margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeDasharray="0" />
                    <XAxis type="number" hide allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="natureza"
                      width={185}
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
                {data.lastSyncedAt && (
                  <p className="text-[10px] text-muted-foreground text-right mt-1">
                    espelho sincronizado{" "}
                    {new Date(data.lastSyncedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Drill-down do tema */}
          {temaSelecionado && (
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold">
                  Tema “{temaSelecionado.tema}”{" "}
                  <span className="text-muted-foreground font-normal">
                    — {temaSelecionado.chamados} chamado{temaSelecionado.chamados === 1 ? "" : "s"} em{" "}
                    {temaSelecionado.cartorios} cartório{temaSelecionado.cartorios === 1 ? "" : "s"}
                  </span>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => setTemaSelecionado(null)}
                >
                  <X className="h-3.5 w-3.5" /> Fechar
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {temaSelecionado.nomes.map((n) => (
                    <Badge key={n} variant="secondary" className="font-normal pointer-events-none">
                      {n}
                    </Badge>
                  ))}
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800/60 overflow-hidden">
                  {chamadosDoTema.map((c) => (
                    <button
                      key={c.numeroChamado}
                      type="button"
                      onClick={() => setChamadoSelecionado(c)}
                      className="w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-colors"
                      title="Ver detalhes do chamado"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold truncate">
                          <span className="text-indigo-600 dark:text-indigo-400 font-mono">
                            #{c.numeroChamado}
                          </span>{" "}
                          {c.titulo || "(sem título)"}
                        </span>
                        <Badge className={cn("shrink-0 text-[10px] pointer-events-none", statusBadgeClass(c.status))}>
                          {c.status || "—"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                        <span className="truncate">{c.nomeCliente || "—"}</span>
                        <span>{c.software || ""}</span>
                        <span className="flex items-center gap-1 shrink-0">
                          <CalendarDays className="h-3 w-3" />
                          {fmtDateBr(c.dataAbertura)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Chamado0800DetailDialog chamado={chamadoSelecionado} onClose={() => setChamadoSelecionado(null)} />
    </div>
  );
}
