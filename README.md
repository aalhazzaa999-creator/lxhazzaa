# LXHAZZAA — Research Universe

**Release:** v1.0 foundation / actual ancient-remains data snapshot.

## Contains
- Main portal, visitor entry, Arabic/English intro
- Ancient Remains Atlas: 27,096 normalized records, searchable and filterable, mapped when coordinates exist
- AADR v66.p1 provenance, references and Y-lineage summaries
- Manuscripts platform skeleton (not a finished database)
- PostgreSQL schema and reproducible XLSX import script

## Deploy
Unzip; upload **all contents including subfolders** to the root of `aalhazzaa999-creator/lxhazzaa`, commit on `main`. Netlify reads `netlify.toml` and publishes `public/`.

**IMPORTANT:** This is not the original ChatGPT Sites application code; it is a new implementation from the existing master data workbook. Authentication and transactional database have not yet been connected. Do not present the manuscript platform as operational.

Detailed instructions: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
