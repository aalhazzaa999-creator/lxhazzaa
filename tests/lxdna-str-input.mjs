import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
import {parseSTR,ORDER,COPIES} from '../public/assets/lxdna-str-input.mjs';
import {bindReferences} from '../public/assets/lxdna-str-topology.mjs';
import {predictYSTR} from '../public/assets/lxdna-predictor.mjs';
const require=createRequire(import.meta.url),{build}=require('../public/assets/phylogeny-core.js');
for(const size of [12,25,37,67,111])for(const layout of ['grouped','expanded'])test(`panel ${size} ${layout} keeps marker order and copies`,()=>{
 let slots=0;const names=[];for(const n of ORDER){names.push(n);slots+=COPIES[n]||1;if(slots===size)break;}
 const text=names.flatMap(n=>layout==='expanded'?Array(COPIES[n]||1).fill('13'):[Array(COPIES[n]||1).fill('13').join('-')]).join(',');
 const r=parseSTR(text,{panel:String(size),layout});assert.equal(r.slots,size);assert.deepEqual(Object.keys(r.target.markers),names);
});
test('named formats and aliases retain exact values',()=>{
 assert.deepEqual(parseSTR('DYS393\tDYS394\n13\t14').target.markers,{DYS393:[13],DYS19:[14]});
 const r=parseSTR('DYS458=17.2\nDYS393=0');assert.deepEqual(r.target.markers.DYS458,[17.2]);assert.equal(r.target.markers.DYS393,null);assert.equal(r.warnings.length,2);
});
test('no silent partial parsing, copy loss, unknown markers or alias duplicates',()=>{
 for(const t of ['DYS393=13abc','DYS393=13\nDYS393=14','DYS19=14\nDYS394=14','FAKE123=14','DYS385=11'])assert.throws(()=>parseSTR(t));
 assert.throws(()=>parseSTR('13,24',{panel:'37'}));
});
const index=build({id:'Y-ROOT',children:[{id:'J-M172',snps:'M172',children:[{id:'J-M47',snps:'M47'},{id:'J-M67',snps:'M67'}]},{id:'R-M269'}]});
test('tree generates paths and resolves equivalent SNP names',()=>{
 const r=bindReferences([{kitId:'a',haplogroup:'M47',snpVerified:true}],index,'M172');assert.deepEqual(r.references[0].path,['J-M172','J-M47']);assert.equal(r.knownAncestor,'J-M172');
});
test('unsupported ancestor, invented path and unknown terminal are rejected',()=>{
 assert.throws(()=>bindReferences([],index,'J-FAKE123'));
 const r=bindReferences([{kitId:'a',path:['R-M269','J-M47'],snpVerified:true},{kitId:'b',haplogroup:'J-FAKE123',snpVerified:true}],index);assert.equal(r.references.length,0);assert.equal(r.excluded.length,2);
});
const markers=Object.fromEntries(ORDER.slice(0,20).map(n=>[n,Array(COPIES[n]||1).fill(n==='DYS389II'?29:13)]));
const ref=(kitId,path)=>({kitId,path,snpVerified:true,markers});
test('target self-match is excluded',()=>{
 const r=predictYSTR({target:{kitId:'self',markers},references:[ref('self',['J-M172','J-M47'])]});assert.equal(r.status,'unresolved');
});
test('duplicate conflict outside chosen branch cannot evade deduplication',()=>{
 const r=predictYSTR({target:{markers},knownAncestor:'J-M47',references:[ref('a',['J-M172','J-M47']),ref('a',['J-M172','J-M67']),ref('b',['J-M172','J-M47'])]});assert.equal(r.referenceKits,1);assert.equal(r.warnings.length,1);
});
test('same reference with reordered marker keys is counted once',()=>{
 const a=ref('a',['J-M172','J-M47']);const r=predictYSTR({target:{markers},references:[a,{...a,markers:Object.fromEntries(Object.entries(markers).reverse())}]});assert.equal(r.referenceKits,1);assert.equal(r.warnings.length,0);
});
