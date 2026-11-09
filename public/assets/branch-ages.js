/* Preserve published node estimates. Zero/missing values are unavailable, never inherited. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LXBranchAges=api;})(typeof window==='object'?window:globalThis,()=>{
 'use strict';
 const positive=v=>typeof v==='number'&&Number.isFinite(v)&&v>0?v:null;
 function interval(lo,hi){lo=positive(lo);hi=positive(hi);return lo!==null&&hi!==null&&lo<=hi?[lo,hi]:null;}
 function fromSource(n){const formed=positive(n.formed),tmrca=positive(n.tmrca);if(formed===null&&tmrca===null)return null;return {formed,tmrca,formedRange:formed===null?null:interval(n.formedlowage,n.formedhighage),tmrcaRange:tmrca===null?null:interval(n.tmrcalowage,n.tmrcahighage),unit:'ybp',method:'published-source-estimate'};}
 return {fromSource};
});
