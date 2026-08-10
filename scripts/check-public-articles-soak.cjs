// READ-ONLY production soak-health checker for the public.articles archive.
// NO writes: only SELECTs against Supabase Management API + read-only HTTP GETs.
// Credentials come from env (.env.local not committed): SUPABASE_ACCESS_TOKEN +
// NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY + optionally site URL.
// Exit code 0 = all observed checks consistent with archive state; non-zero = anomaly.
const fs = require('fs');
const https = require('https');
const crypto = require('crypto');

function loadEnv(f){const t=fs.readFileSync(f,'utf8').replace(/^﻿/,'');const e={};for(const raw of t.split('\n')){if(!raw.includes('='))continue;const i=raw.indexOf('=');e[raw.slice(0,i).trim()]=raw.slice(i+1).trim();}return e;}

const env = loadEnv(require('path').join(__dirname,'..','.env.local'));
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const REF = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)[1];
const TOK = process.env.SUPABASE_ACCESS_TOKEN;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SITE = (env.NEXT_PUBLIC_SITE_URL || 'https://memareh.com').replace(/\/$/,'');

function mgmt(query){return new Promise((res,rej)=>{
  const b=JSON.stringify({query});
  const r=https.request({hostname:'api.supabase.com',path:`/v1/projects/${REF}/database/query`,method:'POST',headers:{Authorization:`Bearer ${TOK}`,'Content-Type':'application/json',apikey:TOK}},x=>{x.on('error',rej);let d='';x.on('data',c=>d+=c);x.on('end',()=>{if(x.statusCode>=400)return rej(new Error('SQL '+x.statusCode+': '+d.slice(0,160)));try{res(JSON.parse(d));}catch(er){rej(er);}});});
  r.on('error',rej);r.write(b);r.end();
});}

function httpStatus(u,depth){return new Promise((res)=>{depth=depth||0;const mod=u.startsWith('https')?https:require('http');const r=mod.get(u,resp=>{if([301,302,307,308].includes(resp.statusCode)&&resp.headers.location&&depth<5){const next=resp.headers.location.startsWith('http')?resp.headers.location:new URL(resp.headers.location,u).href;return res(httpStatus(next,depth+1));}res(resp.statusCode);});r.on('error',()=>res('ERR'));r.setTimeout(8000,()=>{r.destroy();res('TIMEOUT');});});}

(async()=>{
  const out={utc:new Date().toISOString(),ref:REF,checks:{}};
  // DB archive state
  const pub=await mgmt("SELECT to_regclass('public.articles') AS t");
  const arch=await mgmt("SELECT count(*) AS c FROM legacy_articles.articles");
  const mem=await mgmt("SELECT count(*) AS c FROM memareh.articles");
  const rows=await mgmt("SELECT slug, length(content) AS clen, status FROM legacy_articles.articles ORDER BY slug");
  const h=crypto.createHash('sha256').update(JSON.stringify(rows.map(r=>[r.slug,Number(r.clen),r.status]))).digest('hex');
  out.checks.public_articles_exists = pub[0].t;            // expect null
  out.checks.legacy_articles_rows = Number(arch[0].c);     // expect 26
  out.checks.memareh_articles_rows = Number(mem[0].c);     // expect 25
  out.checks.archive_content_hash = h.slice(0,16);          // expect 54a808c2..

  // API isolation (anon PostgREST)
  const anonPub=await new Promise(res=>{const rr=https.get({protocol:'https:',hostname:REF+'.supabase.co',path:'/rest/v1/articles?select=count',headers:{apikey:ANON,Authorization:`Bearer ${ANON}`}},x=>{x.on('error',()=>res('ERR'));res(x.statusCode);});rr.on('error',()=>res('ERR'));});
  const anonLeg=await new Promise(res=>{const rr=https.get({protocol:'https:',hostname:REF+'.supabase.co',path:'/rest/v1/legacy_articles?select=count',headers:{apikey:ANON,Authorization:`Bearer ${ANON}`}},x=>{x.on('error',()=>res('ERR'));res(x.statusCode);});rr.on('error',()=>res('ERR'));});
  out.checks.anon_public_articles_http = anonPub;          // expect 404
  out.checks.anon_legacy_articles_http = anonLeg;          // expect 404

  // Live site
  out.checks.site_home = await httpStatus(SITE+'/');
  out.checks.site_articles = await httpStatus(SITE+'/articles');
  out.checks.site_sitemap = await httpStatus(SITE+'/sitemap.xml');

  // Verdict
  const ok = out.checks.public_articles_exists===null
    && out.checks.legacy_articles_rows===26
    && out.checks.memareh_articles_rows===25
    && out.checks.archive_content_hash==='54a808c284a6079c'
    && out.checks.anon_public_articles_http===404
    && out.checks.anon_legacy_articles_http===404
    && out.checks.site_home===200
    && out.checks.site_articles===200
    && out.checks.site_sitemap===200;
  out.verdict = ok ? 'SOAK_CONSISTENT' : 'ANOMALY_DETECTED';
  console.log(JSON.stringify(out,null,2));
  process.exit(ok?0:2);
})().catch(e=>{console.error('ERR',e.message);process.exit(3);});
