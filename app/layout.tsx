import './vexum-reset.css';
import './vexum-wishlist.css';
import type {Metadata} from 'next';

export const metadata:Metadata={
  title:'VEXUM',
  description:'Collect. Track. Plan. Connect.',
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
  return <html lang="en"><body>{children}</body></html>;
}
