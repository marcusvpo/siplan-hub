import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PosChatVisitor {
  id: string;
  name: string;
  sector: string;
  last_seen_at: string;
}

interface VisitorActionResult {
  success?: boolean;
  error?: string;
  visitor?: PosChatVisitor;
  access_token?: string;
}

interface VisitorVerifyResult {
  valid?: boolean;
  visitor?: PosChatVisitor;
}

interface RememberedVisitorSession {
  id: string;
  token: string;
}

function visitorStorageKey(projectId: string) {
  return `pos-chat-visitor:${projectId}`;
}

function readRememberedVisitor(projectId: string): RememberedVisitorSession | null {
  try {
    const raw = localStorage.getItem(visitorStorageKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.id === "string" && typeof parsed.token === "string" && parsed.token) {
      return { id: parsed.id, token: parsed.token };
    }
    return null;
  } catch {
    return null;
  }
}

function rememberVisitor(projectId: string, session: RememberedVisitorSession | null) {
  try {
    if (session) {
      localStorage.setItem(visitorStorageKey(projectId), JSON.stringify(session));
    } else {
      localStorage.removeItem(visitorStorageKey(projectId));
    }
  } catch {
    // The chat still works when storage is blocked by the browser.
  }
}

export function usePosChatVisitor(projectId: string) {
  const [visitor, setVisitor] = useState<PosChatVisitor | null>(null);
  const [visitorToken, setVisitorToken] = useState<string>("");
  const [isLoading, setIsLoading] = useState(Boolean(projectId));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVisitorSession = useCallback(async () => {
    if (!projectId) {
      setVisitor(null);
      setVisitorToken("");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const remembered = readRememberedVisitor(projectId);
      if (!remembered) {
        setVisitor(null);
        setVisitorToken("");
        return;
      }

      const { data, error: requestError } = await (supabase.rpc as any)(
        "verify_pos_chat_visitor_session",
        {
          p_project_id: projectId,
          p_visitor_id: remembered.id,
          p_visitor_token: remembered.token,
        }
      );

      if (requestError) throw requestError;

      const result = data as VisitorVerifyResult | null;
      if (result?.valid && result.visitor) {
        setVisitor(result.visitor);
        setVisitorToken(remembered.token);
      } else {
        rememberVisitor(projectId, null);
        setVisitor(null);
        setVisitorToken("");
      }
    } catch (requestError) {
      console.error("Error validating post-chat visitor session:", requestError);
      rememberVisitor(projectId, null);
      setVisitor(null);
      setVisitorToken("");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadVisitorSession();
  }, [loadVisitorSession]);

  const registerVisitor = useCallback(
    async (name: string, sector: string) => {
      if (!projectId || isSubmitting) return false;

      setIsSubmitting(true);
      try {
        const { data, error: requestError } = await supabase.rpc("register_pos_chat_visitor", {
          p_project_id: projectId,
          p_name: name.trim(),
          p_sector: sector.trim(),
        });
        const result = data as VisitorActionResult | null;

        if (requestError || !result?.success || !result.visitor || !result.access_token) {
          throw new Error(
            result?.error || requestError?.message || "Não foi possível concluir a identificação."
          );
        }

        setVisitor(result.visitor);
        setVisitorToken(result.access_token);
        rememberVisitor(projectId, {
          id: result.visitor.id,
          token: result.access_token,
        });
        toast.success(`Olá, ${result.visitor.name}!`);
        return true;
      } catch (requestError) {
        toast.error(
          requestError instanceof Error
            ? requestError.message
            : "Não foi possível concluir a identificação."
        );
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, projectId]
  );

  const clearVisitor = useCallback(() => {
    rememberVisitor(projectId, null);
    setVisitor(null);
    setVisitorToken("");
  }, [projectId]);

  return {
    visitors: [] as PosChatVisitor[],
    visitor,
    visitorToken,
    isLoading,
    isSubmitting,
    error,
    registerVisitor,
    clearVisitor,
    reloadVisitors: loadVisitorSession,
  };
}
