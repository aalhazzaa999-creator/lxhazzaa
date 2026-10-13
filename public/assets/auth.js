(()=>{
'use strict';
const cfg=window.LX_AUTH_CONFIG||{},configured=Boolean(cfg.url&&cfg.anonKey&&!cfg.url.includes('YOUR_'));
const sb=configured&&window.supabase?window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:'pkce'}}):null;
let user=null,role='researcher';
const $=id=>document.getElementById(id);
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const modal=document.createElement('div');modal.className='lx-auth-overlay';modal.hidden=true;
modal.innerHTML='<div class="lx-auth-dialog" role="dialog" aria-modal="true" aria-labelledby="lxAuthTitle"><button type="button" id="lxAuthClose" class="lx-auth-close" aria-label="إغلاق">×</button><div class="lx-auth-brand">LXHAZZAA</div><h2 id="lxAuthTitle">الدخول إلى حسابك</h2><p id="lxAuthInfo" class="smallnote">حساب واحد لجميع منصات LXHAZZAA</p><div class="lx-social-login" id="lxSocialLogin"><button type="button" class="lx-social-btn" data-lx-provider="google"><span class="lx-google-g" aria-hidden="true">G</span> المتابعة باستخدام Google</button><button type="button" class="lx-social-btn" data-lx-provider="apple"><span class="lx-apple-mark" aria-hidden="true">●</span> المتابعة باستخدام Apple</button></div><div class="lx-auth-divider" id="lxAuthDivider"><span>أو باستخدام البريد الإلكتروني</span></div><form id="lxAuthForm"><label for="lxAuthName" id="lxNameLabel" hidden>الاسم الظاهر</label><input id="lxAuthName" name="name" maxlength="80" autocomplete="name" placeholder="الاسم الظاهر" hidden><label for="lxAuthEmail">البريد الإلكتروني</label><input id="lxAuthEmail" name="email" type="email" required autocomplete="email" placeholder="name@example.com"><label for="lxAuthPassword" id="lxPasswordLabel">كلمة المرور</label><input id="lxAuthPassword" name="password" type="password" minlength="8" required autocomplete="current-password" placeholder="ثمانية أحرف على الأقل"><button class="btn" id="lxAuthSubmit" type="submit">دخول</button></form><p id="lxAuthStatus" role="status" aria-live="polite"></p><div class="lx-auth-links"><button type="button" data-lx-mode="login">تسجيل الدخول</button><button type="button" data-lx-mode="signup">حساب جديد</button><button type="button" data-lx-mode="reset">نسيت كلمة المرور؟</button></div><button type="button" id="lxAuthGuest" class="btn ghost">المتابعة كزائر</button></div>';
document.body.appendChild(modal);
let mode='login';
function setMode(next){mode=next;$('lxSocialLogin').hidden=next==='reset';$('lxAuthDivider').hidden=next==='reset';$('lxAuthTitle').textContent=next==='signup'?'إنشاء حساب باحث':next==='reset'?'استعادة كلمة المرور':'الدخول إلى حسابك';$('lxAuthName').hidden=next!=='signup';$('lxNameLabel').hidden=next!=='signup';$('lxAuthName').required=next==='signup';$('lxAuthPassword').hidden=next==='reset';$('lxPasswordLabel').hidden=next==='reset';$('lxAuthPassword').required=next!=='reset';$('lxAuthSubmit').textContent=next==='signup'?'إنشاء حساب مجاني':next==='reset'?'إرسال رابط الاستعادة':'تسجيل الدخول';$('lxAuthStatus').textContent=configured?'':'التسجيل غير مفعّل بعد: يلزم ربط قاعدة حسابات LXHAZZAA الآمنة.';}
function open(next='login'){setMode(next);modal.hidden=false;$('lxAuthEmail').focus()}
function close(){modal.hidden=true}
$('lxAuthClose').onclick=close;$('lxAuthGuest').onclick=close;
modal.addEventListener('click',async e=>{const provider=e.target.closest('[data-lx-provider]');if(provider){if(!sb){$('lxAuthStatus').textContent='خيار '+(provider.dataset.lxProvider==='google'?'Google':'Apple')+' يحتاج تفعيل الربط الآمن أولًا. لم يتم تسجيل الدخول.';return;}provider.disabled=true;try{const {error}=await sb.auth.signInWithOAuth({provider:provider.dataset.lxProvider,options:{redirectTo:location.origin+location.pathname}});if(error)throw error;}catch(err){$('lxAuthStatus').textContent=err.message||'تعذر بدء تسجيل الدخول';provider.disabled=false;}return;}if(e.target===modal)close();const b=e.target.closest('[data-lx-mode]');if(b)setMode(b.dataset.lxMode)});
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
function accountName(u){const m=u?.user_metadata||{};return String(m.display_name||m.full_name||m.name||u?.email?.split('@')[0]||'المستخدم').trim().slice(0,80);}
async function refresh(){
if(sb){const {data,error}=await sb.auth.getUser();if(error&&error.name!=='AuthSessionMissingError')console.warn('LXHAZZAA auth:',error.message);user=data?.user||null;role='researcher';if(user){const {data:p}=await sb.from('profiles').select('role').eq('id',user.id).maybeSingle();if(p?.role)role=p.role;}}
document.querySelectorAll('[data-lx-account]').forEach(b=>{b.textContent=user?(role==='owner'||role==='admin'?'LXHAZZAA | الإدارة':'حسابي'):'دخول / تسجيل';b.title=user?'إدارة الحساب وتسجيل الخروج':'الدخول أو إنشاء حساب';});
document.querySelectorAll('[data-lx-member]').forEach(el=>{el.hidden=!user;});
document.dispatchEvent(new CustomEvent('lx-auth-change',{detail:{signedIn:!!user,role}}));
}
async function signOut(){if(sb)await sb.auth.signOut();await refresh();}
document.addEventListener('click',e=>{const b=e.target.closest('[data-lx-account]');if(b){e.preventDefault();if(user){if(confirm('هل تريد تسجيل الخروج من LXHAZZAA؟'))signOut();}else open();}});
window.LXAuth={open,signOut,refresh,getUser:()=>user,getRole:()=>role,configured:!!sb,client:sb};
if(sb){sb.auth.onAuthStateChange(()=>{setTimeout(refresh,0)});(async()=>{const params=new URLSearchParams(location.search);const code=params.get('code');if(code){document.querySelectorAll('[data-lx-account]').forEach(b=>b.textContent='جارٍ إكمال الدخول…');const {error}=await sb.auth.exchangeCodeForSession(code);if(error){open('login');$('lxAuthStatus').textContent='تعذر إكمال تسجيل Google: '+error.message;}else{history.replaceState({},'',location.pathname);}}await refresh();})();}
const oauthError=new URLSearchParams(location.search).get('error_description')||new URLSearchParams(location.hash.slice(1)).get('error_description');if(oauthError){open('login');$('lxAuthStatus').textContent='لم يكتمل تسجيل الدخول: '+oauthError;}
setMode('login');
})();