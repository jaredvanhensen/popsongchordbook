# Agent Rules & Safety Guidelines

## Deployment & Production Safety
- **CRITICAL**: Never run `comit.ps1`, `publish.ps1`, `deploy.ps1`, or `firebase deploy` (or any command that updates the production environment/GitHub) without explicit, one-time permission for that specific action.
- Always assume the user wants to test changes locally first on the dev server (http://localhost:8080).
- If a task involves UI or logic changes, confirm with the user after local implementation before even suggesting a commit.

## Development Workflow
1. Apply changes to local files.
2. Inform the user they can test the changes at http://localhost:8080.
3. Wait for feedback or approval.
4. Only when the user says something like "Commit this" or "Deploy now," execute the corresponding script.
