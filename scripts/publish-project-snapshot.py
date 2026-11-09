"""Make a strict allowlist public snapshot from the private import output."""
import json,re,sys
from pathlib import Path
source=Path(sys.argv[1]);out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
samples=json.loads((source/'samples.json').read_text());records=[]
for r in samples:
 if not r['haplogroup'] or r['reviewReasons']:continue
 country=r['country'];country='Palestine' if country in ['Israel','Palestinian Territory','األراضي الفلسطينية'] else country
 status='confirmed_non_bam' if r['snpVerified'] else 'source_prediction'
 records.append(dict(id='FTDNA:'+r['kitId'],sampleId=r['kitId'],displayName=r['kitId'],recordType='living',resultType='confirmed' if r['snpVerified'] else 'prediction',verification=status,
  y=r['haplogroup'],yRoot=r['haplogroup'].split('-')[0],mt=None,sexGroup='M',personId=None,identityStatus='kit-only-no-person-claim',country=country,
  ageBP=None,ageText='عينة حيّة',testType=r['test'],declaredPanel=r['declaredPanel'],availableMarkerLoci=r['markerLoci'],availableMarkerSlots=r['markerSlots'],
  projects=r['projects'],sourceURLs=[f'https://www.familytreedna.com/public/{p}?iframe=ydna-results-overview' for p in r['projects']],
  quality=dict(status='unknown',assessment='تحور مؤكد في جدول FTDNA؛ لم يُفحص BAM في LX' if r['snpVerified'] else 'توقع FTDNA المنشور؛ لم يصدر من متنبي LX'),
  dataFlags=['أعمدة STR مقصوصة في PDF؛ لا تُستكمل القيم المفقودة بالتخمين']+([] if r['snpVerified'] else ['توقع من المصدر، ليس تأكيد SNP ولا توقعًا جديدًا من LX']),
  provenance={'y':{'source':'authorized FTDNA project PDF','snapshot':'ftdna-projects-20261109-v1'}}))
parts=[]
for start in range(0,len(records),1000):
 name=f'project-samples-{start//1000+1:02}.json';parts.append(name);(out/name).write_text(json.dumps(records[start:start+1000],ensure_ascii=False,separators=(',',':')))
manifest=dict(schemaVersion=1,snapshot='ftdna-projects-20261109-v1',total=len(records),confirmed=sum(r['resultType']=='confirmed' for r in records),sourcePredicted=sum(r['resultType']=='prediction' for r in records),lxPredicted=0,privateReview=len(samples)-len(records),parts=parts,source='FTDNA project PDFs supplied with permission',namesPublished=False,markersPublished=False,confirmationRule='FTDNA green SNP-confirmed call; Y-111 alone never confirms a haplogroup',predictionRule='Red source calls are explicitly source predictions; no invented LX prediction',deduplication='provider + kit; highest actually readable marker slots, then declared panel; compatible source calls only')
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2));print(json.dumps(manifest,ensure_ascii=False,indent=2))
