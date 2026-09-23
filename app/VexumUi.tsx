'use client';

import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {AlertTriangle,CheckCircle2,Info,TriangleAlert,X} from 'lucide-react';

export type VexumToastKind='success'|'info'|'warning'|'error';
export type VexumToastDetail={title:string;message?:string;kind?:VexumToastKind;duration?:number};

export function pushVexumToast(detail:VexumToastDetail){
  if(typeof window==='undefined')return;
  window.dispatchEvent(new CustomEvent<VexumToastDetail>('vexum:toast',{detail}));
}

export function VexumToastHost(){
  const [items,setItems]=useState<Array<VexumToastDetail&{id:number}>>([]);
  const idRef=useRef(0);
  useEffect(()=>{
    const handler=(event:Event)=>{
      const detail=(event as CustomEvent<VexumToastDetail>).detail;
      const item={...detail,id:++idRef.current,kind:detail.kind||'info'};
      setItems(current=>[...current.slice(-3),item]);
      const lifetime=detail.duration??(item.kind==='error'?8000:4500);
      if(lifetime>0)window.setTimeout(()=>setItems(current=>current.filter(row=>row.id!==item.id)),lifetime);
    };
    window.addEventListener('vexum:toast',handler);
    return()=>window.removeEventListener('vexum:toast',handler);
  },[]);
  if(!items.length)return null;
  return createPortal(<div className="vxui-toast-stack" aria-live="polite" aria-atomic="false">
    {items.map(item=><article className={'vxui-toast '+item.kind} key={item.id}>
      <span className="vxui-toast-icon" aria-hidden="true">{item.kind==='success'?<CheckCircle2/>:item.kind==='warning'?<TriangleAlert/>:item.kind==='error'?<AlertTriangle/>:<Info/>}</span>
      <span className="vxui-toast-copy"><strong>{item.title}</strong>{item.message?<small>{item.message}</small>:null}</span>
      <button aria-label="Dismiss notification" onClick={()=>setItems(current=>current.filter(row=>row.id!==item.id))}><X/></button>
    </article>)}
  </div>,document.body);
}

export function VexumDialog({
  open,onClose,title,eyebrow,description,children,footer,size='md',className='',closeOnBackdrop=true,showClose=true,escapeCloses=true,hideHeader=false
}:{
  open:boolean;onClose:()=>void;title:string;eyebrow?:string;description?:string;children:ReactNode;footer?:ReactNode;
  size?:'sm'|'md'|'lg'|'xl';className?:string;closeOnBackdrop?:boolean;showClose?:boolean;escapeCloses?:boolean;hideHeader?:boolean;
}){
  const ref=useRef<HTMLElement>(null);
  const titleId=useRef('vxui-title-'+Math.random().toString(36).slice(2));
  useEffect(()=>{
    if(!open)return;
    const previous=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const node=ref.current;
    const focusable=()=>Array.from(node?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')||[]);
    const initial=window.setTimeout(()=>{const list=focusable();(list[0]||node)?.focus()},0);
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==='Escape'&&escapeCloses){event.preventDefault();onClose();return}
      if(event.key!=='Tab')return;
      const list=focusable();if(!list.length){event.preventDefault();return}
      const first=list[0],last=list[list.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    };
    window.addEventListener('keydown',onKey);
    return()=>{window.clearTimeout(initial);window.removeEventListener('keydown',onKey);document.body.style.overflow=previous};
  },[open,onClose,escapeCloses]);
  if(!open||typeof document==='undefined')return null;
  return createPortal(<div className="vxui-backdrop" onMouseDown={event=>{if(closeOnBackdrop&&event.target===event.currentTarget)onClose()}}>
    <section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={hideHeader?undefined:titleId.current} aria-label={hideHeader?title:undefined} className={'vxui-dialog '+size+' '+className} onMouseDown={event=>event.stopPropagation()}>
      {!hideHeader?<header className="vxui-dialog-head">
        <div>{eyebrow?<span>{eyebrow}</span>:null}<h2 id={titleId.current}>{title}</h2>{description?<p>{description}</p>:null}</div>
        {showClose?<button className="vxui-icon-button" aria-label={'Close '+title} onClick={onClose}><X/></button>:null}
      </header>:null}
      <div className="vxui-dialog-body">{children}</div>
      {footer?<footer className="vxui-dialog-foot">{footer}</footer>:null}
    </section>
  </div>,document.body);
}

export function VexumConfirmDialog({
  open,onClose,onConfirm,title,description,confirmLabel='Confirm',cancelLabel='Cancel',danger=false,busy=false
}:{
  open:boolean;onClose:()=>void;onConfirm:()=>void|Promise<void>;title:string;description:string;confirmLabel?:string;cancelLabel?:string;danger?:boolean;busy?:boolean;
}){
  return <VexumDialog open={open} onClose={onClose} title={title} eyebrow={danger?'CONFIRM DESTRUCTIVE ACTION':'CONFIRM'} size="sm" closeOnBackdrop={!busy}
    footer={<><button className="vxui-button secondary" disabled={busy} onClick={onClose}>{cancelLabel}</button><button className={'vxui-button '+(danger?'danger':'primary')} disabled={busy} onClick={()=>void onConfirm()}>{busy?'Working…':confirmLabel}</button></>}>
    <p className="vxui-confirm-copy">{description}</p>
  </VexumDialog>;
}

export function OtpInput({value,onChange,disabled=false,length=6}:{value:string;onChange:(value:string)=>void;disabled?:boolean;length?:number}){
  const refs=useRef<Array<HTMLInputElement|null>>([]);
  const digits=Array.from({length},(_,index)=>value[index]||'');
  const commit=(next:string,index?:number)=>{
    const clean=next.replace(/\D/g,'').slice(0,length);
    onChange(clean);
    if(index!==undefined&&clean[index]&&index<length-1)refs.current[index+1]?.focus();
  };
  return <div className="vxui-otp" onPaste={event=>{const clean=event.clipboardData.getData('text').replace(/\D/g,'').slice(0,length);if(!clean)return;event.preventDefault();onChange(clean);refs.current[Math.min(clean.length,length)-1]?.focus()}}>
    {digits.map((digit,index)=><input key={index} ref={node=>{refs.current[index]=node}} aria-label={'Verification digit '+(index+1)} inputMode="numeric" autoComplete={index===0?'one-time-code':'off'} pattern="[0-9]*" maxLength={1} disabled={disabled} value={digit}
      onChange={event=>{const next=digits.join('').split('');next[index]=event.target.value.replace(/\D/g,'').slice(-1);commit(next.join(''),index)}}
      onKeyDown={event=>{if(event.key==='Backspace'&&!digits[index]&&index>0){event.preventDefault();const next=digits.join('').split('');next[index-1]='';onChange(next.join(''));refs.current[index-1]?.focus()}else if(event.key==='ArrowLeft'&&index>0)refs.current[index-1]?.focus();else if(event.key==='ArrowRight'&&index<length-1)refs.current[index+1]?.focus()}}/>)}
  </div>;
}


export function VexumBadge({children,tone='neutral',className=''}:{children:ReactNode;tone?:'neutral'|'success'|'warning'|'danger'|'info';className?:string}){
  return <span className={'vxui-badge '+tone+' '+className}>{children}</span>;
}


type InteractionRequest=
  |{kind:'prompt';title:string;description?:string;label?:string;defaultValue?:string;placeholder?:string;inputType?:'text'|'number'|'date'|'time';confirmLabel?:string;resolve:(value:string|null)=>void}
  |{kind:'confirm';title:string;description:string;confirmLabel?:string;danger?:boolean;resolve:(value:boolean)=>void};

export function useVexumInteractionDialog(){
  const [request,setRequest]=useState<InteractionRequest|null>(null);
  const [value,setValue]=useState('');

  const close=useCallback(()=>{
    setRequest(current=>{
      if(current?.kind==='prompt')current.resolve(null);
      else if(current?.kind==='confirm')current.resolve(false);
      return null;
    });
    setValue('');
  },[]);

  const prompt=useCallback((options:{title:string;description?:string;label?:string;defaultValue?:string;placeholder?:string;inputType?:'text'|'number'|'date'|'time';confirmLabel?:string})=>new Promise<string|null>(resolve=>{
    setValue(options.defaultValue||'');
    setRequest({kind:'prompt',...options,resolve});
  }),[]);

  const confirm=useCallback((options:{title:string;description:string;confirmLabel?:string;danger?:boolean})=>new Promise<boolean>(resolve=>{
    setRequest({kind:'confirm',...options,resolve});
  }),[]);

  const submitPrompt=()=>{
    if(request?.kind!=='prompt')return;
    const result=value;
    request.resolve(result);
    setRequest(null);setValue('');
  };
  const submitConfirm=()=>{
    if(request?.kind!=='confirm')return;
    request.resolve(true);
    setRequest(null);
  };

  const dialog=request?.kind==='prompt'
    ?<VexumDialog open onClose={close} title={request.title} description={request.description} size="sm"
        footer={<><button className="vxui-button secondary" onClick={close}>Cancel</button><button className="vxui-button primary" onClick={submitPrompt}>{request.confirmLabel||'Continue'}</button></>}>
        <label className="vxui-prompt-field">{request.label||request.title}<input autoFocus type={request.inputType||'text'} value={value} placeholder={request.placeholder} onChange={event=>setValue(event.target.value)} onKeyDown={event=>{if(event.key==='Enter')submitPrompt()}}/></label>
      </VexumDialog>
    :request?.kind==='confirm'
      ?<VexumConfirmDialog open onClose={close} onConfirm={submitConfirm} title={request.title} description={request.description} confirmLabel={request.confirmLabel||'Confirm'} danger={request.danger}/>
      :null;

  return {prompt,confirm,dialog};
}


type GlobalInteractionDetail=
  |{id:string;kind:'prompt';options:{title:string;description?:string;label?:string;defaultValue?:string;placeholder?:string;inputType?:'text'|'number'|'date'|'time';confirmLabel?:string}}
  |{id:string;kind:'confirm';options:{title:string;description:string;confirmLabel?:string;danger?:boolean}};

let globalInteractionId=0;
const globalInteractionResolvers=new Map<string,(value:string|null|boolean)=>void>();

export function requestVexumPrompt(options:{title:string;description?:string;label?:string;defaultValue?:string;placeholder?:string;inputType?:'text'|'number'|'date'|'time';confirmLabel?:string}){
  if(typeof window==='undefined')return Promise.resolve<string|null>(null);
  return new Promise<string|null>(resolve=>{
    const id='vxui-'+(++globalInteractionId);
    globalInteractionResolvers.set(id,value=>resolve(typeof value==='string'?value:null));
    window.dispatchEvent(new CustomEvent<GlobalInteractionDetail>('vexum:interaction',{detail:{id,kind:'prompt',options}}));
  });
}

export function requestVexumConfirm(options:{title:string;description:string;confirmLabel?:string;danger?:boolean}){
  if(typeof window==='undefined')return Promise.resolve(false);
  return new Promise<boolean>(resolve=>{
    const id='vxui-'+(++globalInteractionId);
    globalInteractionResolvers.set(id,value=>resolve(value===true));
    window.dispatchEvent(new CustomEvent<GlobalInteractionDetail>('vexum:interaction',{detail:{id,kind:'confirm',options}}));
  });
}

export function VexumInteractionHost(){
  const [request,setRequest]=useState<GlobalInteractionDetail|null>(null);
  const [value,setValue]=useState('');
  useEffect(()=>{
    const handler=(event:Event)=>{
      const detail=(event as CustomEvent<GlobalInteractionDetail>).detail;
      setRequest(detail);
      setValue(detail.kind==='prompt'?detail.options.defaultValue||'':'');
    };
    window.addEventListener('vexum:interaction',handler);
    return()=>window.removeEventListener('vexum:interaction',handler);
  },[]);
  const finish=(result:string|null|boolean)=>{
    if(!request)return;
    const resolve=globalInteractionResolvers.get(request.id);
    globalInteractionResolvers.delete(request.id);
    resolve?.(result);
    setRequest(null);setValue('');
  };
  if(!request)return null;
  if(request.kind==='confirm')return <VexumConfirmDialog open onClose={()=>finish(false)} onConfirm={()=>finish(true)} title={request.options.title} description={request.options.description} confirmLabel={request.options.confirmLabel||'Confirm'} danger={request.options.danger}/>;
  return <VexumDialog open onClose={()=>finish(null)} title={request.options.title} description={request.options.description} size="sm"
    footer={<><button className="vxui-button secondary" onClick={()=>finish(null)}>Cancel</button><button className="vxui-button primary" onClick={()=>finish(value)}>{request.options.confirmLabel||'Continue'}</button></>}>
    <label className="vxui-prompt-field">{request.options.label||request.options.title}<input autoFocus type={request.options.inputType||'text'} value={value} placeholder={request.options.placeholder} onChange={event=>setValue(event.target.value)} onKeyDown={event=>{if(event.key==='Enter')finish(value)}}/></label>
  </VexumDialog>;
}


export function VexumPageSkeleton({label='Loading VEXUM workspace…'}:{label?:string}){
  return <div className="vxui-page-skeleton" aria-busy="true" aria-label={label}>
    <span className="sr-only">{label}</span>
    <div className="vxui-skeleton-title"><i/><i/></div>
    <div className="vxui-skeleton-metrics">{[0,1,2,3].map(row=><i key={row}/>)}</div>
    <div className="vxui-skeleton-body"><section>{[0,1,2,3,4].map(row=><i key={row}/>)}</section><aside>{[0,1,2].map(row=><i key={row}/>)}</aside></div>
  </div>;
}
