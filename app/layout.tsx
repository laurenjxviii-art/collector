import './collectr-source.css';
import './collectr-carousel.css';
import './collectr-gallery.css';
import './clone-overrides.css';
import './mobile-collectr.css';
import type {Metadata} from 'next';

export const metadata:Metadata={
  title:'Collector',
  description:'Personal collection manager.',
  manifest:'/manifest.webmanifest',
  appleWebApp:{capable:true,title:'Collector',statusBarStyle:'black-translucent'},
  icons:{icon:'/icons/icon-192.png',apple:'/icons/apple-touch-icon.png'}
};

export const viewport={
  width:'device-width',
  initialScale:1,
  maximumScale:1,
  viewportFit:'cover',
  themeColor:'#0a0a0a',
  colorScheme:'dark' as const
};

export default function Layout({children}:{children:React.ReactNode}){
  return <html lang="en" className="dark" style={{colorScheme:'dark'}}><body className="relative bg-background text-foreground antialiased">{children}</body></html>
}
