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
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // トップの KV でシャフトを選んで来たときは、3D をふわっと出さずにすぐ出す。
  // KV が止まったときの画面（kv.js が保存）を、3D が描き終わるまで同じ位置に重ねておき、つながって見えるようにする
  let shot = null;
  try {
    if (sessionStorage.getItem('ng-from-kv')) {
      sessionStorage.removeItem('ng-from-kv');
      box.classList.add('instant');
      const url = sessionStorage.getItem('ng-kv-shot');
      sessionStorage.removeItem('ng-kv-shot');
      if (url && scrollY === 0) {
        shot = new Image();
        shot.className = 'p3d-shot';
        shot.alt = '';
        shot.src = url;
        canvas.after(shot);
      }
    }
  } catch (e) { /* 使えなければふつうに出す */ }
  const dropShot = () => { if (!shot) return; const s = shot; shot = null; s.classList.add('off'); setTimeout(() => s.remove(), 500); };

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    box.classList.add('no3d');
    dropShot();
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

  // ---------- スクロールで切り替わるカット ----------
  const wx = mm => (mm - LEN / 2) * U;   // シャフト上の位置（mm）→ ワールド x
  const shots = KIND === 'rafale'
    ? (() => {
      // 裏面の筆記体とシールは、正面から約 0.33 周の位置
      const LOGO = L.pos.logo, LABEL = L.pos.label, SCRIPT = X0 + 120, SEAL = X0 + 29, BACK = -2.6389;
      return [
        { look: [0, 0, 0], off: [0, 1.4, 14], tilt: -0.16, roll: 0 },
        { look: [wx(LOGO), 0, 0], off: [0, 0.06, 3.2], tilt: 0, roll: 0 },
        { look: [wx(LABEL), 0, 0], off: [0.1, 0.05, 2.4], tilt: 0, roll: 0 },
        { look: [wx(SCRIPT), 0, 0], off: [0.1, 0.05, 2.0], tilt: 0, roll: BACK },
        { look: [wx(SEAL + 10), 0, 0], off: [0.12, 0.04, 1.3], tilt: 0, roll: BACK },
        { look: [0, 0, 0], off: [-4, 2.6, 12.5], tilt: -0.3, roll: Math.PI * 2 },
      ];
    })()
    : (() => {
      // ロゴ・ラベル・先端シール・手元のシール（シールは裏側）
      const LOGO = X0 + 140, LABEL = X0 + L.b_mm - 60, TIP = LEN - 140, SEAL = X0 + 12;
      return [
        { look: [0, 0, 0], off: [0, 1.4, 14], tilt: -0.16, roll: 0 },
        { look: [wx(LOGO), 0, 0], off: [0, 0.14, 1.9], tilt: 0, roll: 0 },
        { look: [wx(LABEL), 0, 0], off: [0.1, 0.08, 0.95], tilt: 0, roll: 0 },
        { look: [wx(TIP), 0, 0], off: [-0.1, 0.07, 0.85], tilt: 0, roll: 0 },
        { look: [wx(SEAL + 25), 0, 0], off: [0.15, 0.05, 0.75], tilt: 0, roll: Math.PI },
        { look: [0, 0, 0], off: [-4, 2.6, 12.5], tilt: -0.3, roll: Math.PI * 2 },
      ];
    })();
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t * t * (3 - 2 * t);
  const look = new THREE.Vector3(), off = new THREE.Vector3();

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

  let distScale = 1;
  function resize() {
    const w = innerWidth, h = innerHeight, aspect = w / h;
    renderer.setSize(w, h, false);
    camera.aspect = aspect;
    distScale = aspect < 1.6 ? Math.min(4, 1.75 / aspect) : 1;   // 縦長の画面では引いて、横の見える幅を保つ
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  const clock = new THREE.Clock();
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    // スクロールの量は 3D の区間（.p3d-track）だけで数える
    const max = track.offsetTop + track.offsetHeight - innerHeight;
    const s = max > 0 ? Math.min(Math.max(scrollY / max, 0), 1) * (shots.length - 1) : 0;
    const i = Math.min(Math.floor(s), shots.length - 2);
    const t = ease(s - i);
    const a = shots[i], b = shots[i + 1];
    look.set(...a.look.map((v, k) => lerp(v, b.look[k], t)));
    off.set(...a.off.map((v, k) => lerp(v, b.off[k], t))).multiplyScalar(distScale);
    camera.position.copy(look).add(off);
    camera.lookAt(look);
    // 見ている位置を支点に傾ける（寄りのカットでもシャフトが画面から外れない）
    const k = Math.min(1, dt * 4);
    follow.x += ((reduce ? 0 : mouse.x) - follow.x) * k;
    follow.y += ((reduce ? 0 : mouse.y) - follow.y) * k;
    root.position.x = look.x;
    spin.position.x = -look.x;
    root.rotation.x = lerp(a.tilt, b.tilt, t);
    root.rotation.y = follow.x * 0.22;
    root.rotation.z = -follow.y * 0.08;
    if (drag === null) {
      vel *= 0.93;
      user += vel;
      if (Math.abs(vel) < 0.002) {
        const home = Math.round(user / (Math.PI * 2)) * Math.PI * 2;
        user += (home - user) * Math.min(1, dt * 2.5);
      }
    }
    const idle = reduce ? 0 : Math.sin(clock.elapsedTime * 0.5) * 0.12;
    spin.rotation.x = lerp(a.roll, b.roll, t) + user + idle - follow.y * 0.9;
    renderer.render(scene, camera);
  }

  // 3D の区間を過ぎたら本文に隠れるので、描くのを休む
  let running = false;
  const loop = () => {
    const max = track.offsetTop + track.offsetHeight - innerHeight;
    if (document.hidden || scrollY > max + innerHeight) { running = false; return; }
    frame();
    requestAnimationFrame(loop);
  };
  const start = () => { if (!running) { running = true; clock.getDelta(); requestAnimationFrame(loop); } };
  addEventListener('scroll', start, { passive: true });
  document.addEventListener('visibilitychange', start);
  Promise.race([Promise.all(loads), new Promise(r => setTimeout(r, 8000))]).then(() => {
    box.classList.add('ready');
    start();
    // 3D の最初の 1 コマが出たら、重ねておいた KV の画面を外す
    requestAnimationFrame(() => requestAnimationFrame(dropShot));
  });
})();
