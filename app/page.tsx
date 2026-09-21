'use client';

import {useWorkspace} from '../lib/useWorkspace';
import DesktopCollector from './DesktopCollector';

export default function Page(){
  const cloud=useWorkspace();

  if(!cloud.ready){
    return <main className="vexum-boot">
      <div className="vexum-mark" aria-label="VEXUM">V</div>
      <div className="vexum-boot-copy">
        <strong>VEXUM</strong>
        <span>Loading your collection</span>
      </div>
    </main>;
  }

  return <div className="vexum-app">
    <DesktopCollector
      status={cloud.status}
      profileName={cloud.data.profile?.name||'Collector'}
      data={cloud.data}
      update={cloud.update}
      config={cloud.config}
      session={cloud.session}
    />
    <div className="vexum-mobile-hold" aria-hidden="true">
      <div className="vexum-mark">V</div>
      <strong>VEXUM</strong>
      <span>Desktop rebuild in progress.</span>
    </div>
  </div>;
}
