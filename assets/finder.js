// 製品一覧：13 本のシャフトを 3D で並べ、要望（使うクラブ・求めること・ヘッドスピード）を選ぶと、合うシャフトが前に出て理由と一緒に提案される
// シャフトの形とテクスチャは KV・トップの製品一覧と同じ（kv-data.js：鎬BLUE・RS1.0、lineup-data.js：ほかの 11 本）
// 製品の名前・スペックは build_site.py が window.FINDER_DATA に書き出す。要望と製品の対応（点数と理由）はこのファイルの FIT
(() => {
  const root = document.getElementById('finder');
  const P = window.FINDER_DATA;
  if (!root || !P) return;

  // ---------- 要望と製品の対応 ----------
  // 点数（3：いちばん合う、2：合う、1：少し合う）と、提案するときに出す理由。旧サイトの製品説明とスペックから選んだ仮のもの（メーカーに確認して直す）
  const FIT = {
    'shinogi-blue': {
      lowspin: [3, '鎬シリーズの代名詞である低スピン性能。吹け上がらず、前へ強く進む弾道'],
      moi: [3, '高MOI（慣性モーメント）ヘッドに合わせて開発。振りづらさを抑え、ヘッドの性能を引き出す'],
      straight: [2, 'インパクトでのフェースの向きがそろいやすく、方向が安定する'],
      heavy: [1, 'X・TX（65〜68g）もあり、しっかり振りたい人にも'],
    },
    'shinogi-athlete-gx': {
      heavy: [3, '64〜69g の重めの設計。手元から先まで、しっかり振り切れる'],
      straight: [2, 'トルク 3.5 度と、ねじれにくい。叩いても先が暴れにくい'],
      easy: [1, 'プロではなくアマチュアのスイングを基準に設計した、振りやすいアスリートモデル'],
    },
    'shinogi-black-50': {
      short: [3, '短めのレングスでの性能に特化。短尺ドライバーで真価を発揮する'],
      straight: [3, '「叩きにいける」50g 台。強く振っても左へのミスを怖がらずに打てる'],
      lowspin: [1, '短く持っても、強い弾道を打ちやすい'],
    },
    'shinogi-sp-40': {
      light: [3, '48〜50g の軽さ。40g 台でも当たり負けしない'],
      lowspin: [3, '軽いのに、当たり負けしない低スピンの強い弾道'],
      design: [2, '3 つの版を 1/3 周ずつずらして刷った、ほかにない柄'],
      easy: [1, '軽さで振り抜けて、飛距離と方向性の両方を狙える'],
    },
    'shinogi-athlete-s-60': {
      heavy: [3, '60〜62g・トルク 4.2 度。しっかりした手応えで振れる'],
      straight: [1, 'アスリート向けの粘りで、叩いても安定しやすい'],
    },
    'shinogi-athlete-t-60': {
      heavy: [3, '60〜65g。SX・X も選べる、しっかり系のアスリートモデル'],
      straight: [2, 'ツアー向けの精密さ。狙った方向へ打ち出しやすい'],
      lowspin: [1, '先が走りすぎず、吹け上がりを抑えやすい'],
    },
    'shinogi-white-50': {
      easy: [3, '先端・中間・手元でしなり方を変えた設計。しなり戻りの速さでヘッドスピードが上がる。飛距離が落ちてきたと感じる人に'],
      light: [2, '52〜57g の軽さで、楽に振り抜ける'],
      design: [2, '白を基調にした、清潔感のあるデザイン'],
    },
    'shinogi-athlete-fw': {
      heavy: [3, '62〜69g・5 段階の硬さ。FW でもしっかり振り切れる'],
      straight: [2, 'トルク 4.0 度のアスリート設計で、FW でも方向が安定する'],
    },
    'shinogi-fw-60': {
      easy: [3, 'FW の苦手を克服するための、やさしさ重視の設計。ダフり・トップを減らし、キャリーを出しやすい'],
      light: [1, '57〜63g と、FW 用としては軽めで振りやすい'],
      design: [2, '灰から黒へ、墨が散るようなデザイン'],
    },
    'rafale-rs1': {
      easy: [3, '大きくしなる設計で、しなりを最大限に活かして飛ばす。スイングを変えずにスピードが出る'],
      light: [3, '46g・53g の軽さ。フレックスはひとつ（Multi）で、幅広いヘッドスピードに合う'],
      design: [3, '黒地に鮮やかな色が走る、飛距離特化ブランド Rafale のグラフィック'],
    },
    'rafale-ma1': {
      light: [3, '50〜54g の軽量モデル。軽いのに当たり負けしない強いインパクト'],
      easy: [2, '軽さとスピード感で、楽にヘッドスピードを上げられる'],
      design: [3, '黒地に黄緑の筆記体「Rafale」が映える、目を引くデザイン'],
    },
    'rafale-kt1': {
      straight: [3, '力を入れて振っても言うことを聞く走り系。強く振ってもタイミングがずれにくい'],
      easy: [1, 'ヘッドスピードとボールスピードの両方を上げる設計'],
      design: [2, '黒地に Rafale のロゴが走る、飛距離特化ブランドのデザイン'],
    },
    'rafale-kt-fw': {
      straight: [2, 'FW でミート率を上げ、スピードと正確さを両立'],
      easy: [2, 'アマチュアが FW で最大飛距離を出しやすい設計'],
      heavy: [2, '61〜66g。FW でもしっかり振れる'],
      design: [2, '黒地に Rafale のロゴが走る、飛距離特化ブランドのデザイン'],
    },
  };
  const NEED_LABEL = { easy: '楽に飛ばしたい', straight: '叩いても曲げたくない', lowspin: '強い弾道', light: '軽く振り抜きたい', heavy: '重めでしっかり', design: '人とは違うデザイン', moi: '高MOIヘッド', short: '短めのドライバー' };
  // ヘッドスピード：重さとフレックスから
  const hsFit = (p, hs) => {
    const hard = p.flex.some(f => /^(X|TX|SX|T-1)$/.test(f));
    if (hs === 'slow') return p.wmin <= 52 ? [2, `いちばん軽いもので ${p.wmin}g。ゆったりしたスイングでも振り切りやすい`] : p.wmin <= 57 ? [1, `${p.wmin}g からあり、無理なく振れる`] : [0];
    if (hs === 'fast') return p.wmax >= 64 || hard ? [2, `${hard ? 'X など硬めのフレックスもあり、' : ''}速いヘッドスピードでも当たり負けしない`] : [0];
    return p.wmin <= 62 && p.wmax >= 52 ? [1, '40〜45m/s に合う重さと硬さがそろう'] : [0];
  };

  // ---------- 選んだ要望 → 提案 ----------
  const sel = { club: null, need: new Set(), hs: null };
  function rank() {
    const any = sel.club || sel.need.size || sel.hs;
    if (!any) return null;
    const list = P.map(p => {
      if (sel.club && p.fw !== (sel.club === 'fw')) return null;
      let score = 0;
      const why = [];
      for (const n of sel.need) {
        const f = FIT[p.slug] && FIT[p.slug][n];
        if (f) { score += f[0]; why.push([NEED_LABEL[n], f[1]]); }
      }
      if (sel.hs) { const [v, t] = hsFit(p, sel.hs); if (v) { score += v * 0.6; why.push(['ヘッドスピード', t]); } }
      return { p, score, why };
    }).filter(Boolean).sort((a, b) => b.score - a.score);
    const hasNeed = sel.need.size || sel.hs;
    const top = hasNeed ? list.filter(r => r.score > 0).slice(0, 3) : [];
    return { list, top, pool: new Set(list.map(r => r.p.slug)) };
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
      resultEl.innerHTML = sel.need.size || sel.hs
        ? '<div class="fd-empty">この組み合わせにぴったりのシャフトは見つかりませんでした。条件を減らしてみてください。</div>'
        : `<div class="fd-empty">${sel.club === 'fw' ? 'フェアウェイウッド用' : 'ドライバー用'}のシャフトは ${state.list.length} 本です。求めることを選ぶと、さらに絞り込んで提案します。</div>`;
      return;
    }
    resultEl.innerHTML = '<div class="e">RECOMMEND</div><h3 class="fd-rh">あなたへの提案</h3><div class="fd-cards">' + state.top.map((r, i) =>
      `<article class="fd-card s-${r.p.series}"><div class="fd-rank">${i === 0 ? 'BEST MATCH' : `No.${i + 1}`}</div>` +
      `<h4>${esc(r.p.name)}</h4><div class="fd-spec">${esc(specLine(r.p))}</div>` +
      `<ul>${r.why.map(([k, t]) => `<li><b>${esc(k)}</b>${esc(t)}</li>`).join('')}</ul>` +
      `<div class="fd-acts"><button type="button" class="fd-look" data-slug="${r.p.slug}">3D で見る</button><a class="more" href="${r.p.url}">製品ページ</a></div></article>`).join('') + '</div>';
  }
  root.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => {
    const q = b.dataset.q, v = b.dataset.v;
    if (q === 'need') sel.need.has(v) ? sel.need.delete(v) : sel.need.add(v);
    else sel[q] = sel[q] === v ? null : v;
    root.querySelectorAll(`.chip[data-q="${q}"]`).forEach(c => c.setAttribute('aria-pressed', q === 'need' ? sel.need.has(c.dataset.v) : sel[q] === c.dataset.v));
    drawResult();
    pick(null);
  }));
  resetBtn.addEventListener('click', () => {
    sel.club = null; sel.need.clear(); sel.hs = null;
    root.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', 'false'));
    drawResult(); pick(null);
  });
  resultEl.addEventListener('click', e => { const b = e.target.closest('.fd-look'); if (b) { pick(b.dataset.slug); root.querySelector('.fd-stage').scrollIntoView({ behavior: 'smooth', block: 'center' }); } });

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
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (e) { root.classList.add('no3d'); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new window.RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  const TAN = Math.tan(THREE.MathUtils.degToRad(15));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 6, 10); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.2); rim.position.set(-4, 5, -6); scene.add(rim);   // 輪郭を少し立たせる、うしろからの光
  scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 0.6));
  const loader = new THREE.TextureLoader();
  const texture = src => { const t = loader.load(src); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const srgb = ([r, g, b]) => new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
  const paint = opts => new THREE.MeshPhysicalMaterial({ roughness: 0.42, metalness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1, transparent: true, ...opts });
  const U = 0.01;
  // シャフト（kv.js の makeShaft と同じ作り）
  function makeShaft(L, parts, nr = 48) {
    const LEN = L.length, X0 = L.x0;
    const knots = [[0, L.d_butt], [X0, L.d_wrap_l], [X0 + L.wrap_mm, L.d_wrap_r], [LEN, L.d_tip]];
    const radius = mm => { for (let i = 1; i < knots.length; i++) { const [xa, da] = knots[i - 1], [xb, db] = knots[i]; if (mm <= xb) return (da + (db - da) * (mm - xa) / (xb - xa)) / 2; } return L.d_tip / 2; };
    const tube = (mm0, mm1, nx) => {
      const pos = [], uv = [], idx = [];
      for (let i = 0; i <= nx; i++) { const mm = mm0 + (mm1 - mm0) * i / nx, r = radius(mm) * U;
        for (let j = 0; j <= nr; j++) { const phi = Math.PI / 2 - 2 * Math.PI * (0.5 - j / nr); pos.push(mm * U, r * Math.cos(phi), r * Math.sin(phi)); uv.push(i / nx, 1 - j / nr); } }
      for (let i = 0; i < nx; i++) for (let j = 0; j < nr; j++) { const a = i * (nr + 1) + j, b = a + nr + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      return g;
    };
    const shaft = new THREE.Group(), mats = [];
    for (const [a, b, nx, opts] of parts(X0, L)) { const m = paint(opts); mats.push(m); shaft.add(new THREE.Mesh(tube(a, b, nx), m)); }
    for (const [mm, dir] of [[0, -1], [LEN, 1]]) { const m = paint({ color: 0x1a1a1a }); mats.push(m); const c = new THREE.Mesh(new THREE.CircleGeometry(radius(mm) * U, 24), m); c.position.x = mm * U; c.rotation.y = dir * Math.PI / 2; shaft.add(c); }
    shaft.position.x = -LEN / 2 * U;
    const spin = new THREE.Group(); spin.add(shaft);
    const g = new THREE.Group(); g.add(spin); scene.add(g);
    g.rotation.z = -Math.PI / 2;   // 手元を上にして立てる
    return { g, spin, mats, half: LEN / 2 * U, r: radius(LEN * 0.3) * U };
  }
  const shinParts = (t, nx) => (X0, L) => {
    const B = L.b_mm, half = X0 + B / 2, M = L.metal ? { metalness: 0.62, roughness: 0.26 } : {};
    return [[0, X0, 20, { color: srgb(L.grey), ...M }], [X0, half, nx, { map: texture(t.B1), ...M }], [half, X0 + B, nx, { map: texture(t.B2), metalness: 0.2, ...M }], [X0 + B, L.length, nx * 0.75, { map: texture(t.C), metalness: 0.3, roughness: 0.38 }]];
  };
  const rafParts = (t, nx) => (X0, L) => {
    const third = L.b_mm / 3, q = { roughness: 0.32, metalness: 0.2 };
    return [[0, X0, 20, { color: srgb(L.body), ...q }], [X0, X0 + third, nx, { map: texture(t.R1), ...q }], [X0 + third, X0 + third * 2, nx, { map: texture(t.R2), ...q }], [X0 + third * 2, X0 + L.b_mm, nx, { map: texture(t.R3), ...q }], [X0 + L.b_mm, L.length, nx * 0.6, { color: srgb(L.body), ...q }]];
  };
  const S = {};
  P.forEach((p, i) => {
    const s = p.slug === 'shinogi-blue' ? makeShaft(D.layShinogi, shinParts(D.texShinogi, 120))
      : p.slug === 'rafale-rs1' ? makeShaft(D.layRafale, rafParts(D.texRafale, 120))
      : LD[p.slug] ? makeShaft(LD[p.slug].lay, LD[p.slug].kind === 'rafale' ? rafParts(LD[p.slug].tex, 80) : shinParts(LD[p.slug].tex, 80)) : null;
    if (!s) return;
    s.p = p; s.i = i; s.phase = i * 0.9;
    s.cur = { x: 0, y: -14, z: 0, op: 0, tilt: 0 };   // 下から立ち上がって現れる
    const lb = document.createElement('button');
    lb.type = 'button'; lb.className = `fd-lb s-${p.series}`; lb.innerHTML = `<i></i><b>${esc(p.short)}</b>`;
    lb.addEventListener('click', () => pick(picked === p.slug ? null : p.slug));
    labels.append(lb);
    s.lb = lb;
    S[p.slug] = s;
  });
  const all = Object.values(S);

  // ---------- 並べ方 ----------
  // ふだん：鎬 9 本・Rafale 4 本を、シリーズの間を少しあけて横一列に。提案があると、上位 3 本が前に出て中央に並び、ほかは奥へ下がって薄くなる。
  // シャフトを押すと、そのシャフトが前に出て軸まわりに回り、ほかはさらに下がる（詳しい内容は右の欄）
  let aspect = 1, dist = 25, narrow = false;
  const SP = 1.05, GAP = 0.9;
  const baseX = s => { const n = all.length, k = s.i + (s.p.series === 'rafale' ? 1 : 0); return (k - (n) / 2) * SP + (s.p.series === 'rafale' ? GAP - SP : 0); };
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    aspect = w / h; narrow = w < 760;
    camera.aspect = aspect; camera.updateProjectionMatrix();
    const width = all.length * SP + GAP + 1;
    dist = Math.max(15.6 / (2 * TAN), width / (2 * TAN * aspect));   // 上下に余白を残し、前に出したときにも切れないように
    camera.position.set(0, 0.3, dist); camera.lookAt(0, 0.3, 0);
  }
  function target(s) {
    const t = { x: baseX(s), y: 0, z: 0, op: 1, tilt: 0 };
    const front = Math.max(0, Math.min(3.5, dist - 25));   // 前に出しても、上下が切れない近さまで
    if (state && state.top.length) {
      const r = state.top.findIndex(x => x.p.slug === s.p.slug);
      if (r >= 0) { t.x = narrow ? [0, -1.6, 1.6][r] : [0, -2.6, 2.6][r]; t.z = front; }
      else { t.z = -9; t.op = state.pool.has(s.p.slug) ? 0.32 : 0.12; t.x *= 1.25; }
    } else if (state) { if (!state.pool.has(s.p.slug)) { t.z = -9; t.op = 0.12; t.x *= 1.25; } }
    if (picked) {
      if (s.p.slug === picked) { t.x = narrow ? 0 : -dist * TAN * aspect * 0.42; t.z = front; t.op = 1; t.tilt = 0.18; }
      else { t.z = -12; t.op = Math.min(t.op, 0.1); }
    }
    return t;
  }

  // ---------- 押す・なぞる ----------
  const pv = new THREE.Vector3();
  const ends = s => {   // 画面の上での、シャフトの上端と下端（px）と太さ
    const w = stage.clientWidth, h = stage.clientHeight, out = [];
    for (const sy of [s.half, -s.half]) {
      pv.set(s.cur.x, s.cur.y + sy, s.cur.z).project(camera);
      out.push([(pv.x + 1) / 2 * w, (1 - pv.y) / 2 * h]);
    }
    return out;
  };
  let hover = null;
  function nearest(e) {
    const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    let best = null, bd = 18;
    for (const s of all) {
      if (s.cur.op < 0.2) continue;
      const [[x0, y0], [x1, y1]] = ends(s);
      if (my < y0 - 10 || my > y1 + 10) continue;
      const x = x0 + (x1 - x0) * ((my - y0) / Math.max(1, y1 - y0)), d = Math.abs(mx - x) - s.cur.z * 0.8;   // 手前のものを優先
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }
  canvas.addEventListener('pointermove', e => { hover = nearest(e); canvas.style.cursor = hover ? 'pointer' : ''; });
  canvas.addEventListener('pointerleave', () => { hover = null; canvas.style.cursor = ''; });
  canvas.addEventListener('click', e => { const s = nearest(e); pick(s ? (picked === s.p.slug ? null : s.p.slug) : null); });

  // ---------- 描く ----------
  const clock = new THREE.Clock();
  let t0 = null, visible = false, raf = 0;
  const ease = (a, b, k) => a + (b - a) * k;
  function frame(now) {
    raf = 0;
    if (!visible) return;
    if (t0 === null) t0 = now;
    const dt = Math.min(clock.getDelta(), 0.05), el = (now - t0) / 1000, k = 1 - Math.pow(0.0015, dt);
    const w = stage.clientWidth, h = stage.clientHeight;
    for (const s of all) {
      const t = target(s), c = s.cur;
      const start = Math.max(0, el - 0.25 - s.i * 0.06);   // 1 本ずつ、少し遅れて立ち上がる
      const kk = start > 0 ? k : 0;
      const lift = hover === s && !picked ? 0.35 : 0;
      c.x = ease(c.x, t.x, kk); c.y = ease(c.y, t.y + lift, kk); c.z = ease(c.z, t.z, kk); c.op = ease(c.op, t.op, kk); c.tilt = ease(c.tilt, t.tilt, kk);
      s.g.position.set(c.x, c.y, c.z);
      s.g.rotation.set(c.tilt * 0.4, 0, -Math.PI / 2 + c.tilt * 0.25);
      s.spin.rotation.x = s.phase + el * (picked === s.p.slug ? 0.9 : 0.25);
      for (const m of s.mats) { m.opacity = c.op; m.depthWrite = c.op > 0.95; }
      s.g.visible = c.op > 0.02;
      // 名前：シャフトの下端の少し下
      const [, [bx, by]] = ends(s), on = state ? state.top.findIndex(x => x.p.slug === s.p.slug) : -1;
      const stagger = on < 0 && !picked && c.z < 1 && s.i % 2 ? 16 : 0;   // 横一列のときは、隣どうしの名前が重ならないよう 1 本おきに下げる
      s.lb.style.transform = `translate(${bx.toFixed(1)}px, ${(by + 10 + stagger).toFixed(1)}px)`;
      s.lb.style.opacity = Math.min(1, c.op * 1.2).toFixed(2);
      s.lb.classList.toggle('top', on >= 0);
      s.lb.querySelector('i').textContent = on < 0 ? '' : on === 0 ? 'BEST' : `No.${on + 1}`;
      s.lb.classList.toggle('on', hover === s || picked === s.p.slug);
      s.lb.tabIndex = c.op > 0.2 ? 0 : -1;
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !raf) { clock.getDelta(); raf = requestAnimationFrame(frame); } }).observe(stage);
  addEventListener('resize', resize);
  resize();
  root.classList.add('ready');
})();
