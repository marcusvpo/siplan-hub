import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2, Plus, Trash2, ClipboardCheck, Building2, User, HelpCircle, ArrowRight
} from "lucide-react";
import { useSingleCommercialChecklist, useCommercialChecklists } from "@/hooks/useCommercialChecklists";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FormRenderer } from "@/components/FormRenderer/FormRenderer";

interface KeyPerson {
  name: string;
  role: string;
  contact: string;
}

export default function PublicChecklist() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  // Force light mode on document element
  useEffect(() => {
    const html = document.documentElement;
    const hadDark = html.classList.contains("dark");
    if (hadDark) {
      html.classList.remove("dark");
    }
    html.classList.add("light");
    return () => {
      html.classList.remove("light");
      if (hadDark) {
        html.classList.add("dark");
      }
    };
  }, []);
  
  // Single query for unauthenticated fetch
  const { data: checklist, isLoading, error } = useSingleCommercialChecklist(id || null);
  const { submitChecklist } = useCommercialChecklists();

  const templateId = checklist?.template_id;
  const systemType = checklist?.projects?.systemType || "Orion TN";

  // Query the template to use
  const { data: template, isLoading: isLoadingTemplate } = useQuery({
    queryKey: ["checklist-template", templateId, systemType],
    queryFn: async () => {
      // 1. If templateId is provided, fetch it directly
      if (templateId) {
        const { data, error } = await supabase
          .from("form_templates")
          .select("*")
          .eq("id", templateId)
          .single();
        if (!error && data) return data;
      }
      
      // 2. Fallback: fetch active template for systemType
      const { data, error } = await supabase
        .from("form_templates")
        .select("*")
        .eq("kind", "commercial_checklist")
        .eq("system_type", systemType)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!checklist,
  });

  // Dynamic responses state
  const [dynamicResponses, setDynamicResponses] = useState<any>({});

  // Sync draft responses once loaded
  useEffect(() => {
    if (checklist?.responses && Object.keys(checklist.responses).length > 0) {
      setDynamicResponses(checklist.responses);
    }
  }, [checklist]);

  // Form states
  const [fullname, setFullname] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [phones, setPhones] = useState<string[]>([""]);
  const [fillDate, setFillDate] = useState(new Date().toISOString().split("T")[0]);

  const [floors, setFloors] = useState("");
  const [structureObs, setStructureObs] = useState("");

  const [sectors, setSectors] = useState("");
  const [sectorsDistribution, setSectorsDistribution] = useState("");
  const [sectorsObs, setSectorsObs] = useState("");

  const [keyPeople, setKeyPeople] = useState<KeyPerson[]>([{ name: "", role: "", contact: "" }]);
  const [employeesBySector, setEmployeesBySector] = useState("");
  const [totalEmployees, setTotalEmployees] = useState("");
  const [awareOfChange, setAwareOfChange] = useState("");
  const [teamAdaptability, setTeamAdaptability] = useState("");
  const [employeesObs, setEmployeesObs] = useState("");

  const [formErrors, setFormErrors] = useState<Set<string>>(new Set());
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Set initial form states if there are draft responses
  useEffect(() => {
    if (checklist?.responses && Object.keys(checklist.responses).length > 0) {
      const r = checklist.responses;
      if (r.fullname) setFullname(r.fullname);
      if (r.role) setRole(r.role);
      if (r.email) setEmail(r.email);
      if (r.phones) setPhones(r.phones);
      if (r.fill_date) setFillDate(r.fill_date);
      if (r.floors) setFloors(r.floors);
      if (r.structure_obs) setStructureObs(r.structure_obs);
      if (r.sectors) setSectors(r.sectors);
      if (r.sectors_distribution) setSectorsDistribution(r.sectors_distribution);
      if (r.sectors_obs) setSectorsObs(r.sectors_obs);
      if (r.key_people) setKeyPeople(r.key_people);
      if (r.employees_by_sector) setEmployeesBySector(r.employees_by_sector);
      if (r.total_employees) setTotalEmployees(r.total_employees);
      if (r.aware_of_change) setAwareOfChange(r.aware_of_change);
      if (r.team_adaptability) setTeamAdaptability(r.team_adaptability);
      if (r.employees_obs) setEmployeesObs(r.employees_obs);
    }
  }, [checklist]);

  if (isLoading || (!!checklist && isLoadingTemplate)) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="text-sm text-slate-500 font-medium animate-pulse">Carregando formulário do checklist...</p>
        </div>
      </div>
    );
  }

  if (error || !checklist) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
        <Card className="max-w-md w-full bg-white border-slate-200 shadow-xl">
          <CardContent className="p-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-2">
              <HelpCircle className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Checklist não encontrado</h2>
            <p className="text-sm text-slate-500">
              O link que você está tentando acessar é inválido, expirou ou o checklist foi removido pelo comercial.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If already submitted
  if (checklist.status === "submitted" || submittedSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full bg-white border-slate-200 shadow-xl animate-in zoom-in-95 duration-300">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4 animate-bounce">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Checklist Finalizado!</h2>
            <p className="text-sm text-slate-600">
              Muito obrigado! As informações da serventia foram recebidas pelo time comercial.
            </p>
            <p className="text-xs text-slate-500 bg-slate-100 p-3 rounded-lg border border-slate-200">
              Como medida de segurança e integridade das respostas, este link temporário foi desativado e não aceita novos envios.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle phone changes
  const handlePhoneChange = (index: number, val: string) => {
    const updated = [...phones];
    updated[index] = val;
    setPhones(updated);
  };

  const addPhoneField = () => {
    setPhones([...phones, ""]);
  };

  const removePhoneField = (index: number) => {
    if (phones.length <= 1) return;
    const updated = phones.filter((_, idx) => idx !== index);
    setPhones(updated);
  };

  // Handle key people changes
  const handleKeyPersonChange = (index: number, field: keyof KeyPerson, val: string) => {
    const updated = [...keyPeople];
    updated[index] = { ...updated[index], [field]: val };
    setKeyPeople(updated);
  };

  const addKeyPerson = () => {
    setKeyPeople([...keyPeople, { name: "", role: "", contact: "" }]);
  };

  const removeKeyPerson = (index: number) => {
    if (keyPeople.length <= 1) return;
    const updated = keyPeople.filter((_, idx) => idx !== index);
    setKeyPeople(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const errors = new Set<string>();
    if (!fullname.trim()) errors.add("fullname");
    if (!role.trim()) errors.add("role");
    if (!email.trim()) errors.add("email");
    if (phones.some(p => !p.trim())) errors.add("phones");
    if (!floors.trim()) errors.add("floors");
    if (!sectors.trim()) errors.add("sectors");
    if (!sectorsDistribution.trim()) errors.add("sectorsDistribution");
    if (!totalEmployees.trim()) errors.add("totalEmployees");
    if (!awareOfChange) errors.add("awareOfChange");
    if (!teamAdaptability.trim()) errors.add("teamAdaptability");

    // Also check key people if any fields are half filled
    const keyPeopleValid = keyPeople.every(p => {
      const anyFilled = p.name.trim() || p.role.trim() || p.contact.trim();
      const allFilled = p.name.trim() && p.role.trim() && p.contact.trim();
      return !anyFilled || allFilled; // either empty or fully filled
    });
    if (!keyPeopleValid) {
      errors.add("keyPeople");
      toast({
        title: "Pessoas Chaves incompletas",
        description: "Preencha todos os campos (Nome, Cargo, Contato) para cada pessoa chave adicionada.",
        variant: "destructive"
      });
    }

    setFormErrors(errors);

    if (errors.size > 0) {
      toast({
        title: "Campos obrigatórios pendentes",
        description: "Por favor, revise os campos destacados em vermelho antes de enviar.",
        variant: "destructive"
      });
      // Scroll to first error
      setTimeout(() => {
        document.querySelector("[data-error]")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }

    const payload = {
      fullname,
      role,
      email,
      phones: phones.filter(p => p.trim() !== ""),
      fill_date: fillDate,
      floors: parseInt(floors, 10),
      structure_obs: structureObs,
      sectors,
      sectors_distribution: sectorsDistribution,
      sectors_obs: sectorsObs,
      key_people: keyPeople.filter(p => p.name.trim() !== ""),
      employees_by_sector: employeesBySector,
      total_employees: parseInt(totalEmployees, 10),
      aware_of_change: awareOfChange,
      team_adaptability: teamAdaptability,
      employees_obs: employeesObs,
    };

    submitChecklist.mutate({ id: checklist.id, responses: payload }, {
      onSuccess: () => {
        setSubmittedSuccess(true);
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans antialiased selection:bg-primary/20 selection:text-primary">
      {/* Premium Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/assets/Siplan_logo.png" alt="Siplan" className="h-8 w-auto object-contain" />
            <div className="h-4 w-px bg-slate-200 mx-2" />
            <span className="text-xs text-slate-500 font-bold tracking-wide uppercase">
              Checklist de Implantação
            </span>
          </div>
          <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs font-semibold px-2.5 py-0.5">
            Cliente
          </Badge>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8 space-y-6">
        {/* Intro Card */}
        <Card className="bg-white border-slate-200 shadow-md relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
          <CardHeader className="pt-6">
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-primary">
              <ClipboardCheck className="h-5.5 w-5.5 text-primary" />
              Checklist Estrutural da Serventia
            </CardTitle>
            <CardDescription className="text-slate-500 text-xs mt-1 leading-relaxed">
              Olá! Este formulário foi gerado pelo time Comercial para coletar informações básicas sobre a estrutura e os colaboradores do cartório. Essas respostas são fundamentais para que nossa equipe técnica prepare o ambiente de implantação da melhor forma.
            </CardDescription>
          </CardHeader>
        </Card>

        {template ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* IDENTIFICAÇÃO CARD - READ-ONLY */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                  <Building2 className="h-4.5 w-4.5 text-primary" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Identificação (Siplan)</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Sistema a Implantar</span>
                    <span className="font-semibold text-slate-700">{checklist.projects?.systemType || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Nome do Cartório</span>
                    <span className="font-semibold text-slate-700">{checklist.projects?.clientName || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Responsável Siplan</span>
                    <span className="font-semibold text-slate-700">{checklist.created_by_name || "—"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-md p-6">
              <FormRenderer
                projectId={checklist.project_id}
                schema={template.schema_json}
                uiSchema={template.ui_json}
                formData={dynamicResponses}
                onChange={({ formData }) => setDynamicResponses(formData)}
                onSubmit={() => {
                  submitChecklist.mutate({ id: checklist.id, responses: dynamicResponses }, {
                    onSuccess: () => {
                      setSubmittedSuccess(true);
                    }
                  });
                }}
                submitLabel="Finalizar e Enviar Checklist"
              />
            </Card>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
          {/* IDENTIFICAÇÃO CARD - READ-ONLY */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                <Building2 className="h-4.5 w-4.5 text-primary" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Identificação (Siplan)</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Sistema a Implantar</span>
                  <span className="font-semibold text-slate-700">{checklist.projects?.systemType || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Nome do Cartório</span>
                  <span className="font-semibold text-slate-700">{checklist.projects?.clientName || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Responsável Siplan</span>
                  <span className="font-semibold text-slate-700">{checklist.created_by_name || "—"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO 1: RESPONSÁVEL PREENCHIMENTO */}
          <Card className={`bg-white border-slate-200 shadow-md transition-all ${formErrors.has("fullname") || formErrors.has("role") || formErrors.has("email") || formErrors.has("phones") ? "ring-1 ring-red-500/50" : ""}`}>
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">Responsável pelo Preenchimento</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5" data-error={formErrors.has("fullname") ? "true" : undefined}>
                  <Label className="text-xs font-semibold text-slate-700">Nome Completo *</Label>
                  <Input
                    value={fullname}
                    onChange={(e) => setFullname(e.target.value)}
                    placeholder="Seu nome completo"
                    className={`bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-primary ${formErrors.has("fullname") ? "border-red-500/80 focus-visible:ring-red-500" : ""}`}
                  />
                </div>
                <div className="space-y-1.5" data-error={formErrors.has("role") ? "true" : undefined}>
                  <Label className="text-xs font-semibold text-slate-700">Cargo / Função *</Label>
                  <Input
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Ex: Oficial Substituto, Tabelião, TI"
                    className={`bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-primary ${formErrors.has("role") ? "border-red-500/80 focus-visible:ring-red-500" : ""}`}
                  />
                </div>
                <div className="space-y-1.5" data-error={formErrors.has("email") ? "true" : undefined}>
                  <Label className="text-xs font-semibold text-slate-700">E-mail de Contato *</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@cartorio.com.br"
                    className={`bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-primary ${formErrors.has("email") ? "border-red-500/80 focus-visible:ring-red-500" : ""}`}
                  />
                </div>
                <div className="space-y-1.5" data-error={formErrors.has("phones") ? "true" : undefined}>
                  <Label className="text-xs font-semibold text-slate-700">Telefone / WhatsApp *</Label>
                  <div className="space-y-2">
                    {phones.map((phone, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          value={phone}
                          onChange={(e) => handlePhoneChange(idx, e.target.value)}
                          placeholder="(99) 99999-9999"
                          className={`bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-primary ${formErrors.has("phones") && !phone.trim() ? "border-red-500/80 focus-visible:ring-red-500" : ""}`}
                        />
                        {phones.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removePhoneField(idx)}
                            className="h-9 w-9 text-red-500 hover:text-red-655 hover:bg-red-50/50 shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addPhoneField}
                      className="mt-1 gap-1 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-primary"
                    >
                      <Plus className="h-3.5 w-3.5" /> Adicionar Telefone
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Data do Preenchimento</Label>
                  <Input
                    type="date"
                    value={fillDate}
                    onChange={(e) => setFillDate(e.target.value)}
                    className="bg-slate-50/50 border-slate-200 text-slate-900 max-w-xs focus-visible:ring-primary"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO 2: ESTRUTURA FÍSICA E ORGANIZACIONAL */}
          <Card className={`bg-white border-slate-200 shadow-md transition-all ${formErrors.has("floors") ? "ring-1 ring-red-500/50" : ""}`}>
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">Estrutura Física e Organizacional</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-4">
                <div className="space-y-1.5 max-w-sm" data-error={formErrors.has("floors") ? "true" : undefined}>
                  <Label className="text-xs font-semibold text-slate-700">Quantos andares possui a serventia? *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={floors}
                    onChange={(e) => setFloors(e.target.value)}
                    placeholder="Ex: 2"
                    className={`bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-primary ${formErrors.has("floors") ? "border-red-500/80 focus-visible:ring-red-500" : ""}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Observações adicionais sobre o local</Label>
                  <Textarea
                    value={structureObs}
                    onChange={(e) => setStructureObs(e.target.value)}
                    placeholder="Descreva detalhes importantes da serventia (ex: possui elevador, rede interna estruturada, divisórias de vidro, etc.)"
                    className="bg-slate-50/50 border-slate-200 text-slate-900 min-h-[80px] placeholder:text-slate-400 focus-visible:ring-primary"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO 3: DISTRIBUIÇÃO POR SETORES */}
          <Card className={`bg-white border-slate-200 shadow-md transition-all ${formErrors.has("sectors") || formErrors.has("sectorsDistribution") ? "ring-1 ring-red-500/50" : ""}`}>
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">Distribuição por setores</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-4">
                <div className="space-y-1.5" data-error={formErrors.has("sectors") ? "true" : undefined}>
                  <Label className="text-xs font-semibold text-slate-700">Quais setores existem no estabelecimento? *</Label>
                  <Input
                    value={sectors}
                    onChange={(e) => setSectors(e.target.value)}
                    placeholder="Ex: Registro Civil, RI, RTD, Notas, Protesto, Financeiro, TI"
                    className={`bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-primary ${formErrors.has("sectors") ? "border-red-500/80 focus-visible:ring-red-500" : ""}`}
                  />
                </div>
                <div className="space-y-1.5" data-error={formErrors.has("sectorsDistribution") ? "true" : undefined}>
                  <Label className="text-xs font-semibold text-slate-700">Como os setores estão distribuídos nos andares? *</Label>
                  <Textarea
                    value={sectorsDistribution}
                    onChange={(e) => setSectorsDistribution(e.target.value)}
                    placeholder="Ex: Térreo (Civil e Notas), 1.º andar (RI e RTD), 2.º andar (Diretoria, Financeiro e Servidor)."
                    className={`bg-slate-50/50 border-slate-200 text-slate-900 min-h-[80px] placeholder:text-slate-400 focus-visible:ring-primary ${formErrors.has("sectorsDistribution") ? "border-red-500/80 focus-visible:ring-red-500" : ""}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Observações adicionais sobre setores</Label>
                  <Textarea
                    value={sectorsObs}
                    onChange={(e) => setSectorsObs(e.target.value)}
                    placeholder="Observações adicionais..."
                    className="bg-slate-50/50 border-slate-200 text-slate-900 min-h-[70px] placeholder:text-slate-400 focus-visible:ring-primary"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO 4: ESTRUTURA DE COLABORADORES */}
          <Card className={`bg-white border-slate-200 shadow-md transition-all ${formErrors.has("keyPeople") || formErrors.has("totalEmployees") || formErrors.has("awareOfChange") || formErrors.has("teamAdaptability") ? "ring-1 ring-red-500/50" : ""}`}>
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">Estrutura de Colaboradores</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-5">
              
              {/* Dynamic key communication people */}
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase text-slate-500 block tracking-wide">Pessoa(s) Chave(s) para comunicação na Serventia</Label>
                <div className="space-y-3">
                  {keyPeople.map((person, idx) => (
                    <div key={idx} className="bg-slate-50/50 p-3 rounded-lg border border-slate-200 space-y-3 relative">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-500">Nome Completo</Label>
                          <Input
                            value={person.name}
                            onChange={(e) => handleKeyPersonChange(idx, "name", e.target.value)}
                            placeholder="Nome do contato chave"
                            className="bg-white border-slate-200 text-xs h-8 text-slate-900 placeholder:text-slate-400"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-500">Cargo / Setor</Label>
                          <Input
                            value={person.role}
                            onChange={(e) => handleKeyPersonChange(idx, "role", e.target.value)}
                            placeholder="Cargo"
                            className="bg-white border-slate-200 text-xs h-8 text-slate-900 placeholder:text-slate-400"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-500">Contato (Tel/Email)</Label>
                          <Input
                            value={person.contact}
                            onChange={(e) => handleKeyPersonChange(idx, "contact", e.target.value)}
                            placeholder="Ex: (99) 99999-9999"
                            className="bg-white border-slate-200 text-xs h-8 text-slate-900 placeholder:text-slate-400"
                          />
                        </div>
                      </div>
                      {keyPeople.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeKeyPerson(idx)}
                          className="h-6 w-6 text-red-500 hover:text-red-600 absolute -top-1.5 -right-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-full"
                          title="Remover Contato"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addKeyPerson}
                    className="gap-1 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-primary"
                  >
                    <Plus className="h-3.5 w-3.5" /> Adicionar Contato Chave
                  </Button>
                </div>
              </div>

              <div className="space-y-4 pt-3 border-t border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold text-slate-700">Quantidade de colaboradores por setor</Label>
                    <Textarea
                      value={employeesBySector}
                      onChange={(e) => setEmployeesBySector(e.target.value)}
                      placeholder="Ex: Notas (5), Civil (3), RI (8), Financeiro (2)"
                      className="bg-slate-50/50 border-slate-200 text-slate-900 min-h-[60px] placeholder:text-slate-400 focus-visible:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5" data-error={formErrors.has("totalEmployees") ? "true" : undefined}>
                    <Label className="text-xs font-semibold text-slate-700">Quantidade total de colaboradores *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={totalEmployees}
                      onChange={(e) => setTotalEmployees(e.target.value)}
                      placeholder="Ex: 18"
                      className={`bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-primary ${formErrors.has("totalEmployees") ? "border-red-500/80 focus-visible:ring-red-500" : ""}`}
                    />
                  </div>

                  <div className="space-y-1.5" data-error={formErrors.has("awareOfChange") ? "true" : undefined}>
                    <Label className="text-xs font-semibold text-slate-700">Todos os colaboradores estão cientes da mudança do sistema? *</Label>
                    <Select value={awareOfChange} onValueChange={setAwareOfChange}>
                      <SelectTrigger className={`bg-slate-50/50 border-slate-200 text-slate-900 h-10 ${formErrors.has("awareOfChange") ? "border-red-500/80" : ""}`}>
                        <SelectValue placeholder="Selecione a resposta" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 text-slate-800">
                        <SelectItem value="Sim">Sim</SelectItem>
                        <SelectItem value="Não">Não</SelectItem>
                        <SelectItem value="Parcialmente">Parcialmente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2" data-error={formErrors.has("teamAdaptability") ? "true" : undefined}>
                    <Label className="text-xs font-semibold text-slate-700">Como a equipe lida com mudanças ou sistemas novos? *</Label>
                    <Textarea
                      value={teamAdaptability}
                      onChange={(e) => setTeamAdaptability(e.target.value)}
                      placeholder="Descreva a receptividade da equipe a novos processos (ex: ansiosos, receptivos, resistentes, facilidade com tecnologia...)"
                      className={`bg-slate-50/50 border-slate-200 text-slate-900 min-h-[80px] placeholder:text-slate-400 focus-visible:ring-primary ${formErrors.has("teamAdaptability") ? "border-red-500/80 focus-visible:ring-red-500" : ""}`}
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold text-slate-700">Observações adicionais sobre equipe/comunicação</Label>
                    <Textarea
                      value={employeesObs}
                      onChange={(e) => setEmployeesObs(e.target.value)}
                      placeholder="Observações..."
                      className="bg-slate-50/50 border-slate-200 text-slate-900 min-h-[70px] placeholder:text-slate-400 focus-visible:ring-primary"
                    />
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Submissão */}
          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              size="lg"
              disabled={submitChecklist.isPending}
              className="bg-primary hover:bg-primary/95 text-white font-bold px-8 shadow-lg shadow-primary/20 gap-2 shrink-0 active:scale-[0.98]"
            >
              <ClipboardCheck className="h-5 w-5" />
              {submitChecklist.isPending ? "Processando Envio..." : "Finalizar e Enviar Checklist"}
              <ArrowRight className="h-4 w-4" />
            </Button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
