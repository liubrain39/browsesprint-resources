import http from 'node:http';
import net from 'node:net';
import {lookup} from 'node:dns/promises';
import {setTimeout as sleep} from 'node:timers/promises';
const blocked=new net.BlockList();
for(const [address,prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]])blocked.addSubnet(address,prefix,'ipv4');
export function publicAddress(address){return net.isIP(address)===4&&!blocked.check(address,'ipv4');}
export async function resolvePublic(host,resolve=lookup){
 const addresses=net.isIP(host)?[{address:host}]:await resolve(host,{all:true,family:4});
 if(!addresses.length||addresses.some(a=>!publicAddress(a.address)))throw Error('Non-public DNS destination rejected');
 return addresses[0].address;
}
// A local, test-owned CONNECT proxy. TLS remains end-to-end. All tunnels in an
// attempt share the bandwidth allowance, including browser subresources.
export async function link({slow=false,resolve=lookup}={}){
 const stats={rate:slow?65536:null,connectDelayMs:slow?200:0,up:0,down:0,connections:[],denied:[]};
 const sockets=new Set(),queues={up:[],down:[]},running={up:false,down:false},next={up:0,down:0};
 let closed=false;
 async function pump(k){
  if(running[k])return;running[k]=true;
  while(queues[k].length&&!closed){
   const {s,d,b}=queues[k].shift();if(d.destroyed)continue;if(b===null){d.end();continue;}
   const size=stats.rate?Math.min(2048,b.length):b.length,rest=b.subarray(size);
   if(stats.rate){const wait=next[k]-performance.now();if(wait>0)await sleep(wait);next[k]=performance.now()+size*1000/stats.rate;}
   if(closed||d.destroyed)continue;stats[k]+=size;
   if(rest.length)queues[k].push({s,d,b:rest});
   d.write(b.subarray(0,size),()=>{if(!rest.length&&!s.destroyed)s.resume();});
  }
  running[k]=false;
 }
 const own=s=>{sockets.add(s);s.on('error',()=>s.destroy());s.once('close',()=>sockets.delete(s));return s;};
 const server=http.createServer((q,s)=>s.writeHead(405).end());
 server.on('connection',own);
 server.on('connect',async(q,c,head)=>{
  let u;try{u=new URL('https://'+q.url);}catch{c.destroy();return;}
  if(Number(u.port||443)!==443||u.username||u.password||u.pathname!=='/'||u.search||u.hash){stats.denied.push('Invalid target');c.end('HTTP/1.1 403 Forbidden\r\n\r\n');return;}
  const row={host:u.hostname};stats.connections.push(row);let up;
  try{
   const started=performance.now();const address=await resolvePublic(u.hostname,resolve);row.dnsMs=performance.now()-started;row.publicAddress=address;
   if(slow)await sleep(200);
   if(closed||c.destroyed)return;
   const connectAt=performance.now();up=own(net.connect({host:address,port:443}));
   up.setTimeout(10000,()=>up.destroy(Error('Connect timeout')));
   c.once('close',()=>up.destroy());let ended=false;
   up.once('end',()=>{ended=true;});up.once('close',()=>{if(!ended)c.destroy();});
   up.once('connect',()=>{
    row.tcpMs=performance.now()-connectAt;up.setTimeout(0);if(closed||c.destroyed){up.destroy();return;}
    c.write('HTTP/1.1 200 Connection Established\r\n\r\n');if(head.length)up.write(head);
    for(const [s,d,k] of [[c,up,'up'],[up,c,'down']])s.on('data',b=>{s.pause();queues[k].push({s,d,b});void pump(k);});
    up.on('end',()=>{queues.down.push({s:up,d:c,b:null});void pump('down');});
   });
  }catch(e){row.error=e.message;stats.denied.push(u.hostname);up?.destroy();c.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 return {url:'http://127.0.0.1:'+server.address().port,stats,async close(){closed=true;for(const s of sockets)s.destroy();queues.up.length=0;queues.down.length=0;await new Promise(r=>server.close(r));}};
}
