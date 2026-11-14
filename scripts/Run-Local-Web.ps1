$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..\frontend')
if (-not (Test-Path .\node_modules)) { npm install; if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed' } }
npm run dev
