import test from 'node:test';import assert from 'node:assert/strict';
import {evaluateReferences} from '../scripts/evaluate-str.mjs';
const markers={DYS393:13,DYS390:24,DYS19:14,DYS391:10,DYS385:'11-14',DYS426:12,DYS388:12,DYS439:12,DYS389I:13,DYS392:11,DYS389II:29,DYS458:17};
const refs=Array.from({length:8},(_,i)=>({kitId:'SYNTHETIC-'+i,snpVerified:true,validationGroup:'FAMILY-'+Math.floor(i/2),path:['J-M172',i<4?'J-M47':'J-M67'],markers:i<4?markers:{...markers,DYS393:23,DYS390:34,DYS19:24,DYS391:20}}));
test('Hold out whole declared families and report exact terminals separately',()=>{const r=evaluateReferences(refs);assert.equal(r.targets,8);assert.equal(r.groups,4);assert.equal(r.counts.exactTerminal,8);assert(r.rows.every(x=>x.trainingReferences===6));});
test('Missing groups, duplicate identities or unverified truth block evaluation',()=>{assert.throws(()=>evaluateReferences(refs.map(r=>({...r,validationGroup:''}))));assert.throws(()=>evaluateReferences(refs.map(r=>({...r,validationGroup:'one-family'}))));assert.throws(()=>evaluateReferences([...refs,refs[0]]));assert.throws(()=>evaluateReferences(refs.map(r=>({...r,snpVerified:false}))));});
