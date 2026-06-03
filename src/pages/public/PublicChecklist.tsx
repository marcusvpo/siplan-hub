import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ClipboardCheck, Building2, HelpCircle } from "lucide-react";
import { usePublicChecklist } from "@/hooks/usePublicChecklist";
import { FormRenderer } from "@/components/FormRenderer/FormRenderer";
import { FallbackChecklistForm } from "@/components/public/FallbackChecklistForm";

export default function PublicChecklist() {
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

  const state = usePublicChecklist();

  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="text-sm text-slate-500 font-medium animate-pulse">
            Carregando formulário do checklist...
          </p>
        </div>
      </div>
    );
  }

  if (state.error || !state.checklist) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
        <Card className="max-w-md w-full bg-white border-slate-200 shadow-xl">
          <CardContent className="p-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-655 mb-2">
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

  if (state.checklist.status === "submitted" || state.submittedSuccess) {
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

        {state.template ? (
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
                    <span className="font-semibold text-slate-700">{state.checklist.projects?.systemType || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Nome do Cartório</span>
                    <span className="font-semibold text-slate-700">{state.checklist.projects?.clientName || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Responsável Siplan</span>
                    <span className="font-semibold text-slate-700">{state.checklist.created_by_name || "—"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-md p-6">
              <FormRenderer
                projectId={state.checklist.project_id}
                schema={state.template.schema_json}
                uiSchema={state.template.ui_json}
                formData={state.dynamicResponses}
                onChange={({ formData }) => state.setDynamicResponses(formData)}
                onSubmit={() => state.handleDynamicSubmit(state.dynamicResponses)}
                submitLabel="Finalizar e Enviar Checklist"
              />
            </Card>
          </div>
        ) : (
          <FallbackChecklistForm
            checklist={state.checklist}
            fullname={state.fullname}
            setFullname={state.setFullname}
            role={state.role}
            setRole={state.setRole}
            email={state.email}
            setEmail={state.setEmail}
            phones={state.phones}
            fillDate={state.fillDate}
            setFillDate={state.setFillDate}
            floors={state.floors}
            setFloors={state.setFloors}
            structureObs={state.structureObs}
            setStructureObs={state.setStructureObs}
            sectors={state.sectors}
            setSectors={state.setSectors}
            sectorsDistribution={state.sectorsDistribution}
            setSectorsDistribution={state.setSectorsDistribution}
            sectorsObs={state.sectorsObs}
            setSectorsObs={state.setSectorsObs}
            keyPeople={state.keyPeople}
            employeesBySector={state.employeesBySector}
            setEmployeesBySector={state.setEmployeesBySector}
            totalEmployees={state.totalEmployees}
            setTotalEmployees={state.setTotalEmployees}
            awareOfChange={state.awareOfChange}
            setAwareOfChange={state.setAwareOfChange}
            teamAdaptability={state.teamAdaptability}
            setTeamAdaptability={state.setTeamAdaptability}
            employeesObs={state.employeesObs}
            setEmployeesObs={state.setEmployeesObs}
            formErrors={state.formErrors}
            isSubmitPending={state.isSubmitPending}
            handlePhoneChange={state.handlePhoneChange}
            addPhoneField={state.addPhoneField}
            removePhoneField={state.removePhoneField}
            handleKeyPersonChange={state.handleKeyPersonChange}
            addKeyPerson={state.addKeyPerson}
            removeKeyPerson={state.removeKeyPerson}
            onSubmit={state.handleSubmit}
          />
        )}
      </main>
    </div>
  );
}
