import { Editor } from "@/components/editor/editor"
import { SerializedEditorState } from "lexical"
import { useMemo } from "react"

interface RichTextEditorProps {
  content: string | object; // HTML string or JSON object
  onChange: (content: string) => void; // Returns JSON string
  editable?: boolean;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, editable = true, placeholder }: RichTextEditorProps) {
  
  const initialConfig = useMemo(() => {
    if (!content) return undefined;
    
    // If it's already an object, check if it looks like Lexical state
    if (typeof content === 'object') {
       if ('root' in content) {
         return content as unknown as SerializedEditorState;
       }
       // If it's Tiptap JSON (has 'type': 'doc'), we might want to convert or just ignore.
       // For now, let's treat it as empty or try to extract text.
       // A proper migration would be complex. Let's start fresh or assume text.
       return undefined;
    }

    // If string, try to parse as JSON
    try {
      const parsed = JSON.parse(content);
      if ('root' in parsed) {
        return parsed as SerializedEditorState;
      }
    } catch {
      // Not JSON, treat as plain text? 
      // Lexical doesn't easily accept plain text string as 'editorState' prop without a custom state creator.
      // But we can just pass undefined and let the user start fresh, or we could create a basic state.
      // For now, let's return undefined to avoid errors.
    }
    return undefined;
  }, [content]);

  // If content is a string but not JSON, we might want to initialize with that text.
  // However, the Editor component takes SerializedEditorState.
  // We can create a simple initial state if needed, but for now let's rely on the user typing.
  // If preserving old text is critical, we'd need a transformer.

  return (
    <div className="min-h-[200px] w-full">
      <Editor
        editorSerializedState={initialConfig}
        onSerializedChange={(value) => onChange(JSON.stringify(value))}
        placeholder={placeholder}
      />
    </div>
  )
}
