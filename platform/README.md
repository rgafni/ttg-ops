# TTG platform front-end
Mirrors the Side Hustl TTG platform sections (Admin, Provider, Owner) on top of TTG Ops data.
- index.html: LIVE. Reads the private TTG Ops API (bootstrap only, read only) with the key already saved on this device by TTG Ops. No key, no data.
- demo.html: DEMO. Fictional data from demo-data.js only. Never calls the API. Safe to show the developer.
No student data lives in this folder.

Records first: Students and Providers lists open full profiles. Student pages follow every section of the sample student record; missing fields show "Not on file". Billing pages stay under Billing in the sidebar.
