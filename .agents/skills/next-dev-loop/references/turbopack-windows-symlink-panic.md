# Turbopack dev panic on Windows (os error 1314) — recipe

## Symptom
Every route returns 500 during `next dev --turbopack` on Windows. The
terminal prints a hard panic:

```
FATAL: An unexpected Turbopack error occurred. A panic log has been written to
C:\Users\<you>\AppData\Local\Temp\next-panic-<hash>.log.
```

The panic log's root cause is always the same:

```
create symlink to ../../../node_modules/.pnpm/postcss@8.5.26/node_modules/postcss
Caused by:
- A required privilege is not held by the client. (os error 1314)
```

## Root cause
Error 1314 = `ERROR_PRIVILEGE_NOT_HELD`. Turbopack's dev server creates a
symlink into the pnpm virtual store. A standard Windows user account does
not hold `SeCreateSymbolicLinkPrivilege` unless Developer Mode is on or the
process is elevated. This is independent of the route and of any code change.

## Fix (dev server only)
1. Set the `dev` script to webpack (zero-risk; production `build`/`start`
   keep Turbopack):
   - `package.json`: `"dev": "next dev --webpack"`
   - or just run `pnpm dev --webpack` / `npx next dev --webpack`.
2. If Turbopack dev is wanted later: enable **Developer Mode**
   (Settings → System → For developers → "Developer Mode") OR run the
   terminal/IDE as Administrator. Then restore `--turbopack`.

## Stale `.next/dev/lock` after a crash
A killed Turbopack run leaves a lock; the next `next dev` (even webpack)
refuses to start:
`Unable to acquire lock at .next/dev/lock, is another instance of next dev running?`
- `rm -rf .next/dev` (MSYS `rm` works).
- Kill any zombie `node.exe` holding the port:
  `netstat -ano | grep :<port>` → `taskkill /PID <pid> /F`
  (MSYS needs forward slashes: `taskkill /PID 47548 /F`, NOT `//PID`).

## Verify the route is actually healthy (curl is correct here)
The "don't use curl" rule in the main skill is about blank *browser*
sessions. For a *server* 500/panic, curl proves the route:
```bash
npx next dev --webpack -p 3100 > /tmp/nextdev.log 2>&1   # background
# wait for "Ready in"
curl -s -o "C:/Users/<you>/AppData/Local/Temp/article.html" \
     -w "HTTP %{http_code}\n" \
     "http://localhost:3100/articles/<slug>"
grep -cE "__next_error__|Application error" "C:/Users/<you>/AppData/Local/Temp/article.html"
```
Expect `HTTP 200` and `0` error markers. Body should be tens of KB with a
real `<title>`. (Write the body to a Windows path — MSYS `/tmp` maps to
`C:\tmp` which usually doesn't exist; use a `$LOCALAPPDATA/Temp` path.)

## Confirmed case
memareh-redesign (Next 16.1.0, pnpm, React 19, Windows 11). After flipping
`dev` to `--webpack` and clearing `.next/dev/lock`, `GET /articles/dalile-…`
returned 200 (149 KB) — confirming Slice 5 `unstable_cache` and other edits
were unrelated to the panic.
