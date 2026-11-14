# GapNet — Changelog

## [2.0.0] — 2026-11-12

> Product name: **GapNet**. The numeric entry below is a release number, not part of the brand.

- Persian-first RTL web interface with a white right-hand navigation rail and a bright minimal appearance.
- Django REST API, Channels/WebSocket chat, JWT authentication, PostgreSQL and Redis.
- Desktop Electron client and Windows installer configuration.
- Repository hygiene: `.env` excluded, example environment file sanitized, GitHub workflows and contributor docs.
- Fixed Windows PowerShell 5.1 script encoding and TypeScript nullable-session handling in the provided source.
- Standardized project branding to **GapNet** across documentation, package IDs, Docker Compose and desktop packaging.
- Renamed the client-side session storage key to `gapnet.session`; existing browser sessions may require signing in again.
- Hotfix details have been folded into the release history; no separate patch download is needed.

**Validation:** source-level checks pass; no end-to-end Docker/desktop runtime test was performed in this packaging environment. See [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md).
