'use client';

import {useWorkspace} from '../lib/useWorkspace';
import MobileCollector from './MobileCollector';
import DesktopCollector from './DesktopCollector';
import './desktop-collector.css';

export default function Page(){
  const cloud=useWorkspace();
  if(!cloud.ready)return <div className="min-h-screen grid place-items-center bg-background text-foreground">Loading Collector…</div>;
  return <>
    <MobileCollector status={cloud.status} profileName={cloud.data.profile?.name||'XVIIITCG'} data={cloud.data} update={cloud.update} config={cloud.config} session={cloud.session}/>
    <DesktopCollector status={cloud.status} profileName={cloud.data.profile?.name||'XVIIITCG'} data={cloud.data} update={cloud.update} config={cloud.config} session={cloud.session}/>
  </>;
}
