import VexumApp from '../../../VexumApp';

export default async function SearchProductRoute({
  params,
  searchParams
}:{
  params:Promise<{id:string}>;
  searchParams:Promise<{q?:string|string[]}>
}){
  const route=await params;
  const query=await searchParams;
  const q=Array.isArray(query.q)?query.q[0]||'':query.q||'';
  return <VexumApp initialView="search" initialSearchQuery={q} initialProductId={route.id}/>;
}
