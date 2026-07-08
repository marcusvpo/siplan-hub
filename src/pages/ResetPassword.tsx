import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme } = useTheme();

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const logoSrc = isDark
    ? "/assets/Siplan_logo_branco.png"
    : "/assets/Siplan_logo.png";

  // The recovery link puts a token in the URL hash; supabase-js processes it
  // and emits PASSWORD_RECOVERY. We also check for an existing session in case
  // the event fired before this component mounted.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== passwordConfirm) {
      toast({
        variant: "destructive",
        title: "As senhas não coincidem",
        description: "Confirme a nova senha corretamente.",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({
        title: "Senha redefinida",
        description: "Sua senha foi alterada. Faça login com a nova senha.",
      });
      await supabase.auth.signOut();
      navigate("/login");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Não foi possível redefinir a senha.";
      toast({
        variant: "destructive",
        title: "Erro ao redefinir senha",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border border-border/50 shadow-2xl bg-card/80 backdrop-blur-xl dark:bg-card/90">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-white dark:bg-accent/20 p-4 rounded-xl shadow-xl border border-border/50 flex items-center justify-center">
              <img
                src={logoSrc}
                alt="Siplan"
                className="h-12 w-auto object-contain"
              />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            Redefinir senha
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {ready
              ? "Escolha uma nova senha para sua conta."
              : "Validando o link de recuperação..."}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground/80">
                Nova senha
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading || !ready}
                autoComplete="new-password"
                className="bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-confirm" className="text-foreground/80">
                Confirmar nova senha
              </Label>
              <Input
                id="password-confirm"
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                minLength={6}
                disabled={loading || !ready}
                autoComplete="new-password"
                className="bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button
              className="w-full font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-[0.98]"
              type="submit"
              disabled={loading || !ready}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Redefinir senha"
              )}
            </Button>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Voltar para o login
            </button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
