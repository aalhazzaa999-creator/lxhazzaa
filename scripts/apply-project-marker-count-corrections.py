"""Apply audited, count-only import corrections to public build output. No STR values."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1];folder=root/'public/data/projects';patch=json.loads((root/'scripts/project-marker-count-corrections.json').read_text());corrections={r['id']:r for r in patch['records']};seen=set();manifest=json.loads((folder/'manifest.json').read_text())
for name in manifest['parts']:
 p=folder/name;rows=json.loads(p.read_text());changed=False
 for r in rows:
  c=corrections.get(r['id'])
  if not c:continue
  seen.add(r['id'])
  for k in ['availableMarkerLoci','availableMarkerSlots']:
   if r.get(k)!=c[k]:r[k]=c[k];changed=True
 if changed:p.write_text(json.dumps(rows,ensure_ascii=False,separators=(',',':')))
if seen!=set(corrections):raise ValueError('Correction kit missing from public snapshot')
print('Applied audited marker-readability counts:',len(seen),'kits; no SNP or prediction calls changed')
