$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..\desktop')
if (-not (Test-Path .\node_modules)) { npm install; if ($LASTEXITCODE -ne 0) { throw 'npm install failed' } }
npm run dist:win
if ($LASTEXITCODE -ne 0) { throw 'Installer build failed' }
Write-Host 'Installer in desktop\release\' -ForegroundColor Green
