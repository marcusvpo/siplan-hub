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
  Loader2,
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
        {/* Deep Space / Mesh Gradient Background */}
        <div className="absolute inset-0 bg-[#030303]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(120,0,0,0.15),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_rgba(50,50,150,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_50%,_rgba(100,100,100,0.05),transparent_50%)]" />

        {/* Subtle Grid - fiber optic feel */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)]" />

        {/* Dynamic Orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 0.9, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] left-[20%] w-[60%] h-[60%] rounded-full blur-[150px]"
          style={{ backgroundColor: primaryColor }}
        />

        {/* Noise Texture for Film Grain */}
        <div className="absolute inset-0 bg-[url('/assets/noise.png')] opacity-[0.03] mix-blend-overlay" />
      </div>

      <main className="relative z-10 w-full">
        {/* Full Screen Hero Section */}
        <section className="min-h-[95vh] flex flex-col items-center justify-center relative px-6 py-12 md:py-0">
          {/* Logo */}
          <div className="mb-12 mt-24 md:mt-12">
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
          </div>

          {/* Main Title & Status */}
          <div className="text-center space-y-6 max-w-4xl mx-auto z-20">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              <p className="text-sm md:text-base text-gray-400 uppercase tracking-[0.2em] mb-4">
                Portal do Cliente
              </p>
              <h1 className="text-5xl md:text-8xl font-bold tracking-tighter text-white mb-6">
                {project.client_name}
              </h1>
              <p className="text-lg md:text-xl text-gray-400 font-light flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3">
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

            {/* Epic Progress Widget */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              whileHover={{ scale: 1.01 }}
              transition={{ delay: 0.4 }}
              className="mt-16 mx-auto max-w-4xl bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-8 md:p-12 backdrop-blur-2xl relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              <div className="flex flex-col md:flex-row items-center gap-10">
                {/* Big Percentage */}
                <div className="relative flex-shrink-0">
                  <svg className="w-40 h-40 md:w-48 md:h-48 -rotate-90">
                    <circle
                      cx="50%"
                      cy="50%"
                      r="45%"
                      fill="none"
                      stroke="#222"
                      strokeWidth="8"
                    />
                    <motion.circle
                      cx="50%"
                      cy="50%"
                      r="45%"
                      fill="none"
                      stroke={primaryColor}
                      strokeWidth="8"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: calculatedProgress / 100 }}
                      transition={{
                        duration: 2.5,
                        ease: "easeOut",
                        delay: 0.5,
                      }}
                      className=""
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl md:text-5xl font-bold text-white tracking-tighter">
                      {calculatedProgress}%
                    </span>
                    <span className="text-xs uppercase tracking-[0.2em] text-gray-500 mt-2">
                      Concluído
                    </span>
                  </div>
                </div>

                <div className="text-left space-y-4 flex-1">
                  <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                    Olá,{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                      {project.client_name}
                    </span>
                    .
                  </h2>
                  <p className="text-xl text-gray-400 font-light max-w-lg">
                    Sua transformação digital está avançando. Acompanhe abaixo
                    cada etapa desta jornada.
                  </p>

                  <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/5 mt-4">
                    <div
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ backgroundColor: primaryColor }}
                    />
                    <span className="text-sm font-medium text-gray-300">
                      Fase Atual:{" "}
                      <span className="text-white">
                        {roadmap.welcome_message}
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
        <section className="relative max-w-6xl mx-auto px-4 pb-32 isolate">
          <div className="flex items-center justify-center gap-4 mb-24 opacity-80 relative z-40 bg-[#050505] py-4">
            <div className="h-px w-24 bg-gradient-to-r from-transparent to-gray-600" />
            <span className="text-sm font-medium tracking-[0.3em] uppercase text-gray-400">
              Linha do Tempo
            </span>
            <div className="h-px w-24 bg-gradient-to-l from-transparent to-gray-600" />
          </div>

          {/* Timeline Vertical Line - Logic Based */}
          <div className="absolute left-8 md:left-1/2 top-40 bottom-0 -translate-x-1/2 flex flex-col items-center z-0">
            {/* The Track Container */}
            <div className="w-[3px] h-full bg-white/5 relative overflow-hidden rounded-full">
              {/* Background Gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-30" />
              {/* Filling Line */}
              <motion.div
                initial={{ height: "0%" }}
                animate={{ height: `${calculatedProgress}%` }}
                transition={{ duration: 2.5, ease: "easeOut", delay: 0.5 }}
                className="absolute top-0 left-0 w-full bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-900 shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                style={{ borderRadius: "0 0 100px 100px" }}
              />
            </div>
          </div>

          <div className="relative z-30 space-y-12 md:space-y-16">
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
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration: 0.8,
        delay: index * 0.1,
        type: "spring",
        bounce: 0.3,
      }}
      className={cn(
        "relative flex flex-col md:flex-row items-center gap-8 md:gap-12 w-full z-10",
        isLeft ? "" : "md:flex-row-reverse"
      )}
    >
      {/* Tech Node / Marker */}
      <div className="absolute left-8 md:left-1/2 -translate-x-1/2 flex flex-col items-center justify-center z-10 top-0 md:top-8">
        <motion.div
          whileHover={{ scale: 1.2 }}
          animate={
            isInProgress
              ? {
                  boxShadow: `0 0 50px ${primaryColor}66`,
                }
              : {}
          }
          className={cn(
            "w-12 h-12 md:w-16 md:h-16 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative z-20 cursor-pointer backdrop-blur-xl",
            isDone
              ? "border-emerald-500 bg-[#050505] text-emerald-500"
              : isInProgress
              ? "bg-[#050505] text-white"
              : "border-white/10 bg-[#050505] text-gray-600"
          )}
          style={{
            borderColor: isInProgress ? primaryColor : undefined,
          }}
        >
          {isInProgress && (
            <div
              className="absolute inset-0 rounded-full animate-ping opacity-20"
              style={{ backgroundColor: primaryColor }}
            />
          )}

          {isDone ? (
            <CheckCircle2 className="w-6 h-6" />
          ) : (
            <stage.icon
              className={cn("w-6 h-6", isInProgress ? "animate-pulse" : "")}
            />
          )}
        </motion.div>
      </div>

      {/* Spacer for Flex positioning */}
      <div className="flex-1 w-full md:w-1/2 hidden md:block" />

      {/* Content Card with Glassmorphism */}
      <div
        className={cn(
          "flex-1 w-full md:w-1/2 pl-24 md:pl-0",
          isLeft ? "md:pr-16 md:text-right" : "md:pl-16 md:text-left"
        )}
      >
        <motion.div
          whileHover={{ y: -5, borderColor: "rgba(255,255,255,0.3)" }}
          className={cn(
            "group relative p-8 md:p-10 rounded-[2rem] border transition-all duration-500 overflow-hidden",
            "bg-white/[0.03] backdrop-blur-3xl",
            isInProgress
              ? "border-emerald-500/50 shadow-[0_0_30px_-10px_rgba(16,185,129,0.2)]"
              : "border-white/10 hover:bg-white/[0.06]"
          )}
          style={{
            borderColor: isInProgress ? primaryColor : undefined,
            boxShadow: isInProgress
              ? `0 0 30px -10px ${primaryColor}40`
              : "none",
          }}
        >
          {/* Active Gradient Border Effect (Neon) */}
          {isInProgress && (
            <div
              className="absolute inset-0 border-2 border-transparent rounded-[2rem]"
              style={{ borderColor: primaryColor, opacity: 0.5 }}
            />
          )}

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
              "text-3xl font-bold mb-4 tracking-tight transition-colors",
              isDone
                ? "text-gray-400 decoration-slate-600 line-through decoration-2"
                : "text-white"
            )}
          >
            {stage.label}
          </h3>

          <p className="text-[#CCCCCC] text-lg leading-relaxed mb-10 font-light">
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
                  className="flex items-center gap-4 text-gray-400 group/item"
                >
                  {!isLeft &&
                    (isDone ? (
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-white/20 group-hover/item:bg-white transition-colors" />
                    ))}

                  <span
                    className={cn(
                      "text-base transition-colors duration-300",
                      isDone
                        ? "opacity-50 line-through"
                        : "group-hover/item:text-gray-200"
                    )}
                  >
                    {detail}
                  </span>

                  {isLeft &&
                    (isDone ? (
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
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
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]"
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>Finalizado</span>
      </motion.div>
    );
  }

  if (isInProgress) {
    return (
      <div className="relative inline-flex group">
        <div
          className="absolute -inset-[1px] rounded-full blur-sm opacity-75 animate-pulse"
          style={{ backgroundColor: color }}
        />
        <div className="relative inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#050505] border border-white/20 text-white text-xs font-bold uppercase tracking-widest shadow-xl">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="w-3.5 h-3.5 text-white" />
          </motion.div>
          <span className="text-white drop-shadow-md">Em Andamento</span>
        </div>
      </div>
    );
  }

  // Pending / Blocked
  return (
    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.02] border border-white/5 text-gray-500 text-xs font-bold uppercase tracking-widest">
      <Clock className="w-3.5 h-3.5" />
      <span>Aguardando</span>
    </div>
  );
}

export function RealtimeFooter() {
  return (
    <section className="relative py-32 px-6 mt-12 overflow-hidden border-t border-white/5">
      {/* Footer Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-white/5 via-[#050505] to-[#050505] pointer-events-none" />

      <div className="max-w-4xl mx-auto text-center relative z-10 space-y-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/20 border border-emerald-500/20 text-emerald-400 text-xs font-medium"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
          Sincronização em Tempo Real
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-6">
            Transparência Total <br /> na Sua Jornada
          </h2>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light">
            Este roadmap é conectado diretamente ao nosso sistema interno de
            gestão. Cada avanço da nossa equipe técnica é refletido aqui
            instantaneamente, garantindo que você esteja sempre no controle do
            progresso.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="pt-12 flex flex-col items-center gap-6"
        >
          <div className="flex items-center justify-center gap-6 opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
            <div className="h-px w-16 md:w-32 bg-gradient-to-r from-transparent to-white/30" />
            <img
              src="/assets/Siplan_logo_branco.png"
              alt="Siplan"
              className="h-6 md:h-8"
            />
            <div className="h-px w-16 md:w-32 bg-gradient-to-l from-transparent to-white/30" />
          </div>

          <p className="text-xs text-gray-600 uppercase tracking-[0.2em]">
            Atualizado Agora
          </p>
        </motion.div>
      </div>
    </section>
  );
}
