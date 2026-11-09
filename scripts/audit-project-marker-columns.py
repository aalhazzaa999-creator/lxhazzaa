"""Read-only independent column audit: header names + PDF grid, not marker offsets.
Print aggregate counts only; never print names, kit IDs or STR profiles.
"""
import collections, importlib.util, json, re, sys
from pathlib import Path
import fitz
spec=importlib.util.spec_from_file_location('imp',Path(__file__).with_name('import-project-pdfs.py'));imp=importlib.util.module_from_spec(spec);spec.loader.exec_module(imp)
mismatches=[]
rows=json.loads(Path(sys.argv[2]).read_text());counts=collections.Counter();by_project={}
for pdf in Path(sys.argv[1]).glob('*.pdf'):
 matches=[(k,c) for k,c in imp.PROFILES.items() if c['match'] in pdf.name]
 if len(matches)!=1:raise ValueError('Unknown PDF profile')
 project,cfg=matches[0];doc=fitz.open(pdf);expected={(r['page'],r['kitId']):r for r in rows if r['project']==project};stats=collections.Counter();bounds={}
 for page in doc:
  spans=[s for b in page.get_text('dict')['blocks'] for l in b.get('lines',[]) for s in l['spans']]
  headers=[s for s in spans if re.fullmatch(r'DYS\d+(?:i|ii)?',s['text'],re.I) and s['bbox'][0]>cfg['test']]
  drawings=page.get_drawings() if headers else []
  for h in headers:
   x,y=h['bbox'][:2];vertical=[]
   for draw in drawings:
    for it in draw['items']:
     if it[0]=='re':
      r=it[1]
      if r.width<=1 and r.height>=40 and r.y0<=y+2 and r.y1>y:vertical.append(r.x0)
   lo=max((v for v in vertical if v<x),default=None);hi=min((v for v in vertical if v>x),default=page.rect.width)
   if lo is not None and hi is not None:bounds[h['text'].upper()]=(lo+.5,hi)
  raw=[s for b in page.get_text('rawdict')['blocks'] for l in b.get('lines',[]) for s in l['spans']]
  for anchor in raw:
   if anchor['color'] not in (32768,16711680) or abs(anchor['bbox'][0]-cfg['hap'])>1:continue
   chars=[c for s in raw if abs(s['bbox'][1]-anchor['bbox'][1])<1 for c in s['chars']]
   kit=imp.text_in(chars,*cfg['kit']);r=expected.get((page.number+1,kit))
   if not r:continue
   for name,stored in r['markers'].items():
    if name not in bounds:stats['unverifiedCells']+=1;continue
    value=imp.text_in(chars,*bounds[name]).replace(' ','').replace('\u200b','').replace('\ufeff','')
    parsed=[int(x) for x in value.split('-')] if re.fullmatch(r'\d{1,2}(?:-\d{1,2})*',value) else None
    stats['checkedCells']+=1
    if parsed!=stored:
     stats['mismatchedCells']+=1;mismatches.append(dict(project=project,page=page.number+1,kitId=kit,marker=name,stored=stored,read=parsed,raw=value))
  stats['pages']+=1
 counts.update(stats);by_project[project]=dict(stats)
if len(sys.argv)>3:
 dest=Path(sys.argv[3]).resolve();repo=Path(__file__).resolve().parents[1]
 if dest==repo or repo in dest.parents:raise ValueError('Detailed output must stay outside repository')
 dest.write_text(json.dumps(mismatches))
print(json.dumps({'totals':dict(counts),'projects':by_project},indent=2))
if counts['mismatchedCells'] or counts['unverifiedCells']:sys.exit(1)
