# Test Supabase anon key by calling REST endpoint /rest/v1/articles
$envFile = Join-Path $PSScriptRoot '..\.env.local'
if (-not (Test-Path $envFile)) { Write-Error '.env.local not found'; exit 2 }
$lines = Get-Content $envFile | Where-Object { $_ -match '=' -and -not ($_ -match '^#') }
$map = @{}
foreach ($l in $lines) {
  if ($l -match '^(\w+)=(.*)$') {
    $map[$matches[1]] = $matches[2].Trim()
  }
}
$url = $map['NEXT_PUBLIC_SUPABASE_URL']
$anon = $map['NEXT_PUBLIC_SUPABASE_ANON_KEY']
Write-Host "Using URL: $url"
if (-not $url -or -not $anon) { Write-Error 'Missing URL or anon key in .env.local'; exit 3 }
try {
  $uri = "$url/rest/v1/articles?select=id&limit=1"
  Write-Host "Requesting: $uri"
  $resp = Invoke-RestMethod -Uri $uri -Headers @{ 'apikey' = $anon; 'Authorization' = "Bearer $anon" } -Method Get -ErrorAction Stop
  Write-Host 'Success. Response:'
  $resp | ConvertTo-Json -Depth 5 | Write-Host
} catch {
  Write-Host 'Request failed:'
  Write-Host $_.Exception.Message
  if ($_.Exception.Response) {
    try { $_.Exception.Response.GetResponseStream() | %{ $_ } } catch {}
  }

  # Fallback: try passing the anon key as a query parameter (some clients/Postman use this)
  try {
    $uri2 = "$uri&apikey=$anon"
    Write-Host "Retrying with apikey in query string: $uri2"
    $resp2 = Invoke-RestMethod -Uri $uri2 -Method Get -ErrorAction Stop
    Write-Host 'Fallback success. Response:'
    $resp2 | ConvertTo-Json -Depth 5 | Write-Host
  } catch {
    Write-Host 'Fallback also failed:'
    Write-Host $_.Exception.Message
    exit 1
  }
}
