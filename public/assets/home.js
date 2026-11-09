(() => {
  'use strict';

  const byId = (id) => document.getElementById(id);
  const languageSelect = byId('lang');

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

  languageSelect.addEventListener('change', updateLanguage);
})();
