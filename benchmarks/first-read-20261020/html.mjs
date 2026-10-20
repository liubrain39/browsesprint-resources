import {parseHTML} from 'linkedom';
export function extractHtml(html){
 // Parse into a fragment so pre-HTML4 pages with multiple top-level roots do
 // not lose body nodes through document.head/body convenience accessors.
 const {document}=parseHTML('<html><body></body></html>');
 const content=document.createElement('div');content.innerHTML=html;
 const title=content.querySelector('title')?.textContent||'';
 content.querySelectorAll('script,style,noscript,template').forEach(e=>e.remove());
 return {title,text:content.textContent.replace(/\s+/g,' ').trim()};
}
export function sameOriginRedirect(from,location){
 const next=new URL(location,from),prior=new URL(from);
 if(next.protocol!=='https:'||next.origin!==prior.origin||next.username||next.password)throw Error('Redirect outside this fixed public origin');
 return next.href;
}
