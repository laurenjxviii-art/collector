'use client';

import {freshSession,type CloudConfig} from './cloud';
import type {FinancialAccount,FinancialData,FinancialTransaction} from './financial';

export type PlaidProductState={status:'ready'|'pending'|'blocked'|'error'|'not_applicable';errorCode?:string;message?:string;updatedAt:string};
export type PlaidSafeItem={
  item_id:string;institution_id:string;institution_name:string;consent_expiration_time?:string|null;last_synced_at?:string|null;
  status:string;error_type:string;error_code:string;error_message:string;products:unknown[];available_products:unknown[];billed_products:unknown[];
  product_status:Record<string,PlaidProductState>;last_webhook_at?:string|null;last_webhook_code:string;created_at:string;
};
export type PlaidSafeAccount={
  account_id:string;plaid_item_id:string;name:string;official_name:string;mask:string;type:string;subtype:string;
  current_balance:number|null;available_balance:number|null;limit_balance:number|null;iso_currency_code:string;
  unofficial_currency_code:string;persistent_account_id:string;last_synced_at?:string|null;
};
export type PlaidSafeTransaction={
  transaction_id:string;plaid_item_id:string;account_id:string;name:string;merchant_name:string;amount:number;iso_currency_code:string;
  date:string|null;authorized_date:string|null;datetime:string|null;pending:boolean;payment_channel:string;transaction_code:string;
  personal_finance_category?:{primary?:string;detailed?:string;confidence_level?:string};website:string;logo_url:string;
};
export type PlaidRecurringStream={
  stream_id:string;plaid_item_id:string;account_id:string;direction:'inflow'|'outflow';description:string;merchant_name:string;
  frequency:string;status:string;average_amount:number|null;last_amount:number|null;first_date:string|null;last_date:string|null;
  personal_finance_category?:{primary?:string;detailed?:string};
};
export type PlaidLiability={account_id:string;plaid_item_id:string;liability_type:string;raw:Record<string,any>;updated_at:string};
export type PlaidSecurity={security_id:string;name:string;ticker_symbol:string;type:string;close_price:number|null;close_price_as_of:string|null;iso_currency_code:string};
export type PlaidHolding={plaid_item_id:string;account_id:string;security_id:string;quantity:number|null;institution_price:number|null;institution_value:number|null;cost_basis:number|null;iso_currency_code:string};
export type PlaidInvestmentTransaction={investment_transaction_id:string;plaid_item_id:string;account_id:string;security_id:string;date:string|null;name:string;type:string;subtype:string;amount:number|null;quantity:number|null;price:number|null;fees:number|null;iso_currency_code:string};
export type PlaidSnapshot={
  configured:boolean;environment:'production'|'sandbox';items:PlaidSafeItem[];accounts:PlaidSafeAccount[];transactions:PlaidSafeTransaction[];
  recurring:PlaidRecurringStream[];liabilities:PlaidLiability[];securities:PlaidSecurity[];holdings:PlaidHolding[];
  investmentTransactions:PlaidInvestmentTransaction[];lastSync:string|null;
};
export type PlaidLinkSessionResume={
  sessionId:string;linkToken:string;mode:'connect'|'update';itemId:string|null;expiresAt:string;redirectUri:string;
};

async function plaidFetch<T>(config:CloudConfig,path:string,init:RequestInit={}):Promise<T>{
  const session=await freshSession(config);
  const response=await fetch(path,{
    ...init,
    headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token,...(init.headers||{})},
    cache:'no-store'
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    const error=new Error(data.error||('Plaid request failed ('+response.status+')')) as Error&{code?:string};
    error.code=data.code;throw error;
  }
  return data as T;
}

export function loadPlaidSnapshot(config:CloudConfig){return plaidFetch<PlaidSnapshot>(config,'/api/plaid/status')}
export function createPlaidLinkToken(config:CloudConfig,itemId?:string){
  return plaidFetch<{linkToken:string;expiration:string;mode:'connect'|'update';itemId:string|null;warnings:string[];sessionId:string;redirectUri:string}>(
    config,'/api/plaid/link-token',{method:'POST',body:JSON.stringify(itemId?{itemId}:{})}
  );
}
export function resumePlaidLinkSession(config:CloudConfig,sessionId:string|undefined,receivedRedirectUri:string){
  return plaidFetch<PlaidLinkSessionResume>(config,'/api/plaid/link-session',{
    method:'POST',body:JSON.stringify({action:'resume',sessionId:sessionId||'',receivedRedirectUri})
  });
}
export function completePlaidLinkSession(config:CloudConfig,sessionId:string,mode:'connect'|'update',plaidLinkSessionId=''){
  return plaidFetch<{ok:true}>(config,'/api/plaid/link-session',{
    method:'POST',body:JSON.stringify({action:'complete',sessionId,mode,plaidLinkSessionId})
  });
}
export function exchangePlaidPublicToken(config:CloudConfig,publicToken:string,metadata?:{
  institutionId?:string;institutionName?:string;linkSessionId?:string;linkSessionRecordId?:string
}){
  return plaidFetch<{itemId:string;snapshot:PlaidSnapshot}>(config,'/api/plaid/exchange',{method:'POST',body:JSON.stringify({publicToken,...metadata})});
}
export function syncPlaid(config:CloudConfig,itemId?:string){
  return plaidFetch<PlaidSnapshot>(config,'/api/plaid/sync',{method:'POST',body:JSON.stringify(itemId?{itemId}:{})});
}
export function disconnectPlaid(config:CloudConfig,itemId:string){
  return plaidFetch<PlaidSnapshot>(config,'/api/plaid/disconnect',{method:'POST',body:JSON.stringify({itemId})});
}

type PlaidLinkMetadata={
  institution?:{institution_id?:string;name?:string}|null;
  link_session_id?:string;
  accounts?:Array<{id:string;name?:string;mask?:string;type?:string;subtype?:string}>;
};
type PlaidLinkError={error_code?:string;error_message?:string;error_type?:string;display_message?:string}|null;
type PlaidHandler={open:()=>void;exit:(options?:any)=>void;destroy:()=>void};
type PlaidFactory={create:(options:{
  token:string;receivedRedirectUri?:string;
  onSuccess:(publicToken:string|null,metadata:PlaidLinkMetadata)=>void;
  onExit:(error:PlaidLinkError,metadata:PlaidLinkMetadata)=>void;
  onEvent?:(eventName:string,metadata:any)=>void;
})=>PlaidHandler};

declare global{interface Window{Plaid?:PlaidFactory}}
let plaidScript:Promise<PlaidFactory>|null=null;
async function ensurePlaid(){
  if(window.Plaid)return window.Plaid;
  if(plaidScript)return plaidScript;
  plaidScript=new Promise<PlaidFactory>((resolve,reject)=>{
    const existing=document.querySelector<HTMLScriptElement>('script[data-vexum-plaid-link]');
    const ready=()=>window.Plaid?resolve(window.Plaid):reject(new Error('Plaid Link did not initialize.'));
    if(existing){existing.addEventListener('load',ready,{once:true});existing.addEventListener('error',()=>reject(new Error('Plaid Link could not load.')),{once:true});return}
    const script=document.createElement('script');script.src='https://cdn.plaid.com/link/v2/stable/link-initialize.js';script.async=true;script.dataset.vexumPlaidLink='1';
    script.onload=ready;script.onerror=()=>reject(new Error('Plaid Link could not load.'));document.head.appendChild(script);
  });
  return plaidScript;
}
export async function openPlaidLink(options:{
  token:string;receivedRedirectUri?:string;
  onSuccess:(publicToken:string|null,metadata:PlaidLinkMetadata)=>void|Promise<void>;
  onExit:(error:PlaidLinkError,metadata:PlaidLinkMetadata)=>void;
  onEvent?:(eventName:string,metadata:any)=>void;
}){
  const Plaid=await ensurePlaid();
  const handler=Plaid.create({
    token:options.token,receivedRedirectUri:options.receivedRedirectUri,
    onSuccess:(publicToken,metadata)=>{void options.onSuccess(publicToken,metadata)},
    onExit:options.onExit,onEvent:options.onEvent
  });
  handler.open();
  return handler;
}

function titleCase(value:string){
  return value.toLowerCase().split('_').map(part=>part?part[0].toUpperCase()+part.slice(1):part).join(' ');
}
function accountType(type:string,subtype:string):FinancialAccount['type']{
  const t=type.toLowerCase(),s=subtype.toLowerCase();
  if(t==='depository')return s.includes('savings')?'savings':'checking';
  if(t==='credit')return 'credit_card';
  if(t==='investment')return 'investment';
  if(t==='loan'){
    if(s.includes('student'))return 'student_loan';
    if(s.includes('mortgage'))return 'mortgage';
    if(s.includes('auto'))return 'auto_loan';
    return 'personal_loan';
  }
  return ['brokerage','cash management'].some(x=>s.includes(x))?'other_asset':'other_asset';
}
function liabilityNumbers(liability?:PlaidLiability):{apr?:number;min?:number;due?:string;limit?:number}{
  if(!liability)return {};
  const raw=liability.raw||{};
  if(liability.liability_type==='credit'){
    const aprs=Array.isArray(raw.aprs)?raw.aprs:[];
    const purchase=aprs.find((x:any)=>String(x.apr_type||'').toLowerCase().includes('purchase'))||aprs[0];
    return {apr:purchase?.apr_percentage,min:raw.minimum_payment_amount,due:raw.next_payment_due_date,limit:undefined};
  }
  if(liability.liability_type==='mortgage')return {apr:raw.interest_rate?.percentage,min:raw.next_monthly_payment,due:raw.next_payment_due_date};
  if(liability.liability_type==='student')return {apr:raw.interest_rate_percentage,min:raw.minimum_payment_amount,due:raw.next_payment_due_date};
  return {};
}

export function plaidFinancialData(snapshot:PlaidSnapshot|null):FinancialData{
  if(!snapshot)return {accounts:[],transactions:[],budgets:[],bills:[],goals:[]};
  const itemNames=new Map(snapshot.items.map(item=>[item.item_id,item.institution_name||'Connected institution']));
  const liabilities=new Map(snapshot.liabilities.map(row=>[row.account_id,row]));
  const created=new Date().toISOString();
  const accounts:FinancialAccount[]=snapshot.accounts.map(account=>{
    const liability=liabilityNumbers(liabilities.get(account.account_id));
    return {
      id:'plaid:'+account.account_id,
      type:accountType(account.type,account.subtype),
      name:account.official_name||account.name||'Connected account',
      institution:itemNames.get(account.plaid_item_id)||'Plaid',
      currentBalance:Number(account.current_balance||0),
      availableBalance:account.available_balance===null?undefined:Number(account.available_balance),
      currency:(account.iso_currency_code||'USD')==='USD'?'USD':'USD',
      isManual:false,isConnected:true,
      apr:typeof liability.apr==='number'?liability.apr:undefined,
      creditLimit:account.limit_balance===null?undefined:Number(account.limit_balance),
      minimumPayment:typeof liability.min==='number'?liability.min:undefined,
      dueDay:liability.due?new Date(String(liability.due)+'T12:00:00').getDate():undefined,
      createdAt:created,updatedAt:account.last_synced_at||created
    };
  });
  const transactions:FinancialTransaction[]=snapshot.transactions.map(tx=>{
    const pfc=tx.personal_finance_category||{};
    const primary=String(pfc.primary||'').toUpperCase();
    const transfer=primary.startsWith('TRANSFER_');
    const direction=transfer?'transfer':tx.amount<0?'income':'expense';
    return {
      id:'plaid:'+tx.transaction_id,accountId:'plaid:'+tx.account_id,date:tx.date||tx.authorized_date||created.slice(0,10),
      amount:Math.abs(Number(tx.amount||0)),direction,merchant:tx.merchant_name||tx.name||'Transaction',
      category:pfc.primary?titleCase(String(pfc.primary)):'Uncategorized',
      subcategory:pfc.detailed?titleCase(String(pfc.detailed)):'',
      description:tx.name||'',isRecurring:false,isHobby:false,createdAt:created,updatedAt:tx.datetime||created
    };
  });
  return {accounts,transactions,budgets:[],bills:[],goals:[]};
}

export function plaidBlockedProducts(snapshot:PlaidSnapshot|null){
  if(!snapshot)return [];
  const rows:Array<{itemId:string;institution:string;product:string;state:PlaidProductState}>=[];
  for(const item of snapshot.items){
    for(const [product,state] of Object.entries(item.product_status||{})){
      if(state.status==='blocked'||state.status==='error'||state.status==='pending')rows.push({itemId:item.item_id,institution:item.institution_name||'Institution',product,state});
    }
  }
  return rows;
}
