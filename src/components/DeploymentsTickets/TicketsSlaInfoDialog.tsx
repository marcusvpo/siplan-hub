import { useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CircleAlert,
  Clock3,
  Info,
  MessageSquareText,
  PauseCircle,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Chamado0800 } from "@/hooks/useChamados0800";

interface TicketsSlaInfoDialogProps {
  chamados: Chamado0800[];
}

interface SlaPolicyObservation {
  firstResponseMinutes: number;
  resolutionMinutes: number;
  manualDeadline: boolean;
}

interface AreaSlaPolicy {
  area: string;
  criticality: string;
  tickets: number;
  firstResponseMinutes: number | null;
  resolutionMinutes: number | null;
  dominantCount: number;
  comparableCount: number;
  variants: number;
  manualOnly: boolean;
  manualDeadlines: number;
  withoutNumericPolicy: number;
}

const ALL_AREAS = "__all_areas__";
const ALL_CRITICALITIES = "__all_criticalities__";

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function canonicalCriticality(value?: string): string {
  const label = value?.trim() || "Sem criticidade";
  const normalized = normalizeText(label);
  if (normalized === "critico") return "Crítico";
  if (normalized === "nao critico") return "Não crítico";
  if (normalized === "sem impacto operacional") return "Sem impacto operacional";
  return label;
}

function validMinutes(value?: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function formatMinutes(totalMinutes: number | null): string {
  if (totalMinutes === null) return "Sem regra numérica";
  const minutes = Math.round(totalMinutes);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours} h ${remainingMinutes} min` : `${hours} h`;
}

function criticalityRank(value: string): number {
  const normalized = normalizeText(value);
  if (normalized === "critico") return 0;
  if (normalized === "nao critico") return 1;
  if (normalized === "sem impacto operacional") return 2;
  return 3;
}

function buildAreaSlaPolicies(chamados: Chamado0800[]): AreaSlaPolicy[] {
  const groups = new Map<string, {
    area: string;
    criticality: string;
    tickets: number;
    observations: SlaPolicyObservation[];
    manualDeadlines: number;
    withoutNumericPolicy: number;
  }>();

  chamados.forEach((chamado) => {
    const area = chamado.equipeResponsavel?.trim() || "Sem equipe informada";
    const criticality = canonicalCriticality(chamado.criticidade);
    const key = `${normalizeText(area)}::${normalizeText(criticality)}`;
    const group = groups.get(key) || {
      area,
      criticality,
      tickets: 0,
      observations: [],
      manualDeadlines: 0,
      withoutNumericPolicy: 0,
    };

    group.tickets += 1;
    if (chamado.slaVencimentoManual) group.manualDeadlines += 1;

    const firstResponseMinutes = chamado.slaTempoPrimeiraRespostaMinutos;
    const resolutionMinutes = chamado.slaTempoVencimentoMinutos;
    if (validMinutes(firstResponseMinutes) && validMinutes(resolutionMinutes)) {
      group.observations.push({
        firstResponseMinutes,
        resolutionMinutes,
        manualDeadline: chamado.slaVencimentoManual === true,
      });
    } else {
      group.withoutNumericPolicy += 1;
    }

    groups.set(key, group);
  });

  return [...groups.values()]
    .map((group): AreaSlaPolicy => {
      const automatic = group.observations.filter((item) => !item.manualDeadline);
      const candidates = automatic.length > 0 ? automatic : group.observations;
      const frequencies = new Map<string, {
        firstResponseMinutes: number;
        resolutionMinutes: number;
        count: number;
      }>();

      candidates.forEach((item) => {
        const key = `${item.firstResponseMinutes}:${item.resolutionMinutes}`;
        const current = frequencies.get(key) || { ...item, count: 0 };
        current.count += 1;
        frequencies.set(key, current);
      });

      const dominant = [...frequencies.values()].sort((left, right) => (
        right.count - left.count ||
        left.firstResponseMinutes - right.firstResponseMinutes ||
        left.resolutionMinutes - right.resolutionMinutes
      ))[0];

      return {
        area: group.area,
        criticality: group.criticality,
        tickets: group.tickets,
        firstResponseMinutes: dominant?.firstResponseMinutes ?? null,
        resolutionMinutes: dominant?.resolutionMinutes ?? null,
        dominantCount: dominant?.count ?? 0,
        comparableCount: candidates.length,
        variants: frequencies.size,
        manualOnly: automatic.length === 0 && group.observations.length > 0,
        manualDeadlines: group.manualDeadlines,
        withoutNumericPolicy: group.withoutNumericPolicy,
      };
    })
    .sort((left, right) => (
      left.area.localeCompare(right.area, "pt-BR") ||
      criticalityRank(left.criticality) - criticalityRank(right.criticality) ||
      left.criticality.localeCompare(right.criticality, "pt-BR")
    ));
}

export function TicketsSlaInfoDialog({ chamados }: TicketsSlaInfoDialogProps) {
  const [selectedArea, setSelectedArea] = useState(ALL_AREAS);
  const [selectedCriticality, setSelectedCriticality] = useState(ALL_CRITICALITIES);
  const policies = useMemo(() => buildAreaSlaPolicies(chamados), [chamados]);
  const areas = useMemo(() => (
    [...new Set(policies.map((policy) => policy.area))].sort((left, right) => left.localeCompare(right, "pt-BR"))
  ), [policies]);
  const criticalities = useMemo(() => (
    [...new Set(policies.map((policy) => policy.criticality))].sort((left, right) => (
      criticalityRank(left) - criticalityRank(right) || left.localeCompare(right, "pt-BR")
    ))
  ), [policies]);
  const visiblePolicies = policies.filter((policy) => (
    (selectedArea === ALL_AREAS || policy.area === selectedArea) &&
    (selectedCriticality === ALL_CRITICALITIES || policy.criticality === selectedCriticality)
  ));

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary"
          aria-label="Entender o cálculo do SLA"
          title="Entender o cálculo do SLA"
        >
          <Info className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-5xl gap-3 p-4 sm:p-5">
        <DialogHeader className="pr-10">
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            Entenda o cálculo do SLA
          </DialogTitle>
          <DialogDescription>
            A criticidade não define o prazo sozinha. O Ellevo combina criticidade, equipe responsável, contrato e calendário para gerar as datas-limite oficiais.
          </DialogDescription>
        </DialogHeader>

        <section className="rounded-lg border bg-muted/20 p-3">
          <h3 className="text-xs font-semibold">Como o prazo oficial é formado</h3>
          <div className="mt-2 grid items-stretch gap-1.5 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1.2fr]">
            {[
              { label: "Criticidade", detail: "impacto do chamado" },
              { label: "Equipe/área", detail: "SD, Infra, Implantação..." },
              { label: "Contrato e calendário", detail: "jornada, dias úteis e feriados" },
              { label: "Datas oficiais", detail: "1ª resposta e resolução" },
            ].map((step, index) => (
              <div key={step.label} className="contents">
                <div className="rounded-md border bg-background px-2.5 py-2">
                  <p className="text-[10px] font-semibold">{index + 1}. {step.label}</p>
                  <p className="mt-0.5 text-[9px] text-muted-foreground">{step.detail}</p>
                </div>
                {index < 3 && <ArrowRight className="hidden h-4 w-4 self-center text-muted-foreground md:block" />}
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-2 md:grid-cols-2">
          <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-900 dark:bg-blue-950/20">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-800 dark:text-blue-300">
              <MessageSquareText className="h-4 w-4" /> Primeira resposta
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
              <strong>Data-limite:</strong> “primeira resposta” recebida do Ellevo. Representa a primeira interação de atendimento registrada no chamado. Fica <strong>no prazo</strong> quando ela ocorre antes ou no mesmo instante dessa data; enquanto não ocorre, a tela compara o prazo com o momento atual.
            </p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900 dark:bg-emerald-950/20">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <Clock3 className="h-4 w-4" /> Resolução do chamado
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
              <strong>Data-limite:</strong> vencimento vigente recebido do Ellevo. Em chamado encerrado, compara encerramento × vencimento; em aberto, compara agora × vencimento. Um vencimento manual substitui o calculado.
            </p>
          </div>
        </div>

        <section className="overflow-hidden rounded-lg border">
          <div className="flex flex-col gap-2 border-b bg-muted/35 px-3 py-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="flex items-center gap-1.5 text-xs font-semibold">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                Padrão predominante por área e criticidade
              </h3>
              <p className="mt-0.5 text-[9px] text-muted-foreground">
                Mostra a combinação automática mais frequente no filtro atual; não faz média e descarta `0`/vazio como prazo válido.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Select value={selectedArea} onValueChange={setSelectedArea}>
                <SelectTrigger className="h-7 w-[210px] bg-background text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_AREAS}>Todas as áreas</SelectItem>
                  {areas.map((area) => <SelectItem key={area} value={area}>{area}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedCriticality} onValueChange={setSelectedCriticality}>
                <SelectTrigger className="h-7 w-[180px] bg-background text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CRITICALITIES}>Toda criticidade</SelectItem>
                  {criticalities.map((criticality) => (
                    <SelectItem key={criticality} value={criticality}>{criticality}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {visiblePolicies.length > 0 ? (
            <div className="max-h-56 overflow-auto">
              <table className="w-full min-w-[780px] text-left text-[10px]">
                <thead className="sticky top-0 z-10 bg-background text-muted-foreground shadow-[0_1px_0_hsl(var(--border))]">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Área/equipe atual</th>
                    <th className="px-3 py-2 font-semibold">Criticidade</th>
                    <th className="px-3 py-2 font-semibold">Meta da 1ª resposta</th>
                    <th className="px-3 py-2 font-semibold">Meta de resolução</th>
                    <th className="px-3 py-2 font-semibold">Confirmação no recorte</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePolicies.map((policy) => (
                    <tr key={`${policy.area}:${policy.criticality}`} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">{policy.area}</td>
                      <td className="px-3 py-2">{policy.criticality}</td>
                      <td className="px-3 py-2 font-semibold text-blue-700 dark:text-blue-300">
                        {formatMinutes(policy.firstResponseMinutes)}
                      </td>
                      <td className="px-3 py-2 font-semibold text-emerald-700 dark:text-emerald-300">
                        {formatMinutes(policy.resolutionMinutes)}
                      </td>
                      <td className="px-3 py-2">
                        {policy.comparableCount > 0 ? (
                          <div className="flex flex-wrap items-center gap-1">
                            <span>{policy.dominantCount} de {policy.comparableCount} iguais</span>
                            {policy.variants > 1 && (
                              <Badge variant="outline" className="h-4 px-1.5 text-[8px]">{policy.variants} configurações</Badge>
                            )}
                            {policy.manualOnly && (
                              <Badge variant="outline" className="h-4 border-amber-300 px-1.5 text-[8px] text-amber-700">somente ajustados</Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Sem prazo numérico neste recorte</span>
                        )}
                        {(policy.manualDeadlines > 0 || policy.withoutNumericPolicy > 0) && (
                          <p className="mt-0.5 text-[8px] text-muted-foreground">
                            {policy.tickets} chamado(s) no total
                            {policy.manualDeadlines > 0 ? ` · ${policy.manualDeadlines} com vencimento manual` : ""}
                            {policy.withoutNumericPolicy > 0 ? ` · ${policy.withoutNumericPolicy} sem par numérico` : ""}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-3 py-5 text-center text-[11px] text-muted-foreground">
              Nenhuma combinação encontrada para os filtros selecionados.
            </p>
          )}
        </section>

        <section className="overflow-hidden rounded-lg border">
          <div className="border-b bg-muted/35 px-3 py-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Como ler a Jornada setorial do SLA
            </h3>
            <p className="mt-0.5 text-[9px] text-muted-foreground">
              Expanda um chamado na tabela. O HUB separa a sequência de trâmites por equipe e mostra cada passagem em ordem cronológica.
            </p>
          </div>

          <div className="grid gap-3 p-3 lg:grid-cols-[1.05fr_1fr]">
            <div className="rounded-md border bg-muted/15 p-2.5">
              <p className="text-[9px] font-semibold uppercase text-muted-foreground">Exemplo de leitura</p>
              <div className="mt-2 grid items-center gap-1.5 sm:grid-cols-[1fr_auto_1fr]">
                <div className="rounded-md border bg-background p-2">
                  <p className="text-[10px] font-semibold">SD · Passagem 1</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge className="h-4 border-0 bg-emerald-100 px-1.5 text-[8px] text-emerald-700">1ª resposta no prazo</Badge>
                    <Badge className="h-4 border-0 bg-emerald-100 px-1.5 text-[8px] text-emerald-700">Repasse antes do vencimento</Badge>
                  </div>
                </div>
                <ArrowRight className="mx-auto h-4 w-4 text-muted-foreground" />
                <div className="rounded-md border bg-background p-2">
                  <p className="text-[10px] font-semibold">Produtos · Passagem 1</p>
                  <Badge className="mt-1 h-4 border-0 bg-rose-100 px-1.5 text-[8px] text-rose-700">Resolvido fora do SLA</Badge>
                </div>
              </div>
              <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">
                Neste exemplo, o SD realizou a primeira resposta e repassou antes do vencimento conhecido. O chamado terminou em Produtos depois do prazo geral. Se voltar a uma equipe, ela aparece novamente como <strong>Passagem 2</strong>.
              </p>
            </div>

            <div className="grid gap-1.5 sm:grid-cols-2">
              <div className="rounded-md border p-2">
                <p className="text-[9px] font-semibold">1ª resposta no prazo/fora</p>
                <p className="mt-0.5 text-[8px] leading-relaxed text-muted-foreground">O resultado oficial da primeira resposta é colocado na equipe que estava com o chamado na data em que ela foi registrada.</p>
              </div>
              <div className="rounded-md border p-2">
                <p className="text-[9px] font-semibold">Repasse antes/após o vencimento</p>
                <p className="mt-0.5 text-[8px] leading-relaxed text-muted-foreground">Compara o instante em que a próxima equipe aparece nos trâmites com o vencimento de resolução atualmente conhecido.</p>
              </div>
              <div className="rounded-md border p-2">
                <p className="text-[9px] font-semibold">Resolvido no prazo/fora</p>
                <p className="mt-0.5 text-[8px] leading-relaxed text-muted-foreground">Mostra o resultado oficial da resolução na última equipe registrada antes do encerramento.</p>
              </div>
              <div className="rounded-md border p-2">
                <p className="text-[9px] font-semibold">Etapa atual dentro/vencida/pausada</p>
                <p className="mt-0.5 text-[8px] leading-relaxed text-muted-foreground">Em chamados abertos, mostra a situação do prazo geral na equipe atual. Só a pausa oficial do Ellevo suspende o relógio.</p>
              </div>
            </div>
          </div>

          <div className="grid border-t md:grid-cols-2">
            <div className="border-b bg-emerald-50/50 px-3 py-2 dark:bg-emerald-950/15 md:border-b-0 md:border-r">
              <p className="flex items-center gap-1.5 text-[9px] font-semibold text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" /> Oficial no HUB
              </p>
              <p className="mt-0.5 text-[8px] leading-relaxed text-muted-foreground">
                Datas-limite e resultados da 1ª resposta e da resolução, além de pausa e ajuste manual, vêm do Ellevo e valem para o chamado inteiro.
              </p>
            </div>
            <div className="bg-amber-50/50 px-3 py-2 dark:bg-amber-950/15">
              <p className="flex items-center gap-1.5 text-[9px] font-semibold text-amber-800 dark:text-amber-300">
                <CircleAlert className="h-3.5 w-3.5" /> Indicativo por setor
              </p>
              <p className="mt-0.5 text-[8px] leading-relaxed text-muted-foreground">
                Entrada, saída, permanência e atribuição do resultado a cada equipe são reconstruídas pelos trâmites. Não equivalem a um SLA oficial independente por área.
              </p>
            </div>
          </div>

          <p className="border-t bg-muted/20 px-3 py-1.5 text-[8px] leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Ao trocar de setor:</strong> o HUB não pausa nem recalcula o SLA. Se o Ellevo alterar o prazo depois do repasse, a sincronização passa a exibir esse novo vencimento. Como o espelho não guarda a fotografia da regra vigente em cada transferência, a classificação histórica do repasse usa o vencimento atualmente conhecido e pode mudar.
          </p>
        </section>

        <div className="grid gap-2 md:grid-cols-3">
          <div className="flex gap-2 rounded-lg border p-2.5">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
            <p className="text-[9px] leading-relaxed"><strong>Horas da tabela:</strong> são metas cadastradas. A data-limite exata da linha já considera o calendário aplicado pelo Ellevo.</p>
          </div>
          <div className="flex gap-2 rounded-lg border p-2.5">
            <PauseCircle className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
            <p className="text-[9px] leading-relaxed"><strong>Pausa:</strong> somente o indicador oficial suspende o relógio. Trocar de equipe não pausa automaticamente.</p>
          </div>
          <div className="flex gap-2 rounded-lg border p-2.5">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-[9px] leading-relaxed"><strong>Tempo por área:</strong> é estimado pelos trâmites em horas corridas; não representa um SLA independente de cada setor.</p>
          </div>
        </div>

        <div className="rounded-lg bg-primary/[0.05] px-3 py-2 text-[9px] leading-relaxed text-muted-foreground">
          <strong className="text-foreground">Qual valor vale para um chamado específico?</strong> Sempre as datas e os resultados exibidos na linha principal. A Jornada setorial ajuda a localizar em qual equipe cada evento aconteceu, mas não substitui o SLA oficial do chamado.
        </div>
      </DialogContent>
    </Dialog>
  );
}
