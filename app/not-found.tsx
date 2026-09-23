import Link from 'next/link';
import {ArrowLeft,SearchX} from 'lucide-react';

export default function NotFound(){
  return <main className="vxui-system-page">
    <section className="vxui-system-card">
      <SearchX aria-hidden="true"/>
      <span>404 · NOT FOUND</span>
      <h1>This page isn't in VEXUM.</h1>
      <p>The route may have moved, or the link may no longer exist. Your workspace data has not been changed.</p>
      <Link className="vxui-system-action" href="/"><ArrowLeft/>Return Home</Link>
    </section>
  </main>;
}
