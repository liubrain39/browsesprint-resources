import fs from 'node:fs/promises';
import path from 'node:path';
import {createDecipheriv,createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const key=Buffer.from(process.env.BROWSESPRINT_BENCH_KEY||'','base64');
delete process.env.BROWSESPRINT_BENCH_KEY;
if(key.length!==32)throw Error('Missing temporary test key');
const data=await fs.readFile('bundle.enc');
if(data.subarray(0,7).toString()!=='BSNET1\n')throw Error('Invalid envelope');
const d=createDecipheriv('aes-256-gcm',key,data.subarray(7,19));d.setAuthTag(data.subarray(19,35));
const value=JSON.parse(gunzipSync(Buffer.concat([d.update(data.subarray(35)),d.final()]),{maxOutputLength:20_000_000}));
key.fill(0);
const entries=Object.entries(value.files);
if(entries.length<4||entries.length>12)throw Error('Unexpected payload size');
await fs.mkdir('.runner-private',{mode:0o700});
for(const [name,content]of entries){
 if(!/^(?:runtime\/(?:baseline|drain|candidate)\/(?:cli\.mjs|chunks\/[\w-]+\.mjs)|runner\.mjs|link\.mjs|cases\.json)$/.test(name)||typeof content!=='string'||createHash('sha256').update(content).digest('hex')!==value.metadata.files[name])throw Error('Payload manifest mismatch');
 const target=path.join('.runner-private',name);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,content,{mode:0o600,flag:'wx'});
}
console.log(JSON.stringify({authenticatedPayloadFiles:entries.length,baseCommit:value.metadata.baseCommit}));
