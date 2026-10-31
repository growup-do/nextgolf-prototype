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
      else { cv.width = cv.height = 0; raf = 0; }
    }
    const play = () => { played = true; P = build(); t0 = null; cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); };
    const reset = () => { played = false; cancelAnimationFrame(raf); raf = 0; cv.width = cv.height = 0; box.style.setProperty('--jmo', '0'); };
    const check = () => {
      const r = box.getBoundingClientRect();
      if (!played && r.height && r.top < innerHeight * 0.8 && r.bottom > 0) play();
      else if (played && r.top > innerHeight) reset();
    };
    addEventListener('scroll', check, { passive: true });
    addEventListener('resize', check);
    check();
  });

  // フッター：上端をフェアウェイに見立て、左からティーショットのボールが飛んできて弾み、転がって画面の右端から消える。
  // ボールが消えて 1 秒したら、ゴルファーがカートに乗って左から追いかけ、同じく右端から消える。カートが消えて 3 秒したら、また次の 1 球（フッターが見えているあいだ繰り返す）。
  // ボールの動きは最初に物理で計算しておき（放物線→弾む→転がる）、まだ転がっている途中（転がる距離の 80%）で右端を越えるよう横方向だけ伸び縮みさせて再生する
  if (ft) {
    const ball = document.createElement('div'), shadow = document.createElement('div'), cart = document.createElement('div');
    ball.className = 'ft-ball'; shadow.className = 'ft-shadow'; cart.className = 'ft-cart';
    cart.innerHTML = '<svg viewBox="0 0 80 54" aria-hidden="true"><g fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="9" y="5" width="58" height="3.5" rx="1.5" stroke="none"/><path d="M14 8.5V36M61 8.5L66 34" stroke-width="2" fill="none"/>' +
      '<path d="M4.5 13.5l1.2 1.5M7 10.5l.5 2.5M10 11l-.6 2.4" stroke-width="1.4" fill="none"/><path d="M5 15h8l-.5 22H6z" stroke="none"/>' +
      '<path d="M38 13.2a5 5 0 1 1 6.8 3.9l-.8 1.4h-5.6z" stroke="none"/><path d="M38.3 12.6h10.4" stroke-width="1.6"/>' +
      '<path d="M37 20.5c3.5-1.2 5.5-.4 6 3l1 10h-8.5c-1.5-4.5-.8-10 1.5-13z" stroke="none"/><path d="M42.5 23.5l6.5 4 5-2.5" stroke-width="2.4" fill="none"/>' +
      '<path d="M42 33.5h8l1.5 7" stroke-width="3" fill="none"/><path d="M51 23.5l3.5 1.5M53 24.5l5 12" stroke-width="1.6" fill="none"/>' +
      '<path d="M30 22h4l1 15h-5z" stroke="none"/><path d="M3 36.5h55c7 0 13 1 18 3.5l1.5 4.5H3.5z" stroke="none"/></g>' +
      '<g class="w"><circle cx="18" cy="46" r="7" fill="currentColor"/><circle cx="18" cy="46" r="3" fill="#7a7a7a"/><path d="M18 43v6" stroke="currentColor" stroke-width="1.2"/></g>' +
      '<g class="w"><circle cx="62" cy="46" r="7" fill="currentColor"/><circle cx="62" cy="46" r="3" fill="#7a7a7a"/><path d="M62 43v6" stroke="currentColor" stroke-width="1.2"/></g></svg>';
    ft.append(shadow, ball, cart);
    const wheels = [...cart.querySelectorAll('.w')];
    const path = [];   // [t, x, y]（y は上端からの高さ。上が正）
    { let x = 0, y = 230, vx = 760, vy = 60, t = 0; const G = 980, DT = 1 / 240;
      while (t < 12) {
        path.push([t, x, y]);
        vy -= G * DT; x += vx * DT; y += vy * DT; vx *= 1 - 0.12 * DT;   // 空気の抵抗を少し
        if (y <= 0) { y = 0; if (vy < -60) { vy = -vy * 0.32; vx *= 0.78; } else { vy = 0; vx = Math.max(0, vx - 60 * DT); } }   // 弾む／転がる
        if (y === 0 && vy === 0 && vx < 1) { path.push([t + DT, x, 0]); break; }
        t += DT;
      }
    }
    const END = path[path.length - 1], R = 2, START = -40, OUT = 20, GAP = 3000;
    const CART_V = 300, CART_DELAY = 1;   // カート：px/秒、ボールが消えてからの出遅れ（秒）
    let raf = 0, t0 = null, played = false, timer = 0, gone = null;   // gone：ボールが右端から消えた時刻
    const place = (x, y, rot, op) => {
      ball.style.transform = `translate(${x}px, ${-y}px) rotate(${rot}deg)`; ball.style.opacity = op;
      shadow.style.transform = `translateX(${x}px) scale(${1 + y / 60})`; shadow.style.opacity = op * Math.max(0, 1 - y / 40);
    };
    const placeCart = (x, k, op) => {
      const bump = Math.sin(k * 23) * 0.6 + Math.sin(k * 37) * 0.4;   // 芝の上の小さな揺れ
      cart.style.transform = `translate(${x}px, ${bump.toFixed(2)}px)`; cart.style.opacity = op;
      const turn = `rotate(${(x / (cart.offsetWidth * 7 / 80) * 57.3).toFixed(1)}deg)`;   // 車輪の半径（絵の 7 / 80）
      for (const w of wheels) w.style.transform = turn;
    };
    const at = k => {   // k：経過秒 → 画面の座標
      const i = Math.min(path.length - 1, Math.round(k * 240)), [, px, py] = path[i];
      const sx = (ft.clientWidth + OUT - START) / (END[1] * 0.8);
      return [START + px * sx, py, px * sx / R * 57.3];
    };
    const shoot = () => { timer = 0; t0 = null; gone = null; cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); };
    const frame = now => {
      if (t0 === null) t0 = now;
      const k = (now - t0) / 1000, [x, y, r] = at(k), W = ft.clientWidth;
      const ballIn = gone === null && x < W + OUT && k < END[0];
      if (ballIn) place(x, y, r, 1); else { place(START, 0, 0, 0); if (gone === null) gone = k; }
      const cx = -cart.offsetWidth - 10 + (gone === null ? 0 : Math.max(0, k - gone - CART_DELAY) * CART_V), cartIn = cx < W + OUT;
      placeCart(cx, k, cartIn ? 1 : 0);
      if (ballIn || cartIn) raf = requestAnimationFrame(frame);
      else { raf = 0; timer = setTimeout(shoot, GAP); }   // カートも右端から消えたら、3 秒おいて次の 1 球
    };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; clearTimeout(timer); timer = 0; place(START, 0, 0, 0); cart.style.opacity = 0; };
    const check = () => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;   // 動きを減らす設定では出さない
      const r = ft.getBoundingClientRect();
      if (!played && r.top < innerHeight * 0.85) { played = true; shoot(); }
      else if (played && r.top > innerHeight) { played = false; stop(); }
    };
    addEventListener('scroll', check, { passive: true });
    addEventListener('resize', check);
    check();
  }

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
