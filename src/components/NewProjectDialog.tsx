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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const NewProjectDialog = () => {
  const [open, setOpen] = useState(false);
  
  // Dados do Projeto
  const [clientName, setClientName] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");
  const [systemType, setSystemType] = useState<string>("");
  const [projectLeader, setProjectLeader] = useState("Bruno Fernandes");
  const [opNumber, setOpNumber] = useState("");
  const [salesOrderNumber, setSalesOrderNumber] = useState("");
  const [soldHours, setSoldHours] = useState("");
  const [legacySystem, setLegacySystem] = useState("");
  const [specialty, setSpecialty] = useState<string>("");

  const { createProject } = useProjectsV2();

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
        opNumber: opNumber ? parseInt(opNumber) : undefined,
        salesOrderNumber: salesOrderNumber ? parseInt(salesOrderNumber) : undefined,
        soldHours: soldHours ? parseFloat(soldHours) : undefined,
        legacySystem: legacySystem || undefined,
        specialty: specialty || undefined,
      } as any,
      {
        onSuccess: () => {
          toast.success("Projeto criado com sucesso!");
          setOpen(false);
          // Reset form
          setClientName("");
          setTicketNumber("");
          setSystemType("");
          setProjectLeader("Bruno Fernandes");
          setOpNumber("");
          setSalesOrderNumber("");
          setSoldHours("");
          setLegacySystem("");
          setSpecialty("");
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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Projeto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <Tabs defaultValue="dados" className="w-full">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="dados">Dados do Projeto</TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">
                    Nome do Cliente <span className="text-destructive">*</span>
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
                    Número do Ticket SAC <span className="text-destructive">*</span>
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
                    Sistema <span className="text-destructive">*</span>
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
                  <Label htmlFor="projectLeader">
                    Líder do Projeto <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="projectLeader"
                    placeholder="Nome do responsável"
                    value={projectLeader}
                    onChange={(e) => setProjectLeader(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="opNumber">N° OP</Label>
                  <Input
                    id="opNumber"
                    type="number"
                    placeholder="Ex: 12345"
                    value={opNumber}
                    onChange={(e) => setOpNumber(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salesOrderNumber">N° Pedido de Venda</Label>
                  <Input
                    id="salesOrderNumber"
                    type="number"
                    placeholder="Ex: 98765"
                    value={salesOrderNumber}
                    onChange={(e) => setSalesOrderNumber(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="soldHours">Horas Vendidas</Label>
                  <Input
                    id="soldHours"
                    type="number"
                    step="0.5"
                    placeholder="Ex: 40"
                    value={soldHours}
                    onChange={(e) => setSoldHours(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="legacySystem">Sistema Legado</Label>
                  <Input
                    id="legacySystem"
                    placeholder="Ex: Sistema Antigo"
                    value={legacySystem}
                    onChange={(e) => setLegacySystem(e.target.value)}
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="specialty">Especialidade</Label>
                  <Select value={specialty} onValueChange={setSpecialty}>
                    <SelectTrigger id="specialty">
                      <SelectValue placeholder="Selecione a especialidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="protesto">Protesto</SelectItem>
                      <SelectItem value="notas">Notas</SelectItem>
                      <SelectItem value="registro_civil">Registro Civil</SelectItem>
                      <SelectItem value="registro_imoveis">Registro de Imóveis</SelectItem>
                      <SelectItem value="tdpj">TDPJ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-4 border-t">
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
