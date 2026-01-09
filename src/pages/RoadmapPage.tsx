import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Truck,
  Settings,
  Archive,
  AlertCircle,
  LucideIcon,
  ChevronDown,
} from "lucide-react";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";

// --- Types ---

interface StageData {
  status: "todo" | "in-progress" | "done" | "blocked";
}

interface RoadmapData {
  roadmap: {
    id: string;
    welcome_message: string;
    custom_theme: {
      primary: string;
      secondary?: string;
      background?: string;
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
  details?: string[];
}

// Configuração das etapas atualizada com o novo cronograma
const STAGES_CONFIG: StageConfig[] = [
  {
    id: "infra",
    label: "Infraestrutura do seu Cartório",
    icon: Cpu,
    description: "Preparando o terreno para a inovação.",
    details: [
      "Validação de Servidores e Hardware",
      "Verificação de Segurança e Rede",
      "Conferência de Pré-requisitos",
    ],
  },
  {
    id: "adherence",
    label: "Planejamento & Aderência",
    icon: Settings,
    description: "Desenhando o futuro da operação.",
    details: [
      "Mapeamento de Processos Críticos",
      "Análise de Gaps Operacionais",
      "Estudo das principais rotinas do seu cartório",
    ],
  },
  {
    id: "conversion",
    label: "Diagnóstico e Extração",
    icon: Truck,
    description: "Migração inteligente do legado.",
    details: [
      "Preparação para Conversão da Base de Dados",
      "Extração Segura de Dados",
      "Primeira Carga em Homologação",
    ],
  },
  {
    id: "environment",
    label: "Configuração e Parâmetros",
    icon: Database,
    description: "O sistema, do seu jeito.",
    details: [
      "Instalação dos Sistemas Siplan",
      "Parametrização de Regras de Negócio",
      "Setup de Perfis e Permissões",
    ],
  },
  {
    id: "implementation",
    label: "Treinamento e Go-Live",
    icon: Archive,
    description: "A reta final para a transformação.",
    details: [
      "Treinamentos Coletivos por Setor",
      "Validação Final pela Serventia",
      "🚀 GO-LIVE: Entrada Oficial em Produção",
    ],
  },
];

export default function RoadmapPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RoadmapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

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
      } catch (err: unknown) {
        console.error(err);
        setError("Não foi possível carregar o roadmap.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [token]);

  // Recalcular progresso no frontend se necessário
  const calculatedProgress = useMemo(() => {
    if (!data) return 0;
    const stages = data.project.stages;
    const totalStages = STAGES_CONFIG.length;
    let completedStages = 0;

    STAGES_CONFIG.forEach((config) => {
      if (stages[config.id]?.status === "done") {
        completedStages++;
      }
    });

    const progress = Math.round((completedStages / totalStages) * 100);
    // Se o backend vier 0, usamos o nosso. Se vier algo, usamos o maior (para garantir).
    return Math.max(data.project.overall_progress || 0, progress);
  }, [data]);

  useEffect(() => {
    if (calculatedProgress === 100 && !loading) {
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 },
        colors: [
          data?.roadmap.custom_theme.primary || "#800000",
          "#ffffff",
          "#000000",
        ],
      });
    }
  }, [calculatedProgress, loading, data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
            borderRadius: ["20%", "50%", "20%"],
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-16 h-16 border-4 border-[#800000] border-t-transparent"
        />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6 text-center">
        <div>
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Ops! Link Inválido</h1>
          <p className="text-gray-400 max-w-md">
            O roadmap que você está tentando acessar não existe ou foi
            desativado.
          </p>
        </div>
      </div>
    );
  }

  const { project, roadmap } = data;
  const primaryColor = roadmap.custom_theme?.primary || "#800000";

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-white/20 overflow-x-hidden font-sans">
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 z-50 origin-left"
        style={{ scaleX, backgroundColor: primaryColor }}
      />

      {/* Dynamic Background with Animation */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 45, 0],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full blur-[120px]"
          style={{ backgroundColor: primaryColor }}
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -100, 0],
            opacity: [0.05, 0.15, 0.05],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[150px] bg-blue-900/40"
        />
        <motion.div
          animate={{
            opacity: [0.05, 0.1, 0.05],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[40%] left-[30%] w-[40%] h-[40%] rounded-full blur-[180px] bg-purple-900/20"
        />
        <div className="absolute inset-0 bg-[url('/assets/noise.png')] opacity-[0.04] mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505]/80" />
      </div>

      <main className="relative z-10 w-full">
        {/* Full Screen Hero Section */}
        <section className="min-h-[95vh] flex flex-col items-center justify-center relative px-6 py-12 md:py-0">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, type: "spring" }}
            className="mb-12"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
              className="relative z-10"
            >
              <img
                src="/assets/Siplan_logo_branco.png"
                alt="Siplan Logo"
                className="h-20 md:h-28 w-auto drop-shadow-2xl"
              />
            </motion.div>
          </motion.div>

          {/* Main Title & Status */}
          <div className="text-center space-y-6 max-w-4xl mx-auto z-20">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              <h1 className="text-4xl md:text-7xl font-bold tracking-tight text-white mb-4">
                <span className="text-transparent bg-clip-text bg-gradient-to-br from-white via-gray-200 to-gray-500">
                  {project.client_name}
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-400 font-light flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3">
                <span>Jornada de Transformação Digital</span>
                <span className="hidden md:inline text-gray-600">•</span>
                <span className="font-medium px-4 py-1 rounded-full bg-white/5 border border-white/10 text-white shadow-inner">
                  {project.system_type}
                </span>
              </p>
            </motion.div>

            {/* Interactive Welcome Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-12 mx-auto max-w-3xl bg-white/5 hover:bg-white/10 border border-white/10 rounded-3xl p-8 backdrop-blur-2xl transition-all duration-500 group shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]"
              style={{
                boxShadow: `0 0 60px -20px ${primaryColor}20`,
              }}
            >
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Progress Radial */}
                <div className="relative w-32 h-32 flex-shrink-0">
                  <svg
                    className="w-full h-full -rotate-90"
                    viewBox="0 0 100 100"
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#2a2a2a"
                      strokeWidth="6"
                    />
                    <motion.circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke={primaryColor}
                      strokeWidth="6"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: calculatedProgress / 100 }}
                      transition={{ duration: 2, ease: "easeOut", delay: 0.8 }}
                      style={{ filter: `drop-shadow(0 0 4px ${primaryColor})` }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-white">
                      {calculatedProgress}%
                    </span>
                  </div>
                </div>

                <div className="text-left space-y-3 flex-1">
                  <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
                    <span className="animate-wave inline-block origin-bottom-right">
                      👋
                    </span>
                    Bem-vindo ao seu Portal
                  </h2>
                  <p className="text-gray-400 leading-relaxed font-light">
                    Acompanhe em tempo real cada passo da implantação dos
                    sitemas Siplan no seu cartório. Estamos construindo juntos
                    uma nova era de eficiência e tecnologia.
                  </p>
                  <div className="pt-2 flex items-center gap-2 text-sm text-gray-500">
                    <Clock size={14} />
                    <span>
                      Status Atual:{" "}
                      <span className="text-gray-300 font-medium">
                        {roadmap.welcome_message || "Projeto em Andamento..."}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <ButtonScrollDown />
        </section>

        {/* Timeline Section */}
        <section className="relative max-w-6xl mx-auto px-4 pb-32">
          <div className="flex items-center justify-center gap-4 mb-24 opacity-80">
            <div className="h-px w-24 bg-gradient-to-r from-transparent to-gray-600" />
            <span className="text-sm font-medium tracking-[0.3em] uppercase text-gray-400">
              Linha do Tempo
            </span>
            <div className="h-px w-24 bg-gradient-to-l from-transparent to-gray-600" />
          </div>

          {/* Timeline Vertical Line */}
          <div className="absolute left-6 md:left-1/2 top-32 bottom-32 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent -translate-x-1/2 hidden md:block" />
          <div className="absolute left-8 top-32 bottom-32 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent md:hidden" />

          <div className="space-y-24">
            {STAGES_CONFIG.map((stage, index) => {
              const stageData = project.stages[stage.id];
              const status = stageData?.status || "todo";
              return (
                <TimelineItem
                  key={stage.id}
                  stage={stage}
                  status={status}
                  index={index}
                  primaryColor={primaryColor}
                  isLeft={index % 2 === 0}
                />
              );
            })}
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center py-12 border-t border-white/5 space-y-6">
          <div className="inline-block px-6 py-3 rounded-full bg-white/5 border border-white/5 text-xs text-gray-600 uppercase tracking-[0.2em] hover:bg-white/10 transition-colors">
            Powered by Siplan &bull; {new Date().getFullYear()}
          </div>
        </footer>
      </main>
    </div>
  );
}

// --- Subcomponents ---

function ButtonScrollDown() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 2,
        duration: 2,
        repeat: Infinity,
        repeatType: "reverse",
      }}
      className="absolute bottom-12 left-1/2 -translate-x-1/2 cursor-pointer p-4 group"
      onClick={() =>
        window.scrollTo({ top: window.innerHeight, behavior: "smooth" })
      }
    >
      <div className="flex flex-col items-center gap-2 text-gray-500 group-hover:text-white transition-colors duration-300">
        <span className="text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
          Iniciar Jornada
        </span>
        <ChevronDown className="w-6 h-6 animate-bounce" />
      </div>
    </motion.div>
  );
}

function TimelineItem({
  stage,
  status,
  index,
  primaryColor,
  isLeft,
}: {
  stage: StageConfig;
  status: StageData["status"];
  index: number;
  primaryColor: string;
  isLeft: boolean;
}) {
  const isDone = status === "done";
  const isInProgress = status === "in-progress";

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{
        duration: 0.8,
        delay: index * 0.1,
        type: "spring",
        bounce: 0.4,
      }}
      className={cn(
        "relative flex flex-col md:flex-row items-center gap-8 md:gap-16 w-full",
        isLeft ? "" : "md:flex-row-reverse"
      )}
    >
      {/* Node / Marker */}
      <div className="absolute left-8 md:left-1/2 -translate-x-1/2 flex flex-col items-center justify-center z-10 top-0 md:top-8">
        <motion.div
          whileHover={{ scale: 1.2 }}
          animate={
            isInProgress ? { boxShadow: `0 0 30px ${primaryColor}` } : {}
          }
          className={cn(
            "w-12 h-12 md:w-16 md:h-16 rounded-full border-[3px] flex items-center justify-center transition-all duration-500 bg-[#050505] shadow-2xl relative z-20",
            isDone
              ? "border-emerald-500 text-emerald-500"
              : isInProgress
              ? "text-white"
              : "border-white/10 text-gray-600"
          )}
          style={{
            borderColor: isInProgress ? primaryColor : undefined,
            backgroundColor: isDone
              ? "#050505"
              : isInProgress
              ? primaryColor
              : "#050505",
          }}
        >
          {isDone ? (
            <CheckCircle2 className="w-5 h-5 md:w-7 md:h-7" />
          ) : (
            <stage.icon className="w-5 h-5 md:w-7 md:h-7" />
          )}
        </motion.div>
      </div>

      {/* Spacer for Flex positioning */}
      <div className="flex-1 w-full md:w-1/2 hidden md:block" />

      {/* Content Card */}
      <div
        className={cn(
          "flex-1 w-full md:w-1/2 pl-24 md:pl-0",
          isLeft ? "md:pr-12 md:text-right" : "md:pl-12 md:text-left"
        )}
      >
        <div
          className={cn(
            "group relative p-8 md:p-10 rounded-[2rem] border backdrop-blur-sm transition-all duration-500 bg-white/5 border-white/5",
            isInProgress
              ? "hover:bg-white/10"
              : "hover:bg-white/10 opacity-70 hover:opacity-100"
          )}
          style={{
            borderColor: isInProgress
              ? `${primaryColor}66`
              : "rgba(255,255,255,0.05)",
            boxShadow: isInProgress
              ? `0 0 40px -20px ${primaryColor}40`
              : "none",
          }}
        >
          {/* Status Badge */}
          <div
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6 border",
              isDone
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                : isInProgress
                ? "text-white border-white/20"
                : "bg-white/5 text-gray-500 border-white/5"
            )}
            style={{
              backgroundColor: isInProgress ? primaryColor : undefined,
              borderColor: isInProgress ? primaryColor : undefined,
            }}
          >
            {isDone
              ? "Finalizado"
              : isInProgress
              ? "Em Andamento"
              : "Aguardando"}
          </div>

          <h3
            className={cn(
              "text-3xl font-bold mb-3 group-hover:text-white transition-colors",
              isDone ? "text-gray-300" : "text-white"
            )}
          >
            {stage.label}
          </h3>

          <p className="text-gray-400 text-lg leading-relaxed mb-8 font-light">
            {stage.description}
          </p>

          {/* Sub-steps / Details */}
          {stage.details && (
            <ul
              className={cn(
                "space-y-4",
                isLeft ? "md:items-end" : "md:items-start",
                "flex flex-col"
              )}
            >
              {stage.details.map((detail, i) => (
                <li key={i} className="flex items-center gap-3 text-gray-400">
                  {!isLeft && (
                    <div
                      className={cn(
                        "w-1.5 h-1.5 rounded-full flex-shrink-0",
                        isDone ? "bg-emerald-500" : "bg-gray-700"
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      isDone ? "line-through opacity-50" : "",
                      "text-base"
                    )}
                  >
                    {detail}
                  </span>
                  {isLeft && (
                    <div
                      className={cn(
                        "w-1.5 h-1.5 rounded-full flex-shrink-0",
                        isDone ? "bg-emerald-500" : "bg-gray-700"
                      )}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </motion.div>
  );
}
