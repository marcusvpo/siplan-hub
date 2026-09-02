import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  Mail,
  Users,
  Shield,
  LayoutDashboard,
  KeyRound,
  Loader2,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UserProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfileDrawer({ isOpen, onClose }: UserProfileDrawerProps) {
  const { user, team, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== passwordConfirm) {
      toast({
        variant: "destructive",
        title: "As senhas não coincidem",
        description: "Confirme a nova senha corretamente.",
      });
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({
        title: "Senha alterada",
        description: "Sua senha foi atualizada com sucesso.",
      });
      setPassword("");
      setPasswordConfirm("");
      setPasswordDialogOpen(false);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Não foi possível alterar a senha.";
      toast({
        variant: "destructive",
        title: "Erro ao alterar senha",
        description: errorMessage,
      });
    } finally {
      setSavingPassword(false);
    }
  };

  // Get user name from metadata
  const userName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuário";
  const userEmail = user?.email || "—";

  // Team labels mapping
  const teamLabels: Record<string, string> = {
    conversion: "Conversão",
    implementation: "Implantação",
    implementer: "Implantador",
    commercial: "Comercial",
    sd: "Service Desk",
    management: "Gestão",
    infra: "Infraestrutura",
  };

  // Get initials for avatar
  const initials = userName
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isAdminRoute = location.pathname.startsWith("/admin");

  const handleToggleAdmin = () => {
    onClose();
    if (isAdminRoute) {
      navigate("/");
    } else {
      navigate("/admin");
    }
  };

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 30,
            }}
            className="fixed bottom-[max(5rem,calc(env(safe-area-inset-bottom)+4rem))] left-3 right-3 z-50 w-auto max-w-80 overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl sm:left-4 sm:right-auto sm:w-80"
          >
            {/* Header */}
            <div className="relative border-b border-border bg-gradient-to-r from-primary/10 via-rose-500/10 to-orange-500/10 px-5 py-4">
              <button
                onClick={onClose}
                className="absolute right-3 top-3 rounded-full p-1.5 transition-colors hover:bg-muted"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-rose-500 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  {initials || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="truncate text-lg font-bold text-foreground">
                    {userName}
                  </h3>
                  <p className="truncate text-xs text-muted-foreground">
                    Conectado
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {/* Email */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    E-mail
                  </span>
                  <span className="block truncate text-sm text-foreground">
                    {userEmail}
                  </span>
                </div>
              </div>

              {/* Team */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Equipe
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {team ? teamLabels[team] || team : "Não definida"}
                  </span>
                </div>
              </div>

              {/* Role */}
              {role && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Cargo
                    </span>
                    <span className="text-sm capitalize text-foreground">
                      {role === "admin" ? "Administrador" : "Usuário"}
                    </span>
                  </div>
                </div>
              )}

              {/* Admin Toggle Button */}
              {role === "admin" && (
                <button
                  onClick={handleToggleAdmin}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-transparent bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-sm transition-colors hover:bg-foreground/90"
                >
                  {isAdminRoute ? (
                    <>
                      <LayoutDashboard className="w-4 h-4" />
                      Acessar Sistema
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Painel de Administração
                    </>
                  )}
                </button>
              )}

              {/* Change Password Button */}
              <button
                onClick={() => setPasswordDialogOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
              >
                <KeyRound className="w-4 h-4" />
                Alterar minha senha
              </button>
            </div>

            {/* Footer */}
            <div className="border-t border-border bg-muted/40 px-5 py-3">
              <p className="text-center text-[10px] text-muted-foreground">
                Você está autenticado no sistema
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar minha senha</DialogTitle>
            <DialogDescription>
              Escolha uma nova senha para sua conta.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={savingPassword}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password-confirm">Confirmar nova senha</Label>
              <Input
                id="new-password-confirm"
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                minLength={6}
                disabled={savingPassword}
                autoComplete="new-password"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPasswordDialogOpen(false)}
                disabled={savingPassword}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={savingPassword}>
                {savingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar senha"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
