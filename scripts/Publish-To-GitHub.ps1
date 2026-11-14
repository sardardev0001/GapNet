param(
  [string]$Repository = 'GapNet',
  [switch]$Public
)
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $Root

foreach ($cmd in @('git', 'gh')) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) { throw "$cmd is required. Install Git for Windows and GitHub CLI first." }
}
& gh auth status
if ($LASTEXITCODE -ne 0) { throw 'Please run: gh auth login' }

# Do not create duplicate remotes or silently push to an existing repository.
if (Test-Path .git) {
  $existing = & git remote
  if ($existing -contains 'origin') { throw 'An origin remote already exists. Inspect it with git remote -v and push manually after review.' }
} else {
  & git init -b main
  if ($LASTEXITCODE -ne 0) { throw 'git init failed' }
}

& git add --all
if ($LASTEXITCODE -ne 0) { throw 'git add failed' }
& git diff --cached --name-only | ForEach-Object {
  if ($_ -eq '.env' -or $_ -like '*.pem' -or $_ -like '*.key') { throw "Sensitive file staged: $_" }
}
& git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
  & git commit -m 'chore: publish GapNet'
  if ($LASTEXITCODE -ne 0) { throw 'Commit failed: configure git user.name and user.email if needed.' }
}

$visibility = if ($Public) { '--public' } else { '--private' }
& gh repo create $Repository $visibility --source '.' --remote origin --push
if ($LASTEXITCODE -ne 0) { throw 'GitHub repository creation or push failed. See gh auth status and git status.' }
Write-Host 'Repository created and pushed. Inspect GitHub Actions before publishing a release.' -ForegroundColor Green
