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
            className="fixed bottom-20 left-4 z-50 w-80 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
          >
            {/* Header */}
            <div className="relative bg-gradient-to-r from-primary/10 via-rose-500/10 to-orange-500/10 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-rose-500 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  {initials || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 dark:text-white truncate text-lg">
                    {userName}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
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
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                    E-mail
                  </span>
                  <span className="text-sm text-slate-700 dark:text-slate-200 truncate block">
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
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                    Equipe
                  </span>
                  <span className="text-sm text-slate-700 dark:text-slate-200 font-medium">
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
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                      Cargo
                    </span>
                    <span className="text-sm text-slate-700 dark:text-slate-200 capitalize">
                      {role === "admin" ? "Administrador" : "Usuário"}
                    </span>
                  </div>
                </div>
              )}

              {/* Admin Toggle Button */}
              {role === "admin" && (
                <button
                  onClick={handleToggleAdmin}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-colors shadow-sm font-medium text-sm border border-transparent"
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
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm font-medium text-sm border border-transparent"
              >
                <KeyRound className="w-4 h-4" />
                Alterar minha senha
              </button>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[10px] text-slate-400 text-center">
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
