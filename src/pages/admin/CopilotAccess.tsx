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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Sparkles, Save } from "lucide-react";

const DEFAULT_LIMIT = 50000;

interface Row {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  enabled: boolean;
  dailyTokenLimit: number;
  tokensUsedToday: number;
  periodResetAt: string | null;
  // rascunho local do limite (antes de salvar)
  draftLimit: string;
  dirty: boolean;
}

export default function CopilotAccess() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: profiles, error: pErr }, { data: access, error: aErr }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, role").order("full_name"),
        supabase.from("copilot_access").select("*"),
      ]);
      if (pErr) throw pErr;
      if (aErr) throw aErr;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const byUser = new Map<string, any>();
      (access || []).forEach((a) => byUser.set(a.user_id, a));

      const merged: Row[] = (profiles || []).map((p) => {
        const a = byUser.get(p.id);
        const limit = a?.daily_token_limit ?? DEFAULT_LIMIT;
        return {
          userId: p.id,
          fullName: p.full_name || "Sem nome",
          email: p.email,
          role: p.role,
          enabled: !!a?.enabled,
          dailyTokenLimit: limit,
          tokensUsedToday: a?.tokens_used_today ?? 0,
          periodResetAt: a?.period_reset_at ?? null,
          draftLimit: String(limit),
          dirty: false,
        };
      });
      setRows(merged);
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar",
        description: err instanceof Error ? err.message : "Erro desconhecido",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const persist = async (row: Row, enabled: boolean, limit: number) => {
    setSavingId(row.userId);
    try {
      const { error } = await supabase
        .from("copilot_access")
        .upsert(
          { user_id: row.userId, enabled, daily_token_limit: limit },
          { onConflict: "user_id" }
        );
      if (error) throw error;
      setRows((prev) =>
        prev.map((r) =>
          r.userId === row.userId
            ? { ...r, enabled, dailyTokenLimit: limit, draftLimit: String(limit), dirty: false }
            : r
        )
      );
      toast({ title: "Salvo", description: `Acesso de ${row.fullName} atualizado.` });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: err instanceof Error ? err.message : "Erro desconhecido",
      });
    } finally {
      setSavingId(null);
    }
  };

  const toggleEnabled = (row: Row, value: boolean) => {
    persist(row, value, row.dailyTokenLimit);
  };

  const saveLimit = (row: Row) => {
    const parsed = Math.max(0, Math.floor(Number(row.draftLimit) || 0));
    persist(row, row.enabled, parsed);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter(
      (r) => r.fullName.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Copiloto Operacional
          </h2>
          <p className="text-muted-foreground">
            Habilite o copiloto por usuario e defina a cota diaria de tokens (0 = ilimitado).
          </p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      <div className="border rounded-md bg-card">
        <div className="w-full overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-center">Habilitado</TableHead>
                <TableHead>Cota diaria (tokens)</TableHead>
                <TableHead>Consumo hoje</TableHead>
                <TableHead className="text-right px-6">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Nenhum usuario encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => {
                  const sameDay = String(row.periodResetAt || "").slice(0, 10) === today;
                  const usedToday = sameDay ? row.tokensUsedToday : 0;
                  return (
                    <TableRow key={row.userId} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">
                        {row.fullName}
                        {row.role === "admin" && (
                          <Badge variant="outline" className="ml-2 text-[10px]">
                            admin
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {row.email}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={row.enabled}
                          disabled={savingId === row.userId}
                          onCheckedChange={(v) => toggleEnabled(row, v)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          step={1000}
                          value={row.draftLimit}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r) =>
                                r.userId === row.userId
                                  ? { ...r, draftLimit: e.target.value, dirty: true }
                                  : r
                              )
                            )
                          }
                          className="h-8 w-32"
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {usedToday.toLocaleString("pt-BR")}
                        {row.dailyTokenLimit > 0 && ` / ${row.dailyTokenLimit.toLocaleString("pt-BR")}`}
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!row.dirty || savingId === row.userId}
                          onClick={() => saveLimit(row)}
                        >
                          {savingId === row.userId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-1" />
                          )}
                          Salvar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
