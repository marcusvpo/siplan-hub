import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
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
  DropdownMenuSeparator,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  SlidersHorizontal,
  Filter,
  Save,
  Trash2,
  RotateCcw,
  ArrowUpDown,
  Bookmark,
  Play,
  Pause,
  CheckCircle2,
  ArrowUpAZ,
  ArrowDownAZ,
  Clock,
  Calendar,
  X,
  Sparkles,
  Star,
  Folder,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useFilterStore,
  SortOrder,
  HealthFilter,
  StageFilter,
  ViewPreset,
} from "@/stores/filterStore";

interface AdvancedFiltersProps {
  leaders: string[];
  systemTypes: string[];
  onCompare?: () => void;
  selectedCount?: number;
}

export function AdvancedFilters({
  leaders,
  systemTypes,
  onCompare,
  selectedCount = 0,
}: AdvancedFiltersProps) {
  const {
    searchQuery,
    setSearchQuery,
    viewPreset,
    setViewPreset,
    healthScore,
    setHealthScore,
    currentStage,
    setCurrentStage,
    projectLeader,
    setProjectLeader,
    systemType,
    setSystemType,
    sortOrder,
    setSortOrder,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    savedFilters,
    saveFilter,
    loadFilter,
    deleteFilter,
    activeFilterId,
    resetFilters,
    isFilterPanelOpen,
    setFilterPanelOpen,
    applyQuickPreset,
  } = useFilterStore();

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newFilterName, setNewFilterName] = useState("");
  const [newFilterColor, setNewFilterColor] = useState("blue");

  const activeFiltersCount = [
    healthScore !== "all",
    currentStage !== "all",
    projectLeader !== "",
    systemType !== "",
    dateFrom !== "",
    dateTo !== "",
  ].filter(Boolean).length;

  const handleSaveFilter = () => {
    if (newFilterName.trim()) {
      saveFilter(newFilterName.trim(), undefined, newFilterColor);
      setNewFilterName("");
      setSaveDialogOpen(false);
    }
  };

  const sortOptions: {
    value: SortOrder;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      value: "alpha-asc",
      label: "Nome (A-Z)",
      icon: <ArrowUpAZ className="h-4 w-4" />,
    },
    {
      value: "alpha-desc",
      label: "Nome (Z-A)",
      icon: <ArrowDownAZ className="h-4 w-4" />,
    },
    {
      value: "uat-desc",
      label: "Atualização (Recente)",
      icon: <Clock className="h-4 w-4" />,
    },
    {
      value: "uat-asc",
      label: "Atualização (Antigo)",
      icon: <Clock className="h-4 w-4" />,
    },
    {
      value: "created-desc",
      label: "Criação (Recente)",
      icon: <Calendar className="h-4 w-4" />,
    },
    {
      value: "created-asc",
      label: "Criação (Antigo)",
      icon: <Calendar className="h-4 w-4" />,
    },
  ];

  const stageOptions: { value: StageFilter; label: string }[] = [
    { value: "all", label: "Todas as Etapas" },
    { value: "infra", label: "Infraestrutura" },
    { value: "adherence", label: "Aderência" },
    { value: "conversion", label: "Conversão" },
    { value: "environment", label: "Ambiente" },
    { value: "implementation", label: "Implantação" },
    { value: "post", label: "Pós-Implantação" },
  ];

  const filterColors = [
    { value: "blue", class: "bg-blue-500" },
    { value: "green", class: "bg-emerald-500" },
    { value: "purple", class: "bg-purple-500" },
    { value: "orange", class: "bg-orange-500" },
    { value: "pink", class: "bg-pink-500" },
    { value: "cyan", class: "bg-cyan-500" },
  ];

  return (
    <div className="space-y-4">
      {/* Main Controls Row */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        {/* Left: Search + Quick Views */}
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full lg:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar projetos..."
              className="pl-10 h-11 bg-background/50 border-2 focus:border-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* View Preset Tabs */}
          <Tabs
            value={viewPreset}
            onValueChange={(v) => setViewPreset(v as ViewPreset)}
            className="w-full sm:w-auto"
          >
            <TabsList className="h-11 bg-muted/50 p-1">
              <TabsTrigger
                value="active"
                className="gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
              >
                <Play className="h-3.5 w-3.5" />
                Em Andamento
              </TabsTrigger>
              <TabsTrigger
                value="paused"
                className="gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-white"
              >
                <Pause className="h-3.5 w-3.5" />
                Pausados
              </TabsTrigger>
              <TabsTrigger
                value="done"
                className="gap-2 data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Finalizados
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Right: Controls */}
        <div className="flex gap-2 items-center flex-wrap">
          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-11 gap-2">
                <ArrowUpDown className="h-4 w-4" />
                <span className="hidden sm:inline">Ordenar</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {sortOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setSortOrder(option.value)}
                  className="gap-3"
                >
                  {option.icon}
                  <span className="flex-1">{option.label}</span>
                  {sortOrder === option.value && (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Saved Filters Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-11 gap-2">
                <Bookmark className="h-4 w-4" />
                <span className="hidden sm:inline">Salvos</span>
                {savedFilters.length > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {savedFilters.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Star className="h-4 w-4" />
                Filtros Salvos
              </div>
              <DropdownMenuSeparator />
              {savedFilters.length === 0 ? (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  Nenhum filtro salvo
                </div>
              ) : (
                <ScrollArea className="max-h-64">
                  {savedFilters.map((filter) => (
                    <DropdownMenuItem
                      key={filter.id}
                      className={cn(
                        "gap-3 justify-between group cursor-pointer",
                        activeFilterId === filter.id && "bg-primary/10"
                      )}
                    >
                      <div
                        className="flex items-center gap-2 flex-1"
                        onClick={() => loadFilter(filter.id)}
                      >
                        <div
                          className={cn(
                            "h-3 w-3 rounded-full",
                            filter.color === "green"
                              ? "bg-emerald-500"
                              : filter.color === "purple"
                              ? "bg-purple-500"
                              : filter.color === "orange"
                              ? "bg-orange-500"
                              : filter.color === "pink"
                              ? "bg-pink-500"
                              : filter.color === "cyan"
                              ? "bg-cyan-500"
                              : "bg-blue-500"
                          )}
                        />
                        <span className="truncate">{filter.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFilter(filter.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </DropdownMenuItem>
                  ))}
                </ScrollArea>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setSaveDialogOpen(true)}
                className="gap-2 text-primary"
              >
                <Save className="h-4 w-4" />
                Salvar Filtro Atual
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Advanced Filters Button */}
          <Sheet open={isFilterPanelOpen} onOpenChange={setFilterPanelOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="h-11 gap-2 relative">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Filtros</span>
                {activeFiltersCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-primary">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtros Avançados
                </SheetTitle>
                <SheetDescription>
                  Configure os filtros para encontrar projetos específicos
                </SheetDescription>
              </SheetHeader>

              <ScrollArea className="h-[calc(100vh-200px)] pr-4 mt-6">
                <div className="space-y-6">
                  {/* Health Score */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      Saúde do Projeto
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: "all", label: "Todos", color: "bg-slate-500" },
                        {
                          value: "ok",
                          label: "Saudável",
                          color: "bg-emerald-500",
                        },
                        {
                          value: "warning",
                          label: "Atenção",
                          color: "bg-amber-500",
                        },
                        {
                          value: "critical",
                          label: "Crítico",
                          color: "bg-rose-500",
                        },
                      ].map((option) => (
                        <Button
                          key={option.value}
                          variant={
                            healthScore === option.value ? "default" : "outline"
                          }
                          className={cn(
                            "justify-start gap-2",
                            healthScore === option.value &&
                              option.value !== "all" &&
                              (option.value === "ok"
                                ? "bg-emerald-500 hover:bg-emerald-600"
                                : option.value === "warning"
                                ? "bg-amber-500 hover:bg-amber-600"
                                : "bg-rose-500 hover:bg-rose-600")
                          )}
                          onClick={() =>
                            setHealthScore(option.value as HealthFilter)
                          }
                        >
                          <div
                            className={cn(
                              "h-2.5 w-2.5 rounded-full",
                              option.color
                            )}
                          />
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Current Stage */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Folder className="h-4 w-4 text-blue-500" />
                      Etapa Atual
                    </Label>
                    <Select
                      value={currentStage}
                      onValueChange={(v) => setCurrentStage(v as StageFilter)}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Selecione a etapa" />
                      </SelectTrigger>
                      <SelectContent>
                        {stageOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* Project Leader */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Responsável</Label>
                    <Select
                      value={projectLeader || "all"}
                      onValueChange={(v) =>
                        setProjectLeader(v === "all" ? "" : v)
                      }
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Todos os responsáveis" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {leaders.map((leader) => (
                          <SelectItem key={leader} value={leader}>
                            {leader}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* System Type */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">
                      Tipo de Sistema
                    </Label>
                    <Select
                      value={systemType || "all"}
                      onValueChange={(v) => setSystemType(v === "all" ? "" : v)}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Todos os tipos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {systemTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* Date Range */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-violet-500" />
                      Período de Criação
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          De
                        </Label>
                        <Input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          Até
                        </Label>
                        <Input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="h-10"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <SheetFooter className="mt-6 gap-2">
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Limpar
                </Button>
                <Button
                  onClick={() => setSaveDialogOpen(true)}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  Salvar Filtro
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          {/* Compare Button */}
          {selectedCount > 0 && (
            <Button
              onClick={onCompare}
              disabled={selectedCount < 2}
              className="h-11 gap-2"
            >
              Comparar ({selectedCount})
            </Button>
          )}
        </div>
      </div>

      {/* Active Filters Tags */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">Filtros ativos:</span>
          {healthScore !== "all" && (
            <Badge variant="secondary" className="gap-1.5 pr-1">
              Saúde:{" "}
              {healthScore === "ok"
                ? "Saudável"
                : healthScore === "warning"
                ? "Atenção"
                : "Crítico"}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 hover:bg-transparent"
                onClick={() => setHealthScore("all")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {currentStage !== "all" && (
            <Badge variant="secondary" className="gap-1.5 pr-1">
              Etapa: {stageOptions.find((s) => s.value === currentStage)?.label}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 hover:bg-transparent"
                onClick={() => setCurrentStage("all")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {projectLeader && (
            <Badge variant="secondary" className="gap-1.5 pr-1">
              Resp: {projectLeader}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 hover:bg-transparent"
                onClick={() => setProjectLeader("")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {systemType && (
            <Badge variant="secondary" className="gap-1.5 pr-1">
              Sistema: {systemType}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 hover:bg-transparent"
                onClick={() => setSystemType("")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-muted-foreground hover:text-destructive"
            onClick={resetFilters}
          >
            Limpar todos
          </Button>
        </div>
      )}

      {/* Save Filter Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Filtro</DialogTitle>
            <DialogDescription>
              Dê um nome para este conjunto de filtros para uso posterior
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Filtro</Label>
              <Input
                placeholder="Ex: Projetos críticos de implantação"
                value={newFilterName}
                onChange={(e) => setNewFilterName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveFilter()}
              />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2">
                {filterColors.map((color) => (
                  <button
                    key={color.value}
                    className={cn(
                      "h-8 w-8 rounded-full transition-all",
                      color.class,
                      newFilterColor === color.value &&
                        "ring-2 ring-offset-2 ring-primary"
                    )}
                    onClick={() => setNewFilterColor(color.value)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveFilter} disabled={!newFilterName.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
