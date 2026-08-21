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
}

function visitorStorageKey(projectId: string) {
  return `pos-chat-visitor:${projectId}`;
}

function readRememberedVisitor(projectId: string) {
  try {
    return localStorage.getItem(visitorStorageKey(projectId));
  } catch {
    return null;
  }
}

function rememberVisitor(projectId: string, visitorId: string | null) {
  try {
    if (visitorId) {
      localStorage.setItem(visitorStorageKey(projectId), visitorId);
    } else {
      localStorage.removeItem(visitorStorageKey(projectId));
    }
  } catch {
    // The chat still works when storage is blocked by the browser.
  }
}

export function usePosChatVisitor(projectId: string) {
  const [visitors, setVisitors] = useState<PosChatVisitor[]>([]);
  const [visitor, setVisitor] = useState<PosChatVisitor | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(projectId));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVisitors = useCallback(async () => {
    if (!projectId) {
      setVisitors([]);
      setVisitor(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: requestError } = await supabase.rpc("get_pos_chat_visitors", {
        p_project_id: projectId,
      });

      if (requestError) throw requestError;

      const availableVisitors = (data || []) as PosChatVisitor[];
      const rememberedId = readRememberedVisitor(projectId);
      const remembered = availableVisitors.find((item) => item.id === rememberedId) || null;

      setVisitors(availableVisitors);
      setVisitor(remembered);
      if (rememberedId && !remembered) rememberVisitor(projectId, null);
    } catch (requestError) {
      console.error("Error loading post-chat visitors:", requestError);
      setError("Não foi possível carregar a identificação dos usuários.");
      setVisitors([]);
      setVisitor(null);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadVisitors();
  }, [loadVisitors]);

  const selectVisitor = useCallback(
    async (selectedVisitor: PosChatVisitor) => {
      if (!projectId || isSubmitting) return false;

      setIsSubmitting(true);
      try {
        const { data, error: requestError } = await supabase.rpc("select_pos_chat_visitor", {
          p_project_id: projectId,
          p_visitor_id: selectedVisitor.id,
        });
        const result = data as VisitorActionResult | null;

        if (requestError || !result?.success || !result.visitor) {
          throw new Error(result?.error || requestError?.message || "Usuário não encontrado.");
        }

        setVisitor(result.visitor);
        setVisitors((current) => [
          result.visitor as PosChatVisitor,
          ...current.filter((item) => item.id !== result.visitor?.id),
        ]);
        rememberVisitor(projectId, result.visitor.id);
        return true;
      } catch (requestError) {
        toast.error(
          requestError instanceof Error
            ? requestError.message
            : "Não foi possível selecionar este usuário."
        );
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, projectId]
  );

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

        if (requestError || !result?.success || !result.visitor) {
          throw new Error(
            result?.error || requestError?.message || "Não foi possível concluir a identificação."
          );
        }

        setVisitor(result.visitor);
        setVisitors((current) => [
          result.visitor as PosChatVisitor,
          ...current.filter((item) => item.id !== result.visitor?.id),
        ]);
        rememberVisitor(projectId, result.visitor.id);
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
  }, [projectId]);

  return {
    visitors,
    visitor,
    isLoading,
    isSubmitting,
    error,
    selectVisitor,
    registerVisitor,
    clearVisitor,
    reloadVisitors: loadVisitors,
  };
}
