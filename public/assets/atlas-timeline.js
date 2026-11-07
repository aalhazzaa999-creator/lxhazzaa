/* Two accessible native sliders; input previews, committed changes filter once. */
(()=>{'use strict';const $=id=>document.getElementById(id),C=window.LXChronology,now=new Date().getFullYear(),stops=C.stops(now),last=stops.length-1;
 const recent=$('dateRecent'),ancient=$('dateAncient'),unknown=$('dateUnknown');let exact=null;
 for(const id of ['dateRecentSelect','dateAncientSelect'])if($(id))for(let i=0;i<stops.length;i++){const option=document.createElement('option');option.value=i;option.textContent=C.label(stops[i],now);$(id).append(option);}
 recent.max=ancient.max=last;recent.value=0;ancient.value=last;
 function options(){const a=Number(recent.value),b=Number(ancient.value);return {active:!!exact||a!==0||b!==last,older:exact?.older??stops[b],younger:exact?.younger??stops[a],includeUnknown:unknown.checked};}
 function paint(){const o=options();recent.setAttribute('aria-valuetext',C.label(o.younger,now));ancient.setAttribute('aria-valuetext',C.label(o.older,now));
  if($('dateRecentSelect'))$('dateRecentSelect').value=recent.value;if($('dateAncientSelect'))$('dateAncientSelect').value=ancient.value;recent.style.zIndex=Number(recent.value)===last?'3':'1';
  $('dateRecentLabel').textContent=C.label(o.younger,now);$('dateAncientLabel').textContent=C.label(o.older,now);
  $('dateSummary').textContent=o.active?'الفترة المحددة: من '+C.label(o.older,now)+' إلى '+C.label(o.younger,now):'جميع الفترات — دون تحديد';
  $('dateTrackFill').style.right=(Number(recent.value)/last*100)+'%';$('dateTrackFill').style.left=(100-Number(ancient.value)/last*100)+'%';
 }
 function update(which){exact=null;if(+recent.value>+ancient.value){if(which===recent)recent.value=ancient.value;else ancient.value=recent.value;}paint();}
 function commit(){document.dispatchEvent(new Event('lx-date-change'));}
 for(const control of [recent,ancient]){control.addEventListener('input',()=>update(control));control.addEventListener('change',commit);}
 for(const [id,control] of [['dateRecentSelect',recent],['dateAncientSelect',ancient]])if($(id))$(id).addEventListener('change',()=>{control.value=$(id).value;update(control);commit();});
 unknown.addEventListener('change',commit);
 function reset(notify=true){exact=null;recent.value=0;ancient.value=last;unknown.checked=false;paint();if(notify)commit();}
 $('dateReset').addEventListener('click',()=>reset());
 function write(params){const o=options();if(!o.active)return;params.set('dateFrom',o.older===null?'old':String(o.older));params.set('dateTo',o.younger===now?'now':String(o.younger));if(o.includeUnknown)params.set('dateUnknown','1');}
 function restore(params){reset(false);if(!params.has('dateFrom')&&!params.has('dateTo'))return;
  const from=params.get('dateFrom')||'old',to=params.get('dateTo')||'now';
  const valid=s=>/^-?\d{1,7}$/.test(s);if((from!=='old'&&!valid(from))||(to!=='now'&&!valid(to)))return;
  const older=from==='old'?null:Number(from),younger=to==='now'?now:Number(to);
  if(younger>now||older!==null&&(older>younger||older< -10000000)||younger< -10000000)return;
  // Preserve a precise shared interval without snapping it to a different period.
  const a=stops.findIndex(v=>v===younger),b=stops.findIndex(v=>v===older);
  recent.value=a>=0?a:stops.findIndex(v=>v!==null&&v<=younger);ancient.value=b>=0?b:last;
  if(a<0||b<0)exact={older,younger};unknown.checked=params.get('dateUnknown')==='1';paint();
 }
 window.LXTimeline={options,reset,write,restore,signature:()=>{const p=new URLSearchParams();write(p);return p.toString();}};paint();
})();
