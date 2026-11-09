/** Offline comparison only: no kit profiles or source topology is imported. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import Core from '../public/assets/phylogeny-core.js';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
/** Keep only official names/parents and aggregate counts; never customer rows. */
export function prepareOfficialSnapshot(raw,requestedNames){
 const ft=JSON.parse(raw),all=ft.allNodes;if(!all||!ft.id||!ft.publishedDate)throw Error('Invalid official snapshot');
 const roots=[],children=new Map(),totals=new Map(),idsByName=new Map();
 for(const [id,n] of Object.entries(all)){
  const countryCounts=n.countryCounts==null?(n.kitsCount===0?[]:null):n.countryCounts;
  if(!Number.isSafeInteger(n.kitsCount)||n.kitsCount<0||(countryCounts!==null&&!Array.isArray(countryCounts)))throw Error('Invalid official counts');
  let known=countryCounts===null?null:0,total=0;for(const c of countryCounts||[]){if(!Number.isSafeInteger(c.kitsCounts)||c.kitsCounts<0)throw Error('Invalid country count');total+=c.kitsCounts;if(c.countryCode&&c.countryCode!=='X'&&c.name!=='Unknown Origin')known+=c.kitsCounts;}
  if(total>n.kitsCount)throw Error('Country counts exceed kits');totals.set(id,total===n.kitsCount?known:null);
  const parent=String(n.parentId);if(parent!==id&&all[parent]){if(!children.has(parent))children.set(parent,[]);children.get(parent).push(id);}else roots.push(id);
  if(!idsByName.has(n.name))idsByName.set(n.name,[]);idsByName.get(n.name).push(id);
 }
 const stack=roots.map(id=>[id,false]),seen=new Set();
 while(stack.length){const [id,done]=stack.pop();if(done){for(const c of children.get(id)||[])totals.set(id,totals.get(id)===null||totals.get(c)===null?null:totals.get(id)+totals.get(c));continue;}if(seen.has(id))throw Error('Official graph cycle');seen.add(id);stack.push([id,true]);for(const c of children.get(id)||[])stack.push([c,false]);}
 if(seen.size!==Object.keys(all).length)throw Error('Disconnected official graph');
 const include=new Set();for(const name of requestedNames)for(let id of idsByName.get(name)||[]){const walked=new Set();while(all[id]&&!include.has(id)){if(walked.has(id))throw Error('Official ancestor cycle');walked.add(id);include.add(id);const parent=String(all[id].parentId);if(parent===id)break;id=parent;}}
 const rows=[...include].sort((a,b)=>Number(a)-Number(b)).map(id=>[Number(id),Number(all[id].parentId),all[id].name,totals.get(id)]);
 return {metadata:{source:'FamilyTreeDNA public Y-DNA haplotree',sourceURL:'https://www.familytreedna.com/public/y-dna-haplotree/get',sourceVersion:String(ft.id),publishedDate:ft.publishedDate,retrieved:'2026-11-06',sourceSHA256:hash(raw),rawNodeCount:Object.keys(all).length,subsetPolicy:'Requested FTDNA Stat full labels and all official ancestors; row[3] is the official subtree sum of kits with a reported country, excluding X/Unknown Origin.'},rows,aliases:[]};
}
const exactIndexes=new WeakMap();
export function compareBranch(record,index){
 if(record?.k!=='y'||typeof record.name!=='string'||!Array.isArray(record.chain)||!record.chain.length)return {status:'invalid-record'};
 const labels=record.chain.map(r=>r?.[0]);
 if(labels.at(-1)!==record.name||labels.some(x=>typeof x!=='string'))return {status:'collapsed-or-mismatched-source-chain'};
 // Full source labels only. Do not guess equivalence from prefixes or shared text.
 let exactLabels=exactIndexes.get(index);if(!exactLabels){exactLabels=new Map();for(const n of index.nodes)exactLabels.set(n.id,exactLabels.has(n.id)?null:n);exactIndexes.set(index,exactLabels);}
 const exact=label=>exactLabels.get(label)||null;
 const terminal=exact(record.name);if(!terminal)return {status:'terminal-not-in-pinned-source'};
 const chain=labels.map(exact);if(chain.some(n=>!n))return {status:'ancestor-not-in-pinned-source'};
 if(new Set(chain).size!==chain.length)return {status:'duplicate-ancestor'};
 for(let i=1;i<chain.length;i++)if(!index.within(chain[i],chain[i-1]))return {status:'conflicting-ancestry'};
 if(chain.length>1&&terminal.parent!==chain.at(-2))return {status:'different-direct-parent'};
 return {status:'matched-pinned-ftdna',officialNode:terminal.uid,comparedAncestors:chain.length};
}
export function buildContext(sourceDirectory,outputDirectory='public/data/branch-context',officialFile=null){
 const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:sourceDirectory,encoding:'utf8'}).trim();
 if(execFileSync('git',['status','--porcelain','--untracked-files=all','--','data/clade','version.json'],{cwd:sourceDirectory,encoding:'utf8'}).trim())throw Error('Source checkout has uncommitted data changes');
 const sourceVersion=JSON.parse(fs.readFileSync(path.join(sourceDirectory,'version.json')));
 const upstreamFiles=fs.readdirSync(path.join(sourceDirectory,'data/clade')).filter(n=>n.endsWith('.json')).sort();
 const requested=upstreamFiles.flatMap(name=>{const r=JSON.parse(fs.readFileSync(path.join(sourceDirectory,'data/clade',name)));return [r.name,...(r.chain||[]).map(row=>row[0])];});
 const pinned=officialFile?prepareOfficialSnapshot(fs.readFileSync(officialFile),requested):JSON.parse(fs.readFileSync('reference-sources/ftdna-context-source.json'));
 if(officialFile)fs.writeFileSync('reference-sources/ftdna-context-source.json',JSON.stringify(pinned)+'\n');
 const index=Core.build({id:'Y-ROOT'},{foreign:pinned}).foreign;
 const records=[],accepted={},inputs=[];
 const officialCounts=new Map(pinned.rows.map(row=>['ftdna:'+row[0],row[3]]));
 for(const name of upstreamFiles){
  const bytes=fs.readFileSync(path.join(sourceDirectory,'data/clade',name));const r=JSON.parse(bytes);inputs.push(name+':'+hash(bytes));
  const verdict=compareBranch(r,index);records.push({branch:r.name,...verdict});
  if(verdict.status==='matched-pinned-ftdna')accepted[r.name]={pageSlug:name.slice(0,-5),officialNode:verdict.officialNode,comparedAncestors:verdict.comparedAncestors,reportedKnownCountryKits:Number.isSafeInteger(r.n)&&r.n>=0?r.n:null,officialKnownCountryKits:officialCounts.get(verdict.officialNode)??null,countStatus:officialCounts.get(verdict.officialNode)===null?'official-count-incomplete':r.n===officialCounts.get(verdict.officialNode)?'equal':'different-snapshot-count'};
 }
 const counts={};for(const row of records)counts[row.status]=(counts[row.status]||0)+1;
 const metadata={schemaVersion:1,source:{name:'FTDNA Stat',authority:'independent-secondary-aggregation',repository:'https://github.com/ftdnastat/ftdnastat.github.io',commit,version:sourceVersion.version,built:sourceVersion.built,reportedFTDNARelease:sourceVersion.yPublished,license:'MIT',inputManifestSHA256:hash(inputs.join('\n'))},officialComparison:{...pinned.metadata,policy:'Exact full terminal label, all supplied ancestors in order and same direct parent. No new topology imported; official aggregate country-known counts compared separately. No STR, individual identity or age verification.'},summary:{reviewed:records.length,accepted:Object.keys(accepted).length,held:records.length-Object.keys(accepted).length,byStatus:counts},limitations:['Comparison is against the dated official FTDNA snapshot recorded here, independent of the app tree snapshot. Differences in counts between release dates are not evidence of error or tampering.','Kit counts are secondary aggregates of testers with a reported country, not population frequencies or imported sample records.','No age estimates, geographical priors, STR profiles or sample identities enter prediction.']};
 fs.mkdirSync(outputDirectory,{recursive:true});fs.writeFileSync(path.join(outputDirectory,'ftdnastat-y.json'),JSON.stringify({...metadata,branches:accepted})+'\n');fs.writeFileSync(path.join(outputDirectory,'ftdnastat-y-audit.json'),JSON.stringify({...metadata,records})+'\n');return metadata.summary;
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
 if(!process.argv[2])throw Error('Usage: node scripts/import-ftdnastat-context.mjs /path/to/pinned/ftdnastat-checkout');
 console.log(JSON.stringify(buildContext(process.argv[2],undefined,process.argv[3]||null)));
}
