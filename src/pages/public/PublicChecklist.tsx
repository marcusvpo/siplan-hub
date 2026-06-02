import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2, Plus, Trash2, ClipboardCheck, Building2, User, HelpCircle, ArrowRight
} from "lucide-react";
import { useSingleCommercialChecklist, useCommercialChecklists } from "@/hooks/useCommercialChecklists";
import { useToast } from "@/hooks/use-toast";

interface KeyPerson {
  name: string;
  role: string;
  contact: string;
}

export default function PublicChecklist() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  
  // Single query for unauthenticated fetch
  const { data: checklist, isLoading, error } = useSingleCommercialChecklist(id || null);
  const { submitChecklist } = useCommercialChecklists();

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
          <p className="text-sm text-slate-400">Carregando formulário do checklist...</p>
        </div>
      </div>
    );
  }

  if (error || !checklist) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <Card className="max-w-md w-full bg-slate-900 border-slate-800 shadow-2xl">
          <CardContent className="p-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-2">
              <HelpCircle className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-100">Checklist não encontrado</h2>
            <p className="text-sm text-slate-400">
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
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full bg-slate-900 border-slate-800 shadow-2xl animate-in zoom-in-95 duration-300">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4 animate-bounce">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-100">Checklist Finalizado!</h2>
            <p className="text-sm text-slate-300">
              Muito obrigado! As informações da serventia foram recebidas pelo time comercial.
            </p>
            <p className="text-xs text-slate-500 bg-slate-950/50 p-3 rounded-lg border border-slate-850">
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
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Premium Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-black text-lg tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              SIPLAN HUB
            </span>
            <div className="h-4 w-px bg-slate-800 mx-2" />
            <span className="text-xs text-slate-400 font-medium tracking-wide uppercase">
              Checklist de Implantação
            </span>
          </div>
          <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold px-2.5 py-0.5">
            Cliente
          </Badge>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8 space-y-6">
        {/* Intro Card */}
        <Card className="bg-slate-900/60 border-slate-800/80 backdrop-blur shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          <CardHeader className="pt-6">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <ClipboardCheck className="h-5.5 w-5.5 text-indigo-400" />
              Checklist Estrutural da Serventia
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs mt-1 leading-relaxed">
              Olá! Este formulário foi gerado pelo time Comercial para coletar informações básicas sobre a estrutura e os colaboradores do cartório. Essas respostas são fundamentais para que nossa equipe técnica prepare o ambiente de implantação da melhor forma.
            </CardDescription>
          </CardHeader>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* IDENTIFICAÇÃO CARD - READ-ONLY */}
          <Card className="bg-slate-900/40 border-slate-800/60">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-2">
                <Building2 className="h-4.5 w-4.5 text-slate-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Identificação (Siplan)</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block font-medium">Sistema a Implantar</span>
                  <span className="font-semibold text-slate-200">{checklist.projects?.systemType || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Nome do Cartório</span>
                  <span className="font-semibold text-slate-200">{checklist.projects?.clientName || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Responsável Siplan</span>
                  <span className="font-semibold text-slate-200">{checklist.created_by_name || "—"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO 1: RESPONSÁVEL PREENCHIMENTO */}
          <Card className={`bg-slate-900/60 border-slate-800 shadow-xl transition-all ${formErrors.has("fullname") || formErrors.has("role") || formErrors.has("email") || formErrors.has("phones") ? "ring-1 ring-red-500/50" : ""}`}>
            <CardHeader className="border-b border-slate-800/60 pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-indigo-400">Responsável pelo Preenchimento</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5" data-error={formErrors.has("fullname") ? "true" : undefined}>
                  <Label className="text-xs font-semibold text-slate-300">Nome Completo *</Label>
                  <Input
                    value={fullname}
                    onChange={(e) => setFullname(e.target.value)}
                    placeholder="Seu nome completo"
                    className={`bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500 ${formErrors.has("fullname") ? "border-red-500/80 focus-visible:ring-red-500" : ""}`}
                  />
                </div>
                <div className="space-y-1.5" data-error={formErrors.has("role") ? "true" : undefined}>
                  <Label className="text-xs font-semibold text-slate-300">Cargo / Função *</Label>
                  <Input
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Ex: Oficial Substituto, Tabelião, TI"
                    className={`bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500 ${formErrors.has("role") ? "border-red-500/80 focus-visible:ring-red-500" : ""}`}
                  />
                </div>
                <div className="space-y-1.5" data-error={formErrors.has("email") ? "true" : undefined}>
                  <Label className="text-xs font-semibold text-slate-300">E-mail de Contato *</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@cartorio.com.br"
                    className={`bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500 ${formErrors.has("email") ? "border-red-500/80 focus-visible:ring-red-500" : ""}`}
                  />
                </div>
                <div className="space-y-1.5" data-error={formErrors.has("phones") ? "true" : undefined}>
                  <Label className="text-xs font-semibold text-slate-300">Telefone / WhatsApp *</Label>
                  <div className="space-y-2">
                    {phones.map((phone, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          value={phone}
                          onChange={(e) => handlePhoneChange(idx, e.target.value)}
                          placeholder="(99) 99999-9999"
                          className={`bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500 ${formErrors.has("phones") && !phone.trim() ? "border-red-500/80 focus-visible:ring-red-500" : ""}`}
                        />
                        {phones.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removePhoneField(idx)}
                            className="h-9 w-9 text-red-400 hover:text-red-500 hover:bg-red-500/10 shrink-0"
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
                      className="mt-1 gap-1 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      <Plus className="h-3.5 w-3.5" /> Adicionar Telefone
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold text-slate-300">Data do Preenchimento</Label>
                  <Input
                    type="date"
                    value={fillDate}
                    onChange={(e) => setFillDate(e.target.value)}
                    className="bg-slate-950/60 border-slate-800 text-slate-100 max-w-xs focus-visible:ring-indigo-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO 2: ESTRUTURA FÍSICA E ORGANIZACIONAL */}
          <Card className={`bg-slate-900/60 border-slate-800 shadow-xl transition-all ${formErrors.has("floors") ? "ring-1 ring-red-500/50" : ""}`}>
            <CardHeader className="border-b border-slate-800/60 pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-indigo-400">Estrutura Física e Organizacional</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-4">
                <div className="space-y-1.5 max-w-sm" data-error={formErrors.has("floors") ? "true" : undefined}>
                  <Label className="text-xs font-semibold text-slate-300">Quantos andares possui a serventia? *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={floors}
                    onChange={(e) => setFloors(e.target.value)}
                    placeholder="Ex: 2"
                    className={`bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500 ${formErrors.has("floors") ? "border-red-500/80 focus-visible:ring-red-500" : ""}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">Observações adicionais sobre o local</Label>
                  <Textarea
                    value={structureObs}
                    onChange={(e) => setStructureObs(e.target.value)}
                    placeholder="Descreva detalhes importantes da serventia (ex: possui elevador, rede interna estruturada, divisórias de vidro, etc.)"
                    className="bg-slate-950/60 border-slate-800 text-slate-100 min-h-[80px] placeholder:text-slate-600 focus-visible:ring-indigo-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO 3: DISTRIBUIÇÃO POR SETORES */}
          <Card className={`bg-slate-900/60 border-slate-800 shadow-xl transition-all ${formErrors.has("sectors") || formErrors.has("sectorsDistribution") ? "ring-1 ring-red-500/50" : ""}`}>
            <CardHeader className="border-b border-slate-800/60 pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-indigo-400">Distribuição por setores</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-4">
                <div className="space-y-1.5" data-error={formErrors.has("sectors") ? "true" : undefined}>
                  <Label className="text-xs font-semibold text-slate-300">Quais setores existem no estabelecimento? *</Label>
                  <Input
                    value={sectors}
                    onChange={(e) => setSectors(e.target.value)}
                    placeholder="Ex: Registro Civil, RI, RTD, Notas, Protesto, Financeiro, TI"
                    className={`bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500 ${formErrors.has("sectors") ? "border-red-500/80 focus-visible:ring-red-500" : ""}`}
                  />
                </div>
                <div className="space-y-1.5" data-error={formErrors.has("sectorsDistribution") ? "true" : undefined}>
                  <Label className="text-xs font-semibold text-slate-300">Como os setores estão distribuídos nos andares? *</Label>
                  <Textarea
                    value={sectorsDistribution}
                    onChange={(e) => setSectorsDistribution(e.target.value)}
                    placeholder="Ex: Térreo (Civil e Notas), 1.º andar (RI e RTD), 2.º andar (Diretoria, Financeiro e Servidor)."
                    className={`bg-slate-950/60 border-slate-800 text-slate-100 min-h-[80px] placeholder:text-slate-600 focus-visible:ring-indigo-500 ${formErrors.has("sectorsDistribution") ? "border-red-500/80 focus-visible:ring-red-500" : ""}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">Observações adicionais sobre setores</Label>
                  <Textarea
                    value={sectorsObs}
                    onChange={(e) => setSectorsObs(e.target.value)}
                    placeholder="Observações adicionais..."
                    className="bg-slate-950/60 border-slate-800 text-slate-100 min-h-[70px] placeholder:text-slate-600 focus-visible:ring-indigo-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO 4: ESTRUTURA DE COLABORADORES */}
          <Card className={`bg-slate-900/60 border-slate-800 shadow-xl transition-all ${formErrors.has("keyPeople") || formErrors.has("totalEmployees") || formErrors.has("awareOfChange") || formErrors.has("teamAdaptability") ? "ring-1 ring-red-500/50" : ""}`}>
            <CardHeader className="border-b border-slate-800/60 pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-indigo-400">Estrutura de Colaboradores</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-5">
              
              {/* Dynamic key communication people */}
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase text-slate-400 block tracking-wide">Pessoa(s) Chave(s) para comunicação na Serventia</Label>
                <div className="space-y-3">
                  {keyPeople.map((person, idx) => (
                    <div key={idx} className="bg-slate-950/30 p-3 rounded-lg border border-slate-800 space-y-3 relative">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-500">Nome Completo</Label>
                          <Input
                            value={person.name}
                            onChange={(e) => handleKeyPersonChange(idx, "name", e.target.value)}
                            placeholder="Nome do contato chave"
                            className="bg-slate-950/60 border-slate-800 text-xs h-8 text-slate-100"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-500">Cargo / Setor</Label>
                          <Input
                            value={person.role}
                            onChange={(e) => handleKeyPersonChange(idx, "role", e.target.value)}
                            placeholder="Cargo"
                            className="bg-slate-950/60 border-slate-800 text-xs h-8 text-slate-100"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-500">Contato (Tel/Email)</Label>
                          <Input
                            value={person.contact}
                            onChange={(e) => handleKeyPersonChange(idx, "contact", e.target.value)}
                            placeholder="Ex: (99) 99999-9999"
                            className="bg-slate-950/60 border-slate-800 text-xs h-8 text-slate-100"
                          />
                        </div>
                      </div>
                      {keyPeople.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeKeyPerson(idx)}
                          className="h-6 w-6 text-red-400 hover:text-red-555 absolute -top-1.5 -right-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-full"
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
                    className="gap-1 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
                  >
                    <Plus className="h-3.5 w-3.5" /> Adicionar Contato Chave
                  </Button>
                </div>
              </div>

              <div className="space-y-4 pt-3 border-t border-slate-800/60">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold text-slate-300">Quantidade de colaboradores por setor</Label>
                    <Textarea
                      value={employeesBySector}
                      onChange={(e) => setEmployeesBySector(e.target.value)}
                      placeholder="Ex: Notas (5), Civil (3), RI (8), Financeiro (2)"
                      className="bg-slate-950/60 border-slate-800 text-slate-100 min-h-[60px] placeholder:text-slate-600 focus-visible:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5" data-error={formErrors.has("totalEmployees") ? "true" : undefined}>
                    <Label className="text-xs font-semibold text-slate-300">Quantidade total de colaboradores *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={totalEmployees}
                      onChange={(e) => setTotalEmployees(e.target.value)}
                      placeholder="Ex: 18"
                      className={`bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500 ${formErrors.has("totalEmployees") ? "border-red-500/80 focus-visible:ring-red-500" : ""}`}
                    />
                  </div>

                  <div className="space-y-1.5" data-error={formErrors.has("awareOfChange") ? "true" : undefined}>
                    <Label className="text-xs font-semibold text-slate-300">Todos os colaboradores estão cientes da mudança do sistema? *</Label>
                    <Select value={awareOfChange} onValueChange={setAwareOfChange}>
                      <SelectTrigger className={`bg-slate-950/60 border-slate-800 text-slate-100 h-10 ${formErrors.has("awareOfChange") ? "border-red-500/80" : ""}`}>
                        <SelectValue placeholder="Selecione a resposta" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                        <SelectItem value="Sim">Sim</SelectItem>
                        <SelectItem value="Não">Não</SelectItem>
                        <SelectItem value="Parcialmente">Parcialmente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2" data-error={formErrors.has("teamAdaptability") ? "true" : undefined}>
                    <Label className="text-xs font-semibold text-slate-300">Como a equipe lida com mudanças ou sistemas novos? *</Label>
                    <Textarea
                      value={teamAdaptability}
                      onChange={(e) => setTeamAdaptability(e.target.value)}
                      placeholder="Descreva a receptividade da equipe a novos processos (ex: ansiosos, receptivos, resistentes, facilidade com tecnologia...)"
                      className={`bg-slate-950/60 border-slate-800 text-slate-100 min-h-[80px] placeholder:text-slate-600 focus-visible:ring-indigo-500 ${formErrors.has("teamAdaptability") ? "border-red-500/80 focus-visible:ring-red-500" : ""}`}
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold text-slate-300">Observações adicionais sobre equipe/comunicação</Label>
                    <Textarea
                      value={employeesObs}
                      onChange={(e) => setEmployeesObs(e.target.value)}
                      placeholder="Observações..."
                      className="bg-slate-950/60 border-slate-800 text-slate-100 min-h-[70px] placeholder:text-slate-600 focus-visible:ring-indigo-500"
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
              className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 font-bold px-8 shadow-lg shadow-indigo-500/20 gap-2 shrink-0 animate-pulse hover:animate-none"
            >
              <ClipboardCheck className="h-5 w-5" />
              {submitChecklist.isPending ? "Processando Envio..." : "Finalizar e Enviar Checklist"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
