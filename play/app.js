const root = document.getElementById('game-root');
const game = document.body.dataset.game;
const locale = document.body.dataset.locale || 'en';
const loaders = {
 sudoku: () => import('./modules/sudoku-game.js?v=20261105-reason').then(m => m.mountSudoku),
 binairo: () => import('./modules/numbers.js').then(m => m.mountBinairo),
 crownfall: () => import('./modules/regions.js').then(m => m.mountCrownfall),
 shikaku: () => import('./modules/regions.js').then(m => m.mountShikaku),
 zigline: () => import('./modules/paths.js').then(m => m.mountZigline),
 wordvine: () => import('./modules/paths.js').then(m => m.mountWordvine),
};
const failures = {
 en: 'The game could not load. Reload this page to try again.',
 'zh-Hant': '暫時載入唔到遊戲，請重新載入再試。',
 'zh-Hans': '暂时无法加载游戏，请重新加载再试。',
 ja: 'ゲームを読み込めませんでした。ページを再読み込みしてください。',
 ko: '게임을 불러오지 못했습니다. 페이지를 새로고침해 주세요.',
};
let instance;
async function start() {
 try {
  const mount = await loaders[game]?.();
  if (!mount || !root) throw new Error('Unknown game');
  instance = mount(root, {locale, onComplete() {
   const completed = document.getElementById('completion');
   if (completed) completed.hidden = false;
  }});
  if (instance?.ready) await instance.ready;
  root.dataset.ready = 'true';
 } catch {
  if (!root) return;
  root.replaceChildren();
  const message = document.createElement('p');
  message.className = 'game-message';
  message.textContent = failures[locale] || failures.en;
  const retry = document.createElement('button');
  retry.className = 'button'; retry.type = 'button';
  retry.textContent = ({'zh-Hant':'重新載入','zh-Hans':'重新加载',ja:'再読み込み',ko:'새로고침'})[locale] || 'Reload';
  retry.addEventListener('click', () => location.reload(), {once:true});
  root.append(message,retry);
 }
}
start();
window.addEventListener('pagehide', event => { if (!event.persisted) instance?.destroy?.(); });
