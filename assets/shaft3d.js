// シャフトの 3D（形・テクスチャ・光）。製品一覧の舞台（finder.js）と、製品カードの 3D（lucards.js）で使う
// 作りは kv.js の makeShaft と同じ。KV_DATA（鎬BLUE・RS1.0）と LINEUP_DATA（ほかの 11 本）から作る
window.Shaft3D = () => {
  const THREE = window.THREE, D = window.KV_DATA, LD = window.LINEUP_DATA;
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
  return { setup, lit, build, manager, TAN };
};
