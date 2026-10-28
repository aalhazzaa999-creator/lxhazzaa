# LXDNA mt research database

This phase adds mt data and an independent mt explorer. The existing Y resolver,
atlas map, document gateway, account client, roles, and guest allowance remain on
their current paths. Only the legacy Y page URL handling is guarded while its
panel is hidden. A later Y migration can use the same interfaces after review.

## Sources and reproducibility

- Official YFullTeam/MTree source commit and SHA-256 are pinned in
  `public/data/phylogeny/mt-source.json`; CC BY 4.0 attribution is retained.
- Build entry: `node scripts/build-ytree.mjs` (existing provider setting).
- The build verifies source hashes and node counts, prepares a read-only research
  sample snapshot, then generates the mt graph and SQLite database using Python
  standard library only. No live third-party call is required for mt search.
- Original atlas files are untouched. Publication enrichment only fills missing
  fields and is recorded separately; original calls and sex values are retained.
- Snapshot fingerprints include source input bytes, enrichment, transformation
  code and schema. Frontend rejects mismatched mt/sample snapshot versions.

## Generated public artifacts

`/data/phylogeny/mt-database/` contains:

| File | Purpose |
|---|---|
| manifest.json | source/version, counts, snapshot and interpretation limits |
| nodes.json | version-qualified node IDs, parent, depth and DFS intervals |
| edges.json | explicit parent/child relations |
| events.json | per-node original mutation notation; recurrence is preserved |
| placements.json | exact source-name placements and unresolved dispositions |
| mt-research.sqlite.gz | normalized SQLite database, gzip-compressed |
| schema.sql | source, graph, samples, placements, people and future group tables |

These are generated in builds and ignored by Git. Source code, source lock and
schema are versioned in the repository. Published samples are existing public
ancient-remains records only. Living-person import and private-group interfaces
are not enabled. The people and research-group tables start empty.

## Scientific rules

1. mt and Y are separate namespaces. mt does not mean female: sex is an independent
   filter and unknown sex is preserved.
2. An mt haplogroup maps by its exact case-insensitive reported source label.
   Uncertain, absent or unrecognized labels are not forced into a parent.
3. Descendants come from explicit topology, never `startsWith`. H1 does not
   automatically include H10.
4. Mutation events are not aliases for clades. Recurrent mutations remain attached
   to their individual source nodes. Reference sequence is null when not supplied;
   no genomic-coordinate conversion is guessed.
5. A common ancestor is a topological lowest common ancestor in the named source
   version. It supplies no geographic, ethnic or chronological conclusion.
6. Multiple specimen records are not asserted to be unique individuals. Person
   identity reconciliation remains explicit and unknown, not inferred from names.
7. Original source calls, enrichment provenance and publication links remain
   separate from the placement decision. Counts of placed and unplaced records
   are displayed independently. Missing quality metadata is not imputed.
8. Node IDs include namespace, source version and original label, preventing
   cross-version or Y/mt collisions. Renamed labels need a reviewed crosswalk.

## SQL examples after decompressing the SQLite file

All descendants of H1:

```sql
SELECT child.label
FROM nodes AS parent JOIN nodes AS child
 ON child.source_id=parent.source_id
 AND child.tin>=parent.tin AND child.tin<parent.tout
WHERE parent.label='H1';
```

Closest common ancestor of two known mt clades:

```sql
WITH wanted AS (SELECT * FROM nodes WHERE label IN ('H1','H3'))
SELECT ancestor.label
FROM nodes ancestor JOIN wanted
 ON ancestor.source_id=wanted.source_id
 AND wanted.tin>=ancestor.tin AND wanted.tin<ancestor.tout
WHERE (SELECT COUNT(*) FROM wanted)=2
GROUP BY ancestor.node_id
HAVING COUNT(*)=2
ORDER BY ancestor.depth DESC LIMIT 1;
```

The guard prevents returning an ancestor for a partial set of recognized inputs.
Future sample-set/group overlap uses `group_samples` and `group_nodes`; a group's
membership and evidence must be explicit. Shared mutations alone do not define it.

## Verification and deployment boundary

- `node tests/mt-research.cjs`: source/record preservation, no inferred identities,
  mt isolation, actual H1/H10 boundary, recurrent event handling, LCA behavior,
  full tree intervals and placed/unplaced accounting across sex groups.
- `python3 tests/mt-sqlite.py`: integrity, foreign keys, interval queries, LCA and
  empty living/person/group tables.
- Browser: chooser, mt branch search, sex filters, sample links, common ancestor,
  exports, return to Y, existing atlas navigation and account dialog.
- Deploy preview first; production only after these checks. Previous production
  commit remains a rollback point. Account credentials/permissions are unchanged.
