(()=>{'use strict';
const $=id=>document.getElementById(id),form=$('contribute');
const staff=['scientific_moderator','admin','owner'];
const allowed=['verified_researcher',...staff];
const client=()=>window.LXAuth?.client,user=()=>window.LXAuth?.getUser();
function message(el,s){el.textContent=s;}
function line(parent,title,description){const article=document.createElement('article'),strong=document.createElement('strong'),p=document.createElement('p');strong.textContent=title;p.textContent=description;article.append(strong,p);parent.append(article);return article;}
function displayRights(){const metadata=$('rightsBasis').value==='metadata_only';if(metadata)$('display').value='metadata_only';$('display').disabled=metadata;$('originalFile').disabled=metadata;$('rightsEvidence').required=!metadata;}
$('rightsBasis').addEventListener('change',displayRights);displayRights();
const ottomanSource=new URLSearchParams(location.search).get('source')==='ottoman';
if(ottomanSource){
 form.elements.holding_institution.value='T.C. Cumhurbaşkanlığı Devlet Arşivleri Başkanlığı — Osmanlı Arşivi';
 form.elements.original_owner.value='T.C. Cumhurbaşkanlığı Devlet Arşivleri Başkanlığı';
 form.elements.rights_basis.value='metadata_only';
 form.elements.shelfmark.required=true;
 form.elements.source_citation.required=true;
 displayRights();
}
async function refresh(){
 const sb=client(),u=user(),role=window.LXAuth?.getRole();$('submissionPanel').hidden=!u||!allowed.includes(role);$('reviewPanel').hidden=!u||!staff.includes(role);
 if(!u||!sb){message($('access'),'سجّل الدخول لعرض مساهماتك. رفع المواد متاح للباحثين المعتمدين.');message($('mine'),'يلزم تسجيل الدخول.');return;}
 message($('access'),allowed.includes(role)?'يمكنك إرسال المادة للمراجعة، ولن تظهر للزوار قبل اعتمادها.':'حسابك باحث؛ تفعيل المساهمات يتطلب اعتماد رتبة باحث مختص.');
 const mine=await sb.from('lx_documents').select('id,title,status,review_note,created_at').eq('contributor_id',u.id).order('created_at',{ascending:false}).limit(30);$('mine').replaceChildren();
 if(mine.error){message($('mine'),'تعذر تحميل المساهمات: '+mine.error.message);return;}
 for(const d of mine.data||[])line($('mine'),d.title+' · '+({draft:'مسودة',submitted:'قيد المراجعة',published:'منشورة',rejected:'مرفوضة',restricted:'مقيدة'}[d.status]||d.status),d.review_note||'');
 if(!mine.data?.length)message($('mine'),'لا توجد مساهمات بعد.');
 if(staff.includes(role))await reviewQueue();
}
async function reviewQueue(){const sb=client(),out=$('queue');const {data,error}=await sb.from('lx_documents').select('id,title,status,kind,source_url,holding_institution,rights_basis,rights_evidence,permitted_display,original_file_path,original_transcription,translation_text,contributor_id').in('status',['submitted','published','restricted']).order('created_at',{ascending:false}).limit(50);out.replaceChildren();if(error){message(out,'تعذر تحميل القائمة: '+error.message);return;}
 for(const d of data||[]){const row=line(out,d.title+' · '+d.status,`الحافظة: ${d.holding_institution||'غير محددة'} | الحقوق: ${d.rights_basis} | الدليل: ${d.rights_evidence||'وصف فقط'} | الإتاحة: ${d.permitted_display} | التفريغ: ${d.original_transcription?'موجود':'غير موجود'} | الترجمة: ${d.translation_text?'موجودة':'غير موجودة'}`);if(d.source_url){const a=document.createElement('a');a.href=d.source_url;a.rel='noopener noreferrer';a.target='_blank';a.textContent='المصدر الأصلي';row.append(a);}
 if(d.original_file_path){const a=document.createElement('button');a.type='button';a.textContent='فتح الأصل الخاص';a.onclick=async()=>{const {data,error}=await sb.storage.from('lx-source-originals').createSignedUrl(d.original_file_path,60);if(error)alert(error.message);else window.open(data.signedUrl,'_blank','noopener');};row.append(a);}
 for(const [action,label] of [['published','اعتماد البيانات'],['rejected','رفض'],['restricted','تقييد']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=async()=>{const note=prompt('ملاحظة المراجع (سبب الرفض أو التقييد عند الحاجة)')||'';if(action!=='published'&&!note.trim())return;const {error}=await sb.rpc('lx_review_document',{p_id:d.id,p_decision:action,p_note:note});if(error)alert(error.message);else await refresh();};row.append(b);}}
 if(!data?.length)message(out,'لا توجد طلبات للمراجعة.');
}
form.addEventListener('submit',async e=>{e.preventDefault();const u=user(),sb=client(),file=$('originalFile').files[0],out=$('result');if(!u||!sb||!allowed.includes(window.LXAuth.getRole()))return message(out,'يلزم دخول باحث معتمد.');if(!window.LXLegal?.isReady())return message(out,'أكمل الموافقة على الشروط الحالية أولًا.');
 const f=new FormData(form),basis=f.get('rights_basis');if(ottomanSource&&!String(f.get('shelfmark')||'').trim())return message(out,'أدخل رمز الحفظ الرسمي للوثيقة العثمانية.');if(ottomanSource&&basis!=='metadata_only'&&!String(f.get('rights_evidence')||'').trim())return message(out,'إتاحة صورة الأرشيف تحتاج تصريحًا واضحًا؛ استخدم الفهرسة الوصفية حتى يتوفر.');if(file&&(basis==='metadata_only'||file.size>15728640||!['application/pdf','image/jpeg','image/png'].includes(file.type)))return message(out,'اختر إذن إتاحة مناسبًا وملف PDF أو JPG أو PNG حتى 15 MB.');if(basis==='metadata_only'&&f.get('permitted_display')!=='metadata_only')return message(out,'الفهرسة الوصفية لا تسمح بعرض الملف.');if(f.get('translation_text')&&!f.get('original_transcription'))return message(out,'أضف التفريغ بلغته الأصلية قبل الترجمة.');
 const btn=$('send');btn.disabled=true;message(out,'جارٍ حفظ المسودة…');try{
 const cols=['kind','title','original_language','script','holding_institution','shelfmark','source_url','source_citation','original_owner','provider_credit','researcher_credit','rights_basis','rights_evidence','permitted_display','original_transcription','transcription_status','translation_text','translation_language','translation_status'];const entry={contributor_id:u.id};for(const key of cols)entry[key]=String(f.get(key)||'').trim()||null;entry.permitted_display=basis==='metadata_only'?'metadata_only':entry.permitted_display;entry.transcription_status||='unread';entry.translation_status||='not_started';if(ottomanSource){entry.transcription_status=entry.original_transcription?'draft':'unread';entry.translation_status=entry.translation_text?'draft':'not_started';}
 const created=await sb.from('lx_documents').insert(entry).select('id').single();if(created.error)throw created.error;const id=created.data.id;
 if(file){message(out,'حُفظت المسودة. جارٍ رفع الأصل إلى التخزين الخاص…');const ext={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png'}[file.type],path=`${u.id}/${id}/${crypto.randomUUID()}.${ext}`;const uploaded=await sb.storage.from('lx-source-originals').upload(path,file,{contentType:file.type,upsert:false});if(uploaded.error)throw uploaded.error;const update=await sb.from('lx_documents').update({original_file_path:path}).eq('id',id);if(update.error)throw update.error;}
 const submitted=await sb.rpc('lx_submit_document',{p_id:id});if(submitted.error)throw submitted.error;
 form.reset();displayRights();message(out,'تم إرسال المادة للمراجعة. رقم السجل: '+id);await refresh();
 }catch(err){message(out,'حُفظت المسودة إن تم إنشاؤها، لكن لم يكتمل الإرسال: '+(err.message||err));}finally{btn.disabled=false;}});
document.addEventListener('lx-auth-change',refresh);document.addEventListener('lx-legal-ready',refresh);setTimeout(refresh,500);
})();
