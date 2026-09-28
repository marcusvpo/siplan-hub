import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function AuthLoadError() {
  const { authError, retryAuth } = useAuth();

  return (
    <div className="flex min-h-[100dvh] w-full min-w-0 items-center justify-center px-[max(1rem,env(safe-area-inset-left))] py-[max(1.5rem,env(safe-area-inset-top),env(safe-area-inset-bottom))] pr-[max(1rem,env(safe-area-inset-right))]">
      <div role="alert" className="flex w-full min-w-0 max-w-md flex-col items-center gap-4 text-center">
        <AlertTriangle className="h-10 w-10 shrink-0 text-destructive" aria-hidden="true" />
        <h1 className="break-words text-xl font-semibold">Não foi possível carregar seu acesso</h1>
        <p className="break-words text-muted-foreground">{authError}</p>
        <Button type="button" className="min-h-11 w-full whitespace-normal sm:w-auto" onClick={() => void retryAuth()}>
          <RotateCw className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
          Tentar novamente
        </Button>
      </div>
    </div>
  );
}
