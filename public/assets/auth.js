(()=>{
'use strict';
const cfg=window.LX_AUTH_CONFIG||{},configured=Boolean(cfg.url&&cfg.anonKey&&!cfg.url.includes('YOUR_'));
const sb=configured&&window.supabase?window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
let user=null,role='researcher';
const $=id=>document.getElementById(id);
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const modal=document.createElement('div');modal.className='lx-auth-overlay';modal.hidden=true;
modal.innerHTML='<div class="lx-auth-dialog" role="dialog" aria-modal="true" aria-labelledby="lxAuthTitle"><button type="button" id="lxAuthClose" class="lx-auth-close" aria-label="إغلاق">×</button><div class="lx-auth-brand">LXHAZZAA</div><h2 id="lxAuthTitle">الدخول إلى حسابك</h2><p id="lxAuthInfo" class="smallnote">حساب واحد لجميع منصات LXHAZZAA</p><form id="lxAuthForm"><label for="lxAuthName" id="lxNameLabel" hidden>الاسم الظاهر</label><input id="lxAuthName" name="name" maxlength="80" autocomplete="name" placeholder="الاسم الظاهر" hidden><label for="lxAuthEmail">البريد الإلكتروني</label><input id="lxAuthEmail" name="email" type="email" required autocomplete="email" placeholder="name@example.com"><label for="lxAuthPassword" id="lxPasswordLabel">كلمة المرور</label><input id="lxAuthPassword" name="password" type="password" minlength="8" required autocomplete="current-password" placeholder="ثمانية أحرف على الأقل"><button class="btn" id="lxAuthSubmit" type="submit">دخول</button></form><p id="lxAuthStatus" role="status" aria-live="polite"></p><div class="lx-auth-links"><button type="button" data-lx-mode="login">تسجيل الدخول</button><button type="button" data-lx-mode="signup">حساب جديد</button><button type="button" data-lx-mode="reset">نسيت كلمة المرور؟</button></div><button type="button" id="lxAuthGuest" class="btn ghost">المتابعة كزائر</button></div>';
document.body.appendChild(modal);
let mode='login';
function setMode(next){mode=next;$('lxAuthTitle').textContent=next==='signup'?'إنشاء حساب باحث':next==='reset'?'استعادة كلمة المرور':'الدخول إلى حسابك';$('lxAuthName').hidden=next!=='signup';$('lxNameLabel').hidden=next!=='signup';$('lxAuthName').required=next==='signup';$('lxAuthPassword').hidden=next==='reset';$('lxPasswordLabel').hidden=next==='reset';$('lxAuthPassword').required=next!=='reset';$('lxAuthSubmit').textContent=next==='signup'?'إنشاء حساب مجاني':next==='reset'?'إرسال رابط الاستعادة':'تسجيل الدخول';$('lxAuthStatus').textContent=configured?'':'التسجيل غير مفعّل بعد: يلزم ربط قاعدة حسابات LXHAZZAA الآمنة.';}
function open(next='login'){setMode(next);modal.hidden=false;$('lxAuthEmail').focus()}
function close(){modal.hidden=true}
$('lxAuthClose').onclick=close;$('lxAuthGuest').onclick=close;
modal.addEventListener('click',e=>{if(e.target===modal)close();const b=e.target.closest('[data-lx-mode]');if(b)setMode(b.dataset.lxMode)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)close()});
$('lxAuthForm').addEventListener('submit',async e=>{
e.preventDefault();if(!sb){$('lxAuthStatus').textContent='لا يمكن إنشاء الحساب حتى يكتمل الربط الآمن بقاعدة المستخدمين.';return}
const email=$('lxAuthEmail').value.trim(),password=$('lxAuthPassword').value,btn=$('lxAuthSubmit');btn.disabled=true;$('lxAuthStatus').textContent='جارٍ تنفيذ الطلب…';
try{let result;
if(mode==='signup'){result=await sb.auth.signUp({email,password,options:{data:{display_name:$('lxAuthName').value.trim()}}});}
else if(mode==='reset'){result=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/'});}
else{result=await sb.auth.signInWithPassword({email,password});}
if(result.error)throw result.error;
$('lxAuthStatus').textContent=mode==='signup'?'تم تقديم طلب التسجيل. راجع بريدك لتأكيد الحساب قبل الدخول.':mode==='reset'?'إذا كان البريد مسجلاً فستصلك رسالة استعادة.':'تم تسجيل الدخول.';
if(mode==='login'){await refresh();close();}
}catch(err){$('lxAuthStatus').textContent=err.message||'تعذر إتمام الطلب';}finally{btn.disabled=false}
});
async function refresh(){
if(sb){const {data}=await sb.auth.getUser();user=data?.user||null;role='researcher';if(user){const {data:p}=await sb.from('profiles').select('role').eq('id',user.id).maybeSingle();if(p?.role)role=p.role;}}
document.querySelectorAll('[data-lx-account]').forEach(b=>{b.textContent=user?'حسابي · '+(user.user_metadata?.display_name||user.email):'دخول / تسجيل';});
document.querySelectorAll('[data-lx-member]').forEach(el=>{el.hidden=!user;});
document.dispatchEvent(new CustomEvent('lx-auth-change',{detail:{signedIn:!!user,role}}));
}
async function signOut(){if(sb)await sb.auth.signOut();await refresh();}
document.addEventListener('click',e=>{const b=e.target.closest('[data-lx-account]');if(b){e.preventDefault();if(user){if(confirm('هل تريد تسجيل الخروج من LXHAZZAA؟'))signOut();}else open();}});
window.LXAuth={open,signOut,refresh,getUser:()=>user,getRole:()=>role,configured:!!sb,client:sb};
if(sb){sb.auth.onAuthStateChange(()=>{setTimeout(refresh,0)});refresh();}
setMode('login');
})();