/* One appearance preference for every LXHAZZAA platform. */
(() => {
  const key = 'lxhazzaa-theme';
  let saved;
  try { saved = localStorage.getItem(key); } catch (_) { /* private browsing */ }
  const apply = value => {
    const theme = value === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.lxTheme = theme;
    document.documentElement.style.colorScheme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'light' ? '#f7f4ed' : '#0b1018';
    const button = document.querySelector('[data-lx-theme-toggle]');
    if (button) {
      const english = document.documentElement.lang === 'en';
      const next = theme === 'dark' ? (english ? 'Day mode' : 'الوضع النهاري') : (english ? 'Night mode' : 'الوضع المسائي');
      button.textContent = `${theme === 'dark' ? '☀' : '☾'} ${next}`;
      button.setAttribute('aria-label', next);
      button.setAttribute('aria-pressed', String(theme === 'light'));
      button.title = next;
    }
  };
  apply(saved);
  const mount = () => {
    const language = document.querySelector('[data-lx-language]');
    const slot = document.querySelector('[data-lx-theme-slot]');
    if ((!language && !slot) || document.querySelector('[data-lx-theme-toggle]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'lx-theme-toggle';
    button.dataset.lxThemeToggle = '';
    if (slot) slot.appendChild(button);
    else language.insertAdjacentElement('afterend', button);
    button.addEventListener('click', () => {
      const next = document.documentElement.dataset.lxTheme === 'light' ? 'dark' : 'light';
      try { localStorage.setItem(key, next); } catch (_) { /* private browsing */ }
      apply(next);
    });
    apply(document.documentElement.dataset.lxTheme);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
  document.addEventListener('lx-language-change', () => apply(document.documentElement.dataset.lxTheme));
})();
