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
  title?: string | null;
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
  visitorId?: string;
}

interface SessionActionResult {
  success?: boolean;
  error?: string;
  title?: string;
}

export function formatPosChatTranscript(
  messages: PosChatMessage[],
  options: { title: string; clientName: string; systemType: string }
) {
  const header = [
    options.title,
    `Cliente: ${options.clientName}`,
    `Sistema: ${options.systemType}`,
    `Exportado em: ${new Date().toLocaleString("pt-BR")}`,
    "",
    "------------------------------------------------------------",
    "",
  ];

  const transcript = messages.flatMap((message) => [
    `${message.role === "user" ? "CLIENTE" : "ASSISTENTE"} — ${new Date(
      message.created_at
    ).toLocaleString("pt-BR")}`,
    message.content,
    "",
  ]);

  return [...header, ...transcript].join("\n").trimEnd() + "\n";
}

function safeTranscriptFilename(title: string) {
  const normalized = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 60);

  return `${normalized || "conversa"}.txt`;
}

export function usePosAiChat(optionsOrId?: string | UsePosAiChatOptions) {
  const projectId =
    typeof optionsOrId === "string" ? optionsOrId : optionsOrId?.projectId || "";
  const visitorId = typeof optionsOrId === "string" ? "" : optionsOrId?.visitorId || "";

  const [projectInfo, setProjectInfo] = useState<ProjectPublicInfo | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [isAccessDisabled, setIsAccessDisabled] = useState(false);

  const [messages, setMessages] = useState<PosChatMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());
  const previousResponseIdRef = useRef<string | null>(null);
  const previousVisitorIdRef = useRef(visitorId);

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
      } catch (err: unknown) {
        if (isMounted) {
          setProjectError(
            err instanceof Error ? err.message : "Erro ao carregar informações do projeto"
          );
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
    if (!projectId || !visitorId) {
      setSessions([]);
      return;
    }
    setIsLoadingSessions(true);

    try {
      const { data, error } = await supabase.rpc("get_pos_chat_visitor_sessions", {
        p_project_id: projectId,
        p_visitor_id: visitorId,
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
  }, [projectId, visitorId]);

  useEffect(() => {
    if (projectId && visitorId) {
      loadSessions();
    } else {
      setSessions([]);
    }
  }, [projectId, visitorId, loadSessions]);

  useEffect(() => {
    if (previousVisitorIdRef.current === visitorId) return;

    previousVisitorIdRef.current = visitorId;
    setSessionId(crypto.randomUUID());
    setMessages([]);
    setSessions([]);
    previousResponseIdRef.current = null;
  }, [visitorId]);

  // 3. Load message history for active session
  const loadHistoryForSession = useCallback(
    async (targetSessionId: string) => {
      if (!projectId || !visitorId || !targetSessionId) return;
      setIsLoadingHistory(true);

      try {
        const { data, error } = await supabase.rpc("get_pos_chat_session_messages", {
          p_project_id: projectId,
          p_session_id: targetSessionId,
          p_visitor_id: visitorId,
        });

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
    [projectId, visitorId]
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
    if (!trimmed || isGenerating || !projectId || !visitorId || !sessionId) return;

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
          title: trimmed,
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
          visitor_id: visitorId,
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
      if (!visitorId) return;

      const { error } = await supabase.rpc("save_pos_chat_feedback_for_visitor", {
        p_message_id: messageId,
        p_visitor_id: visitorId,
        p_feedback: feedback,
        p_comment: comment || null,
      });

      if (error) {
        await supabase.functions.invoke("pos-assistant-chat", {
          body: {
            action: "feedback",
            message_id: messageId,
            visitor_id: visitorId,
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

  const renameSession = async (targetSessionId: string, title: string) => {
    const normalizedTitle = title.trim().replace(/\s+/g, " ");
    if (!normalizedTitle || normalizedTitle.length > 120) {
      toast.error("Informe um título com até 120 caracteres.");
      return false;
    }

    try {
      if (!visitorId) return false;

      const { data, error } = await supabase.rpc("rename_pos_chat_visitor_session", {
        p_project_id: projectId,
        p_session_id: targetSessionId,
        p_visitor_id: visitorId,
        p_title: normalizedTitle,
      });
      const result = data as SessionActionResult | null;

      if (error || !result?.success) {
        throw new Error(result?.error || error?.message || "Não foi possível renomear a conversa.");
      }

      setSessions((prev) =>
        prev.map((session) =>
          session.session_id === targetSessionId
            ? { ...session, title: result.title || normalizedTitle }
            : session
        )
      );
      toast.success("Conversa renomeada.");
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível renomear a conversa.");
      return false;
    }
  };

  const deleteSession = async (targetSessionId: string) => {
    try {
      if (!visitorId) return false;

      const { data, error } = await supabase.rpc("delete_pos_chat_visitor_session", {
        p_project_id: projectId,
        p_session_id: targetSessionId,
        p_visitor_id: visitorId,
      });
      const result = data as SessionActionResult | null;

      if (error || !result?.success) {
        throw new Error(result?.error || error?.message || "Não foi possível excluir a conversa.");
      }

      setSessions((prev) => prev.filter((session) => session.session_id !== targetSessionId));

      if (targetSessionId === sessionId) {
        setSessionId(crypto.randomUUID());
        setMessages([]);
        previousResponseIdRef.current = null;
      }

      toast.success("Conversa excluída.");
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir a conversa.");
      return false;
    }
  };

  const exportSession = async (targetSessionId: string) => {
    try {
      if (!visitorId) return false;

      const { data, error } = await supabase.rpc("get_pos_chat_session_messages", {
        p_project_id: projectId,
        p_session_id: targetSessionId,
        p_visitor_id: visitorId,
      });

      if (error || !data?.length) {
        throw new Error(error?.message || "A conversa não possui mensagens para exportar.");
      }

      const session = sessions.find((item) => item.session_id === targetSessionId);
      const title = session?.title || session?.first_message || "Conversa";
      const transcript = formatPosChatTranscript(data as PosChatMessage[], {
        title,
        clientName: projectInfo?.client_name || "Cartório",
        systemType: projectInfo?.system_type || "Orion TN",
      });
      const url = URL.createObjectURL(new Blob([transcript], { type: "text/plain;charset=utf-8" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = safeTranscriptFilename(title);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("Conversa exportada.");
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível exportar a conversa.");
      return false;
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
    renameSession,
    deleteSession,
    exportSession,
    reloadHistory: () => loadHistoryForSession(sessionId),
    reloadSessions: loadSessions,
  };
}
