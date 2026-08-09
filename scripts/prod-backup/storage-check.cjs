// Read-only check: article-images bucket object count + total size via Mgmt API Storage.
const fs=require('fs'),https=require('https'),path=require('path');
const e={};for(const l of fs.readFileSync(path.join(__dirname,'..','..','.env.local'),'utf8').replace(/^﻿/,"").split("\n")){if(!l.includes("="))continue;const i=l.indexOf("=");e[l.slice(0,i).trim()]=l.slice(i+1).trim();}
const ref=e.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)[1];
const tok=process.env.SUPABASE_ACCESS_TOKEN;
function api(method,sub,body){return new Promise((res,rej)=>{const opts={hostname:'api.supabase.com',path:`/v1/projects/${ref}${sub}`,method,headers:{Authorization:`Bearer ${tok}`,apikey:tok,'Content-Type':'application/json'}};const r=https.request(opts,x=>{let d='';x.on('data',c=>d+=c);x.on('end',()=>{try{res(d?JSON.parse(d):null);}catch(er){rej(new Error(d.slice(0,200)));}});});r.on('error',rej);if(body)r.write(JSON.stringify(body));r.end();});}
(async()=>{
  try{
    const buckets=await api('GET','/storage/buckets');
    const art=buckets.find(b=>b.name==='article-images');
    console.log('buckets:',buckets.map(b=>b.name).join(', '));
    if(art){
      // list objects (first page)
      const objs=await api('GET',`/storage/buckets/article-images/objects?limit=1000`);
      let total=objs.length; let size=objs.reduce((a,o)=>a+(o.metadata&&o.metadata.size?+o.metadata.size:0),0);
      console.log('article-images object count (page1)='+total+' approx bytes='+size);
    } else { console.log('article-images bucket NOT found'); }
  }catch(er){ console.log('STORAGE_API_ERR',er.message); }
})();
