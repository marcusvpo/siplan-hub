import { Editor } from "@/components/editor/editor"
import { SerializedEditorState } from "lexical"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Maximize2, Minimize2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface RichTextEditorProps {
  content: string | object; // HTML string or JSON object
  onChange: (content: string) => void; // Returns JSON string
  editable?: boolean;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, editable = true, placeholder }: RichTextEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Memoize config to prevent re-initialization on every render unless content changes meaningfully
  // Note: Editor component might not react to config prop changes after mount, so keying might be needed if external updates happen.
  const initialConfig = useMemo(() => {
    if (!content) return undefined;
    
    if (typeof content === 'object') {
       if ('root' in content) {
         return content as unknown as SerializedEditorState;
       }
       return undefined;
    }

    try {
      const parsed = JSON.parse(content);
      if ('root' in parsed) {
        return parsed as SerializedEditorState;
      }
    } catch {
      // Not JSON
    }
    return undefined;
  }, [content]);

  return (
    <div className="relative group min-h-[200px] w-full border rounded-md bg-background">
      {/* Focus Mode Button */}
      {editable && (
          <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(true)}
                title="Modo Foco (Tela Cheia)"
            >
                <Maximize2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
      )}

      <div className="p-1">
        <Editor
            editorSerializedState={initialConfig}
            onSerializedChange={(value) => onChange(JSON.stringify(value))}
            placeholder={placeholder}
            editable={editable}
        />
      </div>

      {/* Expanded Dialog */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] flex flex-col p-0">
            <DialogHeader className="px-6 py-4 border-b shrink-0 flex flex-row items-center justify-between">
                <DialogTitle>Editor (Modo Foco)</DialogTitle>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsExpanded(false)}
                    className="mr-8" // spacing for close button
                >
                    <Minimize2 className="h-4 w-4" />
                </Button>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-6 bg-background">
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
  )
}
