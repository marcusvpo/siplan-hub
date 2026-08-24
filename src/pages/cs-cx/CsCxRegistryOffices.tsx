import { useMemo, useState } from "react";
import {
  Building2,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CircleOff,
  Database,
  Eye,
  MoreHorizontal,
  PackageCheck,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
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
import { useToast } from "@/hooks/use-toast";
import { useCsCxRecordPermissions } from "@/hooks/useCsCxRecordPermissions";
import {
  type CsCxRegistryOffice,
  useCsCxRegistryOffices,
} from "@/hooks/useCsCxCore";
import { useCsCxRoutineLinks } from "@/hooks/useCsCxRoutines";
import { CsCxMultiSelect } from "@/components/cs-cx/CsCxMultiSelect";

interface OfficeProductForm {
  implementation_date: string;
  responsible_profile_ids: string[];
}

interface OfficeForm {
  id?: string;
  name: string;
  sap_code: string;
  contact_details: string;
  notes: string;
  active: boolean;
  responsible_profile_ids: string[];
  products: Record<string, OfficeProductForm>;
  routine_model_ids: string[];
}

const emptyForm: OfficeForm = {
  name: "",
  sap_code: "",
  contact_details: "",
  notes: "",
  active: true,
  responsible_profile_ids: [],
  products: {},
  routine_model_ids: [],
};

const DEFAULT_PAGE_SIZE = 5;

interface RegistryOfficeFilters {
  search: string;
  status: string;
  responsibleProfileId: string;
  productIds: string[];
  dateFrom: string;
  dateTo: string;
}

export function matchesRegistryOfficeFilters(
  office: CsCxRegistryOffice,
  filters: RegistryOfficeFilters,
) {
  const term = filters.search.trim().toLocaleLowerCase("pt-BR");
  const matchesSearch =
    !term ||
    [
      office.name,
      office.sap_code,
      office.contact_details,
      ...office.responsibles.flatMap((responsible) => [
        responsible.profile?.full_name,
        responsible.profile?.email,
      ]),
    ].some((value) => value?.toLocaleLowerCase("pt-BR").includes(term));
  const matchesStatus =
    filters.status === "all" ||
    (filters.status === "active" ? office.active : !office.active);
  const matchesResponsible =
    filters.responsibleProfileId === "all" ||
    office.responsibles.some(
      (responsible) => responsible.profile_id === filters.responsibleProfileId,
    );
  const matchesProducts =
    filters.productIds.length === 0 ||
    office.products.some((product) =>
      filters.productIds.includes(product.product_id),
    );
  const createdDate = office.created_at?.slice(0, 10) ?? "";
  const matchesPeriod =
    (!filters.dateFrom && !filters.dateTo) ||
    (Boolean(createdDate) &&
      (!filters.dateFrom || createdDate >= filters.dateFrom) &&
      (!filters.dateTo || createdDate <= filters.dateTo));
  return (
    matchesSearch &&
    matchesStatus &&
    matchesResponsible &&
    matchesProducts &&
    matchesPeriod
  );
}

export default function CsCxRegistryOffices() {
  const {
    offices,
    products,
    profiles,
    isLoading,
    error,
    refetch,
    saveOffice,
    deleteOffice,
  } = useCsCxRegistryOffices();
  const {
    models: routineModels,
    routines: officeRoutines,
    applyRoutine,
    deleteRoutine,
  } = useCsCxRoutineLinks();
  const { canCreate, canEditRecord, canDeleteRecord } =
    useCsCxRecordPermissions("cs_cx_cartorios");
  const {
    canCreate: canCreateRoutine,
    canDeleteRecord: canDeleteRoutineRecord,
  } = useCsCxRecordPermissions("cs_cx_rotinas");
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [responsibleFilter, setResponsibleFilter] = useState("all");
  const [productFilters, setProductFilters] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [form, setForm] = useState<OfficeForm>(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<CsCxRegistryOffice | null>(null);
  const [viewing, setViewing] = useState<CsCxRegistryOffice | null>(null);
  const formOfficeRoutines = useMemo(
    () =>
      form.id
        ? officeRoutines.filter(
            (routine) => routine.registry_office_id === form.id,
          )
        : [],
    [form.id, officeRoutines],
  );
  const canManageRoutineLinks =
    canCreateRoutine ||
    formOfficeRoutines.some((routine) =>
      canDeleteRoutineRecord(routine.applied_by),
    );

  const responsibleOptions = useMemo(() => {
    const assignedProfileIds = new Set(
      offices.flatMap((office) =>
        office.responsibles.map((responsible) => responsible.profile_id),
      ),
    );
    return profiles
      .filter((profile) => assignedProfileIds.has(profile.id))
      .sort((left, right) =>
        (left.full_name || left.email || "").localeCompare(
          right.full_name || right.email || "",
          "pt-BR",
        ),
      );
  }, [offices, profiles]);

  const filtered = useMemo(() => {
    const filters: RegistryOfficeFilters = {
      search,
      status,
      responsibleProfileId: responsibleFilter,
      productIds: productFilters,
      dateFrom,
      dateTo,
    };
    return offices.filter((office) =>
      matchesRegistryOfficeFilters(office, filters),
    );
  }, [
    dateFrom,
    dateTo,
    offices,
    productFilters,
    responsibleFilter,
    search,
    status,
  ]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedOffices = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize],
  );

  const updateSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };
  const updateStatus = (value: string) => {
    setStatus(value);
    setPage(1);
  };
  const updateResponsibleFilter = (value: string) => {
    setResponsibleFilter(value);
    setPage(1);
  };
  const updateProductFilters = (values: string[]) => {
    setProductFilters(values);
    setPage(1);
  };
  const updateDateFrom = (value: string) => {
    setDateFrom(value);
    setPage(1);
  };
  const updateDateTo = (value: string) => {
    setDateTo(value);
    setPage(1);
  };
  const updatePageSize = (value: string) => {
    setPageSize(Number(value));
    setPage(1);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (office: CsCxRegistryOffice) => {
    setForm({
      id: office.id,
      name: office.name,
      sap_code: office.sap_code ?? "",
      contact_details: office.contact_details ?? "",
      notes: office.notes ?? "",
      active: office.active,
      responsible_profile_ids: office.responsibles.map(
        (responsible) => responsible.profile_id,
      ),
      products: Object.fromEntries(
        office.products.map((item) => [
          item.product_id,
          {
            implementation_date: item.implementation_date ?? "",
            responsible_profile_ids: item.responsibles.map(
              (responsible) => responsible.profile_id,
            ),
          },
        ]),
      ),
      routine_model_ids: officeRoutines
        .filter((routine) => routine.registry_office_id === office.id)
        .map((routine) => routine.routine_model_id),
    });
    setDialogOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    let officeWasSaved = false;
    try {
      const { routine_model_ids, ...officeForm } = form;
      const savedOfficeId = await saveOffice.mutateAsync({
        ...officeForm,
        products: Object.entries(form.products).map(
          ([product_id, product]) => ({
            product_id,
            implementation_date: product.implementation_date || null,
            responsible_profile_ids: product.responsible_profile_ids,
          }),
        ),
      });
      officeWasSaved = true;

      const registryOfficeId = savedOfficeId || form.id;
      if (!registryOfficeId) {
        throw new Error("O cartório foi salvo, mas o identificador não foi retornado.");
      }

      const existingRoutines = officeRoutines.filter(
        (routine) => routine.registry_office_id === registryOfficeId,
      );
      const existingModelIds = new Set(
        existingRoutines.map((routine) => routine.routine_model_id),
      );
      const selectedModelIds = new Set(routine_model_ids);
      const routinesToApply = canCreateRoutine
        ? routine_model_ids.filter((modelId) => !existingModelIds.has(modelId))
        : [];
      const routinesToDelete = existingRoutines.filter(
        (routine) =>
          !selectedModelIds.has(routine.routine_model_id) &&
          canDeleteRoutineRecord(routine.applied_by),
      );

      await Promise.all([
        ...routinesToApply.map((routineModelId) =>
          applyRoutine.mutateAsync({ registryOfficeId, routineModelId }),
        ),
        ...routinesToDelete.map((routine) =>
          deleteRoutine.mutateAsync(routine.id),
        ),
      ]);
      setDialogOpen(false);
      toast({
        title: "Cartório salvo",
        description:
          routinesToApply.length || routinesToDelete.length
            ? "Cadastro, produtos e checklists de rotinas atualizados com sucesso."
            : "Cadastro e produtos atualizados com sucesso.",
      });
    } catch (mutationError) {
      toast({
        title: officeWasSaved
          ? "Cartório salvo, mas as rotinas não foram atualizadas"
          : "Não foi possível salvar",
        description: errorMessage(mutationError),
        variant: "destructive",
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteOffice.mutateAsync(deleting.id);
      toast({ title: "Cartório excluído" });
      setDeleting(null);
    } catch (mutationError) {
      toast({
        title: "Não foi possível excluir",
        description:
          "Verifique se o cartório possui solicitações ou outros vínculos.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto max-w-[1600px] space-y-4 px-4 py-4 lg:px-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
            <Building2 className="h-4 w-4" />
          </span>
          <div>
            <h1 className="text-2xl font-black leading-none tracking-tight">
              Cartórios
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Cadastros, situação e produtos implantados
            </p>
          </div>
        </div>
        {canCreate && (
          <Button size="sm" onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Novo cartório
          </Button>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Metric label="Total" value={filtered.length} icon={Building2} />
        <Metric
          label="Ativos"
          value={filtered.filter((office) => office.active).length}
          icon={PackageCheck}
        />
        <Metric
          label="Inativos"
          value={filtered.filter((office) => !office.active).length}
          icon={CircleOff}
        />
      </div>

      <Card>
        <CardContent className="space-y-3 p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => updateSearch(event.target.value)}
                placeholder="Buscar por nome, SAP ou contato..."
                className="h-9 pl-9"
              />
            </div>
            <Select value={status} onValueChange={updateStatus}>
              <SelectTrigger className="h-9 sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 md:grid-cols-[180px_minmax(200px,1fr)_minmax(310px,auto)]">
            <Select
              value={responsibleFilter}
              onValueChange={updateResponsibleFilter}
            >
              <SelectTrigger
                aria-label="Filtrar cartórios por responsável"
                className="h-9"
              >
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os responsáveis</SelectItem>
                {responsibleOptions.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.full_name || profile.email || "Usuário"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="[&_button]:h-9">
              <CsCxMultiSelect
                ariaLabel="Filtrar cartórios por produtos"
                options={products.map((product) => ({
                  value: product.id,
                  label: product.name,
                }))}
                values={productFilters}
                onChange={updateProductFilters}
                placeholder="Todos os produtos"
                searchPlaceholder="Buscar produto..."
                emptyText="Nenhum produto encontrado."
              />
            </div>
            <div
              className="flex h-9 min-w-0 items-center gap-1 rounded-md border bg-background px-2"
              title="Período de cadastro"
            >
              <CalendarClock
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-muted-foreground"
              />
              <span className="sr-only">Período de cadastro</span>
              <Input
                aria-label="Cadastro inicial do cartório"
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(event) => updateDateFrom(event.target.value)}
                className="h-7 min-w-0 flex-1 border-0 px-1 text-xs shadow-none focus-visible:ring-0"
              />
              <span className="shrink-0 text-[11px] text-muted-foreground">
                até
              </span>
              <Input
                aria-label="Cadastro final do cartório"
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) => updateDateTo(event.target.value)}
                className="h-7 min-w-0 flex-1 border-0 px-1 text-xs shadow-none focus-visible:ring-0"
              />
              {(dateFrom || dateTo) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  aria-label="Limpar período de cadastro"
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                    setPage(1);
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {isLoading ? (
            <LoadingRows />
          ) : error ? (
            <DataError error={error} onRetry={() => void refetch()} />
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-9 px-3 text-xs">
                        Cartório
                      </TableHead>
                      <TableHead className="h-9 px-3 text-xs">
                        Responsáveis
                      </TableHead>
                      <TableHead className="h-9 px-3 text-xs">
                        Código SAP
                      </TableHead>
                      <TableHead className="h-9 px-3 text-xs">
                        Produtos
                      </TableHead>
                      <TableHead className="h-9 px-3 text-xs">Status</TableHead>
                      <TableHead className="h-9 w-24 px-2" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedOffices.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-24 text-center text-muted-foreground"
                        >
                          Nenhum cartório encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pagedOffices.map((office) => (
                        <TableRow key={office.id}>
                          <TableCell className="px-3 py-2">
                            <div className="font-medium">{office.name}</div>
                            <div className="max-w-sm truncate text-[11px] leading-4 text-muted-foreground">
                              {office.contact_details ||
                                "Contato não informado"}
                            </div>
                          </TableCell>
                          <TableCell className="px-3 py-2">
                            <ResponsibleBadges office={office} />
                          </TableCell>
                          <TableCell className="px-3 py-2">
                            {office.sap_code || "—"}
                          </TableCell>
                          <TableCell className="px-3 py-2">
                            <ProductBadges office={office} />
                          </TableCell>
                          <TableCell className="px-3 py-2">
                            <Badge
                              variant={office.active ? "default" : "outline"}
                              className="h-5 text-[10px]"
                            >
                              {office.active ? "Ativo" : "Inativo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-2 py-1">
                            <div className="flex justify-end">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                aria-label={`Visualizar ${office.name}`}
                                onClick={() => setViewing(office)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {(canEditRecord(
                                office.created_by,
                                office.responsibles.map((item) => item.profile_id),
                              ) ||
                                canDeleteRecord(
                                  office.created_by,
                                  office.responsibles.map((item) => item.profile_id),
                                )) && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                      <span className="sr-only">Ações</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {canEditRecord(
                                      office.created_by,
                                      office.responsibles.map((item) => item.profile_id),
                                    ) && (
                                      <DropdownMenuItem
                                        onClick={() => openEdit(office)}
                                      >
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Editar
                                      </DropdownMenuItem>
                                    )}
                                    {canDeleteRecord(
                                      office.created_by,
                                      office.responsibles.map((item) => item.profile_id),
                                    ) && (
                                      <DropdownMenuItem
                                        onClick={() => setDeleting(office)}
                                        className="text-destructive"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Excluir
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <OfficePaginationBar
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={filtered.length}
                totalPages={totalPages}
                onPageChange={setPage}
                onPageSizeChange={updatePageSize}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {form.id ? "Editar cartório" : "Novo cartório"}
            </DialogTitle>
            <DialogDescription>
              Os campos seguem o cadastro do SistemaRegistro.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome *">
                <Input
                  aria-label="Nome do cartório"
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                />
              </Field>
              <Field label="Código SAP">
                <Input
                  value={form.sap_code}
                  onChange={(event) =>
                    setForm({ ...form, sap_code: event.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="Responsáveis pelo cartório">
              <CsCxMultiSelect
                ariaLabel="Responsáveis pelo cartório"
                options={profiles.map((profile) => ({
                  value: profile.id,
                  label: profile.full_name || profile.email || "Usuário",
                }))}
                values={form.responsible_profile_ids}
                onChange={(responsible_profile_ids) =>
                  setForm((current) => ({
                    ...current,
                    responsible_profile_ids,
                  }))
                }
                placeholder="Selecione um ou mais responsáveis"
                searchPlaceholder="Buscar responsável..."
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Todos os selecionados poderão visualizar os dados deste cartório,
                conforme as permissões do módulo.
              </p>
            </Field>
            <Field label="Contatos">
              <Input
                placeholder="Telefones, celulares ou e-mails"
                value={form.contact_details}
                onChange={(event) =>
                  setForm({ ...form, contact_details: event.target.value })
                }
              />
            </Field>
            <Field label="Observações">
              <Textarea
                value={form.notes}
                onChange={(event) =>
                  setForm({ ...form, notes: event.target.value })
                }
              />
            </Field>
            <div className="space-y-3 rounded-lg border p-4">
              <div>
                <Label>Produtos implantados e responsáveis</Label>
                <p className="text-xs text-muted-foreground">
                  Selecione o produto, informe a data e vincule um ou mais
                  responsáveis.
                </p>
              </div>
              {products.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum produto ativo carregado.
                </p>
              ) : (
                products.map((product) => {
                  const checked = Object.prototype.hasOwnProperty.call(
                    form.products,
                    product.id,
                  );
                  return (
                    <div
                      key={product.id}
                      className="grid items-center gap-3 rounded-md bg-muted/30 p-2 lg:grid-cols-[minmax(140px,0.7fr)_170px_minmax(220px,1fr)]"
                    >
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) =>
                            setForm((current) => {
                              const selected = { ...current.products };
                              if (value)
                                selected[product.id] = selected[product.id] ?? {
                                  implementation_date: "",
                                  responsible_profile_ids: [],
                                };
                              else delete selected[product.id];
                              return { ...current, products: selected };
                            })
                          }
                        />
                        {product.name}
                      </label>
                      <Input
                        aria-label={`Data de implantação de ${product.name}`}
                        type="date"
                        disabled={!checked}
                        value={
                          form.products[product.id]?.implementation_date ?? ""
                        }
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            products: {
                              ...current.products,
                              [product.id]: {
                                ...current.products[product.id],
                                implementation_date: event.target.value,
                              },
                            },
                          }))
                        }
                      />
                      <CsCxMultiSelect
                        ariaLabel={`Responsáveis por ${product.name}`}
                        options={profiles.map((profile) => ({
                          value: profile.id,
                          label:
                            profile.full_name || profile.email || "Usuário",
                        }))}
                        values={
                          form.products[product.id]?.responsible_profile_ids ??
                          []
                        }
                        onChange={(responsible_profile_ids) =>
                          setForm((current) => ({
                            ...current,
                            products: {
                              ...current.products,
                              [product.id]: {
                                ...current.products[product.id],
                                responsible_profile_ids,
                              },
                            },
                          }))
                        }
                        placeholder="Responsáveis pelo produto"
                        searchPlaceholder="Buscar responsável..."
                        disabled={!checked}
                      />
                    </div>
                  );
                })
              )}
            </div>
            <div className="space-y-2 rounded-lg border p-4">
              <div>
                <Label>Checklists de rotinas</Label>
                <p className="text-xs text-muted-foreground">
                  Vincule um ou mais modelos de rotina a este cartório. A busca
                  aceita o nome do checklist.
                </p>
              </div>
              <CsCxMultiSelect
                ariaLabel="Checklists de rotinas do cartório"
                options={routineModels
                  .filter(
                    (model) =>
                      model.active || form.routine_model_ids.includes(model.id),
                  )
                  .map((model) => ({
                    value: model.id,
                    label: model.name,
                  }))}
                values={form.routine_model_ids}
                onChange={(requestedModelIds) => {
                  const existingByModel = new Map(
                    formOfficeRoutines.map((routine) => [
                      routine.routine_model_id,
                      routine,
                    ]),
                  );
                  const protectedModelIds = formOfficeRoutines
                    .filter(
                      (routine) =>
                        !canDeleteRoutineRecord(routine.applied_by),
                    )
                    .map((routine) => routine.routine_model_id);
                  const allowedModelIds = canCreateRoutine
                    ? requestedModelIds
                    : requestedModelIds.filter((modelId) =>
                        existingByModel.has(modelId),
                      );

                  setForm((current) => ({
                    ...current,
                    routine_model_ids: [
                      ...new Set([
                        ...allowedModelIds,
                        ...protectedModelIds,
                      ]),
                    ],
                  }));
                }}
                placeholder="Selecione um ou mais checklists"
                searchPlaceholder="Buscar checklist de rotina..."
                disabled={!canManageRoutineLinks}
              />
              {!canManageRoutineLinks && (
                <p className="text-xs text-muted-foreground">
                  Você não possui permissão para alterar vínculos de rotinas.
                </p>
              )}
            </div>
            <label className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <span className="text-sm font-medium">Cartório ativo</span>
                <p className="text-xs text-muted-foreground">
                  Inativos permanecem no histórico.
                </p>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={(active) => setForm({ ...form, active })}
              />
            </label>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saveOffice.isPending}>
                {saveOffice.isPending ? "Salvando..." : "Salvar cartório"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!viewing}
        onOpenChange={(open) => !open && setViewing(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cadastro do cartório</DialogTitle>
            <DialogDescription>
              Visualização completa, sem alteração dos dados.
            </DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
                <ReadOnlyField label="Cartório" value={viewing.name} />
                <ReadOnlyField
                  label="Responsáveis"
                  value={responsibleNames(viewing).join(", ") || "Não informados"}
                />
                <ReadOnlyField
                  label="Código SAP"
                  value={viewing.sap_code || "Não informado"}
                />
                <ReadOnlyField
                  label="Status"
                  value={viewing.active ? "Ativo" : "Inativo"}
                />
                <ReadOnlyField
                  label="Origem"
                  value={
                    viewing.origin === "legacy"
                      ? "Sistema legado"
                      : "Siplan HUB"
                  }
                />
                <div className="sm:col-span-2">
                  <ReadOnlyField
                    label="Contatos"
                    value={viewing.contact_details || "Não informados"}
                  />
                </div>
                <div className="sm:col-span-2">
                  <ReadOnlyField
                    label="Observações"
                    value={viewing.notes || "Não informadas"}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Produtos e responsáveis</Label>
                {viewing.products.length ? (
                  viewing.products.map((product) => (
                    <div key={product.id} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">
                          {product.product?.name ?? "Produto"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Implantação:{" "}
                          {product.implementation_date
                            ? formatDate(product.implementation_date)
                            : "não informada"}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {product.responsibles.length ? (
                          product.responsibles.map((responsible) => (
                            <Badge key={responsible.id} variant="secondary">
                              {responsible.profile?.full_name ||
                                responsible.profile?.email ||
                                "Usuário removido"}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Nenhum responsável vinculado.
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                    Nenhum produto implantado.
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setViewing(null)}
            >
              Fechar
            </Button>
            {viewing &&
              canEditRecord(
                viewing.created_by,
                viewing.responsibles.map((item) => item.profile_id),
              ) && (
              <Button
                type="button"
                onClick={() => {
                  const office = viewing;
                  setViewing(null);
                  openEdit(office);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Editar cadastro
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              O banco impedirá a exclusão se houver solicitações ou outros
              vínculos. Dados importados podem reaparecer na próxima
              sincronização enquanto o legado for a fonte oficial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDelete()}
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

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Building2;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between px-3 py-2.5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="text-xl font-bold leading-6">{value}</p>
        </div>
        <Icon className="h-4 w-4 text-rose-500" />
      </CardContent>
    </Card>
  );
}

function ProductBadges({ office }: { office: CsCxRegistryOffice }) {
  if (!office.products.length)
    return <span className="text-xs text-muted-foreground">Nenhum</span>;
  const visible = office.products.slice(0, 3);
  return (
    <div className="flex max-w-md flex-wrap gap-1">
      {visible.map((item) => (
        <Badge
          key={item.id}
          variant="secondary"
          className="h-5 max-w-36 truncate px-1.5 text-[10px] font-normal"
          title={item.product?.name}
        >
          {item.product?.name ?? "Produto"}
        </Badge>
      ))}
      {office.products.length > visible.length && (
        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
          +{office.products.length - visible.length}
        </Badge>
      )}
    </div>
  );
}

function responsibleNames(office: CsCxRegistryOffice) {
  return office.responsibles.map(
    (responsible) =>
      responsible.profile?.full_name ||
      responsible.profile?.email ||
      "Usuário removido",
  );
}

function ResponsibleBadges({ office }: { office: CsCxRegistryOffice }) {
  const names = responsibleNames(office);
  if (!names.length) {
    return <span className="text-xs text-muted-foreground">Não informado</span>;
  }
  const visible = names.slice(0, 2);
  return (
    <div className="flex max-w-xs flex-wrap gap-1" title={names.join(", ")}>
      {visible.map((name, index) => (
        <Badge
          key={`${name}-${index}`}
          variant="outline"
          className="h-5 max-w-36 truncate px-1.5 text-[10px] font-normal"
        >
          {name}
        </Badge>
      ))}
      {names.length > visible.length && (
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
          +{names.length - visible.length}
        </Badge>
      )}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 whitespace-pre-wrap text-sm">{value}</p>
    </div>
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

function OfficePaginationBar({
  currentPage,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: string) => void;
}) {
  const firstItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-2 border-t pt-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span
        aria-label={`Mostrando ${firstItem} a ${lastItem} de ${totalItems} cartórios`}
      >
        Mostrando{" "}
        <strong className="font-semibold text-foreground">
          {firstItem}–{lastItem}
        </strong>{" "}
        de{" "}
        <strong className="font-semibold text-foreground">{totalItems}</strong>
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <span>Por página</span>
        <Select value={String(pageSize)} onValueChange={onPageSizeChange}>
          <SelectTrigger
            aria-label="Cartórios por página"
            className="h-8 w-[72px]"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
        <span className="min-w-[92px] text-center">
          Página {currentPage} de {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label="Página anterior"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label="Próxima página"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map((item) => (
        <Skeleton key={item} className="h-14 w-full" />
      ))}
    </div>
  );
}

function DataError({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center">
      <Database className="h-8 w-8 text-muted-foreground" />
      <div>
        <p className="font-medium">Base CS/CX ainda não disponível</p>
        <p className="max-w-lg text-sm text-muted-foreground">
          Aplique as migrations desta branch antes de usar a tela.{" "}
          {errorMessage(error)}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Tentar novamente
      </Button>
    </div>
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Erro inesperado.";
}
