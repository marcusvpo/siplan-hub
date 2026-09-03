import { useState, useEffect } from "react";
import { Sparkles, Megaphone, Plus, Trash2, Send, ExternalLink, Layers, Wrench, TrendingUp, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/hooks/useNotifications";
import type { NotificationType } from "@/types/conversion";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const RELEASE_TYPES = [
  { value: "release_feature", label: "Nova Funcionalidade", icon: Sparkles, color: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  { value: "release_fix", label: "Correção de Erro", icon: Wrench, color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  { value: "release_improvement", label: "Melhoria de Sistema", icon: TrendingUp, color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  { value: "release_screen", label: "Nova Tela Disponível", icon: Layers, color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
];

const MODULE_OPTIONS = [
  { value: "global", label: "Todos os Usuários (Global)" },
  { value: "dashboard", label: "Dashboard" },
  { value: "projects", label: "Implantação & Projetos" },
  { value: "commercial_customers", label: "Comercial" },
  { value: "conversion_home", label: "Conversão" },
  { value: "sd_solutions", label: "SD (Suporte Técnico)" },
  { value: "implantadores_home", label: "Implantadores" },
  { value: "menu_cs_cx", label: "CS/CX (Customer Success)" },
  { value: "assistants_knowledge", label: "Assistentes & IA" },
  { value: "admin_panel", label: "Administração" },
];

interface ChangelogItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  permissionResource?: string;
  createdAt: Date;
}

export default function AdminChangelog() {
  const { createNotification } = useNotifications();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<NotificationType>("release_feature");
  const [targetResource, setTargetResource] = useState<string>("global");
  const [actionUrl, setActionUrl] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [history, setHistory] = useState<ChangelogItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadChangelogHistory = async () => {
    try {
      setLoadingHistory(true);
      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, title, message, action_url, permission_resource, created_at")
        .eq("category", "changelog")
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;

      const mapped: ChangelogItem[] = (data || []).map((item) => ({
        id: item.id,
        type: item.type as NotificationType,
        title: item.title,
        message: item.message,
        actionUrl: item.action_url ?? undefined,
        permissionResource: item.permission_resource ?? undefined,
        createdAt: new Date(item.created_at),
      }));

      setHistory(mapped);
    } catch (err) {
      console.error("Erro ao carregar histórico de novidades:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadChangelogHistory();
  }, []);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error("Por favor, preencha o título e a descrição da novidade.");
      return;
    }

    try {
      setPublishing(true);
      const permResource = targetResource === "global" ? undefined : targetResource;

      const id = await createNotification({
        type,
        title: title.trim(),
        message: message.trim(),
        actionUrl: actionUrl.trim() || undefined,
        permissionResource: permResource,
        category: "changelog",
      });

      if (id) {
        toast.success("Comunicado de novidade publicado com sucesso!");
        setTitle("");
        setMessage("");
        setActionUrl("");
        loadChangelogHistory();
      } else {
        toast.error("Não foi possível publicar a notificação.");
      }
    } catch (err) {
      toast.error("Erro ao enviar anúncio de novidade.");
      console.error(err);
    } finally {
      setPublishing(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
      toast.success("Anúncio removido do histórico.");
      setHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      toast.error("Erro ao remover anúncio.");
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Megaphone className="h-7 w-7 text-primary" />
            Central de Novidades & Releases
          </h1>
          <p className="text-muted-foreground mt-1">
            Publique anúncios de atualizações, correções e novas telas com direcionamento inteligente por permissão (RBAC).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-5">
          <Card className="border-border shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Publicar Nova Atualização
              </CardTitle>
              <CardDescription>
                O anúncio será enviado para o ícone de notificações dos usuários autorizados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePublish} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Título da Novidade *</label>
                  <Input
                    placeholder="Ex: Nova Tela de Gestão de Horas no SD"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={100}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Tipo de Lançamento</label>
                  <Select value={type} onValueChange={(val) => setType(val as NotificationType)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {RELEASE_TYPES.map((rt) => (
                        <SelectItem key={rt.value} value={rt.value}>
                          <div className="flex items-center gap-2">
                            <rt.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span>{rt.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    Módulo / Permissão RBAC Alvo
                  </label>
                  <Select value={targetResource} onValueChange={setTargetResource}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione quem receberá" />
                    </SelectTrigger>
                    <SelectContent>
                      {MODULE_OPTIONS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Apenas usuários que têm permissão de visualização no módulo escolhido receberão a notificação.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Link de Ação / Rota (Opcional)</label>
                  <Input
                    placeholder="Ex: /cs-cx/relatorios ou /sd/horas"
                    value={actionUrl}
                    onChange={(e) => setActionUrl(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Descrição do que mudou *</label>
                  <Textarea
                    placeholder="Descreva resumidamente o que foi implementado, melhorias adicionadas ou problemas corrigidos..."
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full gap-2 mt-2" disabled={publishing}>
                  <Send className="h-4 w-4" />
                  {publishing ? "Publicando..." : "Publicar Notificação"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* History Column */}
        <div className="lg:col-span-7">
          <Card className="border-border shadow-lg h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Histórico de Publicações ({history.length})</span>
                <Button variant="outline" size="sm" onClick={loadChangelogHistory}>
                  Atualizar
                </Button>
              </CardTitle>
              <CardDescription>
                Últimas novidades e notas de versão divulgadas aos usuários.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {loadingHistory ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2" />
                  Carregando comunicados...
                </div>
              ) : history.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  Nenhuma novidade foi publicada ainda.
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => {
                    const releaseType = RELEASE_TYPES.find((rt) => rt.value === item.type);
                    const Icon = releaseType?.icon || Sparkles;

                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl border border-border bg-card/60 hover:bg-card transition-colors flex items-start justify-between gap-3"
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-sm text-foreground">{item.title}</h4>
                              {releaseType && (
                                <Badge variant="outline" className={`text-[10px] ${releaseType.color}`}>
                                  {releaseType.label}
                                </Badge>
                              )}
                              {item.permissionResource && (
                                <Badge variant="secondary" className="text-[10px]">
                                  {item.permissionResource}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed">
                              {item.message}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                              <span>
                                {formatDistanceToNow(item.createdAt, { addSuffix: true, locale: ptBR })}
                              </span>
                              {item.actionUrl && (
                                <span className="text-primary flex items-center gap-0.5">
                                  {item.actionUrl} <ExternalLink className="h-2.5 w-2.5" />
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                          title="Remover publicação"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
