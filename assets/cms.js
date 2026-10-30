// お知らせ・試打会・取扱店を、表示のたびに microCMS から読み込んで描く
// 接続先と読み取り専用のキー、都道府県と地域の対応は cms-config.js（build_site.py が書き出す）の window.CMS
// 描く場所は data-cms の付いた要素。中身の HTML は build_site.py にあった旧 DB 版と同じ形
(() => {
  const C = window.CMS;
  if (!C) return;
  const WD = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = s => document.querySelector(`[data-cms="${s}"]`);
  const FAIL = '<div class="empty">読み込めませんでした。時間をおいて、もう一度お試しください。</div>';

  const get = async q => {
    const r = await fetch(`${C.base}/${q}`, { headers: { 'X-MICROCMS-API-KEY': C.key } });
    if (!r.ok) throw new Error(`${q} → ${r.status}`);
    return r.json();
  };
  // 100 件ずつしか返らないので、全件そろうまで続けて取る（同じページで何度も使うものは使い回す）
  const cache = {};
  const all = ep => cache[ep] ??= (async () => {
    let out = [], off = 0, total;
    do {
      const d = await get(`${ep}?limit=100&offset=${off}&orders=-date`);
      out = out.concat(d.contents); total = d.totalCount; off += 100;
    } while (off < total);
    return out;
  })();

  // microCMS の日時（UTC）を日本の日付に。比べるときは 'YYYY-MM-DD' の文字列で比べる
  const jst = iso => { const d = new Date(Date.parse(iso) + 9 * 3600e3); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), w: d.getUTCDay(), key: d.toISOString().slice(0, 10) }; };
  const TODAY = jst(new Date().toISOString()).key;
  const ymd = t => `${t.y}.${String(t.m).padStart(2, '0')}.${String(t.d).padStart(2, '0')}`;
  const text = h => (h || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');

  // ---------- 試打会 ----------
  // 旧サイトから移した試打会は、タイトルが「10月17日(土)　試打会開催」の形なので主催店入りに言い換え、会場は本文の「場所：」から拾う
  const ev = e => {
    const day = jst(e.eventDate || e.date);
    const cancel = e.title.includes('中止');
    const title = e.legacyId && e.host && !cancel ? `試打会開催（${e.host}主催）` : e.title;
    let place = e.venue || '';
    if (!place && e.legacyId) {
      const m = text(e.body).match(/場所：[\s　]*(.+)/);
      if (m) place = m[1].replace(/\s*\d{1,2}:\d{2}.*$/, '').trim();
    }
    const state = cancel ? 'cancel' : day.key < TODAY ? 'done' : 'soon';
    return { ...e, day, title, place, state };
  };
  const STATE = { cancel: '<span class="tag cancel">中止</span>', done: '<span class="tag gray">終了</span>', soon: '<span class="tag">開催予定</span>' };
  const evItem = (e, showState) =>
    `<a class="ev" href="event.html?id=${esc(e.id)}"><div class="d"><b>${e.day.m}.${String(e.day.d).padStart(2, '0')}</b><span>${WD[e.day.w]}</span></div>` +
    `<div>${showState ? STATE[e.state] + '<br>' : ''}<div class="tt">${esc(e.title)}</div>${e.place ? `<div class="pl">${esc(e.place)}</div>` : ''}</div></a>`;
  const NO_EVENT = '<div class="empty">現在、開催予定の試打会はありません。決まり次第お知らせします。</div>';
  const events = async () => {
    const list = (await all('events')).map(ev);
    const soon = list.filter(e => e.state === 'soon').sort((a, b) => a.day.key.localeCompare(b.day.key));   // 開催予定は近い順
    const past = list.filter(e => e.state !== 'soon').sort((a, b) => b.day.key.localeCompare(a.day.key));
    return { list, soon, past };
  };

  const drawEventsTop = async el => {
    const { soon, past } = await events();
    el.innerHTML = soon.length ? soon.slice(0, 3).map(e => evItem(e)).join('') : NO_EVENT + past.slice(0, 2).map(e => evItem(e, true)).join('');
  };
  const drawEventsList = async el => {
    const { soon, past } = await events();
    el.innerHTML = [['開催予定', soon], ['これまでの試打会', past]].map(([h, es]) =>
      `<div class="ev-group"><h2>${h}</h2>${es.length ? es.map(e => evItem(e, true)).join('') : NO_EVENT}</div>`).join('');
  };
  const drawEvent = async el => {
    const id = new URLSearchParams(location.search).get('id');
    const { list } = await events();
    const k = list.findIndex(e => e.id === id);
    if (k < 0) { el.innerHTML = '<div class="empty">この試打会は見つかりませんでした。</div><div class="back"><a class="more" href="events.html">試打会の一覧へ</a></div>'; return; }
    const e = list[k];
    // 中身が空白・改行だけの項目は出さない（空の行ができて、罫線が 2 本並んで見えるため）
    const row = (dt, dd) => dd && dd.replace(/<br>/g, '').trim() ? `<dt>${dt}</dt><dd>${dd}</dd>` : '';
    const info = '<dl class="ev-info">' + row('日程', `${e.day.y}年${e.day.m}月${e.day.d}日（${'日月火水木金土'[e.day.w]}）`) + row('時間', esc(e.time)) +
      row('主催', esc(e.host)) + row('会場', esc(e.place)) + row('住所', esc(e.address)) + row('問い合わせ', esc(e.contact).replace(/\n/g, '<br>')) + '</dl>';
    el.innerHTML = `<div class="meta">${STATE[e.state]}<span>${ymd(jst(e.date))} 掲載</span></div><h1>${esc(e.title)}</h1>${info}` +
      (e.body ? `<div class="body">${e.body}</div>` : '') +
      `<div class="back"><a class="more" href="events.html">試打会の一覧へ</a></div>`;
    setTitle(e.title);
  };

  // ---------- お知らせ ----------
  const nwItem = n => `<a class="nw" href="news-detail.html?id=${esc(n.id)}"><span class="dt">${ymd(jst(n.date))}</span><span class="t">${esc(n.title)}</span></a>`;
  const NO_NEWS = '<div class="empty">お知らせはまだありません。</div>';
  // トップのお知らせは多めに描いておき、試打会の列の高さに収まる件数だけ見せる（fitTops）
  const drawNewsTop = async el => { const l = await all('news'); el.innerHTML = l.length ? l.slice(0, 8).map(nwItem).join('') : NO_NEWS; };
  const drawNewsList = async el => { const l = await all('news'); el.innerHTML = l.length ? l.map(nwItem).join('') : NO_NEWS; };
  const drawNews = async el => {
    const id = new URLSearchParams(location.search).get('id');
    let n;
    try { n = id && await get(`news/${encodeURIComponent(id)}`); } catch (err) { n = null; }
    if (!n) { el.innerHTML = '<div class="empty">このお知らせは見つかりませんでした。</div><div class="back"><a class="more" href="news.html">お知らせの一覧へ</a></div>'; return; }
    el.innerHTML = `<div class="meta"><span>${ymd(jst(n.date))}</span></div><h1>${esc(n.title)}</h1><div class="body">${n.body}</div>` +
      '<div class="back"><a class="more" href="news.html">お知らせの一覧へ</a></div>';
    setTitle(n.title);
  };

  // 詳細ページ：タブの名前とパンくずの最後を、記事のタイトルにする
  const setTitle = t => {
    document.title = `${t}｜NEXT GOLF`;
    const cur = document.querySelector('.crumb .cur');
    if (cur) cur.textContent = t;
  };

  // ---------- 取扱店 ----------
  // 地域は都道府県から決める（cms-config.js の prefs）。並びは都道府県の順 → 並び順 → 旧サイトの番号
  const PREF = Object.fromEntries(C.prefs.map(p => [p.name, p]));
  const shops = async () => (await all('shops'))
    .map(s => ({ ...s, p: PREF[(s.pref || [])[0]] }))
    .filter(s => s.p)
    .sort((a, b) => a.p.id - b.p.id || (a.sort ?? 0) - (b.sort ?? 0) || (a.legacyId ?? 1e9) - (b.legacyId ?? 1e9));

  // 地図と地域ボタン：店のある県だけ押せるようにし、地域ごとの店の数を入れる
  const drawFind = async box => {
    const list = await shops();
    const byPref = {}, byArea = {};
    list.forEach(s => { byPref[s.p.id] = (byPref[s.p.id] || 0) + 1; byArea[s.p.area] = (byArea[s.p.area] || 0) + 1; });
    const base = box.dataset.base || '';
    box.querySelectorAll('path.pf.none[data-pid]').forEach(path => {
      const n = byPref[path.dataset.pid];
      if (!n) return;
      const a = document.createElementNS('http://www.w3.org/2000/svg', 'a');
      a.setAttribute('class', 'pf');
      a.setAttribute('href', `${base}#pref-${path.dataset.pid}`);
      a.setAttribute('aria-label', `${path.dataset.name}の取扱店（${n}店）`);
      a.dataset.name = path.dataset.name; a.dataset.n = n;
      path.replaceWith(a);
      path.removeAttribute('class');
      a.appendChild(path);
    });
    box.querySelectorAll('[data-area-n]').forEach(s => { s.textContent = byArea[s.dataset.areaN] || 0; });
  };

  // 新しいタブで開くリンクの印（四角から右上へ抜ける矢印）
  const drawShops = async el => {
    const list = await shops();
    el.innerHTML = C.areas.map(([aid, aname]) => {
      const inArea = list.filter(s => s.p.area === aid);
      const prefs = [...new Set(inArea.map(s => s.p.id))].map(pid => {
        const p = C.prefs.find(x => x.id === pid);
        const items = inArea.filter(s => s.p.id === pid).map(s =>
          `<div class="shop"><b>${esc(s.name)}</b>${s.trial ? '<span class="tag">試打できます</span>' : ''}` +
          `<p>${s.zip ? `〒${esc(s.zip)}　` : ''}${esc(s.address)}${s.tel ? `<br>TEL ${esc(s.tel)}` : ''}</p>` +
          (/^https?:\/\//.test(s.url || '') ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">WEBSITE</a>` : '') + '</div>').join('');
        return `<div class="pref" id="pref-${pid}"><h3>${esc(p.name)}</h3><div class="shops">${items}</div></div>`;
      }).join('');
      return `<section class="area" id="area-${aid}"><h2>${esc(aname)}<span>${inArea.length} SHOPS</span></h2>${prefs || '<div class=empty style=margin-top:24px>現在、この地域の取扱店はありません。</div>'}</section>`;
    }).join('');
    // 地図から #pref-13 などで来たときは、描き終えてからその県まで送る
    if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  };

  // ---------- 描く ----------
  const jobs = { 'events-top': drawEventsTop, 'events-list': drawEventsList, 'event': drawEvent,
                 'news-top': drawNewsTop, 'news-list': drawNewsList, 'news': drawNews, 'shops': drawShops };
  const tasks = Object.entries(jobs).map(([k, f]) => { const el = $(k); return el && f(el).catch(err => { console.error(err); el.innerHTML = FAIL; }); });
  document.querySelectorAll('.shopfind').forEach(box => tasks.push(drawFind(box).catch(err => console.error(err))));
  // トップの試打会とお知らせ：2 列のときは、お知らせを試打会の列の高さに収まる件数（3 件以上）だけ見せ、
  // 余った高さは両方の行の間に配って（CSS の .tops.fit）、2 つの列の下端をそろえる。1 列（スマホ）のときは 3 件
  const fitTops = () => {
    const box = document.querySelector('.tops'), ev = $('events-top'), nw = $('news-top');
    if (!box || !ev || !nw) return;
    box.classList.remove('fit');
    const rows = [...nw.querySelectorAll('.nw')];
    rows.forEach(r => { r.style.display = ''; });
    if (getComputedStyle(box).gridTemplateColumns.split(' ').length < 2) { rows.slice(3).forEach(r => { r.style.display = 'none'; }); return; }
    const bottom = ev.getBoundingClientRect().bottom;
    for (let i = rows.length - 1; i >= 3 && nw.getBoundingClientRect().bottom > bottom + 1; i--) rows[i].style.display = 'none';
    box.classList.add('fit');
  };
  // 読み込んだ行も、トップのフェードインの対象にする（site.js）
  Promise.all(tasks).then(() => {
    fitTops();
    window.NG?.tag();
    document.fonts?.ready.then(fitTops);
    let t;
    addEventListener('resize', () => { clearTimeout(t); t = setTimeout(fitTops, 150); });
  });
})();
