import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
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
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectV2 } from "@/types/ProjectV2";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const [products, setProducts] = useState<string[]>([]);
  const [productsOpen, setProductsOpen] = useState(false);

  // Constants
  const MAIN_SYSTEMS = ["Orion TN", "Orion PRO", "Orion REG"];
  const AVAILABLE_PRODUCTS = [
    "LCW",
    "SGA",
    "On Hand",
    "Orion GED",
    "Library",
    "e-Recepção",
    "e-Qualificação",
    "Cartflow",
  ];

  const { createProject } = useProjectsV2();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName || !ticketNumber || !systemType || !projectLeader) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    createProject.mutate(
      {
        clientName,
        ticketNumber,
        systemType,
        products, // Including products
        projectLeader,
        // lastUpdatedBy is now set automatically by useProjectsV2
        opNumber: opNumber ? parseInt(opNumber) : undefined,
        salesOrderNumber: salesOrderNumber
          ? parseInt(salesOrderNumber)
          : undefined,
        soldHours: soldHours ? parseFloat(soldHours) : undefined,
        legacySystem: legacySystem || undefined,
        specialty: specialty || undefined,
      } as Partial<ProjectV2>,
      {
        onSuccess: () => {
          toast.success("Projeto criado com sucesso!");
          setOpen(false);
          // Reset form
          setClientName("");
          setTicketNumber("");
          setSystemType("");
          setProducts([]);
          setProjectLeader("Bruno Fernandes");
          setOpNumber("");
          setSalesOrderNumber("");
          setSoldHours("");
          setLegacySystem("");
          setSpecialty("");
        },
        onError: (error: Error) => {
          toast.error("Erro ao criar projeto: " + error.message);
        },
      },
    );
  };

  const toggleProduct = (product: string) => {
    setProducts((current) =>
      current.includes(product)
        ? current.filter((p) => p !== product)
        : [...current, product],
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
          <DialogDescription>
            Preencha os dados abaixo para cadastrar um novo projeto de
            implantação.
          </DialogDescription>
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
                    Número do Ticket SAC{" "}
                    <span className="text-destructive">*</span>
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
                    Sistema Principal{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select value={systemType} onValueChange={setSystemType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o sistema principal" />
                    </SelectTrigger>
                    <SelectContent>
                      {MAIN_SYSTEMS.map((sys) => (
                        <SelectItem key={sys} value={sys}>
                          {sys}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Produtos Adicionais</Label>
                  <Popover open={productsOpen} onOpenChange={setProductsOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={productsOpen}
                        className="w-full justify-between h-auto min-h-10 py-2 text-left font-normal"
                      >
                        {products.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {products.map((product) => (
                              <Badge
                                key={product}
                                variant="secondary"
                                className="mr-1"
                              >
                                {product}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            Selecione os produtos...
                          </span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar produto..." />
                        <CommandList>
                          <CommandEmpty>
                            Nenhum produto encontrado.
                          </CommandEmpty>
                          <CommandGroup>
                            {AVAILABLE_PRODUCTS.map((product) => (
                              <CommandItem
                                key={product}
                                value={product}
                                onSelect={() => toggleProduct(product)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    products.includes(product)
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                {product}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
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
                      <SelectItem value="registro_civil">
                        Registro Civil
                      </SelectItem>
                      <SelectItem value="registro_imoveis">
                        Registro de Imóveis
                      </SelectItem>
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
