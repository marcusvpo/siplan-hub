import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, BarChart3, MessageSquare, Coins, Users, ThumbsUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface JobRow {
  user_id: string;
  tokens_in: number;
  tokens_out: number;
  tokens_charged: number;
  question: string;
  status: string;
  created_at: string;
  feedback: number | null;
}

// Tokens cobrados na cota (ponderado). Fallback para o bruto em jobs antigos
// que ainda nao tinham a coluna tokens_charged.
const chargedOf = (r: JobRow): number =>
  r.tokens_charged || (r.tokens_in || 0) + (r.tokens_out || 0);

interface UserAgg {
  userId: string;
  name: string;
  email: string;
  questions: number;
  tokens: number;
  last: string;
}

const RANGES = [
  { value: "7", label: "Ultimos 7 dias" },
  { value: "30", label: "Ultimos 30 dias" },
  { value: "90", label: "Ultimos 90 dias" },
];

export default function CopilotUsage() {
  const [rows, setRows] = useState<JobRow[]>([]);
  const [names, setNames] = useState<Map<string, { name: string; email: string }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30");
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const since = new Date(Date.now() - Number(range) * 86400000).toISOString();
      const [{ data: jobs, error: jErr }, { data: profiles, error: pErr }] = await Promise.all([
        supabase
          .from("copilot_jobs")
          .select("user_id, tokens_in, tokens_out, tokens_charged, question, status, created_at, feedback")
          .gte("created_at", since)
          .order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, full_name, email"),
      ]);
      if (jErr) throw jErr;
      if (pErr) throw pErr;

      const map = new Map<string, { name: string; email: string }>();
      (profiles || []).forEach((p) =>
        map.set(p.id, { name: p.full_name || "Sem nome", email: p.email })
      );
      setNames(map);
      setRows((jobs || []) as JobRow[]);
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar uso",
        description: err instanceof Error ? err.message : "Erro desconhecido",
      });
    } finally {
      setLoading(false);
    }
  }, [range, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalTokens = useMemo(() => rows.reduce((s, r) => s + chargedOf(r), 0), [rows]);

  const byUser = useMemo<UserAgg[]>(() => {
    const agg = new Map<string, UserAgg>();
    for (const r of rows) {
      const info = names.get(r.user_id) || { name: "Desconhecido", email: "" };
      const cur =
        agg.get(r.user_id) || {
          userId: r.user_id,
          name: info.name,
          email: info.email,
          questions: 0,
          tokens: 0,
          last: r.created_at,
        };
      cur.questions += 1;
      cur.tokens += chargedOf(r);
      if (r.created_at > cur.last) cur.last = r.created_at;
      agg.set(r.user_id, cur);
    }
    return [...agg.values()].sort((a, b) => b.tokens - a.tokens);
  }, [rows, names]);

  const topQuestions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const q = (r.question || "").trim();
      if (!q) continue;
      counts.set(q, (counts.get(q) || 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [rows]);

  const { up, down } = useMemo(() => {
    let u = 0;
    let d = 0;
    for (const r of rows) {
      if (r.feedback === 1) u += 1;
      else if (r.feedback === -1) d += 1;
    }
    return { up: u, down: d };
  }, [rows]);
  const satisfacao = up + down > 0 ? Math.round((up / (up + down)) * 100) : null;

  const tiles = [
    { icon: MessageSquare, label: "Perguntas", value: rows.length.toLocaleString("pt-BR") },
    { icon: Coins, label: "Tokens (cobrados)", value: totalTokens.toLocaleString("pt-BR") },
    { icon: Users, label: "Usuarios ativos", value: byUser.length.toLocaleString("pt-BR") },
    {
      icon: ThumbsUp,
      label: satisfacao !== null ? `Satisfacao (${up}👍 / ${down}👎)` : "Satisfacao",
      value: satisfacao !== null ? `${satisfacao}%` : "-",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Uso do Copiloto
          </h2>
          <p className="text-muted-foreground">Consumo de perguntas e tokens por usuario.</p>
        </div>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="h-9 w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Tiles */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tiles.map((t) => {
              const Icon = t.icon;
              return (
                <Card key={t.label} className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold leading-none">{t.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t.label}</p>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Por usuario */}
          <div className="border rounded-md bg-card">
            <div className="w-full overflow-x-auto scrollbar-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Perguntas</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead>Ultima</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byUser.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        Nenhum uso no periodo.
                      </TableCell>
                    </TableRow>
                  ) : (
                    byUser.map((u) => (
                      <TableRow key={u.userId} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">
                          {u.email}
                        </TableCell>
                        <TableCell className="text-right">{u.questions.toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="text-right">{u.tokens.toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {format(new Date(u.last), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Perguntas mais feitas */}
          {topQuestions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Perguntas mais feitas</h3>
              <div className="border rounded-md bg-card divide-y">
                {topQuestions.map(([q, n]) => (
                  <div key={q} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                    <span className="truncate">{q}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{n}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
