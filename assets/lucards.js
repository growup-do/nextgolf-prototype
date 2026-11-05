// 製品カード（.lu）の上の段に、シャフトの柄のある部分を 3D で描く（製品一覧の「すべての製品」・製品詳細の「ほかの製品」）
// データ（three.js・kv-data.js・lineup-data.js・shaft3d.js）がまだないページでは、カードが画面に近づいてから読み込む（data-src にスクリプトの URL）
(() => {
  const cardCvs = [...document.querySelectorAll('.lu-3d')];
  if (!cardCvs.length) return;
  const start = () => {
  const THREE = window.THREE;
  if (!THREE || !window.KV_DATA || !window.LINEUP_DATA || !window.Shaft3D) return;
  const { setup, lit, build, manager, TAN, U } = window.Shaft3D();
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
  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(drawCards, 200); });
  };
  const need = (document.querySelector('[data-lu-src]')?.dataset.luSrc || '').split(' ').filter(Boolean)
    .filter(src => !({ 'three.js': window.THREE, 'kv-data.js': window.KV_DATA, 'lineup-data.js': window.LINEUP_DATA, 'shaft3d.js': window.Shaft3D })[src.split('/').pop().split('?')[0]]);   // もう読み込んであるものは除く
  if (!need.length) return start();
  const load = () => need.reduce((pr, src) => pr.then(() => new Promise((ok, ng) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ng; document.head.append(s); })), Promise.resolve()).then(start, () => {});
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: '600px 0px' });
  cardCvs.forEach(c => io.observe(c.closest('.lu') || c));
})();
