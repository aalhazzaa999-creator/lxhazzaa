# Unified private sample account

This change adds one authenticated account surface at `/lxdnacontrole/app/` and moves the historical lab URL to it. The public landing remains coming soon. The account selector offers STR, evidence for review, and autosomal RAW. Reference controls appear only for owner/admin accounts; those controls configure local comparison data and do not grant access to other people's archives.

## Implemented

- Private originals in Supabase Storage bucket `lx-dna-private`, up to 20 MiB; no client overwrite/delete policies.
- Private archive with source file SHA-256, original name, kit/provider/type identity, explicit versioned consent and server timestamps. A controller is an uploader/custodian, not proof of genetic ownership. Different uploader accounts do not automatically merge into a public identity.
- Store STR reports after successful analysis and successful file persistence. Missing reference data fails clearly; it does not fabricate a prediction or publish a placement.
- Autosomal plain-text RAW format/coverage report: called/no-call rows, chromosomes, duplicates, unsupported rows and optional declared build. No ancestry, ethnicity, traits, health, kinship or tree placement is inferred.
- Evidence files stored pending review. BAM/VCF sequencing analysis and source-link imports are NOT implemented. Larger files require a separate resumable upload/compute service.
- Custodian/site-owner access to originals, names, email, reports and audit. General administrators cannot read someone else's sample name. Name/email remain private; show-email records a future publication preference and does not currently publish anything.
- Country and location cannot be directly updated by authenticated API users. A request requires a reason; only the site owner can approve/reject, and approval applies the new country/location. Public flags must derive only from an approved country when publication is implemented.
- Append-only audit records before/after edits and report versions. Failed uploads can resume only with the same file hash. Duplicate provider/kit/type under one custodian is rejected rather than overwritten.

## Not a completed public release

No automatic publishing to LXDNA Tree; no calibrated central reference collection; no project membership/delegation verification or bulk project ingestion; no automatic verification of kit ownership; no full autosomal ancestry/trait report; no BAM/VCF analysis. The UI and consent text explicitly communicate these limitations. These capabilities must not be claimed by changing labels.

## Validation

43 focused Node tests across CSV parsing, STR normalization, predictor behavior, family-held-out evaluation, account-role checks and RAW coverage parsing pass. Static DOM IDs checked for uniqueness and matching module controls. Live database tests (synthetic, transaction rolled back) cover private cross-account isolation, denied direct geography updates, denial of non-owner approvals, approved geography application and audit creation. No real user sample was uploaded during testing. Existing unrelated Supabase advisory findings were not changed. Authenticated browser upload and responsive visual QA remain to be exercised in a signed-in session.
