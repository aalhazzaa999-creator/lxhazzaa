"""Build an auditable, relational mtDNA research database from pinned source + public atlas.
No genomic classifications are inferred from mt mutation strings. No living people imported.
"""
import json,sqlite3,hashlib,re,gzip,tempfile,os
from pathlib import Path
base=Path('public/data/phylogeny');out=base/'mt-database';out.mkdir(parents=True,exist_ok=True)
read=lambda p:json.loads(Path(p).read_text())
meta=read(base/'mt-source.json');tree=read(base/'mtree.json');data=read('public/data/research/manifest.json')
source_id='yfull:mt:'+meta['version'];node_id=lambda label:'mt:yfull:'+meta['version']+':'+label
nodes=[];events=[];edges=[];bylabel={};clock=0

def walk(item,parent=None,depth=0):
 global clock
 label=item['id'];uid=node_id(label)
 if label.upper() in bylabel:raise ValueError('Duplicate node label '+label)
 n={'id':uid,'label':label,'parentId':parent,'depth':depth,'tin':clock,'tout':None,'basal':label.endswith('*')};clock+=1;nodes.append(n);bylabel[label.upper()]=n
 if parent:edges.append({'parent':parent,'child':uid})
 for i,notation in enumerate(filter(None,(s.strip() for s in item.get('snps','').split(',')))):
  # Parse only simple source notation. Reference sequence remains unknown unless supplied.
  m=re.fullmatch(r'([ACGT])(\d+)([ACGT])',notation)
  events.append({'id':uid+':event:'+str(i),'nodeId':uid,'notation':notation,'position':int(m[2]) if m else None,'ancestral':m[1] if m else None,'derived':m[3] if m else None,'referenceSequence':None,'interpretation':'source-notation-only'})
 for child in item.get('children',[]):walk(child,uid,depth+1)
 n['tout']=clock
walk(tree)
if len(nodes)!=meta['nodes'] or len(edges)!=len(nodes)-1:raise ValueError('Source topology count mismatch')
records=[r for f in data['parts'] for r in read('public/data/research/'+f) if r.get('mt')]
placements=[]
for r in records:
 call=re.sub(r'\s+','',r['mt']).upper();n=bylabel.get(call)
 status='resolved' if n else 'uncertain' if '?' in call else 'unplaced'
 placements.append({'sampleId':r['id'],'nodeId':n['id'] if n else None,'status':status,'reason':'exact-source-haplogroup-label' if n else 'no-inferred-placement'})
fingerprint=hashlib.sha256((meta['sourceSHA256']+data['snapshot']+Path(__file__).read_text()+Path('db/mt-research-schema.sql').read_text()).encode()).hexdigest()[:20]
header={'schemaVersion':1,'nodeIdPolicy':'Namespace + source version + original node label. Renamed labels are not silently merged across versions.','namespace':'mt:yfull','sourceId':source_id,'treeType':'mt','snapshot':fingerprint,'sampleSnapshot':data['snapshot'],'source':meta,'nodeCount':len(nodes),'edgeCount':len(edges),'eventCount':len(events),'sampleCount':len(records),'placedSamples':sum(p['status']=='resolved' for p in placements),'unplacedSamples':sum(p['status']!='resolved' for p in placements),'uniquePeople':len({r['personId'] for r in records if r.get('personId')}),'unreconciledIdentities':sum(not r.get('personId') for r in records),'livingSamples':0,'warning':'Topological common ancestor is not a geographic, ethnic or historical origin claim. Mutation events may recur independently. Missing quality/reference-sequence metadata is not inferred.'}
for name,obj in [('nodes',nodes),('edges',edges),('events',events),('placements',placements)]:
 (out/(name+'.json')).write_text(json.dumps({'snapshot':fingerprint,'rows':obj},ensure_ascii=False,separators=(',',':'))+'\n')
fd,tmp=tempfile.mkstemp(suffix='.sqlite');os.close(fd)
try:
 db=sqlite3.connect(tmp);db.executescript(Path('db/mt-research-schema.sql').read_text());
 db.execute('INSERT INTO sources VALUES(?,?,?,?,?,?)',(source_id,meta['source'],meta['version'],meta['sourceURL'],meta['sourceSHA256'],meta['retrieved']))
 db.executemany('INSERT INTO nodes VALUES(?,?,?,?,?,?,?,?,?)',[(n['id'],source_id,'mt',n['label'],n['parentId'],n['depth'],n['tin'],n['tout'],int(n['basal'])) for n in nodes])
 db.executemany('INSERT INTO edges VALUES(?,?)',[(e['parent'],e['child']) for e in edges])
 db.executemany('INSERT INTO node_events VALUES(?,?,?,?,?,?,?,?)',[(e['id'],e['nodeId'],e['notation'],e['position'],e['ancestral'],e['derived'],None,e['interpretation']) for e in events])
 db.execute('INSERT INTO sources VALUES(?,?,?,?,?,?)',('aadr:'+data['reference']['version'],data['reference']['source'],data['reference']['version'],data['reference']['sourceURL'],data['reference']['sourceSHA256'],data['reference']['retrieved']))
 db.executemany('INSERT INTO people VALUES(?,?)',[(pid,'source-individual-id') for pid in sorted({r['personId'] for r in records if r.get('personId')})])
 db.executemany('INSERT INTO samples VALUES(?,?,?,?,?,?,?,?,?,?,?)',[(r['id'],'ancient',r['displayName'],r['personId'],r['identityStatus'],r['original']['sex'],r['sexGroup'],r['country'],r['mt'],json.dumps(r['provenance']['mt'],ensure_ascii=False),json.dumps({'doi':r['doi'],'reference':r['reference'],'publications':r.get('publications',[])},ensure_ascii=False)) for r in records])
 db.executemany('INSERT INTO sample_evidence VALUES(?,?,?,?,?,?,?,?,?)',[(r['id'],'aadr:'+data['reference']['version'] if r.get('aadr') else None,r['aadr']['geneticId'] if r.get('aadr') else None,r['quality']['status'],json.dumps(r['quality'],ensure_ascii=False),json.dumps(r['dateEvidence'],ensure_ascii=False),json.dumps(r['sexEvidence'],ensure_ascii=False),json.dumps(r['original'],ensure_ascii=False),json.dumps(r['dataFlags'],ensure_ascii=False)) for r in records])
 db.executemany('INSERT INTO sample_placements VALUES(?,?,?,?,?)',[(p['sampleId'],source_id,p['nodeId'],p['status'],p['reason']) for p in placements])
 db.executemany('INSERT INTO metadata VALUES(?,?)',[(k,json.dumps(v,ensure_ascii=False)) for k,v in header.items()]);db.commit()
 if db.execute('PRAGMA integrity_check').fetchone()[0]!='ok' or db.execute('PRAGMA foreign_key_check').fetchall():raise ValueError('SQLite integrity checks failed')
 db.close()
 with open(tmp,'rb') as src,open(out/'mt-research.sqlite.gz','wb') as dst:
  with gzip.GzipFile(fileobj=dst,mode='wb',mtime=0) as gz:gz.write(src.read())
finally:os.unlink(tmp)
(out/'manifest.json').write_text(json.dumps(header,ensure_ascii=False,indent=2)+'\n')
(out/'schema.sql').write_text(Path('db/mt-research-schema.sql').read_text())
print('mt research database:',json.dumps({k:header[k] for k in ['snapshot','nodeCount','edgeCount','eventCount','sampleCount','placedSamples','unplacedSamples']}))
