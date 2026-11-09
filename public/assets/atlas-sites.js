/* Named research localities, independent of map clusters and zoom level. */
((root) => {
  'use strict';
  const normalize = value => String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
  const missing = new Set(['', '..', 'unknown', 'n/a', 'na', 'غير محدد', 'موقع غير محدد', 'غير متوفر']);
  // These two AADR locality labels identify the same site. See
  // doi:10.1016/j.cell.2020.04.044 and doi:10.1371/journal.pone.0241883.
  // Do not merge unrelated sites merely because their map coordinates are close.
  const aliases = new Map([
    ['atchana-alalakh (hatay, reyhanlı)', 'alalakh-hatay'],
    ['tell-atchana (hatay, reyhanlı)', 'alalakh-hatay']
  ]);
  function summarize(records) {
    const sites = new Map();
    let excluded = 0;
    for (const record of records) {
      const site = String(record.site ?? '').trim();
      const country = String(record.country ?? '').trim();
      const normalized = normalize(site);
      if (missing.has(normalized) || normalized === normalize(country) || record.locationType === 'country') {
        excluded++;
        continue;
      }
      const alias = normalize(country) === 'turkey' ? aliases.get(normalized) : null;
      const key = JSON.stringify([normalize(country), alias || normalized]);
      let group = sites.get(key);
      if (!group) {
        group = { key, name: alias ? 'Alalakh / Tell Atchana (Hatay, Reyhanlı)' : site, country, count: 0 };
        sites.set(key, group);
      }
      group.count++;
    }
    return { sites: [...sites.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)), excluded };
  }
  root.LXAtlasSites = { summarize };
  if (typeof module === 'object' && module.exports) module.exports = root.LXAtlasSites;
})(typeof window === 'object' ? window : globalThis);
