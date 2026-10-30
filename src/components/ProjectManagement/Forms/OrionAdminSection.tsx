import { useState, useEffect, useMemo } from "react";
import { EnvironmentStageV2, ProjectV2 } from "@/types/ProjectV2";
import { getProjectOrionAdminStatus } from "@/lib/secondary-products";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  KeyRound,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  AlertTriangle,
  Info,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrionAdminSectionProps {
  stage: EnvironmentStageV2;
  project: ProjectV2;
  canEdit: boolean;
  currentUserName?: string;
  onUpdate: (updates: Partial<EnvironmentStageV2>) => void;
}

export function OrionAdminSection({
  stage,
  project,
  canEdit,
  currentUserName = "Usuário",
  onUpdate,
}: OrionAdminSectionProps) {
  const [copied, setCopied] = useState(false);
  const [localConfig, setLocalConfig] = useState(stage.orionAdminConfig || "");
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setLocalConfig(stage.orionAdminConfig || "");
    setIsDirty(false);
  }, [stage.orionAdminConfig]);

  const orionStatus = useMemo(() => {
    return getProjectOrionAdminStatus(project);
  }, [project]);

  const isConfigured = Boolean(
    stage.orionAdminConfigured ?? (stage.orionAdminConfig && stage.orionAdminConfig.trim().length > 10)
  );

  const detectedKeys = useMemo(() => {
    const text = localConfig || "";
    return [
      { id: "url", key: "urlAdminCentral", label: "URL Central", found: /urladmincentral/i.test(text) },
      { id: "user", key: "usuarioAdminCentral", label: "Usuário", found: /usuarioadmincentral/i.test(text) },
      { id: "pass", key: "senhaAdminCentral", label: "Senha", found: /senhaadmincentral/i.test(text) },
      { id: "cns", key: "cns", label: "CNS", found: /\bcns\b/i.test(text) },
    ];
  }, [localConfig]);

  const handleCopyProperties = async () => {
    const text = localConfig.trim();
    if (!text) {
      toast.error("Nenhuma propriedade informada para copiar.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Propriedades do Orion Admin copiadas com sucesso!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Falha ao copiar para a área de transferência.");
    }
  };

  const handleToggleStatus = (checked: boolean) => {
    if (!canEdit) return;
    const now = new Date().toISOString();
    onUpdate({
      orionAdminConfigured: checked,
      orionAdminConfiguredAt: checked ? now : undefined,
      orionAdminConfiguredBy: checked ? currentUserName : undefined,
      orionAdminConfig: localConfig,
    });
    if (checked) {
      toast.success("Orion Admin marcado como Configurado!");
    } else {
      toast.info("Orion Admin alterado para Pendente.");
    }
  };

  const handleSaveConfig = () => {
    if (!canEdit) return;
    const shouldMarkConfigured =
      stage.orionAdminConfigured ?? (localConfig.trim().length > 10);
    const now = new Date().toISOString();

    onUpdate({
      orionAdminConfig: localConfig,
      orionAdminConfigured: shouldMarkConfigured,
      orionAdminConfiguredAt: shouldMarkConfigured ? stage.orionAdminConfiguredAt || now : undefined,
      orionAdminConfiguredBy: shouldMarkConfigured ? stage.orionAdminConfiguredBy || currentUserName : undefined,
    });
    setIsDirty(false);
    toast.success("Configurações do Orion Admin salvas com sucesso!");
  };

  const handleInsertTemplate = () => {
    if (!canEdit) return;
    const cns = (project.customFields?.cns as string | undefined) || "00.000-0";
    const template = [
      "# ====================================================",
      "# Propriedades de Conexao Orion Admin / Connect",
      `# Serventia: ${project.clientName}`,
      `# CNS: ${cns}`,
      "# ====================================================",
      "urlAdminCentral=https://admin.siplan.com.br/api",
      "usuarioAdminCentral=",
      "senhaAdminCentralHttp=",
      `cns=${cns}`,
      "",
    ].join("\n");
    setLocalConfig(template);
    setIsDirty(true);
  };

  return (
    <div
      id="orion-admin-stage-section"
      className="rounded-lg border border-border/80 bg-card p-4 sm:p-5 shadow-xs transition-all duration-300"
    >
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
              isConfigured
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
            }`}
          >
            {isConfigured ? (
              <ShieldCheck className="h-5 w-5" />
            ) : (
              <KeyRound className="h-5 w-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-foreground tracking-tight">
                Configuração no Orion Admin
              </h4>
              <Badge
                variant="outline"
                className={`text-[11px] font-semibold px-2 py-0.5 border ${
                  isConfigured
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                }`}
              >
                {isConfigured ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Configurado no Orion Admin
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Pendente de Configuração
                  </span>
                )}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Geração de chaves no Orion Connect para os produtos secundários dependentes
            </p>
          </div>
        </div>

        {/* Toggle de Status */}
        <div className="flex items-center gap-3 bg-muted/40 px-3 py-1.5 rounded-lg border border-border/50 self-start sm:self-auto">
          <Label
            htmlFor="orion-admin-switch"
            className="text-xs font-medium cursor-pointer select-none text-muted-foreground"
          >
            {isConfigured ? "Marcado como Configurado" : "Marcar como Configurado"}
          </Label>
          <Switch
            id="orion-admin-switch"
            checked={isConfigured}
            disabled={!canEdit}
            onCheckedChange={handleToggleStatus}
            className="data-[state=checked]:bg-emerald-600"
          />
        </div>
      </div>

      {/* Banner de Produtos Dependentes */}
      <div className="mt-4">
        {orionStatus.dependentProducts.length > 0 ? (
          <div className="flex items-start gap-2.5 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-amber-950 dark:text-amber-100">
                Produtos dependentes do Orion Admin identificados neste projeto:
              </p>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {orionStatus.dependentProducts.map((prod) => (
                  <span
                    key={prod}
                    className="inline-flex items-center rounded-md bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-950 dark:text-amber-100 border border-amber-500/30"
                  >
                    {prod}
                  </span>
                ))}
              </div>
              <p className="text-[11px] opacity-90 pt-1 leading-relaxed">
                Alex ou Bruno geram as chaves na plataforma <strong>Orion Connect</strong> via CNS e realizam a
                configuração e parametrização direta no servidor da serventia (VM e containers). Essa etapa deve estar
                concluída a tempo para que o implantador consiga realizar a homologação e treinamento desses produtos.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md border border-muted bg-muted/30 p-2.5 text-xs text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>
              Nenhum produto secundário dependente (LCW, SGA ou Cartório On Hand) identificado. Preencha
              somente se for necessária integração com o Orion Admin para esta serventia.
            </span>
          </div>
        )}
      </div>

      {/* Editor Monospace de Arquivo de Propriedades */}
      <div className="mt-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">
              Arquivo de Propriedades (.properties)
            </span>
            {/* Badges de chaves detectadas */}
            <div className="hidden sm:flex items-center gap-1.5">
              {detectedKeys.map((item) => (
                <span
                  key={item.id}
                  className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-mono border transition-colors ${
                    item.found
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold"
                      : "bg-muted/50 text-muted-foreground/60 border-border/40"
                  }`}
                  title={item.found ? `Chave "${item.key}" detectada` : `Chave "${item.key}" ausente`}
                >
                  {item.found && <Check className="h-2.5 w-2.5" />}
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {!localConfig && canEdit && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleInsertTemplate}
                className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
              >
                <Sparkles className="h-3 w-3" />
                Inserir Modelo
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!localConfig.trim()}
              onClick={handleCopyProperties}
              className={`h-7 text-xs gap-1.5 font-medium transition-all ${
                copied
                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
                  : "hover:bg-accent"
              }`}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiado!" : "Copiar Propriedades"}
            </Button>
          </div>
        </div>

        {/* Textarea estilo código */}
        <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
          <textarea
            value={localConfig}
            disabled={!canEdit}
            onChange={(e) => {
              setLocalConfig(e.target.value);
              setIsDirty(true);
            }}
            placeholder={`# Cole aqui o conteudo gerado no Orion Connect\nurlAdminCentral=https://admin.siplan.com.br/api\nusuarioAdminCentral=serventia_user\nsenhaAdminCentralHttp=...\ncns=00.000-0`}
            rows={7}
            className="w-full resize-y bg-transparent p-3.5 font-mono text-xs text-emerald-400 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 leading-relaxed selection:bg-emerald-800 selection:text-white"
            spellCheck={false}
          />
        </div>

        {/* Barra Inferior com Auditoria e Salvar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
          <div className="text-muted-foreground text-[11px]">
            {stage.orionAdminConfiguredBy && stage.orionAdminConfiguredAt ? (
              <span>
                Configurado por{" "}
                <strong className="text-foreground">{stage.orionAdminConfiguredBy}</strong> em{" "}
                {format(new Date(stage.orionAdminConfiguredAt), "dd/MM/yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
              </span>
            ) : isConfigured ? (
              <span>Chaves registradas na Preparação de Ambiente</span>
            ) : (
              <span className="text-rose-500 font-medium">Aguardando geração e inserção das chaves</span>
            )}
          </div>

          {canEdit && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {isDirty && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveConfig}
                  className="h-7 text-xs bg-primary text-primary-foreground font-semibold shadow-xs"
                >
                  Salvar Alterações
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
