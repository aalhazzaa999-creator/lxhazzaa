"""Import public annotation fields through exact Genetic IDs, preserving source semantics."""
import csv,json,sys,hashlib,re
from pathlib import Path
lock=json.loads(Path('reference-sources/aadr-source.json').read_text());raw=Path(sys.argv[1]).read_bytes()
assert hashlib.sha256(raw).hexdigest()==lock['sourceSHA256'],'AADR checksum mismatch'
reader=csv.reader(raw.decode('utf-8-sig').splitlines(),delimiter='\t');header=next(reader)
assert len(header)==49 and header[2]=='Individual ID' and header[30]=='Molecular Sex' and header[47]=='ASSESSMENT','Unexpected annotation schema'
atlas=Path("public/data/atlas");manifest=json.loads((atlas/"manifest.json").read_text());needed={str(r.get(k)) for f in manifest["parts"] for r in json.loads((atlas/f).read_text()) for k in ["id","geneticId"] if r.get(k)}
rows={};seen=set()
def text(v):return None if str(v).strip() in ('','..','n/a','NA') else str(v).strip()
def number(v):
 try:return float(v) if re.fullmatch(r'-?\d+(\.\d+)?',str(v).strip()) else None
 except ValueError:return None
def interval(v):
 s=text(v)
 if not s:return None
 m=re.fullmatch(r'\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]',s)
 return {'lower':float(m[1]),'upper':float(m[2]),'confidence':.95,'raw':s} if m else {'raw':s}
for r in reader:
 if len(r)!=49:raise ValueError('Bad annotation row')
 id=r[0]
 if id in seen:raise ValueError('Duplicate Genetic ID')
 seen.add(id)
 if id not in needed:continue
 rows[id]={'geneticId':id,'persistentGeneticId':text(r[1]),'individualId':text(r[2]),'skeletalCode':text(r[3]),'firstPublication':text(r[5]),'publication':text(r[6]),'doi':text(r[7]),'repository':text(r[8]),'sex':text(r[30]),'familyRelations':text(r[31]),'groupId':text(r[14]),'yAuto':text(r[34]),'yISOGG':text(r[35]),'yManual':text(r[36]),'mt':text(r[38]),'date':{'meanBP':number(r[10]),'standardDeviationBP':number(r[11]),'fullDate':text(r[12]),'method':text(r[9]),'baseline':1950,'sourceIntervalPolicy':'95.4% calibrated interval unless otherwise specified; context ranges are not radiocarbon intervals'},'quality':{'coverage':number(r[23]),'offTargetCoverage':number(r[24]),'snps1240K':number(r[26]),'mtCoverage':number(r[37]),'mtConsensusMatch':text(r[39]),'damage':number(r[40]),'sexRatio':number(r[41]),'angsdContamination':interval(r[42]),'hapConXContamination':interval(r[43]),'libraryType':text(r[44]),'assessment':text(r[47]),'warnings':text(r[48])}}
out=Path('public/data/research');out.mkdir(parents=True,exist_ok=True)
(out/'aadr-annotations.json').write_text(json.dumps({'source':lock,'headers':header,'records':rows},ensure_ascii=False,separators=(',',':'))+'\n');print('Validated AADR annotations',len(rows))
