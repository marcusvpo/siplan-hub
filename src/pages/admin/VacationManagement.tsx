import { useState } from "react";
import { useVacations, Vacation, VacationInput } from "@/hooks/useVacations";
import { CALENDAR_MEMBERS } from "@/types/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  format,
  parseISO,
  isAfter,
  isBefore,
  isWithinInterval,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Palmtree,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function VacationManagement() {
  const { vacations, isLoading, addVacation, updateVacation, deleteVacation } =
    useVacations();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingVacation, setEditingVacation] = useState<Vacation | null>(null);
  const [vacationToDelete, setVacationToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState<VacationInput>({
    implantador_name: "",
    implantador_id: null,
    start_date: "",
    end_date: "",
    description: "",
  });

  const resetForm = () => {
    setFormData({
      implantador_name: "",
      implantador_id: null,
      start_date: "",
      end_date: "",
      description: "",
    });
    setEditingVacation(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (vacation: Vacation) => {
    setEditingVacation(vacation);
    setFormData({
      implantador_name: vacation.implantador_name,
      implantador_id: vacation.implantador_id,
      start_date: vacation.start_date,
      end_date: vacation.end_date,
      description: vacation.description || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingVacation) {
      await updateVacation.mutateAsync({ id: editingVacation.id, ...formData });
    } else {
      await addVacation.mutateAsync(formData);
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleDeleteClick = (id: string) => {
    setVacationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (vacationToDelete) {
      await deleteVacation.mutateAsync(vacationToDelete);
      setDeleteDialogOpen(false);
      setVacationToDelete(null);
    }
  };

  const handleMemberSelect = (memberId: string) => {
    const member = CALENDAR_MEMBERS.find((m) => m.id === memberId);
    if (member) {
      setFormData((prev) => ({
        ...prev,
        implantador_name: member.name,
        implantador_id: member.id,
      }));
    }
  };

  const getVacationStatus = (vacation: Vacation) => {
    const today = new Date();
    const start = parseISO(vacation.start_date);
    const end = parseISO(vacation.end_date);

    if (isWithinInterval(today, { start, end })) {
      return {
        label: "Em andamento",
        variant: "default" as const,
        className: "bg-red-500",
      };
    }
    if (isBefore(today, start)) {
      return {
        label: "Agendada",
        variant: "secondary" as const,
        className: "",
      };
    }
    return { label: "Concluída", variant: "outline" as const, className: "" };
  };

  const getMemberColor = (implantadorId: string | null) => {
    if (!implantadorId) return "bg-gray-500";
    const member = CALENDAR_MEMBERS.find((m) => m.id === implantadorId);
    return member?.color || "bg-gray-500";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Palmtree className="h-8 w-8 text-red-500" />
            Gestão de Férias
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os períodos de férias dos implantadores
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-red-600 hover:bg-red-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Cadastrar Férias
        </Button>
      </div>

      {/* Alert Info */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="flex items-start gap-3 pt-4">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Informação importante</p>
            <p>
              Quando uma data de férias é cadastrada, a plataforma irá bloquear
              agendamentos para o implantador durante esse período no
              calendário.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Vacations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Férias Cadastradas
          </CardTitle>
          <CardDescription>
            {vacations.length} {vacations.length === 1 ? "período" : "períodos"}{" "}
            de férias cadastrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {vacations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Palmtree className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum período de férias cadastrado</p>
              <p className="text-sm">
                Clique em "Cadastrar Férias" para adicionar
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Implantador</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vacations.map((vacation) => {
                  const status = getVacationStatus(vacation);
                  return (
                    <TableRow key={vacation.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "h-3 w-3 rounded-full",
                              getMemberColor(vacation.implantador_id),
                            )}
                          />
                          <span className="font-medium">
                            {vacation.implantador_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <span>
                            {format(
                              parseISO(vacation.start_date),
                              "dd/MM/yyyy",
                              { locale: ptBR },
                            )}
                          </span>
                          <span className="text-muted-foreground">até</span>
                          <span>
                            {format(parseISO(vacation.end_date), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {vacation.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={status.variant}
                          className={status.className}
                        >
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(vacation)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteClick(vacation.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingVacation ? "Editar Férias" : "Cadastrar Férias"}
            </DialogTitle>
            <DialogDescription>
              {editingVacation
                ? "Altere os dados do período de férias"
                : "Cadastre um novo período de férias para um implantador"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="implantador">Implantador</Label>
              <Select
                value={formData.implantador_id || ""}
                onValueChange={handleMemberSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o implantador" />
                </SelectTrigger>
                <SelectContent>
                  {CALENDAR_MEMBERS.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "h-2.5 w-2.5 rounded-full",
                            member.color,
                          )}
                        />
                        {member.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Data Início</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      start_date: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Data Fim</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      end_date: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Observações (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Ex: Férias de verão, licença médica..."
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-red-600 hover:bg-red-700"
                disabled={
                  !formData.implantador_name ||
                  !formData.start_date ||
                  !formData.end_date
                }
              >
                {editingVacation ? "Salvar Alterações" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este período de férias? Esta ação
              não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
