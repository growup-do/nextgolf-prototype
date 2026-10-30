// トップのキービジュアル：鎬BLUE と Rafale RS1.0 の 3D シャフトが交差する（テクスチャは build_tex_kv.py で作る）
// ・マウスの位置で、シーン全体の角度が少し変わる
// ・SHINOGI（ロゴ・ボタン・シャフト）にカーソルを合わせると、鎬が 150% に拡大して手前に迫り、
//   Rafale は小さくなって奥へ下がり、シャフトもロゴ類も薄くなる（Rafale に合わせたときはその逆）。背景は明るいまま
// ・製品ページへ移るときに、そのシリーズの暗い背景（製品ページの最初の画面と同じ）が現れる
// three.js（assets/three.js）と素材（assets/kv-data.js）は、file:// で開いても読めるよう通常の <script> で読み込む
(() => {
  const kv = document.querySelector('.kv3d');
  const THREE = window.THREE, D = window.KV_DATA;
  if (!kv || !THREE || !D) return;
  const canvas = kv.querySelector('canvas');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const noHover = matchMedia('(hover: none)').matches;

  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t * t * (3 - 2 * t);

  let renderer;
  try {
    // preserveDrawingBuffer：ページを移るときのクロスフェード（View Transition）が撮る画面に、シャフトが写るようにする（ないと一瞬消える）
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  } catch (e) {
    kv.classList.add('no3d', 'ready');
    document.documentElement.classList.add('no3d');
    return;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  // 奥の面に落ちる、ぼけた影（明るい背景で奥行きを出す）
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  canvas.addEventListener('webglcontextlost', e => e.preventDefault());

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new window.RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 200);

  const loads = [];
  const loader = new THREE.TextureLoader();
  function texture(src) {
    let t;
    loads.push(new Promise(r => { t = loader.load(src, r, undefined, r); }));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  }
  const srgb = ([r, g, b]) => new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
  // 塗装＋クリア塗装の質感（3D デモ・動画と同じ）。消えていく動きのため半透明にできるようにしておく
  const paint = opts => new THREE.MeshPhysicalMaterial({
    roughness: 0.42, metalness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 0.9, transparent: true, ...opts,
  });

  // シャフト全体を傾けるグループ（マウスの位置で角度を変える）
  const world = new THREE.Group();
  scene.add(world);

  // 1 unit = 100mm。テーパーのついたチューブを区間ごとに作り、テクスチャを貼る（動画と同じ作り）
  const U = 0.01;
  function makeShaft(L, parts) {
    const LEN = L.length, X0 = L.x0;
    const knots = [[0, L.d_butt], [X0, L.d_wrap_l], [X0 + L.wrap_mm, L.d_wrap_r], [LEN, L.d_tip]];
    const radius = mm => {
      for (let i = 1; i < knots.length; i++) {
        const [xa, da] = knots[i - 1], [xb, db] = knots[i];
        if (mm <= xb) return (da + (db - da) * (mm - xa) / (xb - xa)) / 2;
      }
      return L.d_tip / 2;
    };
    function tube(mm0, mm1, nx, nr = 64) {
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
    const shaft = new THREE.Group(), mats = [], meshes = [];
    const add = (mesh, m) => { mesh.castShadow = true; mats.push(m); meshes.push(mesh); shaft.add(mesh); };
    for (const [a, b, nx, opts] of parts(X0, L)) {
      const m = paint(opts);
      add(new THREE.Mesh(tube(a, b, nx), m), m);
    }
    for (const [mm, dir] of [[0, -1], [LEN, 1]]) {
      const m = paint({ color: 0x1a1a1a });
      const cap = new THREE.Mesh(new THREE.CircleGeometry(radius(mm) * U, 32), m);
      cap.position.x = mm * U;
      cap.rotation.y = dir * Math.PI / 2;
      add(cap, m);
    }
    shaft.position.x = -LEN / 2 * U;
    const spin = new THREE.Group();   // シャフトの軸まわりの回転
    spin.add(shaft);
    const root = new THREE.Group();   // 位置・傾き・大きさ
    root.add(spin);
    world.add(root);
    return { root, spin, mats, meshes, half: LEN / 2 * U };
  }

  const shin = makeShaft(D.layShinogi, (X0, L) => {
    const B = L.b_mm, half = X0 + B / 2, t = D.texShinogi;
    return [
      [0, X0, 40, { color: srgb(L.grey) }],
      [X0, half, 160, { map: texture(t.B1) }],
      [half, X0 + B, 160, { map: texture(t.B2), metalness: 0.2 }],
      [X0 + B, L.length, 120, { map: texture(t.C), metalness: 0.3, roughness: 0.38 }],
    ];
  });
  // Rafale RS1.0 は黒い地。手元と先端の無地の区間も地の色で塗る
  const raf = makeShaft(D.layRafale, (X0, L) => {
    const third = L.b_mm / 3, o = { roughness: 0.32, metalness: 0.2 }, t = D.texRafale;
    return [
      [0, X0, 40, { color: srgb(L.body), ...o }],
      [X0, X0 + third, 160, { map: texture(t.R1), ...o }],
      [X0 + third, X0 + third * 2, 160, { map: texture(t.R2), ...o }],
      [X0 + third * 2, X0 + L.b_mm, 160, { map: texture(t.R3), ...o }],
      [X0 + L.b_mm, L.length, 100, { color: srgb(L.body), ...o }],
    ];
  });

  // 照明：上手前からのキーライト（影を落とす）と、空と床の照り返し
  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(2.5, 6, 10);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 14;
  key.shadow.blurSamples = 20;
  Object.assign(key.shadow.camera, { left: -16, right: 16, top: 12, bottom: -14, near: 1, far: 34 });   // 拡大したときの影まで入る広さ
  scene.add(key);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9a9a, 0.7));
  // 影を受けるだけの透明な面（シャフトのうしろ）
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(80, 50), new THREE.ShadowMaterial({ opacity: 0.16 }));
  catcher.position.z = -2.4;
  catcher.receiveShadow = true;
  scene.add(catcher);

  // ---------- 画面の大きさに合わせた配置 ----------
  // 横長の画面では X を寝かせ、縦長の画面では立てる。2本の先端が画面に収まる距離にカメラを置く
  // 描く面（canvas）は KV より下へ EXT の割合だけ広げる。拡大したシャフトや影が KV の下で切れないように
  // （構図は KV の範囲で決め、はみ出した分も同じカメラで続けて描く。はみ出した部分は CSS で下へ向けて消していく）
  const EXT = 0.4;
  let A = 0.38, DIST = 13.5;
  function layout() {
    const w = kv.clientWidth, h = kv.clientHeight, asp = w / h;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(w, Math.round(h * (1 + EXT)), false);
    camera.aspect = asp;
    camera.setViewOffset(w, h, 0, 0, w, Math.round(h * (1 + EXT)));
    A = Math.atan(clamp(0.72 / asp, 0.4, 1.3));
    const t = Math.tan(THREE.MathUtils.degToRad(15)), m = asp < 1 ? 0.95 : 1.12;
    const ex = 11.2 * Math.cos(A) * m, ey = 11.2 * Math.sin(A) * m;
    DIST = Math.max(ex / (2 * t * asp), ey / (2 * t), 10);
    camera.updateProjectionMatrix();
  }
  layout();
  addEventListener('resize', layout);

  // ---------- 入力 ----------
  // focus：+1 で SHINOGI、-1 で Rafale、0 でどちらでもない
  // slide：ホバーのない端末のスライドショーで、いま見せている側（ホバーのある端末では 0）
  let target = 0, overUI = 0, overShaft = 0, slide = 0;
  const mouse = { x: 0, y: 0, tx: 0, ty: 0, in: false };
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const syncTarget = () => { if (!leaving) target = overUI || overShaft || slide; };

  // 製品ページへ移るとき：選んだシャフトを、画面の上で時計回りに 1 回転させながら、ゆっくり消していく。
  // 同時に、背景をそのシリーズの暗い背景（製品ページの最初の画面と同じ）へふわっと切り替え、消えきったらページを移る。
  // 製品ページでは、同じ背景の上にシャフトがふんわり現れる（product3d.js・site.css）
  const SPIN_MS = 1400, FADE_AT = 300, FADE_MS = 1000, TOTAL = SPIN_MS;
  let leaving = null;   // { f：+1 鎬 / -1 Rafale, href, t0：回し始めた時刻, done }
  function go(href, f) {
    if (leaving) return;
    leaving = { f, href, t0: null, done: false };
    target = f;
    kv.classList.add('leaving');
    document.documentElement.classList.add('kv-leaving');   // ヘッダーの色も、背景と同時に切り替える（遅れないように）
    if (reduce) { location.href = href; return; }
    setTimeout(() => { if (leaving && !leaving.done) { leaving.done = true; location.href = href; } }, TOTAL + 800);   // 描画が止まっても移れるように
  }
  // 戻るボタンで戻ってきたとき（ページがそのまま復元されたとき）は、元の状態に戻す
  addEventListener('pageshow', e => {
    if (e.persisted && leaving) {
      leaving = null; kv.classList.remove('leaving'); document.documentElement.classList.remove('kv-leaving');
      for (const v of ['--shb', '--rfb']) document.documentElement.style.setProperty(v, 0);
      syncTarget();
    }
  });
  kv.querySelectorAll('.kv-item').forEach(a => a.addEventListener('click', e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;   // 新しいタブで開くときは、そのまま
    e.preventDefault();
    go(a.href, +a.dataset.focus);
  }));

  kv.querySelectorAll('[data-focus]').forEach(el => {
    const f = +el.dataset.focus;
    el.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { overUI = f; syncTarget(); } });
    el.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { overUI = 0; syncTarget(); } });
    el.addEventListener('focus', () => { overUI = f; syncTarget(); });
    el.addEventListener('blur', () => { overUI = 0; syncTarget(); });
  });
  kv.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const r = kv.getBoundingClientRect();
    mouse.tx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
    mouse.ty = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
    mouse.in = true;
    // シャフトの上にカーソルがあるか（見えているほうだけ）。描く面は KV より縦に長いので、面の大きさで測る
    const c = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - c.left) / c.width) * 2 - 1, -(((e.clientY - c.top) / c.height) * 2 - 1));
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects([...shin.meshes, ...raf.meshes], false);
    overShaft = hits.length ? (shin.meshes.includes(hits[0].object) ? 1 : -1) : 0;
    kv.classList.toggle('on-shaft', !!overShaft);
    syncTarget();
  });
  kv.addEventListener('pointerleave', () => { mouse.tx = mouse.ty = 0; mouse.in = false; overShaft = 0; kv.classList.remove('on-shaft'); syncTarget(); });
  // シャフトをクリックしたら、その製品のページへ（描く面はクリックを通すので、KV で受ける。ロゴやボタンはそのまま）
  kv.addEventListener('click', e => {
    if (!overShaft || e.target.closest('a')) return;
    const a = kv.querySelector(`[data-focus="${overShaft}"]`);
    if (a) go(a.href, overShaft);
  });

  // ホバーのない端末（スマホ・タブレット）では、2 本が交差した状態は見せず、最初から SHINOGI のホバー状態で始めて、
  // SHINOGI ⇄ Rafale のホバー状態をスライドショーのように切り替える
  if (noHover && !reduce) {
    slide = target = 1;
    setInterval(() => { if (!document.hidden) { slide = -slide; syncTarget(); } }, 4000);
  }

  // ---------- ホバー時に、ロゴ・コピー・ボタンをシャフトに重ねない ----------
  // ホバーで拡大したシャフトの軸を画面に写して直線にし、ロゴのまとまり（ロゴ・BLUE・コピー・ボタン）の四隅が
  // その線に近すぎたら、線から離れる向きへずらす。ずらす量はホバーの進み具合に合わせる（ふだんの配置は変えない）。
  // 画面の外やヘッダーの下には出さない。画面の縦横比でシャフトの角度が変わっても、重ならない
  const GAP = 28;   // シャフトの縁からの余白（px）
  const items = [...kv.querySelectorAll('.kv-item')].map(el => ({ el, f: +el.dataset.focus, parts: [...el.querySelectorAll('.lg, .col, .copy, .go')], x: 0, y: 0 }));
  const pa = new THREE.Vector3(), pb = new THREE.Vector3();
  function shaftLine(s) {
    // 軸の両端（手元・先端）を画面の座標へ。描く面は KV より縦に長いので、面の大きさで換算する
    const r = canvas.getBoundingClientRect(), half = 5.6;
    const toScreen = v => { v.project(camera); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]; };
    const a = toScreen(s.spin.localToWorld(pa.set(-half, 0, 0))), b = toScreen(s.spin.localToWorld(pb.set(half, 0, 0)));
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    // 太さ：拡大して手前に出ているほど太く見える（直径およそ 14mm を、カメラからの距離で換算）
    const thick = 0.14 * s.root.scale.x * (r.height / (1 + EXT)) / (2 * Math.tan(THREE.MathUtils.degToRad(15)) * Math.max(1, camera.position.z - s.root.position.z));
    return { a, nx: -dy / len, ny: dx / len, thick };
  }
  function avoid(dt) {
    scene.updateMatrixWorld();
    const vw = innerWidth, vh = innerHeight, k = 1 - Math.exp(-dt * 6), hd = kv.querySelector('.kv-ui').getBoundingClientRect().top;
    for (const it of items) {
      const w = ease(clamp(it.f > 0 ? F : -F));   // この製品へのホバーの進み具合
      let tx = 0, ty = 0;
      if (w > 0.01) {
        const ln = shaftLine(it.f > 0 ? shin : raf);
        // まとまりの四隅（いまずらしている分は差し引いて、ずらす前の位置で測る）
        let l = Infinity, t = Infinity, rr = -Infinity, bb = -Infinity;
        for (const p of it.parts) {
          const b = p.getBoundingClientRect();
          if (!b.width) continue;
          l = Math.min(l, b.left); t = Math.min(t, b.top); rr = Math.max(rr, b.right); bb = Math.max(bb, b.bottom);
        }
        if (l < Infinity) {
          l -= it.x; rr -= it.x; t -= it.y; bb -= it.y;
          const side = Math.sign(ln.nx * ((l + rr) / 2 - ln.a[0]) + ln.ny * ((t + bb) / 2 - ln.a[1])) || 1;
          let near = Infinity;
          for (const [x, y] of [[l, t], [rr, t], [l, bb], [rr, bb]]) near = Math.min(near, side * (ln.nx * (x - ln.a[0]) + ln.ny * (y - ln.a[1])));
          const push = Math.max(0, GAP + ln.thick / 2 - near) * w;
          tx = ln.nx * side * push; ty = ln.ny * side * push;
          // 画面の外・ヘッダーの下へは出さない
          tx = clamp(tx, 12 - l, vw - 12 - rr);
          ty = clamp(ty, hd + 12 - t, vh - 12 - bb);
        }
      }
      it.x = lerp(it.x, tx, reduce ? 1 : k); it.y = lerp(it.y, ty, reduce ? 1 : k);
      it.el.style.setProperty('--ax', it.x.toFixed(1) + 'px');
      it.el.style.setProperty('--ay', it.y.toFixed(1) + 'px');
    }
  }

  // ---------- 1コマを描く ----------
  let F = target, last = null, clock = 0, out = 0, outT = 0;   // スライドショーの端末は、最初から SHINOGI のホバー状態
  const v3 = new THREE.Vector3();
  // vanish：製品ページへ移るときに、選んだシャフトを消していく割合（0→1）
  // out：FV から下へスクロールした進み具合（0→1。少し遅れてついていく）。2 本は左右対称にせず、別々の向き・速さで画面の外へ抜ける（薄くはしない）
  //  鎬：先に動き出し、速く左上へ抜ける。回転はゆっくり（刀を払うように、時計回りに半周）
  //  Rafale：少し遅れて動き出し、ゆっくり右下へ流れる。回転もゆっくり（風に流されるように、反時計回りに 3/10 周）
  // dir：抜けていく向き（右・上がプラス）、start・span：動き出す out と、抜けきるまでの out の幅、pow：加速のつけ方、
  // turn：画面の上での回転（周）、roll：軸まわりの回転（ラジアン）
  const EXIT = {
    shin: { dir: [-1, 1], start: 0.03, span: 0.6, pow: 1.5, turn: -0.5, roll: 2.4 },
    raf: { dir: [1, -1], start: 0.12, span: 0.88, pow: 1.2, turn: 0.3, roll: -0.5 },
  };
  // 抜けていく途中、画面の端まで来たら透明にしていく（奥の面に落ちる影が、シャフトが出たあとも画面に残らないように）
  const edgeFade = e => 1 - ease(clamp((e - 0.78) / 0.2));
  const exitOf = (x, out) => clamp((out - x.start) / x.span);
  function poseShaft(s, side, mine, other, turn = 0, vanish = 0, out = 0, x = EXIT.shin) {
    const k = ease(clamp(mine)), o = ease(clamp(other));
    const e = exitOf(x, out);
    // 2 本とも、手元を左・先端を右に向ける（シャフトの文字は手元から先端へ向かって刷られているので、こうすると正しい向きで読める）
    // 鎬は左上から右下へ、Rafale は左下から右上へ。2 本で X を作る
    const ang = (side > 0 ? -A : A) + x.turn * Math.PI * 2 * ease(e);
    s.root.rotation.set(0, 0, ang + turn);
    // 選ばれたほうは 150% に拡大して手前へ。もう一方は 70% に縮んで奥へ下がり、不透明度 20% まで薄くなる（ロゴ類と同じ）
    s.root.scale.setScalar(1 + 0.5 * k - 0.3 * o);
    // 斜めに出す量：その奥行きで見えている幅・高さの半分＋シャフトの長さの半分（回っているので、どちらの向きでも長さの半分）
    const z = side * -0.15 + 2.2 * k - 1.2 * o - 1.2 * ease(e);
    const hh = (DIST - z) * Math.tan(THREE.MathUtils.degToRad(15)), len = s.half * s.root.scale.x + 0.6;
    const m = Math.pow(e, x.pow);
    s.root.position.set(x.dir[0] * (hh * camera.aspect + len) * m, x.dir[1] * (hh + len) * m, z);
    s.spin.rotation.x = 0.3 + Math.sin(clock * 0.35 + side) * 0.18 * (1 - k) + k * 0.15 + x.roll * ease(e);
    const op = (1 - 0.8 * o) * (1 - vanish) * edgeFade(e);
    for (const mt of s.mats) { mt.opacity = op; mt.depthWrite = op > 0.98; }
    s.root.visible = op > 0.01;
    for (const me of s.meshes) me.castShadow = op > 0.4;
  }
  function frame(now) {
    const dt = last === null ? 0 : Math.min((now - last) / 1000, 0.05);
    last = now;
    clock += dt;
    const sm = 1 - Math.exp(-dt * (reduce ? 20 : 4.5));
    F = lerp(F, target, sm);
    if (Math.abs(F - target) < 0.001) F = target;
    const mp = 1 - Math.exp(-dt * 3);
    mouse.x = lerp(mouse.x, reduce ? 0 : mouse.tx, mp);
    mouse.y = lerp(mouse.y, reduce ? 0 : mouse.ty, mp);

    const sh = Math.max(F, 0), rf = Math.max(-F, 0);
    // 製品ページへ移る途中：選んだシャフトを、ゆっくり始まってゆっくり止まる、時計回りの 1 回転（q：0→1）。もう一方はそのまま消す。
    // マウスによる傾きと漂う動きは q に合わせて消し、止まったときに製品ページの最初の画面と同じ姿勢にする
    // q：シャフトの 1 回転（ゆっくり始まってゆっくり止まる）。vanish：シャフトが消えていく進み具合。bg：暗い背景へ切り替わる進み具合
    let q = 0, vanish = 0, bg = 0;
    if (leaving) {
      if (leaving.t0 === null) leaving.t0 = now;
      const el = now - leaving.t0, p = clamp(el / SPIN_MS);
      q = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      vanish = ease(p);
      bg = ease(clamp((el - FADE_AT) / FADE_MS));
    }
    const turn = -q * Math.PI * 2;   // 画面の奥を向いて見ているので、マイナスが時計回り
    // スクロールの進み具合は、少し遅れてついていく（止めたあとも 1 秒ほど動き続けて、余韻を残す）
    const sy = scrollY, op = reduce ? 1 : 1 - Math.exp(-dt * 2.6);
    outT = clamp(sy / (kv.clientHeight * 0.85));
    out = Math.abs(outT - out) < 0.0005 ? outT : lerp(out, outT, op);
    // 描く面はページより遅く上がる（視差）。すぐに画面の外へ出ず、その場で消えていくように見せる
    canvas.style.transform = `translate3d(0, ${(Math.min(sy, kv.clientHeight * 1.2) * 0.55).toFixed(1)}px, 0)`;
    poseShaft(shin, 1, sh, rf, leaving && leaving.f > 0 ? turn : 0, vanish, out, EXIT.shin);
    poseShaft(raf, -1, rf, sh, leaving && leaving.f < 0 ? turn : 0, vanish, out, EXIT.raf);
    // マウスの位置で、少しだけ角度が変わる（ゆっくり漂う動きも少し足す）。移るときは傾きを戻す
    const drift = reduce ? 0 : Math.sin(clock * 0.5) * 0.03, still = 1 - q;
    world.rotation.set((mouse.y * 0.16 + drift) * still, mouse.x * 0.26 * still, 0);
    camera.position.set(mouse.x * 0.35 * still, -mouse.y * 0.2 * still, DIST);
    camera.lookAt(v3.set(0, 0, 0));
    if (!leaving) avoid(dt);   // 移る途中はロゴ類が消えていくので、ずらさない
    catcher.material.opacity = 0.16 * (1 - vanish) * Math.max(edgeFade(exitOf(EXIT.shin, out)), edgeFade(exitOf(EXIT.raf, out)));   // 奥の影も、後から抜ける Rafale といっしょに消す

    // 背景（.kv-bg）は KV の外にあるので、ページ全体（html）に値を渡す。移るときは、選んだほうの暗い背景（製品ページの最初の画面と同じ）を出す
    const vars = document.documentElement.style;
    vars.setProperty('--sh', sh.toFixed(3));
    vars.setProperty('--rf', rf.toFixed(3));
    vars.setProperty('--shb', (leaving && leaving.f > 0 ? bg : 0).toFixed(3));
    vars.setProperty('--rfb', (leaving && leaving.f < 0 ? bg : 0).toFixed(3));
    vars.setProperty('--mx', (mouse.x * still).toFixed(3));
    vars.setProperty('--my', (mouse.y * still).toFixed(3));
    vars.setProperty('--kvout', out.toFixed(3));   // ロゴ類は、シャフトより先に上へ抜けて消える（site.css）
    renderer.render(scene, camera);
    // シャフトが消えきって、背景も切り替わったら製品ページへ
    if (leaving && !leaving.done && now - leaving.t0 >= TOTAL) {
      leaving.done = true;
      location.href = leaving.href;
    }
  }

  // 画面に見えているあいだだけ描く
  let visible = true, running = false;
  function loop(now) {
    if (!visible || document.hidden) { running = false; last = null; return; }
    frame(now);
    requestAnimationFrame(loop);
  }
  const start = () => { if (!running) { running = true; requestAnimationFrame(loop); } };
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) start(); }).observe(kv);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });

  const timeout = new Promise(r => setTimeout(r, 8000));
  Promise.race([Promise.all(loads), timeout]).then(() => {
    kv.classList.add('ready');
    start();
  });
})();
