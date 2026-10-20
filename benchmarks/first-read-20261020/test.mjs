import test from 'node:test';
import assert from 'node:assert/strict';
import {publicAddress,resolvePublic,link} from './link.mjs';
import {contentChecks} from './cases.mjs';
test('the public tunnel rejects private, shared, benchmark and documentation ranges',()=>{
 for(const ip of ['127.0.0.1','10.1.2.3','100.64.1.1','169.254.1.1','172.16.1.1','192.168.1.1','198.18.0.1','192.0.2.1','198.51.100.1','203.0.113.1','224.0.0.1','::1','not-an-ip'])assert.equal(publicAddress(ip),false,ip);
 assert.equal(publicAddress('1.1.1.1'),true);
});
test('a mixed public/private answer is rejected before a connection',async()=>{
 await assert.rejects(resolvePublic('public.example',async()=>[{address:'1.1.1.1'},{address:'10.1.1.1'}]),/Non-public/);
 await assert.rejects(resolvePublic('public.example',async()=>[]),/Non-public/);
 assert.equal(await resolvePublic('public.example',async()=>[{address:'1.1.1.1'}]),'1.1.1.1');
});
test('owned proxy accepts no ordinary HTTP request and can close cleanly',async()=>{
 const p=await link();try{assert.equal((await fetch(p.url)).status,405);}finally{await p.close();}
});
test('checks require the title and all specified content, including table cells',()=>{
 const c={title:'Title',checks:['one two','three']};
 assert.deepEqual(contentChecks(c,{title:'TITLE',text:'one\n two',tables:[[['THREE']]]}),{title:true,phrases:[{phrase:'one two',ok:true},{phrase:'three',ok:true}]});
 assert.equal(contentChecks(c,{title:'wrong',text:'one two'}).title,false);
 assert.equal(contentChecks(c,{title:'Title',text:'one two'}).phrases[1].ok,false);
});
