import {freshSession,type CloudConfig,type Session} from './cloud';

export async function supabaseRest<T=unknown>(
  config:CloudConfig,
  session:Session|null,
  path:string,
  init:RequestInit={},
  prefer?:string
):Promise<T>{
  const live=session?await freshSession(config):null;
  const response=await fetch(config.url+path,{
    ...init,
    headers:{
      apikey:config.key,
      'Content-Type':'application/json',
      ...(live?{Authorization:'Bearer '+live.access_token}:{}),
      ...(prefer?{Prefer:prefer}:{}),
      ...init.headers
    },
    cache:'no-store',
    signal:AbortSignal.timeout(20000)
  });
  if(!response.ok){
    const error=await response.json().catch(()=>({}));
    throw new Error(error.message||error.details||error.hint||error.error_description||('Request failed ('+response.status+')'));
  }
  if(response.status===204)return null as T;
  const text=await response.text();
  return (text?JSON.parse(text):null) as T;
}

export function postgrestIn(values:string[]){
  return 'in.('+values.map(value=>'"'+value.replaceAll('"','')+'"').join(',')+')';
}

export function qs(params:Record<string,string|number|boolean|undefined>){
  const query=new URLSearchParams();
  Object.entries(params).forEach(([key,value])=>{if(value!==undefined)query.set(key,String(value))});
  return query.toString();
}
