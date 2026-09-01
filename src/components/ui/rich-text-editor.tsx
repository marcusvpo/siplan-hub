import { Editor } from "@/components/editor/editor";
import { SerializedEditorState } from "lexical";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { VoiceDictationButton } from "@/components/ui/voice-dictation-button";
import { appendPlainTextToLexicalJson, plainTextToLexicalJson } from "@/lib/lexical";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  content: string | object; // HTML string or JSON object
  onChange: (content: string) => void; // Returns JSON string
  editable?: boolean;
  placeholder?: string;
  /** Habilita o botão "Preencher por voz" (requer projectId). */
  enableVoice?: boolean;
  projectId?: string;
  requestedBy?: string;
  className?: string;
}

export function RichTextEditor({ content, onChange, editable = true, placeholder, enableVoice, projectId, requestedBy, className }: RichTextEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  // O componente Editor (Lexical) só lê o conteúdo no mount; ao aplicar texto por
  // voz forçamos um remount bumpando esta key para o novo conteúdo aparecer.
  const [editorKey, setEditorKey] = useState(0);

  const showVoice = !!(enableVoice && editable && projectId);
  const applyVoiceText = (text: string, mode: "append" | "replace") => {
    const next = mode === "append" ? appendPlainTextToLexicalJson(content, text) : plainTextToLexicalJson(text);
    onChange(next);
    setEditorKey((k) => k + 1);
  };

  // Memoize config to prevent re-initialization on every render unless content changes meaningfully
  // Note: Editor component might not react to config prop changes after mount, so keying might be needed if external updates happen.
  const initialConfig = useMemo(() => {
    if (!content) return undefined;

    if (typeof content === "object") {
      if ("root" in content) {
        return content as unknown as SerializedEditorState;
      }
      return undefined;
    }

    try {
      const parsed = JSON.parse(content);
      if ("root" in parsed) {
        return parsed as SerializedEditorState;
      }
    } catch {
      // Conteúdo legado em texto simples é convertido apenas para apresentação;
      // ele só passa a ser salvo como Lexical quando o usuário editar o campo.
    }
    return JSON.parse(plainTextToLexicalJson(content)) as SerializedEditorState;
  }, [content]);

  return (
    <div className={cn("group relative min-h-[200px] w-full min-w-0 overflow-hidden rounded-md border bg-background", className)}>
      {/* Toolbar do canto: voz (sempre visível) + modo foco (no hover) */}
      {(showVoice || editable) && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
          {showVoice && <VoiceDictationButton projectId={projectId} requestedBy={requestedBy} onApply={applyVoiceText} />}
          {editable && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(true)}
              title="Modo Foco (Tela Cheia)"
              aria-label="Abrir editor em tela cheia"
              className="opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
            >
              <Maximize2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      )}

      <div className={showVoice ? "p-1 pt-11" : "p-1"}>
        <Editor key={editorKey} editorSerializedState={initialConfig} onSerializedChange={(value) => onChange(JSON.stringify(value))} placeholder={placeholder} editable={editable} />
      </div>

      {/* Expanded Dialog */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[95vw] flex-col overflow-hidden p-0 sm:h-[95vh] sm:w-[95vw]">
          <DialogHeader className="flex shrink-0 flex-row items-center justify-between gap-2 border-b px-4 py-3 sm:px-6 sm:py-4">
            <DialogTitle className="min-w-0 break-words text-base sm:text-lg">Editor (Modo Foco)</DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(false)}
              aria-label="Sair do modo tela cheia"
              className="mr-7 shrink-0" // spacing for close button
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </DialogHeader>
          <div className="min-w-0 flex-1 overflow-y-auto bg-background p-2 sm:p-6">
            <Editor
              editorSerializedState={initialConfig} // Sync state? Ideally we sync live.
              // Note: Lexical Editor might need a way to set state externally if it changed in the small view.
              // Since 'content' prop updates parent state, passing it here as initialConfig assumes re-mount.
              // The Dialog mounts a NEW Editor instance. It will load 'content'.
              // When closing, the 'onChange' has already updated the parent state.
              onSerializedChange={(value) => onChange(JSON.stringify(value))}
              placeholder={placeholder}
              editable={editable}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
