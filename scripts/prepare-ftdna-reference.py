"""Prepare marker-name cross references and an audit, never rewrite source sample calls.
Usage: python scripts/prepare-ftdna-reference.py /path/to/official-api-snapshot.json
"""
import json,sys,hashlib,re
from pathlib import Path
from collections import defaultdict
p=Path('public/data/phylogeny'); raw=Path(sys.argv[1]).read_bytes(); ft=json.loads(raw); tree=json.loads((p/'ytree.json').read_text())
def norm(s):return re.sub(r'^([A-T](?:\d+[A-Z0-9]*)?|BT|CT|DE|CF|IJ|NO)-','',re.sub(r'\s+','',str(s).upper()))
aliases=defaultdict(set);nodes={}
def visit(n,parent=None):
 nodes[n['id']]={'parent':parent}
 for a in [n['id']]+re.split(r'[,/]',n.get('snps','')):
  if a and '!' not in a:aliases[norm(a)].add(n['id'])
 for c in n.get('children',[]):visit(c,n['id'])
visit(tree)
ftnodes=ft['allNodes'];ftnames=defaultdict(list)
for k,n in ftnodes.items():ftnames[norm(n['name'])].append(k)
def major(s):
 m=re.match(r'^([A-T])(?:[0-9-]|$)',s.upper());return m[1] if m else ''
def ancestor(child,parent):
 seen=set()
 while child in nodes and child not in seen:
  if child==parent:return True
  seen.add(child);child=nodes[child]['parent']
 return False
candidates=[]
for k,n in ftnodes.items():
 hit=aliases.get(norm(n['name']),set())
 if len(hit)!=1:continue
 target=next(iter(hit));
 if not major(target) or major(target)!=major(n['name']):continue
 shared=[v['variant'] for v in n.get('variants',[]) if aliases.get(norm(v.get('variant','')))=={target}]
 conflicts=[v['variant'] for v in n.get('variants',[]) if aliases.get(norm(v.get('variant',''))) and aliases[norm(v['variant'])]!={target}]
 # Two independently named source markers, same major lineage and compatible ancestor anchors.
 compatible=True;pid=str(n.get('parentId'));seen=set()
 while pid in ftnodes and pid not in seen:
  seen.add(pid);pn=ftnodes[pid];anchors=aliases.get(norm(pn['name']),set())
  if len(anchors)==1:
   a=next(iter(anchors))
   if major(a)==major(target) and not ancestor(target,a):compatible=False;break
  pid=str(pn.get('parentId'))
 if len(set(shared))>=2 and not conflicts and compatible:candidates.append({'yfull':target,'ftdna':n['name'],'status':'shared-marker','evidence':sorted(set(shared))})
bytarget=defaultdict(list)
for e in candidates:bytarget[e['yfull']].append(e)
entries=[e for e in candidates if len(bytarget[e['yfull']])==1 and e['yfull'].upper()!=e['ftdna'].upper()]
meta={'source':'FamilyTreeDNA public Y-DNA haplotree','sourceURL':'https://www.familytreedna.com/public/y-dna-haplotree/get','sourceVersion':str(ft.get('id')),'publishedDate':ft.get('publishedDate'),'retrieved':'2026-10-28','sourceSHA256':hashlib.sha256(raw).hexdigest(),'method':'At least two distinct shared defining marker labels, same major lineage, compatible source ancestor anchors, no conflicting shared markers and reciprocal node mapping. These names are marker cross references, not a claim that entire tree topologies are identical.','entries':entries}
(p/'ftdna-aliases.json').write_text(json.dumps(meta,separators=(',',':'))+'\n')
print('FTDNA cross references:',len(entries))
