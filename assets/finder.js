// 製品一覧：13 本のシャフトを 3D で並べ、要望（使うクラブ → 求めること・ヘッドスピード・重さ）を選ぶと、合うシャフトが前に出て提案される
// シャフトの形とテクスチャは KV・トップの製品一覧と同じ（kv-data.js：鎬BLUE・RS1.0、lineup-data.js：ほかの 11 本）
// 製品の名前・スペックは window.FINDER_DATA、要望と製品の対応は window.FINDER_MATCH（どちらも build_site.py が書き出す）
(() => {
  const root = document.getElementById('finder');
  const P = window.FINDER_DATA;
  if (!root || !P) return;

  // ---------- 要望と製品の対応 ----------
  // ドライバーとフェアウェイウッドで、選べる項目が違う。対応表はメーカーの資料から（build_site.py の MATCH → window.FINDER_MATCH）
  // M[クラブ][項目] = [[値, 表示名, [合う製品の slug…]], …]。項目は need（求めること・いくつでも）・hs（ヘッドスピード）・wt（重さ）
  const M = window.FINDER_MATCH || {};
  const LBL = { need: '求めること', hs: 'ヘッドスピード', wt: '重さ' };

  // ---------- 選んだ要望 → 提案 ----------
  // 選んだ項目のうち、当てはまる数が多い順に上位 3 本を提案する。
  // 旧モデル（legacy：鎬White-50・Athlete S-60）は、当てはまる数にかかわらず今のモデルの後ろに回す
  const sel = { club: null, need: new Set(), hs: null, wt: null };
  const picks = () => [...[...sel.need].map(v => ['need', v]), ...['hs', 'wt'].filter(q => sel[q]).map(q => [q, sel[q]])];
  function rank() {
    if (!sel.club || !M[sel.club]) return null;
    const m = M[sel.club], ps = picks();
    const list = P.filter(p => p.fw === (sel.club === 'fw')).map(p => {
      const why = [];
      for (const [q, v] of ps) { const it = m[q].find(x => x[0] === v); if (it && it[2].includes(p.slug)) why.push([LBL[q], it[1]]); }
      return { p, score: why.length, why };
    }).sort((a, b) => (a.p.legacy - b.p.legacy) || (b.score - a.score));
    const top = ps.length ? list.filter(r => r.score > 0).slice(0, 3) : [];
    return { list, top, pool: new Set(list.map(r => r.p.slug)), n: ps.length };
  }

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const resultEl = root.querySelector('.fd-result'), resetBtn = root.querySelector('.fd-reset');
  let state = null;   // rank() の結果
  const specLine = p => [p.wmin != null ? (p.wmin === p.wmax ? `${p.wmin}g` : `${p.wmin}–${p.wmax}g`) : '', p.flex.length ? p.flex.join(' / ') : '', p.kick].filter(Boolean).join('　');
  function drawResult() {
    state = rank();
    resetBtn.hidden = !state;
    if (!state) { resultEl.innerHTML = ''; return; }
    if (!state.top.length) {
      resultEl.innerHTML = state.n
        ? '<div class="fd-empty">この組み合わせにぴったりのシャフトは見つかりませんでした。条件を減らしてみてください。</div>'
        : `<div class="fd-empty">${sel.club === 'fw' ? 'フェアウェイウッド用' : 'ドライバー用'}のシャフトは ${state.list.length} 本です。求めることを選ぶと、合うシャフトを提案します。</div>`;
      return;
    }
    resultEl.innerHTML = '<div class="e">RECOMMEND</div><h3 class="fd-rh">あなたへの提案</h3><div class="fd-cards">' + state.top.map((r, i) =>
      `<a class="fd-card s-${r.p.series}" href="${r.p.url}"><div class="fd-rank">${i === 0 ? 'BEST MATCH' : `No.${i + 1}`}</div>` +
      `<h4>${esc(r.p.name)}</h4><div class="fd-spec">${esc(specLine(r.p))}</div>` +
      (r.p.catch ? `<p class="fd-cc">${esc(r.p.catch)}</p>` : '') +
      `<ul>${r.why.map(([k, t]) => `<li><b>${esc(k)}</b>${esc(t)}</li>`).join('')}</ul>` +
      `<div class="fd-acts"><span class="more">製品ページ</span></div></a>`).join('') + '</div>';
  }
  const press = q => root.querySelectorAll(`[data-q="${q}"]`).forEach(c => c.setAttribute('aria-pressed', q === 'need' ? sel.need.has(c.dataset.v) : sel[q] === c.dataset.v));
  function setClub(v) {   // クラブを変えたら、ほかの選択は消して、そのクラブの項目を出す
    sel.club = v; sel.need.clear(); sel.hs = sel.wt = null;
    ['club', 'need', 'hs', 'wt'].forEach(press);
    root.querySelectorAll('.fd-more').forEach(g => { g.hidden = g.dataset.club !== v; });
  }
  root.querySelectorAll('.chip, .seg-b').forEach(b => b.addEventListener('click', () => {
    const q = b.dataset.q, v = b.dataset.v;
    if (q === 'club') { if (sel.club === v) return; setClub(v); }   // セグメンテッドコントロール：選んでいる側を押しても外さない（外すのは「選び直す」）
    else {
      if (q === 'need') sel.need.has(v) ? sel.need.delete(v) : sel.need.add(v);
      else sel[q] = sel[q] === v ? null : v;
      press(q);
    }
    drawResult();
    pick(null);
  }));
  resetBtn.addEventListener('click', () => { setClub(null); drawResult(); pick(null); });

  // ---------- 詳しく見る（シャフトを押したとき） ----------
  const panel = root.querySelector('.fd-panel');
  let picked = null;
  function pick(slug) {
    picked = slug;
    root.classList.toggle('picking', !!slug);
    if (!slug) { panel.hidden = true; panel.innerHTML = ''; return; }
    const p = P.find(x => x.slug === slug), r = state && state.list.find(x => x.p.slug === slug);
    const rows = [['重量', p.wmin != null ? (p.wmin === p.wmax ? `${p.wmin}g` : `${p.wmin}〜${p.wmax}g`) : ''], [p.series === 'rafale' && p.slug === 'rafale-rs1' ? 'モデル' : 'フレックス', p.flex.join(' / ')],
      ['トルク', p.torque.length ? p.torque.join(' / ') + '度' : ''], ['キックポイント', p.kick], ['価格', p.price ? `${p.price}円（税込）` : '']].filter(([, v]) => v);
    const why = r && r.why.length ? `<ul class="fd-why">${r.why.map(([k, t]) => `<li><b>${esc(k)}</b>${esc(t)}</li>`).join('')}</ul>` : '';
    panel.innerHTML = `<button type="button" class="fd-x" aria-label="閉じる"></button><div class="fd-ser">${p.series === 'rafale' ? 'RAFALE' : 'SHINOGI'}</div><h3>${esc(p.name)}</h3>` +
      (p.catch ? `<p class="fd-catch">${esc(p.catch)}</p>` : '') + why +
      `<dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl><a class="more" href="${p.url}">製品ページを見る</a>`;
    panel.hidden = false;
    panel.querySelector('.fd-x').addEventListener('click', () => pick(null));
  }
  addEventListener('keydown', e => { if (e.key === 'Escape' && picked) pick(null); });   // 入力欄のない表示だけの欄なので Esc でも閉じる

  drawResult();

  // ---------- 3D ----------
  const THREE = window.THREE, D = window.KV_DATA, LD = window.LINEUP_DATA;
  const stage = root.querySelector('.fd-stage'), canvas = root.querySelector('.fd-canvas'), labels = root.querySelector('.fd-labels');
  if (!THREE || !D || !LD) { root.classList.add('no3d'); return; }
  const { setup, lit, build, manager, TAN } = window.Shaft3D();
  let renderer;
  try { renderer = setup(canvas); } catch (e) { root.classList.add('no3d'); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  const scene = lit(renderer);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);

  const S = {};
  let hover = null;
  P.forEach((p, i) => {
    const s = build(p.slug, scene);
    if (!s) return;
    s.p = p; s.i = i; s.phase = i * 0.9;
    s.cur = { x: 0, y: -14, z: 0, op: 0, tilt: 0 };   // 下から立ち上がって現れる
    // 名前は画面に出さない（シャフトを押すと概要が出る）。キーボードで選べるように、見えないボタンだけ置く
    const lb = document.createElement('button');
    lb.type = 'button'; lb.className = 'fd-lb'; lb.textContent = p.name;
    lb.addEventListener('click', () => pick(picked === p.slug ? null : p.slug));
    lb.addEventListener('focus', () => { hover = s; });
    lb.addEventListener('blur', () => { if (hover === s) hover = null; });
    labels.append(lb);
    s.lb = lb;
    S[p.slug] = s;
  });
  const all = Object.values(S);

  // ---------- 並べ方 ----------
  // トップの製品一覧と同じく、シャフトを画面の高さより大きく立て、柄のある中ほどを見せる（手元と先端は画面の外）。
  // 左の要望の欄の右から画面の右端までに、鎬 9 本・Rafale 4 本をシリーズの間を少しあけて並べ、両端ほど少し奥へ下げて弧にする。
  // マウスを乗せたシャフトは手前に出て大きくなる。提案があると上位 3 本が手前の中央に出て、ほかは奥へ下がって薄くなる。
  // シャフトを押すと、そのシャフトが手前に出て軸まわりに回り、ほかはさらに下がる（概要は右の欄）
  let W = 1, H = 1, aspect = 1, dist = 14, narrow = false, areaL = 0, areaR = 1;
  const SERIES_GAP = 0.9;   // 鎬と Rafale のあいだ（シャフト何本ぶんか）
  const CY = -0.5;          // 画面の中心に来る高さ。シャフトの中心より少し先端寄り（柄の中ほど）
  const wx = (px, z) => (px / W - 0.5) * 2 * TAN * aspect * (dist - z);   // 画面の横の位置（px）→ 奥行き z での x
  function resize() {
    W = stage.clientWidth; H = stage.clientHeight;
    renderer.setSize(W, H, false);
    aspect = W / H; narrow = matchMedia("(max-width: 1100px)").matches;   // site.css で要望の欄と舞台を縦に積む幅
    camera.aspect = aspect; camera.updateProjectionMatrix();
    dist = (narrow ? 6.6 : 7.4) / (2 * TAN);   // 画面の高さに入るのは 7.4（シャフトは 11.2）
    camera.position.set(0, CY, dist); camera.lookAt(0, CY, 0);
    const pt = document.querySelector('.fd-top .ptitle');   // 見出しの高さ（要望の欄を、見出しの下の残りの高さの中ほどに置くため）
    if (pt) root.style.setProperty('--pth', pt.offsetHeight + 'px');
    const sr = stage.getBoundingClientRect(), q = root.querySelector('.fd-q').getBoundingClientRect();
    const side = Math.max(24, (W - 1200) / 2);
    areaL = narrow ? 28 : q.right - sr.left + 140;   // 要望の欄から離して右へ寄せる
    areaR = W - (narrow ? 28 : Math.max(24, side * 0.4));
  }
  function target(s) {
    const n = all.length, u = (s.i + (s.p.series === 'rafale' ? SERIES_GAP : 0)) / (n - 1 + SERIES_GAP), arc = 2 * u - 1;
    let px = areaL + u * (areaR - areaL), z = -1.6 * arc * arc, op = 1, tilt = 0, hide = false;
    const mid = (areaL + areaR) / 2, spread = narrow ? W * 0.24 : Math.min(220, (areaR - areaL) / 4.5);
    if (state && state.top.length) {
      const r = state.top.findIndex(x => x.p.slug === s.p.slug);
      if (r >= 0) { px = mid + [0, -1, 1][r] * spread; z = 2.5; }
      else hide = true;   // 要望で選んでいるあいだ、ほかのシャフトはその場でパーティクルになって消える
    } else if (state && !state.pool.has(s.p.slug)) hide = true;
    if (hide) op = 0;
    if (picked) {
      const panelW = narrow ? 0 : Math.min(W * 0.46, 460);
      if (s.p.slug === picked) { px = narrow ? W / 2 : (areaL + W - panelW) / 2; z = 4.5; op = 1; tilt = 0.18; }
      else { z = -10; op = Math.min(op, 0.08); }
    } else if (hover === s && !hide) { z += narrow ? 5 : 8; op = 1; }   // 手前に出して、柄が分かる大きさに
    else if (hover) op *= 0.35;
    return { x: wx(px, z), y: 0, z, op, tilt, hide };
  }

  // ---------- 押す・なぞる ----------
  const pv = new THREE.Vector3();
  const ends = s => {   // 画面の上での、シャフトの上端と下端（px）
    const out = [];
    for (const sy of [s.half, -s.half]) {
      pv.set(s.cur.x, s.cur.y + sy, s.cur.z).project(camera);
      out.push([(pv.x + 1) / 2 * W, (1 - pv.y) / 2 * H]);
    }
    return out;
  };
  function nearest(e) {
    const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    let best = null, bd = 22;
    for (const s of all) {
      if (s.cur.op < 0.2) continue;
      const [[x0, y0], [x1, y1]] = ends(s);
      if (my < y0 - 10 || my > y1 + 10) continue;
      const x = x0 + (x1 - x0) * ((my - y0) / Math.max(1, y1 - y0)), d = Math.abs(mx - x) - s.cur.z * 2;   // 手前のものを優先
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }
  canvas.addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; hover = nearest(e); canvas.style.cursor = hover ? 'pointer' : ''; });
  canvas.addEventListener('pointerleave', () => { hover = null; canvas.style.cursor = ''; });
  canvas.addEventListener('click', e => { const s = nearest(e); hover = null; pick(s ? (picked === s.p.slug ? null : s.p.slug) : null); });

  // ---------- パーティクル ----------
  // 消えるときはシャフトがその場で粒になって散り、戻るときは粒が集まってシャフトになる。粒の色はシャフトのテクスチャから拾う
  const PN = 700;
  const dot = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(c);
  })();
  const WHITE = new THREE.Color(1, 1, 1);
  function palette(s) {
    if (s.pal) return s.pal;
    const out = [];
    for (const m of s.mats) {
      const img = m.map && m.map.image;
      if (!img || !img.width) { if (m.color) out.push(m.color.clone()); continue; }
      const cv = document.createElement('canvas'); cv.width = cv.height = 16;
      const g = cv.getContext('2d'); g.drawImage(img, 0, 0, 16, 16);
      const d = g.getImageData(0, 0, 16, 16).data;
      for (let i = 0; i < d.length; i += 28) out.push(new THREE.Color().setRGB(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255, THREE.SRGBColorSpace));
    }
    return s.pal = out.length ? out : [WHITE];
  }
  const bursts = [];
  function burst(s, at, out) {
    const pal = palette(s), pos = new Float32Array(PN * 3), col = new Float32Array(PN * 3), a = new Float32Array(PN * 3), b = new Float32Array(PN * 3), d = new Float32Array(PN);
    for (let i = 0; i < PN; i++) {
      const y = (Math.random() * 2 - 1) * s.half, ang = Math.random() * Math.PI * 2, rr = 0.05 * Math.random();
      const L = [at.x + Math.cos(ang) * rr, at.y + y, at.z + Math.sin(ang) * rr];
      const S2 = [L[0] + Math.cos(ang) * (0.4 + Math.random() * 1.2) + (Math.random() - 0.5) * 0.8, L[1] + (Math.random() - 0.3) * 1.4, L[2] + Math.sin(ang) * (0.4 + Math.random() * 1.2)];
      const [f, t] = out ? [L, S2] : [S2, L];
      a.set(f, i * 3); b.set(t, i * 3); pos.set(f, i * 3);
      const c = pal[(Math.random() * pal.length) | 0].clone().lerp(WHITE, 0.45);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      d[i] = Math.random() * 0.35;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: 0.065, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);
    bursts.push({ pts, a, b, d, t: 0, dur: out ? 1.4 : 0.9, out });
  }
  const easeOut = x => 1 - Math.pow(1 - x, 3), easeInOut = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  function stepBursts(dt) {
    for (let j = bursts.length - 1; j >= 0; j--) {
      const B = bursts[j]; B.t += dt;
      if (B.t >= B.dur) { scene.remove(B.pts); B.pts.geometry.dispose(); B.pts.material.dispose(); bursts.splice(j, 1); continue; }
      const pos = B.pts.geometry.attributes.position, span = B.dur - 0.35;
      for (let i = 0; i < PN; i++) {
        const x = Math.min(1, Math.max(0, (B.t - B.d[i]) / span)), e = B.out ? easeOut(x) : easeInOut(x);
        for (let k = 0; k < 3; k++) pos.array[i * 3 + k] = B.a[i * 3 + k] + (B.b[i * 3 + k] - B.a[i * 3 + k]) * e;
      }
      pos.needsUpdate = true;
      const r = B.t / B.dur;
      B.pts.material.opacity = B.out ? Math.min(1, r * 12) * (1 - r) * (1 - r) : Math.sin(Math.PI * r);
    }
  }

  // ---------- 描く ----------
  const clock = new THREE.Clock();
  let t0 = null, visible = false, raf = 0;
  const ease = (a, b, k) => a + (b - a) * k;
  function frame(now) {
    raf = 0;
    if (!visible) return;
    if (t0 === null) t0 = now;
    const dt = Math.min(clock.getDelta(), 0.05), el = (now - t0) / 1000, k = 1 - Math.pow(0.002, dt);
    for (const s of all) {
      const t = target(s), c = s.cur;
      const kk = el - 0.25 - s.i * 0.06 > 0 ? k : 0;   // 1 本ずつ、少し遅れて立ち上がる
      if (kk && t.hide !== !!s.hidden) {   // 消える・戻るのが決まったら、粒を出す
        s.hidden = t.hide;
        burst(s, t.hide ? c : t, t.hide);
        if (!t.hide) s.showAt = el + 0.55;   // 粒が集まってから、シャフトを戻す
      }
      if (s.hidden || el < (s.showAt || 0)) t.op = 0;
      c.x = ease(c.x, t.x, kk); c.y = ease(c.y, t.y, kk); c.z = ease(c.z, t.z, kk); c.tilt = ease(c.tilt, t.tilt, kk);
      c.op = ease(c.op, t.op, s.hidden ? 1 - Math.pow(1e-5, dt) : kk);   // 消えるときは粒と入れ替わるように素早く
      s.g.position.set(c.x, c.y, c.z);
      s.g.rotation.set(c.tilt * 0.4, 0, -Math.PI / 2 + c.tilt * 0.25);
      s.spin.rotation.x = s.phase + el * (picked === s.p.slug ? 0.9 : 0.25);
      for (const m of s.mats) { m.opacity = c.op; m.depthWrite = c.op > 0.95; }
      s.g.visible = c.op > 0.02;
      s.lb.tabIndex = c.op > 0.2 ? 0 : -1;
    }
    stepBursts(dt);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !raf) { clock.getDelta(); raf = requestAnimationFrame(frame); } }).observe(stage);
  addEventListener('resize', resize);
  resize();
  root.classList.add('ready');

})();
