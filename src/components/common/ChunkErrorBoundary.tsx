import React, { Component, ErrorInfo, ReactNode } from "react";
import { RefreshCw, AlertCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  isChunkError: boolean;
  error: Error | null;
}

const CHUNK_ERROR_PATTERNS = [
  /failed to fetch dynamically imported module/i,
  /expected a javascript-or-wasm module script/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
  /loading chunk .* failed/i,
  /loading css chunk .* failed/i,
];

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const message =
    error instanceof Error
      ? `${error.name} ${error.message} ${error.stack || ""}`
      : String(error);
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

const RELOAD_STORAGE_KEY = "siplan_chunk_error_reload";
const RELOAD_INTERVAL_MS = 10000;

export class ChunkErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    isChunkError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    const isChunk = isChunkLoadError(error);
    return {
      hasError: true,
      isChunkError: isChunk,
      error,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ChunkErrorBoundary interceptou erro:", error, errorInfo);

    if (isChunkLoadError(error)) {
      const lastReload = sessionStorage.getItem(RELOAD_STORAGE_KEY);
      const now = Date.now();

      // Se ainda não tentou recarregar nos últimos 10 segundos, recarrega automaticamente
      if (!lastReload || now - Number(lastReload) > RELOAD_INTERVAL_MS) {
        sessionStorage.setItem(RELOAD_STORAGE_KEY, String(now));
        window.location.reload();
      }
    }
  }

  private handleReload = () => {
    sessionStorage.removeItem(RELOAD_STORAGE_KEY);
    window.location.reload();
  };

  private handleGoHome = () => {
    sessionStorage.removeItem(RELOAD_STORAGE_KEY);
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isChunk = this.state.isChunkError;

      return (
        <div className="flex min-h-[400px] w-full flex-col items-center justify-center p-6 text-center">
          <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              {isChunk ? (
                <RefreshCw className="h-6 w-6 animate-spin duration-1000" />
              ) : (
                <AlertCircle className="h-6 w-6 text-destructive" />
              )}
            </div>

            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              {isChunk
                ? "Nova versão do Siplan HUB disponível"
                : "Ops! Ocorreu um problema nesta tela"}
            </h3>

            <p className="mt-2 text-sm text-muted-foreground">
              {isChunk
                ? "Uma atualização do sistema foi publicada. Atualize a página para carregar os recursos mais recentes."
                : "Não foi possível carregar as informações desta seção. Tente recarregar ou voltar para a página inicial."}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button
                onClick={this.handleReload}
                className="gap-2"
                size="sm"
              >
                <RefreshCw className="h-4 w-4" />
                Atualizar agora
              </Button>
              <Button
                variant="outline"
                onClick={this.handleGoHome}
                className="gap-2"
                size="sm"
              >
                <Home className="h-4 w-4" />
                Ir para o início
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
