import { useState, type ReactNode } from "react";
import {
  DecoratorNode,
  type DOMConversionMap,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, Check, Lock, Trash2, User, Hash } from "lucide-react";
import { format } from "date-fns";
import {
  HUB_ANALYSTS,
  HUB_STAGE_MENTIONS,
  useEditorProjectContext,
} from "@/components/editor/editor-project-context";
import { STAGE_COLOR_BY_STATUS } from "@/utils/default-project-observations";
import type { ProjectV2, StageStatus } from "@/types/ProjectV2";

export type MentionKind = "analyst" | "stage";

export type SerializedMentionNode = Spread<
  {
    mentionKind: MentionKind;
    mentionId: string;
    label: string;
    route?: string;
  },
  SerializedLexicalNode
>;

function getStageLiveInfo(
  project: Partial<ProjectV2> | undefined,
  mentionId: string,
): {
  status: StageStatus;
  statusText: string;
  responsible?: string;
  detail?: string;
  stageId: string;
  route?: string;
  routeLabel: string;
} {
  const def = HUB_STAGE_MENTIONS.find((s) => s.id === mentionId);
  const stageId = def?.stageId || mentionId;
  const route = def?.route;
  const routeLabel = def?.routeLabel || "Abrir etapa";

  const statusMap: Record<StageStatus, string> = {
    done: "Concluído",
    "in-progress": "Em Andamento",
    blocked: "Bloqueado",
    waiting_adjustment: "Em Adequação",
    todo: "Não Iniciado",
  };

  if (!project?.stages) {
    return { status: "todo", statusText: "Sem contexto", stageId, route, routeLabel };
  }

  if (mentionId === "infra") {
    const s = project.stages.infra;
    const st = s?.status || "todo";
    return {
      status: st,
      statusText: statusMap[st],
      responsible: s?.responsible || project.responsibleInfra || "Alex Silva / Bruno Fernandes",
      detail: s?.serverStatus ? `Servidor: ${s.serverStatus}` : undefined,
      stageId,
      route,
      routeLabel,
    };
  }

  if (mentionId === "adherence") {
    const s = project.stages.adherence;
    const st = s?.status || "todo";
    return {
      status: st,
      statusText: st === "done" ? "Adequado" : statusMap[st],
      responsible: s?.responsible || project.responsibleAdherence,
      detail: s?.hasProductGap ? `Gap de produto${s.devTicket ? ` (${s.devTicket})` : ""}` : undefined,
      stageId,
      route: project.id ? `/implantadores/aderencia` : route,
      routeLabel,
    };
  }

  if (mentionId === "conversion" || mentionId === "homologation") {
    const s = project.stages.conversion;
    const st = s?.status || "todo";
    return {
      status: st,
      statusText:
        mentionId === "homologation"
          ? s?.homologationStatus || (s?.homologationComplete ? "Aprovada" : "Pendente")
          : statusMap[st],
      responsible:
        mentionId === "homologation"
          ? s?.homologationResponsible || "A escalar"
          : s?.responsible || project.responsibleConversion || "Equipe Conversão",
      detail: project.legacySystem ? `Legado: ${project.legacySystem}` : undefined,
      stageId,
      route,
      routeLabel,
    };
  }

  if (mentionId === "environment") {
    const s = project.stages.environment;
    const st = s?.status || "todo";
    return {
      status: st,
      statusText: statusMap[st],
      responsible: s?.responsible || project.responsibleEnvironment || "Alex Silva / Bruno Fernandes",
      detail: s?.orionAdminConfigured ? "Orion Admin configurado" : undefined,
      stageId,
      route,
      routeLabel,
    };
  }

  if (mentionId === "modelosEditor") {
    const s = project.stages.modelosEditor;
    const st = s?.status || "todo";
    return {
      status: st,
      statusText: statusMap[st],
      responsible: s?.responsible || "Erik Marques / Bruno Fernandes",
      stageId,
      route,
      routeLabel,
    };
  }

  if (mentionId === "implementation") {
    const s = project.stages.implementation;
    const p1 = s?.phase1;
    const st = s?.status || "todo";
    const start = p1?.startDate ? format(new Date(p1.startDate), "dd/MM") : null;
    const end = p1?.endDate ? format(new Date(p1.endDate), "dd/MM") : null;
    return {
      status: p1?.isConfirmed ? "done" : st,
      statusText: p1?.isConfirmed ? "Confirmada" : statusMap[st],
      responsible: p1?.responsible || project.responsibleImplementation,
      detail: start && end ? `Janela Fase 1: ${start} a ${end}` : "Janela a definir",
      stageId,
      route,
      routeLabel,
    };
  }

  const post = project.stages.post;
  const pst = post?.status || "todo";
  return {
    status: pst,
    statusText: statusMap[pst],
    responsible: post?.responsible || project.responsiblePost,
    stageId,
    route,
    routeLabel,
  };
}

function MentionPillComponent({
  nodeKey,
  mentionKind,
  mentionId,
  label,
  route,
}: {
  nodeKey: NodeKey;
  mentionKind: MentionKind;
  mentionId: string;
  label: string;
  route?: string;
}) {
  const [editor] = useLexicalComposerContext();
  const { project, onNavigateToStage } = useEditorProjectContext();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [draftLabel, setDraftLabel] = useState(label);

  const isEditable = editor.isEditable();
  const stageInfo = mentionKind === "stage" ? getStageLiveInfo(project, mentionId) : null;
  const analystInfo =
    mentionKind === "analyst"
      ? HUB_ANALYSTS.find(
          (a) =>
            a.id === mentionId ||
            a.name.toLowerCase() === label.toLowerCase(),
        )
      : null;

  const dotColor = stageInfo ? STAGE_COLOR_BY_STATUS[stageInfo.status] || "#94A3B8" : "#6366F1";

  const handleSaveLabel = () => {
    const trimmed = draftLabel.trim();
    if (!trimmed) {
      handleDelete();
      return;
    }
    editor.update(() => {
      const node = editor.getEditorState()._nodeMap.get(nodeKey);
      if (node instanceof MentionNode) {
        const writable = node.getWritable();
        writable.__label = trimmed;
      }
    });
    setUnlocked(false);
  };

  const handleDelete = () => {
    editor.update(() => {
      const node = editor.getEditorState()._nodeMap.get(nodeKey);
      if (node) node.remove();
    });
    setUnlocked(false);
    setPopoverOpen(false);
  };

  // Modo desbloqueado (somente após dois cliques!)
  if (unlocked && isEditable) {
    return (
      <span
        contentEditable={false}
        className="mx-0.5 inline-flex items-center gap-1 rounded-md border border-dashed border-primary bg-primary/10 px-1.5 py-0.5 align-baseline text-xs font-semibold text-foreground"
      >
        <span className="text-primary">{mentionKind === "analyst" ? "@" : "#"}</span>
        <input
          type="text"
          value={draftLabel}
          autoFocus
          onChange={(e) => setDraftLabel(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") {
              e.preventDefault();
              handleSaveLabel();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setDraftLabel(label);
              setUnlocked(false);
            }
          }}
          className="w-28 bg-transparent text-xs font-semibold outline-none"
        />
        <button
          type="button"
          onClick={handleSaveLabel}
          title="Confirmar edição"
          className="rounded p-0.5 text-emerald-600 hover:bg-emerald-500/15"
        >
          <Check className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          title="Remover menção"
          className="rounded p-0.5 text-destructive hover:bg-destructive/15"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </span>
    );
  }

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <span
          contentEditable={false}
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            setPopoverOpen((o) => !o);
          }}
          onDoubleClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isEditable) {
              setPopoverOpen(false);
              setDraftLabel(label);
              setUnlocked(true);
            }
          }}
          title={
            isEditable
              ? "1 clique: detalhes e navegação • 2 cliques: editar ou apagar"
              : "Clique para ver detalhes"
          }
          className={
            mentionKind === "stage"
              ? "mx-0.5 inline-flex cursor-pointer select-none items-center gap-1 rounded-md border border-border/80 bg-muted/70 px-1.5 py-0.2 align-baseline text-xs font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-accent"
              : "mx-0.5 inline-flex cursor-pointer select-none items-center gap-1 rounded-md border border-indigo-500/30 bg-indigo-500/10 px-1.5 py-0.2 align-baseline text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-500/20 dark:text-indigo-300"
          }
        >
          {mentionKind === "stage" ? (
            <>
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: dotColor }}
              />
              <span>#{label}</span>
            </>
          ) : (
            <span>@{label}</span>
          )}
        </span>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-72 space-y-2.5 p-3 text-xs"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {mentionKind === "stage" && stageInfo ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <Hash className="h-3.5 w-3.5 text-primary" />
                <span>{label}</span>
              </div>
              <Badge
                variant="outline"
                className="h-5 gap-1 px-1.5 text-[10px] font-semibold"
                style={{ borderColor: dotColor, color: dotColor }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: dotColor }}
                />
                {stageInfo.statusText}
              </Badge>
            </div>

            <div className="space-y-1 text-[11px] text-muted-foreground">
              {stageInfo.responsible && (
                <p>
                  <strong className="text-foreground/85">Responsável:</strong>{" "}
                  {stageInfo.responsible}
                </p>
              )}
              {stageInfo.detail && <p>{stageInfo.detail}</p>}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border/70 pt-2">
              <Button
                type="button"
                size="sm"
                className="h-7 gap-1 px-2.5 text-[11px] font-semibold"
                onClick={() => {
                  setPopoverOpen(false);
                  onNavigateToStage?.(stageInfo.stageId, route || stageInfo.route);
                }}
              >
                Ir para
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
              {isEditable && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Lock className="h-3 w-3" />2 cliques p/ editar
                </span>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                <User className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="font-bold text-foreground">@{label}</p>
                <p className="text-[11px] text-muted-foreground">
                  {analystInfo?.role || "Colaborador Siplan HUB"}
                </p>
              </div>
            </div>
            {isEditable && (
              <div className="flex items-center justify-end border-t border-border/70 pt-2 text-[10px] text-muted-foreground">
                <Lock className="mr-1 h-3 w-3" />
                Clique duplo na tag para editar ou remover
              </div>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

export class MentionNode extends DecoratorNode<ReactNode> {
  __mentionKind: MentionKind;
  __mentionId: string;
  __label: string;
  __route?: string;

  static getType(): string {
    return "mention";
  }

  static clone(node: MentionNode): MentionNode {
    return new MentionNode(
      node.__mentionKind,
      node.__mentionId,
      node.__label,
      node.__route,
      node.__key,
    );
  }

  constructor(
    mentionKind: MentionKind,
    mentionId: string,
    label: string,
    route?: string,
    key?: NodeKey,
  ) {
    super(key);
    this.__mentionKind = mentionKind;
    this.__mentionId = mentionId;
    this.__label = label;
    this.__route = route;
  }

  static importJSON(serializedNode: SerializedMentionNode): MentionNode {
    return $createMentionNode(
      serializedNode.mentionKind,
      serializedNode.mentionId,
      serializedNode.label,
      serializedNode.route,
    );
  }

  exportJSON(): SerializedMentionNode {
    return {
      type: "mention",
      version: 1,
      mentionKind: this.__mentionKind,
      mentionId: this.__mentionId,
      label: this.__label,
      ...(this.__route ? { route: this.__route } : {}),
    };
  }

  static importDOM(): DOMConversionMap | null {
    return null;
  }

  exportDOM(): DOMExportOutput {
    const span = document.createElement("span");
    span.textContent =
      this.__mentionKind === "analyst" ? `@${this.__label}` : `#${this.__label}`;
    return { element: span };
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const span = document.createElement("span");
    span.className = "inline align-baseline";
    return span;
  }

  updateDOM(): false {
    return false;
  }

  getTextContent(): string {
    return this.__mentionKind === "analyst" ? `@${this.__label}` : `#${this.__label}`;
  }

  isInline(): true {
    return true;
  }

  // Protege contra remoção acidental com Backspace/Delete simples;
  // remoção ocorre intencionalmente após double-click no pill.
  isKeyboardSelectable(): boolean {
    return false;
  }

  decorate(): ReactNode {
    return (
      <MentionPillComponent
        nodeKey={this.__key}
        mentionKind={this.__mentionKind}
        mentionId={this.__mentionId}
        label={this.__label}
        route={this.__route}
      />
    );
  }
}

export function $createMentionNode(
  mentionKind: MentionKind,
  mentionId: string,
  label: string,
  route?: string,
): MentionNode {
  return new MentionNode(mentionKind, mentionId, label, route);
}

export function $isMentionNode(node: LexicalNode | null | undefined): node is MentionNode {
  return node instanceof MentionNode;
}
