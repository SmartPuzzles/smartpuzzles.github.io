/* Shared appearance: dark on a first visit; explicit choices persist across every game. */
(() => {
  const key = 'smart-puzzles:theme';
  const labels = {
    en: {light:'Light',dark:'Dark',toLight:'Switch to light theme',toDark:'Switch to dark theme'},
    'zh-Hant': {light:'淺色',dark:'深色',toLight:'切換至淺色模式',toDark:'切換至深色模式'},
    'zh-Hans': {light:'浅色',dark:'深色',toLight:'切换至浅色模式',toDark:'切换至深色模式'},
    ja: {light:'ライト',dark:'ダーク',toLight:'ライトモードに切り替える',toDark:'ダークモードに切り替える'},
    ko: {light:'라이트',dark:'다크',toLight:'라이트 모드로 전환',toDark:'다크 모드로 전환'},
  };
  const root = document.documentElement;
  const valid = value => value === 'light' || value === 'dark';
  let current = 'dark';
  const read = () => {
    try { const saved = window.localStorage.getItem(key); return valid(saved) ? saved : 'dark'; }
    catch { return current; }
  };
  function apply(theme) {
    current = valid(theme) ? theme : 'dark';
    root.dataset.theme = current;
    root.style.colorScheme = current;
    const words = labels[root.lang] || labels.en;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', current === 'dark' ? '#080f1a' : '#f4f1e9');
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      const action = current === 'dark' ? words.toLight : words.toDark;
      button.setAttribute('aria-label', action);
      button.setAttribute('title', action);
      const text = button.querySelector('[data-theme-label]');
      if (text) text.textContent = current === 'dark' ? words.light : words.dark;
    });
  }
  // This classic script runs in <head> before either stylesheet: saved light never flashes dark.
  apply(read());
  const mount = () => {
    apply(current);
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      button.addEventListener('click', () => {
        const next = current === 'dark' ? 'light' : 'dark';
        try { window.localStorage.setItem(key, next); } catch { /* Appearance still works when storage is blocked. */ }
        apply(next);
      });
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once:true});
  else mount();
  window.addEventListener('storage', event => { if (event.key === key || event.key === null) apply(event.newValue); });
  window.addEventListener('pageshow', () => apply(read()));
})();
