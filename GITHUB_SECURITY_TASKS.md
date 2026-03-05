# 🛡️ GitHub Security Maintenance: Handling Secret Scanning Alerts

GitHub has flagged your Firebase API keys as "leaked secrets". Since these keys are *intended* to be in client-side code, they are not a security risk **IF** they are properly restricted.

Follow these steps to resolve the alerts and secure your project.

---

## ✅ Task 1: Restrict API Keys in Google Cloud (Critical)

1.  **Open Google Cloud Credentials**: Go to the [Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials).
2.  **Locate the Keys**: Find the key matching the GitHub alert (e.g., `AIzaSyDaDli2...`).
3.  **Set Website Restrictions**:
    *   Click the key name to edit.
    *   Under **Application restrictions**, toggle **Websites**.
    *   Add your deployment domain: `https://jaredvanhensen.github.io/*` (The `*` ensures all sub-pages are covered).
4.  **Click Save**.

*Repeat this for any other active key mentioned in the alerts.*

---

## ✅ Task 2: Dismiss Alerts on GitHub

1.  Go to your GitHub repository: [jaredvanhensen/popsongchordbook](https://github.com/jaredvanhensen/popsongchordbook).
2.  Navigate to the **Security** tab.
3.  Click **Secret scanning alerts** under the Code Security section.
4.  For the alerts showing `AIza...`:
    *   Click the alert to open it.
    *   Click **Close alert** (top right).
    *   Select **"Used in tests"** or **"False positive"** as the reason.

---

## ✅ Task 3: Cleanup Inactive Keys

If Leak #1 is an old key you no longer use (not present in `js/config/firebase-config.js`):
1.  Go back to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2.  **Delete** the old key entirely to ensure it cannot be used by anyone.

---

> [!TIP]
> **Why are Firebase Keys "public"?**
> Firebase keys are just project identifiers, not secret passwords. They are required by the browser to know which project to connect to. As long as you follow Task 1 (Website Restriction), your project is secure!
