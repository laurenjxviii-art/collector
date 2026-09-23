import {
  createCipheriv,createDecipheriv,createHash,createPublicKey,randomBytes,timingSafeEqual,verify as verifySignature
} from 'node:crypto';

export type PlaidAuth={userId:string;email?:string;aal:string;token:string};
export type PlaidProductState={status:'ready'|'pending'|'blocked'|'error'|'not_applicable';errorCode?:string;message?:string;updatedAt:string};
export type PlaidStoredItem={
  item_id:string;user_id:string;access_token:string;institution_id:string;institution_name:string;cursor:string;
  consent_expiration_time?:string|null;last_synced_at?:string|null;status:string;error_type:string;error_code:string;
  error_message:string;products:unknown;available_products:unknown;billed_products:unknown;product_status:Record<string,PlaidProductState>;
  last_webhook_at?:string|null;last_webhook_code:string;last_link_session_id:string;
};
export type PlaidLinkSessionRow={
  id:string;user_id:string;plaid_item_id:string|null;mode:'connect'|'update';
  status:'pending'|'completed'|'expired'|'superseded'|'cancelled';link_token:string;expires_at:string;
  oauth_state_id:string;received_redirect_uri:string;plaid_link_session_id:string;
  created_at:string;updated_at:string;completed_at?:string|null;
};

export class PlaidRouteError extends Error{
  status:number;code:string;detail?:unknown;
  constructor(status:number,code:string,message:string,detail?:unknown){super(message);this.status=status;this.code=code;this.detail=detail}
}

export class PlaidApiError extends Error{
  errorType:string;errorCode:string;displayMessage:string;requestId:string;status:number;
  constructor(status:number,data:any){
    super(String(data?.error_message||data?.display_message||'Plaid request failed.'));
    this.status=status;
    this.errorType=String(data?.error_type||'PLAID_ERROR');
    this.errorCode=String(data?.error_code||'PLAID_ERROR');
    this.displayMessage=String(data?.display_message||'');
    this.requestId=String(data?.request_id||'');
  }
}

function supabaseUrl(){return (process.env.NEXT_PUBLIC_SUPABASE_URL||'').replace(/\/$/,'')}
function supabasePublicKey(){return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||''}
function serviceKey(){return process.env.SUPABASE_SERVICE_ROLE_KEY||''}
function plaidClientId(){return process.env.PLAID_CLIENT_ID||''}
function plaidSecret(){return process.env.PLAID_SECRET||process.env.PLAID_PRODUCTION_SECRET||''}
export function plaidEnvironment(){
  const value=(process.env.PLAID_ENV||process.env.PLAID_ENVIRONMENT||'production').toLowerCase();
  return value==='sandbox'?'sandbox':'production';
}
function plaidBase(){return plaidEnvironment()==='sandbox'?'https://sandbox.plaid.com':'https://production.plaid.com'}
export function plaidConfigured(){return Boolean(plaidClientId()&&plaidSecret()&&supabaseUrl()&&serviceKey())}

function decodeJwtPayload(token:string){
  try{return JSON.parse(Buffer.from(token.split('.')[1]||'','base64url').toString('utf8')) as Record<string,unknown>}
  catch{return {}}
}

export async function requirePlaidUser(req:Request,requireAal2=true):Promise<PlaidAuth>{
  const auth=req.headers.get('authorization')||'';
  const token=auth.startsWith('Bearer ')?auth.slice(7).trim():'';
  if(!token)throw new PlaidRouteError(401,'AUTH_REQUIRED','Sign in to VEXUM first.');
  const url=supabaseUrl(),key=supabasePublicKey();
  if(!url||!key)throw new PlaidRouteError(503,'SUPABASE_NOT_CONFIGURED','VEXUM cloud authentication is unavailable.');
  const response=await fetch(url+'/auth/v1/user',{headers:{apikey:key,Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new PlaidRouteError(401,'AUTH_INVALID','Your VEXUM session is no longer valid.');
  const user=await response.json() as {id?:string;email?:string};
  if(!user.id)throw new PlaidRouteError(401,'AUTH_INVALID','Your VEXUM session could not be verified.');
  const payload=decodeJwtPayload(token);
  const aal=String(payload.aal||'aal1');
  if(requireAal2&&aal!=='aal2')throw new PlaidRouteError(403,'MFA_REQUIRED','Verify VEXUM two-factor authentication before accessing external financial accounts.');
  return {userId:user.id,email:user.email,aal,token};
}

function encryptionKey(){
  const material=process.env.PLAID_TOKEN_ENCRYPTION_KEY||serviceKey()||plaidSecret();
  if(!material)throw new PlaidRouteError(503,'TOKEN_ENCRYPTION_NOT_CONFIGURED','Secure Plaid token storage is unavailable.');
  return createHash('sha256').update(material).digest();
}
export function encryptPlaidToken(token:string){
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',encryptionKey(),iv);
  const encrypted=Buffer.concat([cipher.update(token,'utf8'),cipher.final()]);
  const tag=cipher.getAuthTag();
  return ['v1',iv.toString('base64url'),tag.toString('base64url'),encrypted.toString('base64url')].join(':');
}
export function decryptPlaidToken(stored:string){
  if(!stored.startsWith('v1:'))return stored;
  const parts=stored.split(':');
  if(parts.length!==4)throw new PlaidRouteError(500,'TOKEN_DECRYPT_FAILED','Stored Plaid token is invalid.');
  const decipher=createDecipheriv('aes-256-gcm',encryptionKey(),Buffer.from(parts[1],'base64url'));
  decipher.setAuthTag(Buffer.from(parts[2],'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(parts[3],'base64url')),decipher.final()]).toString('utf8');
}

export async function plaidRequest<T=any>(path:string,body:Record<string,unknown>):Promise<T>{
  if(!plaidClientId()||!plaidSecret())throw new PlaidRouteError(503,'PLAID_NOT_CONFIGURED','Plaid credentials are not available on the server.');
  const response=await fetch(plaidBase()+path,{
    method:'POST',
    headers:{'Content-Type':'application/json','PLAID-CLIENT-ID':plaidClientId(),'PLAID-SECRET':plaidSecret()},
    body:JSON.stringify(body),
    cache:'no-store',
    signal:AbortSignal.timeout(30000)
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new PlaidApiError(response.status,data);
  return data as T;
}

function serviceHeaders(prefer?:string){
  const key=serviceKey();
  if(!key)throw new PlaidRouteError(503,'SUPABASE_SERVICE_NOT_CONFIGURED','Secure financial storage is unavailable.');
  return {apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})};
}
async function db<T=any>(path:string,init:RequestInit={}):Promise<T>{
  const url=supabaseUrl();
  if(!url)throw new PlaidRouteError(503,'SUPABASE_NOT_CONFIGURED','Secure financial storage is unavailable.');
  const response=await fetch(url+'/rest/v1/'+path,{...init,headers:{...serviceHeaders((init.headers as any)?.Prefer),...(init.headers||{})},cache:'no-store',signal:AbortSignal.timeout(20000)});
  if(!response.ok){
    const data=await response.json().catch(()=>({}));
    throw new PlaidRouteError(502,'FINANCIAL_STORAGE_ERROR',String(data?.message||data?.details||'Financial storage request failed.'),data);
  }
  if(response.status===204)return null as T;
  const text=await response.text();
  return (text?JSON.parse(text):null) as T;
}
async function dbSelect<T=any>(table:string,query:string){return db<T>(table+(query?'?'+query:''))}
async function dbUpsert(table:string,rows:any[],conflict:string){
  if(!rows.length)return;
  await db(table+'?on_conflict='+encodeURIComponent(conflict),{
    method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(rows)
  });
}
async function dbPatch(table:string,query:string,patch:Record<string,unknown>){
  await db(table+'?'+query,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(patch)});
}
async function dbDelete(table:string,query:string){
  await db(table+'?'+query,{method:'DELETE',headers:{Prefer:'return=minimal'}});
}
function eq(value:string){return 'eq.'+encodeURIComponent(value)}
function inList(values:string[]){return 'in.('+values.map(v=>JSON.stringify(v)).join(',')+')'}
function now(){return new Date().toISOString()}
function list(value:unknown){return Array.isArray(value)?value:[]}
function obj(value:unknown){return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,any>:{}}

export async function getStoredPlaidItem(userId:string,itemId:string){
  const rows=await dbSelect<PlaidStoredItem[]>('collector_plaid_items','select=*&user_id='+eq(userId)+'&item_id='+eq(itemId)+'&limit=1');
  return rows?.[0]||null;
}
async function itemAccess(userId:string,itemId:string){
  const item=await getStoredPlaidItem(userId,itemId);
  if(!item)throw new PlaidRouteError(404,'PLAID_ITEM_NOT_FOUND','That connected institution could not be found.');
  return {item,accessToken:decryptPlaidToken(item.access_token)};
}
export async function listStoredPlaidItems(userId:string){
  return dbSelect<PlaidStoredItem[]>('collector_plaid_items','select=*&user_id='+eq(userId)+'&order=created_at.asc');
}


export function plaidRedirectUri(){
  const envValue=(process.env.PLAID_REDIRECT_URI||'').trim();
  // Migrate the pre-OAuth VEXUM Settings callback automatically if it is still present in Vercel.
  const legacyRedirect=/^https:\/\/(?:www\.)?vexum\.app\/settings\/?$/.test(envValue);
  const apexOauth=/^https:\/\/vexum\.app\/plaid\/oauth\/?$/.test(envValue);
  const configured=!envValue||legacyRedirect||apexOauth
    ? 'https://www.vexum.app/plaid/oauth'
    : envValue;
  let parsed:URL;
  try{parsed=new URL(configured)}catch{throw new PlaidRouteError(503,'PLAID_REDIRECT_INVALID','PLAID_REDIRECT_URI must be a valid absolute URL.')}
  if(parsed.search||parsed.hash)throw new PlaidRouteError(503,'PLAID_REDIRECT_INVALID','PLAID_REDIRECT_URI cannot contain query parameters or a hash fragment.');
  const localhost=['localhost','127.0.0.1','::1'].includes(parsed.hostname);
  if(parsed.protocol!=='https:'&&!(plaidEnvironment()==='sandbox'&&localhost)){
    throw new PlaidRouteError(503,'PLAID_REDIRECT_INVALID','Plaid OAuth redirect URIs must use HTTPS outside Sandbox localhost testing.');
  }
  return parsed.toString();
}

async function expireStalePlaidLinkSessions(userId:string){
  const stamp=now();
  await dbPatch(
    'collector_plaid_link_sessions',
    'user_id='+eq(userId)+'&status=eq.pending&expires_at=lt.'+encodeURIComponent(stamp),
    {status:'expired',updated_at:stamp}
  );
}
async function storePlaidLinkSession(userId:string,itemId:string|undefined,mode:'connect'|'update',linkToken:string,expiration:string){
  if(!linkToken||!expiration)throw new PlaidRouteError(502,'PLAID_LINK_TOKEN_INVALID','Plaid did not return a usable Link token.');
  await expireStalePlaidLinkSessions(userId);
  await dbPatch(
    'collector_plaid_link_sessions',
    'user_id='+eq(userId)+'&status=eq.pending',
    {status:'superseded',updated_at:now()}
  );
  const rows=await db<PlaidLinkSessionRow[]>('collector_plaid_link_sessions',{
    method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify([{
      user_id:userId,plaid_item_id:itemId||null,mode,status:'pending',link_token:linkToken,expires_at:expiration,
      oauth_state_id:'',received_redirect_uri:'',plaid_link_session_id:'',created_at:now(),updated_at:now()
    }])
  });
  const row=rows?.[0];
  if(!row?.id)throw new PlaidRouteError(502,'PLAID_LINK_SESSION_STORE_FAILED','VEXUM could not persist the Plaid Link session.');
  return row;
}
function validateReceivedRedirectUri(receivedRedirectUri:string){
  let received:URL,expected:URL;
  try{received=new URL(receivedRedirectUri);expected=new URL(plaidRedirectUri())}
  catch{throw new PlaidRouteError(400,'PLAID_OAUTH_REDIRECT_INVALID','The Plaid OAuth return URL is invalid.')}
  if(received.origin!==expected.origin||received.pathname!==expected.pathname||received.hash){
    throw new PlaidRouteError(400,'PLAID_OAUTH_REDIRECT_MISMATCH','The Plaid OAuth return URL does not match the configured redirect URI.');
  }
  const keys=[...received.searchParams.keys()];
  if(!keys.length||keys.some(key=>key!=='oauth_state_id')||!received.searchParams.get('oauth_state_id')){
    throw new PlaidRouteError(400,'PLAID_OAUTH_STATE_INVALID','The Plaid OAuth return URL is missing a valid oauth_state_id.');
  }
  return {oauthStateId:String(received.searchParams.get('oauth_state_id')||''),receivedRedirectUri:received.toString()};
}
export async function loadPlaidLinkSession(userId:string,sessionId?:string,receivedRedirectUri?:string){
  await expireStalePlaidLinkSessions(userId);
  const query=sessionId
    ? 'select=*&user_id='+eq(userId)+'&id='+eq(sessionId)+'&limit=1'
    : 'select=*&user_id='+eq(userId)+'&status=eq.pending&order=created_at.desc&limit=1';
  const rows=await dbSelect<PlaidLinkSessionRow[]>('collector_plaid_link_sessions',query);
  const row=rows?.[0];
  if(!row)throw new PlaidRouteError(404,'PLAID_LINK_SESSION_NOT_FOUND','No active Plaid Link session was found for this VEXUM account.');
  if(row.status!=='pending')throw new PlaidRouteError(409,'PLAID_LINK_SESSION_INACTIVE','That Plaid Link session is no longer active.');
  if(new Date(row.expires_at).getTime()<=Date.now()){
    await dbPatch('collector_plaid_link_sessions','user_id='+eq(userId)+'&id='+eq(row.id),{status:'expired',updated_at:now()});
    throw new PlaidRouteError(410,'PLAID_LINK_SESSION_EXPIRED','That Plaid Link session expired. Start the bank connection again.');
  }
  if(receivedRedirectUri){
    const validated=validateReceivedRedirectUri(receivedRedirectUri);
    await dbPatch('collector_plaid_link_sessions','user_id='+eq(userId)+'&id='+eq(row.id),{
      oauth_state_id:validated.oauthStateId,received_redirect_uri:validated.receivedRedirectUri,updated_at:now()
    });
    row.oauth_state_id=validated.oauthStateId;
    row.received_redirect_uri=validated.receivedRedirectUri;
  }
  return row;
}
export async function completePlaidLinkSession(userId:string,sessionId:string,expectedMode?:'connect'|'update',plaidLinkSessionId=''){
  const row=await loadPlaidLinkSession(userId,sessionId);
  if(expectedMode&&row.mode!==expectedMode)throw new PlaidRouteError(409,'PLAID_LINK_SESSION_MODE_MISMATCH','The Plaid Link session mode does not match this completion request.');
  await dbPatch('collector_plaid_link_sessions','user_id='+eq(userId)+'&id='+eq(sessionId),{
    status:'completed',plaid_link_session_id:plaidLinkSessionId||row.plaid_link_session_id||'',completed_at:now(),updated_at:now()
  });
  return row;
}

function publicBaseUrl(req?:Request){
  const configured=(process.env.PLAID_PUBLIC_BASE_URL||process.env.NEXT_PUBLIC_SITE_URL||'').replace(/\/$/,'');
  if(configured)return configured;
  if(req){
    const origin=new URL(req.url).origin;
    if(!origin.includes('localhost')&&!origin.includes('127.0.0.1'))return origin;
  }
  if(process.env.VERCEL_PROJECT_PRODUCTION_URL)return 'https://'+process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/,'');
  return 'https://vexum.app';
}
export async function createPlaidLinkToken(req:Request,userId:string,itemId?:string){
  const webhook=(process.env.PLAID_WEBHOOK_URL||'https://www.vexum.app/api/plaid/webhook')
    .replace(/^https:\/\/vexum\.app\//,'https://www.vexum.app/')
    .replace(/\/$/,'');
  const redirect=plaidRedirectUri();
  const base:any={
    user:{client_user_id:userId},
    client_name:'VEXUM',
    country_codes:(process.env.PLAID_COUNTRY_CODES||'US').split(',').map(x=>x.trim()).filter(Boolean),
    language:'en',
    webhook,
    redirect_uri:redirect
  };
  const warnings:string[]=[];
  if(itemId){
    const {item,accessToken}=await itemAccess(userId,itemId);
    base.access_token=accessToken;
    base.update={account_selection_enabled:true};
    const currentProducts=new Set(list(item.products).map(value=>String(value)));
    const additional=['liabilities','investments'].filter(product=>!currentProducts.has(product));
    if(additional.length)base.additional_consented_products=additional;
  }else{
    base.products=['transactions'];
    base.additional_consented_products=['liabilities','investments'];
    base.transactions={days_requested:730};
  }
  let result:any;
  try{result=await plaidRequest<any>('/link/token/create',base)}
  catch(error){
    if(error instanceof PlaidApiError&&base.additional_consented_products&&['PRODUCT_NOT_ENABLED','INVALID_PRODUCT','PRODUCTS_NOT_SUPPORTED','PRODUCT_NOT_SUPPORTED'].includes(error.errorCode)){
      warnings.push(error.errorCode);
      delete base.additional_consented_products;
      result=await plaidRequest<any>('/link/token/create',base);
    }else throw error;
  }
  const linkToken=String(result.link_token||''),expiration=String(result.expiration||'');
  const linkSession=await storePlaidLinkSession(userId,itemId,itemId?'update':'connect',linkToken,expiration);
  return {linkToken,expiration,mode:itemId?'update':'connect',itemId:itemId||null,warnings,sessionId:linkSession.id,redirectUri:redirect};
}

async function institutionName(institutionId:string,fallback=''){
  if(!institutionId)return fallback;
  try{
    const result=await plaidRequest<any>('/institutions/get_by_id',{institution_id:institutionId,country_codes:['US'],options:{include_optional_metadata:false}});
    return String(result?.institution?.name||fallback||institutionId);
  }catch{return fallback||institutionId}
}

function productErrorState(error:unknown):PlaidProductState{
  const at=now();
  if(error instanceof PlaidApiError){
    const blocked=['PRODUCT_NOT_ENABLED','ADDITIONAL_CONSENT_REQUIRED','PRODUCTS_NOT_SUPPORTED','NO_ACCOUNTS','INVALID_PRODUCT','PRODUCT_NOT_SUPPORTED'].includes(error.errorCode);
    const pending=['PRODUCT_NOT_READY','ITEM_PRODUCT_NOT_READY'].includes(error.errorCode);
    return {status:pending?'pending':blocked?'blocked':'error',errorCode:error.errorCode,message:error.message,updatedAt:at};
  }
  return {status:'error',message:error instanceof Error?error.message:'Unknown product error',updatedAt:at};
}
function readyState():PlaidProductState{return {status:'ready',updatedAt:now()}}
function notApplicable():PlaidProductState{return {status:'not_applicable',updatedAt:now()}}

async function refreshItemMetadata(userId:string,itemId:string,accessToken:string,fallbackName=''){
  const response=await plaidRequest<any>('/item/get',{access_token:accessToken});
  const item=obj(response.item);
  const institutionId=String(item.institution_id||'');
  const name=await institutionName(institutionId,fallbackName);
  const error=obj(item.error);
  const patch={
    institution_id:institutionId,
    institution_name:name,
    consent_expiration_time:item.consent_expiration_time||null,
    status:error.error_code?'error':'active',
    error_type:String(error.error_type||''),
    error_code:String(error.error_code||''),
    error_message:String(error.error_message||''),
    products:list(item.products),
    available_products:list(item.available_products),
    billed_products:list(item.billed_products),
    updated_at:now()
  };
  await dbPatch('collector_plaid_items','user_id='+eq(userId)+'&item_id='+eq(itemId),patch);
  return {...item,institution_name:name};
}

async function syncAccounts(userId:string,itemId:string,accessToken:string){
  const response=await plaidRequest<any>('/accounts/balance/get',{access_token:accessToken});
  const accounts=list(response.accounts);
  const rows=accounts.map((account:any)=>({
    account_id:String(account.account_id||''),
    plaid_item_id:itemId,
    user_id:userId,
    name:String(account.name||''),
    official_name:String(account.official_name||''),
    mask:String(account.mask||''),
    type:String(account.type||''),
    subtype:String(account.subtype||''),
    current_balance:account.balances?.current??null,
    available_balance:account.balances?.available??null,
    limit_balance:account.balances?.limit??null,
    iso_currency_code:String(account.balances?.iso_currency_code||'USD'),
    unofficial_currency_code:String(account.balances?.unofficial_currency_code||''),
    persistent_account_id:String(account.persistent_account_id||''),
    last_synced_at:now(),
    updated_at:now(),
    raw:account
  })).filter((row:any)=>row.account_id);
  await dbDelete('collector_plaid_accounts','user_id='+eq(userId)+'&plaid_item_id='+eq(itemId));
  await dbUpsert('collector_plaid_accounts',rows,'account_id');
  return accounts;
}

function txRow(userId:string,itemId:string,tx:any){
  return {
    transaction_id:String(tx.transaction_id||''),
    plaid_item_id:itemId,
    account_id:String(tx.account_id||''),
    user_id:userId,
    name:String(tx.name||''),
    merchant_name:String(tx.merchant_name||''),
    amount:Number(tx.amount||0),
    iso_currency_code:String(tx.iso_currency_code||tx.unofficial_currency_code||'USD'),
    date:tx.date||null,
    authorized_date:tx.authorized_date||null,
    datetime:tx.datetime||null,
    authorized_datetime:tx.authorized_datetime||null,
    pending:Boolean(tx.pending),
    payment_channel:String(tx.payment_channel||''),
    transaction_code:String(tx.transaction_code||''),
    category:list(tx.category),
    personal_finance_category:obj(tx.personal_finance_category),
    counterparties:list(tx.counterparties),
    location:obj(tx.location),
    website:String(tx.website||''),
    logo_url:String(tx.logo_url||''),
    raw:tx,
    updated_at:now()
  };
}

async function syncTransactions(userId:string,item:PlaidStoredItem,accessToken:string){
  const originalCursor=item.cursor||'';
  for(let attempt=0;attempt<2;attempt++){
    let cursor=originalCursor;
    const upserts:any[]=[];const removed:string[]=[];
    try{
      let hasMore=true;
      while(hasMore){
        const body:any={access_token:accessToken,count:500,options:{include_original_description:true,personal_finance_category_version:'v2'}};
        if(cursor)body.cursor=cursor;
        const page=await plaidRequest<any>('/transactions/sync',body);
        for(const tx of [...list(page.added),...list(page.modified)])upserts.push(txRow(userId,item.item_id,tx));
        for(const tx of list(page.removed))if(tx?.transaction_id)removed.push(String(tx.transaction_id));
        cursor=String(page.next_cursor||cursor);
        hasMore=Boolean(page.has_more);
      }
      await dbUpsert('collector_plaid_transactions',upserts,'transaction_id');
      if(removed.length)await dbDelete('collector_plaid_transactions','user_id='+eq(userId)+'&transaction_id='+inList(removed));
      await dbPatch('collector_plaid_items','user_id='+eq(userId)+'&item_id='+eq(item.item_id),{cursor,last_synced_at:now(),updated_at:now()});
      return {cursor,changed:upserts.length,removed:removed.length};
    }catch(error){
      if(error instanceof PlaidApiError&&error.errorCode==='TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION'&&attempt===0)continue;
      throw error;
    }
  }
  throw new Error('Transaction synchronization could not complete.');
}

async function syncRecurring(userId:string,itemId:string,accessToken:string,applicable:boolean){
  if(!applicable)return {state:notApplicable(),count:0};
  try{
    const response=await plaidRequest<any>('/transactions/recurring/get',{access_token:accessToken,options:{personal_finance_category_version:'v2'}});
    const rows=[
      ...list(response.inflow_streams).map((stream:any)=>({stream,direction:'inflow'})),
      ...list(response.outflow_streams).map((stream:any)=>({stream,direction:'outflow'}))
    ].map(({stream,direction}:any)=>({
      user_id:userId,stream_id:String(stream.stream_id||''),plaid_item_id:itemId,account_id:String(stream.account_id||''),
      direction,description:String(stream.description||''),merchant_name:String(stream.merchant_name||''),frequency:String(stream.frequency||''),
      status:String(stream.status||''),average_amount:stream.average_amount?.amount??stream.average_amount??null,
      last_amount:stream.last_amount?.amount??stream.last_amount??null,first_date:stream.first_date||null,last_date:stream.last_date||null,
      personal_finance_category:obj(stream.personal_finance_category),raw:stream,updated_at:now()
    })).filter((row:any)=>row.stream_id);
    await dbDelete('collector_plaid_recurring_streams','user_id='+eq(userId)+'&plaid_item_id='+eq(itemId));
    await dbUpsert('collector_plaid_recurring_streams',rows,'user_id,stream_id');
    return {state:readyState(),count:rows.length};
  }catch(error){return {state:productErrorState(error),count:0}}
}

async function syncLiabilities(userId:string,itemId:string,accessToken:string,applicable:boolean){
  if(!applicable)return {state:notApplicable(),count:0};
  try{
    const response=await plaidRequest<any>('/liabilities/get',{access_token:accessToken});
    const liabilities=obj(response.liabilities);
    const entries:any[]=[];
    for(const [kind,value] of Object.entries(liabilities)){
      for(const liability of list(value)){
        const accountId=String((liability as any).account_id||'');
        if(accountId)entries.push({user_id:userId,account_id:accountId,plaid_item_id:itemId,liability_type:kind,raw:liability,updated_at:now()});
      }
    }
    await dbDelete('collector_plaid_liabilities','user_id='+eq(userId)+'&plaid_item_id='+eq(itemId));
    await dbUpsert('collector_plaid_liabilities',entries,'user_id,account_id');
    return {state:readyState(),count:entries.length};
  }catch(error){return {state:productErrorState(error),count:0}}
}

function dateDaysAgo(days:number){const d=new Date();d.setUTCDate(d.getUTCDate()-days);return d.toISOString().slice(0,10)}
async function syncInvestments(userId:string,itemId:string,accessToken:string,applicable:boolean){
  if(!applicable)return {state:notApplicable(),holdings:0,transactions:0};
  try{
    const holdingsResponse=await plaidRequest<any>('/investments/holdings/get',{access_token:accessToken});
    const securities=list(holdingsResponse.securities).map((security:any)=>({
      user_id:userId,security_id:String(security.security_id||''),name:String(security.name||''),ticker_symbol:String(security.ticker_symbol||''),
      type:String(security.type||''),close_price:security.close_price??null,close_price_as_of:security.close_price_as_of||null,
      iso_currency_code:String(security.iso_currency_code||''),unofficial_currency_code:String(security.unofficial_currency_code||''),raw:security,updated_at:now()
    })).filter((row:any)=>row.security_id);
    const holdings=list(holdingsResponse.holdings).map((holding:any)=>({
      user_id:userId,plaid_item_id:itemId,account_id:String(holding.account_id||''),security_id:String(holding.security_id||''),
      quantity:holding.quantity??null,institution_price:holding.institution_price??null,institution_value:holding.institution_value??null,
      cost_basis:holding.cost_basis??null,iso_currency_code:String(holding.iso_currency_code||''),unofficial_currency_code:String(holding.unofficial_currency_code||''),
      raw:holding,updated_at:now()
    })).filter((row:any)=>row.account_id&&row.security_id);
    await dbUpsert('collector_plaid_securities',securities,'user_id,security_id');
    await dbDelete('collector_plaid_investment_holdings','user_id='+eq(userId)+'&plaid_item_id='+eq(itemId));
    await dbUpsert('collector_plaid_investment_holdings',holdings,'user_id,account_id,security_id');

    let offset=0,total=0;const investmentRows:any[]=[];
    do{
      const response=await plaidRequest<any>('/investments/transactions/get',{
        access_token:accessToken,start_date:dateDaysAgo(730),end_date:new Date().toISOString().slice(0,10),options:{count:500,offset}
      });
      const transactions=list(response.investment_transactions);
      total=Number(response.total_investment_transactions||transactions.length);
      for(const tx of transactions)investmentRows.push({
        user_id:userId,investment_transaction_id:String(tx.investment_transaction_id||''),plaid_item_id:itemId,
        account_id:String(tx.account_id||''),security_id:String(tx.security_id||''),date:tx.date||null,name:String(tx.name||''),
        type:String(tx.type||''),subtype:String(tx.subtype||''),amount:tx.amount??null,quantity:tx.quantity??null,price:tx.price??null,
        fees:tx.fees??null,iso_currency_code:String(tx.iso_currency_code||''),unofficial_currency_code:String(tx.unofficial_currency_code||''),
        raw:tx,updated_at:now()
      });
      offset+=transactions.length;
      if(!transactions.length)break;
    }while(offset<total);
    await dbDelete('collector_plaid_investment_transactions','user_id='+eq(userId)+'&plaid_item_id='+eq(itemId));
    await dbUpsert('collector_plaid_investment_transactions',investmentRows.filter(row=>row.investment_transaction_id),'user_id,investment_transaction_id');
    return {state:readyState(),holdings:holdings.length,transactions:investmentRows.length};
  }catch(error){return {state:productErrorState(error),holdings:0,transactions:0}}
}

async function mergeProductStatus(userId:string,itemId:string,patch:Record<string,PlaidProductState>){
  const item=await getStoredPlaidItem(userId,itemId);
  const current=obj(item?.product_status) as Record<string,PlaidProductState>;
  await dbPatch('collector_plaid_items','user_id='+eq(userId)+'&item_id='+eq(itemId),{product_status:{...current,...patch},updated_at:now()});
}

export async function syncPlaidItem(userId:string,itemId:string,scope:'all'|'transactions'|'recurring'|'liabilities'|'investments'='all'){
  const {item,accessToken}=await itemAccess(userId,itemId);
  let accounts:any[]=[];
  const productStatus:Record<string,PlaidProductState>={};
  try{
    await refreshItemMetadata(userId,itemId,accessToken,item.institution_name);
    accounts=await syncAccounts(userId,itemId,accessToken);
  }catch(error){
    if(error instanceof PlaidApiError&&error.errorCode==='ITEM_LOGIN_REQUIRED'){
      await dbPatch('collector_plaid_items','user_id='+eq(userId)+'&item_id='+eq(itemId),{
        status:'needs_update',error_type:error.errorType,error_code:error.errorCode,error_message:error.message,updated_at:now()
      });
    }
    throw error;
  }
  const hasTransactions=accounts.some((a:any)=>['depository','credit','loan'].includes(String(a.type||'')));
  const hasRecurring=accounts.some((a:any)=>['depository','credit'].includes(String(a.type||'')));
  const hasLiability=accounts.some((a:any)=>['credit','loan'].includes(String(a.type||'')));
  const hasInvestment=accounts.some((a:any)=>String(a.type||'')==='investment');

  if(scope==='all'||scope==='transactions'){
    if(hasTransactions){
      try{await syncTransactions(userId,item,accessToken);productStatus.transactions=readyState()}
      catch(error){productStatus.transactions=productErrorState(error)}
    }else productStatus.transactions=notApplicable();
  }
  if(scope==='all'||scope==='recurring'){
    const result=await syncRecurring(userId,itemId,accessToken,hasRecurring);productStatus.recurring=result.state;
  }
  if(scope==='all'||scope==='liabilities'){
    const result=await syncLiabilities(userId,itemId,accessToken,hasLiability);productStatus.liabilities=result.state;
  }
  if(scope==='all'||scope==='investments'){
    const result=await syncInvestments(userId,itemId,accessToken,hasInvestment);productStatus.investments=result.state;
  }
  await mergeProductStatus(userId,itemId,productStatus);
  await dbPatch('collector_plaid_items','user_id='+eq(userId)+'&item_id='+eq(itemId),{last_synced_at:now(),status:'active',updated_at:now()});
  return productStatus;
}

export async function exchangePublicToken(userId:string,publicToken:string,metadata?:{
  institutionId?:string;institutionName?:string;linkSessionId?:string;linkSessionRecordId?:string
}){
  if(!publicToken)throw new PlaidRouteError(400,'PUBLIC_TOKEN_REQUIRED','Plaid did not return a public token.');
  const linkSessionRecordId=String(metadata?.linkSessionRecordId||'');
  if(!linkSessionRecordId)throw new PlaidRouteError(400,'PLAID_LINK_SESSION_REQUIRED','A server-backed Plaid Link session is required.');
  const linkSession=await loadPlaidLinkSession(userId,linkSessionRecordId);
  if(linkSession.mode!=='connect')throw new PlaidRouteError(409,'PLAID_LINK_SESSION_MODE_MISMATCH','This Plaid Link session is not a new-connection session.');
  const exchange=await plaidRequest<any>('/item/public_token/exchange',{public_token:publicToken});
  const accessToken=String(exchange.access_token||''),itemId=String(exchange.item_id||'');
  if(!accessToken||!itemId)throw new PlaidRouteError(502,'PLAID_EXCHANGE_FAILED','Plaid did not return an access token and Item ID.');
  const encrypted=encryptPlaidToken(accessToken);
  const institutionId=String(metadata?.institutionId||'');
  const institution=await institutionName(institutionId,String(metadata?.institutionName||''));
  await dbUpsert('collector_plaid_items',[{
    item_id:itemId,user_id:userId,access_token:encrypted,institution_id:institutionId,institution_name:institution,cursor:'',
    status:'active',error_type:'',error_code:'',error_message:'',products:[],available_products:[],billed_products:[],
    product_status:{},last_link_session_id:String(metadata?.linkSessionId||''),created_at:now(),updated_at:now()
  }],'item_id');
  try{await refreshItemMetadata(userId,itemId,accessToken,institution)}catch{}
  await completePlaidLinkSession(userId,linkSessionRecordId,'connect',String(metadata?.linkSessionId||''));
  await syncPlaidItem(userId,itemId,'all');
  return itemId;
}

export async function disconnectPlaidItem(userId:string,itemId:string){
  const {accessToken}=await itemAccess(userId,itemId);
  try{await plaidRequest('/item/remove',{access_token:accessToken})}
  catch(error){
    if(!(error instanceof PlaidApiError&&error.errorCode==='ITEM_NOT_FOUND'))throw error;
  }
  for(const table of [
    'collector_plaid_transactions','collector_plaid_accounts','collector_plaid_recurring_streams','collector_plaid_liabilities',
    'collector_plaid_investment_holdings','collector_plaid_investment_transactions'
  ])await dbDelete(table,'user_id='+eq(userId)+'&plaid_item_id='+eq(itemId));
  await dbDelete('collector_plaid_webhook_events','user_id='+eq(userId)+'&plaid_item_id='+eq(itemId));
  await dbDelete('collector_plaid_items','user_id='+eq(userId)+'&item_id='+eq(itemId));
}

export async function loadPlaidSnapshot(userId:string){
  const [
    items,accounts,transactions,recurring,liabilities,securities,holdings,investmentTransactions
  ]=await Promise.all([
    dbSelect<any[]>('collector_plaid_items','select=item_id,institution_id,institution_name,consent_expiration_time,last_synced_at,status,error_type,error_code,error_message,products,available_products,billed_products,product_status,last_webhook_at,last_webhook_code,created_at&user_id='+eq(userId)+'&order=created_at.asc'),
    dbSelect<any[]>('collector_plaid_accounts','select=account_id,plaid_item_id,name,official_name,mask,type,subtype,current_balance,available_balance,limit_balance,iso_currency_code,unofficial_currency_code,persistent_account_id,last_synced_at&user_id='+eq(userId)+'&order=name.asc'),
    dbSelect<any[]>('collector_plaid_transactions','select=transaction_id,plaid_item_id,account_id,name,merchant_name,amount,iso_currency_code,date,authorized_date,datetime,pending,payment_channel,transaction_code,personal_finance_category,website,logo_url&user_id='+eq(userId)+'&order=date.desc&limit=5000'),
    dbSelect<any[]>('collector_plaid_recurring_streams','select=stream_id,plaid_item_id,account_id,direction,description,merchant_name,frequency,status,average_amount,last_amount,first_date,last_date,personal_finance_category&user_id='+eq(userId)+'&order=last_date.desc.nullslast'),
    dbSelect<any[]>('collector_plaid_liabilities','select=account_id,plaid_item_id,liability_type,raw,updated_at&user_id='+eq(userId)),
    dbSelect<any[]>('collector_plaid_securities','select=security_id,name,ticker_symbol,type,close_price,close_price_as_of,iso_currency_code&user_id='+eq(userId)),
    dbSelect<any[]>('collector_plaid_investment_holdings','select=plaid_item_id,account_id,security_id,quantity,institution_price,institution_value,cost_basis,iso_currency_code&user_id='+eq(userId)),
    dbSelect<any[]>('collector_plaid_investment_transactions','select=investment_transaction_id,plaid_item_id,account_id,security_id,date,name,type,subtype,amount,quantity,price,fees,iso_currency_code&user_id='+eq(userId)+'&order=date.desc&limit=500')
  ]);
  const lastSync=items.map(item=>item.last_synced_at).filter(Boolean).sort().at(-1)||null;
  return {configured:plaidConfigured(),environment:plaidEnvironment(),items,accounts,transactions,recurring,liabilities,securities,holdings,investmentTransactions,lastSync};
}

export async function plaidCredentialHealth(){
  if(!plaidConfigured())return {configured:false,environment:plaidEnvironment(),apiReachable:false,errorCode:'PLAID_NOT_CONFIGURED'};
  try{
    await plaidRequest('/institutions/get',{count:1,offset:0,country_codes:['US']});
    return {configured:true,environment:plaidEnvironment(),apiReachable:true,errorCode:''};
  }catch(error){
    return {configured:true,environment:plaidEnvironment(),apiReachable:false,errorCode:error instanceof PlaidApiError?error.errorCode:'PLAID_ERROR'};
  }
}

function b64Json(value:string){return JSON.parse(Buffer.from(value,'base64url').toString('utf8')) as Record<string,any>}
export async function verifyPlaidWebhook(rawBody:string,verification:string){
  if(!verification)throw new PlaidRouteError(401,'PLAID_WEBHOOK_SIGNATURE_REQUIRED','Missing Plaid webhook signature.');
  const parts=verification.split('.');
  if(parts.length!==3)throw new PlaidRouteError(401,'PLAID_WEBHOOK_SIGNATURE_INVALID','Invalid Plaid webhook signature.');
  const header=b64Json(parts[0]);
  if(header.alg!=='ES256'||!header.kid)throw new PlaidRouteError(401,'PLAID_WEBHOOK_SIGNATURE_INVALID','Unsupported Plaid webhook signature.');
  const keyResponse=await plaidRequest<any>('/webhook_verification_key/get',{key_id:String(header.kid)});
  const key=keyResponse.key;
  if(!key||key.alg!=='ES256'||String(key.kid||'')!==String(header.kid)||key.expired_at&&Number(key.expired_at)<Date.now()/1000)throw new PlaidRouteError(401,'PLAID_WEBHOOK_KEY_INVALID','Plaid webhook verification key is invalid or expired.');
  const publicKey=createPublicKey({key,format:'jwk'} as any);
  const valid=verifySignature('sha256',Buffer.from(parts[0]+'.'+parts[1]),{key:publicKey,dsaEncoding:'ieee-p1363'},Buffer.from(parts[2],'base64url'));
  if(!valid)throw new PlaidRouteError(401,'PLAID_WEBHOOK_SIGNATURE_INVALID','Plaid webhook signature could not be verified.');
  const payload=b64Json(parts[1]);
  const iat=Number(payload.iat||0);
  if(!iat||Math.abs(Date.now()/1000-iat)>300)throw new PlaidRouteError(401,'PLAID_WEBHOOK_EXPIRED','Plaid webhook signature is too old.');
  const expected=String(payload.request_body_sha256||'');
  const actual=createHash('sha256').update(rawBody).digest('hex');
  const a=Buffer.from(actual,'hex'),b=Buffer.from(expected,'hex');
  if(a.length!==b.length||!timingSafeEqual(a,b))throw new PlaidRouteError(401,'PLAID_WEBHOOK_BODY_INVALID','Plaid webhook body hash does not match.');
  return payload;
}

async function insertWebhookEvent(userId:string,itemId:string,payload:any){
  const rows=await db<any[]>('collector_plaid_webhook_events',{
    method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify([{
      user_id:userId,plaid_item_id:itemId,webhook_type:String(payload.webhook_type||''),webhook_code:String(payload.webhook_code||''),
      status:'received',payload,received_at:now(),error:''
    }])
  });
  return rows?.[0]?.id as string|undefined;
}
async function finishWebhookEvent(id:string|undefined,status:string,error=''){
  if(!id)return;
  await dbPatch('collector_plaid_webhook_events','id='+eq(id),{status,processed_at:now(),error});
}
export async function processPlaidWebhook(payload:any){
  const itemId=String(payload?.item_id||'');
  if(!itemId)return {ignored:true};
  const rows=await dbSelect<PlaidStoredItem[]>('collector_plaid_items','select=*&item_id='+eq(itemId)+'&limit=1');
  const item=rows?.[0];
  if(!item)return {ignored:true};
  const eventId=await insertWebhookEvent(item.user_id,itemId,payload);
  const type=String(payload.webhook_type||''),code=String(payload.webhook_code||'');
  try{
    await dbPatch('collector_plaid_items','item_id='+eq(itemId),{last_webhook_at:now(),last_webhook_code:code,updated_at:now()});
    if(type==='TRANSACTIONS'&&code==='RECURRING_TRANSACTIONS_UPDATE')await syncPlaidItem(item.user_id,itemId,'recurring');
    else if(type==='TRANSACTIONS'&&['SYNC_UPDATES_AVAILABLE','DEFAULT_UPDATE','HISTORICAL_UPDATE','INITIAL_UPDATE'].includes(code))await syncPlaidItem(item.user_id,itemId,'transactions');
    else if(type==='LIABILITIES')await syncPlaidItem(item.user_id,itemId,'liabilities');
    else if(type==='HOLDINGS'||type==='INVESTMENTS_TRANSACTIONS')await syncPlaidItem(item.user_id,itemId,'investments');
    else if(type==='ITEM'){
      const {accessToken}=await itemAccess(item.user_id,itemId);
      try{await refreshItemMetadata(item.user_id,itemId,accessToken,item.institution_name)}catch(error){
        if(error instanceof PlaidApiError&&error.errorCode==='ITEM_LOGIN_REQUIRED'){
          await dbPatch('collector_plaid_items','item_id='+eq(itemId),{status:'needs_update',error_type:error.errorType,error_code:error.errorCode,error_message:error.message,updated_at:now()});
        }else throw error;
      }
      if(['PENDING_EXPIRATION','USER_PERMISSION_REVOKED'].includes(code)){
        await dbPatch('collector_plaid_items','item_id='+eq(itemId),{status:code==='PENDING_EXPIRATION'?'needs_update':'error',error_code:code,error_message:String(payload.error?.error_message||code),updated_at:now()});
      }
    }
    await finishWebhookEvent(eventId,'processed');
    return {processed:true};
  }catch(error){
    await finishWebhookEvent(eventId,'error',error instanceof Error?error.message:'Webhook processing failed');
    return {processed:false,error:error instanceof Error?error.message:'Webhook processing failed'};
  }
}

export function routeError(error:unknown){
  if(error instanceof PlaidRouteError)return {status:error.status,body:{error:error.message,code:error.code,detail:error.detail}};
  if(error instanceof PlaidApiError)return {status:error.status>=400&&error.status<600?error.status:502,body:{error:error.message,code:error.errorCode,type:error.errorType,requestId:error.requestId}};
  return {status:500,body:{error:error instanceof Error?error.message:'Unexpected Plaid error.',code:'PLAID_INTERNAL_ERROR'}};
}
