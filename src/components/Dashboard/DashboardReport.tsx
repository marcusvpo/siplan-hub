import { ProjectV2 } from "@/types/ProjectV2";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DashboardReportProps {
  projects: ProjectV2[];
  kpis: {
    totalProjects: number;
    successRate: number;
    criticalAlerts: number;
    activeProjects: number;
    avgStageTime: any;
  };
}

export const DashboardReport = ({ projects, kpis }: DashboardReportProps) => {
  const today = format(new Date(), "PPpp", { locale: ptBR });

  return (
    <div 
      id="dashboard-report" 
      className="bg-white text-slate-900 w-[794px] font-sans"
    >
      {/* 
        Page 1: Summary Section
        We force this section to be exactly the height of one A4 page (297mm)
        to ensure the next section starts on Page 2.
        padding-bottom: 40mm creates a SAFE ZONE for the footer.
      */}
      <div 
        id="report-summary-section" 
        className="p-12" 
        style={{ minHeight: '297mm', paddingBottom: '20mm', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-10">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-slate-900">SIPLAN<span className="text-[#c1121f]">HUB</span></h1>
            <p className="text-xs uppercase tracking-widest font-bold text-slate-500">Ecossistema de Gestão Siplan</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold uppercase tracking-tight">Relatório de Gestão</h2>
            <p className="text-[10px] text-slate-400 font-mono mt-1">Gerado em: {today}</p>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="mb-12">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
            <div className="w-4 h-[2px] bg-slate-400" /> Resumo Executivo
          </h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 shadow-sm">
              <p className="text-[9px] uppercase font-bold text-slate-500 mb-1">Total Projetos</p>
              <p className="text-2xl font-black text-slate-900">{kpis.totalProjects}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 shadow-sm">
              <p className="text-[9px] uppercase font-bold text-slate-500 mb-1">Taxa de Sucesso</p>
              <p className="text-2xl font-black text-emerald-600">{kpis.successRate}%</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 shadow-sm">
              <p className="text-[9px] uppercase font-bold text-slate-500 mb-1">Alertas Críticos</p>
              <p className="text-2xl font-black text-rose-600">{kpis.criticalAlerts}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 shadow-sm">
              <p className="text-[9px] uppercase font-bold text-slate-500 mb-1">Ativos</p>
              <p className="text-2xl font-black text-slate-900">{kpis.activeProjects}</p>
            </div>
          </div>
        </div>

        {/* Avg Stage Times */}
        <div className="mb-12">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
            <div className="w-4 h-[2px] bg-slate-400" /> Tempo Médio por Etapa
          </h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-3 border rounded-lg bg-slate-50/50">
              <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Infra</p>
              <p className="text-lg font-black">{kpis.avgStageTime?.infra || 0} <span className="text-[9px] font-normal text-slate-400 tracking-normal ml-1">dias</span></p>
            </div>
            <div className="p-3 border rounded-lg bg-slate-50/50">
              <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Aderência</p>
              <p className="text-lg font-black">{kpis.avgStageTime?.adherence || 0} <span className="text-[9px] font-normal text-slate-400 tracking-normal ml-1">dias</span></p>
            </div>
            <div className="p-3 border rounded-lg bg-slate-50/50">
              <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Conversão</p>
              <p className="text-lg font-black">{kpis.avgStageTime?.conversion || 0} <span className="text-[9px] font-normal text-slate-400 tracking-normal ml-1">dias</span></p>
            </div>
            <div className="p-3 border rounded-lg bg-slate-50/50">
              <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Implantação</p>
              <p className="text-lg font-black">{kpis.avgStageTime?.implementation || 0} <span className="text-[9px] font-normal text-slate-400 tracking-normal ml-1">dias</span></p>
            </div>
          </div>
        </div>

        {/* Critical Alert Details */}
        {kpis.criticalAlerts > 0 && (
          <div className="flex-1">
            <h3 className="text-sm font-black uppercase tracking-widest text-rose-500 mb-6 flex items-center gap-2">
              <div className="w-4 h-[2px] bg-rose-500" /> Alertas de Atenção Imediata
            </h3>
            <div className="space-y-2">
              {projects.filter(p => p.healthScore === 'critical').slice(0, 5).map((project, i) => (
                <div key={i} className="p-4 rounded-xl border-l-4 border-rose-500 bg-rose-50 flex justify-between items-center shadow-sm">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{project.clientName}</p>
                    <p className="text-[9px] text-slate-500 font-mono mt-0.5">#{project.ticketNumber} • {project.systemType}</p>
                  </div>
                  <div className="px-2 py-1 bg-rose-200 text-rose-700 rounded text-[9px] font-black uppercase tracking-tight">Crítico</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 
        Page 2+: Detailed Projects Section
        Explícitamente adicionamos um padding-top de 40mm para ser uma "SAFE ZONE" contra o cabeçalho.
      */}
      <div id="report-projects-section" className="p-12" style={{ paddingTop: '30mm' }}>
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
          <div className="w-4 h-[2px] bg-slate-400" /> Detalhamento de Projetos Ativos
        </h3>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-900">
              <th className="py-4 text-[10px] uppercase font-black tracking-widest text-slate-500">Cliente / Sistema</th>
              <th className="py-4 text-[10px] uppercase font-black tracking-widest text-slate-500">Líder</th>
              <th className="py-4 text-[10px] uppercase font-black tracking-widest text-slate-500">Etapa Atual</th>
              <th className="py-4 text-[10px] uppercase font-black tracking-widest text-slate-500 text-right">Saúde</th>
            </tr>
          </thead>
          <tbody>
            {projects.slice(0, 100).map((project, i) => {
              const stages = Object.entries(project.stages);
              const currentStage = stages.find(([_, stage]) => stage.status === "in-progress")?.[0] || "-";
              
              return (
                <tr key={i} className="border-b border-slate-100 pdf-row">
                  <td className="py-4">
                    <p className="text-xs font-bold text-slate-900">{project.clientName}</p>
                    <p className="text-[9px] text-slate-500 font-mono">{project.ticketNumber} • {project.systemType}</p>
                  </td>
                  <td className="py-4 text-[10px] font-medium text-slate-600">{project.projectLeader || "Sem Líder"}</td>
                  <td className="py-4 text-[9px] font-black uppercase text-slate-500">{currentStage}</td>
                  <td className="py-4 text-right">
                    <div className={`inline-block w-2.5 h-2.5 rounded-full ${
                      project.healthScore === 'critical' ? 'bg-rose-500' :
                      project.healthScore === 'warning' ? 'bg-amber-400' : 'bg-emerald-500'
                    }`} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {projects.length > 100 && (
          <p className="text-[9px] italic text-slate-400 mt-4">* Exibindo 100 de {projects.length} projetos ativos no sistema.</p>
        )}
        
        {/* Footer clearance for last page */}
        <div className="h-10" />
      </div>
    </div>
  );
};
