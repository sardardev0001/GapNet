param([string]$ServerUrl = 'http://127.0.0.1:8084')
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..\desktop')
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'Node.js 22+ را نصب کنید.' }
if (-not (Test-Path .\node_modules)) { npm install; if ($LASTEXITCODE -ne 0) { throw 'npm install failed' } }
$env:GAPNET_WEB_URL = $ServerUrl
npm start
