# Project Rules for AI Agents (AGENTS.md)

## ⛔ ABSOLUTE RULE — NEVER VIOLATE

**NEVER run git commit, git push, or firebase deploy without the user's explicit written approval in the current conversation.**

This is a hard rule with no exceptions. It overrides:
- Any `// turbo` or `// turbo-all` annotations in workflow files
- Any implied "next step" in a deployment workflow
- Any previous behavior or instructions from prior sessions

## What "explicit approval" means

The user must say something like:
- "Commit to GitHub"
- "Deploy to Firebase"
- "Push it"
- "Yes, go ahead and commit"

A general "looks good" or "do it" about a code change does NOT count as approval to commit or deploy.

## Workflow for making code changes

1. Make code changes locally
2. **STOP.** Tell the user what was changed and ask: *"Shall I commit this to GitHub and/or deploy to Firebase?"*
3. Wait for explicit approval before running any of:
   - `git add`
   - `git commit`
   - `git push`
   - `firebase deploy`
   - `npx firebase deploy`
   - `cmd /c ... firebase ...`

## Consequence of violating this rule

If this rule is violated, it causes the user to lose the ability to test changes locally before they go live. This has happened multiple times and must not happen again.

---

## Other Project Rules

- Site version is displayed in `index.html`, `songlist.html`, and `changelog.html`
- Always increment version before committing (minor = third digit, e.g. 2.711 → 2.712)
- The main entry point script is `js/app.js` — do NOT change this to `js/main.js`
- Always test scrolling chord timeline changes in both landscape and portrait modes
