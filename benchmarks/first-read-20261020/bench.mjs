import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {createRequire} from 'node:module';
import {getServers} from 'node:dns';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {ProxyAgent} from 'undici';
import {extractHtml,sameOriginRedirect} from './html.mjs';
import {link} from './link.mjs';
import {cases,relayEndpoint,contentChecks} from './cases.mjs';
const require=createRequire(import.meta.url);
const mcpRoot=path.dirname(require.resolve('@playwright/mcp/package.json'));
const executable=process.env.BENCH_BROWSER||createRequire(path.join(mcpRoot,'package.json'))('playwright').chromium.executablePath();
const out=process.env.BENCH_OUT||path.resolve('evidence');await fs.mkdir(out,{recursive:true});
const sha=x=>createHash('sha256').update(x).digest('hex');
const protocol={
 version:3,browser:'Runner-installed Google Chrome, browser sandbox explicitly enabled; version recorded per read.',
 scope:'Independent machine network/component comparison, not the private Reader package, Codex internal bridge, model inference or complete installer experience.',
 cases,repetitions:2,subjects:['direct-html','hosted-reader','playwright-mcp'],
 profiles:{normal:{rate:null,connectDelayMs:0},slow:{rate:65536,connectDelayMs:200}},
 method:'Fresh tunnel/dispatcher or fresh isolated browser process per attempt. Browser/MCP starts to an untouched about:blank before the timed first-site read; setup time is separately retained. One browser_run_code_unsafe call navigates with waitUntil commit, waits for fixed title/text conditions, then reads the DOM in one batch. Snapshot and settle overhead disabled because the call explicitly waits for its content conditions. Direct HTML and hosted service are HTTP baselines, not a full local Reader. No image or resource blocking.',
 limits:'DNS/OS/CDN/origin caches are not cleared or claimed cold. This uses a cloud runner, not a residential-user survey. Slow shaping is aggregate 64KiB/s per direction plus 200ms per CONNECT, not a full mobile network model. Different rendered/HTML semantics remain distinct. Matching fixed text is not independent freshness verification.',
 };
await fs.writeFile(path.join(out,'protocol.json'),JSON.stringify(protocol,null,2),{flag:'wx'});
function mcpValue(r){
 const text=r.content.filter(c=>c.type==='text').map(c=>c.text).join('\n');
 if(r.isError)throw Error(text.slice(0,1000));
 const m=text.match(/### Result\n([\s\S]*?)(?=\n### |$)/);
 if(!m)throw Error('MCP result section missing: '+text.slice(0,200));
 return JSON.parse(m[1].trim().replace(/^```(?:json)?\n/,'').replace(/\n```$/,''));
}
async function browserClient(proxy){
 const client=new Client({name:'public-first-read-benchmark',version:'1.0.0'});
 const transport=new StdioClientTransport({command:process.execPath,args:[path.join(mcpRoot,'cli.js'),'--headless','--isolated','--sandbox','--executable-path',executable,'--proxy-server',proxy,'--snapshot-mode','none','--timeout-settle','0','--no-webmcp'],stderr:'pipe'});
 const started=performance.now();let stderr='';
 try{
  await client.connect(transport,{timeout:20000});transport.stderr?.on('data',b=>stderr+=b);
  const names=(await client.listTools()).tools.map(t=>t.name);if(!names.includes('browser_run_code_unsafe'))throw Error('Required native tool is missing; available: '+names.join(','));
  const ready=mcpValue(await client.callTool({name:'browser_run_code_unsafe',arguments:{code:'async (page) => ({url: page.url(), version: page.context().browser().version()})'}},undefined,{timeout:20000}));
  if(ready.url!=='about:blank')throw Error('The baseline must start on a blank page');
  return {client,setupMs:performance.now()-started,version:ready.version,stderr:()=>stderr};
 }catch(e){await client.close();throw e;}
}
if(process.env.BENCH_SMOKE==='1'){
 const p=await link();let b;
 try{b=await browserClient(p.url);await fs.writeFile(path.join(out,'smoke.json'),JSON.stringify({ok:true,browser:b.version,blankSetupMs:b.setupMs,connections:p.stats.connections},null,2));console.log('Owned blank-browser MCP check passed');}
 finally{await b?.client.close();await p.close();}
 process.exit(0);
}
const environment={at:new Date().toISOString(),platform:os.platform(),arch:os.arch(),node:process.version,
 image:process.env.ImageOS,imageVersion:process.env.ImageVersion,commit:process.env.GITHUB_SHA,
 resolverCount:getServers().length,resolverSha256:sha(JSON.stringify(getServers())),
 proxyEnvironmentPresent:['HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','http_proxy','https_proxy','all_proxy'].filter(k=>!!process.env[k])};
if(environment.proxyEnvironmentPresent.length)throw Error('This protocol requires an independent environment without proxy environment variables');
try{
 const r=await fetch('https://www.cloudflare.com/cdn-cgi/trace',{signal:AbortSignal.timeout(15000)});
 const d=Object.fromEntries((await r.text()).trim().split('\n').map(s=>s.split('=')));
 environment.trace={status:r.status,country:d.loc,colo:d.colo,ipSha256:d.ip?sha(d.ip):null};
}catch(e){environment.trace={error:e.code||e.name};}
console.log('BROWSESPRINT_ENV_BASE64:'+gzipSync(Buffer.from(JSON.stringify({protocol,environment}))).toString('base64'));
const rows=[],rateLimited=new Set();
async function httpRead(url,options,dispatcher,signal){
 const start=performance.now();let r,redirects=0,current=url;
 for(;;){
  r=await fetch(current,{...options,dispatcher,signal,redirect:'manual'});
  if(![301,302,303,307,308].includes(r.status)||options.method==='POST')break;
  const location=r.headers.get('location');await r.body?.cancel();
  if(!location||redirects++>=3)throw Error('Redirect limit or missing location');
  current=sameOriginRedirect(current,location);
 }
 const headersMs=performance.now()-start;
 if(r.status===429)throw Object.assign(Error('HTTP 429'),{status:429});
 if(r.status<200||r.status>=300){await r.body?.cancel();throw Object.assign(Error('HTTP '+r.status),{status:r.status});}
 let size=0;const chunks=[],bodyAt=performance.now();
 for await(const c of r.body){size+=c.length;if(size>2_000_000)throw Error('Response body limit');chunks.push(c);}
 return {response:r,body:Buffer.concat(chunks),timing:{headersMs,bodyMs:performance.now()-bodyAt,decodedBytes:size,redirects}};
}
async function attempt(c,subject,profile,rep){
 const row={site:c.site,url:c.url,subject,profile,rep,at:new Date().toISOString()};
 if(rateLimited.has(c.site)){row.ok=false;row.skipped='Earlier HTTP 429 for this host; no retry';return row;}
 const p=await link({slow:profile==='slow'}),dispatcher=new ProxyAgent(p.url);let browser,start;
 try{
  if(subject==='playwright-mcp'){browser=await browserClient(p.url);row.setupMs=browser.setupMs;row.browserVersion=browser.version;}
  start=performance.now();let result;
  if(subject==='playwright-mcp'){
   const code=`async (page) => {
    const response = await page.goto(${JSON.stringify(c.url)}, {waitUntil:'commit',timeout:20000});
    const status = response.status();
    if(status >= 400) return {status,title:await page.title(),text:''};
    await page.waitForFunction(({title,checks}) => {
     const norm = s => String(s||'').replace(/\\s+/g,' ').toLowerCase();
     return norm(document.title).includes(norm(title)) && checks.every(s=>norm(document.body?.innerText).includes(norm(s)));
    }, ${JSON.stringify({title:c.title,checks:c.checks})}, {timeout:20000});
    return await page.evaluate(status => ({status,title:document.title,text:document.body.innerText.slice(0,30000),url:location.href,state:document.readyState,
     navigation:JSON.parse(JSON.stringify(performance.getEntriesByType('navigation')[0]||{}))}),status);
   }`;
   result=mcpValue(await browser.client.callTool({name:'browser_run_code_unsafe',arguments:{code}},undefined,{timeout:25000}));row.status=result.status;
   if(result.status===429)rateLimited.add(c.site);
   row.navigation=result.navigation;row.documentState=result.state;
  }else{
   const remote=subject==='hosted-reader';
   const h=await httpRead(remote?relayEndpoint:c.url,remote?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url:c.url})}:{headers:{'user-agent':'BrowseSprint-public-benchmark/1.0','accept':'text/html'}},dispatcher,AbortSignal.timeout(25000));
   row.http=h.timing;row.status=h.response.status;
   if(remote){
    const j=JSON.parse(h.body.toString('utf8'));if(j.error)throw Object.assign(Error(j.error.message||j.error.code),{code:j.error.code});
    if(j.requestedUrl!==c.url)throw Error('Service requestedUrl mismatch');
    result=j.result;row.serverMs=j.serverMs;row.serverStats=result?.stats;row.fetchedAt=result?.fetchedAt;
   }else{
    const parseAt=performance.now();result=extractHtml(h.body.toString('utf8'));
    row.parseMs=performance.now()-parseAt;
   }
  }
  row.totalMs=performance.now()-start;row.checks=contentChecks(c,result);row.ok=row.status===200&&row.checks.title&&row.checks.phrases.every(x=>x.ok);
  row.result={title:result?.title,chars:result?.text?.length,textSha256:sha(result?.text||'')};
 }catch(e){row.ok=false;row.totalMs=start?performance.now()-start:null;row.error={code:e.code||e.cause?.code||e.name,status:e.status,message:e.message.slice(0,1500)};if(e.status===429)rateLimited.add(c.site);}
 finally{await browser?.client.close();row.stderr=browser?.stderr();row.transport=structuredClone(p.stats);await dispatcher.destroy();await p.close();}
 return row;
}
for(let rep=1;rep<=2;rep++)for(const profile of rep===1?['normal','slow']:['slow','normal'])for(const [index,c]of cases.entries()){
 let order=['direct-html','hosted-reader','playwright-mcp'],offset=(index+rep)%3;order=[...order.slice(offset),...order.slice(0,offset)];if(rep===2)order.reverse();
 for(const subject of order){
  const row=await attempt(c,subject,profile,rep);rows.push(row);
  await fs.writeFile(path.join(out,`${rep}-${profile}-${c.site}-${subject}.json`),JSON.stringify(row,null,2),{flag:'wx'});
  console.log(JSON.stringify({rep,profile,site:c.site,subject,ok:row.ok,ms:Math.round(row.totalMs||0),error:row.error?.code,skipped:row.skipped}));
  console.log('BROWSESPRINT_ROW_BASE64:'+gzipSync(Buffer.from(JSON.stringify(row))).toString('base64'));
  await new Promise(r=>setTimeout(r,1000));
 }
}
const evidence={protocol,environment,rows};
await fs.writeFile(path.join(out,'all.json'),JSON.stringify(evidence,null,2),{flag:'wx'});
const compressed=gzipSync(Buffer.from(JSON.stringify(evidence)));
console.log('BROWSESPRINT_EVIDENCE_SHA256:'+sha(compressed));
console.log('BROWSESPRINT_EVIDENCE_BASE64:'+compressed.toString('base64'));
if(process.env.GITHUB_STEP_SUMMARY)await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,`Public first-read comparison: ${rows.filter(r=>r.ok).length}/${rows.length} reads passed fixed content conditions. Failures and skipped 429 hosts retained. Full compressed evidence is in the job log; no Actions cache or artifact upload is used.\n`);
