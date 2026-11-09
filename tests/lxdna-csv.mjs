import test from 'node:test';import assert from 'node:assert/strict';
import {readTable,importProjectCSV,selectTargetCSV} from '../public/assets/lxdna-csv.mjs';
const headers='kitId,haplogroup,snpVerified,DYS393,DYS390,DYS19,DYS391,DYS385,DYS426,DYS388,DYS439,DYS389I,DYS392,DYS389II,DYS458';
const row='SYNTHETIC-A,J-M172,true,13,24,14,10,11-14,12,12,12,13,11,29,17';
const other=row.replace('SYNTHETIC-A','SYNTHETIC-B').replace(',true,',',false,');
test('project CSV retains markers, kit and explicit verification declaration',()=>{const [r]=importProjectCSV(headers+'\n'+row);assert.equal(r.kitId,'SYNTHETIC-A');assert.equal(r.snpVerified,true);assert.deepEqual(r.markers.DYS385,[11,14]);});
test('target selection must match exactly and excludes other people',()=>{const text=headers+'\n'+row+'\n'+other;assert.throws(()=>selectTargetCSV(text),/رقم/);assert.throws(()=>selectTargetCSV(text,'SYNTHETIC'),/رقم/);assert.equal(selectTargetCSV(text,'SYNTHETIC-B').snpVerified,false);});
test('duplicate kit and misaligned rows fail closed',()=>{assert.throws(()=>importProjectCSV(headers+'\n'+row+'\n'+row),/مكرر/);assert.throws(()=>readTable(headers+'\n'+row+',extra'),/الخانات/);});
test('quotes, CRLF, BOM and tab-separated files',()=>{const t='\uFEFF'+headers.replaceAll(',','\t')+'\r\n'+row.replaceAll(',','\t');assert.equal(importProjectCSV(t).length,1);assert.deepEqual(readTable('name,value\r\n"with, comma","two""quotes"').rows,[['with, comma','two"quotes']]);assert.throws(()=>readTable('a,b\n"x,y'),/مغلق/);});
test('sample name or Big Y description never substitutes for SNP confirmation',()=>{const h=headers.replace('snpVerified','testType'),r=row.replace(',true,',',Big Y,');assert.equal(importProjectCSV(h+'\n'+r)[0].snpVerified,false);});
test('single individual marker headers and duplicate aliases',()=>{assert.equal(selectTargetCSV('DYS393,DYS390\n13,24').markers.DYS393[0],13);assert.throws(()=>selectTargetCSV('DYS393,DYS393\n13,24'),/مكرر/);assert.throws(()=>selectTargetCSV('DYS393,DYS394,DYS19\n13,14,15'),/مكرر/);});
test('arbitrary full web tables and unsupported multi-copy layout are rejected',()=>{assert.throws(()=>importProjectCSV('Name,Country\nA,SA'));assert.throws(()=>importProjectCSV(headers.replace('DYS385','DYS385a')+'\n'+row));});

test('vertical individual marker/value CSV is supported without losing repeated rows',()=>{assert.equal(selectTargetCSV('Marker,Value\nDYS393,13\nDYS390,24').markers.DYS390[0],24);assert.throws(()=>selectTargetCSV('Marker,Value\nDYS393,13\nDYS393,14'),/مكرر/);});
