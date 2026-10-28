import fs from 'node:fs';
import crypto from 'node:crypto';
import core from '../public/assets/phylogeny-core.js';
const dir='public/data/atlas/',out='public/data/research/';
const read=p=>JSON.parse(fs.readFileSync(p));const original=read(dir+'manifest.json'),enrichment=read(dir+'cell-2026-enrichment.json');
const inputs=original.parts.map(p=>fs.readFileSync(dir+(typeof p==='string'?p:p.file)));
const hash=crypto.createHash('sha256');for(const b of inputs)hash.update(b);hash.update(fs.readFileSync(dir+'cell-2026-enrichment.json'));hash.update(fs.readFileSync('scripts/build-research-data.mjs'));hash.update(fs.readFileSync('public/assets/phylogeny-core.js'));const snapshot=hash.digest('hex').slice(0,20);
const records=inputs.flatMap(b=>JSON.parse(b));if(new Set(records.map(r=>r.id)).size!==records.length)throw Error('Duplicate sample IDs');
for(const r of records){
 r.original={y:r.y||'',mt:r.mt||'',yRoot:r.yRoot||'',sex:r.sex||'',country:r.country||'',source:r.source||'',dating:r.dating||'',ageBP:r.ageBP??null};
 r.recordType='ancient';r.sampleId=r.id;r.displayName=r.name||r.id;r.personId=null;r.identityStatus='not-reconciled';r.sexGroup=/^M(?:\s|$)/.test(r.sex)?'M':/^F(?:\s|$)/.test(r.sex)?'F':'U';
 r.provenance={y:{source:r.source||r.reference||null,status:r.y?'reported':'missing'},mt:{source:r.source||r.reference||null,status:r.mt?'reported':'missing'},location:{source:r.source||r.reference||null,status:r.locationType||'unknown'}};
 const pos=enrichment.approximateLocations?.[r.id];if(pos&&r.lat===null&&r.lng===null){for(const k of ['lat','lng','locationType','locationAccuracy'])r[k]=pos[k];if(!r.country&&pos.country)r.country=pos.country;r.provenance.location={source:enrichment.source,status:'approximate-enrichment'};}
 const u=enrichment.records?.[r.id];if(u){r.publications=[...(r.publications||[]),u.publication];if(!r.site&&u.siteIfMissing)r.site=r.label=u.siteIfMissing.replaceAll('_',' ');for(const [field,key] of [['y','yIfMissing'],['mt','mtIfMissing']])if(!r[field]&&u[key]){r[field]=u[key];r.provenance[field]={source:u.publication,status:'publication-enrichment'};}}
 r.yRoot=core.major(r.yRoot||r.y);r.countryOriginal=r.country;if(/^israel$/i.test(r.country)||r.country==='إسرائيل')r.country='Palestine Occupied';
 r.yCallStatus=core.callState(r.y,'y');r.mtCallStatus=core.callState(r.mt,'mt');
 r.quality={coverage:null,contamination:null,damage:null,assessment:'not-imported'};
 r.dateEvidence={bp:r.ageBP??null,bpBaseline:1950,reportedRange:r.ageText||null,reportedMethod:r.dating||null,rangeStartBP:null,rangeEndBP:null,laboratoryId:null,status:'original-report-not-reinterpreted'};
 r.dataFlags=[];if(r.yCallStatus==='reported'&&r.sexGroup==='U')r.dataFlags.push('y-with-unspecified-sex');if(r.yCallStatus==='reported'&&r.sexGroup==='F')r.dataFlags.push('y-with-female-sex-review-required');
 r.snapshot=snapshot;
}
fs.mkdirSync(out,{recursive:true});const parts=[];for(let i=0;i<records.length;i+=2500){const file=`records-${String(parts.length+1).padStart(2,'0')}.json`;fs.writeFileSync(out+file,JSON.stringify(records.slice(i,i+2500)));parts.push(file);}
const count=k=>records.filter(k).length;const manifest={schemaVersion:1,snapshot,parts,total:records.length,withCoordinates:count(r=>r.lat!==null&&r.lng!==null),withY:count(r=>r.yCallStatus==='reported'),withMt:count(r=>r.mtCallStatus==='reported'),withYField:count(r=>!!r.y),ancient:records.length,living:0,individualCount:null,identityStatus:'Sample records; unique people not reconciled',aadrVersion:original.aadrVersion,aadrDOI:original.aadrDOI,inputFiles:[...original.parts,'cell-2026-enrichment.json'],notice:'Original claims retained. Empty quality/date-range fields are not inferred. No living-person data is imported.'};fs.writeFileSync(out+'manifest.json',JSON.stringify(manifest,null,2)+'\n');console.log('Research snapshot',snapshot,records.length,'records');
