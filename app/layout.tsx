import './collectr.css';
import type {Metadata} from 'next';
export const metadata:Metadata={title:'Collector',description:'Collection manager.',manifest:'/manifest.webmanifest',appleWebApp:{capable:true,title:'Collector',statusBarStyle:'black-translucent'},icons:{icon:'/icons/icon-192.png',apple:'/icons/apple-touch-icon.png'}};
export const viewport={width:'device-width',initialScale:1,themeColor:'#08090b',colorScheme:'dark' as const};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
