# TTG Ops decisions (append-only)

- 2026-10-15 Front page must be simple: few labeled sections, no unexplained color coding, minimal text. (Roni)
- 2026-11-06 Home has exactly six portals with these names; documents live inside records. (Roni)
- 2026-11-07 Student and provider record sections and their order. SSN masked to last 4. Empty fields hidden. (Roni)
- 2026-11-15 Calendar lives inside Providers & Schedules as its first view, not as a seventh portal. Built only from the schedules already on the assignments; anything unreadable is listed as written. (overnight build, Roni's OK pending)
- 2026-11-15 Record sections open only when tapped, each with a one-line summary. (overnight build, from Roni's Oct 13 request; OK pending)
- 2026-11-15 The public fixture carries only fields the live API sends, so the preview never shows what the live app cannot. (overnight build)
- 2026-11-15 Notes the API cannot link to exactly one student are shown in their own "Not linked" group with the name as written, never attached. (overnight build, API v11)
