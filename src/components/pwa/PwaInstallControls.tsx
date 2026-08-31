import { useEffect, useState } from "react";
import { Download, Share2, Smartphone } from "lucide-react";

import { usePwaInstall } from "@/components/pwa/PwaContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PwaInstallDialogProps {
  autoOpen?: boolean;
}

interface PwaInstallButtonProps {
  visible?: boolean;
}

const AUTO_OPEN_DELAY_MS = 1600;

export function PwaInstallButton({ visible = true }: PwaInstallButtonProps) {
  const { canInstall, isInstalled, isMobile, openInstallDialog } = usePwaInstall();

  if (!visible || !isMobile || isInstalled) return null;

  return (
    <Button
      aria-label="Instalar aplicativo"
      className="relative shrink-0 md:hidden"
      size="icon"
      title="Instalar Siplan HUB"
      variant="ghost"
      onClick={openInstallDialog}
    >
      <Download className="h-4 w-4" />
      {canInstall && (
        <span
          aria-hidden="true"
          className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-background"
        />
      )}
    </Button>
  );
}

export function PwaInstallDialog({ autoOpen = true }: PwaInstallDialogProps) {
  const {
    canInstall,
    dialogOpen,
    installApp,
    isInstalled,
    isIos,
    isMobile,
    neverShowInstall,
    openInstallDialog,
    postponeInstall,
    shouldAutoOffer,
  } = usePwaInstall();
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (!autoOpen || !shouldAutoOffer || dialogOpen) return;

    const timeout = window.setTimeout(openInstallDialog, AUTO_OPEN_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [autoOpen, dialogOpen, openInstallDialog, shouldAutoOffer]);

  if (!isMobile || isInstalled) return null;

  const handleInstall = async () => {
    setInstalling(true);
    await installApp();
    setInstalling(false);
  };

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => {
        if (open) openInstallDialog();
        else postponeInstall();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader className="pr-8 text-left">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {isIos ? <Share2 className="h-6 w-6" /> : <Smartphone className="h-6 w-6" />}
          </div>
          <DialogTitle>Instale o Siplan HUB no celular</DialogTitle>
          <DialogDescription>
            Tenha um ícone na tela inicial e abra o sistema em uma janela própria,
            como um aplicativo.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/40 p-3 text-sm text-foreground">
          {canInstall ? (
            <p>Seu navegador está pronto. Toque em &quot;Instalar agora&quot; para confirmar.</p>
          ) : isIos ? (
            <p>
              No Safari, toque em <strong>Compartilhar</strong> e depois em{" "}
              <strong>Adicionar à Tela de Início</strong>.
            </p>
          ) : (
            <p>
              Abra esta página no Chrome e use o menu <strong>⋮</strong> →{" "}
              <strong>Instalar app</strong> ou{" "}
              <strong>Adicionar à tela inicial</strong>. O botão de instalação aparecerá aqui
              assim que o navegador o liberar.
            </p>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          &quot;Não mostrar novamente&quot; desativa somente este convite automático. O ícone de
          instalação continuará disponível no topo.
        </p>

        <DialogFooter className="sm:gap-2">
          <Button variant="ghost" onClick={neverShowInstall}>
            Não mostrar novamente
          </Button>
          <Button variant="outline" onClick={postponeInstall}>
            Ver depois
          </Button>
          {canInstall && (
            <Button disabled={installing} onClick={() => void handleInstall()}>
              <Download className="mr-2 h-4 w-4" />
              {installing ? "Abrindo..." : "Instalar agora"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
