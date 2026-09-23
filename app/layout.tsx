import './vexum-reset.css';
import './vexum-ui.css';
import './vexum-platform.css';
import './vexum-profile.css';
import './vexum-onboarding.css';
import './vexum-settings.css';
import './cloud.css';
import './vexum-life.css';
import './vexum-home.css';
import './vexum-radar.css';
import './vexum-portfolio.css';
import './vexum-wishlist.css';
import './vexum-financial.css';
import './vexum-setup.css';
import './vexum-social.css';
import './vexum-sell.css';
import type {Metadata} from 'next';
import {Inter} from 'next/font/google';

const vexumFont=Inter({subsets:['latin'],display:'swap',weight:['400','500','600','700']});

export const metadata:Metadata={
  title:'VEXUM',
  description:'VEXUM — modular personal operating system for life, ownership, money, space, commerce, community, and fitness.',
  manifest:'/manifest.webmanifest',
  icons:{icon:'/vexum-mark.png',shortcut:'/vexum-mark.png',apple:'/vexum-mark.png'},
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
  return <html lang="en"><body className={vexumFont.className}>{children}</body></html>;
}
