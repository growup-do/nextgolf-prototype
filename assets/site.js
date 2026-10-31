// NEXT GOLF プロトタイプ 共通の動き
(() => {
  // 新しいタブで開くリンク（target="_blank"）には、文字の後ろに印を付ける。microCMS の本文など、あとから描くリンクにも付ける
  // アイコンだけのリンク（SNS など。aria-label 付き）には付けない
  const EXT = '<svg class="ext" viewBox="0 0 16 16" width="12" height="12" role="img" aria-label="（新しいタブで開きます）"><path d="M9 2h5v5M14 2 7.5 8.5M12 9.5V14H2V4h4.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  const markExt = () => {
    for (const a of document.querySelectorAll('a[target="_blank"]:not([aria-label])')) {
      if (!a.querySelector('.ext') && a.textContent.trim()) a.insertAdjacentHTML('beforeend', EXT);
    }
  };
  markExt();
  new MutationObserver(markExt).observe(document.body, { childList: true, subtree: true });
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

  // 製品の写真：クリックで大きく表示（入力欄のない表示専用なので、×・背景・Esc で閉じる。← → で前後の写真へ）
  document.querySelectorAll('.gallery').forEach(g => {
    const imgs = [...g.querySelectorAll('img')];
    if (!imgs.length) return;
    const lb = document.createElement('div');
    lb.className = 'lb';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', '写真の拡大表示');
    lb.innerHTML = '<img alt=""><button class="x" type="button" aria-label="閉じる">×</button>'
      + (imgs.length > 1 ? '<button class="prev" type="button" aria-label="前の写真">‹</button><button class="next" type="button" aria-label="次の写真">›</button>' : '');
    document.body.appendChild(lb);
    const big = lb.querySelector('img');
    let cur = 0;
    const show = k => { cur = (k + imgs.length) % imgs.length; big.src = imgs[cur].currentSrc || imgs[cur].src; };
    const close = () => { lb.classList.remove('open'); document.documentElement.style.overflow = ''; };
    imgs.forEach((img, k) => img.addEventListener('click', () => {
      show(k);
      lb.classList.add('open');
      document.documentElement.style.overflow = 'hidden';
      lb.querySelector('.x').focus();
    }));
    lb.addEventListener('click', e => {
      if (e.target.closest('.prev')) show(cur - 1);
      else if (e.target.closest('.next')) show(cur + 1);
      else if (e.target !== big) close();
    });
    addEventListener('keydown', e => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(cur - 1);
      else if (e.key === 'ArrowRight') show(cur + 1);
    });
  });

  // ヘッダーの下に暗いフッターが来たら、ヘッダーも暗くする（KV の鎬の暗い背景は CSS が --sh から計算する）
  const ft = document.querySelector('.ft'), hd = document.querySelector('.hd');
  if (ft && hd) {
    const ln = document.querySelector('.lineup');   // トップの製品一覧（黒い地）の上でも暗くする
    const dark = () => {
      const h = hd.offsetHeight, r = ln && ln.getBoundingClientRect();
      document.documentElement.classList.toggle('hd-dark', ft.getBoundingClientRect().top < h || !!(r && r.top < h && r.bottom > h));
    };
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
  // 製品一覧（鎬は白・Rafale は黒の半々）も同じ。スマホでは 2 つが上下に並ぶので、黒い地の上端を Rafale の頭に合わせる（--lnrt）
  const layers = [...document.querySelectorAll('.bgl[data-bg]')].map(l => [l, document.querySelector(`[data-bg="${l.dataset.bg}"]:not(.bgl)`)]).filter(([, s]) => s);
  const lnR = document.querySelector('.lineup .s-rafale');
  if (layers.length) {
    let tk = false;
    const swap = () => {
      tk = false;
      for (const [l, s] of layers) {
        const p = Math.min(1, Math.max(0, (innerHeight * 0.75 - s.getBoundingClientRect().top) / (innerHeight * 0.5)));
        l.style.opacity = (p * p * (3 - 2 * p)).toFixed(3);
      }
      if (lnR) root.style.setProperty('--lnrt', Math.min(innerHeight, Math.max(0, lnR.getBoundingClientRect().top)).toFixed(1) + 'px');
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
    r.querySelectorAll('.series-h, .cards > *, .ev, .nw, .empty, .areas > a, .ln-logo, .ln-names li').forEach((el, i) => {
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

  // 日本地図の表示：散らばった 1px のパーティクルが集まって地図になり、集まりきるころに地図（SVG）が現れる
  // 点は地図の塗り（白）と県境の線（グレー）から拾う。画面の下へ完全に出たら元に戻す（もう一度スクロールすると、また集まる）
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) document.querySelectorAll('.jmap').forEach(box => {
    const svg = box.querySelector('svg'), cv = document.createElement('canvas'), g = cv.getContext('2d');
    if (!svg || !g) return;
    box.classList.add('pt');
    cv.className = 'jmap-pt';
    cv.setAttribute('aria-hidden', 'true');
    box.appendChild(cv);
    const green = document.querySelector('.bgl[data-bg="shop"]');   // 地図ができあがってから、背景に芝の緑をかける
    const MS = 2200, PAD = 0.25;   // PAD：散らばる範囲（地図の外へ、幅の 25% まで）。site.css の .jmap-pt と同じ
    const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    let P = null, t0 = null, raf = 0, played = false;
    // 点を作る：地図を小さな面に描いて、塗りと線のある画素から拾う
    function build() {
      const W = box.clientWidth, H = box.clientHeight, vb = svg.viewBox.baseVal, k = W / vb.width;
      const m = document.createElement('canvas'), c = m.getContext('2d', { willReadFrequently: true });
      m.width = Math.ceil(W); m.height = Math.ceil(H);
      const paths = [...svg.querySelectorAll('path')].map(p => new Path2D(p.getAttribute('d')));
      const pick = (draw, n) => {
        c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, m.width, m.height);
        c.setTransform(k, 0, 0, k, -vb.x * k, -vb.y * k);
        paths.forEach(draw);
        const d = c.getImageData(0, 0, m.width, m.height).data, out = [];
        for (let i = 0, tries = 0; i < n && tries < n * 40; tries++) {
          const x = Math.random() * m.width, y = Math.random() * m.height;
          if (d[((y | 0) * m.width + (x | 0)) * 4 + 3] > 128) { out.push(x, y); i++; }
        }
        return out;
      };
      c.fillStyle = '#000';
      const area = W * H, fill = pick(p => c.fill(p), Math.min(9000, area / 14)), line = (c.lineWidth = 1.2 / k, pick(p => c.stroke(p), Math.min(3500, area / 40)));
      const make = (xy, col) => {
        const n = xy.length / 2, a = new Float32Array(n * 5);
        for (let i = 0; i < n; i++) {
          const x = xy[i * 2], y = xy[i * 2 + 1], th = Math.random() * Math.PI * 2, r = (0.15 + Math.pow(Math.random(), 0.7) * 0.6) * W;
          a.set([x, y, x + Math.cos(th) * r, y + Math.sin(th) * r * 0.8, Math.random()], i * 5);
        }
        return { a, n, col };
      };
      return { W, H, sets: [make(fill, '#fff'), make(line, '#8a8a8a')] };
    }
    function frame(now) {
      if (t0 === null) t0 = now;
      const p = Math.min(1, (now - t0) / MS), dpr = devicePixelRatio || 1, ox = P.W * PAD, oy = P.H * PAD;
      cv.width = Math.round((P.W + ox * 2) * dpr); cv.height = Math.round((P.H + oy * 2) * dpr);
      g.setTransform(dpr, 0, 0, dpr, ox * dpr, oy * dpr);
      g.globalAlpha = Math.min(1, p * 5) * (1 - sstep(0.82, 1, p));
      const px = 1 / dpr * Math.max(1, Math.round(dpr));   // 1 CSS px
      for (const s of P.sets) {
        g.fillStyle = s.col;
        for (let i = 0; i < s.n; i++) {
          const o = i * 5, t = sstep(0, 1, (p - s.a[o + 4] * 0.35) / 0.6);
          g.fillRect(s.a[o + 2] + (s.a[o] - s.a[o + 2]) * t, s.a[o + 3] + (s.a[o + 1] - s.a[o + 3]) * t, px, px);
        }
      }
      box.style.setProperty('--jmo', sstep(0.62, 0.95, p).toFixed(3));
      if (p < 1) raf = requestAnimationFrame(frame);
      else { cv.width = cv.height = 0; raf = 0; if (green) green.classList.add('green'); }
    }
    const play = () => { played = true; P = build(); t0 = null; cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); };
    const reset = () => { played = false; cancelAnimationFrame(raf); raf = 0; cv.width = cv.height = 0; box.style.setProperty('--jmo', '0'); if (green) green.classList.remove('green'); };
    const check = () => {
      const r = box.getBoundingClientRect();
      if (!played && r.height && r.top < innerHeight * 0.8 && r.bottom > 0) play();
      else if (played && r.top > innerHeight) reset();
    };
    addEventListener('scroll', check, { passive: true });
    addEventListener('resize', check);
    check();
  });

  // 取扱店：上の地域ボタンがヘッダーの下に隠れたら、地域の帯をヘッダーの下に出す
  const anav = document.querySelector('.area-nav'), afind = document.querySelector('.shopfind');
  if (anav && afind) {
    const hd = document.querySelector('.hd');
    const toggle = () => anav.classList.toggle('show', afind.getBoundingClientRect().bottom < (hd ? hd.offsetHeight : 0));
    addEventListener('scroll', toggle, { passive: true });
    addEventListener('resize', toggle);
    toggle();
  }

  // 3D ページの「SCROLL」表示は、スクロールを始めたら消す
  const hint = document.querySelector('.scroll-hint');
  if (hint) addEventListener('scroll', () => { hint.style.opacity = scrollY > 40 ? 0 : 1; }, { passive: true });

  // お問い合わせフォーム
  // Google フォーム（growup.do@gmail.com の「NEXT GOLF お問い合わせ」）の formResponse に送る。各項目の entry 番号は build_site.py の data-entry
  // 送信後は、フォームの Apps Script が info@nextgolf.jp への通知と、問い合わせた人への自動返信を送る
  const form = document.getElementById('contact-form');
  if (!form) return;
  const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScciwizyzA4CFS7TXi_E9n6oTZivnCLn_KxQmh45u_AZ7Zd6Q/formResponse';
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
