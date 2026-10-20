import {parseHTML} from 'linkedom';
export function extractHtml(html){
 // Read every document root without document.head/body convenience accessors:
 // older pages may have a HEADER and a separate BODY. Parsing as a document
 // also avoids LinkeDOM's fragment-query error with real-world doctypes.
 const {document}=parseHTML(html);
 const title=document.querySelector('title')?.textContent||'';
 document.querySelectorAll('script,style,noscript,template').forEach(e=>e.remove());
 const text=Array.from(document.childNodes).filter(n=>n.nodeType===1||n.nodeType===3)
  .map(n=>n.textContent||'').join(' ').replace(/\s+/g,' ').trim();
 return {title,text};
}
export function sameOriginRedirect(from,location){
 const next=new URL(location,from),prior=new URL(from);
 if(next.protocol!=='https:'||next.origin!==prior.origin||next.username||next.password)throw Error('Redirect outside this fixed public origin');
 return next.href;
}
