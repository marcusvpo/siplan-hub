import { createContext, useContext } from "react";

export interface PwaInstallContextValue {
  canInstall: boolean;
  dialogOpen: boolean;
  isInstalled: boolean;
  isIos: boolean;
  isMobile: boolean;
  shouldAutoOffer: boolean;
  installApp: () => Promise<boolean>;
  neverShowInstall: () => void;
  openInstallDialog: () => void;
  postponeInstall: () => void;
}

const noop = () => undefined;

export const PwaInstallContext = createContext<PwaInstallContextValue>({
  canInstall: false,
  dialogOpen: false,
  isInstalled: true,
  isIos: false,
  isMobile: false,
  shouldAutoOffer: false,
  installApp: async () => false,
  neverShowInstall: noop,
  openInstallDialog: noop,
  postponeInstall: noop,
});

export function usePwaInstall() {
  return useContext(PwaInstallContext);
}
