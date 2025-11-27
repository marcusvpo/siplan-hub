import { ProjectV2 } from "@/types/ProjectV2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ContractDataGroupProps {
  project: ProjectV2;
  onUpdate: (field: keyof ProjectV2, value: unknown) => void;
}

export const ContractDataGroup = ({ project, onUpdate }: ContractDataGroupProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados do Contrato / Negócio</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Valor do Contrato</Label>
            <Input 
              type="number"
              value={project.contractValue || ""} 
              onChange={(e) => onUpdate("contractValue", parseFloat(e.target.value))}
              placeholder="R$ 0,00"
            />
          </div>

          <div className="space-y-2">
            <Label>Forma de Pagamento</Label>
            <Select 
              value={project.paymentMethod} 
              onValueChange={(value) => onUpdate("paymentMethod", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">À Vista</SelectItem>
                <SelectItem value="installments">Parcelado</SelectItem>
                <SelectItem value="subscription">Assinatura</SelectItem>
                <SelectItem value="other">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Descrição do Projeto</Label>
          <Textarea 
            value={project.description || ""} 
            onChange={(e) => onUpdate("description", e.target.value)}
            className="min-h-[100px]"
            placeholder="Escopo, objetivos e detalhes principais..."
          />
        </div>

        <div className="space-y-2">
          <Label>Restrições / Considerações Especiais</Label>
          <Textarea 
            value={project.specialConsiderations || ""} 
            onChange={(e) => onUpdate("specialConsiderations", e.target.value)}
            className="min-h-[80px]"
            placeholder="Compatibilidades, ambiente, limitações..."
          />
        </div>
      </CardContent>
    </Card>
  );
};
