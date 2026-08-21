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
}

export function UnsavedChangesDialog({
  isOpen,
  onConfirmDiscard,
  onCancel,
  articleId,
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="max-w-md bg-background border-border shadow-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-amber-500 mb-1">
            <AlertTriangle className="h-5 w-5" />
            <AlertDialogTitle className="text-base font-bold text-foreground">
              Alterações Não Salvas
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Você possui modificações em andamento no tutorial{" "}
            <span className="font-mono font-bold text-foreground">{articleId}</span> que ainda
            não foram publicadas. Se trocar de artigo agora, essas alterações serão perdidas.
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
            Descartar Alterações
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
