/* Contextual entry to the shared, on-site help centre. */
(()=>{'use strict';
 if(document.querySelector('[data-lx-help-entry]')||location.pathname.startsWith('/lxhelp/'))return;
 const path=location.pathname;
 const guide=path.startsWith('/lxhuman')?'atlas':path.startsWith('/lxdocumentary')?'documents':path.startsWith('/lxdnatree')?'tree':path.startsWith('/lxdnacontrole')?'control':'';
 const link=document.createElement('a');link.dataset.lxHelpEntry='';link.className='lx-help-entry';
 const update=()=>{const english=document.documentElement.lang==='en';link.href='/lxhelp/'+(guide?guide+'/':'')+(english?'en/':'');link.textContent=english?'? Help':'؟ مساعدة';link.setAttribute('aria-label',english?'Help for this platform':'مساعدة هذه المنصة');};
 update();document.addEventListener('lx-language-change',update);
 let nav=document.querySelector('header nav');
 if(!nav){const header=document.querySelector('header')||document.createElement('header');if(!header.isConnected){header.className='lx-help-topbar';document.body.prepend(header);}nav=document.createElement('nav');nav.setAttribute('aria-label','المساعدة');header.append(nav);}
 nav.append(link);
 const style=document.createElement('style');style.textContent='.lx-help-entry{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:8px 12px;border:1px solid currentColor;border-radius:9px;color:inherit;text-decoration:none;font-size:14px;white-space:nowrap;min-height:40px}.lx-help-entry:focus-visible{outline:3px solid #b79352;outline-offset:3px}.lx-help-topbar{padding:14px 24px;text-align:end}';document.head.append(style);
})();
