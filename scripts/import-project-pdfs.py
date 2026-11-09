"""Read authorized FTDNA printouts without inventing clipped table cells.

Private output MUST stay outside public/ and git. Public output contains no
names, STR values or contact details. Coordinates are specific reviewed print
profiles; fail if the colored haplogroup column moves.
"""
import argparse, collections, hashlib, json, re
from pathlib import Path
import fitz

PROFILES = {
 'AlArid': dict(match='AlArid', kit=(55.5,85.5), name=(85.5,368.5), country=(368.5,454.3), hap=454.6, test=495.8, markers=[]),
 'Alarab': dict(match='Alarab', kit=(55.5,85.5), name=(85.5,411.9), country=(411.9,497.7), hap=498.0, test=540.3, markers=[]),
 'J2-M172': dict(match='J2-M172', kit=(33,63), name=(63,206.3), country=(206.3,282.4), hap=282.7, test=322.5, markers=[397.2,409.2,421.2,433.2,445.2,464.7,476.7,488.7,500.7,512.7,524.7,536.7,548.7]),
 'J-FGC31318': dict(match='J-FGC31318', kit=(33,63), name=(63,294.6), country=(294.6,345.8), hap=346.1, test=385.9, markers=[465.7,477.7,489.7,501.7,514.7,536.7,548.7,560.7]),
 'Arab_T': dict(match='العربية T', kit=(33,63), name=(63,202.5), country=(202.5,284.3), hap=284.6, test=326.9, markers=[443,455,470,485,500,527.7,539.7,551.7]),
 'AboMubarak': dict(match='مبارك', kit=(33,63), name=(63,63), country=(63,120.2), hap=120.5, test=160.3, markers=[280.7,292.7,304.7,316.7,328.2,348.2,360.2,374.2,388.2,400.2,412.2,424.2,436.2,464.7,476.7,488.7,500.7,514.7,528.7]),
}
ORDER='DYS393 DYS390 DYS19 DYS391 DYS385 DYS426 DYS388 DYS439 DYS389I DYS392 DYS389II DYS458 DYS459 DYS455 DYS454 DYS447 DYS437 DYS448 DYS449'.split()
COPIES={'DYS385':2,'DYS459':2}
TRANSLATED={'70إم-تي':'T-M70','184 إم-تي':'T-M184','77 بي-تي':'T-P77','181م-ب':'B-M181','201إم-جي':'G-M201','96إم-إي':'E-M96','152م-ب':'B-M152','86إم-سي':'C-M86','58إم-إي':'E-M58'}
COUNTRIES={'البحرين':'Bahrain','الكويت':'Kuwait','المملكة العربية السعودية':'Saudi Arabia','السعودية':'Saudi Arabia','قطر':'Qatar','العراق':'Iraq','اليمن':'Yemen','عمان':'Oman','اإلمارات العربية المتحدة':'United Arab Emirates','الإمارات العربية المتحدة':'United Arab Emirates','مصر':'Egypt','األردن':'Jordan','الأردن':'Jordan','سوريا':'Syria','لبنان':'Lebanon','فلسطين':'Palestine','أصل غير معروف':'','غير معروف':'','Unknown Origin':''}

def text_in(chars,lo,hi):
 return ''.join(c['c'] for c in chars if lo <= (c['bbox'][0]+c['bbox'][2])/2 <hi).replace('\xa0',' ').replace('\x00','').strip()

def parse(path, project, cfg):
 doc=fitz.open(path); digest=hashlib.sha256(path.read_bytes()).hexdigest(); rows=[]; rejects=collections.Counter()
 for page_no,page in enumerate(doc,1):
  spans=[s for b in page.get_text('rawdict')['blocks'] for l in b.get('lines',[]) for s in l['spans']]
  anchors=[s for s in spans if s['color'] in (32768,16711680) and s['bbox'][1]>30]
  for a in anchors:
   if abs(a['bbox'][0]-cfg['hap'])>1: rejects['unexpected_hap_column']+=1;continue
   y=a['bbox'][1];rowspans=[s for s in spans if abs(s['bbox'][1]-y)<1]
   chars=[c for s in rowspans for c in s['chars']]
   kit=text_in(chars,*cfg['kit']);hapraw=''.join(c['c'] for c in a['chars']).strip();hap=TRANSLATED.get(hapraw,hapraw)
   if not re.fullmatch(r'(?:[A-Z]{0,4})?\d{2,10}',kit): rejects['invalid_kit']+=1;continue
   country_raw=text_in(chars,*cfg['country']);country=COUNTRIES.get(country_raw,country_raw)
   starts=cfg['markers'];test_raw=text_in(chars,cfg['test'],starts[0]-.3 if starts else 569.5)
   big=re.search(r'(?:500|700)',test_raw)
   test='Big Y-'+big.group() if big and ('Big' in test_raw or 'واي' in test_raw) else (re.search(r'Y-DNA\s*(12|25|37|67|111)',test_raw) or [None,None])[0]
   panel= int(big.group()) if test and test.startswith('Big') else int(re.search(r'\d+',test).group()) if test else 0
   markers={};bad=[]
   for j,start in enumerate(starts):
    end=starts[j+1]-.2 if j+1<len(starts) else ({'J2-M172':564.2,'J-FGC31318':569.4,'Arab_T':563.7,'AboMubarak':540.2}[project])
    value=text_in(chars,start-.3,end).replace(' ','');name=ORDER[j]
    if not value:continue
    if re.fullmatch(r'\d{1,2}(?:-\d{1,2})*',value):
     alleles=[int(x) for x in value.split('-')]
     if len(alleles)==COPIES.get(name,1) and all(1<=x<=100 for x in alleles):markers[name]=alleles;continue
    bad.append(name)
   canonical=bool(re.fullmatch(r'[A-T]-[A-Z][A-Z0-9.]*',hap))
   rows.append(dict(kitId=kit,project=project,page=page_no,pdfSHA256=digest,haplogroup=hap if canonical else None,sourceCall=hapraw,
     snpVerified=a['color']==32768 and canonical,confirmationEvidence='FTDNA green haplogroup column' if a['color']==32768 else 'FTDNA red predicted column',
     country=country,countryOriginal=country_raw,personalName=text_in(chars,*cfg['name']),test=test or test_raw,declaredPanel=panel,markers=markers,
     markerLoci=len(markers),markerSlots=sum(map(len,markers.values())),clippedColumns=True,invalidMarkerCells=bad,
     sourceURL=f'https://www.familytreedna.com/public/{project}?iframe=ydna-results-overview'))
 return rows,dict(rejects)

def reconcile(rows):
 groups=collections.defaultdict(list)
 for r in rows:groups[r['kitId']].append(r)
 samples=[]
 for kit,occ in groups.items():
  best=max(occ,key=lambda r:(r['markerSlots'],r['declaredPanel'],r['snpVerified']))
  conflict=any(sorted(a['markers'][k])!=sorted(b['markers'][k]) for i,a in enumerate(occ) for b in occ[i+1:] for k in a['markers'].keys()&b['markers'].keys())
  confirmed={r['haplogroup'] for r in occ if r['snpVerified']}
  # A topology-aware postprocessor can resolve compatible ancestor/descendant calls.
  hap=next(iter(confirmed)) if len(confirmed)==1 else best['haplogroup'] if not confirmed else None
  reasons=[]
  if conflict:reasons.append('conflicting STR values across projects')
  if len(confirmed)>1:reasons.append('multiple SNP calls require topology reconciliation')
  result=dict(best,projects=sorted({r['project'] for r in occ}),occurrences=len(occ),snpVerified=len(confirmed)==1 and not conflict,
      haplogroup=hap,confirmedCalls=sorted(confirmed),reviewReasons=reasons)
  result['selectedMarkerSource']={'project':best['project'],'page':best['page'],'pdfSHA256':best['pdfSHA256']}
  samples.append(result)
 return sorted(samples,key=lambda r:r['kitId'])

def main():
 ap=argparse.ArgumentParser();ap.add_argument('input');ap.add_argument('private_output');args=ap.parse_args();rows=[];report={}
 for p in sorted(Path(args.input).glob('*.pdf')):
  matches=[(k,v) for k,v in PROFILES.items() if v['match'] in p.name]
  if len(matches)!=1:raise ValueError('Unreviewed print profile: '+p.name)
  k,c=matches[0];r,reject=parse(p,k,c);rows+=r;report[k]={'rows':len(r),'green':sum(x['snpVerified'] for x in r),'markerLociMax':max((x['markerLoci'] for x in r),default=0),'rejected':reject,'pages':len(fitz.open(p))}
 samples=reconcile(rows);out=Path(args.private_output);out.mkdir(parents=True,exist_ok=True)
 (out/'occurrences.json').write_text(json.dumps(rows,ensure_ascii=False,separators=(',',':')))
 (out/'samples.json').write_text(json.dumps(samples,ensure_ascii=False,separators=(',',':')))
 summary={'projects':report,'occurrences':len(rows),'uniqueKits':len(samples),'duplicateOccurrences':len(rows)-len(samples),'confirmedCandidates':sum(r['snpVerified'] for r in samples),'reviews':sum(bool(r['reviewReasons']) for r in samples)}
 (out/'extraction-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2));print(json.dumps(summary,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
