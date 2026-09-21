import './vexum-shell.css';
import './desktop-collector.css';
import type {Metadata} from 'next';

export const metadata:Metadata={
  title:'VEXUM',
  description:'Track, value, organize, and understand everything you collect.',
  manifest:'/manifest.webmanifest',
  appleWebApp:{capable:true,title:'VEXUM',statusBarStyle:'black-translucent'},
  icons:{icon:'/icons/icon-192.png',apple:'/icons/apple-touch-icon.png'}
};

export const viewport={
  width:'device-width',
  initialScale:1,
  viewportFit:'cover',
  themeColor:'#0a0a0a',
  colorScheme:'dark' as const
};

export default function Layout({children}:{children:React.ReactNode}){
  return <html lang="en"><body>{children}</body></html>
}
