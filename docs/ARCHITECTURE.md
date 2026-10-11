# LXHAZZAA — technical architecture / المخطط البرمجي

## Release 1: operational public atlas
- `public/` is the ONLY directory Netlify publishes. No raw workbook, credentials, database schema, or build scripts are published.
- `public/index.html`: branded LXHAZZAA portal, visitor mode (client-side browsing only). Authentication is intentionally **not implemented**; do not mistake sessionStorage for a user account.
- `public/lxhuman/atlas/`: operational search/filter/list/detail/map for 27,096 records exported from the master workbook.
- `public/data/atlas/records-*.json`: public read-only normalized snapshot, split into 3,000-record chunks; `manifest.json` verifies the count.
- `public/manuscripts/`: clear development placeholder, no fake upload or moderation functionality.
- `netlify/functions/health.mjs`: simple health endpoint, not an authentication or database API.

## Data provenance and scientific guardrails
- Source: `ملف رفاه LXHAZZAA أطلس.xlsx`, worksheet `سجل الرفات`, AADR v66.p1 1240K; DOI https://doi.org/10.7910/DVN/FFIDCW.
- Master workbook remains in the user's file library and is **not included in the public ZIP**. Regenerate using `python scripts/build_atlas.py '/path/to/workbook.xlsx'`.
- Preserve `id`, `geneticId`, `individualId`, matching status, method of dating, source and location accuracy.
- AADR Genetic ID exact matches are distinct from Individual ID links requiring review. Never infer modern ethnic identity from haplogroups.
- 84 points are approximate country-level coordinates and **not graves**; mark yellow. Site/locality points do not necessarily pinpoint burial.
- FTDNA/YFull are not verified sample-by-sample; not silently imported.
- Family/person candidate sheet is **not published**, because it contains explicitly unverified claims.
- 27,096 rows are actual unique IDs in the workbook; the separate AADR counts describe the source integration, not 27,096 AADR individuals.
- Data is served as static snapshots; there is no server-side transactional database in release 1.

## Backend / Phase 2
- `db/migrations/001_initial.sql` provides PostgreSQL schema for data_sources, remains, provenance/match links, research references, manuscripts and translations.
- Provision a database (e.g., Netlify DB/Postgres) and securely configure `DATABASE_URL` in Netlify environment variables. Do not place secrets in GitHub.
- Implement authenticated administrative import and review workflow; audit changes; paginate/filter server-side before migrating 27k records to live API.
- Add proper authentication via trusted identity provider; protect uploads and administration with server-side authorization.
- Add manuscript upload moderation, original-language transcription then translated versions, rights declarations, and 15-language UI translations.

## Netlify deployment
1. Unzip and upload the **contents** of the archive to GitHub repo root, preserving nested folders. Commit to `main`.
2. Existing Netlify site is already linked to GitHub. `netlify.toml` sets `publish = "public"` and `functions = "netlify/functions"`; no build command required.
3. Check `https://lxhazzaa.netlify.app/`, `/lxhuman/atlas/`, `/manuscripts/`, `/api/health`.
4. If the site is blank or 404, verify `netlify.toml`, `public/index.html`, and all `public/data/atlas/records-*.json` exist on the GitHub branch.
5. No need to delete the old root `index.html` or `styles.css`; they are ignored by the `public` publish setting.

## Performance
- The first atlas visit fetches 10 JSON chunks (~17 MB uncompressed); HTTP compression reduces transfer, but mobile devices may still need time to parse the dataset. Later release should move search/filter to paginated Postgres API and vector map clustering.
- Map renders up to 750 markers per filtered view; the record list searches all records.
- Leaflet tiles and library are loaded from external public CDNs; maps need an internet connection.
