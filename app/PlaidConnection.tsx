'use client';

import {useEffect,useState} from 'react';
import {Link2,LockKeyhole,RefreshCw,Unplug} from 'lucide-react';
import type {CloudConfig,Session} from '../lib/cloud';
import {VexumConfirmDialog} from './VexumUi';
import type {PlatformState} from '../lib/platform';
import {
  completePlaidLinkSession,createPlaidLinkToken,disconnectPlaid,exchangePlaidPublicToken,loadPlaidSnapshot,openPlaidLink,plaidBlockedProducts,syncPlaid,
  type PlaidSnapshot
} from '../lib/plaidClient';

const SESSION_KEY='vexum.plaid.sessionId';

export default function PlaidConnection({config,session,platform,onSave,onMessage}:{
  config:CloudConfig|null;session:Session|null;platform:PlatformState;onSave:(p:PlatformState)=>void;onMessage:(message:string)=>void;
}){
  const [snapshot,setSnapshot]=useState<PlaidSnapshot|null>(null);
  const [configured,setConfigured]=useState<boolean|null>(null);
  const [environment,setEnvironment]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [mfaTick,setMfaTick]=useState(0);
  const [disconnectTarget,setDisconnectTarget]=useState<{itemId:string;name:string}|null>(null);
  const mfaReady=platform.security.mfaStatus==='verified';
  const connected=Boolean(snapshot?.items?.length);
  const hasError=Boolean(snapshot?.items?.some(item=>item.status==='error'||item.status==='needs_update'));
  const blocked=plaidBlockedProducts(snapshot);

  async function refresh(){
    if(!config?.configured||!session||!mfaReady)return;
    try{
      const next=await loadPlaidSnapshot(config);setSnapshot(next);setConfigured(next.configured);setEnvironment(next.environment);
    }catch(err){setError(err instanceof Error?err.message:'Unable to read Plaid status.')}
  }

  useEffect(()=>{
    fetch('/api/plaid/health',{cache:'no-store'}).then(r=>r.json()).then(data=>{setConfigured(Boolean(data.configured));setEnvironment(String(data.environment||''))}).catch(()=>setConfigured(false));
  },[]);
  useEffect(()=>{const verified=()=>setMfaTick(value=>value+1);window.addEventListener('vexum.mfa.verified',verified);return()=>window.removeEventListener('vexum.mfa.verified',verified)},[]);
  useEffect(()=>{void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[config?.configured,session?.user.id,mfaReady,mfaTick]);

  useEffect(()=>{
    if(!snapshot)return;
    const nextStatus=hasError?'error':connected?'connected':'not_connected';
    const current=platform.connections.financial;
    const nextProvider=connected?'plaid':'manual';
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
      setSnapshot(result.snapshot);
    }else{
      await completePlaidLinkSession(config,linkSessionRecordId,'update',String(metadata?.link_session_id||''));
      setSnapshot(await syncPlaid(config,itemId||undefined));
    }
    sessionStorage.removeItem(SESSION_KEY);
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
        if(err)setError(err.display_message||err.error_message||err.error_code||'Plaid Link closed with an error.');
        setBusy(false);
      }
    });
  }

  async function begin(itemId?:string){
    if(!config?.configured||!session)return;
    if(!mfaReady){onMessage('Verify MFA before connecting external financial accounts.');return}
    setBusy(true);setError('');
    try{
      const result=await createPlaidLinkToken(config,itemId);
      const mode=result.mode,item=result.itemId;
      if(result.warnings?.length)onMessage('Plaid connected with limited product permissions: '+result.warnings.join(', ')+'. VEXUM will show exact product status after sync.');
      sessionStorage.setItem(SESSION_KEY,result.sessionId);
      await open(result.linkToken,mode,item,result.sessionId);
    }catch(err){setBusy(false);setError(err instanceof Error?err.message:'Unable to start Plaid Link.')}
  }
  async function manualSync(itemId?:string){
    if(!config)return;setBusy(true);setError('');
    try{setSnapshot(await syncPlaid(config,itemId));onMessage('Plaid financial data synchronized.')}
    catch(err){setError(err instanceof Error?err.message:'Plaid sync failed.')}finally{setBusy(false)}
  }
  async function disconnect(){
    if(!config||!disconnectTarget)return;
    const {itemId,name}=disconnectTarget;
    setBusy(true);setError('');
    try{setSnapshot(await disconnectPlaid(config,itemId));setDisconnectTarget(null);onMessage(name+' disconnected. Manual Financial data was not changed.')}
    catch(err){setError(err instanceof Error?err.message:'Unable to disconnect institution.')}finally{setBusy(false)}
  }

  const status=!session?'SIGN IN REQUIRED':!mfaReady?'MFA REQUIRED':configured===false?'NOT CONFIGURED':hasError?'ACTION REQUIRED':connected?'CONNECTED':'NOT CONNECTED';
  const statusClass=connected&&!hasError?'good':'warn';

  return <div className="vxt-connection vxt-plaid-connection">
    <div><span className="icon"><Link2/></span><span><strong>Financial Accounts</strong><small>Secure Plaid sync for balances, transactions, recurring activity, liabilities, and investments.</small></span></div>
    <aside><span className={'vxt-status '+statusClass}>{status}</span>{!connected?<button disabled={busy||!session||!mfaReady||configured!==true} onClick={()=>void begin()}>{busy?'Opening…':'Connect with Plaid'}</button>:<button disabled={busy} onClick={()=>void manualSync()}><RefreshCw/>Sync now</button>}</aside>
    <footer>
      {!mfaReady&&platform.security.requireMfaForExternalFinancial?<p><LockKeyhole/>MFA must be verified before an external financial connection can be enabled.</p>:null}
      {configured===false?<p>Plaid server credentials were not detected by this deployment.</p>:null}
      {configured&&environment?<p>Plaid environment: {environment.toUpperCase()}. Access tokens stay server-side and are encrypted before storage.</p>:null}
      {snapshot?.items.map(item=><div className="vxt-plaid-item" key={item.item_id}><span><strong>{item.institution_name||'Connected institution'}</strong><small>{item.status==='needs_update'?'Login/update required':item.status==='error'?(item.error_code||'Connection error'):'Connected'}{item.last_synced_at?' · synced '+new Date(item.last_synced_at).toLocaleString():''}</small></span><span><button disabled={busy} onClick={()=>void begin(item.item_id)}>Reconnect</button><button disabled={busy} className="danger" onClick={()=>setDisconnectTarget({itemId:item.item_id,name:item.institution_name||'institution'})}><Unplug/>Disconnect</button></span></div>)}
      {blocked.map(row=><p className="vxt-plaid-product-state" key={row.itemId+row.product}><strong>{row.institution} · {row.product}</strong>: {row.state.status.toUpperCase()}{row.state.errorCode?' · '+row.state.errorCode:''}{row.state.message?' — '+row.state.message:''}</p>)}
      {error?<p className="vxt-plaid-error">{error}</p>:null}
      <p>Manual Financial records remain separate and are never deleted by Plaid connect, sync, reconnect, or disconnect.</p>
    </footer>
    <VexumConfirmDialog open={Boolean(disconnectTarget)} onClose={()=>setDisconnectTarget(null)} onConfirm={disconnect} title="Disconnect financial institution?" description={'Disconnect '+(disconnectTarget?.name||'this institution')+' from VEXUM? Synced Plaid data for this institution will be removed, but manual Financial data will stay.'} confirmLabel="Disconnect" danger busy={busy}/>
  </div>;
}
