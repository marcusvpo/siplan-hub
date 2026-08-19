import { useCallback, useEffect, useRef } from "react";
import { FileText, ImagePlus, Paperclip, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  formatSdAttachmentSize,
  SD_ATTACHMENT_MAX_COUNT,
  validateSdAttachment,
} from "@/lib/sd-attachments";
import { sanitizeSdSolutionHtml } from "@/lib/sd-solutions";
import type { SdAnexo } from "@/types/sd";

interface SolutionRichTextEditorProps {
  value: string;
  keywords: string[];
  onChange: (html: string, keywords: string[]) => void;
  attachments?: SdAnexo[];
  pendingAttachments?: File[];
  onAddAttachments?: (files: File[]) => void;
  onRemoveAttachment?: (attachment: SdAnexo) => void;
  onRemovePendingAttachment?: (file: File) => void;
  disabled?: boolean;
}

export function SolutionRichTextEditor({
  value,
  keywords,
  onChange,
  attachments = [],
  pendingAttachments = [],
  onAddAttachments,
  onRemoveAttachment,
  onRemovePendingAttachment,
  disabled = false,
}: SolutionRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const lastEmittedValue = useRef<string | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    const safeValue = sanitizeSdSolutionHtml(value || "");
    if (lastEmittedValue.current === safeValue) return;
    if (editorRef.current.innerHTML !== safeValue) {
      editorRef.current.innerHTML = safeValue;
    }
  }, [value]);

  const emitChange = useCallback(() => {
    if (!editorRef.current) return;
    const marks = Array.from(editorRef.current.querySelectorAll(".sd-keyword"));
    const nextKeywords = Array.from(
      new Set(
        marks
          .map((mark) => mark.textContent?.trim())
          .filter((keyword): keyword is string => Boolean(keyword)),
      ),
    );
    const safeHtml = sanitizeSdSolutionHtml(editorRef.current.innerHTML);
    lastEmittedValue.current = safeHtml;
    onChange(safeHtml, nextKeywords);
  }, [onChange]);

  const markSelection = () => {
    if (disabled || !editorRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();
    const commonNode = range.commonAncestorContainer;
    const commonElement =
      commonNode.nodeType === Node.ELEMENT_NODE
        ? (commonNode as Element)
        : commonNode.parentElement;

    if (
      selectedText.length < 2 ||
      !commonElement ||
      !editorRef.current.contains(commonElement) ||
      commonElement.closest(".sd-keyword")
    ) {
      return;
    }

    const mark = document.createElement("span");
    mark.className = "sd-keyword";
    mark.textContent = selectedText;
    mark.title = "Clique para remover a palavra-chave";

    range.deleteContents();
    range.insertNode(mark);
    selection.removeAllRanges();
    emitChange();
  };

  const removeKeyword = (keyword: string) => {
    if (!editorRef.current) return;
    editorRef.current.querySelectorAll(".sd-keyword").forEach((mark) => {
      if (mark.textContent?.trim() !== keyword) return;
      mark.replaceWith(document.createTextNode(mark.textContent || ""));
    });
    editorRef.current.normalize();
    emitChange();
  };

  const handleEditorClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    const mark = (event.target as HTMLElement).closest(".sd-keyword");
    if (!mark) return;
    event.preventDefault();
    mark.replaceWith(document.createTextNode(mark.textContent || ""));
    editorRef.current?.normalize();
    emitChange();
  };

  const handleImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editorRef.current) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem válido.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 4 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (!editorRef.current || typeof reader.result !== "string") return;
      const image = document.createElement("img");
      image.src = reader.result;
      image.alt = file.name;
      editorRef.current.append(image, document.createElement("br"));
      emitChange();
    };
    reader.readAsDataURL(file);
  };

  const handleAttachments = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";
    if (selectedFiles.length === 0 || !onAddAttachments) return;

    const availableSlots = Math.max(
      0,
      SD_ATTACHMENT_MAX_COUNT - attachments.length - pendingAttachments.length,
    );
    if (availableSlots === 0) {
      toast.error(`Cada solução pode ter no máximo ${SD_ATTACHMENT_MAX_COUNT} anexos.`);
      return;
    }

    const validFiles: File[] = [];
    for (const file of selectedFiles.slice(0, availableSlots)) {
      const validationError = validateSdAttachment(file);
      if (validationError) toast.error(validationError);
      else validFiles.push(file);
    }

    if (selectedFiles.length > availableSlots) {
      toast.error(`Cada solução pode ter no máximo ${SD_ATTACHMENT_MAX_COUNT} anexos.`);
    }
    if (validFiles.length > 0) onAddAttachments(validFiles);
  };

  const hasAttachments = attachments.length > 0 || pendingAttachments.length > 0;

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-2"
            disabled={disabled}
            onClick={() => imageInputRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" />
            Inserir imagem
          </Button>
          <div className="h-5 w-px bg-border" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-2"
            disabled={disabled}
            onClick={() => attachmentInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4" />
            Inserir anexo
          </Button>
          <div className="h-5 w-px bg-border" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-2 text-muted-foreground"
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={markSelection}
          >
            <Tag className="h-4 w-4" />
            Marcar seleção como palavra-chave
          </Button>
        </div>

        <div
          ref={editorRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Descrição da solução"
          data-placeholder="Descreva o problema e o passo a passo da solução..."
          className="sd-rich-editor min-h-56 px-4 py-3 text-sm outline-none"
          onInput={emitChange}
          onClick={handleEditorClick}
        />

        {hasAttachments && (
          <div className="space-y-2 border-t bg-muted/20 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold">Anexos</span>
              <span className="text-xs text-muted-foreground">
                {attachments.length + pendingAttachments.length}/{SD_ATTACHMENT_MAX_COUNT}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {attachments.map((attachment) => (
                <div key={attachment.id} className="flex min-w-0 items-center gap-2 rounded-md border bg-background px-3 py-2">
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium" title={attachment.nome_arquivo}>
                      {attachment.nome_arquivo}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatSdAttachmentSize(attachment.tamanho_bytes)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={disabled}
                    aria-label={`Remover anexo ${attachment.nome_arquivo}`}
                    onClick={() => onRemoveAttachment?.(attachment)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {pendingAttachments.map((file, index) => (
                <div key={`${file.name}-${file.size}-${index}`} className="flex min-w-0 items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium" title={file.name}>{file.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatSdAttachmentSize(file.size)} · A enviar
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={disabled}
                    aria-label={`Remover anexo pendente ${file.name}`}
                    onClick={() => onRemovePendingAttachment?.(file)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImage}
      />
      <input
        ref={attachmentInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleAttachments}
      />

      {keywords.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Palavras-chave:
          </span>
          {keywords.map((keyword) => (
            <Badge key={keyword} variant="secondary" className="gap-1 pr-1">
              {keyword}
              {!disabled && (
                <button
                  type="button"
                  className="rounded p-0.5 hover:bg-background/80"
                  onClick={() => removeKeyword(keyword)}
                  aria-label={`Remover palavra-chave ${keyword}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
