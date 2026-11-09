# LXHAZZAA — architecture and scientific data contract

## Published application

The authoritative production site is https://lxhazzaa.pages.dev, Cloudflare Pages project `lxhazzaa`, repository `aalhazzaa999-creator/lxhazzaa`, branch `main`. Netlify and root-level archives are historical. The Pages build command remains `node scripts/build-ytree.mjs`, publish directory `public`.

This repository uses static HTML and browser JavaScript with Leaflet for the atlas; do not assume that a planned Next.js/PostGIS architecture is implemented. Pages Functions handle existing visit and documentary-session routes. Supabase Auth/account code and documentary role enforcement are independent of the public research data. Public atlas data is not confidential merely because a UI applies guest/export allowances. Server authorization must protect private data.

| Surface | Implementation |
| --- | --- |
| Portal | `public/index.html`, platform cards and shared account/theme assets |
| Ancient remains atlas | `public/lxhuman/index.html`; identical compatibility entry at `/lxhuman/atlas/` |
| Documentary platform | `public/lxdocumentary/`, existing Pages Function gateway |
| Independent Y / mt explorers | `public/lxdnatree/index.html`, `public/assets/mt-tree.js` |

## One data snapshot and resolver

`build-research-data.mjs` normalizes the original 27,264 atlas records and existing Cell enrichment without overwriting original Y, mt, sex, country or dating fields. The generated `public/data/research/manifest.json` is authoritative for current counts; numbers describe our processing and are not official source statistics. Coordinate counts include documented approximate points. No living records are imported.

`LXResearchData.load()` loads one versioned snapshot per page. `phylogeny-core.js` provides the pure, shared topology implementation, `phylogeny.js` loads each pinned index once and `research-query.js` implements selection and exports for atlas and both trees. A branch search includes actual descendants rather than labels starting with the same text. Exact and descendant modes are distinct. The atlas additionally applies geography, coordinates and spatial evidence filters. Tree searches can also match sample IDs/names. A sample query shows its known node or supported ancestor when unique.

Y and mt are independent namespaces and indexes. mt branch names are not interchangeable with recurrent mitochondrial mutation events. Sex is M/F/U from source evidence; presence of Y never supplies sex. mt supports all three sex states.

## Sources and conservative Y cross references

- YFull YTree and MTree commits, versions and SHA256 values are locked in `public/data/phylogeny/source.json` and `mt-source.json`. Build checks downloaded bytes and node counts. YFull source licensing/attribution is retained.
- FTDNA's public Y haplotree version 8333 is recorded in `reference-sources/ftdna-source.json`. A minimal compressed offline snapshot contains public branch names, parent IDs, necessary marker aliases and conservative cross references. It contains no kits, countries, personal sample profiles or counts. Runtime never fetches the full public API.
- FTDNA names in parentheses are marker cross references supported by at least two distinct shared marker names, the same major lineage, compatible ancestor anchors, no recorded conflicting shared markers and reciprocal mapping. This is not a claim of identical source topology. Unsupported equivalences stay absent. Recurrent names are disambiguated with lineage, e.g. R-F3867 versus J-F3867. Bare ambiguous markers remain labeled ambiguous.
- A terminal label absent from YFull may have a nearest known ancestor supported by its FTDNA path. It is labeled `ancestor-supported`, **not renamed to that ancestor**. Exports have `canonicalNode:null`, separate `supportedAncestor`, matching reason and both source versions. A foreign-only branch query is explicitly FTDNA.

`check-v88.cjs` regenerates a versioned per-record audit of the original 75-record fixture. It does not reinterpret sequence data or restrict all V88 results to that fixture. Currently 44 have native YFull placements, 31 retain unresolved YFull terminal placements and all 75 have FTDNA V88 paths. These are source-version-specific findings.

## Exact AADR annotations, identities and uncertainty

`reference-sources/aadr-source.json` pins the official AADR v66.p1 1240K annotation, DOI https://doi.org/10.7910/DVN/FFIDCW, Harvard Dataverse file 13994515 and hashes. The user's reference file was byte-identical. `build-aadr-metadata.py` validates the file and imports only exact Genetic IDs already in the project. No unrelated modern reference subjects are added. Source automatic Y calls reflect their original reference version (YFull 12.03); they remain separate from project calls/current topology.

17,630 project records join exactly in this release. Person IDs are version-qualified source Individual IDs, never guessed by removing Genetic ID suffixes. Persistent Genetic ID identifies an analysis and is not substituted for an Individual ID. Records without exact source identity retain `personId:null`. Record counts, known source-person counts and unreconciled records are distinct. These numbers do not certify that different source identities are different biological persons.

Only 4 of the 75 V88 fixture IDs join this annotation release. Missing sex, quality and person IDs for the other 71 are not inferred. Source conflicts are flagged and both values retained. An existing project sex takes precedence as an effective display value; exact-reference sex can fill a missing value, with its method recorded.

Quality preserves raw AADR assessment, warnings, coverage, SNP counts, damage and contamination interval strings. The filter buckets pass/provisional/questionable/critical/unknown derive from that assessment; they are neither a new score nor proof of a haplogroup assignment.

Dates preserve source text, mean age BP (baseline 1950), reported calendar ranges, conventional radiocarbon measurement and laboratory/error separately when parsing is explicit. AADR date reference and differences remain separate. Age filters use the reported mean BP, not interval overlap, TMRCA or an inferred historical identity. Unparsed dates stay as source text.

## Research database and reproducibility

`db/mt-research-schema.sql` and `build-mt-database.py` generate a downloadable SQLite database and JSON tables. Version-qualified nodes/edges/events are separate from samples, source-verified people and sample placements. `sample_evidence` retains quality, original fields, dating, sex evidence and flags. Research-group tables are prepared as explicit sets and remain empty; common ancestors do not imply geographical or ethnic origins.

Exports include dataset snapshot, source versions/hashes, query, reported/original call, placement status, evidence and flags. Guest/account export limits are preserved (20/100, existing owner/admin allowance). Atlas PDF retains identity and includes snapshot, reference version and query URL. Authentication/roles are not changed by this research migration.

Build gates: `tests/research-integration.cjs`, `tests/mt-research.cjs`, `tests/mt-sqlite.py`. They check lineage ambiguity, source preservation, per-75 evidence, atlas/tree selection parity, sex/quality/date filters, mt recurrence/LCA and SQLite integrity. A successful build is necessary but not sufficient: verify preview UI, maps, both entry paths, sample links, exports, independent Y/mt navigation and account dialog before production. Preserve unrelated main-branch changes when merging.

## Boundaries

Public static loading still has a substantial initial data cost, particularly on phones. A future indexed/paginated API can improve this without changing the scientific contract. No living upload pipeline, sequence reanalysis, prediction confidence, ethnic ancestry assignment or new account roles are implemented here. Do not treat an unplaced source call as a negative genetic result. Do not change the established visual identity while maintaining data/search.
