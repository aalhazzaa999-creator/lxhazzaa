"""Create a minimal, version-pinned public topology snapshot, excluding kit/person/country counts.
One-time input: the official public API JSON. Builds need only the compressed reference.
"""
import json,gzip,hashlib,re,collections,sys
from pathlib import Path
raw=Path(sys.argv[1]).read_bytes();ft=json.loads(raw);tree=json.loads(Path('public/data/phylogeny/ytree.json').read_text());cross=json.loads(Path(sys.argv[2]).read_text())
def key(s):return re.sub(r'^([A-T](?:\d+[A-Z0-9]*)?|BT|CT|DE|CF|IJ|NO)-','',re.sub(r'\s+','',str(s).upper()))
p=Path('public/data/atlas');m=json.loads((p/'manifest.json').read_text());records=[r for f in m['parts'] for r in json.loads((p/f).read_text())];needed={key(r['y']) for r in records if r.get('y')};aliases=collections.defaultdict(set)
rows=[]
for id,n in ft['allNodes'].items():
 rows.append([int(id),n.get('parentId'),n['name']])
 for v in [n['name']]+[v['variant'] for v in n.get('variants',[])]:
  k=key(v)
  if k in needed:aliases[k].add(int(id))
metadata={k:cross[k] for k in ['source','sourceURL','sourceVersion','publishedDate','retrieved','sourceSHA256','method']}
obj={'schemaVersion':1,'metadata':metadata,'rows':sorted(rows),'aliases':[[k,sorted(v)] for k,v in sorted(aliases.items())],'crosswalk':cross['entries'],'notice':'Only public branch labels, parent IDs and marker-name mappings. No kits, personal identifiers, samples or country counts imported.'}
encoded=json.dumps(obj,separators=(',',':')).encode();archive=gzip.compress(encoded,mtime=0);out=Path('reference-sources/ftdna-y-'+str(ft['id'])+'.json.gz');out.write_bytes(archive)
lock={'source':metadata,'archive':str(out),'archiveSHA256':hashlib.sha256(archive).hexdigest(),'normalizedSHA256':hashlib.sha256(encoded).hexdigest(),'nodeCount':len(rows)};Path('reference-sources/ftdna-source.json').write_text(json.dumps(lock,indent=2)+'\n');print('Minimal pinned FTDNA archive:',len(rows),'nodes',len(archive),'bytes')
