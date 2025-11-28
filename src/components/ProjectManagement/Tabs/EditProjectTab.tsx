import { ProjectV2 } from "@/types/ProjectV2";
import { useAutoSave } from "@/hooks/useAutoSave";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TabProps {
  project: ProjectV2;
  onUpdate: (project: ProjectV2) => void;
}

export function EditProjectTab({ project, onUpdate }: TabProps) {
  const { data, handleChange, saveState } = useAutoSave(project, async (newData) => {
    onUpdate(newData);
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Feedback Visual do Autosave */}
      <div className="fixed bottom-4 right-4 z-50">
        {saveState.status === 'saving' && <Badge variant="secondary" className="animate-pulse">Salvando...</Badge>}
        {saveState.status === 'success' && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{saveState.message}</Badge>}
        {saveState.status === 'error' && <Badge variant="destructive">{saveState.message}</Badge>}
      </div>

      {/* Grupo A: Básicas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome do Cliente</Label>
            <Input 
              value={data.clientName} 
              onChange={(e) => handleChange('clientName', e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label>Nº Ticket SAC</Label>
            <Input 
              value={data.ticketNumber} 
              onChange={(e) => handleChange('ticketNumber', e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label>Sistema</Label>
            <Input 
              value={data.systemType} 
              onChange={(e) => handleChange('systemType', e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo de Implantação</Label>
            <Select 
              value={data.implantationType} 
              onValueChange={(value) => handleChange('implantationType', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Nova Implantação</SelectItem>
                <SelectItem value="migration_siplan">Migração Siplan</SelectItem>
                <SelectItem value="migration_competitor">Migração Concorrente</SelectItem>
                <SelectItem value="upgrade">Upgrade</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Grupo B: Status & Visibilidade */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Status & Visibilidade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Status Global</Label>
              <Select 
                value={data.globalStatus} 
                onValueChange={(value) => handleChange('globalStatus', value)}
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
            <div className="space-y-2">
              <Label>Health Score</Label>
              <Select 
                value={data.healthScore} 
                onValueChange={(value) => handleChange('healthScore', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ok">🟢 OK</SelectItem>
                  <SelectItem value="warning">🟡 Atenção</SelectItem>
                  <SelectItem value="critical">🔴 Crítico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Progresso Geral ({data.overallProgress}%)</Label>
              <Progress value={data.overallProgress} className="h-9" />
            </div>
          </div>
          
          <Separator />
          
          <div className="text-sm text-muted-foreground">
            Última atualização em {format(new Date(data.lastUpdatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} por {data.lastUpdatedBy}
          </div>
        </CardContent>
      </Card>

      {/* Grupo C: Pessoas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Equipe & Responsáveis</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Líder do Projeto</Label>
            <Input 
              value={data.projectLeader} 
              onChange={(e) => handleChange('projectLeader', e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label>Contato Principal (Cliente)</Label>
            <Input 
              value={data.clientPrimaryContact} 
              onChange={(e) => handleChange('clientPrimaryContact', e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label>Resp. Infra</Label>
            <Input 
              value={data.responsibleInfra} 
              onChange={(e) => handleChange('responsibleInfra', e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label>Resp. Aderência</Label>
            <Input 
              value={data.responsibleAdherence} 
              onChange={(e) => handleChange('responsibleAdherence', e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label>Resp. Conversão</Label>
            <Input 
              value={data.responsibleConversion} 
              onChange={(e) => handleChange('responsibleConversion', e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label>Resp. Implantação</Label>
            <Input 
              value={data.responsibleImplementation} 
              onChange={(e) => handleChange('responsibleImplementation', e.target.value)} 
            />
          </div>
        </CardContent>
      </Card>

      {/* Grupo D: Datas Importantes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Datas Críticas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Planejado</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Início Previsto</Label>
                <Input 
                  type="date" 
                  value={data.startDatePlanned ? format(new Date(data.startDatePlanned), 'yyyy-MM-dd') : ''} 
                  onChange={(e) => handleChange('startDatePlanned', e.target.value ? new Date(e.target.value) : undefined)} 
                />
              </div>
              <div className="space-y-2">
                <Label>Fim Previsto</Label>
                <Input 
                  type="date" 
                  value={data.endDatePlanned ? format(new Date(data.endDatePlanned), 'yyyy-MM-dd') : ''} 
                  onChange={(e) => handleChange('endDatePlanned', e.target.value ? new Date(e.target.value) : undefined)} 
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Realizado</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Início Real</Label>
                <Input 
                  type="date" 
                  value={data.startDateActual ? format(new Date(data.startDateActual), 'yyyy-MM-dd') : ''} 
                  onChange={(e) => handleChange('startDateActual', e.target.value ? new Date(e.target.value) : undefined)} 
                />
              </div>
              <div className="space-y-2">
                <Label>Fim Real</Label>
                <Input 
                  type="date" 
                  value={data.endDateActual ? format(new Date(data.endDateActual), 'yyyy-MM-dd') : ''} 
                  onChange={(e) => handleChange('endDateActual', e.target.value ? new Date(e.target.value) : undefined)} 
                />
              </div>
            </div>
          </div>

          <div className="col-span-1 md:col-span-2 pt-4 border-t">
            <div className="flex flex-col space-y-2">
              <Label className="text-red-600 font-semibold">Próximo Follow-up</Label>
              <Input 
                type="date" 
                className="border-red-200 focus:border-red-500"
                value={data.nextFollowUpDate ? format(new Date(data.nextFollowUpDate), 'yyyy-MM-dd') : ''} 
                onChange={(e) => handleChange('nextFollowUpDate', e.target.value ? new Date(e.target.value) : undefined)} 
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
