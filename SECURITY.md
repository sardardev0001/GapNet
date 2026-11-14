# Security policy

## Reporting

Please **do not** publish live vulnerabilities, real credentials, or exploit details in public GitHub issues. Contact the repository maintainer privately using their GitHub profile/contact method, or enable **Private vulnerability reporting** in GitHub Settings → Security.

## Supported versions

Only the latest development version is the target for fixes; this is not a security-audited production service.

## Deployment cautions

- Use HTTPS/WSS for any remotely accessible deployment and limit network exposure.
- Create unique secrets in `.env` and never commit that file. Rotate them if ever exposed.
- Apply authentication rate limiting, logging, CSRF/session strategy, file scanning, backups, secure cookie settings, and monitoring before public launch.
- The web frontend stores JWTs in localStorage in this source release. This should be hardened for internet-facing production.
- Do not claim end-to-end encryption; this version does **not** implement E2EE.

Read [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) before making a server reachable from the internet.
