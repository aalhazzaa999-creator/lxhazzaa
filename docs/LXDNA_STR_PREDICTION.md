# LXDNA Control — Y-STR SNP-grounded predictor v1
Date: 2026-11-05. Status: experimental, administrator-only local analysis.

## Purpose and boundaries
This engine ranks **hypotheses** for a male Y-chromosome haplogroup from STR markers using independent **Y-SNP-confirmed** reference kits. It does not sequence or confirm SNPs, establish pedigrees, infer ethnicity, establish paternity, or change existing accepted YFull/FTDNA/Big Y evidence. Do not publish a prediction as a confirmed call. A target with an existing SNP confirmation is not predicted over. No probability percentages are provided because the reference collection has not been empirically calibrated.

The analysis takes place in the authenticated owner/admin workspace, entirely in the browser. The tool does **not** upload, persist or publish the entered target or references. Browser source files themselves are public assets and contain no sample-specific private data. Import only data for which you have explicit authorization or a lawful redistribution right.

## Input contract
Target:
```json
{"markers":{"DYS393":13,"DYS390":24,"DYS389I":13,"DYS389II":29}}
```
Add at least 12 valid markers. The four values above illustrate JSON shape only and are not a usable prediction profile.

References:
```json
[
  {"kitId":"example-1","path":["J-M172","J-M47"],"snpVerified":true,
   "markers":{"DYS393":13,"DYS390":24}}
]
```
This example is also intentionally insufficient. Each reference must have a true SNP-tested branch and at least 12 STR markers, and `path` must list its actual phylogenetic ancestors from root to the tested terminal branch. Never set `snpVerified:true` merely because a kit displays a haplogroup string or has 67/111 markers; independently validate the source of the SNP call. Do not synthesize terminal calls. Check FTDNA versus YFull tree version/name equivalences; where unresolved, preserve both sources and stop at a defensible ancestor.

Optional `knownAncestor` restricts the comparison to reference paths containing that independently verified node. `mutationRates` is optional and must use independently validated Y-STR locus mutation rates. Without validated rates every comparable STR locus has equal weight. An imported FTDNA project appearing in several projects must map to one kit identity, not duplicate a vote. Conflicting duplicate entries are excluded.

## Implementation
- `public/assets/lxdna-predictor.mjs`: pure, deterministic and auditable engine; no network or storage.
- `public/assets/lxdna-predictor-ui.mjs`: local JSON input, local reference-file loading, and read-only output.
- `public/lxdnacontrole/workspace/index.html`: role-gated owner/admin interface; public landing remains unchanged.
- `tests/lxdna-predictor.mjs`: nine synthetic regression cases.

1. Normalize STR alleles, compare multicopy loci without relying on allele order, normalize DYS389II to II–I to avoid double counting, and skip missing/incomparable loci instead of fabricating matches.
2. Accept only distinct, SNP-verified reference kits. Exclude contradictory duplicate kits rather than inflating the sample size.
3. Compute an optional locus-rate-weighted distance over genuinely shared loci. Require at least 12 comparable markers; for stronger evidence require at least 23 shared markers from three relevant independently confirmed kits.
4. Select nearest reference kits and vote hierarchically on a consistent verified phylogeny path. Stop descending when independent evidence disagrees, the sample count is too low or support falls below conservative heuristic thresholds.
5. Report `candidate`, `limited`, or `unresolved` with nearest reference kit identifiers, locus overlap, distances, branch-by-branch audit, and explanatory caveats. `probability` is always null; heuristic vote share is **not** a calibrated posterior probability.
6. No automatic placement or mutation of LXDNA Tree, no rewriting the existing SNP field, no automatic community origin or ancestry label.

## Statistical validation gates **before any public automated predictions**
- Obtain a legally usable, geographically diverse reference set with real Y-SNP and Y-STR pairs from J1/J2/E/R/T and other lineages as available. Treat broad and terminal branch validation separately.
- Collapse repeated kits across FTDNA projects by stable sample identity. Where identifiers differ, reconcile only with independent evidence; otherwise flag ambiguous rather than merge by name or surname.
- Freeze and cite the YFull and FTDNA phylogeny releases and each training dataset version. Reference samples should carry project provenance and test basis.
- Separate test datasets by kit/person and by source project (leave-one-kit-out and leave-one-project-out); prohibit same sample, close relative clusters, or overlapping project copies leaking between train and test. Compare kNN, allele-frequency/Bayesian and Random Forest/SVM baselines if enough independent examples exist.
- Report depth-specific and haplogroup-specific precision, recall, coverage, confusion, calibration and abstention; use held-out data and population subgroup breakdowns. Only then may empirical probabilities be displayed. No single claimed accuracy applies to all haplogroups or branch depths.
- Evaluate missing markers, 12/37/67/111 panels, STR mutation/reversions, multi-copy markers, conflicting SNP annotations and unseen clades. Calibrate a refusal/abstention threshold for poorly represented lineages.
- Publish predictions only in a separately styled predictions layer if explicitly approved, never as verified Big Y/SNP placement; require confirmation by SNP or Big Y before changing the verified tree.

## Literature (peer-reviewed, not a claim of locally validated performance)
- 2026: *From fathers to forebears: Benchmarking Y-chromosomal short tandem repeat haplogroup predictors for forensic paternal lineage inference*, Forensic Science International: Genetics. DOI: https://doi.org/10.1016/j.fsigen.2026.103596 (2,193 test profiles; SNP confirmation still recommended).
- 2022: *Assessing the factors influencing the performance of machine learning for classifying haplogroups from Y-STR haplotypes*, Forensic Science International. https://pubmed.ncbi.nlm.nih.gov/36150277/ (impact of mutation rates and population composition).
- 2024: *YHP: Y-chromosome Haplogroup Predictor for predicting male lineages based on Y-STRs*, Forensic Science International. DOI: https://doi.org/10.1016/j.forsciint.2024.112113 (Random Forest validation in an East Asian training set; not transferable accuracy).
- 2020: *Predicting haplogroups using a versatile machine learning program (PredYMaLe)*, Forensic Science International: Genetics. DOI: https://doi.org/10.1016/j.fsigen.2020.102342.

## Project rollout note
The user-supplied public FTDNA projects (J2-M172, E3b, R1b, R1a and others) have **not** been bulk imported or transformed into a verified reference dataset in this changeset. This implementation is a safe predictor core and manual administrator evaluation surface; public bulk prediction and reference ingestion are separate data-provenance and validation work. Production build and Cloudflare deployment must be verified after code merge.
## STR review workspace update (2026-11-05)

The owner/admin lab now accepts named marker/value lines, two-row headers and values, JSON, and explicitly selected FTDNA 12/25/37/67/111 panels in grouped or expanded copy order. Panel 12 contains 11 grouped loci and is **below this engine's minimum of 12 comparable loci**. Incomplete panels must use named markers so a missing token cannot shift every following marker. Duplicate aliases, unknown loci, malformed values and wrong copy counts stop parsing. Microvariants such as 17.2 are retained exactly in the parsed input and reported as excluded from the integer step-distance model; they are never rounded. Null/no-call values are not zero-repeat matches.

Panel order reference: FamilyTreeDNA's own Y-DNA results table headers, https://www.familytreedna.com/public/FTDNALearningCenter?iframe=ydna-results-overview ; introductory 12-marker report: https://www.familytreedna.com/pdfs/?path=%2Fpdf-docs%2Ftr_y12m.pdf . These are vendor sources for its panel format, not independent validation of this predictor. General Y-STR locus reference: US NIST STRBase https://strbase-archive.nist.gov/ystr_fact.htm .

Reference import contract for the lab is now a versioned source bundle:
```json
{"schemaVersion":1,"source":{"title":"Source title","url":"https://example.org/dataset","version":"release-id","date":"2026-11-05"},"records":[]}
```
Populate `records` with authorized, SNP-confirmed kits, `kitId`, `haplogroup` and `markers`. `path` remains an optional consistency check. The interface requires source metadata, but this is a declaration by the importer: **neither an HTTPS URL nor snpVerified:true proves a study's authority or the SNP call's validity**. No STR reference data is bundled or fetched automatically. A blank template is downloadable; it intentionally cannot produce a result.

A worker fetches only this site's public pinned tree snapshots, resolves SNP aliases and generates each reference path from the selected YFull or FTDNA topology. Unknown/ambiguous terminal labels and incompatible submitted ancestors are excluded. A known SNP scope must resolve in that same tree; no branch is inferred using a text prefix. Conflicting duplicate kits are reconciled before scope filtering; an optional target kit ID prevents self-matching. Different IDs for the same person still require source reconciliation outside the engine.

The worker keeps large comparison tasks off the main interface. Cancel and clear terminate it. Nothing in the prediction code transmits input values or writes them to persistent storage. Existing site authentication and public-snapshot downloads still use the network. Results show nearest-reference branch alternatives, compared loci, distances, the nearest results' common ancestor, links to the existing tree and a local JSON audit export with source and snapshot metadata. The links open existing records without publishing a predicted placement. Nearest-five alternative counts are not population frequencies or calibrated probabilities. Missing/unequal panels and related reference kits remain limitations; synthetic regression tests do not establish biological accuracy.

Validation: parser and engine regression suite, topology/path tests, complete pinned-data build and worker integration tests. No calibrated Bayesian model, independent accuracy percentage, or public reference population was added. Those require an authorized reference collection and held-out SNP-confirmed profiles as described above.
