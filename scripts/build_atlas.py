#!/usr/bin/env python3
"""Build public, normalized ancient-remains snapshot from the user's master XLSX.
Uses only Python standard library; keeps original workbook outside published site.
Usage: python scripts/build_atlas.py '/path/to/ملف رفاه LXHAZZAA أطلس.xlsx'
"""
import sys, json, zipfile, xml.etree.ElementTree as ET, re, pathlib, collections, datetime
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'public/data/atlas'; OUT.mkdir(parents=True,exist_ok=True)
NS='{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
def rows(z,path,shared):
    with z.open(path) as fh:
        for _,e in ET.iterparse(fh,events=('end',)):
            if e.tag != NS+'row': continue
            vals={}
            for c in e.findall(NS+'c'):
                m=re.match('[A-Z]+',c.get('r',''))
                if not m: continue
                n=0
                for ch in m.group():n=n*26+ord(ch)-64
                v=c.find(NS+'v');t=c.get('t')
                if t=='inlineStr':val=''.join((q.text or '') for q in c.iter(NS+'t'))
                elif v is None:val=''
                elif t=='s':val=shared[int(v.text)]
                else:val=v.text or ''
                vals[n-1]=val
            yield [vals.get(i,'') for i in range(max(vals,default=-1)+1)]
            e.clear()
def num(v,low,high):
    try:
        n=float(v)
        return round(n,6) if low<=n<=high else None
    except (ValueError,TypeError):return None
def norm(s):return str(s or '').strip()
def yroot(s):
    s=norm(s).upper();m=re.match(r'^([A-Z]+)(?:[-0-9]|$)',s)
    if not m:return ''
    r=m.group(1)
    if r.startswith('J'):return 'J1' if s.startswith('J1') or s.startswith('J-M267') else ('J2' if s.startswith('J2') or s.startswith('J-M172') else 'J')
    if r.startswith('R'):return 'R1a' if s.startswith('R1A') else ('R1b' if s.startswith('R1B') else 'R')
    return r if len(r)<4 else r[:1]
def main(src):
    with zipfile.ZipFile(src) as z:
        shared=[]
        if 'xl/sharedStrings.xml' in z.namelist():
            with z.open('xl/sharedStrings.xml') as f:
                for _,e in ET.iterparse(f,events=('end',)):
                    if e.tag==NS+'si':shared.append(''.join(t.text or '' for t in e.iter(NS+'t')));e.clear()
        it=iter(rows(z,'xl/worksheets/sheet2.xml',shared));header=next(it)
        required=['معرّف السجل','خط العرض WGS84','خط الطول WGS84','نوع موضع الخريطة','الدولة/الكيان']
        for h in required:
            if h not in header:raise ValueError('Missing expected column: '+h)
        records=[];seen=set();invalid=0
        for row in it:
            d=dict(zip(header,row));id=norm(d.get('معرّف السجل'))
            if not id or id in seen:
                invalid+=1;continue
            seen.add(id)
            lat=num(d.get('خط العرض WGS84'),-90,90);lng=num(d.get('خط الطول WGS84'),-180,180)
            if lat is None or lng is None:lat=lng=None
            coord_type=norm(d.get('نوع موضع الخريطة'))
            y=norm(d.get('التحور المعروض')) or norm(d.get('تحور Y في الفهرس الحالي')) or norm(d.get('نداء Y اليدوي')) or norm(d.get('نداء Y التلقائي'))
            age=num(d.get('متوسط العمر BP'),0,1000000)
            rec={'id':id,'name':norm(d.get('اسم العينة/الفرد')),'country':norm(d.get('الدولة/الكيان')),'site':norm(d.get('الموقع الأثري/المحلية')),'label':norm(d.get('تسمية الخريطة')),'lat':lat,'lng':lng,'locationType':('unknown' if lat is None else ('country' if ('البلد' in coord_type or 'دولة' in coord_type or 'نقطة بلد تقريبية' in norm(d.get('دقة/وصف الإحداثيات'))) else 'site')),'locationAccuracy':norm(d.get('دقة/وصف الإحداثيات')),'y':y,'yRoot':norm(d.get('تصنيف الجذر AADR')) or yroot(y),'mt':norm(d.get('mtDNA AADR')) or norm(d.get('mtDNA الفهرس')),'ageBP':age,'ageText':norm(d.get('العمر/مدى التأريخ')),'dating':norm(d.get('طريقة التأريخ')),'culture':norm(d.get('الثقافة الأثرية')),'sex':norm(d.get('الجنس الجزيئي')),'source':norm(d.get('مصدر السجل')),'match':norm(d.get('حالة المطابقة')),'doi':norm(d.get('DOI')),'reference':norm(d.get('مرجع أول نشر')),'study':norm(d.get('عنوان الدراسة')),'geneticId':norm(d.get('AADR Genetic ID')),'individualId':norm(d.get('AADR Individual ID')),'notes':norm(d.get('حالة/ملاحظة المصدر'))}
            records.append(rec)
        parts=[]
        for i in range(0,len(records),3000):
            name=f'records-{i//3000+1:02d}.json'
            (OUT/name).write_text(json.dumps(records[i:i+3000],ensure_ascii=False,separators=(',',':')),encoding='utf-8')
            parts.append(name)
        roots=collections.Counter(r['yRoot'] for r in records if r['yRoot'])
        countries=collections.Counter(r['country'] for r in records if r['country'])
        manifest={'dataset':'LXHAZZAA Ancient Remains Atlas','parts':parts,'sourceWorkbook':pathlib.Path(src).name,'sourceSheet':'سجل الرفات','aadrVersion':'v66.p1 1240K','aadrDOI':'https://doi.org/10.7910/DVN/FFIDCW','total':len(records),'withCoordinates':sum(r['lat'] is not None for r in records),'countryApproximate':sum(r['locationType']=='country' and r['lat'] is not None for r in records),'withY':sum(bool(r['y']) for r in records),'withMt':sum(bool(r['mt']) for r in records),'duplicateOrEmptyIdsSkipped':invalid,'countries':dict(countries.most_common()),'roots':dict(roots.most_common()),'notice':'Country coordinates are approximate, not burial locations. Y/mtDNA calls and age methods must retain source distinctions. FTDNA/YFull person-level imports are not verified.'}
        (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
        # Summary of other workbook sheets, without publishing unverified family/person assignments.
        for sheet,name in [(4,'lineages'),(6,'references')]:
            a=list(rows(z,f'xl/worksheets/sheet{sheet}.xml',shared));h=a[0]
            items=[dict(zip(h,row)) for row in a[1:] if any(row)]
            (OUT/(name+'.json')).write_text(json.dumps(items,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
        print(json.dumps({k:manifest[k] for k in ['total','withCoordinates','countryApproximate','withY','withMt','duplicateOrEmptyIdsSkipped']},ensure_ascii=False))
if __name__=='__main__':
    if len(sys.argv)!=2:sys.exit('Usage: python scripts/build_atlas.py path/to/master.xlsx')
    main(sys.argv[1])
