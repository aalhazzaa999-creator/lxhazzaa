# Compact side cards and published branch ages

Side explorer cards are 176px wide (previously 248px), with a minimum height of 104px and compact counts. The vertical diagram retains its larger card width. Cards show the node label, published formed estimate, published TMRCA estimate and imported sample counts. More detail is available in the existing information dialog, including source/version and the published lower/upper bounds.

The deterministic build now retains six existing age fields from the same pinned, checksum-verified YFull YTree and MTree sources already used for topology. No live scraping, source substitution or independent re-estimation is performed. `formed` and `tmrca` must be positive finite numbers; zero, absent and n/a values remain unavailable. A missing value is not filled from an ancestor, descendant, equivalent-looking SNP or foreign topology. Confidence ranges are retained only when both positive endpoints are present in source order. No confidence percentage is invented when the source JSON does not provide one.

Values are labeled as published-source estimates in ybp. They are not converted to Gregorian dates or to the atlas's BP-before-1950 chronology. Branch ages and archaeological sample dates are distinct; ages alone do not establish a sample's SNP placement and do not trigger automatic relocation or exclusion. Imported sample counts remain LX counts, not YFull's underlying age-estimation sample count.

Source methodology: https://www.yfull.com/faq/how-does-yfull-determine-formed-age-tmrca-and-ci/ . Age estimates and topology remain under the existing source/version/hash and CC BY 4.0 attribution. The exact pinned version is shown in the reference information and node dialog; an old estimate is not presented as a live update.

Tests: `node --test tests/branch-ages.cjs`, followed by the full pinned-data build and existing research/phylogeny regressions. Tests cover numeric preservation, missing/zero values, invalid intervals, no inheritance, and unchanged branch/alias relations. Browser checks verify card dimensions, displayed values and the source dialog.
