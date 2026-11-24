import { FormEvent, useEffect, useState } from "react";
import { Loader2, UserRound } from "lucide-react";
import { PosChatVisitor } from "@/hooks/usePosChatVisitor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PosChatVisitorDialogProps {
  open: boolean;
  projectName: string;
  currentVisitor: PosChatVisitor | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error?: string | null;
  onOpenChange: (open: boolean) => void;
  onRegisterVisitor: (name: string, sector: string) => Promise<boolean>;
  onRetry?: () => void;
}

export function PosChatVisitorDialog({
  open,
  projectName,
  currentVisitor,
  isLoading,
  isSubmitting,
  error,
  onOpenChange,
  onRegisterVisitor,
  onRetry,
}: PosChatVisitorDialogProps) {
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const identificationRequired = !currentVisitor;

  useEffect(() => {
    if (!open) return;
    if (currentVisitor) {
      setName(currentVisitor.name);
      setSector(currentVisitor.sector);
    } else {
      setName("");
      setSector("");
    }
  }, [open, currentVisitor]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && identificationRequired) return;
    onOpenChange(nextOpen);
  };

  const handleRegister = async (event: FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2 || sector.trim().length < 2 || isSubmitting) return;

    const success = await onRegisterVisitor(name, sector);
    if (success) {
      setName("");
      setSector("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={`max-w-md ${identificationRequired ? "[&>button]:hidden" : ""}`}
        onEscapeKeyDown={(event) => {
          if (identificationRequired) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (identificationRequired) event.preventDefault();
        }}
      >
        <DialogHeader className="items-center text-center sm:text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </div>
          <DialogTitle>Quem está usando o assistente?</DialogTitle>
          <DialogDescription className="max-w-sm text-xs leading-relaxed">
            Isso nos ajuda a melhorar o atendimento e entender as principais dúvidas de {projectName}.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verificando identificação...
          </div>
        ) : error ? (
          <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-center text-xs text-destructive">
            <p>{error}</p>
            {onRetry && (
              <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                Tentar novamente
              </Button>
            )}
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pos-chat-visitor-name" className="text-xs">
                Seu nome
              </Label>
              <Input
                id="pos-chat-visitor-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                className="h-9 text-xs"
                placeholder="Como podemos chamar você?"
                autoComplete="name"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pos-chat-visitor-sector" className="text-xs">
                Setor do cartório
              </Label>
              <Input
                id="pos-chat-visitor-sector"
                value={sector}
                onChange={(event) => setSector(event.target.value)}
                maxLength={80}
                className="h-9 text-xs"
                placeholder="Ex.: Atendimento, Notas, Registro..."
                autoComplete="organization-title"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-rose-600 text-xs text-white hover:bg-rose-700"
              disabled={name.trim().length < 2 || sector.trim().length < 2 || isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continuar para o assistente
            </Button>
          </form>
        )}

        <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
          Seu histórico fica salvo com privacidade apenas neste navegador.
        </p>
      </DialogContent>
    </Dialog>
  );
}
