import './vexum-reset.css';
import './vexum-platform.css';
import './vexum-onboarding.css';
import './vexum-settings.css';
import './cloud.css';
import './vexum-life.css';
import './vexum-home.css';
import './vexum-portfolio.css';
import './vexum-wishlist.css';
import './vexum-financial.css';
import './vexum-setup.css';
import './vexum-social.css';
import './vexum-sell.css';
import type {Metadata} from 'next';
import {Manrope} from 'next/font/google';

const vexumFont=Manrope({subsets:['latin'],display:'swap',variable:'--font-vexum'});

export const metadata:Metadata={
  title:'VEXUM',
  description:'VEXUM — modular personal operating system for life, ownership, money, space, commerce, community, and fitness.',
  manifest:'/manifest.webmanifest',
  appleWebApp:{capable:true,title:'VEXUM',statusBarStyle:'black-translucent'}
};

export const viewport={
  width:'device-width',
  initialScale:1,
  viewportFit:'cover',
  themeColor:'#050506',
  colorScheme:'dark' as const
};

export default function Layout({children}:{children:React.ReactNode}){
  return <html lang="en"><body className={vexumFont.variable}>{children}</body></html>;
}
