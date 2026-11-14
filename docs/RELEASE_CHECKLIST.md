# GapNet — Release checklist

## Repository

- [x] `.env` and local user data excluded from the packaged source.
- [x] `.gitignore`, `.editorconfig`, `.gitattributes` present.
- [x] GitHub Actions source checks defined.
- [x] Screenshots, quick start and setup docs included.
- [x] Windows PowerShell scripts encoded with UTF-8 BOM.
- [x] TypeScript nullable `session` use addressed in uploaded source.
- [x] Brand display names, npm package IDs and Compose identifier standardized to GapNet.
- [ ] Existing installations: back up PostgreSQL/media and follow `docs/UPGRADING.md` before switching Compose project name.
- [ ] Frontend dependencies installed and `npm run build` passes on a networked machine.
- [ ] Backend dependencies installed, migrations verified and backend tests pass.
- [ ] Docker Compose full build, startup and HTTP/WebSocket smoke tests pass.
- [ ] Windows Electron installer built, installed and tested.
- [ ] Security review and HTTPS deployment completed for public service.
- [ ] Repository visibility and license chosen by the owner.

## Recommended manual QA

1. Register two users with unique handles; verify duplicate detection and login.
2. Create a direct conversation, send text in two browsers, confirm immediate delivery and history persistence.
3. Verify group creation, file attachment upload/download with member-only access, edit/delete and read receipt.
4. Check mobile layouts, focus handling and right-to-left text input.
5. Restart backend and confirm messages remain in PostgreSQL.
6. Run `node scripts/smoke-test.mjs` and save its output when it succeeds.

Do not label a release *production-ready* until unchecked tests and hardening steps have been completed.
