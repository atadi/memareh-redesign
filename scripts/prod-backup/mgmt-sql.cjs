// Read-only production backup via Supabase Management API (NO db password needed).
// Uses SUPABASE_ACCESS_TOKEN + project ref from NEXT_PUBLIC_SUPABASE_URL.
// Only READ queries. Writes: creates local backup files (outside repo). Never prints secrets.
const fs = require('fs');
const path = require('path');
const https = require('https');

function loadEnv(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const env = {};
  for (const line of txt.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v[0] === '"' && v[v.length-1] === '"') || (v[0] === "'" && v[v.length-1] === "'")) v = v.slice(1,-1);
    env[m[1]] = v;
  }
  return env;
}
const env = loadEnv(path.join(__dirname, '..', '..', '.env.local'));
const url = env.NEXT_PUBLIC_SUPABASE_URL;          // e.g. https://XXXX.supabase.co
const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = (url.match(/https:\/\/([^.]+)\.supabase\.co/) || [])[1];
if (!ref || !token) { console.error('MISSING ref or token'); process.exit(2); }
console.log('project ref OK (redacted), API base ready');

function mgmtSQL(query) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query });
    const req = https.request({
      hostname: 'api.supabase.com',
      path: `/v1/projects/${ref}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'apikey': token,
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error('HTTP ' + res.statusCode + ': ' + data.slice(0,300)));
        try { resolve(JSON.parse(data)); } catch (e) { reject(new Error('parse: ' + data.slice(0,300))); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  // Test read-only connectivity
  const t = await mgmtSQL('SELECT count(*) AS c FROM public.articles');
  console.log('READ-ONLY TEST public.articles count =', JSON.stringify(t));
})().catch(e => { console.error('SQL ERR', e.message); process.exit(1); });
