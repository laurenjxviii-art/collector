import './collectr.css';
import './polish.css';
import './cover-polish.css';
import './experience.css';
import './fixes.css';
import './brand.css';
import './mobile-reference.css';
import './nav-hotfix.css';
import './collection-edit.css';
import type {Metadata} from 'next';

export const metadata:Metadata={
  title:'Collector',
  description:'Collection manager.',
  manifest:'/manifest.webmanifest',
  appleWebApp:{capable:true,title:'Collector',statusBarStyle:'black-translucent'},
  icons:{icon:'/icons/icon-192.png',apple:'/icons/apple-touch-icon.png'}
};

export const viewport={
  width:'device-width',
  initialScale:1,
  maximumScale:1,
  viewportFit:'cover',
  themeColor:'#000000',
  colorScheme:'dark' as const
};

export default function Layout({children}:{children:React.ReactNode}){
  return <html lang="en"><body>{children}</body></html>
}
