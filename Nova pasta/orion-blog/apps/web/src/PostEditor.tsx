//Author: Erik Marques
import { lazy, Suspense, useState, type FormEvent } from 'react';
import type { Publication, Version, System, PostType } from './api';
import { initialContent, localDateTime, normalizeSlug, postTypes, postHtmlForStorage, systems } from './content';
import { CoverField } from './CoverField';

const RichTextEditor = lazy(() => import('./RichTextEditor').then(module => ({ default: module.RichTextEditor })));

export type EditorDraft = {
  titulo:string;subtitulo:string;slug:string;corpo:string;versao_id:number | null;sistema:System | '';tipo:PostType;
  status:'rascunho' | 'agendado' | 'publicado';publicado_em:string | null;
  capa_imagem_id:string | null;
};

export function PublicationEditor({initial,versions,onSave,onCancel,defaultSystem=''}:{
  initial?:Publication;versions:Version[];onSave:(draft:EditorDraft)=>Promise<void>;onCancel:()=>void;defaultSystem?:string;
}) {
  const [draft,setDraft]=useState<EditorDraft>(()=>({
    titulo:initial?.titulo??'',subtitulo:initial?.subtitulo??initial?.resumo??'',slug:initial?.slug??'',
    corpo:postHtmlForStorage(initialContent(initial)),versao_id:initial?.versao_id??null,
    capa_imagem_id:initial?.capa_imagem_id??null,
    sistema:initial?.sistema??(systems.some(s=>s.slug===defaultSystem)?defaultSystem as System:''),tipo:initial?.tipo??'novidade',
    status:initial?.status==='agendado'?'agendado':initial?.status==='publicado'?'publicado':'rascunho',publicado_em:initial?.publicado_em??null,
  }));
  const [slugEdited,setSlugEdited]=useState(Boolean(initial));
  const [schedule,setSchedule]=useState(localDateTime(initial?.publicado_em));
  const [saving,setSaving]=useState(false);
  const [uploadingContent,setUploadingContent]=useState(false);
  const [uploadingCover,setUploadingCover]=useState(false);
  const uploading=uploadingContent||uploadingCover;
  const [error,setError]=useState('');
  const [html]=useState(()=>initialContent(initial));
  const available=versions.filter(version=>version.sistema===draft.sistema);
  const update=<K extends keyof EditorDraft>(key:K,value:EditorDraft[K])=>setDraft(current=>({...current,[key]:value}));

  async function submit(event:FormEvent) {
    event.preventDefault();if(saving||uploading)return;setError('');
    const slug=normalizeSlug(draft.slug);
    if(!slug){setError('Informe uma palavra-chave com letras ou números.');return;}
    if(!available.some(version=>version.id===draft.versao_id)){setError('Selecione uma versão do sistema escolhido.');return;}
    let date:string|null=null;
    if(draft.status==='agendado') {
      const local=new Date(schedule);
      if(!schedule||!Number.isFinite(local.getTime())||local.getTime()<=Date.now()){setError('Escolha uma data e hora futuras para a publicação.');return;}
      date=local.toISOString();
    }
    const doc=new DOMParser().parseFromString(draft.corpo,'text/html');
    if(!doc.body.textContent?.trim()&&!doc.querySelector('img')){setError('Inclua texto ou uma imagem no conteúdo.');return;}
    setSaving(true);
    try{await onSave({...draft,slug,publicado_em:date});}
    catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar a publicação.');}
    finally{setSaving(false);}
  }

  return <form className="publication-editor" onSubmit={submit}>
    <div className="editor-heading"><div><span className="eyebrow">{initial?'Editar publicação':'Nova publicação'}</span><h2>{initial?.titulo??'Crie uma publicação'}</h2></div><button type="button" className="secondary" disabled={saving||uploading} onClick={onCancel}>Cancelar</button></div>
    <fieldset disabled={saving} className="post-fields">
      <div className="editor-grid">
        <label className="wide">Título<input required maxLength={200} value={draft.titulo} onChange={e=>{const title=e.target.value;setDraft(current=>({...current,titulo:title,...(!slugEdited?{slug:normalizeSlug(title)}:{})}));}} /></label>
        <label className="wide">Subtítulo<input maxLength={400} value={draft.subtitulo} onChange={e=>update('subtitulo',e.target.value)}/></label>
        <label className="wide">Palavra-chave (slug)<input required maxLength={220} value={draft.slug} onChange={e=>{setSlugEdited(true);update('slug',e.target.value);}} onBlur={()=>update('slug',normalizeSlug(draft.slug))}/><small>Ex.: assinatura-em-lote. Gerada a partir do título e pode ser editada.</small></label>
        <CoverField imageId={draft.capa_imagem_id} disabled={saving} onChange={value=>update('capa_imagem_id',value)} onBusy={setUploadingCover}/>
        <div className="wide content-field"><span className="filter-label">Conteúdo</span><Suspense fallback={<p role="status">Carregando editor…</p>}><RichTextEditor initialHtml={html} onChange={value=>update('corpo',value)} onBusy={setUploadingContent}/></Suspense></div>
        <h3 className="editor-section-label">Organização e publicação</h3>
        <label>Versão<select aria-label="Versão" required disabled={!draft.sistema||available.length===0} value={draft.versao_id??''} onChange={e=>update('versao_id',e.target.value?Number(e.target.value):null)}><option value="">{!draft.sistema?'Selecione o sistema abaixo':'Selecione a versão'}</option>{available.map(version=><option key={version.id} value={version.id}>{version.codigo}</option>)}</select>{draft.sistema&&available.length===0&&<small>Cadastre uma versão para esse sistema em “Nova versão”.</small>}</label>
        <label>Status<select aria-label="Status" value={draft.status} onChange={e=>update('status',e.target.value as EditorDraft['status'])}><option value="rascunho">Rascunho</option><option value="agendado">Agendar publicação</option><option value="publicado">Publicar</option></select></label>
        {draft.status==='agendado'&&<label className="wide">Data e hora de publicação<input aria-label="Data e hora de publicação" type="datetime-local" required value={schedule} min={localDateTime(new Date().toISOString())} onChange={e=>setSchedule(e.target.value)}/><small>Horário local: {Intl.DateTimeFormat().resolvedOptions().timeZone}. A publicação ficará pública automaticamente.</small></label>}
        <label>Sistema<select aria-label="Sistema" required value={draft.sistema} onChange={e=>{setDraft(current=>({...current,sistema:e.target.value as System,versao_id:null}));}}><option value="">Selecione o sistema</option>{systems.map(system=><option key={system.slug} value={system.slug}>{system.nome}</option>)}</select></label>
        <label>Tipo<select aria-label="Tipo" required value={draft.tipo} onChange={e=>update('tipo',e.target.value as PostType)}>{postTypes.map(type=><option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
      </div>
      {initial?.itens?.length ? <p className="field-help">As mudanças cadastradas no formato anterior serão preservadas na publicação.</p> : null}
      {error&&<p className="error" role="alert">{error}</p>}
      <div className="editor-actions"><button className="secondary" type="button" disabled={uploading} onClick={onCancel}>Cancelar</button><button className="primary" type="submit" disabled={uploading||!draft.versao_id}>{saving?'Salvando…':uploading?'Enviando imagens…':'Salvar publicação'}</button></div>
    </fieldset>
  </form>;
}

export function VersionEditor({onSave,onCancel,defaultSystem=''}:{onSave:(codigo:string,sistema:System)=>Promise<void>;onCancel:()=>void;defaultSystem?:string}) {
  const [codigo,setCodigo]=useState('');
  const [sistema,setSistema]=useState(defaultSystem);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  return <section className="version-editor"><div><span className="eyebrow">Cadastro</span><h2>Nova versão</h2><p>Cada versão pertence a um único sistema.</p></div><form onSubmit={async event=>{event.preventDefault();if(saving)return;setSaving(true);setError('');try{await onSave(codigo.trim(),sistema as System);}catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar.');}finally{setSaving(false);}}}>
    <label>Sistema<select aria-label="Sistema" required value={sistema} disabled={saving} onChange={event=>setSistema(event.target.value)}><option value="">Selecione o sistema</option>{systems.map(system=><option key={system.slug} value={system.slug}>{system.nome}</option>)}</select></label>
    <label>Código da versão<input required disabled={saving} value={codigo} onChange={event=>setCodigo(event.target.value)} maxLength={30} pattern="[A-Za-z0-9][A-Za-z0-9._\-]*" placeholder="Ex.: 06.03.03"/></label>
    {error&&<p className="error" role="alert">{error}</p>}
    <div className="editor-actions"><button className="secondary" type="button" disabled={saving} onClick={onCancel}>Cancelar</button><button className="primary" disabled={saving}>{saving?'Salvando…':'Salvar versão'}</button></div>
  </form></section>;
}
