'use client';

import {useMemo,useState} from 'react';
import {Camera,FileText,Image as ImageIcon,Link2,ScanLine,Search,Upload,X} from 'lucide-react';
import {DEMO_PRODUCTS} from '../../lib/search/demo';
import type {NormalizedProduct} from '../../lib/search/types';

type Method='camera'|'image'|'barcode'|'receipt'|'url';
type Props={onClose:()=>void;onConfirm:(product:NormalizedProduct)=>void;initialMethod?:Method};

export default function IdentifyItem({onClose,onConfirm,initialMethod='camera'}:Props){
  const [method,setMethod]=useState<Method>(initialMethod);
  const [barcode,setBarcode]=useState('');
  const [url,setUrl]=useState('');
  const [fileName,setFileName]=useState('');
  const exact=useMemo(()=>{
    const digits=barcode.replace(/\D/g,'');
    if(digits.length<8)return null;
    return DEMO_PRODUCTS.find(product=>product.upc?.replace(/\D/g,'')===digits)||null;
  },[barcode]);

  const methods:Array<{id:Method;label:string;icon:React.ReactNode;desc:string}>=[
    {id:'camera',label:'Camera',icon:<Camera/>,desc:'Photograph an item'},
    {id:'image',label:'Image',icon:<ImageIcon/>,desc:'Upload a photo or screenshot'},
    {id:'barcode',label:'Barcode',icon:<ScanLine/>,desc:'Scan UPC / EAN'},
    {id:'receipt',label:'Receipt',icon:<FileText/>,desc:'Extract purchase candidates'},
    {id:'url',label:'URL',icon:<Link2/>,desc:'Match a retailer or marketplace URL'}
  ];

  return <div className="vxs-modal-backdrop" role="dialog" aria-modal="true" aria-label="Identify item">
    <div className="vxs-identify-modal">
      <header><div><span>VEXUM IDENTIFY</span><h2>Identify Item</h2><p>Photograph, scan, upload, or paste what you have.</p></div><button onClick={onClose}><X/></button></header>
      <div className="vxs-identify-methods">{methods.map(item=><button key={item.id} className={method===item.id?'active':''} onClick={()=>{setMethod(item.id);setFileName('')}}>{item.icon}<strong>{item.label}</strong><span>{item.desc}</span></button>)}</div>

      <section className="vxs-identify-stage">
        {method==='barcode'?<>
          <div className="vxs-barcode-entry"><ScanLine/><div><h3>Scan or enter a barcode</h3><p>Exact UPC/EAN matching takes priority over fuzzy or AI inference.</p></div><input autoFocus value={barcode} onChange={e=>setBarcode(e.target.value)} placeholder="5010996283714"/></div>
          {barcode&&!exact?<div className="vxs-identify-result unavailable"><Search/><div><strong>Product not found in the current demo catalog.</strong><p>Live catalog/external provider lookup is not connected yet.</p></div><button>Create Product</button></div>:null}
          {exact?<div className="vxs-identify-result match"><div className="vxs-identify-art"><ScanLine/></div><div><span>EXACT UPC MATCH</span><strong>{exact.canonicalName}</strong><p>{exact.manufacturer} · {exact.line} · {exact.releaseYear}</p></div><button onClick={()=>onConfirm(exact)}>Confirm</button></div>:null}
        </>:null}

        {method==='url'?<>
          <div className="vxs-url-entry"><Link2/><div><h3>Paste a product URL</h3><p>Retailer, eBay, marketplace, or product page.</p></div><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://..."/></div>
          {url?<div className="vxs-identify-result unavailable"><Link2/><div><strong>URL extraction provider not connected.</strong><p>The pipeline is ready to extract title, retailer, image, price, SKU/UPC, then match the canonical VEXUM catalog. It will not invent extracted data.</p></div><button disabled>Pending</button></div>:null}
        </>:null}

        {method==='camera'||method==='image'||method==='receipt'?<>
          <label className="vxs-upload-zone">
            {method==='camera'?<Camera/>:method==='receipt'?<FileText/>:<ImageIcon/>}
            <strong>{method==='camera'?'Capture or choose a photo':method==='receipt'?'Upload or photograph a receipt':'Upload an image or screenshot'}</strong>
            <span>{method==='receipt'?'VEXUM will eventually extract retailer, date, items, prices and candidate matches.':'VEXUM will eventually return ranked product matches with confidence.'}</span>
            <input type="file" accept={method==='receipt'?'image/*,.pdf':'image/*'} capture={method==='camera'?'environment':undefined} onChange={e=>setFileName(e.target.files?.[0]?.name||'')}/>
            <i><Upload/>Choose File</i>
          </label>
          {fileName?<div className="vxs-identify-result unavailable"><FileText/><div><strong>{fileName}</strong><p>File accepted. The identification/extraction model is not connected, so VEXUM stops here instead of pretending it identified the item.</p></div><button disabled>Provider pending</button></div>:null}
        </>:null}
      </section>

      <footer><div><span>IDENTIFICATION PIPELINE</span><p>Input → deterministic identifiers → catalog lookup → provider lookup → ranked matches → user confirmation.</p></div><button onClick={onClose}>Close</button></footer>
    </div>
  </div>;
}
