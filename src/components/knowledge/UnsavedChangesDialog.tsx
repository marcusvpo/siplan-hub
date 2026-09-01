import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface UnsavedChangesDialogProps {
  isOpen: boolean;
  onConfirmDiscard: () => void;
  onCancel: () => void;
  articleId?: string;
  isNavigatingAway?: boolean;
}

export function UnsavedChangesDialog({
  isOpen,
  onConfirmDiscard,
  onCancel,
  articleId,
  isNavigatingAway = false,
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-md overflow-y-auto border-border bg-background p-4 shadow-2xl sm:p-6">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-amber-500 mb-1">
            <AlertTriangle className="h-5 w-5" />
            <AlertDialogTitle className="text-base font-bold text-foreground">
              Alterações Não Salvas
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Você possui modificações em andamento no tutorial{" "}
            {articleId && (
              <span className="font-mono font-bold text-foreground">{articleId}</span>
            )}{" "}
            que ainda não foram publicadas. Se {isNavigatingAway ? "sair desta tela" : "trocar de rotina"} agora, todas as suas edições serão descartadas permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel onClick={onCancel} className="text-xs">
            Continuar Editando
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirmDiscard}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-semibold"
          >
            Descartar Alterações e Sair
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
