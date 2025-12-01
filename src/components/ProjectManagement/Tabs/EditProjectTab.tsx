import { ProjectV2 } from "@/types/ProjectV2";
import { useAutoSave } from "@/hooks/useAutoSave";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface TabProps {
  project: ProjectV2;
  onUpdate: (project: ProjectV2) => void;
}

export function EditProjectTab({ project, onUpdate }: TabProps) {
  const { data, handleChange, saveState } = useAutoSave(
    project,
    async (newData) => {
      onUpdate(newData);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Feedback Visual do Autosave */}
      <div className="fixed bottom-4 right-4 z-50">
        {saveState.status === "saving" && (
          <Badge variant="secondary" className="animate-pulse">
            Salvando...
          </Badge>
        )}
        {saveState.status === "success" && (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            {saveState.message}
          </Badge>
        )}
        {saveState.status === "error" && (
          <Badge variant="destructive">{saveState.message}</Badge>
        )}
      </div>

      {/* Grupo A: Informações Básicas (Todos os campos do cadastro + Status Global) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome do Cliente</Label>
            <Input
              value={data.clientName}
              onChange={(e) => handleChange("clientName", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Nº Ticket SAC</Label>
            <Input
              value={data.ticketNumber}
              onChange={(e) => handleChange("ticketNumber", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Sistema</Label>
            <Input
              value={data.systemType}
              onChange={(e) => handleChange("systemType", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Líder do Projeto</Label>
            <AutocompleteInput
              value={data.projectLeader}
              onChange={(value) => handleChange("projectLeader", value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Resp. Implantação</Label>
            <AutocompleteInput
              value={data.responsibleImplementation}
              onChange={(value) =>
                handleChange("responsibleImplementation", value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label>N° OP</Label>
            <Input
              type="number"
              value={data.opNumber || ""}
              onChange={(e) =>
                handleChange(
                  "opNumber",
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label>N° Pedido de Venda</Label>
            <Input
              type="number"
              value={data.salesOrderNumber || ""}
              onChange={(e) =>
                handleChange(
                  "salesOrderNumber",
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Horas Vendidas</Label>
            <Input
              type="number"
              step="0.5"
              value={data.soldHours || ""}
              onChange={(e) =>
                handleChange(
                  "soldHours",
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Sistema Legado</Label>
            <Input
              value={data.legacySystem || ""}
              onChange={(e) => handleChange("legacySystem", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Especialidade</Label>
            <Select
              value={data.specialty || ""}
              onValueChange={(value) => handleChange("specialty", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="protesto">Protesto</SelectItem>
                <SelectItem value="notas">Notas</SelectItem>
                <SelectItem value="registro_civil">Registro Civil</SelectItem>
                <SelectItem value="registro_imoveis">
                  Registro de Imóveis
                </SelectItem>
                <SelectItem value="tdpj">TDPJ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo de Implantação</Label>
            <Select
              value={data.implantationType}
              onValueChange={(value) => handleChange("implantationType", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Nova Implantação</SelectItem>
                <SelectItem value="migration_siplan">
                  Migração Siplan
                </SelectItem>
                <SelectItem value="migration_competitor">
                  Migração Concorrente
                </SelectItem>
                <SelectItem value="upgrade">Upgrade</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status Global</Label>
            <Select
              value={data.globalStatus}
              onValueChange={(value) => handleChange("globalStatus", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">A Fazer</SelectItem>
                <SelectItem value="in-progress">Em Andamento</SelectItem>
                <SelectItem value="done">Concluído</SelectItem>
                <SelectItem value="blocked">Bloqueado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Chamados Relacionados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Chamados Relacionados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.relatedTickets?.map((ticket, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                placeholder="Nome (ex: Bug Fix)"
                value={ticket.name}
                onChange={(e) => {
                  const newTickets = [...(data.relatedTickets || [])];
                  newTickets[index].name = e.target.value;
                  handleChange("relatedTickets", newTickets);
                }}
                className="flex-1"
              />
              <Input
                placeholder="Número (ex: #1234)"
                value={ticket.number}
                onChange={(e) => {
                  const newTickets = [...(data.relatedTickets || [])];
                  newTickets[index].number = e.target.value;
                  handleChange("relatedTickets", newTickets);
                }}
                className="w-32"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const newTickets = [...(data.relatedTickets || [])];
                  newTickets.splice(index, 1);
                  handleChange("relatedTickets", newTickets);
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newTickets = [...(data.relatedTickets || [])];
              newTickets.push({ name: "", number: "" });
              handleChange("relatedTickets", newTickets);
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> Adicionar Chamado
          </Button>
        </CardContent>
      </Card>

      {/* Grupo D: Datas Importantes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Datas Críticas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">
              Planejado
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Início Previsto</Label>
                <Input
                  type="date"
                  value={
                    data.startDatePlanned
                      ? new Date(data.startDatePlanned)
                          .toISOString()
                          .split("T")[0]
                      : ""
                  }
                  onChange={(e) =>
                    handleChange(
                      "startDatePlanned",
                      e.target.value ? new Date(e.target.value) : undefined
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Fim Previsto</Label>
                <Input
                  type="date"
                  value={
                    data.endDatePlanned
                      ? new Date(data.endDatePlanned)
                          .toISOString()
                          .split("T")[0]
                      : ""
                  }
                  onChange={(e) =>
                    handleChange(
                      "endDatePlanned",
                      e.target.value ? new Date(e.target.value) : undefined
                    )
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">
              Realizado
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Início Real</Label>
                <Input
                  type="date"
                  value={
                    data.startDateActual
                      ? new Date(data.startDateActual)
                          .toISOString()
                          .split("T")[0]
                      : ""
                  }
                  onChange={(e) =>
                    handleChange(
                      "startDateActual",
                      e.target.value ? new Date(e.target.value) : undefined
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Fim Real</Label>
                <Input
                  type="date"
                  value={
                    data.endDateActual
                      ? new Date(data.endDateActual).toISOString().split("T")[0]
                      : ""
                  }
                  onChange={(e) =>
                    handleChange(
                      "endDateActual",
                      e.target.value ? new Date(e.target.value) : undefined
                    )
                  }
                />
              </div>
            </div>
          </div>

          <div className="col-span-1 md:col-span-2 pt-4 border-t">
            <div className="flex flex-col space-y-2">
              <Label className="text-red-600 font-semibold">
                Próximo Follow-up
              </Label>
              <Input
                type="date"
                className="border-red-200 focus:border-red-500"
                value={
                  data.nextFollowUpDate
                    ? new Date(data.nextFollowUpDate)
                        .toISOString()
                        .split("T")[0]
                    : ""
                }
                onChange={(e) =>
                  handleChange(
                    "nextFollowUpDate",
                    e.target.value ? new Date(e.target.value) : undefined
                  )
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
