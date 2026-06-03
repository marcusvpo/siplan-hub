import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Plus, Trash2, ClipboardCheck, ArrowRight } from "lucide-react";
import { KeyPerson } from "@/hooks/usePublicChecklist";

interface FallbackChecklistFormProps {
  checklist: any;
  fullname: string;
  setFullname: (val: string) => void;
  role: string;
  setRole: (val: string) => void;
  email: string;
  setEmail: (val: string) => void;
  phones: string[];
  fillDate: string;
  setFillDate: (val: string) => void;
  floors: string;
  setFloors: (val: string) => void;
  structureObs: string;
  setStructureObs: (val: string) => void;
  sectors: string;
  setSectors: (val: string) => void;
  sectorsDistribution: string;
  setSectorsDistribution: (val: string) => void;
  sectorsObs: string;
  setSectorsObs: (val: string) => void;
  keyPeople: KeyPerson[];
  employeesBySector: string;
  setEmployeesBySector: (val: string) => void;
  totalEmployees: string;
  setTotalEmployees: (val: string) => void;
  awareOfChange: string;
  setAwareOfChange: (val: string) => void;
  teamAdaptability: string;
  setTeamAdaptability: (val: string) => void;
  employeesObs: string;
  setEmployeesObs: (val: string) => void;
  formErrors: Set<string>;
  isSubmitPending: boolean;
  handlePhoneChange: (index: number, val: string) => void;
  addPhoneField: () => void;
  removePhoneField: (index: number) => void;
  handleKeyPersonChange: (index: number, field: keyof KeyPerson, val: string) => void;
  addKeyPerson: () => void;
  removeKeyPerson: (index: number) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function FallbackChecklistForm({
  checklist,
  fullname,
  setFullname,
  role,
  setRole,
  email,
  setEmail,
  phones,
  fillDate,
  setFillDate,
  floors,
  setFloors,
  structureObs,
  setStructureObs,
  sectors,
  setSectors,
  sectorsDistribution,
  setSectorsDistribution,
  sectorsObs,
  setSectorsObs,
  keyPeople,
  employeesBySector,
  setEmployeesBySector,
  totalEmployees,
  setTotalEmployees,
  awareOfChange,
  setAwareOfChange,
  teamAdaptability,
  setTeamAdaptability,
  employeesObs,
  setEmployeesObs,
  formErrors,
  isSubmitPending,
  handlePhoneChange,
  addPhoneField,
  removePhoneField,
  handleKeyPersonChange,
  addKeyPerson,
  removeKeyPerson,
  onSubmit,
}: FallbackChecklistFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* IDENTIFICAÇÃO CARD - READ-ONLY */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
            <Building2 className="h-4.5 w-4.5 text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
              Identificação (Siplan)
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">
                Sistema a Implantar
              </span>
              <span className="font-semibold text-slate-700">
                {checklist.projects?.systemType || "—"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">
                Nome do Cartório
              </span>
              <span className="font-semibold text-slate-700">
                {checklist.projects?.clientName || "—"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">
                Responsável Siplan
              </span>
              <span className="font-semibold text-slate-700">
                {checklist.created_by_name || "—"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO 1: RESPONSÁVEL PREENCHIMENTO */}
      <Card
        className={`bg-white border-slate-200 shadow-md transition-all ${
          formErrors.has("fullname") ||
          formErrors.has("role") ||
          formErrors.has("email") ||
          formErrors.has("phones")
            ? "ring-1 ring-red-500/50"
            : ""
        }`}
      >
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">
            Responsável pelo Preenchimento
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              className="space-y-1.5"
              data-error={formErrors.has("fullname") ? "true" : undefined}
            >
              <Label className="text-xs font-semibold text-slate-700">
                Nome Completo *
              </Label>
              <Input
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                placeholder="Seu nome completo"
                className={`bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-primary ${
                  formErrors.has("fullname")
                    ? "border-red-500/80 focus-visible:ring-red-500"
                    : ""
                }`}
              />
            </div>
            <div
              className="space-y-1.5"
              data-error={formErrors.has("role") ? "true" : undefined}
            >
              <Label className="text-xs font-semibold text-slate-700">
                Cargo / Função *
              </Label>
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Ex: Oficial Substituto, Tabelião, TI"
                className={`bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-primary ${
                  formErrors.has("role")
                    ? "border-red-500/80 focus-visible:ring-red-500"
                    : ""
                }`}
              />
            </div>
            <div
              className="space-y-1.5"
              data-error={formErrors.has("email") ? "true" : undefined}
            >
              <Label className="text-xs font-semibold text-slate-700">
                E-mail de Contato *
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@cartorio.com.br"
                className={`bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-primary ${
                  formErrors.has("email")
                    ? "border-red-500/80 focus-visible:ring-red-500"
                    : ""
                }`}
              />
            </div>
            <div
              className="space-y-1.5"
              data-error={formErrors.has("phones") ? "true" : undefined}
            >
              <Label className="text-xs font-semibold text-slate-700">
                Telefone / WhatsApp *
              </Label>
              <div className="space-y-2">
                {phones.map((phone, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={phone}
                      onChange={(e) => handlePhoneChange(idx, e.target.value)}
                      placeholder="(99) 99999-9999"
                      className={`bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-primary ${
                        formErrors.has("phones") && !phone.trim()
                          ? "border-red-500/80 focus-visible:ring-red-500"
                          : ""
                      }`}
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
              <Label className="text-xs font-semibold text-slate-700">
                Data do Preenchimento
              </Label>
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
      <Card
        className={`bg-white border-slate-200 shadow-md transition-all ${
          formErrors.has("floors") ? "ring-1 ring-red-500/50" : ""
        }`}
      >
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">
            Estrutura Física e Organizacional
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="space-y-4">
            <div
              className="space-y-1.5 max-w-sm"
              data-error={formErrors.has("floors") ? "true" : undefined}
            >
              <Label className="text-xs font-semibold text-slate-700">
                Quantos andares possui a serventia? *
              </Label>
              <Input
                type="number"
                min="1"
                value={floors}
                onChange={(e) => setFloors(e.target.value)}
                placeholder="Ex: 2"
                className={`bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-primary ${
                  formErrors.has("floors")
                    ? "border-red-500/80 focus-visible:ring-red-500"
                    : ""
                }`}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Observações adicionais sobre o local
              </Label>
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
      <Card
        className={`bg-white border-slate-200 shadow-md transition-all ${
          formErrors.has("sectors") || formErrors.has("sectorsDistribution")
            ? "ring-1 ring-red-500/50"
            : ""
        }`}
      >
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">
            Distribuição por setores
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="space-y-4">
            <div
              className="space-y-1.5"
              data-error={formErrors.has("sectors") ? "true" : undefined}
            >
              <Label className="text-xs font-semibold text-slate-700">
                Quais setores existem no estabelecimento? *
              </Label>
              <Input
                value={sectors}
                onChange={(e) => setSectors(e.target.value)}
                placeholder="Ex: Registro Civil, RI, RTD, Notas, Protesto, Financeiro, TI"
                className={`bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-primary ${
                  formErrors.has("sectors")
                    ? "border-red-500/80 focus-visible:ring-red-500"
                    : ""
                }`}
              />
            </div>
            <div
              className="space-y-1.5"
              data-error={
                formErrors.has("sectorsDistribution") ? "true" : undefined
              }
            >
              <Label className="text-xs font-semibold text-slate-700">
                Como os setores estão distribuídos nos andares? *
              </Label>
              <Textarea
                value={sectorsDistribution}
                onChange={(e) => setSectorsDistribution(e.target.value)}
                placeholder="Ex: Térreo (Civil e Notas), 1.º andar (RI e RTD), 2.º andar (Diretoria, Financeiro e Servidor)."
                className={`bg-slate-50/50 border-slate-200 text-slate-900 min-h-[80px] placeholder:text-slate-400 focus-visible:ring-primary ${
                  formErrors.has("sectorsDistribution")
                    ? "border-red-500/80 focus-visible:ring-red-500"
                    : ""
                }`}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Observações adicionais sobre setores
              </Label>
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
      <Card
        className={`bg-white border-slate-200 shadow-md transition-all ${
          formErrors.has("keyPeople") ||
          formErrors.has("totalEmployees") ||
          formErrors.has("awareOfChange") ||
          formErrors.has("teamAdaptability")
            ? "ring-1 ring-red-500/50"
            : ""
        }`}
      >
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">
            Estrutura de Colaboradores
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-5">
          {/* Dynamic key communication people */}
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase text-slate-500 block tracking-wide">
              Pessoa(s) Chave(s) para comunicação na Serventia
            </Label>
            <div className="space-y-3">
              {keyPeople.map((person, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50/50 p-3 rounded-lg border border-slate-200 space-y-3 relative"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-slate-500">
                        Nome Completo
                      </Label>
                      <Input
                        value={person.name}
                        onChange={(e) =>
                          handleKeyPersonChange(idx, "name", e.target.value)
                        }
                        placeholder="Nome do contato chave"
                        className="bg-white border-slate-200 text-xs h-8 text-slate-900 placeholder:text-slate-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-slate-500">
                        Cargo / Setor
                      </Label>
                      <Input
                        value={person.role}
                        onChange={(e) =>
                          handleKeyPersonChange(idx, "role", e.target.value)
                        }
                        placeholder="Cargo"
                        className="bg-white border-slate-200 text-xs h-8 text-slate-900 placeholder:text-slate-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-slate-500">
                        Contato (Tel/Email)
                      </Label>
                      <Input
                        value={person.contact}
                        onChange={(e) =>
                          handleKeyPersonChange(idx, "contact", e.target.value)
                        }
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
                      className="h-6 w-6 text-red-500 hover:text-red-655 absolute -top-1.5 -right-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-full"
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
                <Label className="text-xs font-semibold text-slate-700">
                  Quantidade de colaboradores por setor
                </Label>
                <Textarea
                  value={employeesBySector}
                  onChange={(e) => setEmployeesBySector(e.target.value)}
                  placeholder="Ex: Notas (5), Civil (3), RI (8), Financeiro (2)"
                  className="bg-slate-50/50 border-slate-200 text-slate-900 min-h-[60px] placeholder:text-slate-400 focus-visible:ring-primary"
                />
              </div>

              <div
                className="space-y-1.5"
                data-error={
                  formErrors.has("totalEmployees") ? "true" : undefined
                }
              >
                <Label className="text-xs font-semibold text-slate-700">
                  Quantidade total de colaboradores *
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={totalEmployees}
                  onChange={(e) => setTotalEmployees(e.target.value)}
                  placeholder="Ex: 18"
                  className={`bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-primary ${
                    formErrors.has("totalEmployees")
                      ? "border-red-500/80 focus-visible:ring-red-500"
                      : ""
                  }`}
                />
              </div>

              <div
                className="space-y-1.5"
                data-error={formErrors.has("awareOfChange") ? "true" : undefined}
              >
                <Label className="text-xs font-semibold text-slate-700">
                  Todos os colaboradores estão cientes da mudança do sistema? *
                </Label>
                <Select
                  value={awareOfChange}
                  onValueChange={setAwareOfChange}
                >
                  <SelectTrigger
                    className={`bg-slate-50/50 border-slate-200 text-slate-900 h-10 ${
                      formErrors.has("awareOfChange")
                        ? "border-red-500/80"
                        : ""
                    }`}
                  >
                    <SelectValue placeholder="Selecione a resposta" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 text-slate-800">
                    <SelectItem value="Sim">Sim</SelectItem>
                    <SelectItem value="Não">Não</SelectItem>
                    <SelectItem value="Parcialmente">Parcialmente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div
                className="space-y-1.5 sm:col-span-2"
                data-error={
                  formErrors.has("teamAdaptability") ? "true" : undefined
                }
              >
                <Label className="text-xs font-semibold text-slate-700">
                  Como a equipe lida com mudanças ou sistemas novos? *
                </Label>
                <Textarea
                  value={teamAdaptability}
                  onChange={(e) => setTeamAdaptability(e.target.value)}
                  placeholder="Descreva a receptividade da equipe a novos processos (ex: ansiosos, receptivos, resistentes, facilidade com tecnologia...)"
                  className={`bg-slate-50/50 border-slate-200 text-slate-900 min-h-[80px] placeholder:text-slate-400 focus-visible:ring-primary ${
                    formErrors.has("teamAdaptability")
                      ? "border-red-500/80 focus-visible:ring-red-500"
                      : ""
                  }`}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-slate-700">
                  Observações adicionais sobre equipe/comunicação
                </Label>
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
          disabled={isSubmitPending}
          className="bg-primary hover:bg-primary/95 text-white font-bold px-8 shadow-lg shadow-primary/20 gap-2 shrink-0 active:scale-[0.98]"
        >
          <ClipboardCheck className="h-5 w-5" />
          {isSubmitPending
            ? "Processando Envio..."
            : "Finalizar e Enviar Checklist"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
