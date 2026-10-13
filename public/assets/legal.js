(()=>{
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const el=document.createElement('div');el.className='lx-legal-overlay';el.hidden=true;
el.innerHTML='<section class="lx-legal-card" dir="rtl" role="dialog" aria-modal="true" aria-labelledby="lxLegalHeading"><div class="lx-legal-mark">LXHAZZAA</div><h2 id="lxLegalHeading">الشروط والأحكام والخصوصية</h2><p class="lx-legal-intro">يرجى قراءة النسخ الحالية قبل تفعيل ميزات حسابك. قد تتغير السياسات مستقبلاً، وسنطلب موافقتك مجددًا على التغييرات التي تستلزم ذلك.</p><div id="lxLegalDocs" class="lx-legal-docs">جارٍ تحميل الشروط…</div><p id="lxLegalError" role="alert"></p><div class="lx-legal-actions"><button id="lxLegalAgree" type="button" disabled>موافق، متابعة إلى حسابي</button><button id="lxLegalLogout" type="button">تسجيل الخروج</button></div></section>';
document.body.appendChild(el);
const docs=el.querySelector('#lxLegalDocs'),agree=el.querySelector('#lxLegalAgree'),errorBox=el.querySelector('#lxLegalError');
let rows=[],busy=false,identity='',acceptedKey='';
const auth=()=>window.LXAuth;
function missing(){return rows.filter(x=>x.requires_reacceptance&&!x.accepted);}
function show(){
 el.hidden=false;
 const checks=rows.map((r,i)=>'<label class="lx-legal-check"><input type="checkbox" data-legal-check="'+i+'" '+(r.accepted?'checked disabled':'')+'> '+(r.document_type==='terms'?'أوافق على شروط الاستخدام':'أوافق على سياسة الخصوصية')+' <small>('+esc(r.version)+')</small></label>').join('');
 docs.innerHTML='<div class="lx-legal-summary"><strong>قبل متابعة استخدام حساب LXHAZZAA</strong><p>باستخدام حسابك، تلتزم بحقوق النشر ودقة المساهمات، وتقر بالاطلاع على كيفية معالجة بيانات الحساب. تُحدّث هذه السياسات عند الحاجة، وسنطلب موافقتك مجددًا عند التغييرات التي تستلزم ذلك.</p><details class="lx-legal-details"><summary>قراءة الشروط والسياسات كاملة</summary>'+rows.map(r=>'<section><h3>'+esc(r.title_ar)+' <small>الإصدار '+esc(r.version)+'</small></h3><p>'+esc(r.body_ar)+'</p></section>').join('')+'</details></div><div class="lx-legal-checks">'+checks+'</div>';
 update();
}
function update(){agree.disabled=busy||missing().some(r=>{const i=rows.indexOf(r);return !docs.querySelector('[data-legal-check="'+i+'"]')?.checked;});}
async function check(){
const u=auth()?.getUser(),sb=auth()?.client;
if(!u||!sb){el.hidden=true;identity='';return;}
const key=u.id;identity=key;errorBox.textContent='';
const {data,error}=await sb.rpc('lx_current_legal');
if(identity!==key||auth()?.getUser()?.id!==key)return;
if(error){rows=[];el.hidden=false;docs.textContent='تعذر تحميل النسخ المعتمدة. تحقق من الاتصال وأعد المحاولة.';agree.disabled=true;errorBox.textContent=error.message;return;}
rows=data||[];
if(rows.length<2){el.hidden=false;docs.textContent='تعذر التحقق من شروط الاستخدام وسياسة الخصوصية. لا يمكن تأكيد الموافقة حاليًا.';agree.disabled=true;return;}
if(missing().length){show();}else{el.hidden=true;acceptedKey=key;document.dispatchEvent(new CustomEvent('lx-legal-ready',{detail:{userId:key}}));}
}
docs.addEventListener('change',update);
agree.addEventListener('click',async()=>{
if(agree.disabled||busy)return;const sb=auth()?.client,u=auth()?.getUser();if(!sb||!u)return;
busy=true;update();errorBox.textContent='جارٍ تسجيل الموافقة…';
try{
 for(const r of missing()){if(!docs.querySelector('[data-legal-check="'+rows.indexOf(r)+'"]')?.checked)throw Error('يرجى الموافقة على جميع النسخ الحالية');const {error}=await sb.rpc('lx_accept_legal',{p_document_type:r.document_type,p_version:r.version});if(error)throw error;}
 errorBox.textContent='';await check();
}catch(e){errorBox.textContent='لم تُسجّل الموافقة: '+(e.message||'تعذر الاتصال');}
finally{busy=false;update();}
});
el.querySelector('#lxLegalLogout').addEventListener('click',async()=>{await auth()?.signOut();el.hidden=true;});
document.addEventListener('lx-auth-change',e=>{if(!e.detail.signedIn){identity='';acceptedKey='';el.hidden=true;}else{check();}});
window.LXLegal={check,isReady:()=>!!auth()?.getUser()&&acceptedKey===auth().getUser().id&&el.hidden};
if(auth()?.getUser())check();
})();