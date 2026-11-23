import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin"
import { ListPlugin } from "@lexical/react/LexicalListPlugin"
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin"
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin"
import { TRANSFORMERS } from "@lexical/markdown"

import { EditorContentEditable } from "@/components/editor/ui/content-editable"
import { ToolbarPlugin } from "./plugins/toolbar-plugin"
import { SubBulletEnterPlugin } from "./plugins/sub-bullet-enter-plugin"
import { MentionAutocompletePlugin } from "./plugins/mention-autocomplete-plugin"

export function Plugins({
  placeholder,
  editable = true,
  compact = false,
}: {
  placeholder?: string
  editable?: boolean
  compact?: boolean
}) {
  return (
    <div className="relative flex flex-col h-full">
      {editable && <ToolbarPlugin compact={compact} />}
      <div className="relative flex-1">
        <RichTextPlugin
          contentEditable={
            <EditorContentEditable placeholder={placeholder} className="h-full" compact={compact} />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <ListPlugin />
        <CheckListPlugin />
        {editable && <SubBulletEnterPlugin />}
        {editable && <MentionAutocompletePlugin />}
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
      </div>
    </div>
  )
}
