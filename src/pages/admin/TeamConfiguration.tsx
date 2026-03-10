import { useState, useMemo, useEffect } from "react";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, Pencil, Search, ChevronLeft, ChevronRight, FilterX } from "lucide-react";

import { Team } from "@/types/admin";

const ITEMS_PER_PAGE = 6;

export default function TeamConfiguration() {
  const { teams, isLoading, createTeam, updateTeam, deleteTeam } = useTeams();
  const { logAction } = useAuditLogs();

  const [isOpen, setIsOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState({
    label: "",
    value: "",
    description: "",
  });

  // Filtering Logic
  const filteredTeams = useMemo(() => {
    if (!teams) return [];
    return teams.filter(team => {
      const searchLower = searchTerm.toLowerCase();
      return (
        team.label?.toLowerCase().includes(searchLower) ||
        team.value?.toLowerCase().includes(searchLower) ||
        team.description?.toLowerCase().includes(searchLower)
      );
    });
  }, [teams, searchTerm]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredTeams.length / ITEMS_PER_PAGE);
  const paginatedTeams = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTeams.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredTeams, currentPage]);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar equipes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Dialog
            open={isOpen}
            onOpenChange={(open) => {
              setIsOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm">
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
                    disabled={!!editingTeam}
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
                <DialogFooter>
                  <Button type="submit">
                    {editingTeam ? "Salvar" : "Criar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-3">
        <div className="border rounded-md bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Identificador</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right px-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : paginatedTeams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <FilterX className="h-8 w-8 opacity-20" />
                      <p>Nenhuma equipe encontrada.</p>
                      {searchTerm && (
                        <Button variant="link" size="sm" onClick={() => setSearchTerm("")}>
                          Limpar busca
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTeams.map((team) => (
                  <TableRow key={team.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">{team.label}</TableCell>
                    <TableCell>
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-muted-foreground">
                        {team.value}
                      </code>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{team.description}</TableCell>
                    <TableCell className="text-right px-6">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(team)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
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

        {/* Pagination Controls */}
        {!isLoading && filteredTeams.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between px-2 py-2 bg-card border rounded-md">
            <p className="text-xs text-muted-foreground">
              Mostrando <strong>{paginatedTeams.length}</strong> de <strong>{filteredTeams.length}</strong> equipes
            </p>
            <div className="flex items-center gap-4">
              <p className="text-xs text-muted-foreground">
                Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
