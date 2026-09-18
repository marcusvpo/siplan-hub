//Author: Erik Marques
import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { adminApi } from './api';
import { safePostHtml, postHtmlForStorage } from './content';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Unlink,
  Image as ImageIcon,
  Undo,
  Redo,
  Maximize2,
  Minimize2,
  Palette,
} from 'lucide-react';

function EditorToolbar({
  editor,
  uploading,
  onPickImage,
  onToggleFocus,
  isExpanded = false,
}: {
  editor: Editor | null;
  uploading: boolean;
  onPickImage: () => void;
  onToggleFocus: () => void;
  isExpanded?: boolean;
}) {
  if (!editor) return null;

  const handleLink = () => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Informe a URL do link:', previousUrl || 'https://');
    if (url === null) return;
    const trimmed = url.trim();
    if (!trimmed || trimmed === 'https://') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: trimmed }).run();
  };

  return (
    <div className="rich-toolbar" role="toolbar" aria-label="Formatação do conteúdo">
      <div className="rich-toolbar-group">
        <button
          type="button"
          disabled={uploading}
          aria-pressed={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          title="Título 1 (H1)"
          aria-label="Título 1"
        >
          <Heading1 className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={uploading}
          aria-pressed={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Título 2 (H2)"
          aria-label="Título 2"
        >
          <Heading2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={uploading}
          aria-pressed={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Título 3 (H3)"
          aria-label="Título 3"
        >
          <Heading3 className="h-4 w-4" />
        </button>
      </div>

      <div className="rich-toolbar-divider" />

      <div className="rich-toolbar-group">
        <button
          type="button"
          disabled={uploading}
          aria-pressed={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Negrito (Ctrl+B)"
          aria-label="Negrito"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={uploading}
          aria-pressed={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Itálico (Ctrl+I)"
          aria-label="Itálico"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={uploading}
          aria-pressed={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Tachado"
          aria-label="Tachado"
        >
          <Strikethrough className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={uploading}
          aria-pressed={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}
          title="Código inline"
          aria-label="Código inline"
        >
          <Code className="h-4 w-4" />
        </button>
      </div>

      <div className="rich-toolbar-divider" />

      <div className="rich-toolbar-group">
        <button
          type="button"
          disabled={uploading}
          aria-pressed={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Lista com marcadores"
          aria-label="Lista com marcadores"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={uploading}
          aria-pressed={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Lista numerada"
          aria-label="Lista numerada"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={uploading}
          aria-pressed={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Citação"
          aria-label="Citação"
        >
          <Quote className="h-4 w-4" />
        </button>
      </div>

      <div className="rich-toolbar-divider" />

      <div className="rich-toolbar-group">
        <button
          type="button"
          disabled={uploading}
          aria-pressed={editor.isActive('link')}
          onClick={handleLink}
          title={editor.isActive('link') ? 'Remover Link' : 'Inserir Link'}
          aria-label={editor.isActive('link') ? 'Remover Link' : 'Inserir Link'}
        >
          {editor.isActive('link') ? <Unlink className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
        </button>
        {/* Botão de cor */}
        <input
          type="color"
          className="hidden"
          id="textColorInput"
          onChange={(e) => editor && editor.chain().focus().setColor(e.target.value).run()}
        />
        <button
          type="button"
          disabled={uploading}
          title="Alterar cor da fonte"
          aria-label="Alterar cor da fonte"
          onClick={() => document.getElementById('textColorInput')?.click()}
        >
          <Palette className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={uploading}
          onClick={onPickImage}
          title="Inserir imagem"
          aria-label="Inserir imagem"
        >
          <ImageIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="rich-toolbar-divider" />

      <div className="rich-toolbar-group">
        <button
          type="button"
          disabled={uploading || !editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
          title="Desfazer (Ctrl+Z)"
          aria-label="Desfazer"
        >
          <Undo className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={uploading || !editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
          title="Refazer (Ctrl+Y)"
          aria-label="Refazer"
        >
          <Redo className="h-4 w-4" />
        </button>
      </div>

      <div className="rich-toolbar-spacer" />

      <div className="rich-toolbar-group rich-toolbar-focus-group">
        <button
          type="button"
          disabled={uploading}
          onClick={onToggleFocus}
          title={isExpanded ? 'Sair da tela cheia' : 'Modo Foco (Tela Cheia)'}
          aria-label={isExpanded ? 'Sair da tela cheia' : 'Modo Foco (Tela Cheia)'}
          className="rich-toolbar-focus-btn"
        >
          {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export function RichTextEditor({ initialHtml, onChange, onBusy }: {
  initialHtml: string; onChange: (html: string) => void; onBusy: (busy: boolean) => void;
}) {
  const [error,setError] = useState('');
  const [uploading,setUploading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const pending = useRef(false);
  const callbacks = useRef({onChange,onBusy});
  callbacks.current = {onChange,onBusy};

  async function insertImages(files: File[], text = '') {
    const current = editorRef.current;
    if (!current || current.isDestroyed || pending.current) return;
    setError('');
    if (files.some(file=>!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size>5*1024*1024)) {
      setError('Use imagens PNG, JPEG ou WebP de até 5 MB cada.');return;
    }
    if (files.length + current.view.dom.querySelectorAll('img').length > 30) {setError('Use até 30 imagens por publicação.');return;}
    const position = current.state.selection.from;
    pending.current=true;setUploading(true);callbacks.current.onBusy(true);current.setEditable(false);
    try {
      // Ordem de colagem preservada, sem buscar imagens em servidores externos.
      const images = [];
      for (const file of files) images.push(await adminApi.uploadImage(file));
      if (current.isDestroyed) return;
      const content = images.map((image,index)=>({type:'image',attrs:{src:image.previewUrl,alt:files[index].name.replace(/\.[^.]+$/,'')}}));
      current.chain().insertContentAt(position, [
        ...(text ? [{type:'paragraph',content:[{type:'text',text}]}] : []),
        ...content,{type:'paragraph'},
      ]).run();
    } catch (e) {if (!current.isDestroyed) setError(e instanceof Error ? e.message : 'Não foi possível inserir a imagem.');}
    finally {
      pending.current=false;
      if (!current.isDestroyed) {current.setEditable(true);setUploading(false);callbacks.current.onBusy(false);current.commands.focus();}
    }
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Image.configure({ allowBase64: false }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      TextStyle.configure({}),
      Color.configure({}),
    ],
    content: safePostHtml(initialHtml, true),
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor }) => callbacks.current.onChange(postHtmlForStorage(editor.getHTML())),
    editorProps: {
      attributes: { 'aria-label': 'Conteúdo da publicação', role: 'textbox', 'aria-multiline': 'true' },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (!files.length) return false;
        event.preventDefault(); void insertImages(files, event.clipboardData?.getData('text/plain') ?? ''); return true;
      },
      handleDrop: (_view, event, _slice, moved) => {
        if (moved) return false;
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (!files.length) return false;
        event.preventDefault(); void insertImages(files); return true;
      },
      transformPastedHTML: html => safePostHtml(html, true),
    },
  });
  useEffect(() => { editorRef.current = editor; return () => { editorRef.current = null; }; }, [editor]);

  return <div className="rich-editor">
    <EditorToolbar
      editor={editor}
      uploading={uploading}
      onPickImage={() => input.current?.click()}
      onToggleFocus={() => setIsExpanded(prev => !prev)}
      isExpanded={isExpanded}
    />
    <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden aria-label="Selecionar imagens" onChange={event => { void insertImages(Array.from(event.target.files ?? [])); event.target.value = ''; }} />
    <EditorContent editor={editor} />
    <p className="field-help">Cole imagens com Ctrl+V ou com o botão direito → Colar. PNG, JPEG ou WebP, até 5 MB por imagem.</p>
    {uploading && <p role="status">Enviando imagens…</p>}
    {error && <p className="error" role="alert">{error}</p>}

    <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
      <DialogContent className="flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[95vw] flex-col overflow-hidden p-0 sm:h-[92vh] sm:w-[92vw]">
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between gap-2 border-b px-4 py-3 sm:px-6 sm:py-4">
          <DialogTitle className="min-w-0 break-words text-base sm:text-lg">
            Editor de Conteúdo (Modo Foco)
          </DialogTitle>
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            aria-label="Sair do modo tela cheia"
            className="mr-7 shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
        </DialogHeader>

        <div className="flex flex-1 flex-col overflow-hidden p-2 sm:p-4 bg-background">
          <EditorToolbar
            editor={editor}
            uploading={uploading}
            onPickImage={() => input.current?.click()}
            onToggleFocus={() => setIsExpanded(false)}
            isExpanded={true}
          />
          <div className="flex-1 overflow-y-auto border rounded-b-md p-4 bg-background focus-mode-editor-container">
            <EditorContent editor={editor} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>;
}

