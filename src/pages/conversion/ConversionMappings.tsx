import { useState, useMemo } from "react";
import {
  FolderKanban,
  RefreshCw,
  Search,
  Filter,
  MoreVertical,
  Trash2,
  Plus,
  FileCode,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  useConversionMappings,
  ConversionMapping,
} from "@/hooks/useConversionMappings";

export default function ConversionMappings() {
  const { mappings, stats, loading, addMapping, deleteMapping, refetch } =
    useConversionMappings();

  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  // Add dialog
  const [addDialog, setAddDialog] = useState(false);
  const [newMapping, setNewMapping] = useState({
    projectId: "",
    sourceOrigin: "",
    originTable: "",
    destinationTable: "",
  });

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    mapping?: ConversionMapping;
  }>({ open: false });

  // Get unique projects
  const projects = useMemo(() => {
    const projectMap = new Map<string, string>();
    mappings.forEach((m) => {
      if (m.clientName) {
        projectMap.set(m.projectId, m.clientName);
      }
    });
    return Array.from(projectMap.entries()).map(([id, name]) => ({ id, name }));
  }, [mappings]);

  // Filter mappings
  const filteredMappings = useMemo(() => {
    return mappings.filter((m) => {
      const matchesSearch =
        !searchQuery ||
        m.originTable.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.destinationTable.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.sourceOrigin.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.clientName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesProject =
        projectFilter === "all" || m.projectId === projectFilter;
      return matchesSearch && matchesProject;
    });
  }, [mappings, searchQuery, projectFilter]);

  // Group by project
  const groupedMappings = useMemo(() => {
    const groups: Map<
      string,
      { clientName: string; items: ConversionMapping[] }
    > = new Map();
    filteredMappings.forEach((m) => {
      if (!groups.has(m.projectId)) {
        groups.set(m.projectId, {
          clientName: m.clientName || "Sem cliente",
          items: [],
        });
      }
      groups.get(m.projectId)?.items.push(m);
    });
    return groups;
  }, [filteredMappings]);

  const handleAdd = async () => {
    if (
      !newMapping.projectId ||
      !newMapping.sourceOrigin ||
      !newMapping.originTable ||
      !newMapping.destinationTable
    ) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const success = await addMapping({
      projectId: newMapping.projectId,
      sourceOrigin: newMapping.sourceOrigin,
      originTable: newMapping.originTable,
      destinationTable: newMapping.destinationTable,
    });

    if (success) {
      toast.success("Mapeamento adicionado!");
      setAddDialog(false);
      setNewMapping({
        projectId: "",
        sourceOrigin: "",
        originTable: "",
        destinationTable: "",
      });
    } else {
      toast.error("Erro ao adicionar mapeamento");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.mapping) return;

    const success = await deleteMapping(deleteDialog.mapping.id);

    if (success) {
      toast.success("Mapeamento removido!");
      setDeleteDialog({ open: false });
    } else {
      toast.error("Erro ao remover mapeamento");
    }
  };

  // Stats
  const renderStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <FolderKanban className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-medium text-purple-600">
              Total de Mapeamentos
            </span>
          </div>
          <p className="text-2xl font-bold text-purple-700">{stats.total}</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileCode className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-600">Projetos</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{projects.length}</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <ArrowRight className="h-4 w-4 text-green-600" />
            <span className="text-xs font-medium text-green-600">
              Média/Projeto
            </span>
          </div>
          <p className="text-2xl font-bold text-green-700">
            {projects.length > 0
              ? Math.round(stats.total / projects.length)
              : 0}
          </p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <FolderKanban className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Mapeamentos de Conversão</h1>
            <p className="text-muted-foreground">
              Tabelas origem → destino por projeto
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={refetch} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button
            onClick={() => setAddDialog(true)}
            className="bg-purple-600 hover:bg-purple-700"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Mapeamento
          </Button>
        </div>
      </div>

      {/* Stats */}
      {renderStats()}

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tabela ou origem..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Projeto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os projetos</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mappings grouped by project */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Carregando...
        </div>
      ) : groupedMappings.size === 0 ? (
        <Card className="p-12 text-center">
          <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">
            Nenhum mapeamento encontrado
          </h3>
          <p className="text-muted-foreground">
            Adicione mapeamentos para visualizá-los aqui
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {Array.from(groupedMappings.entries()).map(
            ([projectId, { clientName, items }]) => (
              <Card key={projectId}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileCode className="h-5 w-5 text-purple-600" />
                    {clientName}
                    <Badge variant="secondary" className="ml-2">
                      {items.length} mapeamentos
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {items.map((mapping) => (
                      <div
                        key={mapping.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <Badge
                            variant="outline"
                            className="font-mono text-xs"
                          >
                            {mapping.sourceOrigin}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">
                              {mapping.originTable}
                            </span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono text-sm text-purple-600">
                              {mapping.destinationTable}
                            </span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                setDeleteDialog({ open: true, mapping })
                              }
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ),
          )}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Mapeamento</DialogTitle>
            <DialogDescription>
              Adicione um novo mapeamento de tabela
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Projeto</Label>
              <Select
                value={newMapping.projectId}
                onValueChange={(v) =>
                  setNewMapping({ ...newMapping, projectId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um projeto..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sistema Origem</Label>
              <Input
                value={newMapping.sourceOrigin}
                onChange={(e) =>
                  setNewMapping({ ...newMapping, sourceOrigin: e.target.value })
                }
                placeholder="Ex: SQL Server, MySQL, Access..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tabela Origem</Label>
                <Input
                  value={newMapping.originTable}
                  onChange={(e) =>
                    setNewMapping({
                      ...newMapping,
                      originTable: e.target.value,
                    })
                  }
                  placeholder="Nome da tabela"
                />
              </div>
              <div className="space-y-2">
                <Label>Tabela Destino</Label>
                <Input
                  value={newMapping.destinationTable}
                  onChange={(e) =>
                    setNewMapping({
                      ...newMapping,
                      destinationTable: e.target.value,
                    })
                  }
                  placeholder="Nome da tabela"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAdd}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Mapeamento</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover o mapeamento "
              {deleteDialog.mapping?.originTable} →{" "}
              {deleteDialog.mapping?.destinationTable}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false })}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
