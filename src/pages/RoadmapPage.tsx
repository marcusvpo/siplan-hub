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

  // NOTE: Barra de progresso do topo removida para evitar "linha vermelha estranha"
  // const { scrollYProgress } = useScroll();
  // const scaleX = useSpring(scrollYProgress, ...);

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
      {/* Dynamic Background with Animation - Enhanced */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Animated Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

        {/* Moving Gradient Orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 0.9, 1],
            x: [0, 100, -50, 0],
            y: [0, -50, 50, 0],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] rounded-full blur-[120px]"
          style={{ backgroundColor: primaryColor }}
        />
        <motion.div
          animate={{
            scale: [1, 1.4, 0.9, 1],
            x: [0, -150, 50, 0],
            y: [0, 80, -30, 0],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
            delay: 1,
          }}
          className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full blur-[140px] bg-blue-900/40"
        />
        <motion.div
          animate={{
            opacity: [0.05, 0.15, 0.05],
            scale: [1, 1.5, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[30%] left-[20%] w-[40%] h-[40%] rounded-full blur-[160px] bg-indigo-900/30"
        />

        {/* Floating Particles (Stars effect) */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-white rounded-full"
            initial={{
              x:
                Math.random() *
                (typeof window !== "undefined" ? window.innerWidth : 1000),
              y:
                Math.random() *
                (typeof window !== "undefined" ? window.innerHeight : 1000),
              scale: Math.random() * 0.5 + 0.5,
              opacity: Math.random() * 0.3 + 0.1,
            }}
            animate={{
              y: [null, Math.random() * -100],
              opacity: [null, 0],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{
              width: Math.random() * 3 + 1 + "px",
              height: Math.random() * 3 + 1 + "px",
            }}
          />
        ))}

        <div className="absolute inset-0 bg-[url('/assets/noise.png')] opacity-[0.05] mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505]/90" />
      </div>

      <main className="relative z-10 w-full">
        {/* Full Screen Hero Section */}
        <section className="min-h-[95vh] flex flex-col items-center justify-center relative px-6 py-12 md:py-0">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, type: "spring" }}
            className="mb-12 mt-12 md:mt-0"
          >
            <motion.div
              whileHover={{ scale: 1.1, rotate: 2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="relative z-10 cursor-pointer"
              onClick={() =>
                confetti({ particleCount: 50, spread: 60, origin: { y: 0.3 } })
              }
            >
              <img
                src="/assets/Siplan_logo_branco.png"
                alt="Siplan Logo"
                className="h-24 md:h-32 w-auto drop-shadow-2xl"
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
                <motion.span
                  whileHover={{ scale: 1.05 }}
                  className="font-medium px-4 py-1 rounded-full bg-white/5 border border-white/10 text-white shadow-inner cursor-default"
                >
                  {project.system_type}
                </motion.span>
              </p>
            </motion.div>

            {/* Interactive Welcome Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{
                scale: 1.02,
                backgroundColor: "rgba(255,255,255,0.08)",
              }}
              transition={{ delay: 0.4 }}
              className="mt-12 mx-auto max-w-3xl bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-2xl transition-all duration-300 group shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] cursor-pointer"
              style={{
                boxShadow: `0 0 60px -20px ${primaryColor}15`,
              }}
            >
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Progress Radial */}
                <div className="relative w-32 h-32 flex-shrink-0 group-hover:scale-110 transition-transform duration-500">
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
                    <span className="animate-wave inline-block origin-bottom-right text-3xl">
                      👋
                    </span>
                    Bem-vindo ao seu Portal
                  </h2>
                  <p className="text-gray-400 leading-relaxed font-light">
                    Acompanhe em tempo real cada passo da implantação dos
                    sistemas Siplan no seu cartório. Estamos construindo juntos
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
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="inline-block px-6 py-3 rounded-full bg-white/5 border border-white/5 text-xs text-gray-600 uppercase tracking-[0.2em] hover:bg-white/10 transition-colors cursor-pointer"
          >
            Powered by Siplan &bull; {new Date().getFullYear()}
          </motion.div>
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
      className="mt-16 md:mt-24 cursor-pointer p-4 group z-20"
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 },
  };

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
          whileHover={{ scale: 1.2, rotate: 10 }}
          whileTap={{ scale: 0.9 }}
          animate={
            isInProgress ? { boxShadow: `0 0 30px ${primaryColor}` } : {}
          }
          className={cn(
            "w-12 h-12 md:w-16 md:h-16 rounded-full border-[3px] flex items-center justify-center transition-all duration-500 bg-[#050505] shadow-2xl relative z-20 cursor-pointer",
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
        <motion.div
          whileHover={{ y: -5, boxShadow: `0 20px 40px -10px rgba(0,0,0,0.5)` }}
          className={cn(
            "group relative p-8 md:p-10 rounded-[2rem] border backdrop-blur-sm transition-all duration-500 bg-white/5 border-white/5 cursor-default",
            isInProgress
              ? "hover:bg-white/10"
              : "hover:bg-white/10 opacity-80 hover:opacity-100"
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
              "text-2xl md:text-3xl font-bold mb-3 group-hover:text-white transition-colors",
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
            <motion.ul
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className={cn(
                "space-y-4",
                isLeft ? "md:items-end" : "md:items-start",
                "flex flex-col"
              )}
            >
              {stage.details.map((detail, i) => (
                <motion.li
                  key={i}
                  variants={itemVariants}
                  className="flex items-center gap-3 text-gray-400 hover:text-gray-200 transition-colors"
                >
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
                </motion.li>
              ))}
            </motion.ul>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
