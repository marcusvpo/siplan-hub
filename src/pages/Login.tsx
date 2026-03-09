import { useState } from "react";
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

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log("Supabase login response:", { data, error });

      if (error) throw error;

      if (data.session) {
        console.log("Session found, navigating...");
        // Check role if trying to login as admin
        if (isAdminLogin) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: profile } = await (supabase as any)
            .from("profiles")
            .select("role")
            .eq("id", data.session.user.id)
            .single();

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((profile as any)?.role !== "admin") {
            await supabase.auth.signOut();
            throw new Error(
              "Acesso negado. Esta área é restrita para administradores.",
            );
          }
          navigate("/admin");
        } else {
          navigate("/");
        }
      }
    } catch (error: unknown) {
      console.error("Login error:", error);
      let errorMessage = "Verifique suas credenciais e tente novamente.";

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      // Check for Supabase specific error structure safely
      if (typeof error === "object" && error !== null && "status" in error) {
        if ((error as { status: number }).status === 400) {
          errorMessage = "Email ou senha inválidos.";
        }
      }

      toast({
        variant: "destructive",
        title: "Erro ao entrar",
        description: errorMessage,
      });
    } finally {
      console.log("Login finally block reached. Setting loading to false.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Dynamic background element for premium feel */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary),0.05),transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary),0.1),transparent_70%)] pointer-events-none" />

      <Button
        variant="ghost"
        size="sm"
        className="absolute top-4 right-4 text-muted-foreground hover:text-primary z-10"
        onClick={() => setIsAdminLogin(!isAdminLogin)}
      >
        {isAdminLogin ? "Voltar para Login de Usuário" : "Admin"}
      </Button>

      <Card className="w-full max-w-md border border-border/50 shadow-2xl bg-card/80 backdrop-blur-xl dark:bg-card/90 relative z-10 transition-all duration-500">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-white p-4 rounded-xl shadow-xl border border-border/50 relative flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
              <img
                src="/assets/Siplan_logo.png"
                alt="Siplan"
                className="h-12 w-auto object-contain"
              />
              {isAdminLogin && (
                <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">
                  ADMIN
                </div>
              )}
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            {isAdminLogin ? "Área Administrativa" : "Bem-vindo de volta"}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {isAdminLogin
              ? "Entre com suas credenciais de administrador para gerenciar a plataforma."
              : "Insira suas credenciais para acessar sua conta."}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground/80">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-foreground/80">Senha</Label>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-[0.98]" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
