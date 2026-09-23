import {NextResponse} from 'next/server';
import {completePlaidLinkSession,loadPlaidLinkSession,plaidRedirectUri,requirePlaidUser,routeError} from '../../../../lib/plaidServer';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;

export async function POST(req:Request){
  try{
    const auth=await requirePlaidUser(req,true);
    const body=await req.json().catch(()=>({}));
    const action=String(body.action||'');
    const sessionId=String(body.sessionId||'')||undefined;

    if(action==='resume'){
      const receivedRedirectUri=String(body.receivedRedirectUri||'');
      if(!receivedRedirectUri)return NextResponse.json({error:'The Plaid OAuth return URL is required.',code:'PLAID_OAUTH_REDIRECT_REQUIRED'},{status:400});
      const row=await loadPlaidLinkSession(auth.userId,sessionId,receivedRedirectUri);
      return NextResponse.json({
        sessionId:row.id,
        linkToken:row.link_token,
        mode:row.mode,
        itemId:row.plaid_item_id,
        expiresAt:row.expires_at,
        redirectUri:plaidRedirectUri()
      },{headers:{'Cache-Control':'no-store'}});
    }

    if(action==='complete'){
      const requiredId=String(body.sessionId||'');
      const mode=body.mode==='update'?'update':body.mode==='connect'?'connect':undefined;
      if(!requiredId||!mode)return NextResponse.json({error:'Plaid Link session ID and mode are required.',code:'PLAID_LINK_SESSION_REQUIRED'},{status:400});
      await completePlaidLinkSession(auth.userId,requiredId,mode,String(body.plaidLinkSessionId||''));
      return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
    }

    return NextResponse.json({error:'Unsupported Plaid Link session action.',code:'PLAID_LINK_SESSION_ACTION_INVALID'},{status:400});
  }catch(error){
    const e=routeError(error);
    return NextResponse.json(e.body,{status:e.status});
  }
}
