'use client';

import {useWorkspace} from '../lib/useWorkspace';
import DesktopCollector from './DesktopCollector';
import MobileCollector from './MobileCollector';

export default function Page(){
  const cloud=useWorkspace();
  if(!cloud.ready){
    return <main className="vexum-boot"><div className="vexum-mark" aria-label="VEXUM">V</div><div className="vexum-boot-copy"><strong>VEXUM</strong><span>Loading your collection</span></div></main>;
  }
  const name=cloud.data.profile?.name||'Collector';
  return <div className="vexum-app">
    <DesktopCollector status={cloud.status} profileName={name} data={cloud.data} update={cloud.update} config={cloud.config} session={cloud.session}/>
    <MobileCollector status={cloud.status} profileName={name} data={cloud.data} update={cloud.update} config={cloud.config} session={cloud.session}/>
  </div>;
}
