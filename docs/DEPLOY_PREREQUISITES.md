# Deploy prerequisites (not done in the v4 PR)

This PR ships the **six-portal front-end** and fixture/tests only. It does **not** merge to `main`, change GitHub Pages settings, or deploy Apps Script.

## Before going live
1. Review and merge the PR on GitHub (human merge).
2. Confirm GitHub Pages still serves `main` `/` for `rgafni.github.io/ttg-ops`.
3. Apps Script (work account) remains the private API. Optional follow-up: add server actions to persist billing sign-off / flags into Sheets with an audit trail. Until then, sign-off is **session-local on the device**.
4. Do **not** paste admin keys into the public repo, issues, or screenshots.
5. Ensora exports and Drive backups stay private and out of this repo. Import/normalization can be a later private job; this PR does not upload them.
6. Smoke-test on phone with admin link: Home tiles, one student, notes, billing checkboxes, report draft, email draft (no send).

## Auth reminder
Every live data call must POST `{ key, action, data }` to the Apps Script `/exec` URL. UI hiding is not authorization. Unauthorized responses must fail closed (gate / fixtures), never show live clinical payloads.
