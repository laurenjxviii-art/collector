'use client';

import {useEffect,useRef,useState} from 'react';
import {useWorkspace} from '../../../lib/useWorkspace';
import {
  completePlaidLinkSession,exchangePlaidPublicToken,openPlaidLink,resumePlaidLinkSession,syncPlaid
} from '../../../lib/plaidClient';

const SESSION_KEY='vexum.plaid.sessionId';

export default function PlaidOAuthPage(){
  const workspace=useWorkspace();
  const started=useRef(false);
  const [status,setStatus]=useState('Resuming secure bank connection…');
  const [error,setError]=useState('');

  useEffect(()=>{
    if(started.current||!workspace.ready)return;
    if(!workspace.config?.configured){setError('VEXUM cloud configuration is unavailable. Return to Settings and try again.');return}
    if(!workspace.session){setError('Your VEXUM session is not available in this browser. Sign in again, then restart the bank connection from Settings.');return}

    const receivedRedirectUri=location.href;
    const oauthStateId=new URL(receivedRedirectUri).searchParams.get('oauth_state_id');
    if(!oauthStateId){setError('Plaid did not return a valid OAuth state. Restart the bank connection from Settings.');return}

    started.current=true;
    const config=workspace.config;

    void (async()=>{
      try{
        const preferredSessionId=sessionStorage.getItem(SESSION_KEY)||undefined;
        const resumed=await resumePlaidLinkSession(config,preferredSessionId,receivedRedirectUri);
        sessionStorage.setItem(SESSION_KEY,resumed.sessionId);
        setStatus('Bank authorization received. Finishing connection…');

        await openPlaidLink({
          token:resumed.linkToken,
          receivedRedirectUri,
          onSuccess:async(publicToken,metadata)=>{
            try{
              setStatus('Securing and synchronizing financial data…');
              if(resumed.mode==='connect'){
                if(!publicToken)throw new Error('Plaid completed without returning a public token.');
                await exchangePlaidPublicToken(config,publicToken,{
                  institutionId:String(metadata?.institution?.institution_id||''),
                  institutionName:String(metadata?.institution?.name||''),
                  linkSessionId:String(metadata?.link_session_id||''),
                  linkSessionRecordId:resumed.sessionId
                });
              }else{
                await completePlaidLinkSession(config,resumed.sessionId,'update',String(metadata?.link_session_id||''));
                await syncPlaid(config,resumed.itemId||undefined);
              }
              sessionStorage.removeItem(SESSION_KEY);
              location.replace('/settings?section=connections&plaid='+(resumed.mode==='connect'?'connected':'updated'));
            }catch(err){
              setError(err instanceof Error?err.message:'VEXUM could not finish the Plaid connection.');
            }
          },
          onExit:(err)=>{
            if(err)setError(err.display_message||err.error_message||err.error_code||'Plaid Link closed with an error.');
            else setError('Plaid Link was closed before the connection finished.');
          }
        });
      }catch(err){
        setError(err instanceof Error?err.message:'VEXUM could not resume the Plaid OAuth flow.');
      }
    })();
  },[workspace.ready,workspace.config?.configured,workspace.session?.user.id]);

  return <main className="vxt-page">
    <section className="vx-panel" style={{maxWidth:680,margin:'8vh auto',padding:32}}>
      <span style={{fontSize:12,fontWeight:700,letterSpacing:'.12em'}}>VEXUM · PLAID</span>
      <h1 style={{margin:'10px 0 8px'}}>Secure bank connection</h1>
      <p style={{margin:0,opacity:.72}}>{error||status}</p>
      {error?<button style={{marginTop:20}} onClick={()=>location.assign('/settings?section=connections')}>Return to Connected Apps</button>:null}
    </section>
  </main>;
}
