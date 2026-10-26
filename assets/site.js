// NEXT GOLF プロトタイプ 共通の動き
(() => {
  // スマホのメニュー（入力欄がないので Esc でも閉じる）
  const btn = document.querySelector('.burger');
  const setMenu = open => {
    document.body.classList.toggle('menu-open', open);
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  if (btn) btn.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  document.querySelectorAll('.spmenu a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  addEventListener('resize', () => { if (innerWidth > 1080) setMenu(false); });

  // ヘッダーの下に暗いフッターが来たら、ヘッダーも暗くする（KV の鎬の暗い背景は CSS が --sh から計算する）
  const ft = document.querySelector('.ft'), hd = document.querySelector('.hd');
  if (ft && hd) {
    const dark = () => document.documentElement.classList.toggle('hd-dark', ft.getBoundingClientRect().top < hd.offsetHeight);
    addEventListener('scroll', dark, { passive: true });
    addEventListener('resize', dark);
    dark();
  }

  // トップ：KV の背景は画面に固定。KV を半分ほど抜けたところから、背景をブレンドで切り替える
  const root = document.documentElement;
  root.classList.add('js');
  const kvSec = document.querySelector('.kv3d');
  if (kvSec && document.querySelector('.kv-bg')) {
    let ticking = false;
    const blend = () => {
      ticking = false;
      const h = kvSec.offsetHeight;
      const p = Math.min(1, Math.max(0, (scrollY - h * 0.35) / (h * 0.5)));
      root.style.setProperty('--blend', (p * p * (3 - 2 * p)).toFixed(3));
      root.classList.toggle('kv-off', p >= 1);   // 消えきったら描かない
      // 「SCROLL」は、スクロールを始めたら画面の高さの 2 割ほどで消えていく
      const cue = Math.max(0, 1 - scrollY / (h * 0.2));
      root.style.setProperty('--cue', cue.toFixed(3));
      root.style.setProperty('--cue-vis', cue > 0 ? 'visible' : 'hidden');
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(blend); } }, { passive: true });
    addEventListener('resize', blend);
    blend();
  }

  // KV の「SCROLL」を押したら、製品一覧までなめらかにスクロールする
  const cue = document.querySelector('.kv-cue');
  if (cue) cue.addEventListener('click', e => {
    const to = document.querySelector(cue.getAttribute('href'));
    if (!to) return;
    e.preventDefault();
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    scrollTo({ top: to.getBoundingClientRect().top + scrollY - parseFloat(getComputedStyle(root).scrollPaddingTop || 0), behavior: reduce ? 'auto' : 'smooth' });
  });

  // セクションごとの固定背景：セクションの頭が画面の下 3/4 まで来たら切り替え始め、1/4 で切り替え終わる
  // （後ろのセクションの背景ほど上に重なっているので、不透明度を上げるだけで前の背景から移り変わる）
  const layers = [...document.querySelectorAll('.bgl[data-bg]')].map(l => [l, document.querySelector(`.sec[data-bg="${l.dataset.bg}"]`)]).filter(([, s]) => s);
  if (layers.length) {
    let tk = false;
    const swap = () => {
      tk = false;
      for (const [l, s] of layers) {
        const p = Math.min(1, Math.max(0, (innerHeight * 0.75 - s.getBoundingClientRect().top) / (innerHeight * 0.5)));
        l.style.opacity = (p * p * (3 - 2 * p)).toFixed(3);
      }
    };
    addEventListener('scroll', () => { if (!tk) { tk = true; requestAnimationFrame(swap); } }, { passive: true });
    addEventListener('resize', swap);
    swap();
  }

  // トップの各セクションのフェードイン：セクションの頭が画面の下から上がってきたら表示する。
  // 画面の下へ完全に出たら元に戻す（上へ戻ってもう一度スクロールしたときも、また浮かび上がる）
  const reveals = document.querySelectorAll('.reveal');
  // 中身は上から順に少しずつ遅らせて出す（見出し・カード・試打会やお知らせの行・地図・地域ボタン）
  // 試打会とお知らせの行は microCMS から読み込んだあとに入るので、cms.js が描き終えてからもう一度呼ぶ
  const tag = () => reveals.forEach(r => {
    r.querySelectorAll('.series-h, .cards > *, .ev, .nw, .empty, .jmap, .areas > a').forEach((el, i) => {
      el.classList.add('rv');
      el.style.setProperty('--i', Math.min(i, 10));
    });
  });
  window.NG = { tag };
  if (reveals.length) {
    tag();
    const check = () => reveals.forEach(r => {
      const top = r.getBoundingClientRect().top;
      // 表示し始める位置（画面の高さに対する割合）。KV のあとの製品一覧は、背景の切り替えが半分ほど進んでから
      if (top < innerHeight * (parseFloat(r.dataset.revealAt) || 0.7)) r.classList.add('in');
      else if (top > innerHeight) r.classList.remove('in');
    });
    addEventListener('scroll', check, { passive: true });
    addEventListener('resize', check);
    check();
  }

  // 取扱店の日本地図：地域ボタンと地図の地域を連動して光らせる
  document.querySelectorAll('.shopfind').forEach(box => {
    const light = (id, on) => box.querySelectorAll(`[data-area="${id}"]`).forEach(e => e.classList.toggle('hl', on));
    box.querySelectorAll('[data-area]').forEach(el => {
      el.addEventListener('pointerenter', () => light(el.dataset.area, true));
      el.addEventListener('pointerleave', () => light(el.dataset.area, false));
    });
  });

  // 3D ページの「SCROLL」表示は、スクロールを始めたら消す
  const hint = document.querySelector('.scroll-hint');
  if (hint) addEventListener('scroll', () => { hint.style.opacity = scrollY > 40 ? 0 : 1; }, { passive: true });

  // お問い合わせフォーム
  // 本番は Google フォームの formResponse に送る（FORM_URL と各項目の entry 番号はフォーム作成後に設定）
  const form = document.getElementById('contact-form');
  if (!form) return;
  const FORM_URL = '';   // 例：https://docs.google.com/forms/d/e/xxxxxxxx/formResponse
  // 日本語入力の変換を確定する Enter では送信しない
  form.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.isComposing || e.keyCode === 229)) e.preventDefault();
  });
  const check = () => {
    let ok = true;
    form.querySelectorAll('[data-required]').forEach(el => {
      const row = el.closest('.row, .agree');
      const bad = el.type === 'checkbox' ? !el.checked : !el.value.trim() || (el.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(el.value));
      row.classList.toggle('invalid', bad);
      if (bad) ok = false;
    });
    return ok;
  };
  form.addEventListener('input', e => { const row = e.target.closest('.invalid'); if (row) check(); });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!check()) { form.querySelector('.invalid')?.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    if (FORM_URL) {
      const body = new FormData();
      form.querySelectorAll('[data-entry]').forEach(el => body.append(el.dataset.entry, el.value));
      try { await fetch(FORM_URL, { method: 'POST', mode: 'no-cors', body }); } catch (err) { /* 送信結果は受け取れないため、そのまま完了表示 */ }
    }
    form.style.display = 'none';
    const t = document.getElementById('thanks');
    t.style.display = 'block';
    t.scrollIntoView({ block: 'center' });
  });
})();
