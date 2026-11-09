# Tree and STR predictor audit — 2026-11-09

## Findings and changes

- Genetic topology contains 69,676 Y nodes and 39,865 mt nodes, with no duplicate exact IDs in either tree. Basal `*` source nodes are not new SNP mutations. Empty basal leaves were visually misleading; the renderer now omits them when they have no samples or genetic children, without changing the source graph. Occupied basal nodes remain.
- Main tree selection previously shared the summary's collapse action. A dedicated branch-name button now selects the lower subtree; the summary's remaining area opens/closes descendants. A selected terminal branch with samples now opens automatically too.
- Hide-prediction/CSV and sex/quality/date/placement filters previously affected the lower diagram while main sample counts/leaves remained unfiltered. Both views now apply these filters. Selecting a branch still retains surrounding main-tree context.
- All directly assigned sample rows remain accessible. There is now an explicit show-all button alongside incremental loading; no eight-row truncation of the underlying data.
- The imported public project snapshot has 9,436 unique kit records; the research snapshot has 27,264 unique analysis records, including 14,352 nonempty reported Y fields (not all are resolved calls). There are no duplicate record IDs between those two snapshots. Record uniqueness does not establish that separate analyses or separate kits belong to distinct biological people.
- The pinned public YFull JSON contains branch topology, SNP names and age fields, but **no YFull sample IDs or STR profiles**. Populating all YFull testers cannot be accomplished from that file. We did not fabricate YF IDs, scrape private testers, or equate source population counts with locally available sample records.

## Marker binding

Input parsing binds named values to canonical marker names. Positional FTDNA panels use the explicit panel order and declared grouped/expanded copy layout. Missing cells do not shift subsequent values. DYS385 and DYS459 copies are compared within their own locus, never swapped with other loci. DYS389II is converted to the independent segment by subtracting DYS389I once in the distance engine; original imported values are retained.

The independent PDF audit uses the printed marker headers and table grid, rather than the importer's numeric marker offsets. It found **three real leading-digit losses in the J-FGC31318 DYS385 column**. The old left boundary was inside that wide cell. It also found one invisible-character discrepancy with no numeric difference. The boundary and character handling were corrected and private imports regenerated from the original PDFs. Detailed STR profiles and person names remain outside Git and public assets.

The direct engine API also now excludes alias collisions (for example DYS19 plus DYS394) and unsupported copy counts, rather than silently overwriting or comparing malformed data. Named-input parsing already rejected these cases. Version: `str-neighbors-v1.2.1`.

Primary vendor documentation: [FTDNA Y-STR Results Guide](https://help.familytreedna.com/hc/en-us/articles/4408063356303-Y-STR-Results-Guide), [FTDNA Understanding Y-STRs](https://help.familytreedna.com/hc/en-us/articles/6189126106767-Understanding-Y-STRs). The engine is an LX heuristic, **not** a vendor-endorsed or independently validated prediction method.

## Prediction readiness

Internal leave-one-kit-out checks on 662 accepted source-confirmed reference records produced 504 coarser-or-exact compatible results, including 44 exact labels; 114 results were incompatible with the published branch; 44 were finer than the published call and therefore unverified. These are internal audit categories, not a clinical/scientific accuracy estimate or calibrated confidence. Related-kit leakage and population bias remain uncontrolled.

Of 1,849 source-predicted project records, 1,781 had fewer than 12 readable grouped loci. The remaining 68 generated only limited-support outputs, including 59 finer branches compatible with the source call. **None were automatically published as new LX tree placements.** Preserving the reported source call is not proof of its correctness; it preserves provenance while a usable refinement method is unavailable.

The engine intentionally does not replace an SNP-confirmed target. Refining an upstream confirmed SNP is a distinct feature: preserve that SNP as a hard ancestry constraint and store any STR refinement separately as unconfirmed. That workflow and independently checked branch-level calibration remain required before automatic placement.

Reproduce aggregate checks with `scripts/audit-project-marker-columns.py` and `scripts/audit-project-predictions.mjs` using the authorized private imports. Only aggregate evidence belongs in this repository. No newly inferred sample placement should enter its own training set as confirmed evidence.

Final independent column check: 34,263 retained occurrence cells across 150 PDF pages, zero numeric mismatches and zero unverified cells after correction. Removing invisible characters also recovered previously rejected cells; 20 unique kit marker profiles changed in total. Public readability counts are reproducibly corrected during builds from the checked-in count-only correction file; raw values remain private.
