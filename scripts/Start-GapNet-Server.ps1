param([switch]$NoBuild)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker Desktop را نصب و اجرا کنید.' }
if (-not (Test-Path .\.env)) {
  Copy-Item .\.env.example .\.env
  Write-Host '[!] .env ایجاد شد؛ لطفاً رمز دیتابیس و DJANGO_SECRET_KEY را تغییر دهید.' -ForegroundColor Yellow
  exit 1
}
if ($NoBuild) { docker compose up -d } else { docker compose up --build -d }
if ($LASTEXITCODE -ne 0) { throw 'اجرای Docker ناموفق بود.' }
Write-Host 'GapNet Web: http://localhost:8084' -ForegroundColor Green
Write-Host 'Health: http://localhost:8084/health/'
