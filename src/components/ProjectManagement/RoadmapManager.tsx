import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Copy,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Globe,
  Palette,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";

interface RoadmapManagerProps {
  projectId: string;
}

interface CustomTheme {
  primary?: string;
  secondary?: string;
  background?: string;
  [key: string]: string | undefined; // Index signature para compatibilidade com Json
}

interface RoadmapSettings {
  id: string;
  project_id: string;
  share_token: string;
  is_active: boolean;
  view_count: number;
  welcome_message: string | null;
  custom_theme: CustomTheme | null;
  created_at: string;
  updated_at: string;
  config: Record<string, unknown>;
}

export function RoadmapManager({ projectId }: RoadmapManagerProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roadmap, setRoadmap] = useState<RoadmapSettings | null>(null);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#800000");
  const { canEditProjects } = usePermissions();

  const fetchRoadmap = useCallback(async () => {
    try {
      setLoading(true);
      // We cast the table name to 'projects' temporarily or use a generic if possible,
      // but since we want to avoid 'any', we can use the unknown casting pattern
      // or just trust the response structure if we typed the state correctly.
      // The cleanest way with current supabase-js types without regeneration is:
      const { data, error } = await supabase
        .from("roadmaps")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();

      if (error) throw error;

      // Type assertion for the data returned from Supabase
      const typedData = data as unknown as RoadmapSettings | null;

      setRoadmap(typedData);
      setWelcomeMessage(typedData?.welcome_message || "");
      if (typedData?.custom_theme) {
        setPrimaryColor(typedData.custom_theme.primary || "#800000");
      }
    } catch (error) {
      console.error("Error fetching roadmap:", error);
      toast.error("Erro ao carregar configurações do roadmap");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchRoadmap();
  }, [fetchRoadmap]);

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const theme: CustomTheme = { primary: primaryColor };

      if (roadmap) {
        const { error } = await supabase
          .from("roadmaps")
          .update({
            welcome_message: welcomeMessage,
            custom_theme: theme as unknown as Json,
          })
          .eq("id", roadmap.id);

        if (error) throw error;

        setRoadmap({
          ...roadmap,
          welcome_message: welcomeMessage,
          custom_theme: theme,
        });
      } else {
        const { data, error } = await supabase
          .from("roadmaps")
          .insert({
            project_id: projectId,
            welcome_message: welcomeMessage,
            custom_theme: theme as unknown as Json,
          })
          .select()
          .single();

        if (error) throw error;
        setRoadmap(data as unknown as RoadmapSettings);
      }
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (checked: boolean) => {
    try {
      setSaving(true);
      if (roadmap) {
        const { error } = await supabase
          .from("roadmaps")
          .update({ is_active: checked })
          .eq("id", roadmap.id);

        if (error) throw error;
        setRoadmap({ ...roadmap, is_active: checked });
      } else {
        // Create new roadmap record if it doesn't exist
        const { data, error } = await supabase
          .from("roadmaps")
          .insert({ project_id: projectId, is_active: checked })
          .select()
          .single();

        if (error) throw error;
        setRoadmap(data as unknown as RoadmapSettings);
      }
      toast.success(checked ? "Roadmap ativado!" : "Roadmap desativado");
    } catch (error) {
      toast.error("Erro ao atualizar roadmap");
    } finally {
      setSaving(false);
    }
  };

  const copyLink = () => {
    if (!roadmap) return;
    const url = `${window.location.origin}/roadmap/${roadmap.share_token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado para a área de transferência!");
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Carregando configurações...
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h2 className="text-sm font-bold tracking-tight">Roadmap Externo</h2>
          <p className="text-xs text-muted-foreground">
            Gerencie o acesso do cliente ao acompanhamento em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                title="Ajuda / Informações"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-sm font-bold">
                  <HelpCircle className="h-4 w-4 text-[#800000]" />
                  Sobre o Roadmap Externo
                </DialogTitle>
                <DialogDescription className="text-xs mt-1">
                  O portal do roadmap permite compartilhar com o cliente, de forma transparente e em tempo real, o andamento de cada etapa do projeto de implantação.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3.5 my-2 text-xs text-slate-600 dark:text-slate-400">
                <div className="space-y-1">
                  <p className="font-bold text-foreground">Principais Funções:</p>
                  <ul className="list-disc pl-4 space-y-1.5 text-[11px]">
                    <li>
                      <strong>Ativação do Portal:</strong> Use a chave de ativação para liberar ou bloquear o acesso do cliente ao link a qualquer momento.
                    </li>
                    <li>
                      <strong>Link Exclusivo:</strong> URL segura e gerada automaticamente para o cliente visualizar o progresso sem precisar de login e senha.
                    </li>
                    <li>
                      <strong>Estatísticas de Acesso:</strong> Monitore a quantidade total de visualizações que o portal recebeu.
                    </li>
                    <li>
                      <strong>Mensagem de Boas-vindas:</strong> Exiba um texto personalizado no topo da página do cliente.
                    </li>
                    <li>
                      <strong>Identidade Visual:</strong> Configure a cor de destaque do portal para alinhar com o tema da marca do cliente.
                    </li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="flex items-center space-x-2 bg-muted/50 py-1.5 px-2.5 rounded-lg border">
            <Switch
              id="roadmap-active"
              checked={roadmap?.is_active || false}
              onCheckedChange={handleToggleActive}
              disabled={saving || !canEditProjects}
              className="scale-90"
            />
            <Label htmlFor="roadmap-active" className="text-xs font-bold">
              {roadmap?.is_active ? "ATIVO" : "INATIVO"}
            </Label>
          </div>
        </div>
      </div>

      <div className="grid gap-3.5 md:grid-cols-2">
        <Card className="border-primary/10 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 py-2 px-3.5">
            <CardTitle className="text-xs font-bold flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-[#800000]" />
              Link de Acesso
            </CardTitle>
            <CardDescription className="text-[10px]">URL exclusiva para o seu cliente.</CardDescription>
          </CardHeader>
          <CardContent className="p-3.5 space-y-3">
            <div className="flex gap-2">
              <Input
                readOnly
                value={
                  roadmap
                    ? `${window.location.origin}/roadmap/${roadmap.share_token}`
                    : "Link não gerado"
                }
                className="bg-muted/50 font-mono text-xs h-8"
              />
              <Button
                size="icon"
                variant="outline"
                disabled={!roadmap?.is_active}
                onClick={copyLink}
                className="h-8 w-8 shrink-0"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button
              className="w-full gap-1.5 bg-[#800000] hover:bg-[#600000] h-8 text-xs font-semibold shadow-sm"
              disabled={!roadmap?.is_active}
              onClick={() =>
                window.open(`/roadmap/${roadmap?.share_token}`, "_blank")
              }
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Visualizar como Cliente
            </Button>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="bg-muted/30 py-2 px-3.5">
            <CardTitle className="text-xs font-bold flex items-center gap-1.5">
              <Palette className="h-4 w-4 text-[#800000]" />
              Estatísticas de Acesso
            </CardTitle>
            <CardDescription className="text-[10px]">Monitoramento de visualizações.</CardDescription>
          </CardHeader>
          <CardContent className="p-3.5 flex flex-col justify-center items-center h-[96px]">
            <div className="text-3xl font-extrabold text-[#800000] mb-1">
              {roadmap?.view_count || 0}
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              Visualizações totais
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3.5 md:grid-cols-1">
        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="bg-muted/30 py-2 px-3.5">
            <CardTitle className="text-xs font-bold flex items-center gap-1.5">
              <Palette className="h-4 w-4 text-[#800000]" />
              Customização da Experiência
            </CardTitle>
            <CardDescription className="text-[10px]">
              Configure como o cliente vê o roadmap.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3.5 space-y-4">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="welcome-msg" className="text-xs font-bold">Mensagem de Boas-vindas</Label>
                <Input
                  id="welcome-msg"
                  placeholder="Ex: Bem-vindo ao seu portal de implantação!"
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  disabled={!canEditProjects}
                  className="h-8 text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  Esta mensagem aparecerá no topo da página do cliente.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Cor de Destaque (Identidade Visual)</Label>
                <div className="flex items-center gap-3">
                  <div className="relative h-8 w-8 rounded border shadow-sm shrink-0 overflow-hidden cursor-pointer">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      disabled={!canEditProjects}
                      className="absolute inset-0 opacity-0 cursor-pointer h-full w-full"
                    />
                    <div
                      className="h-full w-full"
                      style={{ backgroundColor: primaryColor }}
                    />
                  </div>
                  <Input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 font-mono h-8 text-xs"
                    placeholder="#800000"
                    disabled={!canEditProjects}
                  />
                  <div className="flex gap-1.5">
                    {["#800000", "#1a1a1a", "#2563eb", "#16a34a"].map(
                      (color) => (
                        <button
                          key={color}
                          onClick={() => setPrimaryColor(color)}
                          className="h-5.5 w-5.5 rounded-full border border-white/25 shadow-sm transition-transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ backgroundColor: color }}
                          title={color}
                          disabled={!canEditProjects}
                        />
                      ),
                    )}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSaveSettings}
                disabled={saving || !canEditProjects}
                className="w-full bg-[#800000] hover:bg-[#600000] h-8 text-xs font-semibold shadow-sm"
              >
                {saving && <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Salvar Customização
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardContent className="py-2.5 px-4 flex items-center gap-3">
          <div className="p-1.5 bg-[#800000]/10 rounded-full shrink-0">
            <CheckCircle2 className="h-4 w-4 text-[#800000]" />
          </div>
          <div className="space-y-0.5 min-w-0 flex-1">
            <p className="text-xs font-bold">O que o cliente verá?</p>
            <ul className="text-[11px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-0.5 list-disc list-inside">
              <li>Nome do Cartório e Sistema</li>
              <li>Progresso Global (%)</li>
              <li>Status de cada uma das 6 etapas principais</li>
              <li>Link para suporte e mensagem de boas-vindas</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
