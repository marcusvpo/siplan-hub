//Author: Erik Marques
import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { adminApi } from './api';
import { safePostHtml, postHtmlForStorage } from './content';
import { appPath } from './paths';

export function RichTextEditor({ initialHtml, onChange, onBusy }: {
  initialHtml: string; onChange: (html: string) => void; onBusy: (busy: boolean) => void;
}) {
  const [error,setError] = useState('');
  const [uploading,setUploading] = useState(false);
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
      const content = images.map((image,index)=>({type:'image',attrs:{src:appPath(image.previewUrl),alt:files[index].name.replace(/\.[^.]+$/,'')}}));
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
    extensions:[StarterKit.configure({heading:{levels:[2,3]},link:{openOnClick:false}}),Image.configure({allowBase64:false})],
    content:safePostHtml(initialHtml,true),
    shouldRerenderOnTransaction:true,
    onUpdate:({editor})=>callbacks.current.onChange(postHtmlForStorage(editor.getHTML())),
    editorProps:{
      attributes:{'aria-label':'Conteúdo da publicação',role:'textbox','aria-multiline':'true'},
      handlePaste:(_view,event)=>{
        const files=Array.from(event.clipboardData?.files ?? []);
        if(!files.length) return false;
        event.preventDefault();void insertImages(files,event.clipboardData?.getData('text/plain') ?? '');return true;
      },
      handleDrop:(_view,event,_slice,moved)=>{
        if(moved) return false;
        const files=Array.from(event.dataTransfer?.files ?? []);
        if(!files.length) return false;
        event.preventDefault();void insertImages(files);return true;
      },
      transformPastedHTML:html=>safePostHtml(html,true),
    },
  });
  useEffect(()=>{editorRef.current=editor;return()=>{editorRef.current=null;};},[editor]);

  return <div className="rich-editor">
    <div className="rich-toolbar" role="toolbar" aria-label="Formatação do conteúdo">
      <button type="button" disabled={!editor || uploading} aria-pressed={editor?.isActive('bold') ?? false} onClick={()=>editor?.chain().focus().toggleBold().run()}>Negrito</button>
      <button type="button" disabled={!editor || uploading} aria-pressed={editor?.isActive('italic') ?? false} onClick={()=>editor?.chain().focus().toggleItalic().run()}>Itálico</button>
      <button type="button" disabled={!editor || uploading} onClick={()=>editor?.chain().focus().toggleHeading({level:2}).run()}>Título</button>
      <button type="button" disabled={!editor || uploading} onClick={()=>editor?.chain().focus().toggleBulletList().run()}>Lista</button>
      <button type="button" disabled={!editor || uploading} onClick={()=>input.current?.click()}>Inserir imagem</button>
      <button type="button" disabled={!editor || uploading || !editor.can().undo()} onClick={()=>editor?.chain().focus().undo().run()}>Desfazer</button>
    </div>
    <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden aria-label="Selecionar imagens" onChange={event=>{void insertImages(Array.from(event.target.files??[]));event.target.value='';}} />
    <EditorContent editor={editor}/>
    <p className="field-help">Cole imagens com Ctrl+V ou com o botão direito → Colar. PNG, JPEG ou WebP, até 5 MB por imagem.</p>
    {uploading && <p role="status">Enviando imagens…</p>}
    {error && <p className="error" role="alert">{error}</p>}
  </div>;
}
