# Download Tehran regions PNG to public assets
$dest = Join-Path $PSScriptRoot '..\public\assets\areas\tehran_regions.png'
$destDir = Split-Path $dest -Parent
if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
}

$uri = 'https://d-learn.ir/wp-content/uploads/elementor/thumbs/tehran_region_maps-qgitxi8qhlyfhquf8dhdeg79ak4mkd7mpilkmk8c0u.png'
Write-Host "Downloading $uri to $dest"
Invoke-WebRequest -Uri $uri -OutFile $dest -UseBasicParsing
Write-Host "Done. Saved to $dest"