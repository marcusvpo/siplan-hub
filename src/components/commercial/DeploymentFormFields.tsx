import React from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DeploymentFormData } from "@/utils/deployment-template";
import { FileText, Calendar, Phone, Wrench, AlertTriangle, Info } from "lucide-react";

interface Props {
  data: DeploymentFormData;
  onChange: (data: DeploymentFormData) => void;
  errors?: Set<string>;
}

const SectionCard = ({
  children, title, icon: Icon, color,
}: {
  children: React.ReactNode; title: string; icon: React.ElementType; color: string;
}) => {
  const styles: Record<string, { border: string; text: string; bg: string }> = {
    indigo:  { border: "border-l-indigo-500",  text: "text-indigo-600 dark:text-indigo-400",   bg: "bg-indigo-50 dark:bg-indigo-950/30"  },
    emerald: { border: "border-l-emerald-500", text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
    amber:   { border: "border-l-amber-500",   text: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-50 dark:bg-amber-950/30"    },
    sky:     { border: "border-l-sky-500",     text: "text-sky-600 dark:text-sky-400",         bg: "bg-sky-50 dark:bg-sky-950/30"        },
    violet:  { border: "border-l-violet-500",  text: "text-violet-600 dark:text-violet-400",   bg: "bg-violet-50 dark:bg-violet-950/30"  },
    rose:    { border: "border-l-rose-500",    text: "text-rose-600 dark:text-rose-400",       bg: "bg-rose-50 dark:bg-rose-950/30"      },
    orange:  { border: "border-l-orange-500",  text: "text-orange-600 dark:text-orange-400",   bg: "bg-orange-50 dark:bg-orange-950/30"  },
  };
  const s = styles[color];
  return (
    <Card className={`border-l-4 ${s.border} shadow-sm hover:shadow-md transition-shadow`}>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className={`text-sm font-bold flex items-center gap-2 ${s.text}`}>
          <span className={`p-1 rounded-md ${s.bg}`}><Icon className="h-3.5 w-3.5" /></span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">{children}</CardContent>
    </Card>
  );
};

/** Required field label with asterisk */
const RL = ({ label }: { label: string }) => (
  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
    {label}<span className="text-red-500 ml-0.5">*</span>
  </div>
);

/** Optional field label */
const OL = ({ label }: { label: string }) => (
  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</div>
);

const ERR = "border-red-400 focus-visible:ring-red-400";

const CheckRow = ({
  checked, onCheckedChange, label,
}: { checked?: boolean; onCheckedChange: (v: boolean | "indeterminate") => void; label: string }) => (
  <label className="flex items-center gap-2 cursor-pointer group">
    <Checkbox checked={checked} onCheckedChange={onCheckedChange}
      className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600" />
    <span className="text-sm group-hover:text-foreground transition-colors">{label}</span>
  </label>
);

const RadioRow = ({ value, label }: { value: string; label: string }) => (
  <label className="flex items-center gap-2 cursor-pointer group">
    <RadioGroupItem value={value} />
    <span className="text-sm group-hover:text-foreground transition-colors">{label}</span>
  </label>
);

const YesNo = ({
  label, value, onChange, hasError,
}: { label: string; value?: boolean; onChange: (v: boolean) => void; hasError?: boolean }) => (
  <div className={`flex items-center justify-between rounded-lg px-3 py-2 gap-3 ${hasError ? "bg-red-50 dark:bg-red-950/20 ring-1 ring-red-400" : "bg-muted/40"}`}>
    <span className="text-sm font-medium">{label}<span className="text-red-500 ml-0.5">*</span></span>
    <div className="flex gap-1">
      <button type="button" onClick={() => onChange(true)}
        className={`px-3 py-1 rounded-md text-xs font-semibold border transition-all ${value === true ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "border-muted-foreground/30 hover:border-emerald-400 hover:text-emerald-600"}`}>Sim</button>
      <button type="button" onClick={() => onChange(false)}
        className={`px-3 py-1 rounded-md text-xs font-semibold border transition-all ${value === false ? "bg-red-500 text-white border-red-500 shadow-sm" : "border-muted-foreground/30 hover:border-red-400 hover:text-red-600"}`}>Não</button>
    </div>
  </div>
);

const formatPhone = (value: string): string => {
  if (!value) return "";
  const clean = value.replace(/\D/g, "");
  const digits = clean.slice(0, 11);
  if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

export function DeploymentFormFields({ data, onChange, errors = new Set() }: Props) {
  const set = (field: keyof DeploymentFormData, value: DeploymentFormData[keyof DeploymentFormData]) =>
    onChange({ ...data, [field]: value });
  const isOrionTN = data.contracted_system === "Orion TN";
  const hasRemote = data.modality === "Remoto" || data.modality === "Misto";
  const e = (field: string) => errors.has(field) ? ERR : "";
  const attr = (field: string) => errors.has(field) ? { "data-field-error": "true" } : {};

  return (
    <div className="space-y-4">

      {/* ── DADOS ADMINISTRATIVOS ── */}
      <SectionCard title="Dados Administrativos" icon={FileText} color="indigo">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1" {...attr("op_number")}>
            <RL label="N.º OP" />
            <Input value={data.op_number || ""} onChange={ev => set("op_number", ev.target.value)}
              placeholder="Nº OP" className={`h-8 text-sm ${e("op_number")}`} />
          </div>
          <div className="space-y-1" {...attr("sales_order_number")}>
            <RL label="N. Pedido de Venda" />
            <Input value={data.sales_order_number || ""} onChange={ev => set("sales_order_number", ev.target.value)}
              placeholder="Pedido" className={`h-8 text-sm ${e("sales_order_number")}`} />
          </div>
          <div className="space-y-1" {...attr("order_date")}>
            <RL label="Data do Pedido" />
            <Input type="date" value={data.order_date || ""} onChange={ev => set("order_date", ev.target.value)}
              className={`h-8 text-sm ${e("order_date")}`} />
          </div>
          <div className="space-y-1" {...attr("docusign_contract_number")}>
            <RL label="N.º Contrato (DocuSign)" />
            <Input value={data.docusign_contract_number || ""} onChange={ev => set("docusign_contract_number", ev.target.value)}
              placeholder="Contrato" className={`h-8 text-sm ${e("docusign_contract_number")}`} />
          </div>
        </div>
      </SectionCard>

      {/* ── ESCOPO CONTRATADO ── */}
      <SectionCard title="Escopo Contratado" icon={Wrench} color="emerald">
        <div className="space-y-4">
          {/* Módulos */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Sistemas / Módulos adicionais contratados:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <CheckRow checked={data.module_lcw} onCheckedChange={v => set("module_lcw", v)} label="LCW (Livro Caixa Web)" />
              <CheckRow checked={data.module_on_hand} onCheckedChange={v => set("module_on_hand", v)} label="On Hand (App Mobile)" />
              <CheckRow checked={data.module_sga} onCheckedChange={v => set("module_sga", v)} label="SGA (Gestão de Atendimento)" />
              {isOrionTN && <CheckRow checked={data.module_editor_modelos} onCheckedChange={v => set("module_editor_modelos", v)} label="Editor de Modelos" />}
              <CheckRow checked={data.module_website} onCheckedChange={v => set("module_website", v)} label="Website" />
              <div className="flex items-center gap-2">
                <Checkbox checked={data.module_other} onCheckedChange={v => set("module_other", v)}
                  className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 shrink-0" />
                <Input disabled={!data.module_other} value={data.module_other_name || ""}
                  onChange={ev => set("module_other_name", ev.target.value)}
                  placeholder="Outro módulo..." className="h-7 text-xs" />
              </div>
            </div>
          </div>

          <div className="border-t pt-3">
            {/* Modalidade */}
            <div className={`flex flex-wrap items-center gap-4 mb-3 ${errors.has("modality") ? "p-2 rounded-md ring-1 ring-red-400 bg-red-50 dark:bg-red-950/20" : ""}`} {...attr("modality")}>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Modalidade<span className="text-red-500 ml-0.5">*</span>
              </p>
              <RadioGroup value={data.modality || ""} onValueChange={v => set("modality", v)} className="flex gap-4">
                {["Presencial", "Remoto", "Misto"].map(m => (
                  <label key={m} className="flex items-center gap-1.5 cursor-pointer">
                    <RadioGroupItem value={m} /><span className="text-sm">{m}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* Horas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1" {...attr("hours_presencial")}>
                <RL label="Horas — Implantação presencial" />
                <div className="relative">
                  <Input value={data.hours_presencial || ""} onChange={ev => set("hours_presencial", ev.target.value)}
                    placeholder="0" className={`h-8 text-sm pr-8 ${e("hours_presencial")}`} />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">h</span>
                </div>
              </div>
              <div className="space-y-1" {...(hasRemote ? attr("hours_remote") : {})}>
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  Horas — Implantação remota/cortesia
                  {hasRemote
                    ? <span className="text-red-500 ml-0.5">*</span>
                    : <Badge variant="outline" className="text-[9px] px-1 py-0 ml-1 text-muted-foreground">Selecione Remoto/Misto</Badge>}
                </div>
                <div className="relative">
                  <Input disabled={!hasRemote} value={data.hours_remote || ""}
                    onChange={ev => set("hours_remote", ev.target.value)}
                    placeholder={hasRemote ? "0" : "—"}
                    className={`h-8 text-sm pr-8 disabled:opacity-40 disabled:cursor-not-allowed ${hasRemote ? e("hours_remote") : ""}`} />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">h</span>
                </div>
              </div>
            </div>
          </div>

          {/* Deslocamento / Hospedagem */}
          <div className="border-t pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <YesNo label="Deslocamento pago pelo cliente?" value={data.travel_paid_by_client}
              onChange={v => set("travel_paid_by_client", v)} hasError={errors.has("travel_paid_by_client")} />
            <YesNo label="Hospedagem paga pelo cliente?" value={data.accommodation_paid_by_client}
              onChange={v => set("accommodation_paid_by_client", v)} hasError={errors.has("accommodation_paid_by_client")} />
          </div>
        </div>
      </SectionCard>

      {/* ── PERFIL DO PROJETO ── */}
      <SectionCard title="Perfil do Projeto" icon={Info} color="amber">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className={`mb-2 ${errors.has("deployment_type") ? "p-2 rounded-md ring-1 ring-red-400 bg-red-50 dark:bg-red-950/20" : ""}`} {...attr("deployment_type")}>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Tipo de implantação<span className="text-red-500 ml-0.5">*</span>
              </p>
              <RadioGroup value={data.deployment_type || ""} onValueChange={v => set("deployment_type", v)} className="space-y-2">
                <RadioRow value="migration_siplan" label="Migração — Siplan/ControlM legado" />
                <RadioRow value="migration_competitor" label="Migração — sistema de concorrente" />
              </RadioGroup>
            </div>
          </div>
          <div className="space-y-1" {...attr("legacy_system")}>
            <RL label="Sistema atual do cartório (legado)" />
            <Input value={data.legacy_system || ""} onChange={ev => set("legacy_system", ev.target.value)}
              placeholder="Ex: SiplanTN, CM TabNot, Outro…" className={`h-8 text-sm ${e("legacy_system")}`} />
          </div>
        </div>
      </SectionCard>

      {/* ── DATAS E AGENDA ── */}
      <SectionCard title="Datas e Agenda" icon={Calendar} color="sky">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="space-y-1">
            <OL label="Data desejada pelo cliente" />
            <Input type="date" value={data.desired_date || ""} onChange={ev => set("desired_date", ev.target.value)}
              className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <OL label="Data máxima (prazo limite)" />
            <Input type="date" value={data.max_date || ""} onChange={ev => set("max_date", ev.target.value)}
              className="h-8 text-sm" />
          </div>
        </div>
        <div className="space-y-1">
          <OL label="Restrições de período" />
          <Textarea value={data.schedule_restrictions || ""} onChange={ev => set("schedule_restrictions", ev.target.value)}
            placeholder="Ex: não pode em setembro por correição, prefere 2ª quinzena, etc." rows={2} className="text-sm resize-none" />
        </div>
      </SectionCard>

      {/* ── CONTATOS DO CARTÓRIO ── */}
      <SectionCard title="Contatos do Cartório" icon={Phone} color="violet">
        <div className="space-y-3">
          {/* Tabelião */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Tabelião / Oficial responsável
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Input value={data.official_name || ""} onChange={ev => set("official_name", ev.target.value)}
                placeholder="Nome" className="h-8 text-sm" />
              <Input type="tel" value={data.official_phone || ""} onChange={ev => set("official_phone", formatPhone(ev.target.value))}
                placeholder="(00) 00000-0000" className="h-8 text-sm" />
              <Input value={data.official_email || ""} onChange={ev => set("official_email", ev.target.value)}
                placeholder="E-mail" className="h-8 text-sm" />
            </div>
          </div>
          <div className="border-t" />
          {/* TI */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Responsável pelo TI / Servidor
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Input value={data.it_name || ""} onChange={ev => set("it_name", ev.target.value)}
                placeholder="Nome" className="h-8 text-sm" />
              <Input type="tel" value={data.it_phone || ""} onChange={ev => set("it_phone", formatPhone(ev.target.value))}
                placeholder="(00) 00000-0000" className="h-8 text-sm" />
              <Input value={data.it_email || ""} onChange={ev => set("it_email", ev.target.value)}
                placeholder="E-mail" className="h-8 text-sm" />
            </div>
          </div>
          <div className="border-t" />
          {/* Operacional */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Responsável operacional
            </p>
            <div className="grid grid-cols-4 gap-2">
              <Input value={data.operational_name || ""} onChange={ev => set("operational_name", ev.target.value)}
                placeholder="Nome" className="h-8 text-sm" />
              <Input value={data.operational_role || ""} onChange={ev => set("operational_role", ev.target.value)}
                placeholder="Cargo" className="h-8 text-sm" />
              <Input type="tel" value={data.operational_phone || ""} onChange={ev => set("operational_phone", formatPhone(ev.target.value))}
                placeholder="(00) 00000-0000" className="h-8 text-sm" />
              <Input value={data.operational_email || ""} onChange={ev => set("operational_email", ev.target.value)}
                placeholder="E-mail" className="h-8 text-sm" />
            </div>
          </div>
          <div className="border-t" />
          <div className="space-y-1">
            <OL label="Outros contatos relevantes" />
            <Textarea value={data.other_contacts || ""} onChange={ev => set("other_contacts", ev.target.value)}
              placeholder="Outros contatos..." rows={2} className="text-sm resize-none" />
          </div>
        </div>
      </SectionCard>

      {/* ── EDITOR DE MODELOS — só Orion TN ── */}
      {isOrionTN && (
        <SectionCard title="Editor de Modelos (preencher se contratado)" icon={FileText} color="rose">
          <div className={`${errors.has("editor_status") ? "p-2 rounded-md ring-1 ring-red-400 bg-red-50 dark:bg-red-950/20" : ""}`} {...attr("editor_status")}>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Status<span className="text-red-500 ml-0.5">*</span>
            </p>
            <RadioGroup value={data.editor_status || ""} onValueChange={v => set("editor_status", v)} className="space-y-2">
              <RadioRow value="not_applicable" label="Não se aplica (Editor não contratado)" />
              <RadioRow value="contracted" label="Contratado" />
            </RadioGroup>
          </div>
          {data.editor_status === "contracted" && (
            <div className="mt-3 pl-5 border-l-2 border-rose-300 dark:border-rose-700 space-y-3">
              <div className={`${errors.has("editor_send_status") ? "p-2 rounded-md ring-1 ring-red-400 bg-red-50 dark:bg-red-950/20" : ""}`} {...attr("editor_send_status")}>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Status do envio dos modelos<span className="text-red-500 ml-0.5">*</span>
                </p>
                <RadioGroup value={data.editor_send_status || ""} onValueChange={v => set("editor_send_status", v)} className="space-y-1.5">
                  <RadioRow value="not_oriented" label="Cliente ainda não foi orientado a enviar" />
                  <RadioRow value="oriented_waiting" label="Cliente orientado — aguardando envio" />
                  <RadioRow value="sent_to_team" label="Modelos já enviados para equipe de modelos" />
                </RadioGroup>
              </div>
              <div className="space-y-1">
                <OL label="Prazo combinado para envio dos modelos" />
                <Input type="date" value={data.editor_deadline || ""} onChange={ev => set("editor_deadline", ev.target.value)}
                  className="h-8 text-sm" />
              </div>
            </div>
          )}
        </SectionCard>
      )}

      {/* ── CONDIÇÕES ESPECIAIS ── */}
      <SectionCard title="Condições Especiais e Observações" icon={AlertTriangle} color="orange">
        <div className="space-y-3">
          <div className="space-y-1">
            <OL label="Condições especiais negociadas" />
            <Textarea value={data.special_conditions || ""} onChange={ev => set("special_conditions", ev.target.value)}
              placeholder="Ex: compromissos de prazo, preferências do tabelião, restrições de horário, histórico de relacionamento, etc."
              rows={3} className="text-sm resize-none" />
          </div>
          <div>
            <div className={`${errors.has("urgency_level") ? "p-2 rounded-md ring-1 ring-red-400 bg-red-50 dark:bg-red-950/20 mb-2" : "mb-2"}`}>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Nível de urgência<span className="text-red-500 ml-0.5">*</span>
              </p>
              <RadioGroup value={data.urgency_level || "normal"} onValueChange={v => set("urgency_level", v)} className="space-y-1.5">
                <RadioRow value="normal" label="Normal — seguir fila padrão" />
                <RadioRow value="high" label="Alta — cliente com prazo apertado" />
                <RadioRow value="critical" label="Crítica — aprovada pela diretoria" />
              </RadioGroup>
            </div>
            {(data.urgency_level === "high" || data.urgency_level === "critical") && (
              <div className="pl-5 space-y-1">
                <OL label="Justificativa" />
                <Input value={data.urgency_justification || ""} onChange={ev => set("urgency_justification", ev.target.value)}
                  placeholder="Justificativa da urgência..." className="h-8 text-sm" />
              </div>
            )}
          </div>
          <div className="border-t pt-3 space-y-1" {...attr("filled_by")}>
            <RL label="Preenchido por" />
            <Input value={data.filled_by || ""} readOnly
              placeholder="Nome do usuário" className={`h-8 text-sm bg-muted/50 ${e("filled_by")}`} />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
