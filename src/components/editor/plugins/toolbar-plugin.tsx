import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { mergeRegister } from "@lexical/utils"
import {
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from "lexical"
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Undo,
  Redo,
  CheckSquare,
  List,
  ListOrdered,
  Palette,
  Heading1,
  Heading2,
  Heading3
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { Toggle } from "@/components/ui/toggle"
import { Button } from "@/components/ui/button"
import { $patchStyleText, $setBlocksType } from "@lexical/selection"
import {
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list"
import { $createHeadingNode } from "@lexical/rich-text"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const LowPriority = 1

const FONT_SIZES = [
  "10px", "11px", "12px", "13px", "14px", "15px", "16px", "18px", "20px", "24px", "30px", "36px", "48px", "60px", "72px"
]

const COLORS = [
  { name: 'Preto', value: '#000000' },
  { name: 'Cinza', value: '#6b7280' },
  { name: 'Vermelho', value: '#ef4444' },
  { name: 'Laranja', value: '#f97316' },
  { name: 'Amarelo', value: '#eab308' },
  { name: 'Verde', value: '#22c55e' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Roxo', value: '#a855f7' },
  { name: 'Rosa', value: '#ec4899' },
]

export function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext()
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [isStrikethrough, setIsStrikethrough] = useState(false)
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right" | "justify">("left")
  const [fontSize, setFontSize] = useState("16px")
  const [fontColor, setFontColor] = useState("#000000")

  const updateToolbar = useCallback(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat("bold"))
      setIsItalic(selection.hasFormat("italic"))
      setIsUnderline(selection.hasFormat("underline"))
      setIsStrikethrough(selection.hasFormat("strikethrough"))
    }
  }, [])

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar()
        })
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        (_payload, _newEditor) => {
          updateToolbar()
          return false
        },
        LowPriority
      ),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload)
          return false
        },
        LowPriority
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload)
          return false
        },
        LowPriority
      )
    )
  }, [editor, updateToolbar])

  const formatHeading = (headingSize: "h1" | "h2" | "h3") => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode(headingSize))
      }
    })
  }

  const applyStyle = useCallback((styles: Record<string, string>) => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, styles)
      }
    })
  }, [editor])

  const handleFontSizeChange = (value: string) => {
    setFontSize(value)
    applyStyle({ "font-size": value })
  }

  const handleColorChange = (value: string) => {
    setFontColor(value)
    applyStyle({ "color": value })
  }

  return (
    <div className="flex items-center gap-1 p-2 border-b bg-muted/40 flex-wrap">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.preventDefault()
          formatHeading("h1")
        }}
        className="h-8 w-8 p-0"
        title="Título 1"
        aria-label="Título 1"
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.preventDefault()
          formatHeading("h2")
        }}
        className="h-8 w-8 p-0"
        title="Título 2"
        aria-label="Título 2"
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.preventDefault()
          formatHeading("h3")
        }}
        className="h-8 w-8 p-0"
        title="Título 3"
        aria-label="Título 3"
      >
        <Heading3 className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-6 bg-border mx-1" />

      <Select value={fontSize} onValueChange={handleFontSizeChange}>
        <SelectTrigger className="w-[80px] h-8 text-xs" aria-label="Tamanho da fonte">
          <SelectValue placeholder="Size" />
        </SelectTrigger>
        <SelectContent>
          {FONT_SIZES.map((size) => (
            <SelectItem key={size} value={size}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="w-px h-6 bg-border mx-1" />

      <Toggle
        size="sm"
        pressed={isBold}
        onPressedChange={(pressed) => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")
        }}
        className="h-8 w-8"
        title="Negrito"
        aria-label="Negrito"
      >
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={isItalic}
        onPressedChange={(pressed) => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")
        }}
        className="h-8 w-8"
        title="Itálico"
        aria-label="Itálico"
      >
        <Italic className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={isUnderline}
        onPressedChange={(pressed) => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")
        }}
        className="h-8 w-8"
        title="Sublinhado"
        aria-label="Sublinhado"
      >
        <Underline className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={isStrikethrough}
        onPressedChange={(pressed) => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")
        }}
        className="h-8 w-8"
        title="Tachado"
        aria-label="Tachado"
      >
        <Strikethrough className="h-4 w-4" />
      </Toggle>

      <div className="w-px h-6 bg-border mx-1" />

      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" title="Cor do texto" aria-label="Cor do texto">
            <Palette className="h-4 w-4" style={{ color: fontColor }} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-40 p-2">
          <div className="grid grid-cols-5 gap-1">
            {COLORS.map((color) => (
              <button
                type="button"
                key={color.value}
                className="w-6 h-6 rounded-full border border-muted hover:scale-110 transition-transform"
                style={{ backgroundColor: color.value }}
                onClick={() => handleColorChange(color.value)}
                title={color.name}
              />
            ))}
             <button
                type="button"
                className="w-6 h-6 rounded-full border border-muted hover:scale-110 transition-transform bg-black"
                onClick={() => handleColorChange("#000000")}
                title="Padrão"
              />
          </div>
        </PopoverContent>
      </Popover>

      <div className="w-px h-6 bg-border mx-1" />

      <Toggle
        size="sm"
        pressed={textAlign === "left"}
        onPressedChange={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "left")
          setTextAlign("left")
        }}
        className="h-8 w-8"
        title="Alinhar à esquerda"
        aria-label="Alinhar à esquerda"
      >
        <AlignLeft className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={textAlign === "center"}
        onPressedChange={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "center")
          setTextAlign("center")
        }}
        className="h-8 w-8"
        title="Centralizar"
        aria-label="Centralizar"
      >
        <AlignCenter className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={textAlign === "right"}
        onPressedChange={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "right")
          setTextAlign("right")
        }}
        className="h-8 w-8"
        title="Alinhar à direita"
        aria-label="Alinhar à direita"
      >
        <AlignRight className="h-4 w-4" />
      </Toggle>

      <div className="w-px h-6 bg-border mx-1" />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.preventDefault()
          editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined)
        }}
        className="h-8 w-8 p-0"
        title="Checklist"
        aria-label="Checklist"
      >
        <CheckSquare className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() =>
          editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
        }
        className="h-8 w-8 p-0"
        title="Lista com marcadores"
        aria-label="Lista com marcadores"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() =>
          editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
        }
        className="h-8 w-8 p-0"
        title="Lista numerada"
        aria-label="Lista numerada"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

    </div>
  )
}
