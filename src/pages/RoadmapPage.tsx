import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  Settings,
  Cpu,
  Database,
  Truck,
  LifeBuoy,
  ChevronRight,
  Info,
  LucideIcon,
} from "lucide-react";
import confetti from "canvas-confetti";

interface StageData {
  status: "todo" | "in-progress" | "done" | "blocked";
  // Add other stage properties if they exist
}

interface RoadmapData {
  roadmap: {
    id: string;
    welcome_message: string;
    custom_theme: {
      primary: string;
      secondary: string;
      background: string;
    };
    config: {
      show_dates: boolean;
      show_progress: boolean;
    };
  };
  project: {
    client_name: string;
    system_type: string;
    sold_hours: number;
    overall_progress: number;
    global_status: string;
    stages: Record<string, StageData>;
  };
}

interface StageConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

const STAGES_CONFIG: StageConfig[] = [
  {
    id: "infra",
    label: "Infraestrutura",
    icon: Cpu,
    description: "Preparação dos servidores e estações de trabalho.",
  },
  {
    id: "adherence",
    label: "Aderência",
    icon: Settings,
    description: "Análise de requisitos e processos do cartório.",
  },
  {
    id: "environment",
    label: "Ambiente",
    icon: Database,
    description: "Configuração do sistema e banco de dados.",
  },
  {
    id: "conversion",
    label: "Conversão",
    icon: Truck,
    description: "Migração e validação dos dados históricos.",
  },
  {
    id: "implementation",
    label: "Implantação",
    icon: CheckCircle2,
    description: "Treinamento e entrada em produção.",
  },
  {
    id: "post",
    label: "Pós-Implantação",
    icon: LifeBuoy,
    description: "Acompanhamento inicial e suporte assistido.",
  },
];

export default function RoadmapPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RoadmapData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!token) return;

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await (supabase.rpc as any)("get_roadmap_data", {
          token_uuid: token,
        });

        if (response.error) throw response.error;
        const roadmapData = response.data;

        if (!roadmapData) throw new Error("Roadmap não encontrado ou inativo.");

        setData(roadmapData as RoadmapData);

        if (roadmapData.project.overall_progress === 100) {
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#800000", "#ffffff", "#000000"],
          });
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unknown error occurred");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-[#800000] border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-4xl font-bold mb-4 text-[#800000]">Ops!</h1>
          <p className="text-gray-400 max-w-md">
            {error || "Não foi possível carregar o roadmap solicitado."}
          </p>
        </div>
      </div>
    );
  }

  const { project, roadmap } = data;

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[#800000]/30 overflow-x-hidden">
      {/* Mesh Gradient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div
          className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px]"
          style={{
            backgroundColor: roadmap.custom_theme?.primary || "#800000",
          }}
        />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px]"
          style={{
            backgroundColor: roadmap.custom_theme?.primary || "#800000",
          }}
        />
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="flex flex-col items-center mb-16 space-y-6">
          <motion.img
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            src="/assets/Siplan_logo.png"
            alt="Siplan Logo"
            className="h-16 w-auto"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center space-y-2"
          >
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
              {project.client_name}
            </h1>
            <p className="text-gray-400 text-lg">
              Acompanhamento da Implantação:{" "}
              <span
                className="font-semibold"
                style={{ color: roadmap.custom_theme?.primary || "#be123c" }}
              >
                {project.system_type}
              </span>
            </p>
          </motion.div>
        </header>

        {/* Hero Section / Progress */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="relative p-1 rounded-3xl bg-gradient-to-b from-[#800000]/30 to-transparent"
          >
            <div className="bg-black/60 backdrop-blur-xl rounded-[calc(1.5rem-2px)] p-8 md:p-12 border border-[#ffffff]/5">
              <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                <div>
                  <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-[#800000] mb-2">
                    Progresso Global
                  </h2>
                  <div
                    className="text-6xl font-bold"
                    style={{ color: roadmap.custom_theme?.primary || "white" }}
                  >
                    {project.overall_progress}%
                  </div>
                </div>
                <div className="flex items-center gap-2 text-gray-400 bg-[#ffffff]/5 px-4 py-2 rounded-full border border-[#ffffff]/10">
                  <Clock size={16} />
                  <span className="text-sm font-medium">
                    Horas Vendidas: {project.sold_hours}h
                  </span>
                </div>
              </div>

              {/* Progress Bar Container */}
              <div className="h-4 w-full bg-[#1a1a1a] rounded-full overflow-hidden border border-[#ffffff]/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${project.overall_progress}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full relative"
                  style={{
                    background: `linear-gradient(90deg, ${
                      roadmap.custom_theme?.primary || "#800000"
                    }, ${roadmap.custom_theme?.primary || "#be123c"}dd)`,
                  }}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:40px_100%] animate-shimmer" />
                </motion.div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Roadmap Grid */}
        <section className="space-y-12">
          <div className="flex items-center gap-4 mb-8">
            <h3 className="text-2xl font-semibold">Jornada do Projeto</h3>
            <div className="h-px flex-1 bg-gradient-to-r from-[#800000]/50 to-transparent" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence>
              {STAGES_CONFIG.map((stage, index) => {
                const stageData = project.stages[stage.id];
                const status = stageData?.status || "todo";
                const isActive = status === "in-progress";
                const isDone = status === "done";
                const isBlocked = status === "blocked";

                return (
                  <motion.div
                    key={stage.id}
                    initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    className={`group relative p-6 rounded-2xl border transition-all duration-300 ${
                      isActive
                        ? "bg-muted/10 border-primary/40 shadow-xl"
                        : isDone
                        ? "bg-[#ffffff]/5 border-[#ffffff]/10"
                        : "bg-[#ffffff]/2 border-[#ffffff]/5 opacity-60"
                    }`}
                    style={
                      isActive
                        ? {
                            borderColor: `${
                              roadmap.custom_theme?.primary || "#800000"
                            }66`,
                            backgroundColor: `${
                              roadmap.custom_theme?.primary || "#800000"
                            }1a`,
                            boxShadow: `0 0 40px -15px ${
                              roadmap.custom_theme?.primary || "#800000"
                            }4d`,
                          }
                        : {}
                    }
                  >
                    <div className="flex items-start gap-5">
                      <div
                        className="p-3 rounded-xl transition-colors duration-300"
                        style={
                          isActive
                            ? {
                                backgroundColor:
                                  roadmap.custom_theme?.primary || "#800000",
                                color: "white",
                              }
                            : {
                                backgroundColor: "#1a1a1a",
                                color: "#4b5563",
                              }
                        }
                      >
                        <stage.icon size={24} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-center">
                          <h4
                            className={`font-semibold text-lg ${
                              isActive ? "text-white" : "text-gray-300"
                            }`}
                          >
                            {stage.label}
                          </h4>
                          {isDone ? (
                            <CheckCircle2
                              size={18}
                              className="text-[#800000]"
                            />
                          ) : isActive ? (
                            <div className="flex h-2 w-2 relative">
                              <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#800000] opacity-75"></div>
                              <div className="relative inline-flex rounded-full h-2 w-2 bg-[#800000]"></div>
                            </div>
                          ) : null}
                        </div>
                        <p className="text-gray-500 text-sm leading-relaxed">
                          {stage.description}
                        </p>

                        {/* Status Label */}
                        <div className="pt-4 flex items-center justify-between">
                          <span
                            className={`text-[10px] uppercase tracking-widest font-bold ${
                              isActive
                                ? "text-[#800000]"
                                : isDone
                                ? "text-gray-400"
                                : "text-gray-600"
                            }`}
                          >
                            {status === "todo"
                              ? "Aguardando"
                              : status === "in-progress"
                              ? "Em Andamento"
                              : status === "done"
                              ? "Concluído"
                              : "Bloqueado"}
                          </span>

                          {isActive && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="flex items-center gap-1.5 text-[#800000]"
                            >
                              <span className="text-[10px] font-bold">
                                Foco Atual
                              </span>
                              <ChevronRight size={12} />
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </section>

        {/* Footer Info */}
        <footer className="mt-32 pt-12 border-t border-[#ffffff]/5 text-center space-y-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-[#ffffff]/5 rounded-2xl flex items-center gap-4 max-w-lg text-left border border-[#ffffff]/10 backdrop-blur-sm">
              <Info className="flex-shrink-0 text-[#800000]" />
              <p className="text-sm text-gray-400 italic">
                "
                {roadmap.welcome_message ||
                  `Olá! Estamos muito felizes em ter você como parceiro Siplan. Nosso time está trabalhando para garantir a melhor implantação do seu novo sistema.`}
                "
              </p>
            </div>
          </div>

          <div className="pb-12 text-gray-600 text-xs tracking-widest uppercase">
            Powered by Siplan HUB &bull; 2026
          </div>
        </footer>
      </main>

      {/* Styles for shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -40px 0; }
          100% { background-position: 40px 0; }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite linear;
        }
      `}</style>
    </div>
  );
}
