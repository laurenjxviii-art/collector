'use client';

import {Bell,Radar as RadarIcon,RefreshCw,SlidersHorizontal} from 'lucide-react';
import {DEMO_HOME_DATA} from '../lib/home';
import {normalizePlatformState} from '../lib/platform';
import {useWorkspace} from '../lib/useWorkspace';
import {VexumBadge} from './VexumUi';

export default function VexumRadar(){
  const workspace=useWorkspace();
  const platform=normalizePlatformState(workspace.data.platform,true);
  const interests=[...platform.collectorCategories,...platform.collectorInterests];
  return <div className="vxr-page">
    <section className="vxr-title vxp-simple-title"><div><span>RADAR</span><h1>Radar</h1></div><div className="vxr-actions"><button><SlidersHorizontal/>Filters</button><button><RefreshCw/>Refresh</button></div></section>
    <section className="vxr-context vx-panel"><RadarIcon/><div><strong>{interests.length?interests.slice(0,5).join(' · '):'No collection niches selected yet'}</strong><span>{interests.length?'Radar will use these interests when live providers are connected.':'Choose collecting niches in onboarding or Settings to personalize Radar.'}</span></div></section>
    <div className="vxr-grid">{DEMO_HOME_DATA.radar.map(row=><article className="vx-panel vxr-card" key={row[1]}>
      <header><VexumBadge tone={row[0]==='RESTOCK'?'success':row[0]==='DROP'?'danger':'info'}>{row[0]}</VexumBadge><VexumBadge tone="warning">DEMO</VexumBadge></header>
      <div><strong>{row[1]}</strong><span>{row[3]}</span></div><b>{row[2]}</b>
    </article>)}</div>
    <section className="vxr-empty vx-panel"><Bell/><div><strong>Live Radar providers are not connected yet.</strong><span>This destination is now part of the app shell. Real restocks, drops, preorders, releases, and alert rules can connect here without changing navigation again.</span></div></section>
  </div>;
}
