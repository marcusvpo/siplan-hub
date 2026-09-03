import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, WifiOff } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";

import { PwaInstallContext } from "@/components/pwa/PwaContext";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PwaProviderProps {
  children: ReactNode;
}

const INSTALL_LATER_KEY = "siplan-pwa-install-later";
const INSTALL_NEVER_KEY = "siplan-pwa-install-never";
const UPDATE_INTERVAL_MS = 60 * 60 * 1000;
const MOBILE_VIEWPORT_QUERY = "(max-width: 767px)";
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

function isMobileViewport() {
  return window.matchMedia(MOBILE_VIEWPORT_QUERY).matches;
}

function isPublicExperience() {
  return PUBLIC_EXPERIENCE_PATHS.some((pattern) =>
    pattern.test(window.location.pathname),
  );
}

function readStorage(storage: Storage, key: string) {
  try {
    return storage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function writeStorage(storage: Storage, key: string) {
  try {
    storage.setItem(key, "true");
  } catch {
    // O fluxo manual continua disponível quando o armazenamento está bloqueado.
  }
}

export function PwaProvider({ children }: PwaProviderProps) {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(isRunningStandalone);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [postponed, setPostponed] = useState(() =>
    readStorage(sessionStorage, INSTALL_LATER_KEY),
  );
  const [neverShow, setNeverShow] = useState(() =>
    readStorage(localStorage, INSTALL_NEVER_KEY),
  );
  const [isIos] = useState(isIosDevice);
  const [isMobile, setIsMobile] = useState(isMobileViewport);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW: (_swUrl, serviceWorkerRegistration) => {
      setRegistration(serviceWorkerRegistration ?? null);
    },
    onRegisterError: (error) => {
      console.error("Não foi possível registrar o aplicativo Siplan HUB.", error);
    },
  });

  useEffect(() => {
    if (!registration) return;

    const interval = window.setInterval(() => {
      void registration.update();
    }, UPDATE_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [registration]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_VIEWPORT_QUERY);
    const handleViewportChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
      if (!event.matches) setDialogOpen(false);
    };

    mediaQuery.addEventListener("change", handleViewportChange);
    return () => mediaQuery.removeEventListener("change", handleViewportChange);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setDialogOpen(false);
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

  const openInstallDialog = useCallback(() => setDialogOpen(true), []);

  const postponeInstall = useCallback(() => {
    writeStorage(sessionStorage, INSTALL_LATER_KEY);
    setPostponed(true);
    setDialogOpen(false);
  }, []);

  const neverShowInstall = useCallback(() => {
    writeStorage(localStorage, INSTALL_NEVER_KEY);
    setNeverShow(true);
    setDialogOpen(false);
  }, []);

  const installApp = useCallback(async () => {
    if (!installPrompt) return false;

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      setInstallPrompt(null);

      if (outcome === "accepted") {
        setIsInstalled(true);
        setDialogOpen(false);
        return true;
      }

      postponeInstall();
      return false;
    } catch (error) {
      console.error("Não foi possível abrir a instalação do Siplan HUB.", error);
      return false;
    }
  }, [installPrompt, postponeInstall]);

  const contextValue = useMemo(
    () => ({
      canInstall: installPrompt !== null,
      dialogOpen,
      isInstalled,
      isIos,
      isMobile,
      shouldAutoOffer:
        isMobile && !isInstalled && !postponed && !neverShow,
      installApp,
      neverShowInstall,
      openInstallDialog,
      postponeInstall,
    }),
    [
      dialogOpen,
      installApp,
      installPrompt,
      isInstalled,
      isIos,
      isMobile,
      neverShow,
      neverShowInstall,
      openInstallDialog,
      postponed,
      postponeInstall,
    ],
  );

  const suppressStatus = isPublicExperience();
  const cardClass =
    "fixed left-3 right-3 z-[100] mx-auto flex max-w-md items-start gap-3 rounded-xl border border-border bg-background/95 p-4 text-foreground shadow-2xl backdrop-blur sm:left-auto sm:right-4";
  const cardStyle = { bottom: "max(1rem, env(safe-area-inset-bottom))" };

  return (
    <PwaInstallContext.Provider value={contextValue}>
      {children}

      {!isOnline && (
        <div className={cardClass} style={cardStyle} role="status" aria-live="polite">
          <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div>
            <p className="font-semibold">Você está sem conexão</p>
            <p className="mt-1 text-sm text-muted-foreground">
              A estrutura do aplicativo continua disponível, mas dados e operações
              do sistema precisam de internet para sincronizar.
            </p>
          </div>
        </div>
      )}

      {!suppressStatus && isMobile && isOnline && needRefresh && (
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
      )}

      {!suppressStatus && isMobile && isOnline && !needRefresh && offlineReady && (
        <div className={cardClass} style={cardStyle} role="status" aria-live="polite">
          <Download className="mt-0.5 h-5 w-5 shrink-0 text-success" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Aplicativo preparado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              A estrutura do Siplan HUB foi salva neste dispositivo.
            </p>
            <Button
              className="mt-3"
              size="sm"
              variant="outline"
              onClick={() => setOfflineReady(false)}
            >
              Entendi
            </Button>
          </div>
        </div>
      )}
    </PwaInstallContext.Provider>
  );
}
