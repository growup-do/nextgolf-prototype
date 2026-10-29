// 3D のある製品ページ：スクロールに合わせて、シャフトの全体 → ロゴ → ラベル → … とカメラが寄っていく
// シャフトの形とテクスチャは KV と同じ（印刷データから作った assets/kv-data.js）。どちらのシャフトかは .p3d の data-shaft
// three.js と素材は、file:// で開いても読めるよう通常の <script> で読み込む
(() => {
  const box = document.querySelector('.p3d');
  const THREE = window.THREE, D = window.KV_DATA;
  if (!box || !THREE || !D) return;
  const KIND = box.dataset.shaft;               // 'shinogi' か 'rafale'
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
  const L = KIND === 'rafale' ? D.layRafale : D.layShinogi;
  const T = KIND === 'rafale' ? D.texRafale : D.texShinogi;
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
      const B = L.b_mm, half = X0 + B / 2;
      return [[0, X0, 40, { color: srgb(L.grey) }], [X0, half, 240, { map: texture(T.B1) }],
        [half, X0 + B, 240, { map: texture(T.B2), metalness: 0.2 }], [X0 + B, LEN, 160, { map: texture(T.C), metalness: 0.3, roughness: 0.38 }]];
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
  const shots = KIND === 'rafale'
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
    return k + ease(clamp01((f - 0.15) / 0.7));
  }

  const clock = new THREE.Clock();
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const s = Math.min(shotAt(scrollY), shots.length - 1);
    const i = Math.min(Math.floor(s), shots.length - 2), t = s - i;
    const a = shots[i], b = shots[i + 1];
    // 距離は対数で補間する（全体の引きから大写しまで、同じ速さで寄っていくように見せる）
    const d = Math.exp(lerp(Math.log(dist(a.d)), Math.log(dist(b.d)), t));
    // 'left'：縦にしたシャフトの位置（resize で計算）
    const sxOf = v => v === 'left' ? leftX : v;
    const sx = lerp(sxOf(a.sx), sxOf(b.sx), t), sy = lerp(a.sy, b.sy, t);
    // focus をシャフトの回転の中心に置き、その点が画面の (sx, sy) に来るようにカメラをずらす
    spin.position.x = -wx(lerp(a.focus, b.focus, t));
    const lx = -sx * 2 * d * TAN * aspect, ly = -sy * 2 * d * TAN;
    camera.position.set(lx, ly + d * 0.03, d);
    camera.lookAt(look.set(lx, ly, 0));
    // マウスの位置で、少しだけ角度を変える
    const k = Math.min(1, dt * 4);
    follow.x += ((reduce ? 0 : mouse.x) - follow.x) * k;
    follow.y += ((reduce ? 0 : mouse.y) - follow.y) * k;
    root.position.set(0, 0, 0);
    // 'kv'：鎬は左上から右下へ、Rafale は左下から右上へ（KV の X と同じ向き）
    const rzOf = v => v === 'kv' ? (KIND === 'rafale' ? kvA : -kvA) : v;
    // 最後の縦のカットでは、マウスと漂う動きで軸まわりに回さない（裏面のシールを正面に向けたままにする）
    const calm = 1 - clamp01(s - (shots.length - 2));
    // 縦にしたシャフトは画面の左に寄せるので、カメラからは右斜めに見える。その角度だけ軸まわりに回して、シールをカメラの真正面に向ける
    const face = Math.atan2(lx, d) * (1 - calm);
    root.rotation.set(lerp(a.tilt, b.tilt, t) + follow.y * 0.04, follow.x * 0.12 * calm + face, lerp(rzOf(a.rz), rzOf(b.rz), t));
    if (drag === null) {
      vel *= 0.93;
      user += vel;
      if (Math.abs(vel) < 0.002) {
        const home = Math.round(user / TURN) * TURN;
        user += (home - user) * Math.min(1, dt * 2.5);
      }
    }
    const idle = reduce ? 0 : Math.sin(clock.elapsedTime * 0.5) * 0.08;
    spin.rotation.x = lerp(a.roll, b.roll, t) + user + (idle - follow.y * 0.5) * calm;
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
