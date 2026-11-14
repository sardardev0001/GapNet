$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..\backend')
if (-not (Test-Path .\.venv)) { throw 'ابتدا Run-Local-Backend.ps1 را برای نصب وابستگی‌ها اجرا کنید.' }
& .\.venv\Scripts\python.exe manage.py test chat.tests -v 2
exit $LASTEXITCODE
