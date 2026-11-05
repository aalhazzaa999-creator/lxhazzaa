import {markerName as canonicalMarker} from "./lxdna-str-input.mjs";
/**
 * LXDNA Control / auditable STR-based Y haplogroup candidate finder.
 * Pure ESM; no network, no persistence, no asserted SNP calls.
 *
 * Training rows MUST be SNP-confirmed (snpVerified:true) and contain a full
 * ancestor-to-terminal path. Output is NOT calibrated probability or diagnosis.
 */
export const PREDICTOR_VERSION = "str-neighbors-v1.1.0";
const VALID_MARKER = /^[A-Z][A-Z0-9_-]{2,32}$/;

function markerName(name) {
  return canonicalMarker(name) || "";
}
function allele(value) {
  if (Array.isArray(value)) {
    const out = value.map(Number);
    return out.length && out.length <= 8 && out.every(x => Number.isInteger(x) && x >= 1 && x <= 100)
      ? out.sort((a,b) => a-b) : null;
  }
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 100) return [value];
  if (typeof value === "string" && /^\s*\d{1,3}(?:\s*[-,/]\s*\d{1,3}){0,7}\s*$/.test(value)) {
    return allele(value.split(/\s*[-,/]\s*/).map(Number));
  }
  return null;
}
export function normalizeMarkers(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const output = {};
  for (const [name, value] of Object.entries(input)) {
    const key = markerName(name);
    if (VALID_MARKER.test(key)) {
      const parsed = allele(value);
      if (parsed) output[key] = parsed;
    }
  }
  // DYS389II contains DYS389I; use the non-overlapping segment for distance.
  if (output.DYS389I?.length === 1 && output.DYS389II?.length === 1) {
    const b = output.DYS389II[0] - output.DYS389I[0];
    if (b >= 1 && b <= 100) output.DYS389II = [b];
    else delete output.DYS389II;
  } else {
    // Without DYS389I, II cannot be normalized consistently across panels.
    delete output.DYS389II;
  }
  return output;
}
function markerDistance(a, b) {
  if (a.length !== b.length) return null;
  return a.reduce((s,x,i)=>s+Math.abs(x-b[i]), 0);
}
function rateWeight(marker, rates) {
  const rate = Number(rates?.[marker]);
  return Number.isFinite(rate) && rate > 0 && rate < 1
    ? Math.max(0.5, Math.min(3, Math.sqrt(0.002 / rate))) : 1;
}
function compareNormalized(x,y,mutationRates={}) {
  let diff=0, weight=0, overlap=0;
  for(const [marker, alleles] of Object.entries(x)){
    if(!y[marker]) continue;
    const delta=markerDistance(alleles,y[marker]);
    if(delta===null) continue;
    const w=rateWeight(marker,mutationRates);
    diff+=w*delta; weight+=w; overlap++;
  }
  return {overlap, distance:weight?diff/weight:null, totalDifferences:diff};
}
export function compareSTR(target, reference, mutationRates={}) {
  return compareNormalized(normalizeMarkers(target),normalizeMarkers(reference),mutationRates);
}
function pathOf(ref){
  const path=ref?.path;
  if(!Array.isArray(path)||!path.length||path.length>200)return null;
  const normalized=path.map(x=>String(x||"").trim().toUpperCase());
  return normalized.every(x=>/^[A-Z][A-Z0-9_'*.+-]{0,100}$/.test(x))?normalized:null;
}
function sameRecord(a,b){
  return JSON.stringify(a.path)===JSON.stringify(b.path) &&
    JSON.stringify(Object.entries(a.markers).sort())===JSON.stringify(Object.entries(b.markers).sort());
}
function makeRefs(references, knownAncestor, warnings, targetKit) {
  const byKit=new Map(), excluded=new Set();
  for(const raw of references) {
    if(raw?.snpVerified!==true)continue;
    const kit=String(raw.kitId||"").trim();
    const path=pathOf(raw), markers=normalizeMarkers(raw.markers);
    if(!kit||!path||Object.keys(markers).length<12)continue;
    if(targetKit && kit===targetKit)continue;
    const ref={kitId:kit,path,markers};
    if(excluded.has(kit))continue;
    if(byKit.has(kit)&&!sameRecord(byKit.get(kit),ref)){
      byKit.delete(kit);excluded.add(kit);
      warnings.push("Excluded conflicting duplicate kit "+kit);
    }else byKit.set(kit,ref);
  }
  return [...byKit.values()].filter(r=>!knownAncestor||r.path.includes(knownAncestor));
}
/**
 * Does not overwrite a verified SNP call or automatically update any tree.
 * Levels are only heuristic evidence grades, not calibrated confidence.
 */
export function predictYSTR({target, references=[], knownAncestor=null, mutationRates={}, minOverlap=12, k=11}={}) {
  const warnings=[];
  const markers=normalizeMarkers(target?.markers||target);
  const typed=Object.keys(markers).length;
  const ancestor=knownAncestor?String(knownAncestor).trim().toUpperCase():null;
  const empty=(reason,extra={})=>({version:PREDICTOR_VERSION,status:"unresolved",reason,
    proposedPath:[],proposedHaplogroup:null,supportLevel:"unresolved",
    probability:null,matchedLoci:0,referenceKits:0,neighbors:[],warnings,...extra});
  if(target?.snpVerified===true || target?.confirmedSnp===true) {
    return empty("Target already has an SNP-confirmed call; prediction will not replace it.");
  }
  if(typed<12) return empty("At least 12 valid common Y-STR markers are required.",{matchedLoci:typed});
  if(!Array.isArray(references)||references.length>100000) return empty("Invalid or oversized reference collection.");
  const refs=makeRefs(references,ancestor,warnings,String(target?.kitId||" ").trim());
  const neighbors=refs.map(ref=>{
    const d=compareNormalized(markers,ref.markers,mutationRates);
    return {...ref,...d};
  }).filter(r=>r.overlap>=Math.max(12,Number(minOverlap)||12)&&r.distance!==null)
    .sort((a,b)=>a.distance-b.distance||b.overlap-a.overlap||a.kitId.localeCompare(b.kitId));
  if(!neighbors.length) return empty("No distinct SNP-confirmed reference shares enough markers.",{matchedLoci:typed,referenceKits:refs.length,referenceCompared:0,warnings});
  const near=neighbors.slice(0,Math.max(3,Math.min(21,Math.floor(Number(k)||11))));
  const proposed=[],audit=[];
  let group=near;
  for(let depth=0;depth<200;depth++){
    const available=group.filter(r=>r.path.length>depth);
    if(available.length<2)break;
    const votes=new Map();
    for(const r of available){
      const node=r.path[depth];
      const v=votes.get(node)||{node,count:0,weight:0,refs:[]};
      const contribution=Math.exp(-Math.min(10,r.distance)*2);
      v.count++;v.weight+=contribution;v.refs.push(r.kitId);
      votes.set(node,v);
    }
    const sorted=[...votes.values()].sort((a,b)=>b.weight-a.weight||b.count-a.count||a.node.localeCompare(b.node));
    const sum=sorted.reduce((v,a)=>v+a.weight,0);
    const top=sorted[0], share=top.weight/sum, other=sorted[1]?.weight||0;
    const margin=(top.weight-other)/sum;
    audit.push({depth,node:top.node,referenceKits:top.count,share:Number(share.toFixed(3)),
      margin:Number(margin.toFixed(3)),alternatives:sorted.length});
    if(top.count<2 || share<0.7 || margin<0.2)break;
    proposed.push(top.node);
    group=available.filter(r=>r.path[depth]===top.node);
  }
  const top=proposed.at(-1)||null;
  const detail=audit.findLast?.(a=>a.node===top) || [...audit].reverse().find(a=>a.node===top);
  const eligible=near.filter(r=>r.path.includes(top));
  const hasComparators=(detail?.alternatives||0)>1;
  const supportLevel=top && eligible.length>=3 && hasComparators &&
    (detail?.share||0)>=0.75 && (detail?.margin||0)>=0.25 &&
    eligible.filter(r=>r.overlap>=23).length>=3
      ? "candidate" : top?"limited":"unresolved";
  return {version:PREDICTOR_VERSION,status:top?"predicted":"unresolved",
    reason:top?"STR similarity candidate only; confirm the exact branch by Y-SNP/Big Y.":"No branch achieved minimum consensus.",
    proposedPath:proposed,proposedHaplogroup:top,supportLevel,probability:null,
    matchedLoci:near[0].overlap,referenceKits:refs.length,referenceCompared:neighbors.length,
    neighbors:near.slice(0,5).map(r=>({kitId:r.kitId,path:r.path,overlap:r.overlap,
      distance:Number(r.distance.toFixed(4))})),audit,warnings,
    caveat:"Not a SNP result. Reference population bias, missing loci and STR convergence may alter the inferred branch."};
}
