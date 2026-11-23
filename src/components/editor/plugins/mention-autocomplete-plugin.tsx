import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_HIGH,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
} from "lexical";
import { Hash, User } from "lucide-react";
import {
  HUB_ANALYSTS,
  HUB_STAGE_MENTIONS,
  useEditorProjectContext,
} from "@/components/editor/editor-project-context";
import { $createMentionNode, type MentionKind } from "@/components/editor/nodes/mention-node";
import { STAGE_COLOR_BY_STATUS } from "@/utils/default-project-observations";
import { cn } from "@/lib/utils";

interface MentionMenuState {
  kind: MentionKind;
  query: string;
  triggerOffset: number;
  rect: { top: number; left: number };
}

interface MenuItem {
  id: string;
  label: string;
  subtitle: string;
  route?: string;
  dotColor?: string;
}

export function MentionAutocompletePlugin() {
  const [editor] = useLexicalComposerContext();
  const { project } = useEditorProjectContext();
  const [menu, setMenu] = useState<MentionMenuState | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const isOrionTN =
    project?.systemType === "Orion TN" ||
    project?.systemType === "Modelos TN" ||
    project?.products?.includes("Orion TN") ||
    project?.products?.includes("OrionTN");

  const items = useMemo<MenuItem[]>(() => {
    if (!menu) return [];
    const q = menu.query.toLowerCase();

    if (menu.kind === "analyst") {
      return HUB_ANALYSTS.filter(
        (a) =>
          !q ||
          a.name.toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q),
      )
        .slice(0, 8)
        .map((a) => ({
          id: a.id,
          label: a.name,
          subtitle: a.role,
        }));
    }

    return HUB_STAGE_MENTIONS.filter((s) => !s.orionTnOnly || isOrionTN)
      .filter(
        (s) =>
          !q ||
          s.label.toLowerCase().includes(q) ||
          s.routeLabel.toLowerCase().includes(q),
      )
      .map((s) => {
        const stageObj = project?.stages?.[s.stageId as keyof NonNullable<typeof project.stages>];
        const status = (stageObj as { status?: keyof typeof STAGE_COLOR_BY_STATUS } | undefined)?.status || "todo";
        return {
          id: s.id,
          label: s.label,
          subtitle: s.routeLabel,
          route: s.route,
          dotColor: STAGE_COLOR_BY_STATUS[status] || "#94A3B8",
        };
      });
  }, [menu, isOrionTN, project]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [menu?.kind, menu?.query]);

  const insertSelected = useCallback(
    (item: MenuItem) => {
      if (!menu) return;
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) return;
        const anchorNode = selection.anchor.getNode();
        if (!$isTextNode(anchorNode)) return;

        const text = anchorNode.getTextContent();
        const cursor = selection.anchor.offset;
        const start = menu.triggerOffset;
        if (start < 0 || start >= cursor) return;

        const before = text.slice(0, start);
        const after = text.slice(cursor);

        const mentionNode = $createMentionNode(menu.kind, item.id, item.label, item.route);
        const spaceAfter = $createTextNode(after.startsWith(" ") ? after : ` ${after}`);

        if (before.length > 0) {
          anchorNode.setTextContent(before);
          anchorNode.insertAfter(mentionNode);
          mentionNode.insertAfter(spaceAfter);
        } else {
          anchorNode.replace(mentionNode);
          mentionNode.insertAfter(spaceAfter);
        }

        spaceAfter.select(1, 1);
      });
      setMenu(null);
    },
    [editor, menu],
  );

  // Detecta digitação de @ ou # na seleção atual
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          setMenu(null);
          return;
        }
        const anchorNode = selection.anchor.getNode();
        if (!$isTextNode(anchorNode)) {
          setMenu(null);
          return;
        }

        const textBefore = anchorNode.getTextContent().slice(0, selection.anchor.offset);
        const match = textBefore.match(/(?:^|\s)([@#])([^\s@#]{0,24})$/);
        if (!match) {
          setMenu(null);
          return;
        }

        const symbol = match[1];
        const query = match[2] || "";
        const triggerOffset = textBefore.lastIndexOf(symbol);

        const domSel = window.getSelection();
        if (!domSel || domSel.rangeCount === 0) return;
        const rect = domSel.getRangeAt(0).getBoundingClientRect();
        if (rect.top === 0 && rect.left === 0) return;

        setMenu({
          kind: symbol === "@" ? "analyst" : "stage",
          query,
          triggerOffset,
          rect: {
            top: Math.min(rect.bottom + 6, window.innerHeight - 260),
            left: Math.min(rect.left, window.innerWidth - 290),
          },
        });
      });
    });
  }, [editor]);

  // Navegação por teclado no popover de autocomplete
  useEffect(() => {
    if (!menu || items.length === 0) return;

    const unregDown = editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      (e) => {
        e?.preventDefault();
        setSelectedIndex((i) => (i + 1) % items.length);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
    const unregUp = editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      (e) => {
        e?.preventDefault();
        setSelectedIndex((i) => (i - 1 + items.length) % items.length);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
    const unregEnter = editor.registerCommand(
      KEY_ENTER_COMMAND,
      (e) => {
        e?.preventDefault();
        const item = items[selectedIndex];
        if (item) insertSelected(item);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
    const unregTab = editor.registerCommand(
      KEY_TAB_COMMAND,
      (e) => {
        e?.preventDefault();
        const item = items[selectedIndex];
        if (item) insertSelected(item);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
    const unregEsc = editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      (e) => {
        e?.preventDefault();
        setMenu(null);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );

    return () => {
      unregDown();
      unregUp();
      unregEnter();
      unregTab();
      unregEsc();
    };
  }, [editor, menu, items, selectedIndex, insertSelected]);

  if (!menu || items.length === 0) return null;

  return createPortal(
    <div
      style={{ top: menu.rect.top, left: menu.rect.left }}
      className="fixed z-[100] w-72 overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-xl"
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="flex items-center gap-1.5 border-b border-border/60 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {menu.kind === "analyst" ? (
          <>
            <User className="h-3 w-3 text-indigo-500" />
            Mencionar Analista (@)
          </>
        ) : (
          <>
            <Hash className="h-3 w-3 text-primary" />
            Vincular Etapa / Tela (#)
          </>
        )}
      </div>
      <div className="max-h-56 overflow-y-auto py-0.5">
        {items.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            onClick={() => insertSelected(item)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
              idx === selectedIndex
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/60",
            )}
          >
            {menu.kind === "stage" ? (
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.dotColor }}
              />
            ) : (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-[10px] font-bold text-indigo-600 dark:text-indigo-300">
                {item.label.charAt(0)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{item.label}</p>
              <p className="truncate text-[10px] text-muted-foreground">{item.subtitle}</p>
            </div>
          </button>
        ))}
      </div>
    </div>,
    document.body,
  );
}
