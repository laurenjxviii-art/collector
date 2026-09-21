import VexumApp from '../VexumApp';

export default async function SearchRoute({
  searchParams
}:{
  searchParams:Promise<{q?:string|string[]}>
}){
  const params=await searchParams;
  const q=Array.isArray(params.q)?params.q[0]||'':params.q||'';
  return <VexumApp initialView="search" initialSearchQuery={q}/>;
}
