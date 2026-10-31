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
  const cardCvs = [...document.querySelectorAll('.lu-3d')];
  if (!THREE || !D || !LD) { root.classList.add('no3d'); return; }
  const setup = cv => {
    const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.setClearColor(0x000000, 0);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.1;
    return r;
  };
  // 光はトップの製品一覧（黒い地）と同じ考え方：正面の光に、うしろからの光で輪郭を立たせ、黒いシャフトも地から浮かせる
  const lit = r => {
    const sc = new THREE.Scene();
    sc.environment = new THREE.PMREMGenerator(r).fromScene(new window.RoomEnvironment(), 0.04).texture;
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 6, 10); sc.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 2.4); rim.position.set(-4, 5, -6); sc.add(rim);
    const rim2 = new THREE.DirectionalLight(0xffffff, 1.4); rim2.position.set(5, -2, -5); sc.add(rim2);
    sc.add(new THREE.HemisphereLight(0xffffff, 0x9a9a9a, 0.7));
    return sc;
  };
  let renderer;
  try { renderer = setup(canvas); } catch (e) { root.classList.add('no3d'); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  const scene = lit(renderer);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  const TAN = Math.tan(THREE.MathUtils.degToRad(15));
  // テクスチャは、舞台とカードのシャフトで同じものを使う（読み込みが 1 回で済む）。全部読み込めたら、カードを描く
  const manager = new THREE.LoadingManager(), loader = new THREE.TextureLoader(manager), texCache = {};
  const texture = src => texCache[src] || (texCache[src] = (t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; })(loader.load(src)));
  const srgb = ([r, g, b]) => new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
  const paint = opts => new THREE.MeshPhysicalMaterial({ roughness: 0.42, metalness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1, transparent: true, ...opts });
  const U = 0.01;
  // シャフト（kv.js の makeShaft と同じ作り）
  function makeShaft(L, parts, sc, nr = 48) {
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
    const g = new THREE.Group(); g.add(spin); sc.add(g);
    g.rotation.z = -Math.PI / 2;   // 手元を上にして立てる
    return { g, spin, mats, half: LEN / 2 * U, len: LEN };
  }
  const shinParts = (t, nx) => (X0, L) => {
    const B = L.b_mm, half = X0 + B / 2, M = L.metal ? { metalness: 0.62, roughness: 0.26 } : {};
    return [[0, X0, 20, { color: srgb(L.grey), ...M }], [X0, half, nx, { map: texture(t.B1), ...M }], [half, X0 + B, nx, { map: texture(t.B2), metalness: 0.2, ...M }], [X0 + B, L.length, nx * 0.75, { map: texture(t.C), metalness: 0.3, roughness: 0.38 }]];
  };
  const rafParts = (t, nx) => (X0, L) => {
    const third = L.b_mm / 3, q = { roughness: 0.32, metalness: 0.2 };
    return [[0, X0, 20, { color: srgb(L.body), ...q }], [X0, X0 + third, nx, { map: texture(t.R1), ...q }], [X0 + third, X0 + third * 2, nx, { map: texture(t.R2), ...q }], [X0 + third * 2, X0 + L.b_mm, nx, { map: texture(t.R3), ...q }], [X0 + L.b_mm, L.length, nx * 0.6, { color: srgb(L.body), ...q }]];
  };
  const build = (slug, sc) => slug === 'shinogi-blue' ? makeShaft(D.layShinogi, shinParts(D.texShinogi, 120), sc)
    : slug === 'rafale-rs1' ? makeShaft(D.layRafale, rafParts(D.texRafale, 120), sc)
    : LD[slug] ? makeShaft(LD[slug].lay, LD[slug].kind === 'rafale' ? rafParts(LD[slug].tex, 80) : shinParts(LD[slug].tex, 80), sc) : null;

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
    let px = areaL + u * (areaR - areaL), z = -1.6 * arc * arc, op = 1, tilt = 0;
    const mid = (areaL + areaR) / 2, spread = narrow ? W * 0.24 : Math.min(220, (areaR - areaL) / 4.5);
    if (state && state.top.length) {
      const r = state.top.findIndex(x => x.p.slug === s.p.slug);
      if (r >= 0) { px = mid + [0, -1, 1][r] * spread; z = 2.5; }
      else { z = -7; op = state.pool.has(s.p.slug) ? 0.3 : 0.1; }
    } else if (state && !state.pool.has(s.p.slug)) { z = -7; op = 0.1; }
    if (picked) {
      const panelW = narrow ? 0 : Math.min(W * 0.46, 460);
      if (s.p.slug === picked) { px = narrow ? W / 2 : (areaL + W - panelW) / 2; z = 4.5; op = 1; tilt = 0.18; }
      else { z = -10; op = Math.min(op, 0.08); }
    } else if (hover === s) { z += narrow ? 5 : 8; op = 1; }   // 手前に出して、柄が分かる大きさに
    else if (hover) op *= 0.35;
    return { x: wx(px, z), y: 0, z, op, tilt };
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
      c.x = ease(c.x, t.x, kk); c.y = ease(c.y, t.y, kk); c.z = ease(c.z, t.z, kk); c.op = ease(c.op, t.op, kk); c.tilt = ease(c.tilt, t.tilt, kk);
      s.g.position.set(c.x, c.y, c.z);
      s.g.rotation.set(c.tilt * 0.4, 0, -Math.PI / 2 + c.tilt * 0.25);
      s.spin.rotation.x = s.phase + el * (picked === s.p.slug ? 0.9 : 0.25);
      for (const m of s.mats) { m.opacity = c.op; m.depthWrite = c.op > 0.95; }
      s.g.visible = c.op > 0.02;
      s.lb.tabIndex = c.op > 0.2 ? 0 : -1;
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !raf) { clock.getDelta(); raf = requestAnimationFrame(frame); } }).observe(stage);
  let rt = 0;
  addEventListener('resize', () => { resize(); clearTimeout(rt); rt = setTimeout(drawCards, 200); });
  resize();
  root.classList.add('ready');

  // ---------- すべての製品のカード：シャフトを横に寝かせて、柄のある部分を見せる。カードにマウスを乗せると、軸まわりに回る ----------
  // カードは 13 枚あるので、WebGL は 1 つだけ（見えないキャンバス）で 1 本ずつ描き、それぞれのカードのキャンバスへ写す
  let drawCards = () => {};
  if (cardCvs.length) {
    let r2;
    try { r2 = setup(document.createElement('canvas')); } catch (e) { r2 = null; }
    if (r2) {
      const sc2 = lit(r2), cam2 = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
      const CARD_W = 2.5, CARD_MM = 600;   // カードの幅に入る長さと、その中心（手元からの mm。柄の中ほど）
      const cards = cardCvs.map(cv => {
        const s = build(cv.dataset.slug, sc2);
        if (!s) return null;
        cv.classList.add('show');
        s.g.rotation.z = -0.12;   // 寝かせて、少し右下がりに（手元が左。サイトの斜めの線と同じ向き）
        s.g.position.x = s.half - CARD_MM * U;
        s.g.visible = false;
        return { cv, s, a: -0.3 };
      }).filter(Boolean);
      const size = () => {
        const r = cards[0].cv.getBoundingClientRect();
        if (!r.width) return false;
        r2.setPixelRatio(Math.min(devicePixelRatio, 2));
        r2.setSize(r.width, r.height, false);
        cam2.aspect = r.width / r.height; cam2.updateProjectionMatrix();
        cam2.position.set(0, 0, CARD_W / (2 * TAN * cam2.aspect)); cam2.lookAt(0, 0, 0);
        for (const c of cards) { c.cv.width = r2.domElement.width; c.cv.height = r2.domElement.height; }
        return true;
      };
      const draw = c => {
        for (const o of cards) o.s.g.visible = o === c;
        c.s.spin.rotation.x = c.a;
        r2.render(sc2, cam2);
        const x = c.cv.getContext('2d');
        x.clearRect(0, 0, c.cv.width, c.cv.height);
        x.drawImage(r2.domElement, 0, 0);
      };
      let loaded = false;
      drawCards = () => { if (loaded && size()) cards.forEach(c => { draw(c); c.cv.classList.add('on'); }); };
      manager.onLoad = () => { loaded = true; drawCards(); };
      let spinning = null, raf2 = 0, last = 0;
      const loop = now => {
        raf2 = 0;
        if (!spinning) return;
        spinning.a += Math.min(0.05, (now - last) / 1000) * 1.8; last = now;
        draw(spinning);
        raf2 = requestAnimationFrame(loop);
      };
      cards.forEach(c => {
        const a = c.cv.closest('.lu');
        a.addEventListener('pointerenter', () => { if (!loaded) return; spinning = c; last = performance.now(); if (!raf2) raf2 = requestAnimationFrame(loop); });
        a.addEventListener('pointerleave', () => { if (spinning === c) spinning = null; });
      });
    }
  }
})();
