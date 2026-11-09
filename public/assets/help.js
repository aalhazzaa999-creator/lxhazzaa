(()=>{'use strict';
const onDocs=location.pathname.startsWith('/lxdocumentary'),onAtlas=location.pathname.startsWith('/lxhuman');
const topics=onDocs?[
 ['المجموعات','الوثائق والسجلات: صكوك ورسائل وعقود. المخطوطات: نسخ خطية. النقوش: كتابات أثرية. المصادر والدراسات: مراجع تدعم فهرسة المواد.'],
 ['البحث','يعرض نتائج المواد المنشورة والمراجعة فقط. إذا لم يظهر سجل، لم تُنشر مادته بعد.'],
 ['المساهمة','يمكن للباحث المعتمد وصف المادة وإرفاق أصل خاص عند وجود حق مناسب. يراجع المشرف المصدر والحقوق ثم يقرر النشر.'],
 ['الحقوق','البيانات الوصفية لا تمنح حق عرض الصورة أو تنزيلها. يُذكر المالك والجهة الحافظة والمزوّد والباحث كلٌ بحسب دوره.'],
 ['التفريغ والترجمة','يظهر النص بلغته الأصلية أولًا، ثم الترجمة إن توفرت؛ وتظهر حالة القراءة والمراجعة، ولا يُستكمل التالف على أنه مؤكد.']
]:onAtlas?[
 ['البحث والفلاتر','ابحث برقم العينة أو الموقع أو التحور، ثم صفّ النتائج بحسب الدولة والجنس ونوع الموقع.'],
 ['الخريطة','النقطة تشير إلى موضع الدراسة أو بلد تقريبي، ولا تعني دائمًا إحداثيات القبر. اختر نقطة لعرض البيانات والمراجع.'],
 ['السلالة Y','تصنيف بحثي للعينة القديمة. لا يثبت وحده نسب شخص حي أو هوية إثنية معاصرة.'],
 ['النطاق','اختر نصف قطر ثم حدّث النطاق حول مركز الخريطة الحالي.'],
 ['سجل الرفات','اختر عينة من النتائج لعرض مصدرها والتأريخ والتحور ومدى دقة الموقع.']
]:[
 ['بوابة LXHAZZAA','اختر منصة أطلس الرفات القديمة أو موسوعة الوثائق والمخطوطات والنقوش من الدائرتين.'],
 ['الحساب','يمكنك المتابعة كزائر أو تسجيل الدخول بحساب موحّد للمنصات.'],
 ['السياسات','تتيح روابط التذييل قراءة الشروط وسياسة الخصوصية قبل التسجيل.']
];
const style=document.createElement('style');style.textContent='.lx-help-button{position:fixed;left:18px;bottom:20px;z-index:9998;border:1px solid #d4af7c;border-radius:50%;width:48px;height:48px;background:#171c24;color:#f1cf95;font-size:23px;cursor:pointer}.lx-help-overlay[hidden]{display:none}.lx-help-overlay{position:fixed;inset:0;z-index:99999;background:#05070acc;display:grid;place-items:center;padding:16px}.lx-help-card{max-width:650px;max-height:85vh;overflow:auto;background:#131820;color:#f4e8d3;border:1px solid #c09a64;border-radius:14px;padding:24px;line-height:1.8}.lx-help-card h2{color:#e7c28c}.lx-help-card summary{cursor:pointer;color:#f2d2a0;padding:9px}.lx-help-card p{margin:4px 10px 16px}.lx-help-card button{background:#d4af7c;border:0;border-radius:8px;padding:8px 18px;cursor:pointer}';document.head.append(style);
const trigger=document.createElement('button');trigger.type='button';trigger.className='lx-help-button';trigger.textContent='؟';trigger.setAttribute('aria-label','شرح أيقونات ووظائف هذه المنصة');trigger.title='شرح أيقونات ووظائف هذه المنصة';document.body.append(trigger);
const overlay=document.createElement('div');overlay.className='lx-help-overlay';overlay.hidden=true;overlay.dir='rtl';const card=document.createElement('section');card.className='lx-help-card';card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-label','دليل المنصة');const close=document.createElement('button');close.type='button';close.textContent='إغلاق';const heading=document.createElement('h2');heading.textContent='دليل الرموز والوظائف';card.append(close,heading);for(const [title,body] of topics){const details=document.createElement('details');details.open=true;const summary=document.createElement('summary');summary.textContent=title;const p=document.createElement('p');p.textContent=body;details.append(summary,p);card.append(details);}overlay.append(card);document.body.append(overlay);
trigger.onclick=()=>{overlay.hidden=false;close.focus()};close.onclick=()=>{overlay.hidden=true;trigger.focus()};overlay.onclick=e=>{if(e.target===overlay)close.click()};document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden)close.click()});
})();
