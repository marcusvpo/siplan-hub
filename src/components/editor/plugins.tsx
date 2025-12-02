import { useState } from "react"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin"
import { ListPlugin } from "@lexical/react/LexicalListPlugin"
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin"
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin"
import { TRANSFORMERS } from "@lexical/markdown"

import { EditorContentEditable } from "@/components/editor/ui/content-editable"
import { ToolbarPlugin } from "./plugins/toolbar-plugin"

export function Plugins({ placeholder }: { placeholder?: string }) {
  return (
    <div className="relative flex flex-col h-full">
      <ToolbarPlugin />
      <div className="relative flex-1">
        <RichTextPlugin
          contentEditable={
            <EditorContentEditable placeholder={placeholder} className="h-full" />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <ListPlugin />
        <CheckListPlugin />
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
      </div>
    </div>
  )
}
