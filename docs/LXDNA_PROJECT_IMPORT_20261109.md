# Authorized FTDNA projects — 2026-11-09

User supplied six authorized PDF printouts: AlArid, Alarab, J-FGC31318, J2-M172, Arab_T, AboMubarak.

Extracted 12,842 valid row occurrences; merged to 9,445 distinct provider/kit identities, removing 3,397 duplicate occurrences. The highest actually readable marker count wins, then the declared test panel. Confirmation is preserved independently from marker selection. Conflicting marker values or confirmed branches are held for review rather than silently overwritten.

Public tree snapshot: 9,436 samples, including 7,587 calls confirmed by the green FTDNA SNP label and 1,849 **source predictions**, explicitly not new LX predictions. Nine unreadable/noncanonical calls remain private. No original PDF, name, email or STR value is committed in public data. The original hash and selected source page, names and available STR values are kept in an owner-only RLS table, `lx_dna_project_reference`.

All printouts are horizontally clipped. Alarab and AlArid contain no readable marker columns. Other print profiles contain at most 8, 13 or 19 distinct loci, never a complete 111/700 panel. The declared test name must not be mistaken for extracted marker coverage. Y-111 alone is never classified as SNP-confirmed. Big Y without a BAM actually analyzed by LX is a confirmed **non-BAM-reviewed** project result.

858 confirmed records have at least 12 readable loci and are available to the owner's existing reference-comparison worker. Imported names are not sent to the worker. Reference paths are rebuilt from the pinned FTDNA topology, absent calls are excluded, self-matches are excluded, and no new prediction is fabricated for missing markers. This is a partial regional reference collection, not a calibrated public predictor. 68 unconfirmed samples have at least 12 readable loci; batch inference and automatic publication of new LX predictions are not part of this snapshot.

Validation includes row-color extraction profiles, clipping checks, unique public kit IDs, public field allowlist, deduplication and conflict tests, plus live database count and owner-only access checks. Source documentation: https://help.familytreedna.com/hc/en-us/articles/14825374672655-Y-DNA-Haplogroups-Predicted-vs-Confirmed and project table legend (green SNP-confirmed, red predicted).
