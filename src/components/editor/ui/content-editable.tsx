import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { cn } from "@/lib/utils"

type Props = {
  className?: string
  placeholder?: string
  compact?: boolean
}

export function EditorContentEditable({ className, placeholder, compact = false }: Props) {
  return (
    <ContentEditable
      className={cn(
        "resize-none outline-none",
        compact ? "min-h-[76px] p-2.5 text-xs" : "min-h-[150px] p-4",
        className
      )}
      aria-placeholder={placeholder}
      placeholder={
        <div className={cn(
          "pointer-events-none absolute text-muted-foreground select-none",
          compact ? "left-2.5 top-2.5 text-xs" : "left-4 top-4",
        )}>
          {placeholder}
        </div>
      }
    />
  )
}
