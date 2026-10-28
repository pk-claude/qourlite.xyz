/* Big screen. The host is the single source of truth: it keeps players, deeds,
   answers, cash and bids, and broadcasts a small state object to the phones. */
(function () {
  const { sound, confetti, countUp, qrSVG, esc, sleep } = FX;
  const M = window.MONO;
  const $ = id => document.getElementById(id);
  const ROOM = Live.room;
  const KEY = 'mono-host-' + ROOM;
  const joinQs = new URLSearchParams();
  if (ROOM !== Live.defRoom) joinQs.set('room', ROOM);
  if (Live.test) joinQs.set('test', Live.test);
  const JOIN_URL = location.origin + '/go/' + (joinQs.toString() ? '?' + joinQs : '');
  const REACTS = ['👏', '😂', '🤯', '🔥', '💸', '😱'];
  const LETTERS = ['A', 'B', 'C', 'D'];
  const MONEY = ['#cfe8c4', '#ffffff', '#f6c544', '#e2231a', '#9fd4f2'];
  const CHEST_DRAWS = 2;

  // ---------- steps ----------
  const steps = [{ v: 'lobby' }, { v: 'rules' }];
  M.quiz.forEach((it, i) => {
    steps.push({ v: 'roll', i }, { v: 'q', i }, { v: 'reveal', i });
    if (i === 2) steps.push({ v: 'board', after: 3 });
  });
  steps.push({ v: 'board', after: M.quiz.length }, { v: 'podium' }, { v: 'auction' });
  M.prizes.forEach((_, k) => steps.push({ v: 'lot', k }, { v: 'sold', k }));
  for (let k = 0; k < CHEST_DRAWS; k++) steps.push({ v: 'chest', k });
  steps.push({ v: 'end' });
  const qOf = st => (st && st.i != null ? M.quiz[st.i] : null);

  // ---------- persistent host state ----------
  const fresh = () => ({
    sid: Live.rid(6), pos: 0, players: {}, deeds: {}, hidden: {}, answers: {}, opened: {}, closed: {}, scored: {}, gained: {},
    prevRank: {}, bids: {}, lotOpened: {}, lotClosed: {}, sold: {}, chest: [], bingo: [], prizes: M.prizes.slice(), extra: {},
  });
  let H = Live.store.get(KEY, null) || fresh();
  const F = fresh();
  Object.keys(F).forEach(k => { if (H[k] == null) H[k] = F[k]; });
  const save = () => Live.store.set(KEY, H);

  // ---------- live relay ----------
  let live = { publishState() {}, status: () => ({}), channels: [] };
  function connect() {
    live = Live.create({ room: ROOM, role: 'host', onMsg: (k, m) => k === 'up' && onUp(m), onStatus: renderRelays });
    renderRelays(live.status());
    broadcast(true);
  }
  function renderRelays(st) {
    $('hudRelays').innerHTML = 'Live ' + live.channels.map(id => `<span class="relay ${(st && st[id]) || 'connecting'}" title="${id}: ${(st && st[id]) || ''}"></span>`).join('');
    const up = st ? Object.values(st).filter(s => s === 'up').length : 0;
    $('relayDetail').textContent = up
      ? `Live play is ON (${up} of ${live.channels.length} relays connected). Room: ${ROOM}`
      : 'Live play is not connected yet. You can still run it as a show of hands: read the question, ask the room, press Next to reveal.';
  }

  function stateForPhones() {
    const st = steps[H.pos];
    const out = { t: Date.now(), sid: H.sid, ph: st.v, n: Object.keys(H.players).length };
    const r = ranking();
    const it = qOf(st);
    out.me = {};
    r.forEach((p, idx) => { out.me[p.pid] = [p.cash, idx + 1, it ? ((H.gained[it.id] || {})[p.pid] || 0) : 0, p.won != null ? 1 : 0]; });
    out.dd = Object.keys(H.deeds);
    out.bg = H.bingo.map(b => b.pid);
    if (it) {
      const sp = M.board[it.at];
      out.q = { id: it.id, i: st.i, of: M.quiz.length, tag: it.tag, sp: sp.n, c: sp.c ? M.colors[sp.c] : '', dbl: !!it.double };
      if (st.v !== 'roll') {
        const open = isOpen(it.id);
        Object.assign(out.q, { q: it.q, opts: it.opts, open });
        if (open) out.q.left = Math.max(0, (H.opened[it.id] + limitOf(it) * 1000 - Date.now()) / 1000);
        out.ap = Object.keys(H.answers[it.id] || {});
      }
      if (st.v === 'reveal') out.rv = { a: it.a, fact: it.fact };
    }
    if (['auction', 'lot', 'sold', 'end'].includes(st.v)) out.prizes = H.prizes;
    if (st.v === 'lot' || st.v === 'sold') {
      const k = st.k, open = lotOpen(k);
      out.lot = { k, open, bp: Object.keys(H.bids[k] || {}) };
      if (open) out.lot.left = Math.max(0, (H.lotOpened[k] + (M.bidSeconds + (H.extra['lot' + k] || 0)) * 1000 - Date.now()) / 1000);
      if (st.v === 'sold') out.lot.sold = soldInfo(k);
    }
    if (st.v === 'chest' || st.v === 'end') out.chest = H.chest.map(pid => ({ pid, nm: (H.players[pid] || {}).nm, av: (H.players[pid] || {}).av }));
    return out;
  }
  function soldInfo(k) {
    const s = H.sold[k];
    if (!s) return null;
    const p = H.players[s.pid] || {};
    return { pid: s.pid, nm: p.nm, av: p.av, amt: s.amt };
  }
  let lastSent = 0, sendTimer = null;
  function broadcast(force) {
    const now = Date.now();
    clearTimeout(sendTimer);
    if (!force && now - lastSent < 350) { sendTimer = setTimeout(() => broadcast(true), 350); return; }
    lastSent = now;
    const st = steps[H.pos], it = qOf(st);
    const phaseKey = `${st.v}:${H.pos}:${it ? isOpen(it.id) : ''}:${st.k != null ? lotOpen(st.k) : ''}:${Math.floor(now / 240000)}`;
    live.publishState(stateForPhones(), phaseKey);
  }
  setInterval(() => broadcast(true), 10000);

  // ---------- incoming ----------
  const BAD = /\b(fuck\w*|shit\w*|bitch\w*|cunt\w*|dick\w*|cock\w*|puss\w*|asshole\w*|bastard\w*|whore\w*|slut\w*|nigg\w*|fag\w*|retard\w*)\b/gi;
  const clean = s => String(s).replace(BAD, m => m[0] + '*'.repeat(m.length - 1));
  function addPlayer(m) {
    if (!m.p || typeof m.p !== 'string') return null;
    const pid = m.p.slice(0, 8);
    const nm = clean(String(m.nm || 'Player').slice(0, 18)) || 'Player';
    const av = M.tokens.includes(m.av) ? m.av : M.tokens[0];
    const p = H.players[pid];
    if (!p) {
      H.players[pid] = { nm, av, cash: M.start, j: Date.now() };
      save(); onJoinVisual(pid); broadcast();
    } else if (p.nm !== nm || p.av !== av) {
      p.nm = nm; p.av = av; save(); if (steps[H.pos].v === 'lobby') renderCrowd();
    }
    return pid;
  }
  function onUp(m) {
    const pid = addPlayer(m);
    if (!pid) return;
    if (m.k === 'ans') onAnswer(pid, m);
    else if (m.k === 'deed') onDeed(pid, m.d);
    else if (m.k === 'bid') onBid(pid, m);
    else if (m.k === 'bingo') onBingo(pid);
    else if (m.k === 're' && REACTS[m.e] != null) floatReaction(REACTS[m.e]);
  }
  function onDeed(pid, raw) {
    const d = DEED.tidy(raw);
    if (!d) return;
    ['prop', 'tag', 'chance'].forEach(k => (d[k] = clean(d[k])));
    d.rent = d.rent.map(clean);
    const isNew = !H.deeds[pid];
    H.deeds[pid] = d; save();
    $('stDeeds').textContent = Object.values(H.deeds).filter(x => x.by === 'ai').length;
    if (steps[H.pos].v === 'lobby') { spotQueue.unshift(pid); if (isNew || spotPid === pid) nextSpot(true); }
    broadcast();
  }
  function onAnswer(pid, m) {
    const it = qOf(steps[H.pos]);
    if (!it || it.id !== m.q || !isOpen(it.id) || steps[H.pos].v !== 'q') return;
    const box = (H.answers[it.id] = H.answers[it.id] || {});
    if (box[pid]) return; // first answer counts
    const a = Number(m.a);
    if (!(a >= 0 && a < it.opts.length)) return;
    box[pid] = { a, ms: Math.max(0, Date.now() - H.opened[it.id]) };
    save(); renderAnswered(it, true); broadcast();
    const n = Object.keys(H.players).length;
    if (n > 0 && Object.keys(box).length >= n) setTimeout(() => { if (qOf(steps[H.pos]) === it && isOpen(it.id)) timeUp(it); }, 900);
  }
  function onBid(pid, m) {
    const st = steps[H.pos];
    const k = Number(m.lot);
    if (st.v !== 'lot' || st.k !== k || !lotOpen(k)) return;
    const p = H.players[pid];
    if (p.won != null) return;
    const amt = Math.floor(Number(m.amt));
    if (!(amt >= 10 && amt <= p.cash)) return;
    const box = (H.bids[k] = H.bids[k] || {});
    const first = !box[pid];
    box[pid] = { amt, t: Date.now() };
    save(); renderBidMeter(k, first); broadcast();
  }

  function onBingo(pid) {
    if (H.bingo.some(b => b.pid === pid)) return;
    H.bingo.push({ pid, t: Date.now() }); save();
    const p = H.players[pid], n = H.bingo.length;
    toast(`<b>BINGO!</b> ${p.av} ${esc(p.nm)} ${n === 1 ? 'got there first' : 'is bingo #' + n}`, 'big');
    renderCount(); sound.play('fanfare'); confetti({ count: 120, y: 0.9, colors: MONEY });
    broadcast();
  }

  // ---------- timing ----------
  const limitOf = it => M.limit + (H.extra[it.id] || 0);
  const isOpen = qid => !!H.opened[qid] && !H.closed[qid];
  const lotOpen = k => !!H.lotOpened[k] && !H.lotClosed[k];
  let tickTimer = null;
  function timeUp(it) {
    if (H.closed[it.id]) return;
    H.closed[it.id] = Date.now(); save();
    const idx = steps.findIndex(s => s.v === 'reveal' && qOf(s) === it);
    if (steps[H.pos].v === 'q' && qOf(steps[H.pos]) === it) go(idx);
  }
  function lotUp(k) {
    if (H.lotClosed[k]) return;
    H.lotClosed[k] = Date.now(); save();
    const st = steps[H.pos];
    if (st.v === 'lot' && st.k === k) go(H.pos + 1);
  }
  function runTimer(arcId, numId, startAt, totalFn, onEnd) {
    clearInterval(tickTimer);
    const C = 2 * Math.PI * 44;
    const arc = $(arcId), num = $(numId);
    arc.style.strokeDasharray = C;
    let lastSec = -1;
    const f = () => {
      const total = totalFn() * 1000;
      const left = Math.max(0, startAt + total - Date.now());
      const sec = Math.ceil(left / 1000);
      num.textContent = sec;
      arc.style.strokeDashoffset = C * (1 - left / total);
      arc.parentNode.parentNode.classList.toggle('urgent', sec <= 5);
      if (sec !== lastSec && sec <= 5 && sec > 0) sound.play('tick');
      lastSec = sec;
      if (left <= 0) { clearInterval(tickTimer); onEnd(); }
    };
    f(); tickTimer = setInterval(f, 200);
  }

  // ---------- money ----------
  function score(it) {
    if (H.scored[it.id]) return;
    H.scored[it.id] = true;
    const box = H.answers[it.id] || {};
    const g = (H.gained[it.id] = {});
    const lim = limitOf(it) * 1000;
    Object.keys(H.players).forEach(pid => {
      const ans = box[pid];
      if (!ans || ans.a !== it.a) return;
      let pts = Math.round((M.pay.base + M.pay.speed * Math.max(0, 1 - ans.ms / lim)) / 10) * 10;
      if (it.double) pts *= 2;
      H.players[pid].cash += pts; g[pid] = pts;
    });
    save();
  }
  function settle(k) {
    if (H.sold[k] !== undefined) return;
    const bids = Object.entries(H.bids[k] || {}).filter(([pid, b]) => H.players[pid] && H.players[pid].won == null && b.amt <= H.players[pid].cash);
    bids.sort((a, b) => b[1].amt - a[1].amt || a[1].t - b[1].t);
    if (!bids.length) { H.sold[k] = null; save(); return; }
    const [pid, b] = bids[0];
    H.players[pid].cash -= b.amt;
    H.players[pid].won = k;
    H.sold[k] = { pid, amt: b.amt };
    save();
  }
  const ranking = () => Object.entries(H.players).map(([pid, p]) => ({ pid, ...p })).sort((a, b) => b.cash - a.cash || a.j - b.j);
  const fmt = v => '$' + Math.round(v).toLocaleString();

  // ---------- navigation ----------
  let busy = 0; // increments on every navigation so stale animations stop
  function go(i, { silent } = {}) {
    i = Math.max(0, Math.min(steps.length - 1, i));
    const leaving = steps[H.pos];
    if (leaving.v === 'board' || leaving.v === 'podium') ranking().forEach((p, idx) => (H.prevRank[p.pid] = idx));
    H.pos = i; save();
    busy++;
    render(silent);
    broadcast(true);
  }
  function next() {
    const st = steps[H.pos], it = qOf(st);
    if (st.v === 'q' && it && isOpen(it.id)) { timeUp(it); return; }
    if (st.v === 'lot' && lotOpen(st.k)) { lotUp(st.k); return; }
    go(H.pos + 1);
  }
  function prev() {
    let i = H.pos - 1;
    const s = steps[i];
    if (s && s.v === 'q' && H.closed[qOf(s).id]) i--; // do not re-open a closed question
    if (s && s.v === 'lot' && H.lotClosed[s.k]) i--;
    go(i, { silent: true });
  }

  // ---------- board ----------
  const ICON = { chest: '📦', chance: '❓', rail: '🚂', util: '⚡', tax: '💸' };
  const CORNER_ICON = ['➡️', '🚔', '🅿️', '👮'];
  function gridPos(p) {
    if (p <= 10) return { r: 11, c: 11 - p, side: 'b' };
    if (p < 20) return { r: 11 - (p - 10), c: 1, side: 'l' };
    if (p <= 30) return { r: 1, c: 1 + (p - 20), side: 't' };
    return { r: 1 + (p - 30), c: 11, side: 'r' };
  }
  function buildBoard() {
    const b = $('board');
    M.board.forEach((s, p) => {
      const g = gridPos(p);
      const d = document.createElement('div');
      d.className = `sp side-${g.side} ${s.t === 'corner' ? 'corner' : ''}`;
      d.id = 'sp' + p;
      d.style.gridRow = g.r; d.style.gridColumn = g.c;
      if (s.c) d.style.setProperty('--c', M.colors[s.c]);
      const icon = s.t === 'corner' ? CORNER_ICON[p / 10] : ICON[s.t] || '';
      d.innerHTML = `${s.c ? '<span class="band"></span>' : ''}<span class="lbl">${icon ? `<span class="ic">${icon}</span>` : ''}<span>${esc(s.n)}</span>${s.sub ? `<span class="pr">${esc(s.sub)}</span>` : s.p ? `<span class="pr">$${s.p}</span>` : ''}</span>`;
      b.appendChild(d);
    });
  }
  function placeWalker(p) {
    const el = $('sp' + p), w = $('walker');
    if (!el) return;
    w.style.left = (el.offsetLeft + el.offsetWidth / 2 + 3) + 'px';
    w.style.top = (el.offsetTop + el.offsetHeight / 2 + 3) + 'px';
  }
  const tokenAt = i => (i > 0 ? M.quiz[i - 1].at : 0); // where the token sits before roll i
  function markDone() {
    M.quiz.forEach(it => $('sp' + it.at).classList.toggle('done', !!H.scored[it.id]));
    document.querySelectorAll('.sp.hit').forEach(e => e.classList.remove('hit'));
  }

  // dice
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const FACE_ROT = { 1: [0, 0], 6: [0, 180], 2: [0, -90], 5: [0, 90], 3: [-90, 0], 4: [90, 0] };
  function buildDie(el) {
    el.innerHTML = [1, 2, 3, 4, 5, 6].map(n => `<div class="face f${n}">${Array.from({ length: 9 }, (_, k) => PIPS[n].includes(k) ? '<i></i>' : '<span></span>').join('')}</div>`).join('');
  }
  let spins = 0;
  function showDie(el, n, spin) {
    const [x, y] = FACE_ROT[n];
    if (spin) spins += 2;
    el.style.transform = `rotateX(${x + 360 * spins}deg) rotateY(${y + 360 * spins}deg)`;
  }
  function diceFor(dist, seed) {
    // deterministic split so going back and forth shows the same dice
    const lo = Math.max(1, dist - 6), hi = Math.min(6, dist - 1);
    const d1 = lo + (seed % (hi - lo + 1));
    return [d1, dist - d1];
  }

  // ---------- rendering ----------
  const views = ['vStage', 'vQ', 'vBoard', 'vPodium', 'vAuction', 'vChest', 'vEnd'];
  function show(id) {
    views.forEach(v => $(v).classList.toggle('on', v === id));
    $('miniJoin').classList.toggle('hidden', id === 'vPodium' || (id === 'vStage' && steps[H.pos].v === 'lobby'));
  }
  function pane(group, id) { document.querySelectorAll(group).forEach(e => e.classList.toggle('on', e.id === id)); }
  function render(silent) {
    clearInterval(tickTimer);
    clearInterval(spotTimer);
    const st = steps[H.pos];
    const it = qOf(st);
    $('hudSeg').textContent = it ? `Question ${st.i + 1} of ${M.quiz.length}: ${M.board[it.at].n}` : st.v === 'lot' || st.v === 'sold' ? `Prize Auction: lot ${st.k + 1} of ${H.prizes.length}` : 'Monopoly: All-Hands Edition';
    if (st.v === 'lobby' || st.v === 'rules' || st.v === 'roll') {
      show('vStage'); markDone();
      if (st.v === 'lobby') { pane('.center-pane', 'cLobby'); pane('.side-pane', 'sLobby'); placeWalker(0); renderCrowd(); startSpot(); }
      else if (st.v === 'rules') { pane('.center-pane', 'cRules'); pane('.side-pane', 'sLobby'); placeWalker(0); renderCrowd(); startSpot(); if (!silent) sound.play('whoosh'); }
      else renderRoll(st, silent);
    }
    else if (st.v === 'q' || st.v === 'reveal') {
      if (st.v === 'q' && !H.opened[it.id]) { H.opened[it.id] = Date.now(); save(); }
      if (st.v === 'reveal') { if (!H.closed[it.id]) H.closed[it.id] = Date.now(); score(it); }
      renderQ(it, st, silent);
    }
    else if (st.v === 'board') renderBoardView(st, silent);
    else if (st.v === 'podium') renderPodium(silent);
    else if (st.v === 'auction') renderAuctionIntro(silent);
    else if (st.v === 'lot') renderLot(st.k, silent);
    else if (st.v === 'sold') renderSold(st.k, silent);
    else if (st.v === 'chest') renderChest(st.k, silent);
    else if (st.v === 'end') renderEnd(silent);
  }
  function renderCount() {
    const ids = Object.keys(H.players), bots = ids.filter(id => id.startsWith('bot')).length;
    $('hudCount').textContent = ids.length + (bots ? ` (${bots} bots)` : '');
    $('stPlayers').textContent = ids.length;
    $('stDeeds').textContent = Object.values(H.deeds).filter(x => x.by === 'ai').length;
    $('stBingo').textContent = H.bingo.length;
  }

  // lobby
  function renderCrowd() {
    renderCount();
    $('crowd').innerHTML = ranking().sort((a, b) => b.j - a.j).slice(0, 48).map(p => `<span class="chip">${p.av} ${esc(p.nm)}</span>`).join('');
  }
  function onJoinVisual(pid) {
    renderCount();
    const p = H.players[pid];
    const v = steps[H.pos].v;
    if (v === 'lobby' || v === 'rules') {
      const c = document.createElement('span');
      c.className = 'chip new'; c.innerHTML = `${p.av} ${esc(p.nm)}`;
      $('crowd').prepend(c); sound.play('pop');
      while ($('crowd').children.length > 48) $('crowd').lastElementChild.remove();
    } else toast(`${p.av} <b>${esc(p.nm)}</b> joined the game`);
  }
  // deed spotlight: newest first, then cycles through everyone's
  let spotQueue = [], spotPid = null, spotTimer = null, spotIdx = 0;
  function startSpot() { clearInterval(spotTimer); nextSpot(true); spotTimer = setInterval(() => nextSpot(), 7000); }
  function nextSpot(fromQueue) {
    const v = steps[H.pos].v;
    if (v !== 'lobby' && v !== 'rules') return;
    const all = Object.keys(H.deeds).filter(pid => !H.hidden[pid] && H.players[pid]);
    if (!all.length) return;
    let pid = null;
    while (spotQueue.length && !pid) { const q = spotQueue.shift(); if (all.includes(q)) pid = q; }
    if (!pid) { if (fromQueue && spotPid && all.includes(spotPid)) pid = spotPid; else pid = all[spotIdx++ % all.length]; }
    spotPid = pid;
    const p = H.players[pid], d = H.deeds[pid];
    $('spot').innerHTML = `<div class="flip-in" style="width:100%;display:flex;flex-direction:column;align-items:center;gap:12px">${DEED.html(d, { owner: p.nm, tok: p.av })}${DEED.chanceHTML(d)}</div>`;
    $('spot').title = 'Click to hide this deed from the big screen';
  }
  $('spot').addEventListener('click', () => {
    if (!spotPid) return;
    H.hidden[spotPid] = true; save(); toast('Deed hidden from the big screen.');
    spotPid = null; $('spot').innerHTML = '<div class="spot-empty">Hidden.</div>'; nextSpot();
  });

  // roll
  async function renderRoll(st, silent) {
    show('vStage'); pane('.center-pane', 'cRoll'); pane('.side-pane', 'sRoll');
    const it = qOf(st), sp = M.board[it.at];
    const from = tokenAt(st.i), dist = (it.at - from + 40) % 40;
    const [d1, d2] = diceFor(dist, st.i * 7 + 3);
    $('rollTitle').textContent = `Question ${st.i + 1} of ${M.quiz.length}`;
    $('landCard').innerHTML = '';
    const land = () => {
      $('rollSum').textContent = `${d1} + ${d2} = ${dist}`;
      $('rollLand').textContent = `Landed on ${sp.n}!`;
      $('sp' + it.at).classList.add('hit');
      $('landCard').innerHTML = landCard(it);
    };
    if (silent) { showDie($('die1'), d1); showDie($('die2'), d2); placeWalker(it.at); land(); return; }
    const me = busy;
    placeWalker(from);
    $('rollSum').innerHTML = '&nbsp;'; $('rollLand').innerHTML = '&nbsp;';
    sound.play('drumroll', 1.2);
    showDie($('die1'), d1, true); showDie($('die2'), d2, true);
    await sleep(1400);
    if (me !== busy) return;
    $('rollSum').textContent = `${d1} + ${d2} = ${dist}`;
    const w = $('walker');
    for (let s = 1; s <= dist; s++) {
      if (me !== busy) return;
      placeWalker((from + s) % 40);
      w.classList.remove('hop'); void w.offsetWidth; w.classList.add('hop');
      sound.play('tick');
      await sleep(190);
    }
    if (me !== busy) return;
    land();
    if (sp.t === 'chance') { sound.play('fanfare'); confetti({ count: 120, colors: ['#f96302', '#ffe35a', '#fff'] }); }
    else sound.play('ding');
  }
  function landCard(it) {
    const sp = M.board[it.at];
    if (sp.t === 'chance') return `<div class="chance-card" style="max-width:320px"><div class="cc-q">?</div><div><div class="cc-k">Chance</div><div class="cc-t">Bank error in your favour. This question pays DOUBLE rent.</div></div></div>`;
    const dark = ['yellow', 'lightblue'].includes(sp.c);
    return `<div class="prop-card" style="--c:${M.colors[sp.c]};--t:${dark ? '#111' : '#fff'}"><div class="ph">${esc(sp.n)}</div><div class="pb">${it.double ? 'The priciest street on the board.<br><b>DOUBLE RENT</b>' : `Rent: up to $${M.pay.base + M.pay.speed}<br><span style="font-weight:600">Answer right, answer fast.</span>`}</div></div>`;
  }

  // question
  function renderQ(it, st, silent) {
    show('vQ');
    const sp = M.board[it.at];
    $('qSpace').style.setProperty('--c', sp.c ? M.colors[sp.c] : '#fff');
    $('qSpace').querySelector('.qs-n').textContent = sp.n;
    $('qTag').textContent = it.double ? `${it.tag}: DOUBLE RENT` : it.tag;
    $('qTag').className = 'q-tag' + (it.double ? ' dbl' : '');
    $('qCount').textContent = `Question ${st.i + 1} of ${M.quiz.length}`;
    $('qText').textContent = it.q;
    const revealed = st.v === 'reveal';
    const d = it.opts.map(() => 0);
    Object.values(H.answers[it.id] || {}).forEach(x => d[x.a]++);
    const tot = Math.max(1, d.reduce((a, b) => a + b, 0));
    $('opts').className = 'opts' + (revealed ? ' revealed' : '');
    $('opts').innerHTML = it.opts.map((o, i) => `<div class="opt c${i} ${revealed && i === it.a ? 'right' : ''}" style="--i:${i}">
      <div class="opt-bar" style="--w:${revealed ? (d[i] / tot) * 100 : 0}%"></div>
      <span class="opt-l"><span>${LETTERS[i]}</span></span><span class="opt-t">${esc(o)}</span>
      <span class="opt-n num">${revealed ? `${d[i]} <small>${Math.round((d[i] / tot) * 100)}%</small>` : ''}</span></div>`).join('');
    $('timer').classList.toggle('hidden', revealed);
    $('fact').classList.toggle('on', revealed);
    renderAnswered(it);
    if (!revealed) {
      runTimer('timerArc', 'timerNum', H.opened[it.id], () => limitOf(it), () => { if (isOpen(it.id)) timeUp(it); });
      if (!silent) sound.play('whoosh');
      return;
    }
    const g = H.gained[it.id] || {};
    const paid = Object.values(g).reduce((a, b) => a + b, 0);
    const fast = Object.entries(H.answers[it.id] || {}).filter(([, x]) => x.a === it.a).sort((a, b) => a[1].ms - b[1].ms)[0];
    const fp = fast && H.players[fast[0]];
    $('fact').innerHTML = `<div class="fact-t">${esc(it.fact)}</div>
      ${fp ? `<div class="fast"><div class="kicker" style="color:#8a6d00">Fastest finger</div>${fp.av} ${esc(fp.nm)} <span class="num">${(fast[1].ms / 1000).toFixed(1)}s</span></div>` : ''}
      <div class="rent"><span class="kicker" style="color:#555">Rent paid out</span><span class="num" id="paid">$0</span>${Object.keys(g).length} players</div>`;
    if (silent) { $('paid').textContent = fmt(paid); return; }
    countUp($('paid'), paid, { dur: 1400, fmt });
    if (tot > 0 && d[it.a] / tot >= 0.5) { sound.play('cash'); confetti({ count: 150, colors: MONEY }); }
    else if (d.some(x => x > 0)) { sound.play('trombone'); toast('Most of the room missed that one. Go directly to Jail. Do not pass GO.'); }
    else sound.play('ding');
  }
  function renderAnswered(it, popNew) {
    const box = H.answers[it.id] || {};
    $('ansN').textContent = Object.keys(box).length;
    $('ansFaces').innerHTML = Object.keys(box).slice(-30).map(pid => `<span>${H.players[pid] ? H.players[pid].av : ''}</span>`).join('');
    if (popNew) { const f = $('ansFaces').lastElementChild; if (f) f.classList.add('pop'); sound.play('lock'); }
  }

  // leaderboard
  function renderBoardView(st, silent) {
    show('vBoard');
    $('bKick').textContent = st.after >= M.quiz.length ? 'Final standings' : `After ${st.after} questions`;
    const r = ranking().slice(0, 8);
    $('boardEmpty').classList.toggle('hidden', r.length > 0);
    const max = Math.max(1, ...r.map(p => p.cash));
    $('ranks').innerHTML = r.map((p, i) => {
      const was = H.prevRank[p.pid];
      const moved = was == null ? '' : was > i ? `<span class="up">▲${was - i}</span>` : was < i ? `<span class="down">▼${i - was}</span>` : '';
      const bills = Math.max(1, Math.round((p.cash / max) * 22));
      return `<li style="--i:${i};--from:${was == null ? 3 : was - i}" class="${i === 0 ? 'lead' : ''}">
        <span class="rk num">${i + 1}</span><span class="av">${p.av}</span><span class="nm">${esc(p.nm)}</span><span class="mv">${moved}</span>
        <span class="stack">${'<i></i>'.repeat(bills)}</span><span class="sc num" data-v="${p.cash}">${fmt(p.cash)}</span></li>`;
    }).join('');
    if (!silent) { sound.play('cash'); $('ranks').querySelectorAll('.sc').forEach(el => countUp(el, +el.dataset.v, { dur: 1100, fmt })); }
  }

  // podium
  async function renderPodium(silent) {
    show('vPodium');
    const r = ranking();
    [1, 2, 3].forEach(n => {
      const p = r[n - 1];
      $('pAv' + n).textContent = p ? p.av : '';
      $('pNm' + n).textContent = p ? p.nm : '';
      $('pSc' + n).textContent = p ? fmt(p.cash) : '';
    });
    const pods = document.querySelectorAll('.pod');
    pods.forEach(el => el.classList.remove('up'));
    if (silent) { pods.forEach(el => el.classList.add('up')); return; }
    const me = busy;
    const order = ['.p3', '.p2', '.p1'];
    for (let k = 0; k < 3; k++) {
      if (k === 2) { sound.play('drumroll', 2); await sleep(2100); } else { await sleep(900); sound.play('boing'); }
      if (me !== busy) return;
      document.querySelector(order[k]).classList.add('up');
    }
    sound.play('fanfare');
    confetti({ count: 260, spread: 1.6, colors: MONEY }); setTimeout(() => confetti({ count: 200, x: 0.2, colors: MONEY }), 500); setTimeout(() => confetti({ count: 200, x: 0.8, colors: MONEY }), 900);
  }

  // auction
  function lotCard(k, extra = '') {
    const s = H.sold[k];
    return `<div class="lot ${s ? 'sold' : ''} ${extra}" style="--i:${k}"><div class="lh">${esc(H.prizes[k])}</div><div class="lb">Lot ${k + 1}${s ? `<br>${H.players[s.pid].av} ${esc(H.players[s.pid].nm)} &middot; ${fmt(s.amt)}` : ''}</div></div>`;
  }
  function auctionReset() {
    ['aTimer', 'bidMeter'].forEach(id => $(id).classList.add('hidden'));
    $('bidFaces').innerHTML = ''; $('revealBids').innerHTML = ''; $('going').textContent = '';
  }
  function renderAuctionIntro(silent) {
    show('vAuction'); auctionReset();
    $('aKick').textContent = 'Time to spend it';
    $('aTitle').textContent = 'The Prize Auction';
    $('aSub').innerHTML = 'Sealed bids from your phone. Highest bid wins. Ties go to whoever bid first.<br>Winners pay their bid, and can only win one prize. Cash left at the end buys nothing, so be bold.';
    $('lots').innerHTML = H.prizes.map((_, k) => lotCard(k)).join('');
    if (!silent) sound.play('fanfare');
  }
  function renderLot(k, silent) {
    show('vAuction'); auctionReset();
    if (!H.lotOpened[k]) { H.lotOpened[k] = Date.now(); save(); }
    $('aKick').textContent = `Lot ${k + 1} of ${H.prizes.length}`;
    $('aTitle').textContent = 'Place your bids';
    $('aSub').textContent = 'Type your bid on your phone. You can change it until the timer runs out.';
    $('lots').innerHTML = lotCard(k, 'lot-big');
    $('aTimer').classList.remove('hidden'); $('bidMeter').classList.remove('hidden');
    renderBidMeter(k);
    if (lotOpen(k)) runTimer('aTimerArc', 'aTimerNum', H.lotOpened[k], () => M.bidSeconds + (H.extra['lot' + k] || 0), () => lotUp(k));
    else { $('aTimerNum').textContent = '0'; }
    if (!silent) sound.play('bell');
  }
  function renderBidMeter(k, popNew) {
    const box = H.bids[k] || {};
    $('bidN').textContent = Object.keys(box).length;
    $('bidFaces').innerHTML = Object.keys(box).slice(-40).map(pid => `<span>${H.players[pid] ? H.players[pid].av : ''}</span>`).join('');
    if (popNew) sound.play('cash');
  }
  async function renderSold(k, silent) {
    show('vAuction'); auctionReset();
    if (!H.lotClosed[k]) { H.lotClosed[k] = Date.now(); }
    settle(k); broadcast(true);
    const s = H.sold[k];
    $('aKick').textContent = `Lot ${k + 1}: ${H.prizes[k]}`;
    $('aTitle').textContent = 'And the highest bid is...';
    $('aSub').textContent = '';
    $('lots').innerHTML = '';
    const bids = Object.entries(H.bids[k] || {}).filter(([pid]) => H.players[pid]).sort((a, b) => a[1].amt - b[1].amt || b[1].t - a[1].t);
    const top = bids.slice(-5);
    $('revealBids').innerHTML = top.map(([pid, b]) => `<li data-pid="${pid}"><span>${H.players[pid].av}</span><span>${esc(H.players[pid].nm)}</span><span class="amt num">${fmt(b.amt)}</span></li>`).join('');
    const items = [...$('revealBids').children];
    const finish = () => {
      if (!s) { $('aTitle').textContent = 'No bids. The Bank keeps it.'; return; }
      const p = H.players[s.pid];
      $('aTitle').innerHTML = `SOLD to ${p.av} ${esc(p.nm)}!`;
      $('going').innerHTML = `<span class="gavel bang">🔨</span> ${fmt(s.amt)}`;
      items.forEach(li => li.classList.toggle('win', li.dataset.pid === s.pid));
      $('lots').innerHTML = lotCard(k);
    };
    if (silent) { items.forEach(li => li.classList.add('on')); finish(); return; }
    const me = busy;
    for (let n = 0; n < items.length - 1; n++) { await sleep(600); if (me !== busy) return; items[n].classList.add('on'); sound.play('pop'); }
    for (const w of ['Going once...', 'Going twice...']) {
      await sleep(900); if (me !== busy) return;
      $('going').innerHTML = `<span class="gavel bang">🔨</span> ${w}`; sound.play('punch');
    }
    sound.play('drumroll', 1.2); await sleep(1300);
    if (me !== busy) return;
    if (items.length) items[items.length - 1].classList.add('on');
    finish();
    if (s) { sound.play('punch'); sound.play('fanfare'); confetti({ count: 240, colors: MONEY, spread: 1.4 }); }
    else sound.play('trombone');
  }

  // community chest
  function drawChest(k) {
    if (H.chest[k] !== undefined) return;
    const won = new Set([...Object.values(H.sold).filter(Boolean).map(s => s.pid), ...H.chest]);
    const bingo = new Set(H.bingo.map(b => b.pid));
    const pool = Object.keys(H.players).filter(pid => !won.has(pid)).flatMap(pid => bingo.has(pid) ? [pid, pid] : [pid]);
    H.chest[k] = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
    save();
  }
  async function renderChest(k, silent) {
    show('vChest');
    drawChest(k); broadcast(true);
    const pid = H.chest[k];
    $('chestPast').innerHTML = H.chest.slice(0, k).filter(Boolean).map(x => `<span class="chip">${H.players[x].av} ${esc(H.players[x].nm)}</span>`).join('');
    $('chestSub').textContent = `Draw ${k + 1} of ${CHEST_DRAWS}. Everyone who played is in, except prize winners. Bingo winners have 2 tickets.`;
    if (!pid) { $('slotIn').innerHTML = '<div>No one left to draw</div>'; $('slotIn').style.transform = 'none'; $('chestMsg').textContent = ''; return; }
    const w = H.players[pid];
    const others = Object.values(H.players);
    const reel = Array.from({ length: 34 }, () => others[Math.floor(Math.random() * others.length)]).concat([w]);
    $('slotIn').innerHTML = reel.map(p => `<div><span>${p.av}</span><span>${esc(p.nm)}</span></div>`).join('');
    const rowH = $('slotIn').firstElementChild.offsetHeight;
    const end = `translateY(${-(reel.length - 1) * rowH}px)`;
    const win = () => { $('chestMsg').innerHTML = `Advance to the prize table. <b>${w.av} ${esc(w.nm)}</b> collects a prize!`; };
    if (silent) { $('slotIn').style.transition = 'none'; $('slotIn').style.transform = end; win(); return; }
    $('chestMsg').textContent = 'Shuffling the Community Chest...';
    $('slotIn').style.transition = 'none'; $('slotIn').style.transform = 'translateY(0)';
    void $('slotIn').offsetWidth;
    $('slotIn').style.transition = 'transform 4.2s cubic-bezier(.12,.75,.15,1)';
    $('slotIn').style.transform = end;
    const me = busy;
    for (let t = 0; t < 26; t++) { setTimeout(() => { if (me === busy) sound.play('tick'); }, 4200 * Math.pow(t / 26, 2.2)); }
    await sleep(4300);
    if (me !== busy) return;
    win(); sound.play('fanfare'); confetti({ count: 240, colors: MONEY, spread: 1.5 });
  }

  function renderEnd(silent) {
    show('vEnd');
    const lots = H.prizes.map((_, k) => lotCard(k));
    H.chest.filter(Boolean).forEach(pid => lots.push(`<div class="lot"><div class="lh" style="background:#1a6fb5">Community Chest</div><div class="lb">${H.players[pid].av} ${esc(H.players[pid].nm)}</div></div>`));
    if (H.bingo.length) lots.push(`<div class="lot"><div class="lh" style="background:#f6c544;color:#111">Bingo</div><div class="lb">${H.bingo.slice(0, 6).map(b => H.players[b.pid] ? `${H.players[b.pid].av} ${esc(H.players[b.pid].nm)}` : '').join('<br>')}</div></div>`);
    $('endLots').innerHTML = lots.join('');
    if (!silent) { sound.play('fanfare'); confetti({ count: 200, colors: MONEY }); }
  }

  // ---------- reactions & toasts ----------
  let reactCount = 0;
  function floatReaction(e) {
    if (reactCount > 40) return;
    reactCount++;
    const d = document.createElement('div');
    d.className = 'react'; d.textContent = e;
    d.style.left = (8 + Math.random() * 84) + '%';
    d.style.setProperty('--x', (Math.random() * 120 - 60) + 'px');
    d.style.fontSize = (2 + Math.random() * 1.6) + 'rem';
    $('reactions').appendChild(d);
    setTimeout(() => { d.remove(); reactCount--; }, 3200);
  }
  function toast(html, kind) {
    const d = document.createElement('div');
    d.className = 'toast ' + (kind || ''); d.innerHTML = html;
    $('toasts').appendChild(d);
    setTimeout(() => d.classList.add('out'), 3500);
    setTimeout(() => d.remove(), 4100);
  }

  // ---------- menu ----------
  const LABEL = st => ({
    lobby: 'Lobby (QR code)', rules: 'How to win', roll: `Roll ${st.i + 1}`, q: `Q${st.i + 1}: ${qOf(st) && qOf(st).tag}`, reveal: `Q${st.i + 1} reveal`,
    board: `Leaderboard (after ${st.after})`, podium: 'Podium', auction: 'Auction intro', lot: `Lot ${st.k + 1}: bidding`, sold: `Lot ${st.k + 1}: sold`,
    chest: `Community Chest draw ${st.k + 1}`, end: 'Game over',
  }[st.v]);
  function buildMenu() {
    $('menuList').innerHTML = steps.map((st, i) => (st.v === 'reveal' || st.v === 'sold') ? '' : `<button data-go="${i}" class="${i === H.pos ? 'cur' : ''}">${esc(LABEL(st))}</button>`).join('');
    $('prizeEdit').innerHTML = H.prizes.map((p, k) => `<input data-k="${k}" maxlength="40" value="${esc(p)}" aria-label="Prize ${k + 1}">`).join('');
  }
  const toggleMenu = on => { buildMenu(); $('menu').classList.toggle('hidden', !on); };
  $('menuList').addEventListener('click', e => {
    const b = e.target.closest('[data-go]'); if (!b) return;
    $('menu').classList.add('hidden');
    const i = +b.dataset.go, st = steps[i];
    // jumping to a closed question or lot shows its result instead of re-opening it
    if (st.v === 'q' && H.closed[qOf(st).id]) go(i + 1, { silent: true });
    else if (st.v === 'lot' && H.lotClosed[st.k]) go(i + 1, { silent: true });
    else go(i);
  });
  $('prizeEdit').addEventListener('input', e => {
    const k = e.target.dataset.k; if (k == null) return;
    H.prizes[k] = e.target.value.slice(0, 40) || `Mystery Prize #${+k + 1}`; save(); broadcast();
  });
  $('btnMenu').onclick = () => toggleMenu(true);
  $('menuClose').onclick = () => toggleMenu(false);
  $('btnCopy').onclick = () => {
    const lines = ['Monopoly: All-Hands Edition results', ''];
    H.prizes.forEach((pr, k) => { const s = H.sold[k]; lines.push(`${pr}: ${s ? `${H.players[s.pid].nm} (${fmt(s.amt)})` : 'not sold'}`); });
    H.chest.forEach((pid, k) => lines.push(`Community Chest ${k + 1}: ${pid ? H.players[pid].nm : '-'}`));
    if (H.bingo.length) lines.push('Bingo: ' + H.bingo.map(b => (H.players[b.pid] || {}).nm).join(', '));
    lines.push('', 'Richest tycoons:');
    ranking().filter(p => !p.pid.startsWith('bot')).slice(0, 10).forEach((p, i) => lines.push(`${i + 1}. ${p.nm}: ${fmt(p.cash)}`));
    navigator.clipboard.writeText(lines.join('\n')).then(() => { $('btnCopy').textContent = 'Copied'; setTimeout(() => ($('btnCopy').textContent = 'Copy results summary'), 1500); });
  };
  $('btnReset').onclick = () => {
    if (!confirm('Reset all players, deeds, cash and bids? Phones keep their name and deed and rejoin by themselves.')) return;
    const prizes = H.prizes;
    H = fresh(); H.prizes = prizes; save(); toggleMenu(false); go(0, { silent: true });
  };
  const muteLabel = () => ($('btnMute').textContent = sound.muted ? 'Sound off' : 'Sound on');
  $('btnMute').onclick = () => { sound.toggle(); muteLabel(); };
  muteLabel();

  // rehearsal bots (local only, nothing is sent)
  const BOT_NAMES = ['Rich Uncle Pete', 'Boardwalk Betty', 'Free Parking Fran', 'Jail Bird Jim', 'Hotel Hannah', 'Railroad Ray', 'Chance Chaz', 'Utility Ursula', 'Go Gary', 'Mortgage Mo', 'Thimble Tina', 'Dice Dan'];
  let botTimer = null;
  $('btnSim').onclick = () => {
    toggleMenu(false);
    BOT_NAMES.forEach((nm, i) => setTimeout(() => {
      const bot = { p: 'bot' + i, nm, av: M.tokens[i % M.tokens.length] };
      onUp({ k: 'join', ...bot });
      setTimeout(() => onUp({ k: 'deed', ...bot, d: DEED.local(nm, {}) }), 600 + Math.random() * 2500);
    }, i * 300));
    clearInterval(botTimer);
    botTimer = setInterval(() => {
      const st = steps[H.pos], it = qOf(st);
      if (Math.random() < 0.12) floatReaction(REACTS[Math.floor(Math.random() * REACTS.length)]);
      BOT_NAMES.forEach((nm, i) => {
        const bot = { p: 'bot' + i, nm, av: M.tokens[i % M.tokens.length] };
        const p = H.players[bot.p];
        if (!p || Math.random() < 0.7) return;
        if (st.v === 'q' && it && isOpen(it.id) && !(H.answers[it.id] || {})[bot.p]) onUp({ k: 'ans', ...bot, q: it.id, a: Math.random() < 0.6 ? it.a : Math.floor(Math.random() * it.opts.length) });
        if (st.v === 'lot' && lotOpen(st.k) && !(H.bids[st.k] || {})[bot.p] && p.won == null) onUp({ k: 'bid', ...bot, lot: st.k, amt: Math.max(10, Math.round(p.cash * (0.3 + Math.random() * 0.7) / 10) * 10) });
      });
    }, 700);
  };

  // ---------- keys ----------
  addEventListener('keydown', e => {
    if (e.target.closest('input, textarea')) return;
    const k = e.key, kl = k.toLowerCase();
    if (!$('menu').classList.contains('hidden') && k !== 'Escape' && kl !== 'g') return;
    if (['ArrowRight', ' ', 'PageDown', 'Enter'].includes(k)) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); prev(); }
    else if (k === 'Escape') { $('menu').classList.add('hidden'); $('qrOverlay').classList.add('hidden'); }
    else if (kl === 'g' || kl === 'm') toggleMenu($('menu').classList.contains('hidden'));
    else if (kl === 'q') $('qrOverlay').classList.toggle('hidden');
    else if (kl === 's') { sound.toggle(); muteLabel(); }
    else if (kl === 'f') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}); }
    else if (kl === 't') {
      const st = steps[H.pos], it = qOf(st);
      if (st.v === 'q' && it && isOpen(it.id)) { H.extra[it.id] = (H.extra[it.id] || 0) + 10; save(); broadcast(true); }
      if (st.v === 'lot' && lotOpen(st.k)) { H.extra['lot' + st.k] = (H.extra['lot' + st.k] || 0) + 10; save(); broadcast(true); }
    }
  });
  $('stage').addEventListener('dblclick', next);
  addEventListener('resize', () => { const st = steps[H.pos]; if (st.v === 'roll') placeWalker(qOf(st).at); else if (st.v === 'lobby' || st.v === 'rules') placeWalker(0); });

  // ---------- boot ----------
  buildBoard();
  [$('die1'), $('die2')].forEach(buildDie);
  $('qrBig').innerHTML = qrSVG(JOIN_URL);
  $('qrMini').innerHTML = qrSVG(JOIN_URL);
  $('qrOver').innerHTML = qrSVG(JOIN_URL);
  $('joinText').textContent = Live.test || ROOM !== Live.defRoom ? JOIN_URL.replace(/^https?:\/\//, '') : 'qourlite.xyz/go';
  window.__host = { steps, get H() { return H; }, go, next, joinUrl: JOIN_URL };
  render(true);
  const isPresenter = Live.test || new URLSearchParams(location.search).has('presenter') || Live.store.get('mono-presenter', false);
  if (isPresenter) connect();
  else {
    $('gate').classList.remove('hidden');
    $('gateYes').onclick = () => { Live.store.set('mono-presenter', true); $('gate').classList.add('hidden'); connect(); };
  }
})();
