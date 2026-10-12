(() => {
  'use strict';

  const byId = (id) => document.getElementById(id);
  const welcome = byId('welcome');
  const languageSelect = byId('lang');
  const guestButton = byId('guest');
  const accountButton = byId('account');
  const GUEST_SESSION_KEY = 'lx-guest';

  const translations = {
    ar: [
      'عالم من المعرفة، يجمع التاريخ والعلم والوثائق',
      'منصة بحثية متعددة الموسوعات، تجمع بيانات الرفات البشرية القديمة والمخطوطات والوثائق التاريخية ضمن هوية واحدة، مع المحافظة على المصادر ودقة التوثيق.',
      'منصات LXHAZZAA',
      'اختر المنصة التي تريد استكشافها'
    ],
    en: [
      'A world of knowledge, history and research',
      'A research portal for ancient human remains, manuscripts and historical documents, preserving source attribution and scientific accuracy.',
      'LXHAZZAA Platforms',
      'Choose a research platform'
    ]
  };

  const translatedElementIds = ['heroTitle', 'heroDesc', 'platforms', 'sub'];

  function closeWelcome() {
    welcome.hidden = true;
    welcome.style.display = 'none';
    sessionStorage.setItem(GUEST_SESSION_KEY, '1');
  }

  function openWelcome() {
    welcome.hidden = false;
    welcome.style.display = 'grid';
  }

  function updateLanguage() {
    let selectedLanguage = languageSelect.value;

    if (!translations[selectedLanguage]) {
      alert('هذه اللغة قيد التطوير. الواجهة متاحة حاليًا بالعربية والإنجليزية.');
      selectedLanguage = 'ar';
      languageSelect.value = selectedLanguage;
    }

    translations[selectedLanguage].forEach((translation, index) => {
      byId(translatedElementIds[index]).textContent = translation;
    });

    document.documentElement.lang = selectedLanguage;
    document.documentElement.dir = selectedLanguage === 'en' ? 'ltr' : 'rtl';
  }

  guestButton.addEventListener('click', closeWelcome);
  const loginButton=byId('welcomeLogin');if(loginButton)loginButton.addEventListener('click',()=>{closeWelcome();window.LXAuth?.open('login');});
  accountButton.addEventListener('click',()=>{if(!window.LXAuth)openWelcome();});
  languageSelect.addEventListener('change', updateLanguage);

  if (sessionStorage.getItem(GUEST_SESSION_KEY)) {
    closeWelcome();
  }
})();
