// Recursive byte-level backup of Supabase Storage bucket 'article-images'.
// Read-only: lists + downloads every object. No remote mutation.
// Stores under C:/backups/memareh-prod/storage/article-images/.
const fs = require('fs');
const path = require('path');
const https = require('https');

function loadEnv(f){const t=fs.readFileSync(f,'utf8').replace(/^﻿/,'');const e={};for(const raw of t.split('\n')){if(!raw.includes('='))continue;const i=raw.indexOf('=');e[raw.slice(0,i).trim()]=raw.slice(i+1).trim();}return e;}

const env = loadEnv(path.join(__dirname,'..','..','.env.local'));
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY; // read-only GET usage only
const BUCKET = 'article-images';
const HOST = new URL(SUPABASE_URL).host;
const OUT = 'C:/backups/memareh-prod/storage/article-images';

function api(method, pth, body, headers){return new Promise((res,rej)=>{
  const r=https.request({hostname:HOST,path:pth,method,headers:Object.assign({apikey:KEY,Authorization:`Bearer ${KEY}`},headers||{})},x=>{
    const chunks=[];x.on('data',c=>chunks.push(c));x.on('end',()=>{try{res({status:x.statusCode,body:Buffer.concat(chunks)});}catch(er){rej(er);}});});
  r.on('error',rej);if(body)r.write(typeof body==='string'?body:JSON.stringify(body));r.end();
});}

const crypto=require('crypto');
function sha256File(p){const h=crypto.createHash('sha256');const s=fs.createReadStream(p);return new Promise((res,rej)=>{s.on('data',c=>h.update(c));s.on('end',()=>res(h.digest('hex')));s.on('error',rej);});}

async function listPrefix(prefix){
  const resp = await api('POST',`/storage/v1/object/list/${BUCKET}`,JSON.stringify({prefix,limit:1000,offset:0,sortBy:{column:'name',order:'asc'}}),{'Content-Type':'application/json'});
  if(resp.status!==200) throw new Error('list '+prefix+' -> '+resp.status+' '+resp.body.slice(0,200).toString('utf8'));
  return JSON.parse(resp.body.toString('utf8'));
}

async function download(pathInBucket, localRel){
  const resp = await api('GET',`/storage/v1/object/${BUCKET}/${encodeURI(pathInBucket)}`);
  if(resp.status!==200) throw new Error('download '+pathInBucket+' -> '+resp.status);
  const local = path.join(OUT, localRel);
  fs.mkdirSync(path.dirname(local),{recursive:true});
  fs.writeFileSync(local, resp.body); // Buffer -> correct binary bytes
  return resp.body.length;
}

(async()=>{
  const manifest=[];
  const queue=['']; // prefixes to explore
  const seen=new Set();
  while(queue.length){
    const prefix=queue.shift();
    const items = await listPrefix(prefix);
    for(const it of items){
      const name=it.name;
      const full = prefix ? prefix+'/'+name : name;
      if(seen.has(full)) continue; seen.add(full);
      const isFolder = !it.metadata || it.metadata.size==null;
      if(isFolder){
        // recurse into folder
        queue.push(full+'/');
      } else {
        const sz = await download(full, full);
        const localPath = path.join(OUT, full);
        const hash = await sha256File(localPath);
        manifest.push({path:full, bytes:sz, remoteSize:it.metadata&&it.metadata.size?+it.metadata.size:null, mimetype:it.metadata&&it.metadata.mimetype, sha256:hash});
        console.log(`OK ${full} bytes=${sz} sha=${hash.slice(0,12)}`);
      }
    }
  }
  fs.writeFileSync(path.join(OUT,'manifest.json'), JSON.stringify({bucket:BUCKET, generated:new Date().toISOString(), base:OUT, objects:manifest, totalObjects:manifest.length, totalBytes:manifest.reduce((a,o)=>a+o.bytes,0)},null,2));
  console.log(`\nSTORAGE BACKUP DONE: ${manifest.length} objects, ${manifest.reduce((a,o)=>a+o.bytes,0)} bytes`);
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
