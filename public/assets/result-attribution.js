/* Distinguish a partner's reanalysis from published study assignments. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LXResultAttribution=api;})(typeof window==='object'?window:globalThis,()=>{
  'use strict';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeURL=s=>{try{const u=new URL(s);return u.protocol==='https:'?esc(u.href):'';}catch{return '';}};
  function markup(record,{compact=false}={}){
    const a=record?.partnerAnalysis;if(!a)return '';
    const logo='<a class="result-partner-logo" href="https://www.snpscience.com/" target="_blank" rel="noopener noreferrer" aria-label="LXHAZZAA / SNPscience — مرجع إعادة التحليل؛ فتح موقع مختبر SNPscience"><img src="/assets/partners/lx-snps-inline-v2.png" alt="LX / SNPs — LXHAZZAA وSNPscience" width="2172" height="724" loading="lazy"></a>';
    if(compact)return '<span class="result-partner-compact" title="إعادة تحليل مختبر SNPscience؛ التقرير التفصيلي قيد الإرفاق">'+logo+'</span>';
    const history=(record.readingHistory||[]).map(h=>{const href=safeURL(h.url);return '<li><bdi>'+esc(h.y)+'</bdi><span>'+esc(h.label)+(href?' <a href="'+href+'" target="_blank" rel="noopener noreferrer">المصدر ↗</a>':'')+'</span>'+(h.reviewNote?'<small class="reading-source-review">'+esc(h.reviewNote)+'</small>':'')+'</li>';}).join('');
    return '<section class="result-attribution" aria-label="مصدر إعادة التحليل وتسلسل القراءات"><div class="result-attribution-head"><div><small>إعادة تحليل · مرجع النتيجة: المختبر</small><strong dir="ltr">'+esc(a.y)+'</strong><span dir="ltr">LXHAZZAA / SNPscience</span></div>'+logo+'</div><p>'+esc(a.notice)+'</p>'+(history?'<h4>تسلسل قراءات Y</h4><ol>'+history+'</ol>':'')+'</section>';
  }
  return {markup};
});
