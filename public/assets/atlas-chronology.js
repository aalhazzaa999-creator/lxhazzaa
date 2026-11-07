/* Calendar overlap, preserving reported dates; no radiocarbon calibration. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LXChronology=api;})(typeof window==='object'?window:globalThis,()=>{
 'use strict';const cache=new WeakMap();
 const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
 const signed=(v,era)=>/BCE|BC|قبل/i.test(era)?-Number(v):Number(v);
 function parse(text){
  const s=String(text||'').trim().replace(/[–—−]/g,'-').replace(/قبل الميلاد/g,'BCE').replace(/ميلادي/g,'CE');
  // Anchored patterns cannot mistake the laboratory measurement in parentheses for a calendar range.
  let m=/^(\d+)\s*(?:cal\s*)?(BCE|CE|BC|AD)\s*-\s*(\d+)\s*(?:cal\s*)?(BCE|CE|BC|AD)(?=\s|\(|$)/i.exec(s);
  if(m){const a=signed(m[1],m[2]),b=signed(m[3],m[4]);return {start:Math.min(a,b),end:Math.max(a,b),basis:'reported-range'};}
  m=/^(\d+)\s*-\s*(\d+)\s*(?:cal\s*)?(BCE|CE|BC|AD)(?=\s|\(|$)/i.exec(s);
  if(m){const a=signed(m[1],m[3]),b=signed(m[2],m[3]);return {start:Math.min(a,b),end:Math.max(a,b),basis:'reported-range'};}
  m=/^(\d+)\s*(?:cal\s*)?(BCE|CE|BC|AD)(?=\s*(?:\(|$))/i.exec(s);
  if(m){const year=signed(m[1],m[2]);return {start:year,end:year,basis:'reported-year'};}
  return null;
 }
 function interval(r){
  if(cache.has(r))return cache.get(r);
  const evidence=r.dateEvidence||{};let result=parse(r.ageText||evidence.reportedRange);
  const c=evidence.calendarRange;
  if(!result&&c&&finite(c.startYear)&&finite(c.endYear)&&/^(BCE|CE)$/i.test(c.era)){
   const a=signed(c.startYear,c.era),b=signed(c.endYear,c.era);result={start:Math.min(a,b),end:Math.max(a,b),basis:'reported-range'};
  }
  // Reference dates supplement missing dates, never silently replace a conflicting original date.
  if(!result&&!r.ageText&&!evidence.reportedRange)result=parse(evidence.reference?.fullDate);
  if(!result){const bp=finite(evidence.bp)?Number(evidence.bp):finite(r.ageBP)?Number(r.ageBP):null;
   if(bp!==null){const baseline=finite(evidence.bpBaseline)?Number(evidence.bpBaseline):1950;const y=baseline-bp;result={start:y,end:y,basis:'mean-bp-approximation'};}
  }
  cache.set(r,result);return result;
 }
 function match(r,{active=false,older=null,younger=null,includeUnknown=false}={}){
  if(!active)return {matched:true,partial:false,basis:null};
  const range=interval(r);if(!range)return {matched:includeUnknown,partial:false,basis:'unknown',range:null};
  const lo=older===null?-Infinity:Number(older),hi=younger===null?Infinity:Number(younger);
  const matched=range.end>=lo&&range.start<=hi;
  return {matched,partial:matched&&(range.start<lo||range.end>hi),basis:range.basis,range};
 }
 function stops(now=new Date().getFullYear()){return [now,1000,0,-1000,-2000,-3000,-4000,-5000,-6000,-7000,-8000,-18000,-28000,-48000,-98000,-198000,-498000,null];}
 function label(year,now=new Date().getFullYear()){
  if(year===null)return 'أقدم — دون حد';if(year===now)return 'الآن ('+now.toLocaleString('ar-SA',{useGrouping:false})+'م)';if(year===0)return 'بداية الميلاد';return Math.abs(year).toLocaleString('ar-SA')+(year<0?' ق.م':' م');
 }
 return {parse,interval,match,stops,label};
});
