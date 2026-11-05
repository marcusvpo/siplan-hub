import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface TopicMetric {
  actions: number;
  dwell_seconds: number;
}

const STORAGE_KEY = 'siplan_telemetry_affinities_v1';
const FLUSH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

function resolveTopicFromPath(pathname: string): string | null {
  if (pathname.includes('/environment') || pathname.includes('environment-config')) {
    return 'environment';
  }
  if (pathname.includes('/conversion')) {
    return 'conversion';
  }
  if (pathname.includes('/infra') || pathname.includes('hardware')) {
    return 'infra';
  }
  if (pathname.includes('/deployments') || pathname.includes('/implantadores')) {
    return 'implementation';
  }
  if (pathname.includes('/commercial') || pathname.includes('/comercial')) {
    return 'commercial';
  }
  if (pathname.includes('/sd') || pathname.includes('/chamados')) {
    return 'sd';
  }
  if (pathname.includes('/cs-cx')) {
    return 'cs_cx';
  }
  if (pathname.includes('/projects')) {
    return 'general';
  }
  return null;
}

function getStoredMetrics(): Record<string, TopicMetric> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setStoredMetrics(metrics: Record<string, TopicMetric>): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(metrics));
  } catch {
    // Silently ignore storage quota errors
  }
}

export function useTelemetryAffinity() {
  const { user } = useAuth();
  const location = useLocation();
  const activeTopic = resolveTopicFromPath(location.pathname);
  const activeTopicRef = useRef(activeTopic);
  activeTopicRef.current = activeTopic;

  const flush = async () => {
    if (!user) return;
    const current = getStoredMetrics();
    const entries = Object.entries(current);
    if (entries.length === 0) return;

    const payload = entries.map(([topic, data]) => ({
      topic,
      actions: data.actions,
      dwell_seconds: data.dwell_seconds,
    }));

    // Limpa o buffer local antes de enviar
    sessionStorage.removeItem(STORAGE_KEY);

    try {
      await supabase.rpc('record_user_affinities', { p_metrics: payload });
    } catch (err) {
      // Em caso de falha de conexão, restaura os dados para tentar no próximo ciclo
      const restored = getStoredMetrics();
      for (const item of payload) {
        restored[item.topic] = {
          actions: (restored[item.topic]?.actions || 0) + item.actions,
          dwell_seconds: (restored[item.topic]?.dwell_seconds || 0) + item.dwell_seconds,
        };
      }
      setStoredMetrics(restored);
      console.warn('Falha silenciosa ao sincronizar afinidades de telemetria:', err);
    }
  };

  // Contabiliza tempo de permanência ativo
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const topic = activeTopicRef.current;
      if (!topic) return;

      const metrics = getStoredMetrics();
      if (!metrics[topic]) {
        metrics[topic] = { actions: 0, dwell_seconds: 0 };
      }
      metrics[topic].dwell_seconds += 5;
      setStoredMetrics(metrics);
    }, 5000);

    return () => clearInterval(interval);
  }, [user]);

  // Contabiliza ações de rota
  useEffect(() => {
    if (!user || !activeTopic) return;
    const metrics = getStoredMetrics();
    if (!metrics[activeTopic]) {
      metrics[activeTopic] = { actions: 0, dwell_seconds: 0 };
    }
    metrics[activeTopic].actions += 1;
    setStoredMetrics(metrics);
  }, [location.pathname, activeTopic, user]);

  // Flush periódico e no descarregamento da página
  useEffect(() => {
    if (!user) return;

    const timer = setInterval(() => {
      void flush();
    }, FLUSH_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void flush();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', flush);

    return () => {
      clearInterval(timer);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', flush);
      void flush();
    };
  }, [user]);
}
