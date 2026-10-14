(()=>{
'use strict';
const A=()=>window.LXAuth,roleNames={researcher:'باحث',verified_researcher:'باحث مختص',scientific_moderator:'مشرف علمي',admin:'إدارة',owner:'مالك المنصة'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const overlay=document.createElement('div');overlay.className='lx-account-overlay';overlay.hidden=true;
overlay.innerHTML='<section class="lx-account-card" role="dialog" aria-modal="true" aria-label="حساب LXHAZZAA" dir="rtl"><button type="button" class="lx-account-close" data-act="close" aria-label="إغلاق">×</button><div class="lx-auth-brand">LXHAZZAA</div><h2>حسابي</h2><div id="lxAccountBody">جارٍ تحميل الحساب…</div></section>';
document.body.appendChild(overlay);
const body=overlay.querySelector('#lxAccountBody');
let profile=null,history=[],tab='profile',members=[],nameRequired=false,promptedMember=null;
const client=()=>A()?.client;
function memberId(number){return number==null?'—':String(number).padStart(6,'0');}
function displayName(){return profile?.display_name?.trim()||('LXgasst'+memberId(profile?.member_number));}
function userRole(){return A()?.getRole()||'researcher'}
function tabs(){const r=userRole();return '<nav class="lx-account-tabs"><button data-tab="profile" class="'+(tab==='profile'?'active':'')+'">الملف الشخصي</button><button data-tab="history" class="'+(tab==='history'?'active':'')+'">آخر 20 بحث</button>'+(r!=='researcher'?'<button data-tab="dashboard" class="'+(tab==='dashboard'?'active':'')+'">لوحة التحكم</button>':'')+'</nav>';}
function profileHtml(){return '<div class="lx-account-identity"><strong>'+esc(displayName())+'</strong><span>'+esc(roleNames[userRole()]||'باحث')+'</span><span>LX ID: '+esc(memberId(profile?.member_number))+'</span></div><p class="lx-account-hint">'+(nameRequired?'يلزم اختيار اسم ظاهر لإكمال إعداد الحساب. ':'الاسم الظاهر هو هويتك داخل LXHAZZAA، ولا يمكن أن يطابق اسم عضو آخر.')+'</p><p class="lx-account-hint">بريدك الإلكتروني: <b dir="ltr">'+esc(A()?.getUser()?.email||'غير متوفر')+'</b></p><label class="lx-email-visibility"><input type="checkbox" id="lxEmailVisibility" '+(profile?.show_email?'checked':'')+'> إظهار بريدي في لوحة أعضاء الإدارة</label><p class="lx-account-hint">البريد مخفي عن قائمة الأعضاء افتراضيًا، ويظهر لك دائمًا في حسابك.</p><form id="lxAccountNameForm"><label for="lxAccountName">الاسم الظاهر</label><input id="lxAccountName" maxlength="80" minlength="2" required value="'+esc(profile?.display_name||'')+'" placeholder="اختر اسمًا ظاهرًا غير مستخدم"><button type="submit" class="btn">حفظ الاسم</button></form><p id="lxAccountNotice" role="status"></p>';}
function historyHtml(){return '<p class="lx-account-hint">آخر 20 بحث محفوظة في حسابك، وتظهر في المنصات المرتبطة. لا يُسجَّل التصفح العادي.</p>'+(history.length?'<div class="lx-account-history">'+history.map(x=>'<div class="lx-history-row"><div><strong>'+esc(x.query)+'</strong><small>'+esc(x.platform==='lxhuman'?'أطلس الرفات القديمة':'موسوعة الوثائق')+' · '+esc(new Date(x.created_at).toLocaleDateString('ar-SA'))+'</small></div><a href="'+(x.platform==='lxhuman'?'/lxhuman/':'/lxdocumentary/')+'?lxsearch='+encodeURIComponent(x.query)+'">إعادة البحث</a></div>').join('')+'</div><button type="button" class="btn ghost" data-act="clear-history">مسح سجل البحث</button>':'<p class="lx-account-empty">لا توجد عمليات بحث محفوظة بعد.</p>');}
function dashboardHtml(){
const r=userRole();
if(r==='verified_researcher')return '<h3>لوحة الباحث المختص</h3><p>حسابك معتمد كباحث مختص.</p><p class="lx-account-hint">تقديم الأبحاث والوثائق للمراجعة سيكون متاحًا عند إطلاق نظام المساهمات في الموسوعة.</p>';
if(r==='scientific_moderator')return '<h3>لوحة المشرف العلمي</h3><p>رتبتك: مشرف علمي.</p><p class="lx-account-hint">قائمة مراجعة المساهمات وإخفاء الوثائق لم تُفعّل بعد، ولن تظهر أدوات شكلية لا تنفذ أي إجراء.</p>';
if(r==='admin'||r==='owner')return '<h3>لوحة '+esc(roleNames[r])+'</h3><p class="lx-account-hint">قائمة أعضاء LXHAZZAA من قاعدة البيانات. البريد لا يظهر إلا بموافقة صاحبه. '+(r==='owner'?'المالك وحده يستطيع تعديل رتب الأعضاء، ولا يمكن تعيين مالك آخر من هذه الواجهة.':'يمكن للإدارة استعراض الأعضاء، ولا يمكنها منح الصلاحيات.')+'</p><div id="lxMemberList">'+(members.length?members.map(m=>'<div class="lx-member-row"><div><strong>'+esc(m.display_name)+'</strong><small>LX ID: '+esc(memberId(m.member_number))+' · '+esc(roleNames[m.role]||m.role)+' · '+esc(new Date(m.created_at).toLocaleDateString('ar-SA'))+'</small>'+(m.email?'<small>البريد: <b dir="ltr">'+esc(m.email)+'</b></small>':'')+(m.has_custom_name?'':'<small>اسم افتراضي، يستطيع العضو تغييره</small>')+'</div>'+(r==='owner'&&m.id!==A().getUser().id&&m.role!=='owner'?'<select aria-label="رتبة العضو '+esc(m.display_name)+' رقم '+esc(memberId(m.member_number))+'" data-member="'+esc(m.id)+'">'+['researcher','verified_researcher','scientific_moderator','admin'].map(v=>'<option value="'+v+'" '+(m.role===v?'selected':'')+'>'+roleNames[v]+'</option>').join('')+'</select>':'')+'</div>').join(''):'<p>لا توجد بيانات أعضاء لعرضها أو تعذر جلبها.</p>')+'</div><p id="lxAccountNotice" role="status"></p>';
return '<p>حساب باحث. يمكنك البحث والاطلاع على سجل بحثك.</p>';
}
function render(){if(!A()?.getUser()){close();return;}body.innerHTML=tabs()+(tab==='profile'?profileHtml():tab==='history'?historyHtml():dashboardHtml())+'<div class="lx-account-footer"><button type="button" class="btn ghost" data-act="logout">تسجيل الخروج</button></div>';}
async function load(){
const sb=client(),u=A()?.getUser();if(!sb||!u)return;
const [p,h]=await Promise.all([sb.from('profiles').select('display_name,role,member_number,show_email').eq('id',u.id).maybeSingle(),sb.from('search_history').select('id,platform,query,created_at').eq('user_id',u.id).order('created_at',{ascending:false}).limit(20)]);
profile=p.data||null;nameRequired=!!profile&&!profile.display_name?.trim();history=h.data||[];render();
}
async function loadMembers(){const r=userRole();if(!['admin','owner'].includes(r))return;const {data,error}=await client().rpc('lx_admin_members_v3');members=error?[]:data||[];render();if(error){const el=overlay.querySelector('#lxAccountNotice');if(el)el.textContent='تعذر تحميل الأعضاء: '+error.message;}}
async function open(){if(!A()?.getUser()){A()?.open('login');return;}tab='profile';overlay.hidden=false;render();await load();}
function close(){if(nameRequired&&A()?.getUser()){tab='profile';render();overlay.querySelector('#lxAccountName')?.focus();return;}overlay.hidden=true;}
overlay.addEventListener('click',async e=>{
const b=e.target.closest('[data-act],[data-tab]');if(!b){if(e.target===overlay)close();return;}
if(b.dataset.tab){tab=b.dataset.tab;render();if(tab==='dashboard')await loadMembers();return;}
const act=b.dataset.act;
if(act==='close')close();
if(act==='logout'){await A().signOut();close();}
if(act==='clear-history'&&confirm('هل تريد حذف سجل البحث من حسابك؟')){const u=A().getUser();const {error}=await client().from('search_history').delete().eq('user_id',u.id);if(error)alert(error.message);else{history=[];render();}}
});
overlay.addEventListener('submit',async e=>{
if(e.target.id!=='lxAccountNameForm')return;e.preventDefault();const name=overlay.querySelector('#lxAccountName').value.trim(),n=overlay.querySelector('#lxAccountNotice');n.textContent='جارٍ الحفظ…';
const {error}=await client().rpc('lx_set_display_name',{new_name:name});
if(error)n.textContent=error.message?.includes('already taken')?'الاسم مستخدم بالفعل؛ اختر اسمًا مختلفًا.':'تعذر الحفظ: '+error.message;else{nameRequired=false;profile={...(profile||{}),display_name:name};render();overlay.querySelector('#lxAccountNotice').textContent='تم حفظ الاسم الظاهر.';document.dispatchEvent(new CustomEvent('lx-profile-change',{detail:{name}}));}
});
overlay.addEventListener('change',async e=>{
if(e.target.id==='lxEmailVisibility'){const checkbox=e.target;checkbox.disabled=true;const {error}=await client().rpc('lx_set_email_visibility',{visible:checkbox.checked});if(error){checkbox.checked=!checkbox.checked;overlay.querySelector('#lxAccountNotice').textContent='تعذر حفظ إعداد البريد: '+error.message;}else{profile={...(profile||{}),show_email:checkbox.checked};overlay.querySelector('#lxAccountNotice').textContent=checkbox.checked?'تم السماح بإظهار البريد في لوحة الإدارة.':'تم إخفاء البريد من لوحة الإدارة.';}checkbox.disabled=false;return;}
const select=e.target.closest('[data-member]');if(!select)return;
const target=members.find(m=>m.id===select.dataset.member);if(!target||target.role===select.value)return;
if(!confirm('تغيير رتبة '+target.display_name+' (رقم العضوية '+memberId(target.member_number)+') إلى '+roleNames[select.value]+'؟')){select.value=target.role;return;}
select.disabled=true;const {error}=await client().rpc('lx_owner_set_role',{member_id:target.id,new_role:select.value});
if(error)alert('لم يتم التغيير: '+error.message);await loadMembers();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden)close()});
document.addEventListener('lx-auth-change',async e=>{if(!e.detail.signedIn){nameRequired=false;profile=null;promptedMember=null;overlay.hidden=true;return;}const u=A()?.getUser();if(!u||promptedMember===u.id)return;promptedMember=u.id;const {data}=await client().from('profiles').select('display_name').eq('id',u.id).maybeSingle();if(data&&!data.display_name?.trim()&&A()?.getUser()?.id===u.id){await open();tab='profile';render();overlay.querySelector('#lxAccountName')?.focus();}});
async function recordSearch(platform,query){
const sb=client(),u=A()?.getUser();query=String(query||'').trim().slice(0,300);
if(!sb||!u||!query)return;
const {error}=await sb.from('search_history').insert({user_id:u.id,platform,query});
if(error)console.warn('LXHAZZAA search history:',error.message);
}
function initAtlasHistory(){
if(!location.pathname.startsWith('/lxhuman'))return;
let last='',timer;
const ids=['q','mutation','root','country','sex','locationType','radius'];
const log=()=>{const entries=ids.map(id=>{const el=document.getElementById(id);return el&&el.value?((el.labels?.[0]?.textContent||id)+': '+el.value):''}).filter(Boolean);const q=entries.join(' | ');if(q&&q!==last){last=q;recordSearch('lxhuman',q);}};
for(const id of ids){const el=document.getElementById(id);if(el)el.addEventListener(id==='q'||id==='mutation'?'input':'change',()=>{clearTimeout(timer);timer=setTimeout(log,1100);});}
const saved=new URLSearchParams(location.search).get('lxsearch');if(saved){const q=document.getElementById('q');if(q&&saved.length<=300){if(saved.includes(': ')){for(const part of saved.split(' | ')){const ix=part.indexOf(': ');if(ix<0)continue;const label=part.slice(0,ix),value=part.slice(ix+2);for(const id of ids){const el=document.getElementById(id);if(el&&el.labels?.[0]?.textContent===label){el.value=value;el.dispatchEvent(new Event(id==='q'||id==='mutation'?'input':'change',{bubbles:true}));}}}}else{q.value=saved;q.dispatchEvent(new Event('input',{bubbles:true}));}}}
}
window.LXAccount={open,close,recordSearch,refresh:load,displayName};
initAtlasHistory();
})();
