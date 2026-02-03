import { useState } from "react";
import { useTeams } from "@/hooks/useTeams";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, Pencil } from "lucide-react";

import { Team } from "@/types/admin";

export default function TeamConfiguration() {
  const { teams, isLoading, createTeam, updateTeam, deleteTeam } = useTeams();
  const { logAction } = useAuditLogs();

  const [isOpen, setIsOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState({
    label: "",
    value: "",
    description: "",
  });

  const resetForm = () => {
    setFormData({ label: "", value: "", description: "" });
    setEditingTeam(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingTeam) {
      updateTeam.mutate(
        { ...formData, id: editingTeam.id },
        {
          onSuccess: () => {
            logAction.mutate({
              action: "TEAM_UPDATED",
              details: { team: formData.label },
            });
            setIsOpen(false);
            resetForm();
          },
        },
      );
    } else {
      createTeam.mutate(formData, {
        onSuccess: () => {
          logAction.mutate({
            action: "TEAM_CREATED",
            details: { team: formData.label },
          });
          setIsOpen(false);
          resetForm();
        },
      });
    }
  };

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      label: team.label,
      value: team.value,
      description: team.description || "",
    });
    setIsOpen(true);
  };

  const handleDelete = (id: string, label: string) => {
    if (confirm(`Tem certeza que deseja excluir o time "${label}"?`)) {
      deleteTeam.mutate(id, {
        onSuccess: () => {
          logAction.mutate({
            action: "TEAM_DELETED",
            details: { team: label },
          });
        },
      });
    }
  };

  const generateValue = (label: string) => {
    // Simple helper to auto-generate value from label
    if (!editingTeam && !formData.value) {
      const val = label
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/[^a-z0-9]/g, "-"); // replace non-alphanum with hyphen
      setFormData((prev) => ({ ...prev, value: val }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Equipes</h2>
          <p className="text-muted-foreground">
            Gerencie as equipes disponíveis para atribuição de usuários.
          </p>
        </div>
        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Equipe
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTeam ? "Editar Equipe" : "Nova Equipe"}
              </DialogTitle>
              <DialogDescription>
                Configure o identificador e o nome de exibição da equipe.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="label">Nome da Equipe</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => {
                    setFormData({ ...formData, label: e.target.value });
                  }}
                  onBlur={() => generateValue(formData.label)}
                  placeholder="Ex: Recursos Humanos"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">Identificador (Slug)</Label>
                <Input
                  id="value"
                  value={formData.value}
                  onChange={(e) =>
                    setFormData({ ...formData, value: e.target.value })
                  }
                  placeholder="Ex: rh"
                  required
                  disabled={!!editingTeam} // Prevent changing ID/Value on edit to avoid breaking relations? Actually value is unique key, maybe allow but warn. For now disable for simplicity.
                />
                <p className="text-xs text-muted-foreground">
                  O identificador é usado internamente e não deve conter espaços
                  ou caracteres especiais.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Descrição opcional..."
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit">
                  {editingTeam ? "Salvar" : "Criar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Identificador</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : teams?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4">
                  Nenhuma equipe cadastrada.
                </TableCell>
              </TableRow>
            ) : (
              teams?.map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="font-medium">{team.label}</TableCell>
                  <TableCell>
                    <code className="bg-muted px-1 py-0.5 rounded text-xs">
                      {team.value}
                    </code>
                  </TableCell>
                  <TableCell>{team.description}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(team)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDelete(team.id, team.label)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
