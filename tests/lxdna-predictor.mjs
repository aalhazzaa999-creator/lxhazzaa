import assert from "node:assert/strict";
import {test} from "node:test";
import {normalizeMarkers,compareSTR,predictYSTR} from "../public/assets/lxdna-predictor.mjs";

const base={
 DYS393:13,DYS390:24,DYS19:14,DYS391:10,DYS385:"11-14",
 DYS426:12,DYS388:12,DYS439:12,DYS389I:13,DYS389II:29,
 DYS392:11,DYS437:14,DYS438:10,DYS448:19,DYS456:15,
 DYS458:17,DYS635:23,DYS447:25,DYS449:28,DYS460:11,
 DYS481:22,DYS533:12,DYS570:17,DYS576:18
};
const ref=(id,terminal,markers=base)=>({
 kitId:id,path:["J-M172",terminal],snpVerified:true,markers
});

test("DYS389II is converted into the independent segment once",()=>{
 assert.equal(normalizeMarkers(base).DYS389II[0],16);
 assert.equal(compareSTR(base,base).distance,0);
 assert.equal(compareSTR({DYS389I:13,DYS389II:29},{DYS389I:13,DYS389II:30}).totalDifferences,1);
});
test("Multi-copy alleles match irrespective of order",()=>{
 assert.equal(compareSTR({DYS385:"11-14"},{DYS385:"14-11"}).distance,0);
});
test("High-support candidates still have null probability",()=>{
 const modified={...base,DYS393:18,DYS390:28,DYS19:18,DYS391:12,DYS458:23};
 const refs=[ref("A1","J-M47"),ref("A2","J-M47"),ref("A3","J-M47"),
   ref("B1","J-M67",modified),ref("B2","J-M67",modified)];
 const x=predictYSTR({target:{markers:base},references:refs,k:5});
 assert.equal(x.proposedHaplogroup,"J-M47");
 assert.equal(x.supportLevel,"candidate");
 assert.equal(x.probability,null);
 assert.equal(x.referenceKits,5);
});
test("A tie does not invent a terminal branch",()=>{
 const refs=[ref("A1","J-M47"),ref("A2","J-M47"),ref("B1","J-M67"),ref("B2","J-M67")];
 const x=predictYSTR({target:{markers:base},references:refs,k:4});
 assert.equal(x.proposedHaplogroup,"J-M172");
 assert.equal(x.supportLevel,"limited");
});
test("Unverified STR profiles do not become reference truth",()=>{
 const x=predictYSTR({target:base,references:[{...ref("A1","J-M47"),snpVerified:false}]});
 assert.equal(x.status,"unresolved");
});
test("Conflicting duplicate kit is excluded rather than counted twice",()=>{
 const x=predictYSTR({target:base,references:[
   ref("A1","J-M47"),ref("A1","J-M67"),ref("B1","J-M47")]});
 assert.equal(x.referenceKits,1);
 assert.equal(x.warnings.length,1);
});
test("An existing SNP result is never overridden",()=>{
 const x=predictYSTR({target:{markers:base,snpVerified:true},references:[ref("A1","J-M47")]});
 assert.equal(x.status,"unresolved");
 assert.equal(x.proposedHaplogroup,null);
});
test("Known SNP ancestor filters incompatible references",()=>{
 const x=predictYSTR({target:base,knownAncestor:"J-M47",references:[
   ref("A1","J-M47"),ref("A2","J-M47"),ref("A3","J-M47"),ref("B1","J-M67")]});
 assert.equal(x.referenceKits,3);
 assert.equal(x.proposedHaplogroup,"J-M47");
 assert.equal(x.supportLevel,"limited");
});
test("Too few loci must be unresolved",()=>{
 const x=predictYSTR({target:{DYS393:13,DYS390:24},references:[ref("A1","J-M47")]});
 assert.equal(x.status,"unresolved");
});


test("Descent retains dissenting parent votes in its cumulative support",()=>{
 const refs=Array.from({length:10},(_,i)=>({...ref("CUM"+i,"J-M47"),path:i<5?["J-M172","J-M47","J-Z1"]:i<7?["J-M172","J-M47","J-Z2"]:["J-M172","J-M67"]}));
 const result=predictYSTR({target:{markers:base},references:refs,k:10});
 assert.equal(result.proposedHaplogroup,"J-M47");
 assert.equal(result.audit.at(-1).cumulativeShare,0.5);
 assert.equal(result.probability,null);
});
test("Short reference paths cannot inflate support by abstaining at deeper levels",()=>{
 const refs=Array.from({length:10},(_,i)=>({...ref("SHORT"+i,"J-M47"),path:i<3?["J-M172","J-M47"]:["J-M172"]}));
 const result=predictYSTR({target:{markers:base},references:refs,k:10});
 assert.equal(result.proposedHaplogroup,"J-M172");
 assert.equal(result.audit.at(-1).cumulativeShare,0.3);
});
