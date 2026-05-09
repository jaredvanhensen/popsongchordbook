---
description: common scripts for regular development workflow
---

# Deploy the application to production

> ⛔ **APPROVAL REQUIRED**: Every step below requires explicit user approval before running.
> Never auto-run any of these steps. The `// turbo` annotation is intentionally removed.
> See AGENTS.md at the project root for the full rule.

## Steps (each requires user to say "go ahead" or equivalent)

1. Update version field inside `index.html` by incrementing it (minor version, e.g. 2.711 → 2.712). Also update `songlist.html` version display and all script query strings.
2. Update `changelog.html` with the latest changes and new version number.
3. **PAUSE — ask the user**: "Changes are ready. Shall I commit to GitHub?"
4. If approved: `git add .` then `git commit -m "<description> (v<version>)"`
5. `git push origin main`
6. **PAUSE — ask the user**: "Committed and pushed. Shall I deploy to Firebase?"
7. If approved: `cmd /c npx firebase deploy --only hosting`
