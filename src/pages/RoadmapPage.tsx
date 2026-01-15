import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  AnimatePresence,
} from "framer-motion";
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
  Loader2,
  Sparkles,
  Zap,
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
    last_update?: string;
  };
}

interface StageConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  details?: string[];
}

// Configuração das etapas com Emojis e Novos Textos
const STAGES_CONFIG: StageConfig[] = [
  {
    id: "infra",
    label: "Infraestrutura do seu Cartório",
    icon: Cpu,
    description: "Preparando o terreno para a inovação.",
    details: [
      "🖥️ Validação de Servidores e Hardware",
      "🔒 Verificação de Segurança e Rede",
      "✅ Conferência de Pré-requisitos",
    ],
  },
  {
    id: "adherence",
    label: "Planejamento & Aderência",
    icon: Settings,
    description: "Desenhando o futuro da operação.",
    details: [
      "🗺️ Mapeamento de Processos Críticos",
      "🔍 Análise de Gaps Operacionais",
      "📅 Estudo das principais rotinas do seu cartório",
    ],
  },
  {
    id: "conversion",
    label: "Diagnóstico e Extração",
    icon: Truck,
    description: "Migração inteligente do legado.",
    details: [
      "💾 Preparação para Conversão da Base de Dados",
      "🛡️ Extração Segura de Dados",
      "🔄 Primeira Carga em Homologação",
    ],
  },
  {
    id: "environment",
    label: "Configuração e Parâmetros",
    icon: Database,
    description: "O sistema, do seu jeito.",
    details: [
      "🛠️ Instalação dos Sistemas Siplan",
      "⚙️ Parametrização de Regras de Negócio",
      "👤 Setup de Perfis e Permissões",
    ],
  },
  {
    id: "implementation",
    label: "Implantação & Treinamento",
    icon: Archive,
    description: "A reta final para a transformação.",
    details: [
      "🎓 Treinamentos Coletivos por Setor",
      "🏆 Validação Final pela Serventia",
      "🚀 GO-LIVE: Entrada Oficial em Produção",
    ],
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
    return Math.max(data.project.overall_progress || 0, progress);
  }, [data]);

  // Calculate Current Phase Label
  const currentPhaseLabel = useMemo(() => {
    if (!data) return "Carregando...";
    const stages = data.project.stages;
    const activeStages = STAGES_CONFIG.filter(
      (config) => stages[config.id]?.status === "in-progress"
    );

    if (activeStages.length > 0) {
      return activeStages.map((s) => s.label).join(" & ");
    }

    if (calculatedProgress === 100) return "Projeto Concluído";
    if (calculatedProgress === 0) return "Iniciando Jornada";

    return "Aguardando Próxima Etapa";
  }, [data, calculatedProgress]);

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
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(120,0,0,0.1),transparent_50%)] animate-pulse" />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
            borderRadius: ["20%", "50%", "20%"],
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-20 h-20 border-4 border-[#800000] border-t-transparent shadow-[0_0_30px_rgba(128,0,0,0.5)]"
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
    <div className="min-h-screen bg-[#000000] text-gray-100 selection:bg-white/20 overflow-x-hidden font-sans">
      {/* Dynamic Background with Animation - Enhanced */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Deep Space Background */}
        <div className="absolute inset-0 bg-[#020202]" />

        {/* Animated Gradient Meshes */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_rgba(50,50,50,0.1),transparent_70%)]" />
        <div className="absolute bottom-0 right-0 w-[50vw] h-[50vh] bg-[radial-gradient(circle_at_center,_rgba(var(--primary-rgb),0.05),transparent_70%)]" />

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px] opacity-20 [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)]" />

        {/* Dynamic Orbs */}
        <motion.div
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px]"
          style={{ backgroundColor: primaryColor }}
        />
        <motion.div
          animate={{
            x: [0, -50, 0],
            y: [0, -30, 0],
            opacity: [0.05, 0.1, 0.05],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[150px] bg-blue-900/20"
        />

        {/* Noise Texture */}
        <div className="absolute inset-0 bg-[url('/assets/noise.png')] opacity-[0.04] mix-blend-overlay" />
      </div>

      <main className="relative z-10 w-full">
        {/* Full Screen Hero Section */}
        <section className="min-h-[90vh] flex flex-col items-center justify-center relative px-6 py-12 md:py-0">
          {/* Top Bar with Logo */}
          <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-center z-50">
            <motion.img
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              src="/assets/Siplan_logo_branco.png"
              alt="Siplan"
              className="h-10 md:h-12 w-auto opacity-80 hover:opacity-100 transition-opacity"
            />
            <div className="hidden md:flex items-center gap-4">
              <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-gray-400 backdrop-blur-md">
                Portal do Cliente
              </div>
            </div>
          </div>

          {/* Main Title & Status */}
          <div className="text-center space-y-8 max-w-5xl mx-auto z-20 mt-12 md:mt-0">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="relative"
            >
              <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 bg-white/5 border border-white/10 rounded-full backdrop-blur-sm">
                <Sparkles className="w-3 h-3 text-yellow-400" />
                <span className="text-[10px] md:text-xs font-medium uppercase tracking-widest text-gray-300">
                  Jornada de Inovação
                </span>
              </div>

              <h1 className="text-5xl md:text-8xl font-black tracking-tight text-white mb-6 drop-shadow-2xl">
                {project.client_name}
              </h1>

              <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-lg md:text-xl text-gray-400 font-light">
                <span className="bg-gradient-to-r from-gray-200 to-gray-500 bg-clip-text text-transparent">
                  Sistema {project.system_type}
                </span>
              </div>
            </motion.div>

            {/* Epic Progress Widget - Glassmorphism Redesigned */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                delay: 0.4,
                type: "spring",
                stiffness: 100,
                damping: 20,
              }}
              className="mt-12 mx-auto w-full bg-[#111]/60 border border-white/10 rounded-[2rem] p-8 md:p-12 backdrop-blur-xl relative overflow-hidden group shadow-2xl"
            >
              {/* Internal Glow */}
              <div className="absolute -top-40 -left-40 w-80 h-80 bg-white/5 rounded-full blur-[100px] group-hover:bg-white/10 transition-colors duration-1000" />

              <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
                {/* Visual Progress Indicator */}
                <div className="relative flex-shrink-0 group/circle">
                  <div className="absolute inset-0 bg-white/5 rounded-full blur-2xl transform group-hover/circle:scale-110 transition-transform duration-700" />
                  <svg className="w-48 h-48 -rotate-90 relative z-10 filter drop-shadow-lg">
                    {/* Track */}
                    <circle
                      cx="50%"
                      cy="50%"
                      r="45%"
                      fill="none"
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth="6"
                    />
                    {/* Progress */}
                    <motion.circle
                      cx="50%"
                      cy="50%"
                      r="45%"
                      fill="none"
                      stroke={primaryColor}
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray="283" // approx 2 * pi * 45
                      initial={{ strokeDashoffset: 283 }}
                      animate={{
                        strokeDashoffset:
                          283 - (283 * calculatedProgress) / 100,
                      }}
                      transition={{
                        duration: 2.5,
                        ease: "easeOut",
                        delay: 0.8,
                      }}
                      className="shadow-[0_0_20px_currentColor]"
                    />
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                    <span className="text-5xl font-bold text-white tracking-tighter">
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1, duration: 1 }}
                      >
                        {calculatedProgress}
                      </motion.span>
                      <span className="text-2xl text-white/50">%</span>
                    </span>
                  </div>
                </div>

                <div className="text-left space-y-6 flex-1">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white leading-snug">
                      Status Geral
                    </h2>
                    <p className="text-gray-400 mt-2 text-lg font-light leading-relaxed">
                      Acompanhe o progresso em tempo real da sua transformação
                      digital. Nossa equipe está trabalhando para entregar
                      excelência.
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-4 px-5 py-3 rounded-xl bg-white/5 border border-white/5 shadow-inner">
                    <div className="relative">
                      <div
                        className="w-3 h-3 rounded-full animate-ping absolute inset-0 opacity-75"
                        style={{ backgroundColor: primaryColor }}
                      />
                      <div
                        className="w-3 h-3 rounded-full relative z-10"
                        style={{ backgroundColor: primaryColor }}
                      />
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
                        Fase Atual
                      </span>
                      <span className="text-sm md:text-base font-medium text-white shadow-black drop-shadow-sm">
                        {currentPhaseLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <ButtonScrollDown />
        </section>

        {/* Timeline Section */}
        <section className="relative max-w-5xl mx-auto px-4 pb-32 isolate">
          <div className="flex items-center justify-center gap-6 mb-24 opacity-60 relative z-40 bg-transparent py-4">
            <div className="h-px w-24 bg-gradient-to-r from-transparent to-gray-500" />
            <span className="text-sm font-semibold tracking-[0.4em] uppercase text-gray-300">
              Cronograma Executivo
            </span>
            <div className="h-px w-24 bg-gradient-to-l from-transparent to-gray-500" />
          </div>

          {/* Timeline Connector */}
          <div className="absolute left-8 md:left-1/2 top-32 bottom-20 -translate-x-1/2 flex flex-col items-center z-0">
            {/* The Track Container */}
            <div className="w-[2px] h-full bg-white/5 relative overflow-hidden">
              {/* Animated Beam */}
              <motion.div
                initial={{ height: "0%" }}
                animate={{ height: `${calculatedProgress}%` }}
                transition={{ duration: 2.5, ease: "easeOut", delay: 0.5 }}
                className="absolute top-0 left-0 w-full bg-gradient-to-b from-transparent via-emerald-500 to-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
              />
            </div>
          </div>

          <div className="relative z-30 space-y-16 md:space-y-24">
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
        <RealtimeFooter />
      </main>
    </div>
  );
}

// --- Subcomponents ---

function ButtonScrollDown() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        delay: 2,
        duration: 2,
        repeat: Infinity,
        repeatType: "reverse",
      }}
      className="absolute bottom-10 left-1/2 -translate-x-1/2 cursor-pointer p-4 group z-20"
      onClick={() =>
        window.scrollTo({ top: window.innerHeight, behavior: "smooth" })
      }
    >
      <div className="flex flex-col items-center gap-2 text-gray-600 group-hover:text-white transition-colors duration-300">
        <span className="text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
          Ver Etapas
        </span>
        <ChevronDown className="w-6 h-6 animate-bounce opacity-50 group-hover:opacity-100" />
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
  // Determine if this item needs to be dimmed or highlighted, but never crossed out
  const isPending = status === "todo" || status === "blocked";

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{
        duration: 0.8,
        delay: index * 0.1,
        type: "spring",
        bounce: 0.2,
      }}
      className={cn(
        "relative flex flex-col md:flex-row items-center gap-8 md:gap-16 w-full z-10",
        isLeft ? "" : "md:flex-row-reverse"
      )}
    >
      {/* Node / Marker */}
      <div className="absolute left-8 md:left-1/2 -translate-x-1/2 flex flex-col items-center justify-center z-10 top-0 md:top-8">
        <div
          className={cn(
            "w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl relative z-20 backdrop-blur-md border-[3px]",
            isDone
              ? "bg-[#050505] border-emerald-500/50 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              : isInProgress
              ? "bg-[#050505] border-transparent text-white shadow-[0_0_30px_rgba(255,255,255,0.2)]"
              : "bg-[#0a0a0a] border-white/10 text-gray-600"
          )}
          style={{
            borderColor: isInProgress ? primaryColor : undefined,
            boxShadow: isInProgress ? `0 0 30px ${primaryColor}40` : undefined,
          }}
        >
          {/* Ripple for In Progress */}
          {isInProgress && (
            <>
              <div
                className="absolute inset-0 rounded-full animate-ping opacity-20"
                style={{ backgroundColor: primaryColor }}
              />
              <div className="absolute -inset-2 rounded-full border border-white/10 animate-[spin_10s_linear_infinite]" />
            </>
          )}

          {isDone ? (
            <CheckCircle2 className="w-6 h-6" />
          ) : (
            <stage.icon
              className={cn("w-6 h-6", isInProgress ? "animate-pulse" : "")}
            />
          )}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1 w-full md:w-1/2 hidden md:block" />

      {/* Content Card */}
      <div
        className={cn(
          "flex-1 w-full md:w-1/2 pl-24 md:pl-0",
          isLeft ? "md:pr-12 md:text-right" : "md:pl-12 md:text-left"
        )}
      >
        <motion.div
          whileHover={{ y: -4, scale: 1.01 }}
          className={cn(
            "group relative p-8 rounded-[1.5rem] border transition-all duration-500 overflow-hidden",
            "bg-[#0a0a0a]/80 backdrop-blur-xl", // Darker card background
            isInProgress
              ? "border-t border-l border-white/20 shadow-2xl"
              : "border border-white/5 hover:border-white/10"
          )}
          style={{
            borderColor: isInProgress ? primaryColor : undefined,
            boxShadow: isInProgress
              ? `0 20px 40px -10px ${primaryColor}20`
              : undefined,
          }}
        >
          {/* Subtle sheen effect for all cards */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

          {/* Status Badge */}
          <div
            className={cn(
              "mb-6 flex",
              isLeft ? "md:justify-end" : "md:justify-start"
            )}
          >
            <RoadmapStatusBadge status={status} color={primaryColor} />
          </div>

          <h3
            className={cn(
              "text-2xl md:text-3xl font-bold mb-4 tracking-tight transition-colors",
              isDone ? "text-emerald-500" : "text-white" // CHANGED: No strike-through, green color for done
            )}
          >
            {stage.label}
          </h3>

          <p className="text-gray-400 text-base md:text-lg leading-relaxed mb-8 font-light">
            {stage.description}
          </p>

          {/* Sub-steps / Details */}
          {stage.details && (
            <motion.ul
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className={cn(
                "space-y-3",
                isLeft ? "md:items-end" : "md:items-start",
                "flex flex-col"
              )}
            >
              {stage.details.map((detail, i) => (
                <motion.li
                  key={i}
                  variants={itemVariants}
                  className="flex items-center gap-3 group/item"
                >
                  {!isLeft &&
                    (isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500/50" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-white/20 group-hover/item:bg-white transition-colors" />
                    ))}

                  <span
                    className={cn(
                      "text-[15px] transition-colors duration-300",
                      // CHANGED: No strike-through, just dimmed opacity for done
                      isDone
                        ? "text-gray-500"
                        : "text-gray-400 group-hover/item:text-gray-200"
                    )}
                  >
                    {detail}
                  </span>

                  {isLeft &&
                    (isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500/50" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-white/20 group-hover/item:bg-white transition-colors" />
                    ))}
                </motion.li>
              ))}
            </motion.ul>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

function RoadmapStatusBadge({
  status,
  color,
}: {
  status: StageData["status"];
  color: string;
}) {
  const isDone = status === "done";
  const isInProgress = status === "in-progress";

  if (isDone) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest shadow-sm">
        <CheckCircle2 className="w-3 h-3" />
        <span>Concluído</span>
      </div>
    );
  }

  if (isInProgress) {
    return (
      <div className="relative inline-flex group">
        <div
          className="absolute -inset-0.5 rounded-full blur opacity-40 animate-pulse"
          style={{ backgroundColor: color }}
        />
        <div className="relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#111] border border-white/20 text-white text-[10px] font-bold uppercase tracking-widest shadow-xl">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="w-3 h-3 text-white" />
          </motion.div>
          <span>Em Andamento</span>
        </div>
      </div>
    );
  }

  // Pending / Blocked
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
      <Clock className="w-3 h-3" />
      <span>Aguardando</span>
    </div>
  );
}

export function RealtimeFooter() {
  return (
    <section className="relative py-24 px-6 mt-12 overflow-hidden border-t border-white/5">
      {/* Footer Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-white/5 via-[#000] to-[#000] pointer-events-none" />

      <div className="max-w-3xl mx-auto text-center relative z-10 space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-block"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 text-xs font-semibold backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Sincronização em Tempo Real
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-6">
            Transparência Total
          </h2>

          <p className="text-lg text-gray-400 max-w-xl mx-auto leading-relaxed font-light">
            Acompanhe cada passo da nossa equipe. Dados atualizados diretamente
            do nosso sistema de gestão.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="pt-8 flex flex-col items-center gap-8"
        >
          <img
            src="/assets/Siplan_logo_branco.png"
            alt="Siplan"
            className="h-6 md:h-8 opacity-40 hover:opacity-100 transition-opacity duration-500"
          />

          <p className="text-[10px] text-gray-700 uppercase tracking-[0.2em] font-medium">
            © 2026 SiplanControl
          </p>
        </motion.div>
      </div>
    </section>
  );
}
