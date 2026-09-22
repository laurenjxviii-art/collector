'use client';

import {useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,Check,Layers3,LockKeyhole,Sparkles,X} from 'lucide-react';
import {useWorkspace} from '../lib/useWorkspace';
import {
  COLLECTOR_CATEGORIES,COLLECTOR_INTERESTS,ONBOARDING_CHOICES,platformFromChoices,type PlatformState
} from '../lib/platform';

type Props={onComplete?:(platform:PlatformState)=>void;onCancel?:()=>void;embedded?:boolean};

export default function VexumOnboarding({onComplete,onCancel,embedded=false}:Props){
  const workspace=useWorkspace();
  const [step,setStep]=useState(1);
  const [username,setUsername]=useState('');
  const [displayName,setDisplayName]=useState(workspace.data.profile?.name||'');
  const [birthday,setBirthday]=useState('');
  const [country,setCountry]=useState('United States');
  const [currency,setCurrency]=useState('USD');
  const [language,setLanguage]=useState('English');
  const [choiceIds,setChoiceIds]=useState<string[]>([]);
  const [everything,setEverything]=useState(false);
  const [categories,setCategories]=useState<string[]>([]);
  const [interests,setInterests]=useState<string[]>([]);
  const selectedCollect=everything||choiceIds.includes('collect');
  const title=step===1?'Who are you?':step===2?'Build Your VEXUM':step===3&&selectedCollect?'What do you collect?':'Secure the foundation';
  const subtitle=step===1?'VEXUM-specific identity stays separate from your public visibility settings.':step===2?'Choose what you want the app to help with. You can change this anytime.':step===3&&selectedCollect?'This seeds discovery and recommendations without creating fake owned items.':'Security-sensitive connections remain locked until their real provider flows exist.';

  const toggle=(id:string)=>setChoiceIds(current=>current.includes(id)?current.filter(x=>x!==id):[...current,id]);
  const toggleValue=(value:string,setter:React.Dispatch<React.SetStateAction<string[]>>)=>setter(current=>current.includes(value)?current.filter(x=>x!==value):[...current,value]);
  const nextDisabled=step===1&&(!username.trim()||!displayName.trim())||step===2&&!everything&&!choiceIds.length;
  const lastStep=selectedCollect?4:3;

  const finish=()=>{
    const platform=platformFromChoices({
      choiceIds,everything,collectorCategories:categories,collectorInterests:interests,
      identity:{username:username.trim(),displayName:displayName.trim(),birthday,country,currency,language}
    });
    workspace.update({...workspace.data,platform,profile:{name:displayName.trim(),image:workspace.data.profile?.image||''}});
    try{localStorage.removeItem('vexum.onboarding.pending')}catch{}
    onComplete?.(platform);
  };

  return <div className={'vxo-shell '+(embedded?'embedded':'')}>
    <section className="vxo-card">
      <header><div><span>VEXUM</span><strong>PERSONAL OPERATING SYSTEM</strong></div>{onCancel?<button onClick={onCancel}><X/></button>:null}</header>
      <div className="vxo-progress">{Array.from({length:lastStep},(_,index)=><i className={index+1<=step?'active':''} key={index}/>)}</div>
      <div className="vxo-copy"><span>STEP {step} OF {lastStep}</span><h1>{title}</h1><p>{subtitle}</p></div>

      {step===1?<div className="vxo-form">
        <label>Username<input value={username} onChange={e=>setUsername(e.target.value.replace(/\s+/g,'').slice(0,30))} placeholder="yourname"/></label>
        <label>Display Name / Name<input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Your name"/></label>
        <label>Birthday<input type="date" value={birthday} onChange={e=>setBirthday(e.target.value)}/><small>Private by default.</small></label>
        <label>Country / Region<select value={country} onChange={e=>setCountry(e.target.value)}><option>United States</option><option>Canada</option><option>United Kingdom</option><option>Australia</option><option>Other</option></select></label>
        <label>Currency<select value={currency} onChange={e=>setCurrency(e.target.value)}><option value="USD">USD — $</option><option value="CAD">CAD — $</option><option value="GBP">GBP — £</option><option value="EUR">EUR — €</option><option value="AUD">AUD — $</option></select></label>
        <label>Language<select value={language} onChange={e=>setLanguage(e.target.value)}><option>English</option><option>Spanish</option><option>French</option><option>German</option><option>Japanese</option></select></label>
      </div>:null}

      {step===2?<div className="vxo-modules">
        <button className={'everything '+(everything?'selected':'')} onClick={()=>{setEverything(value=>!value);setChoiceIds([])}}><Sparkles/><span><strong>EVERYTHING</strong><small>Use the full VEXUM system.</small></span>{everything?<Check/>:null}</button>
        <div>{ONBOARDING_CHOICES.map(choice=><button className={!everything&&choiceIds.includes(choice.id)?'selected':''} disabled={everything} onClick={()=>toggle(choice.id)} key={choice.id}><Layers3/><span><strong>{choice.label}</strong><small>{choice.modules.map(module=>module[0].toUpperCase()+module.slice(1)).join(' · ')}</small></span>{!everything&&choiceIds.includes(choice.id)?<Check/>:null}</button>)}</div>
      </div>:null}

      {step===3&&selectedCollect?<div className="vxo-collector">
        <section><header><strong>Collection Types</strong><span>Multi-select. Skip anything you do not care about.</span></header><div>{COLLECTOR_CATEGORIES.map(value=><button className={categories.includes(value)?'selected':''} onClick={()=>toggleValue(value,setCategories)} key={value}>{categories.includes(value)?<Check/>:null}{value}</button>)}</div></section>
        <section><header><strong>What are you into?</strong><span>Used only to tune discovery and communities.</span></header><div>{COLLECTOR_INTERESTS.map(value=><button className={interests.includes(value)?'selected':''} onClick={()=>toggleValue(value,setInterests)} key={value}>{interests.includes(value)?<Check/>:null}{value}</button>)}</div></section>
      </div>:null}

      {step===lastStep?<div className="vxo-security">
        <LockKeyhole/>
        <h2>Security before sensitive connections.</h2>
        <p>VEXUM will not pretend MFA or Plaid is configured when the provider flow is not actually available. External Financial connections remain gated until MFA is verified and a real financial provider integration exists.</p>
        <div><span><Check/>Email/password account</span><span className="pending">MFA — provider flow not configured</span><span className="pending">Plaid — provider connection not configured</span></div>
        <small>You can finish setup now. These gates can be completed later from Account & Security and Connected Apps.</small>
      </div>:null}

      <footer><button disabled={step===1} onClick={()=>setStep(value=>Math.max(1,value-1))}><ArrowLeft/>Back</button><span>{workspace.status}</span>{step<lastStep?<button className="primary" disabled={nextDisabled} onClick={()=>setStep(value=>value+1)}>Continue<ArrowRight/></button>:<button className="primary" onClick={finish}>Enter VEXUM<Check/></button>}</footer>
    </section>
  </div>;
}
