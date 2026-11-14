# Contributing to GapNet

Thanks for your interest. Small, focused, reproducible improvements are welcome.

## Before opening a pull request

1. Search existing issues and open a discussion for larger feature changes.
2. Create a branch: `git checkout -b fix/short-description`.
3. Follow the existing Persian-first UX and preserve true RTL accessibility.
4. Update documentation and tests when changing behavior or API contracts.
5. Verify locally: `python scripts/check_repo.py`, `npm run build --prefix frontend`, `python backend/manage.py test chat.tests` (with Python dependencies installed), and ideally `node scripts/smoke-test.mjs` with the stack running.
6. Do not commit `.env`, JWTs, database dumps, private user content, credentials, or personal access tokens.
7. Open a pull request with a summary, tests run, and screenshots for visible UI changes.

## Code style

- Backend: Python/Django conventions; readable, narrow patches.
- Frontend: React + TypeScript, semantic elements, keyboard focus states, and RTL-aware CSS.
- PowerShell: UTF-8 with BOM for Windows PowerShell 5.1 compatibility.
- Security: report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

The repository owner decides on merge and release cadence.
