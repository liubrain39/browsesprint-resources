import test from 'node:test';
import assert from 'node:assert/strict';
import {publicAddress,resolvePublic,link,createPipeQueue} from './link.mjs';
import {contentChecks} from './cases.mjs';
import {extractHtml,sameOriginRedirect} from './html.mjs';
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
test('older documents with HEADER and a separate BODY retain title and body',()=>{
 const r=extractHtml('<HEADER><TITLE>Old page</TITLE></HEADER><BODY><h1>Public text</h1><p>Read the next section.</p><script>privateScriptText</script></BODY>');
 assert.equal(r.title,'Old page');assert.match(r.text,/Public text/);assert.match(r.text,/next section/);assert.doesNotMatch(r.text,/privateScriptText/);
});
test('normal HTML extracts visible text and rejects redirected origins or schemes',()=>{
 const r=extractHtml('<!doctype html><html><head><title>Normal page</title><style>hiddenCSS</style></head><body>Hello &amp; welcome</body></html>');
 assert.equal(r.title,'Normal page');assert.match(r.text,/Hello & welcome/);assert.doesNotMatch(r.text,/hiddenCSS/);
 assert.equal(sameOriginRedirect('https://example.org/about/','/about'),'https://example.org/about');
 for(const location of ['http://example.org/','https://127.0.0.1/','https://other.example/','https://user:pass@example.org/'])assert.throws(()=>sameOriginRedirect('https://example.org/',location),/outside/);
});
test('leading text and nodes before a doctype do not break document queries',()=>{
 for(const prefix of ['\n','<!-- Public page -->\n<script>hiddenScript</script>\n']){
  const r=extractHtml(prefix+'<!doctype html><html><head><title>Public page</title></head><body>Readable content</body></html>');
  assert.equal(r.title,'Public page');assert.match(r.text,/Readable content/);assert.doesNotMatch(r.text,/hiddenScript/);
 }
});
test('a delayed large chunk finishes before EOF even with another tunnel sharing the queue',async()=>{
 const stats={up:0,down:0},pipe=createPipeQueue({rate:65536,stats});
 const source={destroyed:false,resume(){}},payload=Buffer.alloc(20000,42),small=Buffer.from('other tunnel');
 const chunks=[],other=[],events=[];
 let finish,finishOther;
 const done=new Promise(r=>finish=r),doneOther=new Promise(r=>finishOther=r);
 const sink={destroyed:false,write(b,cb){assert.equal(this.destroyed,false);chunks.push(Buffer.from(b));cb();},end(){events.push('end');this.destroyed=true;finish();}};
 const sinkOther={destroyed:false,write(b,cb){other.push(Buffer.from(b));cb();},end(){this.destroyed=true;finishOther();}};
 pipe.push('down',{s:source,d:sink,b:payload});
 pipe.push('down',{s:source,d:sinkOther,b:small});
 pipe.push('down',{s:source,d:sink,b:null});
 pipe.push('down',{s:source,d:sinkOther,b:null});
 await Promise.all([done,doneOther]);
 assert.deepEqual(Buffer.concat(chunks),payload);assert.deepEqual(Buffer.concat(other),small);
 assert.deepEqual(events,['end']);assert.equal(stats.down,payload.length+small.length);
});
