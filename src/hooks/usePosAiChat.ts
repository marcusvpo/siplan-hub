import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PosChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  response_id?: string | null;
  feedback?: "helpful" | "unhelpful" | null;
  feedback_comment?: string | null;
  created_at: string;
}

export interface PosChatSession {
  session_id: string;
  first_message: string;
  last_message?: string | null;
  total_messages: number;
  user_messages: number;
  started_at: string;
  last_message_at: string;
  helpful_count?: number;
  unhelpful_count?: number;
}

export interface ProjectPublicInfo {
  id: string;
  client_name: string;
  system_type: string;
  products?: string[];
  ticket_number?: string | null;
  pos_assistant_enabled?: boolean;
  pos_assistant_disabled_at?: string | null;
}

export interface UsePosAiChatOptions {
  projectId: string;
}

export function usePosAiChat(optionsOrId?: string | UsePosAiChatOptions) {
  const projectId =
    typeof optionsOrId === "string" ? optionsOrId : optionsOrId?.projectId || "";

  const [projectInfo, setProjectInfo] = useState<ProjectPublicInfo | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [isAccessDisabled, setIsAccessDisabled] = useState(false);

  const [messages, setMessages] = useState<PosChatMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());
  const previousResponseIdRef = useRef<string | null>(null);

  const [sessions, setSessions] = useState<PosChatSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // 1. Fetch Project Info and check active status
  useEffect(() => {
    if (!projectId) {
      setIsLoadingProject(false);
      setProjectError("ID do projeto não fornecido");
      return;
    }

    let isMounted = true;
    const fetchProject = async () => {
      setIsLoadingProject(true);
      setProjectError(null);

      try {
        // Try RPC first
        const { data, error } = await supabase.rpc("get_pos_assistant_project_info", {
          p_id: projectId,
        });

        if (error || !data) {
          // Fallback to direct query on projects
          const { data: directData, error: directErr } = await supabase
            .from("projects")
            .select("id, client_name, system_type, products, ticket_number, custom_fields, is_deleted")
            .eq("id", projectId)
            .eq("is_deleted", false)
            .maybeSingle();

          if (directErr || !directData) {
            throw new Error("Projeto não encontrado ou link expirado");
          }

          const isEnabled = Boolean(
            (directData.custom_fields as Record<string, unknown>)?.pos_assistant_enabled
          );
          const disabledAt =
            ((directData.custom_fields as Record<string, unknown>)
              ?.pos_assistant_disabled_at as string) || null;

          if (isMounted) {
            const info: ProjectPublicInfo = {
              id: directData.id,
              client_name: directData.client_name || "Cartório",
              system_type: directData.system_type || "Orion TN",
              products: directData.products || [],
              ticket_number: directData.ticket_number,
              pos_assistant_enabled: isEnabled,
              pos_assistant_disabled_at: disabledAt,
            };
            setProjectInfo(info);
            setIsAccessDisabled(!isEnabled);
          }
        } else {
          if (isMounted) {
            const info = data as unknown as ProjectPublicInfo;
            setProjectInfo(info);
            setIsAccessDisabled(info.pos_assistant_enabled === false);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setProjectError(err.message || "Erro ao carregar informações do projeto");
        }
      } finally {
        if (isMounted) {
          setIsLoadingProject(false);
        }
      }
    };

    fetchProject();

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  // 2. Fetch list of past sessions for the sidebar (Strictly sorted newest first)
  const loadSessions = useCallback(async () => {
    if (!projectId) return;
    setIsLoadingSessions(true);

    try {
      const { data, error } = await supabase.rpc("get_pos_chat_project_sessions", {
        p_project_id: projectId,
      });

      if (error) {
        console.error("Error loading project sessions:", error);
        return;
      }

      if (data) {
        const sorted = (data as PosChatSession[]).sort((a, b) => {
          const tA = new Date(a.last_message_at || a.started_at).getTime();
          const tB = new Date(b.last_message_at || b.started_at).getTime();
          return tB - tA;
        });
        setSessions(sorted);
      }
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      loadSessions();
    }
  }, [projectId, loadSessions]);

  // 3. Load message history for active session
  const loadHistoryForSession = useCallback(
    async (targetSessionId: string) => {
      if (!projectId || !targetSessionId) return;
      setIsLoadingHistory(true);

      try {
        const { data, error } = await supabase
          .from("pos_ai_chat_messages")
          .select("id, role, content, response_id, feedback, feedback_comment, created_at")
          .eq("project_id", projectId)
          .eq("session_id", targetSessionId)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Error loading chat history:", error);
          return;
        }

        if (data && data.length > 0) {
          const formatted: PosChatMessage[] = data.map((d) => ({
            id: d.id,
            role: d.role as "user" | "assistant",
            content: d.content,
            response_id: d.response_id,
            feedback: d.feedback as "helpful" | "unhelpful" | null,
            feedback_comment: d.feedback_comment,
            created_at: d.created_at,
          }));
          setMessages(formatted);

          const lastAssistant = [...formatted]
            .reverse()
            .find((m) => m.role === "assistant" && m.response_id);
          if (lastAssistant?.response_id) {
            previousResponseIdRef.current = lastAssistant.response_id;
          } else {
            previousResponseIdRef.current = null;
          }
        } else {
          setMessages([]);
          previousResponseIdRef.current = null;
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [projectId]
  );

  // 4. Select an existing conversation from sidebar
  const selectSession = async (targetSessionId: string) => {
    if (targetSessionId === sessionId) return;
    setSessionId(targetSessionId);
    await loadHistoryForSession(targetSessionId);
  };

  // 5. Reset to a fresh conversation
  const resetSession = () => {
    const newSession = crypto.randomUUID();
    setSessionId(newSession);
    setMessages([]);
    previousResponseIdRef.current = null;
    toast.success("Nova conversa iniciada.");
  };

  // 6. Send a message to AI assistant
  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isGenerating || !projectId || !sessionId) return;

    if (isAccessDisabled) {
      toast.error("O acesso ao assistente de pós-implantação deste cartório foi encerrado.");
      return;
    }

    const now = new Date().toISOString();
    const tempUserMsgId = crypto.randomUUID();
    const tempUserMsg: PosChatMessage = {
      id: tempUserMsgId,
      role: "user",
      content: trimmed,
      created_at: now,
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setIsGenerating(true);

    // Optimistically update sessions list immediately with current session at the very top
    setSessions((prev) => {
      const existingIdx = prev.findIndex((s) => s.session_id === sessionId);
      if (existingIdx >= 0) {
        const item: PosChatSession = {
          ...prev[existingIdx],
          last_message: trimmed,
          last_message_at: now,
          total_messages: prev[existingIdx].total_messages + 1,
          user_messages: prev[existingIdx].user_messages + 1,
        };
        const rest = prev.filter((s) => s.session_id !== sessionId);
        return [item, ...rest];
      } else {
        const newItem: PosChatSession = {
          session_id: sessionId,
          first_message: trimmed,
          last_message: trimmed,
          total_messages: 1,
          user_messages: 1,
          started_at: now,
          last_message_at: now,
          helpful_count: 0,
          unhelpful_count: 0,
        };
        return [newItem, ...prev];
      }
    });

    try {
      const { data, error } = await supabase.functions.invoke("pos-assistant-chat", {
        body: {
          action: "chat",
          project_id: projectId,
          session_id: sessionId,
          message: trimmed,
          previous_response_id: previousResponseIdRef.current,
        },
      });

      if (error || !data || data.error) {
        const errMsg = data?.error || error?.message || "Erro ao consultar o assistente de IA";
        throw new Error(errMsg);
      }

      const assistantMsg: PosChatMessage = {
        id: data.assistant_message_id || crypto.randomUUID(),
        role: "assistant",
        content: data.reply,
        response_id: data.response_id,
        created_at: data.created_at || new Date().toISOString(),
        feedback: null,
      };

      if (data.response_id) {
        previousResponseIdRef.current = data.response_id;
      }

      setMessages((prev) => {
        const updated = prev.map((m) =>
          m.id === tempUserMsgId && data.user_message_id ? { ...m, id: data.user_message_id } : m
        );
        return [...updated, assistantMsg];
      });

      // Update sessions list with assistant reply and keep at top
      setSessions((prev) => {
        const existingIdx = prev.findIndex((s) => s.session_id === sessionId);
        if (existingIdx >= 0) {
          const item: PosChatSession = {
            ...prev[existingIdx],
            last_message: data.reply,
            last_message_at: new Date().toISOString(),
            total_messages: prev[existingIdx].total_messages + 1,
          };
          const rest = prev.filter((s) => s.session_id !== sessionId);
          return [item, ...rest];
        }
        return prev;
      });

      // Synchronize with database
      loadSessions();
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error(err instanceof Error ? err.message : "Falha ao obter resposta do assistente.");
      const errorAssistantMsg: PosChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "Ocorreu um erro ao processar sua pergunta. Por favor, verifique sua conexão e tente novamente.",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorAssistantMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  // 7. Submit feedback on an assistant message
  const submitFeedback = async (
    messageId: string,
    feedback: "helpful" | "unhelpful",
    comment?: string
  ) => {
    // Optimistic update
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, feedback, feedback_comment: comment || m.feedback_comment }
          : m
      )
    );

    try {
      const { error } = await (supabase.rpc as any)("save_pos_chat_feedback", {
        p_message_id: messageId,
        p_feedback: feedback,
        p_comment: comment || null,
      });

      if (error) {
        await supabase.functions.invoke("pos-assistant-chat", {
          body: {
            action: "feedback",
            message_id: messageId,
            feedback,
            comment,
          },
        });
      }

      toast.success(
        feedback === "helpful"
          ? "Obrigado pelo feedback positivo!"
          : "Obrigado! Seu feedback nos ajuda a melhorar.",
        { id: `fb-${messageId}` }
      );

      loadSessions();
    } catch (err) {
      console.error("Error submitting feedback:", err);
      toast.error("Não foi possível registrar seu feedback.", { id: `fb-${messageId}` });
    }
  };

  return {
    projectInfo,
    isLoadingProject,
    projectError,
    isAccessDisabled,
    messages,
    isLoadingHistory,
    isGenerating,
    sessionId,
    sessions,
    isLoadingSessions,
    sendMessage,
    submitFeedback,
    resetSession,
    selectSession,
    reloadHistory: () => loadHistoryForSession(sessionId),
    reloadSessions: loadSessions,
  };
}
