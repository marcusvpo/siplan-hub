import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { cn } from "@/lib/utils"

type Props = {
  className?: string
  placeholder?: string
}

export function EditorContentEditable({ className, placeholder }: Props) {
  return (
    <ContentEditable
      className={cn(
        "min-h-[150px] resize-none outline-none p-4",
        className
      )}
      aria-placeholder={placeholder}
      placeholder={
        <div className="pointer-events-none absolute top-4 left-4 text-muted-foreground select-none">
          {placeholder}
        </div>
      }
    />
  )
}
