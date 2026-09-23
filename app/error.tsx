'use client';

import {AlertTriangle,RefreshCw} from 'lucide-react';

export default function GlobalError({reset}:{error:Error&{digest?:string};reset:()=>void}){
  return <main className="vxui-system-page">
    <section className="vxui-system-card error">
      <AlertTriangle aria-hidden="true"/>
      <span>VEXUM · CONNECTION / RUNTIME ERROR</span>
      <h1>We couldn't load this part of VEXUM.</h1>
      <p>Your workspace data has not been intentionally deleted or changed. Retry the request; if the problem continues, return to a stable section and try again.</p>
      <button className="vxui-system-action" onClick={reset}><RefreshCw/>Try Again</button>
    </section>
  </main>;
}
