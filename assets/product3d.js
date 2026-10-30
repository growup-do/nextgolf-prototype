// 3D のある製品ページ：スクロールに合わせて、シャフトの全体 → ロゴ → ラベル → … とカメラが寄っていく
// シャフトの形とテクスチャは KV と同じ（印刷データから作った assets/kv-data.js）。どちらのシャフトかは .p3d の data-shaft
// 鎬BLUE・Rafale RS1.0 以外の製品は、製品ごとのデータ（assets/shaft-<slug>.js の SHAFT_DATA。build_tex_products.py）を読み、
// カットの構成と動き方も製品ごとに変える（data-slug）
// three.js と素材は、file:// で開いても読めるよう通常の <script> で読み込む
(() => {
  const box = document.querySelector('.p3d');
  const THREE = window.THREE, D = window.KV_DATA, S = window.SHAFT_DATA;
  if (!box || !THREE || !(D || S)) return;
  const KIND = box.dataset.shaft;               // 'shinogi' か 'rafale'
  const SLUG = box.dataset.slug;
  const canvas = box.querySelector('.p3d-stage');
  const track = box.querySelector('.p3d-track');
  const info = box.querySelector('.p3d-info');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 説明文：画面に固定し、いま見ているカットの 1 段落だけをフェードインで出す（3D が使えなくても動かす）
  // カット k の説明は、区間の頭が画面の上に来る少し手前から、次の区間へ移り始めるまで。製品名が画面に入ってきたら、最後の段落も消す
  // 最初の画面の暗い背景（トップの KV でホバーしたときと同じ）：スクロールし始めたら、明るいグレーへ消していく（--fv：1→0。site.css）
  const fv = () => document.documentElement.style.setProperty('--fv', Math.max(0, 1 - scrollY / (innerHeight * 0.6)).toFixed(3));
  addEventListener('scroll', fv, { passive: true });
  addEventListener('resize', fv);
  fv();

  const texts = [...track.querySelectorAll('.p3d-sec')].map(sec => [sec, sec.querySelector('.p3d-text')]).filter(([, t]) => t);
  const nameEl = info && info.querySelector('.p3d-name');
  if (texts.length) {
    const showText = () => {
      const h = innerHeight;
      const named = nameEl && nameEl.getBoundingClientRect().top < h;
      for (const [sec, t] of texts) {
        const top = sec.getBoundingClientRect().top;
        t.classList.toggle('on', !named && top <= h * 0.25 && top > -h * 0.75);
      }
    };
    addEventListener('scroll', showText, { passive: true });
    addEventListener('resize', showText);
    showText();
  }

  let renderer;
  try {
    // preserveDrawingBuffer：ページを移るときのクロスフェード（View Transition）が撮る画面に、シャフトが写るようにする（ないと一瞬消える）
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  } catch (e) {
    box.classList.add('no3d');
    return;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  canvas.addEventListener('webglcontextlost', e => e.preventDefault());
  canvas.addEventListener('webglcontextrestored', () => location.reload());

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new window.RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);

  // ---------- シャフト（KV と同じ作り。1 unit = 100mm） ----------
  const L = S ? S.lay : KIND === 'rafale' ? D.layRafale : D.layShinogi;
  const T = S ? S.tex : KIND === 'rafale' ? D.texRafale : D.texShinogi;
  const U = 0.01, LEN = L.length, X0 = L.x0;
  const knots = [[0, L.d_butt], [X0, L.d_wrap_l], [X0 + L.wrap_mm, L.d_wrap_r], [LEN, L.d_tip]];
  const radius = mm => {
    for (let i = 1; i < knots.length; i++) {
      const [xa, da] = knots[i - 1], [xb, db] = knots[i];
      if (mm <= xb) return (da + (db - da) * (mm - xa) / (xb - xa)) / 2;
    }
    return L.d_tip / 2;
  };
  function tube(mm0, mm1, nx, nr = 96) {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= nx; i++) {
      const mm = mm0 + (mm1 - mm0) * i / nx, r = radius(mm) * U;
      for (let j = 0; j <= nr; j++) {
        const phi = Math.PI / 2 - 2 * Math.PI * (0.5 - j / nr);
        pos.push(mm * U, r * Math.cos(phi), r * Math.sin(phi));
        uv.push(i / nx, 1 - j / nr);
      }
    }
    for (let i = 0; i < nx; i++) for (let j = 0; j < nr; j++) {
      const a = i * (nr + 1) + j, b = a + nr + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  const loads = [];
  const loader = new THREE.TextureLoader();
  const texture = src => {
    let t;
    loads.push(new Promise(r => { t = loader.load(src, r, undefined, r); }));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  };
  const srgb = ([r, g, b]) => new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
  const paint = opts => new THREE.MeshPhysicalMaterial({ roughness: 0.42, metalness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 0.9, ...opts });
  const parts = KIND === 'rafale'
    ? (() => {
      const third = L.b_mm / 3, o = { roughness: 0.32, metalness: 0.2 };
      return [[0, X0, 40, { color: srgb(L.body), ...o }], [X0, X0 + third, 240, { map: texture(T.R1), ...o }],
        [X0 + third, X0 + third * 2, 240, { map: texture(T.R2), ...o }], [X0 + third * 2, X0 + L.b_mm, 240, { map: texture(T.R3), ...o }],
        [X0 + L.b_mm, LEN, 100, { color: srgb(L.body), ...o }]];
    })()
    : (() => {
      const B = L.b_mm, half = X0 + B / 2, M = L.metal ? { metalness: 0.62, roughness: 0.26 } : {};   // 銀の地の製品（FW-60）は金属らしく
      return [[0, X0, 40, { color: srgb(L.grey), ...M }], [X0, half, 240, { map: texture(T.B1), ...M }],
        [half, X0 + B, 240, { map: texture(T.B2), metalness: 0.2, ...M }], [X0 + B, LEN, 160, { map: texture(T.C), metalness: 0.3, roughness: 0.38 }]];
    })();
  const shaft = new THREE.Group();
  for (const [a, b, nx, opts] of parts) shaft.add(new THREE.Mesh(tube(a, b, nx), paint(opts)));
  for (const [mm, dir] of [[0, -1], [LEN, 1]]) {
    const cap = new THREE.Mesh(new THREE.CircleGeometry(radius(mm) * U, 48), paint({ color: 0x1a1a1a }));
    cap.position.x = mm * U;
    cap.rotation.y = dir * Math.PI / 2;
    shaft.add(cap);
  }
  shaft.position.x = -LEN / 2 * U;
  const spin = new THREE.Group(); spin.add(shaft);     // シャフト軸まわりの回転
  const root = new THREE.Group(); root.add(spin);      // 全体の傾き
  scene.add(root);

  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(3, 6, 8);
  scene.add(key);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9a9a, 0.7));

  // ---------- スクロールで切り替わるカット（Figma のコンテ図「NEW PRODUCT」） ----------
  // 1 トップの KV でホバーしたときと同じ構図（斜めに大きく。'kv'）→ 2 ロゴ → 3 ラベル → 4 少し傾けた中景 → 5 斜めの大写し
  // → 6 手元の裏（説明文は 2〜6 のカットに、後ろから詰めて 1 段落ずつ）→ 7 縦に立てて、画面の左端とスペック表の左端のまん中に置く（このまま本文が右を流れる）
  // 各カット：focus＝画面に置くシャフト上の位置（mm）、d＝カメラの距離（'fit'：全体が画面の幅、'tall'：縦にして画面の高さの 2.4 倍、'kv'：KV のホバー時と同じ大きさ）、
  // rz＝画面の上での傾き（'kv'：KV と同じ斜め）、sx・sy＝focus を置く位置（画面の中心からの、幅・高さに対する割合。右・上がプラス。'left' は縦にしたシャフトの位置）、tilt＝手前への傾き、roll＝軸まわり
  const wx = mm => (mm - LEN / 2) * U;   // シャフト上の位置（mm）→ シャフトの中心からの距離
  const MID = LEN / 2, TURN = Math.PI * 2;
  const KV_ROLL = 0.45;   // KV でホバーしたときの、軸まわりの向き（kv.js の 0.3 + 0.15）
  const mark = k => (L.marks || [])[k] || { mm: X0 + 140, roll: 0 };
  const TIP = LEN - 140;   // 先端シールの中心（build_tex.py）
  const LAB = L.label_mm || X0 + L.b_mm - 60;   // 展開図とは別に貼ったラベルの中心（Black-50・SP-40）
  // 最後の説明文は右側に長く出ることがあるので、そのカットではシャフトを左に立て気味に置く（次の縦のカットへつながる）
  const LEFT = (focus, d, roll = 0) => ({ focus, d, rz: -1.2, sx: -0.3, sy: 0, tilt: 0, roll });
  const KV0 = { focus: MID, d: 'kv', rz: 'kv', sx: 0, sy: 0, tilt: 0, roll: KV_ROLL };
  const TALL = (roll = TURN) => ({ focus: MID, d: 'tall', rz: -Math.PI / 2, sx: 'left', sy: 0, tilt: 0, roll });
  const SHOTS = {
    // Athlete S-60：ラベル → ロゴを斜めに → 先端シール → 手元の炎 → 立てた全体
    'shinogi-athlete-s-60': () => [KV0,
      { focus: mark(1).mm, d: 1.2, rz: 0, sx: 0, sy: 0, tilt: 0, roll: mark(1).roll },
      { focus: mark(0).mm, d: 1.6, rz: -0.15, sx: 0, sy: 0.04, tilt: 0, roll: 0 },
      { focus: TIP, d: 0.62, rz: 0.25, sx: 0.05, sy: 0, tilt: 0, roll: 0 },
      { focus: X0 + 40, d: 1.0, rz: 0, sx: 0, sy: -0.1, tilt: 0, roll: Math.PI / 2 },
      LEFT(MID, 2.6), TALL()],
    // Black-50：炎 → ラベル → 引きの全体 → 先端シール → 立てた全体
    'shinogi-black-50': () => [KV0,
      { focus: X0 + 120, d: 1.5, rz: 0.1, sx: 0, sy: 0, tilt: 0, roll: 0 },
      { focus: LAB, d: 1.0, rz: 0, sx: 0, sy: 0, tilt: 0, roll: 0 },
      { focus: MID - 60, d: 3.4, rz: -0.1, sx: 0, sy: 0.2, tilt: 0.06, roll: 0.4 },
      { focus: TIP, d: 0.6, rz: 0.2, sx: 0.04, sy: -0.12, tilt: 0, roll: 0 },   // 文章（左上）を避けて、右上がりに下へ
      LEFT(LAB - 120, 1.6), TALL()],
    // SP-40：金のマーク → 1/3 周ずつずれた線の版 → ラベル → 引きの全体 → 立てた全体
    'shinogi-sp-40': () => [KV0,
      { focus: mark(0).mm, d: 0.8, rz: 0, sx: 0, sy: 0, tilt: 0, roll: 0 },
      { focus: X0 + 200, d: 1.3, rz: 0.12, sx: 0, sy: 0, tilt: 0, roll: TURN / 3 },
      { focus: LAB, d: 1.0, rz: 0, sx: 0, sy: 0, tilt: 0, roll: 0 },
      { focus: MID, d: 3.4, rz: 0.08, sx: 0, sy: -0.2, tilt: -0.05, roll: TURN * 2 / 3 },
      LEFT(X0 + 150, 1.4), TALL()],
    // Rafale KT1.0：裏のラベル → オレンジの帯 → ロゴ → シール（裏）→ 立てた全体（裏を正面に）
    'rafale-kt1': () => [KV0,
      { focus: L.pos.label, d: 1.7, rz: 0, sx: 0, sy: 0, tilt: 0, roll: L.pos.label_roll },
      { focus: L.pos.ring, d: 0.9, rz: 0.2, sx: 0, sy: 0, tilt: 0, roll: 0 },
      { focus: L.pos.logo + 40, d: 2.6, rz: -0.06, sx: 0, sy: 0.18, tilt: -0.05, roll: 0 },
      { focus: X0 + 39, d: 1.2, rz: 0, sx: 0, sy: 0.08, tilt: 0, roll: -Math.PI },
      LEFT(X0 + 120, 1.5, -Math.PI), TALL(Math.PI)],
    // Rafale Ma1.0：ロゴ → ラベル → 筆記体（裏）→ 青の帯（裏）→ 立てた全体（裏を正面に）
    'rafale-ma1': () => [KV0,
      { focus: L.pos.logo, d: 2.5, rz: 0, sx: 0, sy: 0, tilt: 0, roll: 0 },
      { focus: L.pos.label, d: 1.7, rz: 0, sx: 0, sy: 0, tilt: 0, roll: 0 },
      { focus: X0 + 120, d: 0.85, rz: 0.3, sx: 0.06, sy: -0.06, tilt: 0, roll: -Math.PI },
      { focus: L.pos.ring, d: 0.9, rz: 0.22, sx: 0, sy: -0.16, tilt: 0, roll: -Math.PI },   // 帯のすぐ隣に表のラベルがあるので、帯は裏から。文章（左上）を避けて下へ
      LEFT(X0 + 60, 1.5, -Math.PI), TALL(Math.PI)],
    // Rafale KT FW：ロゴ → オレンジの帯 → 裏のラベル → 筆記体（裏）→ 立てた全体（文章が左上のカットは下へ、右下のカットは上へ置く）
    'rafale-kt-fw': () => [KV0,
      { focus: L.pos.logo, d: 2.4, rz: 0.08, sx: 0, sy: 0, tilt: 0, roll: 0 },
      { focus: L.pos.ring, d: 0.9, rz: 0.12, sx: 0, sy: -0.25, tilt: 0, roll: 0 },
      { focus: L.pos.label, d: 1.6, rz: -0.08, sx: 0, sy: 0.12, tilt: 0, roll: L.pos.label_roll },
      { focus: X0 + 120, d: 0.9, rz: 0.06, sx: 0.04, sy: -0.24, tilt: 0, roll: -Math.PI },
      LEFT(X0 + 100, 1.5, -Math.PI), TALL(Math.PI)],
    // Athlete GX：赤い SHINOGI → ラベル → 手元の裏（六角のマーク）→ 先端シール → 引きの全体 → 縦
    'shinogi-athlete-gx': () => [KV0,
      { focus: mark(0).mm, d: 1.6, rz: 0, sx: 0, sy: 0, tilt: 0, roll: 0 },
      { focus: LAB, d: 1.1, rz: 0.12, sx: 0, sy: -0.1, tilt: 0, roll: 0 },
      { focus: X0 + 60, d: 1.2, rz: -0.12, sx: 0, sy: 0.12, tilt: 0, roll: Math.PI },
      { focus: TIP, d: 0.6, rz: 0.2, sx: 0.04, sy: -0.12, tilt: 0, roll: 0 },
      LEFT(MID - 40, 2.4), TALL()],
    // Athlete FW：ロゴ → 展開図の中のラベル（裏側へ回す）→ 低い位置からの中景 → 先端シール → 炎の先 → 縦
    'shinogi-athlete-fw': () => [
      { focus: MID, d: 'kv', rz: 'kv', sx: 0, sy: 0, tilt: 0, roll: KV_ROLL },
      { focus: mark(0).mm, d: 1.5, rz: 0, sx: 0, sy: 0, tilt: 0, roll: 0 },
      { focus: mark(1).mm, d: 1.25, rz: 0, sx: 0, sy: 0, tilt: 0, roll: mark(1).roll },
      { focus: mark(0).mm + 160, d: 3.1, rz: 0.09, sx: -0.02, sy: -0.18, tilt: 0.1, roll: 0.3 },
      { focus: TIP, d: 0.6, rz: -0.26, sx: -0.06, sy: 0.05, tilt: 0, roll: 0 },
      { focus: X0 + L.b_mm - 40, d: 1.1, rz: -1.2, sx: -0.3, sy: 0, tilt: 0, roll: -0.6 },   // 最後の説明文は右側に長く出るので、シャフトは左に立て気味に（次の縦のカットへつながる）
      { focus: MID, d: 'tall', rz: -Math.PI / 2, sx: 'left', sy: 0, tilt: 0, roll: TURN },
    ],
    // Athlete T-60：ラベルから入り、ロゴ → 先端シール → 手元の大写し → 傾けた全体 → 縦（FW とは逆の順で見せる）
    'shinogi-athlete-t-60': () => [
      { focus: MID, d: 'kv', rz: 'kv', sx: 0, sy: 0, tilt: 0, roll: KV_ROLL },
      { focus: mark(1).mm, d: 1.2, rz: 0, sx: 0, sy: 0, tilt: 0, roll: mark(1).roll },
      { focus: mark(0).mm, d: 1.45, rz: 0.18, sx: 0, sy: 0, tilt: 0, roll: 0 },
      { focus: TIP, d: 0.62, rz: 0, sx: 0, sy: 0, tilt: 0, roll: 0 },
      { focus: X0 + 30, d: 0.8, rz: -0.32, sx: 0.06, sy: -0.04, tilt: 0, roll: Math.PI / 2 },
      { focus: MID + 60, d: 2.6, rz: -1.2, sx: -0.3, sy: 0, tilt: -0.06, roll: 0 },   // 最後の説明文は右側に長く出るので、シャフトは左に立て気味に
      { focus: MID, d: 'tall', rz: -Math.PI / 2, sx: 'left', sy: 0, tilt: 0, roll: TURN },
    ],
    // White-50：金の「鎬」→ 手元の筆の SHINOGI（側面）→ 白から黒へ変わる筆の模様 → 引きの全体 → 黒い先端 → 縦
    'shinogi-white-50': () => [
      { focus: MID, d: 'kv', rz: 'kv', sx: 0, sy: 0, tilt: 0, roll: KV_ROLL },
      { focus: mark(0).mm, d: 1.0, rz: 0, sx: 0, sy: 0, tilt: 0, roll: 0 },
      { focus: X0 + 35, d: 1.2, rz: 0, sx: 0, sy: 0, tilt: 0, roll: -1.63 },
      { focus: X0 + 175, d: 1.5, rz: 0.16, sx: 0.02, sy: -0.04, tilt: 0, roll: 0.4 },
      { focus: MID - 40, d: 3.4, rz: -0.08, sx: 0, sy: 0.2, tilt: -0.05, roll: 0 },
      { focus: TIP + 60, d: 0.9, rz: -1.2, sx: -0.3, sy: 0, tilt: 0, roll: 0 },   // 最後の説明文は右側に長く出るので、シャフトは左に立て気味に
      { focus: MID, d: 'tall', rz: -Math.PI / 2, sx: 'left', sy: 0, tilt: 0, roll: TURN },
    ],
    // FW-60：手元の筆の SHINOGI（側面）→ 金の「鎬」→ 灰から黒へ散る墨の飛沫 → 引きの全体 → 黒い先端 → 縦（White-50 とは逆に、手元から先端へ）
    'shinogi-fw-60': () => [
      { focus: MID, d: 'kv', rz: 'kv', sx: 0, sy: 0, tilt: 0, roll: KV_ROLL },
      { focus: X0 + 35, d: 1.2, rz: 0, sx: 0, sy: 0, tilt: 0, roll: -1.63 },
      { focus: mark(0).mm, d: 1.0, rz: 0.12, sx: 0, sy: 0, tilt: 0, roll: 0 },
      { focus: X0 + 195, d: 1.4, rz: -0.14, sx: -0.02, sy: -0.04, tilt: 0, roll: 0.5 },
      { focus: MID - 20, d: 3.4, rz: 0.07, sx: 0, sy: 0.2, tilt: 0.05, roll: 0 },
      { focus: TIP + 60, d: 0.9, rz: -1.2, sx: -0.3, sy: 0, tilt: 0, roll: 0 },   // 最後の説明文は右側に長く出るので、シャフトは左に立て気味に
      { focus: MID, d: 'tall', rz: -Math.PI / 2, sx: 'left', sy: 0, tilt: 0, roll: TURN },
    ],
  };
  const shots = SHOTS[SLUG] ? SHOTS[SLUG]() : KIND === 'rafale'
    ? (() => {
      // 裏面の筆記体とシールは、羽のマークとロゴの真裏（半周）。build_tex_kv.py でシールを半周の位置にそろえている
      const LOGO = L.pos.logo, LABEL = L.pos.label, SCRIPT = X0 + 120, SEAL = X0 + 29, BACK = -Math.PI;
      return [
        { focus: MID, d: 'kv', rz: 'kv', sx: 0, sy: 0, tilt: 0, roll: KV_ROLL },
        { focus: LOGO, d: 2.5, rz: 0, sx: 0, sy: 0, tilt: 0, roll: 0 },
        { focus: LABEL, d: 1.7, rz: 0, sx: 0, sy: 0, tilt: 0, roll: 0 },
        { focus: LOGO + 40, d: 4.2, rz: -0.07, sx: 0.02, sy: 0.2, tilt: -0.05, roll: 0 },
        { focus: SCRIPT, d: 0.85, rz: 0.3, sx: 0.06, sy: -0.06, tilt: 0, roll: BACK },
        { focus: SEAL + 10, d: 1.2, rz: 0, sx: 0, sy: 0.08, tilt: 0, roll: BACK },
        { focus: MID, d: 'tall', rz: -Math.PI / 2, sx: 'left', sy: 0, tilt: 0, roll: Math.PI },   // 縦にしたら裏側を正面に
      ];
    })()
    : (() => {
      // ロゴ・ラベル（先端側の BLUE の帯）・手元のシール（シールは裏側）
      const LOGO = X0 + 140, LABEL = X0 + L.b_mm - 60, SEAL = X0 + 12;
      return [
        { focus: MID, d: 'kv', rz: 'kv', sx: 0, sy: 0, tilt: 0, roll: KV_ROLL },
        { focus: LOGO, d: 1.6, rz: 0, sx: 0, sy: 0, tilt: 0, roll: 0 },
        { focus: LABEL, d: 0.9, rz: 0, sx: 0, sy: 0, tilt: 0, roll: 0 },
        { focus: LOGO + 70, d: 3.3, rz: -0.07, sx: 0.02, sy: 0.2, tilt: -0.05, roll: 0 },
        { focus: X0 + L.b_mm + 90, d: 0.5, rz: 0.32, sx: 0.08, sy: -0.06, tilt: 0, roll: 0.5 },
        { focus: SEAL + 25, d: 1.15, rz: 0, sx: 0, sy: 0.08, tilt: 0, roll: Math.PI },
        { focus: MID, d: 'tall', rz: -Math.PI / 2, sx: 'left', sy: 0, tilt: 0, roll: TURN },
      ];
    })();
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t * t * (3 - 2 * t);
  // カットのつなぎ方は、製品の名前に合わせて変える（各カットで止まったときの構図は同じ）
  //  鎬（刀のしのぎ）：各カットでしっかり止まり、短くきびきび切り替える。切り替えの間に、刀身を光が走るようにハイライトが流れる
  //  Rafale（突風）：止まる時間を短くして流れ続ける。切り替えのたびに風にあおられたように軸まわりに 1 回転し、傾きと向きも揺れる
  // hold：区間の前後で構図のまま止める割合、curve：切り替えの速さの変化、idle：止まっているあいだの揺れ
  //  Athlete FW（フェアウェイから払い打つ）：低く払うように、切り替えの途中で手前へ傾きながら横へ流れ、4 分の 1 周ひねって戻る
  //  Athlete T-60（ツアー向けの精密さ）：止まっているときは揺らさない。切り替えはわずかに行き過ぎてから、カチッと止まる。光が軸のまわりを 1 周する
  //  White-50（白）：ゆっくり浮かぶ。切り替えの途中で少し遠ざかってから寄り直し（息をするように）、止まっているあいだは上下にただよう
  //  Athlete S-60：振り子のように、切り替えのたびに左右交互に大きく振れて戻る。止まっているあいだも小さく揺れる
  //  Black-50（黒）：切り替えの途中でぐっと手前へ寄りながら先端をこちらへ向け、光はシャフトの裏から回り込む（逆光）
  //  SP-40（3 版を 1/3 周ずつずらした柄）：切り替えのたびに、1/3 周ずつ 3 段で 1 周する
  //  Rafale KT1.0（The wind is a tailwind＝追い風）：背中を押されるように、すっと右へ流れてから戻る。RS1.0 とは逆向きに 1 回転
  //  Rafale Ma1.0：うなずくように手前へ傾き、少し遠ざかる。光は上下に動く。止まっているあいだは上下にただよう
  // sway：止まっているあいだの、画面の上での小さな揺れ
  // gust(t, w, i)：切り替えの途中だけ足す動き（t：0→1、w：途中で 1。i：カットの番号）。dz：カメラの距離の倍率、sx：横のずれ、bob：上下のただよい
  const backOut = t => t <= 0 ? 0 : 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);   // 0 で -0.0000… にならないように
  const STYLE = {
    'shinogi-athlete-fw': { hold: 0.12, curve: ease, idle: 0.05,
      gust: (t, w, i) => ({ roll: Math.PI * Math.sin(Math.PI * t) * 0.5, rz: -0.12 * w, yaw: 0, tilt: 0.35 * w, sx: (i % 2 ? 0.16 : -0.16) * w, dz: 1 }),
      light: (t, w) => [lerp(3, -6, w), 2.5, 8] },
    'shinogi-athlete-t-60': { hold: 0.26, curve: backOut, idle: 0,
      gust: () => ({ roll: 0, rz: 0, yaw: 0, tilt: 0, sx: 0, dz: 1 }),
      light: (t, w) => [9 * Math.cos(TURN * t + 0.36), 6, 9 * Math.sin(TURN * t + 0.36) + 4 * (1 - w)] },
    'shinogi-white-50': { hold: 0.1, curve: t => (1 - Math.cos(Math.PI * t)) / 2, idle: 0.06, bob: 0.06,
      gust: (t, w) => ({ roll: 0, rz: 0.05 * w, yaw: -0.18 * w, tilt: 0, sx: 0, dz: 1 + 0.45 * w }),
      light: (t, w) => [lerp(2, 0, w), 9, 6] },
    // FW-60（灰から黒へ散る墨）：筆を払うように、すっと左へ流れながら 1 周ひねる。光も筆の向きに右から左へ走る
    'shinogi-fw-60': { hold: 0.14, curve: t => 1 - Math.pow(1 - t, 4), idle: 0.04,
      gust: (t, w) => ({ roll: TURN * ease(t) * (t < 1 ? 1 : 0), rz: 0.1 * w, yaw: 0, tilt: 0, sx: -0.22 * w, dz: 1 + 0.15 * w }),
      light: (t, w) => [lerp(8, -8, t), 5, 8] },
    'shinogi-athlete-s-60': { hold: 0.18, curve: t => (1 - Math.cos(Math.PI * t)) / 2, idle: 0.02, sway: 0.03,
      gust: (t, w, i) => ({ roll: 0, rz: (i % 2 ? 0.38 : -0.38) * w, yaw: 0, tilt: 0, sx: 0, dz: 1 }),
      light: () => [3, 6, 8] },
    'shinogi-black-50': { hold: 0.2, curve: t => t * t * t * (t * (t * 6 - 15) + 10), idle: 0.03,
      gust: (t, w) => ({ roll: 0, rz: 0, yaw: 0.35 * w, tilt: 0, sx: 0, dz: 1 - 0.3 * w }),
      light: (t, w) => [lerp(3, -2, w), 4, lerp(8, -6, w)] },
    'shinogi-sp-40': { hold: 0.15, curve: ease, idle: 0.03,
      gust: t => ({ roll: TURN * (Math.floor(t * 3) + ease((t * 3) % 1)) / 3 * (t < 1 ? 1 : 0), rz: 0, yaw: 0, tilt: 0, sx: 0, dz: 1 }),
      light: () => [3, 6, 8] },
    'rafale-kt1': { hold: 0.08, curve: t => 1 - Math.pow(1 - t, 3), idle: 0.1,
      gust: (t, w) => ({ roll: -TURN * t, rz: -0.15 * w, yaw: 0, tilt: 0, sx: 0.25 * w, dz: 1 }),
      light: (t, w) => [lerp(3, 14, w), 6, 8] },
    'rafale-kt-fw': { hold: 0.1, curve: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, idle: 0.12,   // 風に流されるように奥へ引いて、戻る
      gust: (t, w) => ({ roll: TURN * t, rz: -0.3 * w, yaw: 0.15 * w, tilt: 0, sx: -0.2 * w, dz: 1 + 0.5 * w }),
      light: t => [lerp(14, -6, t), 6, 8] },
    'shinogi-athlete-gx': { hold: 0.12, curve: t => t * t * (3 - 2 * t), idle: 0.05,   // ゆっくりひねりながら 1 周、光が左から右へ
      gust: (t, w) => ({ roll: TURN * t, rz: 0.1 * w, yaw: 0.3 * w, tilt: -0.15 * w, sx: 0, dz: 1 + 0.12 * w }),
      light: t => [lerp(-12, 12, t), 8, 6] },
    'rafale-ma1': { hold: 0.14, curve: t => (1 - Math.cos(Math.PI * t)) / 2, idle: 0.08, bob: 0.05,
      gust: (t, w) => ({ roll: 0, rz: 0, yaw: -0.2 * w, tilt: 0.4 * w, sx: 0, dz: 1 + 0.25 * w }),
      light: t => [3, 6 * Math.cos(TURN * t), 8] },
  }[SLUG];
  const MOVE = STYLE || (KIND === 'rafale'
    ? { hold: 0.06, curve: ease, idle: 0.14 }
    : { hold: 0.22, curve: t => t * t * t * (t * (t * 6 - 15) + 10), idle: 0.03 });
  const clamp01 = x => Math.min(1, Math.max(0, x));
  const TAN = Math.tan(THREE.MathUtils.degToRad(15));   // 縦の画角 30°の半分
  const look = new THREE.Vector3();

  // ドラッグで軸まわりに回す（慣性つき）。手を離すと徐々に正面へ戻る
  let drag = null, vel = 0, user = 0;
  canvas.addEventListener('pointerdown', e => { drag = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (drag === null) return;
    vel = (e.clientX - drag) * 0.012;
    drag = e.clientX;
    user += vel;
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('pointercancel', () => { drag = null; });
  // マウスの位置で、少しだけ角度を変える
  const mouse = { x: 0, y: 0 }, follow = { x: 0, y: 0 };
  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    mouse.x = e.clientX / innerWidth * 2 - 1;
    mouse.y = e.clientY / innerHeight * 2 - 1;
  });
  document.addEventListener('mouseleave', () => { mouse.x = 0; mouse.y = 0; });

  let aspect = 1, distScale = 1, leftX = -0.31, kvA = 0.38, kvD = 6;
  function resize() {
    const w = innerWidth, h = innerHeight;
    aspect = w / h;
    renderer.setSize(w, h, false);
    camera.aspect = aspect;
    distScale = aspect < 1.6 ? Math.min(4, 1.75 / aspect) : 1;   // 縦長の画面では寄りのカットを引いて、横の見える幅を保つ
    camera.updateProjectionMatrix();
    // KV と同じ構図（kv.js の layout と同じ計算）。KV のシャフトは 150% に拡大して 2.2 手前にあるので、等倍のシャフトに直した距離にする
    kvA = Math.atan(Math.min(1.3, Math.max(0.4, 0.72 / aspect)));
    const m = aspect < 1 ? 0.95 : 1.12, ex = 11.2 * Math.cos(kvA) * m, ey = 11.2 * Math.sin(kvA) * m;
    kvD = (Math.max(ex / (2 * TAN * aspect), ey / (2 * TAN), 10) - 2.2) / 1.5;
    // 縦にしたシャフトの位置：画面の左端とスペック表（なければ本文）の左端のまん中
    const ref = info && (info.querySelector('.spec-wrap') || info);
    const left = ref ? ref.getBoundingClientRect().left + parseFloat(ref === info ? getComputedStyle(info).paddingLeft : 0) : w * 0.38;
    leftX = left / 2 / w - 0.5;
  }
  addEventListener('resize', resize);
  resize();
  // カメラの距離：'fit' は全体が画面の幅に少しはみ出すくらい、'tall' は縦にしたシャフトが画面の高さの 2.4 倍
  const dist = d => d === 'kv' ? kvD : d === 'fit' ? LEN * U * 1.03 / (2 * TAN * aspect) : d === 'tall' ? LEN * U / (2.4 * 2 * TAN) : d * distScale;

  // スクロールの位置 → カットの番号（小数）。各カットは、その区間の頭が画面の上に来たところでぴったりその構図になり、
  // 区間の前後 15% ずつはその構図のまま止めて、文字を読みやすくする
  const marks = [...track.querySelectorAll('.p3d-sec'), info].filter(Boolean);
  const pageTop = el => el.getBoundingClientRect().top + scrollY;
  function shotAt(y) {
    const a = marks.map((el, k) => (k === 0 ? 0 : pageTop(el)));
    if (y >= a[a.length - 1]) return a.length - 1;
    let k = 0;
    while (k < a.length - 2 && y >= a[k + 1]) k++;
    const f = (y - a[k]) / Math.max(1, a[k + 1] - a[k]);
    return k + MOVE.curve(clamp01((f - MOVE.hold) / (1 - MOVE.hold * 2)));
  }

  const clock = new THREE.Clock();
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const s = Math.min(shotAt(scrollY), shots.length - 1);
    const i = Math.min(Math.floor(s), shots.length - 2), t = s - i;
    const a = shots[i], b = shots[i + 1];
    // 距離は対数で補間する（全体の引きから大写しまで、同じ速さで寄っていくように見せる）
    // w：切り替えの途中だけ 1 に近づく（カットの上では 0。構図を崩さない）。t は行き過ぎ（T-60）で 1 を少し超えることがある
    const w = Math.sin(Math.PI * clamp01(t));
    const gust = STYLE ? STYLE.gust(t, w, i) : KIND === 'rafale' ? { roll: TURN * t, rz: 0.22 * w, yaw: 0.28 * w } : { roll: 0, rz: 0, yaw: 0 };
    const d = Math.exp(lerp(Math.log(dist(a.d)), Math.log(dist(b.d)), t)) * (gust.dz || 1);
    // 鎬：光を画面の左から右へ横切らせる（止まっているカットでは元の位置）
    if (STYLE) key.position.set(...STYLE.light(t, w));
    else key.position.set(KIND === 'rafale' ? 3 : lerp(3, 26 * t - 13, w), 6, 8);
    // 'left'：縦にしたシャフトの位置（resize で計算）
    const sxOf = v => v === 'left' ? leftX : v;
    const sx = lerp(sxOf(a.sx), sxOf(b.sx), t) + (gust.sx || 0), sy = lerp(a.sy, b.sy, t);
    // focus をシャフトの回転の中心に置き、その点が画面の (sx, sy) に来るようにカメラをずらす
    spin.position.x = -wx(lerp(a.focus, b.focus, t));
    const lx = -sx * 2 * d * TAN * aspect, ly = -sy * 2 * d * TAN;
    camera.position.set(lx, ly + d * 0.03, d);
    camera.lookAt(look.set(lx, ly, 0));
    // マウスの位置で、少しだけ角度を変える
    const k = Math.min(1, dt * 4);
    follow.x += ((reduce ? 0 : mouse.x) - follow.x) * k;
    follow.y += ((reduce ? 0 : mouse.y) - follow.y) * k;
    // White-50：止まっているあいだ、上下にただよう（縦のカットでは止める）
    const calm0 = 1 - clamp01(s - (shots.length - 2));
    root.position.set(0, reduce || !MOVE.bob ? 0 : Math.sin(clock.elapsedTime * 0.7) * MOVE.bob * d * TAN * calm0, 0);
    // 'kv'：鎬は左上から右下へ、Rafale は左下から右上へ（KV の X と同じ向き）
    const rzOf = v => v === 'kv' ? (KIND === 'rafale' ? kvA : -kvA) : v;
    // 最後の縦のカットでは、マウスと漂う動きで軸まわりに回さない（裏面のシールを正面に向けたままにする）
    const calm = 1 - clamp01(s - (shots.length - 2));
    // 縦にしたシャフトは画面の左に寄せるので、カメラからは右斜めに見える。その角度だけ軸まわりに回して、シールをカメラの真正面に向ける
    const face = Math.atan2(lx, d) * (1 - calm);
    root.rotation.set(lerp(a.tilt, b.tilt, t) + (gust.tilt || 0) + follow.y * 0.04, follow.x * 0.12 * calm + face + gust.yaw, lerp(rzOf(a.rz), rzOf(b.rz), t) + gust.rz +
      (reduce || !MOVE.sway ? 0 : Math.sin(clock.elapsedTime * 0.8) * MOVE.sway * calm));
    if (drag === null) {
      vel *= 0.93;
      user += vel;
      if (Math.abs(vel) < 0.002) {
        const home = Math.round(user / TURN) * TURN;
        user += (home - user) * Math.min(1, dt * 2.5);
      }
    }
    const idle = reduce ? 0 : Math.sin(clock.elapsedTime * 0.5) * MOVE.idle;
    spin.rotation.x = lerp(a.roll, b.roll, t) + gust.roll + user + (idle - follow.y * 0.5) * calm;
    renderer.render(scene, camera);
  }

  // 本文（縦にしたシャフトの右を流れる部分）を過ぎて、半透明の本文（.pbody）が画面を覆ったら、最後の絵のまま描くのを休む
  const cover = document.querySelector('.pbody');
  let running = false;
  const loop = () => {
    if (document.hidden || (cover && cover.getBoundingClientRect().top < 0)) { running = false; return; }
    frame();
    requestAnimationFrame(loop);
  };
  const start = () => { if (!running) { running = true; clock.getDelta(); requestAnimationFrame(loop); } };
  addEventListener('scroll', start, { passive: true });
  document.addEventListener('visibilitychange', start);
  // 出し始め：見えないうちに 1 回描いて、シェーダーの準備とテクスチャの転送を済ませる。
  // ページ移動のクロスフェードが終わってからフェードインする（重ねると、切り替わりの瞬間にシャフトがちらつく）
  const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));
  Promise.race([Promise.all(loads), new Promise(r => setTimeout(r, 8000))])
    .then(() => { frame(); return Promise.race([window.p3dReveal, new Promise(r => setTimeout(r, 1500))]); })
    .then(nextFrame).then(nextFrame)
    .then(() => {
      box.classList.add('ready');
      start();
    });
})();
