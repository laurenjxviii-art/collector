'use client';

import type {ButtonHTMLAttributes,HTMLAttributes,InputHTMLAttributes,ReactNode,SelectHTMLAttributes} from 'react';
import {ChevronDown,X} from 'lucide-react';
import {VexumBadge,VexumDialog} from './VexumUi';

type BaseProps={children?:ReactNode;className?:string};

const cx=(...parts:Array<string|false|undefined>)=>parts.filter(Boolean).join(' ');

export function VexumCard({children,className=''}:BaseProps){
  return <section className={cx('vxd-card',className)}>{children}</section>;
}

export function VexumWidget({children,className=''}:BaseProps){
  return <section className={cx('vxd-widget',className)}>{children}</section>;
}

export function WidgetHeader({title,icon,action,subtitle,className=''}:{title:string;icon?:ReactNode;action?:ReactNode;subtitle?:string;className?:string}){
  return <header className={cx('vxd-widget-header',className)}>
    <div className="vxd-widget-title">{icon?<span className="vxd-widget-icon">{icon}</span>:null}<span><strong>{title}</strong>{subtitle?<small>{subtitle}</small>:null}</span></div>
    {action?<div className="vxd-widget-action">{action}</div>:null}
  </header>;
}

export function MetricCard({label,value,detail,icon,tone='neutral',className=''}:{label:string;value:ReactNode;detail?:ReactNode;icon?:ReactNode;tone?:'neutral'|'positive'|'warning'|'danger';className?:string}){
  return <article className={cx('vxd-metric-card','tone-'+tone,className)}>
    <div className="vxd-metric-label">{icon}{label}</div>
    <strong>{value}</strong>
    {detail?<small>{detail}</small>:null}
  </article>;
}

export function ChartCard({title,subtitle,action,children,className=''}:{title:string;subtitle?:string;action?:ReactNode;children:ReactNode;className?:string}){
  return <VexumWidget className={cx('vxd-chart-card',className)}>
    <WidgetHeader title={title} subtitle={subtitle} action={action}/>
    <div className="vxd-chart-body">{children}</div>
  </VexumWidget>;
}

export function ProgressBar({value,className=''}:{value:number;className?:string}){
  const pct=Math.max(0,Math.min(100,value));
  return <div className={cx('vxd-progress',className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}><i style={{width:pct+'%'}}/></div>;
}

export function ListWidget({children,className=''}:BaseProps){
  return <div className={cx('vxd-list',className)}>{children}</div>;
}

export function ListRow({leading,title,subtitle,trailing,className=''}:{leading?:ReactNode;title:ReactNode;subtitle?:ReactNode;trailing?:ReactNode;className?:string}){
  return <div className={cx('vxd-list-row',className)}>{leading?<span className="vxd-list-leading">{leading}</span>:null}<span className="vxd-list-copy"><strong>{title}</strong>{subtitle?<small>{subtitle}</small>:null}</span>{trailing?<span className="vxd-list-trailing">{trailing}</span>:null}</div>;
}

export function InsightWidget({title,children,className=''}:{title:string;children:ReactNode;className?:string}){
  return <VexumWidget className={cx('vxd-insight',className)}><WidgetHeader title={title}/><div className="vxd-insight-body">{children}</div></VexumWidget>;
}

export function DataTable({children,className='',...props}:BaseProps&HTMLAttributes<HTMLDivElement>){
  return <div className={cx('vxd-table',className)} {...props}>{children}</div>;
}

export const Badge=VexumBadge;

export function Tabs({items,value,onChange,className=''}:{items:Array<{id:string;label:string}>;value:string;onChange:(id:string)=>void;className?:string}){
  return <div className={cx('vxd-tabs',className)} role="tablist">{items.map(item=><button key={item.id} role="tab" aria-selected={value===item.id} className={value===item.id?'active':''} onClick={()=>onChange(item.id)}>{item.label}</button>)}</div>;
}

export function Button({className='',variant='secondary',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:'primary'|'secondary'|'danger'|'ghost'}){
  return <button {...props} className={cx('vxd-button',variant,className)}/>;
}

export function IconButton({label,children,className='',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{label:string;children:ReactNode}){
  return <button {...props} aria-label={label} className={cx('vxd-icon-button',className)}>{children}</button>;
}

export function Input({className='',...props}:InputHTMLAttributes<HTMLInputElement>){
  return <input {...props} className={cx('vxd-input',className)}/>;
}

export function EmptyState({icon,title,description,action,className=''}:{icon?:ReactNode;title:string;description?:ReactNode;action?:ReactNode;className?:string}){
  return <div className={cx('vxd-empty',className)}>{icon}<strong>{title}</strong>{description?<p>{description}</p>:null}{action}</div>;
}

export function Tooltip({label,children}:{label:string;children:ReactNode}){
  return <span className="vxd-tooltip" data-tooltip={label}>{children}</span>;
}

export function Dropdown({className='',children,...props}:SelectHTMLAttributes<HTMLSelectElement>){
  return <span className="vxd-select-wrap"><select {...props} className={cx('vxd-select',className)}>{children}</select><ChevronDown aria-hidden="true"/></span>;
}

export function Modal({open,onClose,title,children,footer,size='md'}:{open:boolean;onClose:()=>void;title:string;children:ReactNode;footer?:ReactNode;size?:'sm'|'md'|'lg'|'xl'}){
  return <VexumDialog open={open} onClose={onClose} title={title} size={size} footer={footer}>{children}</VexumDialog>;
}

export function DismissButton({onClick,label='Close'}:{onClick:()=>void;label?:string}){
  return <IconButton label={label} onClick={onClick}><X/></IconButton>;
}
