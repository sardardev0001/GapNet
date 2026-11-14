#!/usr/bin/env python3
"""Offline repository hygiene checks; no network or third-party packages required."""
from __future__ import annotations
import json
import pathlib
import py_compile
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
issues: list[str] = []

def check(condition: bool, message: str) -> None:
    if not condition:
        issues.append(message)

for rel in ['README.md','.gitignore','.env.example','docker-compose.yml',
            '.github/workflows/ci.yml','docs/gapnet-design-reference.png',
            'frontend/src/App.tsx','backend/manage.py','desktop/package.json']:
    check((ROOT / rel).is_file(), f'missing {rel}')

# Guard against regression to the retired product branding. Generic "light mode"
# as a UI description and semantic package version numbers are allowed.
retired = re.compile(r'gapnet[\s_-]*light(?:[\s_-]*v?2)?|gapnet[\s_-]*v2', re.IGNORECASE)
for f in ROOT.rglob('*'):
    if not f.is_file() or f.suffix not in {'.md', '.json', '.ts', '.tsx', '.py', '.ps1', '.yml', '.yaml', '.html'}:
        continue
    if any(p in {'node_modules', '.git', '__pycache__'} for p in f.parts):
        continue
    try:
        content = f.read_text(encoding='utf-8-sig')
    except UnicodeDecodeError:
        continue
    if retired.search(content):
        issues.append(f'Retired product branding in {f.relative_to(ROOT)}')

ignore = (ROOT / '.gitignore').read_text(encoding='utf-8')
check('.env' in ignore and '!.env.example' in ignore, 'gitignore must exclude real .env and allow .env.example')
example = (ROOT / '.env.example').read_text(encoding='utf-8')
for key in ('DJANGO_SECRET_KEY', 'POSTGRES_PASSWORD'):
    m = re.search(r'^' + key + r'=(.*)$', example, flags=re.MULTILINE)
    check(m is not None and not m.group(1).strip(), f'{key} must be blank in safe example file')

for f in (ROOT / 'scripts').glob('*.ps1'):
    check(f.read_bytes().startswith(b'\xef\xbb\xbf'), f'PowerShell script missing UTF-8 BOM: {f.name}')

for f in (ROOT / 'backend').rglob('*.py'):
    try:
        py_compile.compile(str(f), doraise=True)
    except (SyntaxError, UnicodeError) as exc:
        issues.append(f'Python syntax: {f.relative_to(ROOT)}: {exc}')

for rel in ['frontend/package.json', 'desktop/package.json']:
    try:
        json.loads((ROOT / rel).read_text(encoding='utf-8'))
    except (ValueError, UnicodeError) as exc:
        issues.append(f'Invalid JSON {rel}: {exc}')

if (ROOT / '.git').exists():
    result = subprocess.run(['git','ls-files','--error-unmatch','.env'], cwd=ROOT, capture_output=True, text=True)
    check(result.returncode != 0, '.env is tracked in git: remove it from index before publishing')

if issues:
    for item in issues:
        print('ERROR:', item)
    sys.exit(1)
print('PASS: repository structure, secret-template hygiene, PowerShell encoding, Python syntax, package JSON')
