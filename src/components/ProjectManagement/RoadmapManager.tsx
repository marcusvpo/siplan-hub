import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  Copy,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Globe,
  Palette,
} from "lucide-react";
import { toast } from "sonner";

interface RoadmapManagerProps {
  projectId: string;
}

interface CustomTheme {
  primary?: string;
  secondary?: string;
  background?: string;
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
  config: Record<string, unknown>; // Stricter type than any
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseResult = { data: RoadmapSettings | null; error: Error | null };

export function RoadmapManager({ projectId }: RoadmapManagerProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roadmap, setRoadmap] = useState<RoadmapSettings | null>(null);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#800000");

  const fetchRoadmap = useCallback(async () => {
    try {
      setLoading(true);
      // We cast the table name to 'projects' temporarily or use a generic if possible,
      // but since we want to avoid 'any', we can use the unknown casting pattern
      // or just trust the response structure if we typed the state correctly.
      // The cleanest way with current supabase-js types without regeneration is:
      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("roadmaps" as any)
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from("roadmaps" as any)
          .update({
            welcome_message: welcomeMessage,
            custom_theme: theme,
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from("roadmaps" as any)
          .insert({
            project_id: projectId,
            welcome_message: welcomeMessage,
            custom_theme: theme,
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from("roadmaps" as any)
          .update({ is_active: checked })
          .eq("id", roadmap.id);

        if (error) throw error;
        setRoadmap({ ...roadmap, is_active: checked });
      } else {
        // Create new roadmap record if it doesn't exist
        const { data, error } = await supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from("roadmaps" as any)
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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Roadmap Externo</h2>
          <p className="text-muted-foreground">
            Gerencie o acesso do cliente ao acompanhamento em tempo real.
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-muted/50 p-2 rounded-lg border">
          <Switch
            id="roadmap-active"
            checked={roadmap?.is_active || false}
            onCheckedChange={handleToggleActive}
            disabled={saving}
          />
          <Label htmlFor="roadmap-active" className="font-semibold">
            {roadmap?.is_active ? "ATIVO" : "INATIVO"}
          </Label>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-primary/10 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5 text-[#800000]" />
              Link de Acesso
            </CardTitle>
            <CardDescription>URL exclusiva para o seu cliente.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex gap-2">
              <Input
                readOnly
                value={
                  roadmap
                    ? `${window.location.origin}/roadmap/${roadmap.share_token}`
                    : "Link não gerado"
                }
                className="bg-muted/50 font-mono text-xs"
              />
              <Button
                size="icon"
                variant="outline"
                disabled={!roadmap?.is_active}
                onClick={copyLink}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button
              className="w-full gap-2 bg-[#800000] hover:bg-[#600000]"
              disabled={!roadmap?.is_active}
              onClick={() =>
                window.open(`/roadmap/${roadmap?.share_token}`, "_blank")
              }
            >
              <ExternalLink className="h-4 w-4" />
              Visualizar como Cliente
            </Button>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-lg flex items-center gap-2">
              <Palette className="h-5 w-5 text-[#800000]" />
              Estatísticas de Acesso
            </CardTitle>
            <CardDescription>Monitoramento de visualizações.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 flex flex-col justify-center items-center h-[140px]">
            <div className="text-5xl font-bold text-[#800000] mb-2">
              {roadmap?.view_count || 0}
            </div>
            <p className="text-sm text-muted-foreground uppercase tracking-widest font-medium">
              Visualizações totais
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-lg flex items-center gap-2">
              <Palette className="h-5 w-5 text-[#800000]" />
              Customização da Experiência
            </CardTitle>
            <CardDescription>
              Configure como o cliente vê o roadmap.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="welcome-msg">Mensagem de Boas-vindas</Label>
                <Input
                  id="welcome-msg"
                  placeholder="Ex: Bem-vindo ao seu portal de implantação!"
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Esta mensagem aparecerá no topo da página do cliente.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Cor de Destaque (Identidade Visual)</Label>
                <div className="flex items-center gap-4">
                  <div
                    className="h-10 w-10 rounded-lg border shadow-sm"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <Input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 font-mono"
                    placeholder="#800000"
                  />
                  <div className="flex gap-2">
                    {["#800000", "#1a1a1a", "#2563eb", "#16a34a"].map(
                      (color) => (
                        <button
                          key={color}
                          onClick={() => setPrimaryColor(color)}
                          className="h-6 w-6 rounded-full border border-white/20 shadow-sm transition-transform hover:scale-110"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      )
                    )}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSaveSettings}
                disabled={saving}
                className="w-full bg-[#800000] hover:bg-[#600000]"
              >
                {saving && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Customização
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardContent className="pt-6 flex items-start gap-4">
          <div className="p-3 bg-[#800000]/10 rounded-full">
            <CheckCircle2 className="h-6 w-6 text-[#800000]" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold">O que o cliente verá?</p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
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
