// Targeted backup of public.articles -> self-contained SQL + CSV (read-only via Mgmt API).
const fs = require('fs');
const path = require('path');
const https = require('https');
function loadEnv(f){const t=fs.readFileSync(f,'utf8').replace(/^﻿/,'');const e={};for(const raw of t.split('\n')){const l=raw.replace(/\r$/,'');if(!l.includes('='))continue;const i=l.indexOf('=');const k=l.slice(0,i).trim();let v=l.slice(i+1).trim();if((v[0]==='"'&&v[v.length-1]==='"')||(v[0]==="'"&&v[v.length-1]==="'"))v=v.slice(1,-1);if(k)e[k]=v;}return e;}
const env = loadEnv(path.join(__dirname,'..','..','.env.local'));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = url.match(/https:\/\/([^.]+)\.supabase\.co/)[1];
function sql(q){return new Promise((res,rej)=>{const b=JSON.stringify({query:q});const r=https.request({hostname:'api.supabase.com',path:`/v1/projects/${ref}/database/query`,method:'POST',headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json','apikey':token}},resp=>{let d='';resp.on('data',c=>d+=c);resp.on('end',()=>{if(resp.statusCode>=400)return rej(new Error('HTTP '+resp.statusCode+': '+d.slice(0,300)));try{res(JSON.parse(d));}catch(e){rej(new Error('parse: '+d.slice(0,300)));}});});r.on('error',rej);r.write(b);r.end();});}
const sanitize = s => String(s).replace(/\\/g,'\\\\').replace(/'/g,"''").replace(/\n/g,'\\n').replace(/\r/g,'\\r').replace(/\t/g,'\\t');
const TS = new Date().toISOString().replace(/[:.]/g,'-');
(async ()=>{
  // column list
  const cols = await sql(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='articles' ORDER BY ordinal_position`);
  const colNames = cols.map(c=>c.column_name);
  // data
  const rows = await sql(`SELECT * FROM public.articles ORDER BY slug`);
  const csvHeader = colNames.join(',');
  const csvLines = rows.map(r=>colNames.map(cn=>{const v=r[cn];if(v===null)return '';if(typeof v==='object')return JSON.stringify(v).replace(/"/g,'""');return String(v).replace(/"/g,'""');}).map(v=>/[\",\n]/.test(v)?'"'+v+'"':v).join(','));
  // targeted SQL: schema + data as INSERTs (self-contained, restorable anywhere)
  let out = `-- Targeted backup of public.articles\n-- Generated ${TS}\n-- Row count: ${rows.length}\n\n`;
  out += `CREATE SCHEMA IF NOT EXISTS public;\n\n`;
  out += `-- NOTE: table DDL is included in the full schema dump; this file focuses on data.\n`;
  out += `-- For full DDL use memareh_schema_*.sql. Minimal table stub follows for standalone restore:\n\n`;
  out += `DROP TABLE IF EXISTS public.articles_restore_stub;\n`;
  out += `CREATE TABLE public.articles_restore_stub (\n`;
  out += cols.map(c=>`  ${c.column_name} ${c.data_type === 'ARRAY' ? 'text[]' : c.data_type === 'USER-DEFINED' ? 'text' : c.data_type === 'timestamp with time zone' ? 'timestamptz' : c.data_type}`).join(',\n');
  out += `\n);\n\n`;
  const arrayCols = new Set(cols.filter(c=>c.data_type==='ARRAY').map(c=>c.column_name));
  const ser = (cn,v)=>{
    if(v===null) return 'NULL';
    if(arrayCols.has(cn)){ // proper Postgres text[] literal
      if(!Array.isArray(v)||v.length===0) return "'{}'";
      const elems = v.map(x=>"'"+sanitize(x)+"'").join(', ');
      return `ARRAY[${elems}]::text[]`;
    }
    if(typeof v==='object') return "'"+sanitize(JSON.stringify(v))+"'";
    return "'"+sanitize(v)+"'";
  };
  out += `INSERT INTO public.articles_restore_stub (${colNames.join(', ')}) VALUES\n`;
  out += rows.map(r=>'('+colNames.map(cn=>ser(cn,r[cn])).join(', ')+')').join(',\n');
  out += ';\n';
  fs.writeFileSync(`C:/backups/memareh-prod/public_articles_targeted_${TS}.sql`, out);
  fs.writeFileSync(`C:/backups/memareh-prod/public_articles_data_${TS}.csv`, [csvHeader, ...csvLines].join('\n'));
  console.log('TARGETED BACKUP WRITTEN: rows='+rows.length+' cols='+colNames.length);
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
