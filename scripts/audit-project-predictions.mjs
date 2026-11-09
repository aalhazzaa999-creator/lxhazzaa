/** Read authorized private STR rows; output only aggregate audit to stdout.
 * Optional detailed output must stay outside the repository/public directory.
 * This command never changes published SNP calls or publishes candidate placements.
 */
import fs from 'node:fs';
import path from 'node:path';
import Core from '../public/assets/phylogeny-core.js';
import {bindReferences} from '../public/assets/lxdna-str-topology.mjs';
import {predictYSTR,PREDICTOR_VERSION} from '../public/assets/lxdna-predictor.mjs';
const input=process.argv[2];if(!input)throw Error('Provide the authorized private samples.json path');
const read=p=>JSON.parse(fs.readFileSync(p));
const rows=read(input).filter(r=>!r.reviewReasons?.length&&r.haplogroup);
const foreign=read('public/data/phylogeny/ftdna-reference.json');
const tree=Core.build(read('public/data/phylogeny/ytree.json'),{foreign,crosswalk:{entries:foreign.crosswalk}});
const rawRefs=rows.filter(r=>r.snpVerified&&r.markerLoci>=12).map(r=>({kitId:r.kitId,haplogroup:r.haplogroup,snpVerified:true,markers:r.markers}));
const bound=bindReferences(rawRefs,tree);
const validation={tested:0,compatibleCoarserOrExact:0,exact:0,incompatiblePublishedBranch:0,unverifiedFinerBranch:0,unresolved:0};
for(const r of bound.references){
 const result=predictYSTR({target:{kitId:r.kitId,markers:r.markers},references:bound.references});
 const actual=tree.find(r.haplogroup).node,guess=tree.find(result.proposedHaplogroup).node;validation.tested++;
 if(!guess)validation.unresolved++;
 else if(tree.within(actual,guess)){validation.compatibleCoarserOrExact++;if(actual===guess)validation.exact++;}
 else if(tree.within(guess,actual))validation.unverifiedFinerBranch++;
 else validation.incompatiblePublishedBranch++;
}
const targets={total:0,insufficientMarkers:0,evaluated:0,limited:0,candidate:0,unresolved:0,deeperCompatible:0};const details=[];
for(const r of rows.filter(r=>!r.snpVerified)){
 targets.total++;if(r.markerLoci<12){targets.insufficientMarkers++;continue;}targets.evaluated++;
 const result=predictYSTR({target:{kitId:r.kitId,markers:r.markers},references:bound.references});targets[result.supportLevel]++;
 const reported=tree.find(r.haplogroup).node,guess=tree.find(result.proposedHaplogroup).node;
 if(reported&&guess&&reported!==guess&&tree.within(guess,reported))targets.deeperCompatible++;
 details.push({kitId:r.kitId,reportedCall:r.haplogroup,result});
}
const audit={version:PREDICTOR_VERSION,referenceInput:rawRefs.length,acceptedReferences:bound.references.length,excludedReferences:bound.excluded.length,validation,targets,automaticallyPublished:0,limitations:['Internal leave-one-kit-out audit; related reference kits and population bias are not independently controlled.','Compatible/coarser is not exact terminal accuracy. Finer-than-reported is unverified, not necessarily incorrect.','Heuristic support is not calibrated probability; limited STR data are not an SNP confirmation.']};
console.log(JSON.stringify(audit,null,2));
if(process.argv[3]){const dest=path.resolve(process.argv[3]),repo=path.resolve('.');if(dest===repo||dest.startsWith(repo+path.sep))throw Error('Detailed output must stay outside repository');fs.writeFileSync(dest,JSON.stringify({audit,details}),{mode:0o600});}
