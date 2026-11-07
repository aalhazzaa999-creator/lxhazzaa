const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),C=require('../public/assets/atlas-chronology.js');
const r=text=>({ageText:text});
test('uncertain range appears in both neighboring periods, boundaries inclusive',()=>{
 const sample=r('3100-2900 BCE'),recent={active:true,older:-3000,younger:2026},ancient={active:true,older:-8000,younger:-3000};
 for(const range of [recent,ancient]){const m=C.match(sample,range);assert.equal(m.matched,true);assert.equal(m.partial,true);}
 assert(C.match(r('3000 BCE'),recent).matched);assert(C.match(r('3000 BCE'),ancient).matched);
 assert(!C.match(r('3100 BCE'),recent).matched);assert(!C.match(r('2900 BCE'),ancient).matched);
});
test('CE and BCE windows differ, cross-era ranges retain both ends',()=>{
 const ce={active:true,older:1000,younger:2026},bce={active:true,older:-1000,younger:2026};
 assert(!C.match(r('500 CE'),ce).matched);assert(C.match(r('500 CE'),bce).matched);assert(!C.match(r('2000 BCE'),bce).matched);
 assert.deepEqual(C.parse('45 calBCE - 108 calCE (1994±23 BP)'),{start:-45,end:108,basis:'reported-range'});
 assert(C.match(r('200 BCE - 100 CE'),{active:true,older:0,younger:1000}).partial);
});
test('reported ranges, reversed bounds, Arabic and dash variants',()=>{
 for(const text of ['2900-3100 BCE','3100–2900 BCE','3100—2900 calBCE','3100–2900 قبل الميلاد (مدى معاير)'])assert.deepEqual(C.parse(text),{start:-3100,end:-2900,basis:'reported-range'});
 assert.equal(C.parse('1827 CE').start,1827);assert.equal(C.parse('1000-1500 CE').end,1500);
});
test('do not mistake raw BP, laboratory errors or approximate prose for calibrated ranges',()=>{
 for(const text of ['6000–4600 BP','نحو 7000 سنة','(6136±34 BP, MAMS-21479)',''])assert.equal(C.parse(text),null);
 const sample={ageText:'',ageBP:5000,dateEvidence:{bp:5000,bpBaseline:1950}};
 assert.deepEqual(C.interval(sample),{start:-3050,end:-3050,basis:'mean-bp-approximation'});
 assert.equal(C.interval({ageBP:0}).start,1950);
 assert.equal(C.interval({ageBP:null}),null);
});
test('source ranges take precedence over mean and supplemental reference',()=>{
 assert.equal(C.interval({ageText:'3100-2900 BCE',ageBP:9000,dateEvidence:{reference:{fullDate:'1000-1500 CE'}}}).start,-3100);
 assert.equal(C.interval({ageText:'',dateEvidence:{reference:{fullDate:'1000-1500 CE'}}}).end,1500);
});
test('unknown dates, unbounded old edge and all-period default',()=>{
 const unknown={};assert(C.match(unknown).matched);assert(!C.match(unknown,{active:true,older:-8000,younger:2026}).matched);
 assert(C.match(unknown,{active:true,older:-8000,younger:2026,includeUnknown:true}).matched);
 assert(C.match(r('500000-490000 BCE'),{active:true,older:null,younger:-18000}).matched);
 assert(!C.match(r('17000 BCE'),{active:true,older:null,younger:-18000}).matched);
});
test('preserve sample identity and do not duplicate on interval overlap',()=>{
 const records=[{id:'one',ageText:'3100-2900 BCE'},{id:'two',ageText:'4000 BCE'}];const before=JSON.stringify(records);
 const matches=records.filter(x=>C.match(x,{active:true,older:-3000,younger:2026}).matched);assert.deepEqual(matches.map(x=>x.id),['one']);assert.equal(JSON.stringify(records),before);
});
function timeline(){const ids=['dateRecent','dateAncient','dateUnknown','dateSummary','dateRecentLabel','dateAncientLabel','dateTrackFill','dateReset'];const elements=Object.fromEntries(ids.map(id=>[id,{value:'',checked:false,style:{},attributes:{},events:{},setAttribute(k,v){this.attributes[k]=v},addEventListener(k,f){this.events[k]=f}}]));let changes=0;
 const context={window:{LXChronology:C},Date,URLSearchParams,Event,document:{getElementById:id=>elements[id],dispatchEvent:()=>{changes++}}};vm.runInNewContext(fs.readFileSync('public/assets/atlas-timeline.js','utf8'),context);return {api:context.window.LXTimeline,elements,changes:()=>changes};}
test('slider restores shared state, moving previews without applying until release',()=>{
 const {api,elements:e,changes}=timeline();assert.equal(api.options().active,false);
 api.restore(new URLSearchParams('dateFrom=-8000&dateTo=now'));assert.equal(api.options().older,-8000);assert.equal(api.options().younger,new Date().getFullYear());
 const p=new URLSearchParams();api.write(p);assert.equal(p.get('dateFrom'),'-8000');assert.equal(p.get('dateTo'),'now');
 e.dateRecent.value=1;e.dateRecent.events.input();assert.equal(changes(),0);e.dateRecent.events.change();assert.equal(changes(),1);
 api.reset(false);assert.equal(api.options().active,false);assert.equal(api.signature(),'');
});
test('invalid URL cannot invert range; exact shared bounds are not silently snapped',()=>{
 const {api,elements:e}=timeline();api.restore(new URLSearchParams('dateFrom=1000&dateTo=-1000'));assert.equal(api.options().active,false);
 api.restore(new URLSearchParams('dateFrom=-3100&dateTo=-2900&dateUnknown=1'));assert.equal(api.options().older,-3100);assert.equal(api.options().younger,-2900);assert.equal(api.options().includeUnknown,true);
 e.dateRecent.value=17;e.dateRecent.events.input();assert(+e.dateRecent.value<=+e.dateAncient.value);
});
