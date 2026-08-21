import { FormEvent, useEffect, useMemo, useState } from "react";
import { Building2, Loader2, Search, UserRound, UsersRound } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PosChatVisitorDialogProps {
  open: boolean;
  projectName: string;
  visitors: PosChatVisitor[];
  currentVisitor: PosChatVisitor | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error?: string | null;
  onOpenChange: (open: boolean) => void;
  onSelectVisitor: (visitor: PosChatVisitor) => Promise<boolean>;
  onRegisterVisitor: (name: string, sector: string) => Promise<boolean>;
  onRetry?: () => void;
}

export function PosChatVisitorDialog({
  open,
  projectName,
  visitors,
  currentVisitor,
  isLoading,
  isSubmitting,
  error,
  onOpenChange,
  onSelectVisitor,
  onRegisterVisitor,
  onRetry,
}: PosChatVisitorDialogProps) {
  const [activeTab, setActiveTab] = useState("returning");
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const identificationRequired = !currentVisitor;

  useEffect(() => {
    if (!open) return;
    setActiveTab(visitors.length > 0 ? "returning" : "new");
    setSearch("");
  }, [open, visitors.length]);

  const filteredVisitors = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return visitors;
    return visitors.filter(
      (visitor) =>
        visitor.name.toLocaleLowerCase("pt-BR").includes(term) ||
        visitor.sector.toLocaleLowerCase("pt-BR").includes(term)
    );
  }, [search, visitors]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && identificationRequired) return;
    onOpenChange(nextOpen);
  };

  const handleSelect = async (visitor: PosChatVisitor) => {
    const success = await onSelectVisitor(visitor);
    if (success) onOpenChange(false);
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
            Carregando usuários...
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
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid h-10 w-full grid-cols-2">
              <TabsTrigger value="returning" disabled={visitors.length === 0} className="gap-1.5">
                <UsersRound className="h-3.5 w-3.5" />
                Já usei antes
              </TabsTrigger>
              <TabsTrigger value="new" className="gap-1.5">
                <UserRound className="h-3.5 w-3.5" />
                Primeira vez
              </TabsTrigger>
            </TabsList>

            <TabsContent value="returning" className="space-y-3 pt-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-9 pl-9 text-xs"
                  placeholder="Buscar por nome ou setor..."
                  aria-label="Buscar usuário"
                />
              </div>

              <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                {filteredVisitors.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    Nenhum usuário encontrado.
                  </p>
                ) : (
                  filteredVisitors.map((visitor) => (
                    <button
                      key={visitor.id}
                      type="button"
                      onClick={() => void handleSelect(visitor)}
                      disabled={isSubmitting}
                      className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-2.5 text-left transition-colors hover:border-rose-300 hover:bg-rose-50/50 disabled:opacity-60 dark:hover:border-rose-900 dark:hover:bg-rose-950/20"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserRound className="h-4 w-4" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold">{visitor.name}</span>
                        <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          {visitor.sector}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="new" className="pt-1">
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
            </TabsContent>
          </Tabs>
        )}

        <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
          Sua identificação fica vinculada apenas ao histórico deste cartório.
        </p>
      </DialogContent>
    </Dialog>
  );
}
