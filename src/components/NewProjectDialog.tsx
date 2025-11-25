import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { toast } from "sonner";

export const NewProjectDialog = () => {
  const [open, setOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");
  const [systemType, setSystemType] = useState<string>("");
  const [projectLeader, setProjectLeader] = useState("Bruno Fernandes");

  const { createProject } = useProjects();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName || !ticketNumber || !systemType) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    createProject.mutate(
      {
        clientName,
        ticketNumber,
        systemType,
        projectLeader,
      },
      {
        onSuccess: () => {
          toast.success("Projeto criado com sucesso!");
          setOpen(false);
          setClientName("");
          setTicketNumber("");
          setSystemType("");
          setProjectLeader("Bruno Fernandes");
        },
        onError: (error: any) => {
          toast.error("Erro ao criar projeto: " + error.message);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          Cadastrar Novo Projeto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Projeto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="clientName">
              Nome do Cliente <span className="text-critical">*</span>
            </Label>
            <Input
              id="clientName"
              placeholder="Ex: Cartório de Mogi-Mirim"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticketNumber">
              Número do Ticket SAC <span className="text-critical">*</span>
            </Label>
            <Input
              id="ticketNumber"
              placeholder="Ex: 696613"
              value={ticketNumber}
              onChange={(e) => setTicketNumber(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="systemType">
              Sistema <span className="text-critical">*</span>
            </Label>
            <Input
              id="systemType"
              placeholder="Ex: Orion PRO, Orion TN, Orion REG"
              value={systemType}
              onChange={(e) => setSystemType(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectLeader">Líder do Projeto</Label>
            <Input
              id="projectLeader"
              placeholder="Nome do responsável"
              value={projectLeader}
              onChange={(e) => setProjectLeader(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? "Criando..." : "Criar Projeto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
