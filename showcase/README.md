# TTG showcase (v6)

Phone-first Students and Providers CRM. One app, two data modes. No student data lives in this folder.

## Data modes
- **Live** (`showcase/`): real TTG Ops data, loaded at runtime from the TTG Ops API (the same `bootstrap` call /platform/ makes, read only) with the key saved on this device by TTG Ops (`localStorage ttgops.k`). With no key the page shows a key prompt and loads nothing. A typed key is saved only after the API accepts it. Data is held in memory only: never written to localStorage, sessionStorage, the service worker cache, or the URL. "Forget key" removes the key from this device (TTG Ops too).
- **Demo** (`showcase/?demo`): fictional data from `data.js` and `demo-docs.js`. Never calls the API.

The API only answers calls that carry the admin key and never returns case numbers, SSNs or TINs. Since v6, `bootstrap` also returns read-only fields from Nina's student chart per matching case (`chart`: date of birth, age, guardian address, school when named, attends school, schedule, provider phone and email) plus a `chart_sync` summary. They fill the Profile, Guardian address, service schedule and provider contact rows; anything the chart does not have still shows "Not on file".

## Files
- `model.js` adapters: live bootstrap or demo data into one model. Missing values stay empty and show "Not on file".
- `app.js` screens, alerts, search, sort, filters, router.
- `data.js`, `demo-docs.js` fictional demo only.

## Routes (hash)
`#/`, `#/students`, `#/providers`, `#/alerts[/GROUP]`, `#/students/ID[/services|/records|/notes]`, `#/students/ID/doc/N` (demo), `#/providers/ID[/students|/schedule|/notes]`

## Rules
Lists sort by last name (everything after the first given name; single names sort by that name). Alerts sort by urgency. Notes newest first. Dates read `Oct 23, 2026` everywhere.
