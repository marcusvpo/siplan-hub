import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BriefcaseBusiness,
  CalendarRange,
  Columns2,
  GripVertical,
  LayoutDashboard,
  RectangleHorizontal,
  RotateCcw,
  Settings2,
} from "lucide-react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { MyDayShortcut } from "@/hooks/useMyDay";
import {
  DEFAULT_MY_DAY_PREFERENCES,
  MY_DAY_WIDGETS,
  normalizeMyDayPreferences,
  type MyDayPreferences,
  type MyDayWidgetId,
} from "@/lib/my-day-workspace";
import { cn } from "@/lib/utils";

interface PersonalizeMyDayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: MyDayPreferences;
  availableWidgetIds: MyDayWidgetId[];
  availableShortcuts: MyDayShortcut[];
  defaultQuickLinkPaths: string[];
  isSaving: boolean;
  onSave: (preferences: MyDayPreferences) => Promise<unknown>;
}

const MAX_QUICK_LINKS = 8;

const PRESETS = [
  {
    id: "operational",
    label: "Operacional",
    description: "Prioridades, agenda e projetos",
    icon: LayoutDashboard,
    order: ["priorities", "agenda", "insights", "projects", "conversion", "shortcuts", "copilot"] as MyDayWidgetId[],
    layout: { priorities: "full", agenda: "half", insights: "half", projects: "full" } as Partial<MyDayPreferences["widgetLayout"]>,
  },
  {
    id: "manager",
    label: "Gestão",
    description: "Indicadores e carteira primeiro",
    icon: BriefcaseBusiness,
    order: ["priorities", "insights", "projects", "agenda", "conversion", "copilot", "shortcuts"] as MyDayWidgetId[],
    layout: { priorities: "full", insights: "full", projects: "full", agenda: "half" } as Partial<MyDayPreferences["widgetLayout"]>,
  },
  {
    id: "agenda",
    label: "Foco na agenda",
    description: "Tarefas e próximos passos",
    icon: CalendarRange,
    order: ["agenda", "priorities", "shortcuts", "projects", "insights", "conversion", "copilot"] as MyDayWidgetId[],
    layout: { agenda: "full", priorities: "full", shortcuts: "full" } as Partial<MyDayPreferences["widgetLayout"]>,
  },
] as const;

interface SortableWidgetRowProps {
  widget: (typeof MY_DAY_WIDGETS)[number];
  index: number;
  count: number;
  visible: boolean;
  width: "half" | "full";
  onToggle: (visible: boolean) => void;
  onMove: (direction: -1 | 1) => void;
  onWidth: (width: "half" | "full") => void;
}

function SortableWidgetRow({ widget, index, count, visible, width, onToggle, onMove, onWidth }: SortableWidgetRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("flex min-w-0 flex-col gap-2 rounded-lg border bg-background p-2.5 sm:flex-row sm:items-center", isDragging && "z-10 border-primary shadow-lg")}>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Button type="button" variant="ghost" size="icon" className="hidden h-8 w-8 shrink-0 cursor-grab touch-none sm:inline-flex" title={`Arrastar ${widget.title}`} aria-label={`Arrastar ${widget.title}`} {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </Button>
        <Checkbox id={`widget-${widget.id}`} checked={visible} onCheckedChange={(checked) => onToggle(checked === true)} />
        <label htmlFor={`widget-${widget.id}`} className="min-w-0 flex-1 cursor-pointer">
          <span className="block truncate text-xs font-bold">{widget.title}</span>
          <span className="block truncate text-[10px] text-muted-foreground">{widget.description}</span>
        </label>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={index === 0} title={`Mover ${widget.title} para cima`} onClick={() => onMove(-1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={index === count - 1} title={`Mover ${widget.title} para baixo`} onClick={() => onMove(1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
      </div>
      <div className="grid grid-cols-2 gap-1 pl-6 sm:w-48 sm:shrink-0 sm:pl-0">
        <Button type="button" size="sm" variant={width === "half" ? "secondary" : "outline"} className="h-7 gap-1 px-2 text-[10px]" aria-label={`Usar ${widget.title} em meia largura`} aria-pressed={width === "half"} onClick={() => onWidth("half")}><Columns2 className="h-3 w-3" /> Meia</Button>
        <Button type="button" size="sm" variant={width === "full" ? "secondary" : "outline"} className="h-7 gap-1 px-2 text-[10px]" aria-label={`Usar ${widget.title} em largura inteira`} aria-pressed={width === "full"} onClick={() => onWidth("full")}><RectangleHorizontal className="h-3 w-3" /> Inteira</Button>
      </div>
    </div>
  );
}

export function PersonalizeMyDayDialog({
  open,
  onOpenChange,
  preferences,
  availableWidgetIds,
  availableShortcuts,
  defaultQuickLinkPaths,
  isSaving,
  onSave,
}: PersonalizeMyDayDialogProps) {
  const [draft, setDraft] = useState<MyDayPreferences>(preferences);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (open) setDraft(normalizeMyDayPreferences(preferences));
  }, [open, preferences]);

  const availableWidgetSet = useMemo(() => new Set(availableWidgetIds), [availableWidgetIds]);
  const orderedWidgets = draft.widgetOrder
    .filter((id) => availableWidgetSet.has(id))
    .map((id) => MY_DAY_WIDGETS.find((widget) => widget.id === id))
    .filter(Boolean) as Array<(typeof MY_DAY_WIDGETS)[number]>;
  const selectedQuickLinks = draft.quickLinks ?? defaultQuickLinkPaths;

  const toggleWidget = (widgetId: MyDayWidgetId, visible: boolean) => {
    setDraft((current) => ({
      ...current,
      hiddenWidgets: visible
        ? current.hiddenWidgets.filter((id) => id !== widgetId)
        : [...new Set([...current.hiddenWidgets, widgetId])],
    }));
  };

  const moveWidget = (widgetId: MyDayWidgetId, direction: -1 | 1) => {
    setDraft((current) => {
      const order = [...current.widgetOrder];
      const currentIndex = order.indexOf(widgetId);
      let nextIndex = currentIndex + direction;
      while (
        nextIndex >= 0 &&
        nextIndex < order.length &&
        !availableWidgetSet.has(order[nextIndex])
      ) {
        nextIndex += direction;
      }
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= order.length) return current;
      [order[currentIndex], order[nextIndex]] = [order[nextIndex], order[currentIndex]];
      return { ...current, widgetOrder: order };
    });
  };

  const setWidgetWidth = (widgetId: MyDayWidgetId, width: "half" | "full") => {
    setDraft((current) => ({
      ...current,
      widgetLayout: {
        ...current.widgetLayout,
        [widgetId]: width,
      },
    }));
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setDraft((current) => {
      const oldIndex = current.widgetOrder.indexOf(active.id as MyDayWidgetId);
      const newIndex = current.widgetOrder.indexOf(over.id as MyDayWidgetId);
      if (oldIndex < 0 || newIndex < 0) return current;
      return { ...current, widgetOrder: arrayMove(current.widgetOrder, oldIndex, newIndex) };
    });
  };

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setDraft((current) => normalizeMyDayPreferences({
      ...current,
      widgetOrder: [...preset.order, ...current.widgetOrder],
      widgetLayout: { ...current.widgetLayout, ...preset.layout },
    }));
  };

  const toggleQuickLink = (path: string, selected: boolean) => {
    const currentPaths = draft.quickLinks ?? defaultQuickLinkPaths;
    setDraft((current) => ({
      ...current,
      quickLinks: selected
        ? [...new Set([...currentPaths, path])].slice(0, MAX_QUICK_LINKS)
        : currentPaths.filter((currentPath) => currentPath !== path),
    }));
  };

  const handleSave = async () => {
    try {
      await onSave(normalizeMyDayPreferences(draft));
      onOpenChange(false);
    } catch {
      // A mutation exibe a mensagem de erro e mantém o diálogo aberto.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-4xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Personalizar Meu Dia
          </DialogTitle>
          <DialogDescription>
            Use um modelo ou monte sua própria composição. A prévia mostra como as linhas ficarão no desktop.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="space-y-2" aria-labelledby="my-day-density-title">
            <Label id="my-day-density-title">Densidade da tela</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={draft.density === "compact" ? "secondary" : "outline"}
                className="h-auto justify-start p-3 text-left"
                onClick={() => setDraft((current) => ({ ...current, density: "compact" }))}
              >
                <span>
                  <span className="block text-xs font-bold">Compacta</span>
                  <span className="block text-[10px] font-normal text-muted-foreground">Mais conteúdo na tela</span>
                </span>
              </Button>
              <Button
                type="button"
                variant={draft.density === "comfortable" ? "secondary" : "outline"}
                className="h-auto justify-start p-3 text-left"
                onClick={() => setDraft((current) => ({ ...current, density: "comfortable" }))}
              >
                <span>
                  <span className="block text-xs font-bold">Confortável</span>
                  <span className="block text-[10px] font-normal text-muted-foreground">Mais espaço entre itens</span>
                </span>
              </Button>
            </div>
          </section>

          <section className="space-y-2" aria-labelledby="my-day-presets-title">
            <Label id="my-day-presets-title">Modelos de organização</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {PRESETS.map((preset) => {
                const Icon = preset.icon;
                return (
                  <Button key={preset.id} type="button" variant="outline" className="h-auto min-w-0 justify-start gap-2 p-3 text-left" onClick={() => applyPreset(preset)}>
                    <Icon className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0"><span className="block truncate text-xs font-bold">{preset.label}</span><span className="block truncate text-[9px] font-normal text-muted-foreground">{preset.description}</span></span>
                  </Button>
                );
              })}
            </div>
          </section>

          <section className="space-y-2" aria-labelledby="my-day-widgets-title">
            <div>
              <Label id="my-day-widgets-title">Blocos visíveis, ordem e tamanho</Label>
              <p className="text-[10px] text-muted-foreground">
                Organize as linhas e escolha meia largura ou largura inteira. No celular, os blocos sempre ocupam a tela toda.
              </p>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={orderedWidgets.map((widget) => widget.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1.5">
                  {orderedWidgets.map((widget, index) => (
                    <SortableWidgetRow
                      key={widget.id}
                      widget={widget}
                      index={index}
                      count={orderedWidgets.length}
                      visible={!draft.hiddenWidgets.includes(widget.id)}
                      width={draft.widgetLayout[widget.id]}
                      onToggle={(visible) => toggleWidget(widget.id, visible)}
                      onMove={(direction) => moveWidget(widget.id, direction)}
                      onWidth={(width) => setWidgetWidth(widget.id, width)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </section>

          <section className="space-y-2" aria-labelledby="my-day-preview-title">
            <Label id="my-day-preview-title">Prévia das linhas</Label>
            <div className="grid min-w-0 grid-cols-2 gap-1.5 rounded-lg border bg-muted/20 p-2">
              {orderedWidgets.filter((widget) => !draft.hiddenWidgets.includes(widget.id)).map((widget) => (
                <div key={widget.id} className={cn("min-w-0 rounded-md border bg-background px-2 py-2 text-[9px] font-semibold shadow-sm", draft.widgetLayout[widget.id] === "full" && "col-span-2")}>
                  <span className="block truncate">{widget.title}</span>
                  <span className="font-normal text-muted-foreground">{draft.widgetLayout[widget.id] === "full" ? "linha inteira" : "meia linha"}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2" aria-labelledby="my-day-shortcuts-title">
            <div className="flex items-end justify-between gap-3">
              <div>
                <Label id="my-day-shortcuts-title">Acessos rápidos</Label>
                <p className="text-[10px] text-muted-foreground">Escolha telas que você usa com mais frequência.</p>
              </div>
              <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">
                {selectedQuickLinks.length}/{MAX_QUICK_LINKS}
              </span>
            </div>
            <div className="grid max-h-64 gap-1.5 overflow-y-auto rounded-lg border p-2 sm:grid-cols-2">
              {availableShortcuts.map((shortcut) => {
                const selected = selectedQuickLinks.includes(shortcut.path);
                const Icon = shortcut.icon;
                return (
                  <label
                    key={shortcut.path}
                    className={cn(
                      "flex min-w-0 cursor-pointer items-center gap-2 rounded-md border p-2 transition-colors hover:bg-muted/40",
                      selected && "border-primary/30 bg-primary/[0.04]",
                      !selected && selectedQuickLinks.length >= MAX_QUICK_LINKS && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <Checkbox
                      checked={selected}
                      disabled={!selected && selectedQuickLinks.length >= MAX_QUICK_LINKS}
                      onCheckedChange={(checked) => toggleQuickLink(shortcut.path, checked === true)}
                    />
                    <Icon className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold">{shortcut.label}</span>
                      <span className="block truncate text-[9px] text-muted-foreground">{shortcut.group}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="gap-2"
            onClick={() => setDraft(normalizeMyDayPreferences(DEFAULT_MY_DAY_PREFERENCES))}
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar padrão
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" className="gap-2" disabled={isSaving} onClick={() => void handleSave()}>
              <LayoutDashboard className="h-4 w-4" />
              {isSaving ? "Salvando..." : "Salvar personalização"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
