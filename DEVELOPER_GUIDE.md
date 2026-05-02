# Antigravity Rules of Engagement

## 🚫 Deployment & Git Rules
*   **NEVER** run `git commit` or `git push` unless explicitly commanded by the user (e.g., "Commit now").
*   **NEVER** run `firebase deploy` or any deployment commands unless explicitly commanded by the user.
*   **ALWAYS** assume the user wants to test changes locally first.

## 🚫 Testing & Browser Rules
*   **NEVER** attempt to open the browser or perform automated browser testing.
*   **NEVER** use browser interaction tools to "verify" the app. The user handles all manual verification.

## 🛠️ Development Workflow
1.  Plan the change with the user.
2.  Modify the necessary files.
3.  Notify the user that changes are ready for local testing.
4.  **WAIT** for further instructions (Testing, Committing, or Deploying).
