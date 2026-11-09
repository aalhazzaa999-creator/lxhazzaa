/** Leave-one-validation-group-out diagnostics for an authorized, reviewed reference set.
 * Groups must be assigned outside the algorithm (same person/known close relatives).
 * This is not independent validation merely because it runs successfully.
 */
import fs from 'node:fs';import path from 'node:path';
import {predictYSTR,normalizeMarkers,PREDICTOR_VERSION} from '../public/assets/lxdna-predictor.mjs';
import {bindReferences} from '../public/assets/lxdna-str-topology.mjs';
import Core from '../public/assets/phylogeny-core.js';
export function evaluateReferences(references){
 if(!Array.isArray(references)||references.length<3||references.length>10000)throw Error('Expected 3–10000 reviewed references');
 const ids=new Set(),groups=new Set();
 for(const r of references){if(r.snpVerified!==true||!r.kitId||ids.has(r.kitId)||!r.validationGroup||!Array.isArray(r.path)||!r.path.length||Object.keys(normalizeMarkers(r.markers)).length<12)throw Error('Every unique SNP-confirmed reference requires markers, a bound path and validationGroup');ids.add(r.kitId);groups.add(r.validationGroup);}
 if(groups.size<3)throw Error('At least three independent validation groups are required');
 const counts={exactTerminal:0,supportedAncestor:0,wrongBranch:0,beyondKnownTruth:0,unresolved:0},rows=[];
 for(const target of references){const train=references.filter(r=>r.validationGroup!==target.validationGroup);const result=predictYSTR({target:{kitId:target.kitId,markers:target.markers},references:train});const truth=target.path.map(s=>s.toUpperCase()),proposed=result.proposedPath;
  let status='unresolved';if(proposed.length){const shared=Math.min(proposed.length,truth.length);if(proposed.slice(0,shared).some((n,i)=>n!==truth[i]))status='wrongBranch';else status=proposed.length>truth.length?'beyondKnownTruth':proposed.length===truth.length?'exactTerminal':'supportedAncestor';}
  counts[status]++;rows.push({kitId:target.kitId,validationGroup:target.validationGroup,trainingReferences:train.length,truth:truth.at(-1),proposed:result.proposedHaplogroup,status});
 }
 return {schemaVersion:1,version:PREDICTOR_VERSION,method:'leave-one-validation-group-out',targets:references.length,groups:groups.size,counts,rows,notice:'Ancestor-only predictions, beyond-known-truth predictions and unresolved cases are separate from exact terminal matches. Group labels and SNP truth require independent review; this report is not calibrated probability.'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
 const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Usage: node scripts/evaluate-str.mjs authorized-reference.json local-report.json');
 const bundle=JSON.parse(fs.readFileSync(input));if(bundle.schemaVersion!==1||!bundle.source?.title||!bundle.source?.url||!Array.isArray(bundle.records))throw Error('Versioned source bundle required');
 const ft=JSON.parse(fs.readFileSync('public/data/phylogeny/ftdna-reference.json'));const index=Core.build({id:'Y-ROOT'},{foreign:ft}).foreign;const bound=bindReferences(bundle.records,index);
 if(bound.excluded.length)throw Error('Resolve excluded/ambiguous SNP references before evaluating; '+bound.excluded.length+' excluded');
 const result=evaluateReferences(bound.references);fs.writeFileSync(output,JSON.stringify({...result,source:bundle.source,treeSource:ft.metadata},null,2)+'\n');console.log(JSON.stringify({targets:result.targets,groups:result.groups,counts:result.counts}));
}
