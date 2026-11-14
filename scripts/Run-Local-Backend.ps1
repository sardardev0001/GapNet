$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..\backend')
if (-not (Test-Path .\.venv)) {
  $selected = $null
  foreach ($version in @('3.12', '3.11', '3.13')) {
    & py "-$version" --version 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $selected = $version; break }
  }
  if (-not $selected) { throw 'Python 3.11 تا 3.13 را نصب کنید.' }
  & py "-$selected" -m venv .venv
}
$python = '.\.venv\Scripts\python.exe'
& $python -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed' }
& $python manage.py migrate
& $python -m daphne -b 127.0.0.1 -p 8000 config.asgi:application
