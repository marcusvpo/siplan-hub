import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, ThumbsDown, Sparkles, CheckCircle2 } from "lucide-react";

interface FeedbackPromptModalProps {
  isOpen: boolean;
  onSelectFeedback: (feedback: "helpful" | "unhelpful") => void;
  pendingMessagePreview?: string;
}

export function FeedbackPromptModal({
  isOpen,
  onSelectFeedback,
  pendingMessagePreview,
}: FeedbackPromptModalProps) {
  const [selected, setSelected] = useState<"helpful" | "unhelpful" | null>(null);

  const handleClick = (feedback: "helpful" | "unhelpful") => {
    if (selected) return;
    setSelected(feedback);
    setTimeout(() => {
      onSelectFeedback(feedback);
      setSelected(null);
    }, 450);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/65 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 20 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="relative w-full max-w-md rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200/90 dark:border-neutral-800 p-6 sm:p-7 shadow-2xl overflow-hidden text-center z-10"
          >
            {/* Ambient Background Gradient */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-semibold mb-3">
              <Sparkles className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
              <span>Avaliação de Atendimento</span>
            </div>

            {/* Question Title */}
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              A resposta anterior te ajudou?
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed max-w-sm mx-auto">
              Avalie com 1 clique para continuar nossa conversa e enviar sua próxima pergunta.
            </p>

            {/* Animated Feedback Options */}
            <div className="grid grid-cols-2 gap-4 mt-6 mb-2">
              {/* Option 1: ÚTIL / AJUDOU */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => handleClick("helpful")}
                disabled={selected !== null}
                className={`relative group p-4 sm:p-5 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2.5 cursor-pointer select-none ${
                  selected === "helpful"
                    ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105"
                    : "bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-400 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 shadow-xs hover:shadow-md hover:shadow-emerald-500/15"
                }`}
              >
                <div
                  className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-all ${
                    selected === "helpful"
                      ? "bg-white/20 text-white"
                      : "bg-white dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400 shadow-sm group-hover:scale-110 group-hover:rotate-[-8deg]"
                  }`}
                >
                  {selected === "helpful" ? (
                    <CheckCircle2 className="h-8 w-8 animate-bounce" />
                  ) : (
                    <ThumbsUp className="h-7 w-7" />
                  )}
                </div>
                <div className="text-center">
                  <span className="block text-xs sm:text-sm font-bold">
                    {selected === "helpful" ? "Avaliado!" : "Sim, foi útil!"}
                  </span>
                  <span
                    className={`block text-[10px] mt-0.5 ${
                      selected === "helpful" ? "text-white/80" : "text-emerald-600/80 dark:text-emerald-400/80"
                    }`}
                  >
                    Resolveu minha dúvida
                  </span>
                </div>
              </motion.button>

              {/* Option 2: NÃO AJUDOU */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => handleClick("unhelpful")}
                disabled={selected !== null}
                className={`relative group p-4 sm:p-5 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2.5 cursor-pointer select-none ${
                  selected === "unhelpful"
                    ? "bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/30 scale-105"
                    : "bg-rose-50/70 dark:bg-rose-950/25 border-rose-200 dark:border-rose-900/60 hover:border-rose-400 hover:bg-rose-100/70 dark:hover:bg-rose-950/50 text-rose-700 dark:text-rose-300 shadow-xs hover:shadow-md hover:shadow-rose-500/15"
                }`}
              >
                <div
                  className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-all ${
                    selected === "unhelpful"
                      ? "bg-white/20 text-white"
                      : "bg-white dark:bg-neutral-800 text-rose-600 dark:text-rose-400 shadow-sm group-hover:scale-110 group-hover:rotate-[8deg]"
                  }`}
                >
                  {selected === "unhelpful" ? (
                    <CheckCircle2 className="h-8 w-8 animate-bounce" />
                  ) : (
                    <ThumbsDown className="h-7 w-7" />
                  )}
                </div>
                <div className="text-center">
                  <span className="block text-xs sm:text-sm font-bold">
                    {selected === "unhelpful" ? "Registrado!" : "Não ajudou"}
                  </span>
                  <span
                    className={`block text-[10px] mt-0.5 ${
                      selected === "unhelpful" ? "text-white/80" : "text-rose-600/80 dark:text-rose-400/80"
                    }`}
                  >
                    Preciso de mais apoio
                  </span>
                </div>
              </motion.button>
            </div>

            {/* Pending Message Preview */}
            {pendingMessagePreview && (
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-neutral-800 text-[11px] text-muted-foreground truncate">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Próxima pergunta:</span>{" "}
                &quot;{pendingMessagePreview}&quot;
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
