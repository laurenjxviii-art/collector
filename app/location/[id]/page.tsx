import VexumLocation from '../../VexumLocation';

export default async function LocationRoute({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  return <VexumLocation id={id}/>;
}
