'use client';

import {useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,Check,Layers3,LockKeyhole,Sparkles,X} from 'lucide-react';
import {useWorkspace} from '../lib/useWorkspace';
import {
  COLLECTOR_NICHES,ONBOARDING_CHOICES,platformFromChoices,type PlatformState
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
  const [interests,setInterests]=useState<string[]>([]);
  const [expandedNiches,setExpandedNiches]=useState<string[]>(['Action Figures','Trading Cards']);
  const [customNiche,setCustomNiche]=useState('');
  const selectedCollect=everything||choiceIds.includes('collect');
  const title=step===1?'Who are you?':step===2?'Build Your VEXUM':step===3&&selectedCollect?'What do you collect?':'Secure the foundation';
  const subtitle=step===1?'VEXUM-specific identity stays separate from your public visibility settings.':step===2?'Choose what you want the app to help with. You can change this anytime.':step===3&&selectedCollect?'This seeds discovery and recommendations without creating fake owned items.':'Security-sensitive connections stay gated until their real provider flows and required account security are available.';

  const toggle=(id:string)=>setChoiceIds(current=>current.includes(id)?current.filter(x=>x!==id):[...current,id]);
  const toggleNiche=(value:string)=>setInterests(current=>current.includes(value)?current.filter(x=>x!==value):[...current,value]);
  const toggleExpanded=(value:string)=>setExpandedNiches(current=>current.includes(value)?current.filter(x=>x!==value):[...current,value]);
  const addCustomNiche=()=>{const value=customNiche.trim();if(!value)return;setInterests(current=>current.includes(value)?current:[...current,value]);setCustomNiche('')};
  const nextDisabled=step===1&&(!username.trim()||!displayName.trim())||step===2&&!everything&&!choiceIds.length;
  const lastStep=selectedCollect?4:3;

  const finish=()=>{
    const platform=platformFromChoices({
      choiceIds,everything,collectorCategories:[...new Set(interests.map(value=>value.split(' › ')[0]).filter(Boolean))],collectorInterests:interests,
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

      {step===3&&selectedCollect?<div className="vxo-collector vxo-niches">
        <section className="vxo-niche-intro"><header><strong>Collecting niches</strong><span>Select as broadly or specifically as you want. These choices tune Radar, discovery, releases, Home recommendations, and communities without hiding the rest of VEXUM.</span></header>
          <div className="vxo-selected-count">{interests.length?interests.length+' selected':'Nothing selected yet — you can change this later.'}</div>
        </section>
        {COLLECTOR_NICHES.map(group=>{
          const expanded=expandedNiches.includes(group.label);
          const groupSelected=interests.includes(group.label);
          return <section className="vxo-niche-group" key={group.label}>
            <header><button className="vxo-niche-expand" onClick={()=>toggleExpanded(group.label)} aria-expanded={expanded}><span>{expanded?'−':'+'}</span><strong>{group.label}</strong><small>{interests.filter(value=>value===group.label||value.startsWith(group.label+' › ')).length||''}</small></button></header>
            {expanded?<div className="vxo-niche-options">
              <button className={groupSelected?'selected':''} onClick={()=>toggleNiche(group.label)}>{groupSelected?<Check/>:null}All {group.label}</button>
              {group.options.map(option=>typeof option==='string'
                ?<button className={interests.includes(group.label+' › '+option)?'selected':''} onClick={()=>toggleNiche(group.label+' › '+option)} key={option}>{interests.includes(group.label+' › '+option)?<Check/>:null}{option}</button>
                :<div className="vxo-niche-subgroup" key={option.label}><strong>{option.label}</strong><div>{option.options.map(child=>{const value=group.label+' › '+option.label+' › '+child;return <button className={interests.includes(value)?'selected':''} onClick={()=>toggleNiche(value)} key={child}>{interests.includes(value)?<Check/>:null}{child}</button>})}</div></div>
              )}
            </div>:null}
          </section>
        })}
        <section className="vxo-custom-niche"><header><strong>Add your own niche</strong><span>The taxonomy is intentionally open.</span></header><div><input value={customNiche} onChange={event=>setCustomNiche(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();addCustomNiche()}}} placeholder="e.g. Tokusatsu props"/><button onClick={addCustomNiche}>Add</button></div></section>
      </div>:null}

      {step===lastStep?<div className="vxo-security">
        <LockKeyhole/>
        <h2>Security before sensitive connections.</h2>
        <p>Finish your account first, then manage MFA and external connections from Settings. VEXUM only shows provider states that are actually available.</p>
        <div><span><Check/>Email/password account</span><span><Check/>Authenticator MFA available after onboarding</span><span><Check/>Plaid bank connections available after required account security</span></div>
        <small>You can finish setup now, then manage MFA from Settings → Security and banks from Financial → Accounts or Settings → Connections.</small>
      </div>:null}

      <footer><button disabled={step===1} onClick={()=>setStep(value=>Math.max(1,value-1))}><ArrowLeft/>Back</button><span>{workspace.status}</span>{step<lastStep?<button className="primary" disabled={nextDisabled} onClick={()=>setStep(value=>value+1)}>Continue<ArrowRight/></button>:<button className="primary" onClick={finish}>Enter VEXUM<Check/></button>}</footer>
    </section>
  </div>;
}
