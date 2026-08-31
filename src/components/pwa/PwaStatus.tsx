import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw, Share, WifiOff, X } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";

import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const INSTALL_DISMISSED_KEY = "siplan-pwa-install-dismissed";
const UPDATE_INTERVAL_MS = 60 * 60 * 1000;
const PUBLIC_EXPERIENCE_PATHS = [
  /^\/public\//,
  /^\/nps\/responder\//,
  /^\/roadmap\//,
];

function isRunningStandalone() {
  const iosNavigator = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    iosNavigator.standalone === true
  );
}

function isIosDevice() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  );
}

function isPublicExperience() {
  return PUBLIC_EXPERIENCE_PATHS.some((pattern) => pattern.test(window.location.pathname));
}

function wasInstallDismissed() {
  try {
    return sessionStorage.getItem(INSTALL_DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

function rememberInstallDismissal() {
  try {
    sessionStorage.setItem(INSTALL_DISMISSED_KEY, "true");
  } catch {
    // A instalação continua funcional mesmo quando o armazenamento está bloqueado.
  }
}

export function PwaStatus() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installDismissed, setInstallDismissed] = useState(wasInstallDismissed);
  const [installed, setInstalled] = useState(isRunningStandalone);
  const suppressMessages = isPublicExperience();

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW: (_swUrl, registration) => {
      if (!registration) return;

      window.setInterval(() => {
        void registration.update();
      }, UPDATE_INTERVAL_MS);
    },
    onRegisterError: (error) => {
      console.error("Não foi possível registrar o aplicativo Siplan HUB.", error);
    },
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const dismissInstall = useCallback(() => {
    rememberInstallDismissal();
    setInstallDismissed(true);
  }, []);

  const installApp = useCallback(async () => {
    if (!installPrompt) return;

    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    setInstallPrompt(null);

    if (outcome === "accepted") {
      setInstalled(true);
    } else {
      dismissInstall();
    }
  }, [dismissInstall, installPrompt]);

  const cardClass =
    "fixed left-3 right-3 z-[100] mx-auto flex max-w-md items-start gap-3 rounded-xl border border-border bg-background/95 p-4 text-foreground shadow-2xl backdrop-blur sm:left-auto sm:right-4";
  const cardStyle = { bottom: "max(1rem, env(safe-area-inset-bottom))" };

  if (suppressMessages) return null;

  if (!isOnline) {
    return (
      <div className={cardClass} style={cardStyle} role="status" aria-live="polite">
        <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <div>
          <p className="font-semibold">Você está sem conexão</p>
          <p className="mt-1 text-sm text-muted-foreground">
            A estrutura do aplicativo continua disponível, mas dados e operações do
            sistema precisam de internet para sincronizar.
          </p>
        </div>
      </div>
    );
  }

  if (needRefresh) {
    return (
      <div className={cardClass} style={cardStyle} role="status" aria-live="polite">
        <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Nova versão disponível</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Atualize quando puder. Salve formulários em andamento antes de continuar.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void updateServiceWorker(true)}>
              Atualizar agora
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>
              Agora não
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (offlineReady) {
    return (
      <div className={cardClass} style={cardStyle} role="status" aria-live="polite">
        <Download className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Aplicativo preparado</p>
          <p className="mt-1 text-sm text-muted-foreground">
            A estrutura do Siplan HUB foi salva neste dispositivo.
          </p>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => setOfflineReady(false)}>
            Entendi
          </Button>
        </div>
      </div>
    );
  }

  if (!installed && !installDismissed && installPrompt) {
    return (
      <div className={cardClass} style={cardStyle} role="dialog" aria-label="Instalar Siplan HUB">
        <Download className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Instale o Siplan HUB</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Abra em uma janela própria e acesse pelo ícone na tela inicial.
          </p>
          <Button className="mt-3" size="sm" onClick={() => void installApp()}>
            Instalar aplicativo
          </Button>
        </div>
        <Button
          aria-label="Fechar convite de instalação"
          className="-mr-2 -mt-2 shrink-0"
          size="icon"
          variant="ghost"
          onClick={dismissInstall}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (!installed && !installDismissed && isIosDevice()) {
    return (
      <div className={cardClass} style={cardStyle} role="dialog" aria-label="Instalar Siplan HUB no iPhone">
        <Share className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Instale o Siplan HUB</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.
          </p>
        </div>
        <Button
          aria-label="Fechar instruções de instalação"
          className="-mr-2 -mt-2 shrink-0"
          size="icon"
          variant="ghost"
          onClick={dismissInstall}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return null;
}
