import React, { useEffect, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Link } from "@tiptap/extension-link";
import {
  Table,
  TableRow,
  TableCell,
  TableHeader,
} from "@tiptap/extension-table";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  Indent,
  Outdent,
  Quote,
  Table as TableIcon,
  Minus,
  Undo,
  Redo,
  Sparkles,
  Link as LinkIcon,
  Unlink,
  Info,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface MarkdownTiptapEditorProps {
  value: string;
  onChange: (markdown: string, isUserAction?: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function MarkdownTiptapEditor({
  value,
  onChange,
  disabled = false,
  placeholder = "Comece a escrever o tutorial e passo a passo aqui...",
  className,
}: MarkdownTiptapEditorProps) {
  const editor = useEditor({
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
        bulletList: {
          HTMLAttributes: {
            class: "list-disc pl-6 my-2.5 space-y-1",
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: "list-decimal pl-6 my-2.5 space-y-1",
          },
        },
        listItem: {
          HTMLAttributes: {
            class: "leading-relaxed my-0.5",
          },
        },
        codeBlock: {
          HTMLAttributes: {
            class: "rounded-md bg-muted p-4 font-mono text-sm border border-border my-3",
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: "border-l-4 border-primary pl-4 py-1 italic text-muted-foreground my-3 bg-muted/20 rounded-r-md",
          },
        },
      }),
      Markdown.configure({
        html: true,
        transformPastedText: true,
        transformCopiedText: true,
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline font-medium hover:opacity-80 transition-opacity",
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: "w-full border-collapse border border-border my-4 rounded-md overflow-hidden text-sm",
        },
      }),
      TableRow.configure({
        HTMLAttributes: {
          class: "border-b border-border hover:bg-muted/30 transition-colors",
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: "border border-border bg-muted/60 px-3 py-2 text-left font-bold text-xs uppercase tracking-wider text-muted-foreground",
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: "border border-border px-3 py-2 text-sm",
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor: currentEditor, transaction }) => {
      // Obter markdown nativo com tiptap-markdown
      const markdown = (currentEditor.storage as any).markdown?.getMarkdown?.() || currentEditor.getHTML();
      const isUserAction = currentEditor.isFocused || Boolean(transaction.getMeta("pointer"));
      onChange(markdown, isUserAction);
    },
  });

  // Sincronizar valor externo caso mude (troca de artigo ativo)
  useEffect(() => {
    if (!editor) return;
    const currentMarkdown = (editor.storage as any).markdown?.getMarkdown?.() || "";
    if (value !== currentMarkdown && editor.getHTML() !== value) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  // Atualizar editable
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Informe o endereço URL do link:", previousUrl);

    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  // Inserção de Callout personalizado
  const insertCallout = useCallback(
    (type: "info" | "warning" | "tip") => {
      if (!editor) return;
      let prefix = "> [!NOTE]\n> ";
      let title = "Informação importante: ";
      if (type === "warning") {
        prefix = "> [!WARNING]\n> ";
        title = "Atenção: ";
      } else if (type === "tip") {
        prefix = "> [!TIP]\n> ";
        title = "Dica útil: ";
      }

      editor
        .chain()
        .focus()
        .insertContent(`\n${prefix}**${title}** Descreva os detalhes aqui...\n`)
        .run();
    },
    [editor],
  );

  if (!editor) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        Carregando editor visual...
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-border/70 bg-card shadow-xs transition-all",
        className,
      )}
    >
      {/* Barra de Ferramentas Fixa */}
      <div className="sticky top-0 z-10 flex max-w-full flex-wrap items-center gap-0.5 rounded-t-xl border-b border-border/50 bg-background/95 p-1 backdrop-blur-md sm:p-1.5">
        {/* Headings */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive("heading", { level: 1 }) ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              disabled={disabled}
            >
              <Heading1 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Título 1 (H1)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive("heading", { level: 2 }) ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              disabled={disabled}
            >
              <Heading2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Título 2 (H2)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive("heading", { level: 3 }) ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              disabled={disabled}
            >
              <Heading3 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Título 3 (H3)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive("heading", { level: 4 }) ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
              disabled={disabled}
            >
              <Heading4 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Título 4 (H4)</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Text Formats */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive("bold") ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleBold().run()}
              disabled={disabled}
            >
              <Bold className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Negrito (Ctrl+B)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive("italic") ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              disabled={disabled}
            >
              <Italic className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Itálico (Ctrl+I)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive("strike") ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              disabled={disabled}
            >
              <Strikethrough className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Tachado</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive("code") ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleCode().run()}
              disabled={disabled}
            >
              <Code className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Código Inline</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Lists & Indentation */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              disabled={disabled}
            >
              <List className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Lista com Marcadores / Tópicos</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              disabled={disabled}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Lista Numerada (Passo a Passo 1, 2, 3...)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().sinkListItem("listItem").run()}
              disabled={disabled || !editor.can().sinkListItem("listItem")}
            >
              <Indent className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Aumentar Recuo (Subtópico / Tab)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().liftListItem("listItem").run()}
              disabled={disabled || !editor.can().liftListItem("listItem")}
            >
              <Outdent className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Diminuir Recuo (Shift+Tab)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive("blockquote") ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              disabled={disabled}
            >
              <Quote className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Citação em Bloco</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              disabled={disabled}
            >
              <Minus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Linha Divisória</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Links */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive("link") ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={setLink}
              disabled={disabled}
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Inserir / Editar Link</TooltipContent>
        </Tooltip>

        {editor.isActive("link") && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => editor.chain().focus().unsetLink().run()}
                disabled={disabled}
              >
                <Unlink className="h-4 w-4 text-destructive" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remover Link</TooltipContent>
          </Tooltip>
        )}

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Tabela */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive("table") ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() =>
                editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
              }
              disabled={disabled}
            >
              <TableIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Inserir Tabela 3x3</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Callouts */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs gap-1 text-blue-600 dark:text-blue-400"
              onClick={() => insertCallout("info")}
              disabled={disabled}
            >
              <Info className="h-3.5 w-3.5" />
              <span>Info</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Inserir Bloco de Informação</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs gap-1 text-amber-600 dark:text-amber-400"
              onClick={() => insertCallout("warning")}
              disabled={disabled}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Atenção</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Inserir Bloco de Alerta / Atenção</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs gap-1 text-emerald-600 dark:text-emerald-400"
              onClick={() => insertCallout("tip")}
              disabled={disabled}
            >
              <Lightbulb className="h-3.5 w-3.5" />
              <span>Dica</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Inserir Dica Útil</TooltipContent>
        </Tooltip>

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 sm:ml-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo() || disabled}
              >
                <Undo className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Desfazer (Ctrl+Z)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo() || disabled}
              >
                <Redo className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refazer (Ctrl+Y)</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Notion Canvas Centralizado */}
      <div className="flex min-h-[420px] flex-1 justify-center overflow-y-auto bg-muted/10 p-2 sm:min-h-[500px] sm:p-6 md:p-8">
        <div className="min-h-[420px] w-full min-w-0 max-w-[850px] overflow-hidden rounded-xl border border-border/40 bg-background p-3 shadow-sm sm:min-h-[500px] sm:p-8 md:p-12">
          <EditorContent
            editor={editor}
            className="prose prose-sm prose-slate min-h-[360px] max-w-none break-words text-sm leading-relaxed focus:outline-none dark:prose-invert sm:min-h-[400px] sm:text-[15px] [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:text-xs sm:[&_table]:text-sm"
          />
        </div>
      </div>
    </div>
  );
}
