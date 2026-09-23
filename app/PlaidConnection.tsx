'use client';

import {useEffect,useState} from 'react';
import {Link2,LockKeyhole,Plus,RefreshCw,Trash2} from 'lucide-react';
import type {CloudConfig,Session} from '../lib/cloud';
import {VexumConfirmDialog} from './VexumUi';
import type {PlatformState} from '../lib/platform';
import {
  completePlaidLinkSession,createPlaidLinkToken,disconnectPlaid,exchangePlaidPublicToken,loadPlaidSnapshot,openPlaidLink,plaidBlockedProducts,syncPlaid,
  type PlaidSnapshot
} from '../lib/plaidClient';

const SESSION_KEY='vexum.plaid.sessionId';

export default function PlaidConnection({config,session,platform,onSave,onMessage,mode='settings',onSnapshot}:{
  config:CloudConfig|null;session:Session|null;platform:PlatformState;onSave:(p:PlatformState)=>void;onMessage:(message:string)=>void;
  mode?:'settings'|'accounts';onSnapshot?:(snapshot:PlaidSnapshot)=>void;
}){
  const [snapshot,setSnapshot]=useState<PlaidSnapshot|null>(null);
  const [configured,setConfigured]=useState<boolean|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [linkExited,setLinkExited]=useState(false);
  const [retryItemId,setRetryItemId]=useState<string|undefined>();
  const [mfaTick,setMfaTick]=useState(0);
  const [disconnectTarget,setDisconnectTarget]=useState<{itemId:string;name:string}|null>(null);
  const mfaReady=platform.security.mfaStatus==='verified';
  const connected=Boolean(snapshot?.items?.length);
  const hasError=Boolean(snapshot?.items?.some(item=>item.status==='error'||item.status==='needs_update'));
  const blocked=plaidBlockedProducts(snapshot);

  const applySnapshot=(next:PlaidSnapshot)=>{setSnapshot(next);setConfigured(next.configured);onSnapshot?.(next)};
  async function refresh(){
    if(!config?.configured||!session||!mfaReady)return;
    try{applySnapshot(await loadPlaidSnapshot(config))}
    catch{setError('Bank connection status is temporarily unavailable.')}
  }

  useEffect(()=>{
    fetch('/api/plaid/health',{cache:'no-store'}).then(r=>r.json()).then(data=>setConfigured(Boolean(data.configured))).catch(()=>setConfigured(false));
  },[]);
  useEffect(()=>{const verified=()=>setMfaTick(value=>value+1);window.addEventListener('vexum.mfa.verified',verified);return()=>window.removeEventListener('vexum.mfa.verified',verified)},[]);
  useEffect(()=>{void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[config?.configured,session?.user.id,mfaReady,mfaTick]);

  useEffect(()=>{
    if(!snapshot)return;
    const nextStatus=hasError?'error':connected?'connected':'not_connected';
    const current=platform.connections.financial;
    const nextProvider=connected?'plaid':'none';
    if(current.status!==nextStatus||current.provider!==nextProvider||(current.lastSync||null)!==(snapshot.lastSync||null)){
      onSave({...platform,connections:{...platform.connections,financial:{
        provider:nextProvider,status:nextStatus,lastSync:snapshot.lastSync||undefined
      }}});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[connected,hasError,snapshot?.lastSync]);

  async function complete(mode:'connect'|'update',itemId:string|null,publicToken:string|null,metadata:any,linkSessionRecordId:string){
    if(!config)return;
    if(mode==='connect'){
      if(!publicToken)throw new Error('Plaid completed without returning a public token.');
      const result=await exchangePlaidPublicToken(config,publicToken,{
        institutionId:String(metadata?.institution?.institution_id||''),
        institutionName:String(metadata?.institution?.name||''),
        linkSessionId:String(metadata?.link_session_id||''),
        linkSessionRecordId
      });
      applySnapshot(result.snapshot);
    }else{
      await completePlaidLinkSession(config,linkSessionRecordId,'update',String(metadata?.link_session_id||''));
      applySnapshot(await syncPlaid(config,itemId||undefined));
    }
    sessionStorage.removeItem(SESSION_KEY);
    setLinkExited(false);setRetryItemId(undefined);setError('');
    onMessage(mode==='connect'?'Financial institution connected and synchronized.':'Institution access updated and synchronized.');
  }

  async function open(token:string,mode:'connect'|'update',itemId:string|null,linkSessionRecordId:string,receivedRedirectUri?:string){
    await openPlaidLink({
      token,receivedRedirectUri,
      onSuccess:async(publicToken,metadata)=>{
        setBusy(true);setError('');
        try{await complete(mode,itemId,publicToken,metadata,linkSessionRecordId)}
        catch(err){setError(err instanceof Error?err.message:'Plaid connection could not be completed.')}
        finally{setBusy(false)}
      },
      onExit:(err)=>{
        setLinkExited(true);setRetryItemId(itemId||undefined);
        setError(err?.display_message||'Bank connection was canceled before it finished.');
        setBusy(false);
      }
    });
  }

  async function begin(itemId?:string){
    if(!config?.configured||!session)return;
    if(!mfaReady){onMessage('Verify MFA before connecting external financial accounts.');return}
    setBusy(true);setError('');setLinkExited(false);setRetryItemId(itemId);
    try{
      const result=await createPlaidLinkToken(config,itemId);
      const mode=result.mode,item=result.itemId;
      if(result.warnings?.length)onMessage('Plaid connected with limited product permissions: '+result.warnings.join(', ')+'. VEXUM will show exact product status after sync.');
      sessionStorage.setItem(SESSION_KEY,result.sessionId);
      await open(result.linkToken,mode,item,result.sessionId);
    }catch{setBusy(false);setLinkExited(true);setError('VEXUM could not open the bank connection flow.');}
  }
  async function manualSync(itemId?:string){
    if(!config)return;setBusy(true);setError('');
    try{applySnapshot(await syncPlaid(config,itemId));onMessage('Financial data synchronized.')}
    catch{setError('VEXUM could not sync this financial connection. Try again.')}finally{setBusy(false)}
  }
  async function disconnect(){
    if(!config||!disconnectTarget)return;
    const {itemId,name}=disconnectTarget;
    setBusy(true);setError('');
    try{applySnapshot(await disconnectPlaid(config,itemId));setDisconnectTarget(null);onMessage(name+' removed from VEXUM. Existing VEXUM records were not changed.')}
    catch{setError('VEXUM could not remove this bank connection. Try again.')}finally{setBusy(false)}
  }

  const status=!session?'SIGN IN REQUIRED':!mfaReady?'MFA REQUIRED':configured===false?'NOT CONFIGURED':hasError?'ACTION REQUIRED':connected?'CONNECTED':'NOT CONNECTED';
  const statusClass=connected&&!hasError?'good':'warn';

  const connectDisabled=busy||!session||!mfaReady||configured!==true;
  const connectLabel=connected?'Connect Another Bank':'Connect Bank';
  return <div className={'vxt-connection vxt-plaid-connection '+(mode==='accounts'?'vxf-plaid-manager':'')}>
    <div><span className="icon"><Link2/></span><span><strong>{mode==='accounts'?'Bank Connections':'Financial Accounts'}</strong><small>Connect banks, credit cards, loans, and supported investment accounts securely through Plaid.</small></span></div>
    <aside><span className={'vxt-status '+statusClass}>{status}</span><button className="primary" disabled={connectDisabled} onClick={()=>void begin()}><Plus/>{busy?'Opening…':connectLabel}</button>{connected?<button disabled={busy} onClick={()=>void manualSync()}><RefreshCw/>Sync</button>:null}</aside>
    <footer>
      {!mfaReady&&platform.security.requireMfaForExternalFinancial?<p><LockKeyhole/>Verify MFA before connecting an external financial account.</p>:null}
      {configured===false?<p>Bank connections are unavailable right now. Try again later.</p>:null}
      {snapshot?.items.map(item=><div className="vxt-plaid-item" key={item.item_id}><span><strong>{item.institution_name||'Connected institution'}</strong><small>{item.status==='needs_update'?'Update required':item.status==='error'?'Connection needs attention':'Connected'}{item.last_synced_at?' · synced '+new Date(item.last_synced_at).toLocaleString():''}</small></span><span><button disabled={busy} onClick={()=>void begin(item.item_id)}>Manage</button><button disabled={busy} className="danger" onClick={()=>setDisconnectTarget({itemId:item.item_id,name:item.institution_name||'institution'})}><Trash2/>Remove</button></span></div>)}
      {blocked.length?<p className="vxt-plaid-product-state">Some data types are unavailable for {blocked.length===1?'one connection':'one or more connections'}. Use Manage on the affected institution to review access.</p>:null}
      {error?<div className="vxt-plaid-retry"><p className="vxt-plaid-error">{error}</p>{linkExited?<button disabled={busy||!session||!mfaReady||configured!==true} onClick={()=>void begin(retryItemId)}>Try Again</button>:null}</div>:null}
      <p>VEXUM never receives your bank login credentials. Removing a connection does not delete unrelated VEXUM records.</p>
    </footer>
    <VexumConfirmDialog open={Boolean(disconnectTarget)} onClose={()=>setDisconnectTarget(null)} onConfirm={disconnect} title="Remove financial institution?" description={'Remove '+(disconnectTarget?.name||'this institution')+' from VEXUM? Synced data for this institution will stop updating. Unrelated VEXUM records will remain.'} confirmLabel="Remove Connection" danger busy={busy}/>
  </div>;
}
