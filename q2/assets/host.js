/* Host (big screen) logic. The host is the single source of truth: it keeps the
   roster, answers and scores, and broadcasts a small state object to phones. */
(function () {
  const { sound, confetti, countUp, qrSVG, esc, sleep } = FX;
  const $ = id => document.getElementById(id);
  const ROOM = Live.room;
  const KEY = 'ql-host-' + ROOM;
  const joinQs = new URLSearchParams();
  if (ROOM !== 'icqa-pk26') joinQs.set('room', ROOM);
  if (Live.test) joinQs.set('test', Live.test);
  const JOIN_URL = location.origin + '/join/' + (joinQs.toString() ? '?' + joinQs : '');
  const SHORT = 'qourlite.xyz/join';
  const AVATARS = ['🦊','🐻','🐼','🦁','🐯','🐸','🐙','🦄','🐝','🦉','🐢','🦖','🐧','🦈','🐨','🦝','🔨','🪚','🧰','🪣','🚜','📦','🏠','🌵'];
  const REACTS = ['👏','😂','🤯','🔥','🧡','😱'];
  const LIMITS = { mc: 20, vs: 15, poll: 25 };

  // ---------- steps ----------
  const steps = [{ v: 'lobby' }];
  PROGRAM.forEach((seg, s) => {
    steps.push({ v: 'title', s });
    seg.items.forEach((it, i) => {
      steps.push({ v: 'q', s, i });
      if (it.type !== 'text') steps.push({ v: 'reveal', s, i });
    });
    if (seg.id === 'fight') steps.push({ v: 'fightend', s });
    if (!seg.extra && seg.items.some(it => it.type === 'mc' || it.type === 'vs')) steps.push({ v: 'board', s });
    if (seg.id === 'final') steps.push({ v: 'podium', s });
  });
  const item = st => (st && st.i != null ? PROGRAM[st.s].items[st.i] : null);
  // Extras (Fight Night, Hot Takes) are for fun only: they never change the scores.
  const EXTRA = new Set(PROGRAM.filter(seg => seg.extra).flatMap(seg => seg.items.map(it => it.id)));
  const MAIN = PROGRAM.filter(seg => !seg.extra);

  // ---------- persistent host state ----------
  const fresh = () => ({ sid: Live.rid(6), pos: 0, players: {}, answers: {}, opened: {}, closed: {}, scored: {}, gained: {}, hidden: {}, bingo: [], prevRank: {} });
  let H = Live.store.get(KEY, null) || fresh();
  if (!H.sid) H = fresh();
  ['players','answers','opened','closed','scored','gained','hidden','prevRank'].forEach(k => (H[k] = H[k] || {}));
  H.bingo = H.bingo || [];
  const save = () => Live.store.set(KEY, H);

  // ---------- live relay ----------
  let lastSent = 0, sendTimer = null;
  // Only the presenter's screen may act as host: a second host would confuse the phones.
  let live = { publishState() {}, status: () => ({}), channels: [] };
  function connect() {
    live = Live.create({
      room: ROOM, role: 'host',
      onMsg: (k, m) => k === 'up' && onUp(m),
      onStatus: renderRelays,
    });
    renderRelays(live.status());
    broadcast(true);
  }
  function renderRelays(st) {
    const names = { emqx: 'Relay A', eclipse: 'Relay B', ntfy: 'Relay C', m1: 'A', m2: 'B', nt: 'C' };
    $('hudRelays').innerHTML = live ? live.channels.map(id =>
      `<span class="relay ${st ? st[id] || 'connecting' : 'connecting'}" title="${names[id] || id}: ${st ? st[id] || 'connecting' : ''}"></span>`).join('') : '';
    const up = st ? Object.values(st).filter(s => s === 'up').length : 0;
    $('relayDetail').textContent = up
      ? `Live voting is ON (${up} of ${live.channels.length} relays connected). Room: ${ROOM}`
      : 'Live voting is not connected yet. Everything still works as a show of hands: read the question, ask the room, press Next to reveal.';
  }

  function stateForPhones() {
    const st = steps[H.pos];
    const it = item(st);
    const seg = st.s != null ? PROGRAM[st.s] : null;
    const pl = Object.keys(H.players);
    const out = { t: Date.now(), sid: H.sid, ph: st.v, n: pl.length, pl };
    if (seg) out.seg = { title: seg.title, sub: seg.sub, color: seg.color };
    if (it) {
      const open = isOpen(it.id);
      out.q = { id: it.id, type: it.type, tag: it.tag, q: it.q, opts: it.type === 'vs' ? ['Home Depot', "Lowe's"] : it.opts, mode: it.mode, double: !!it.double, open, fun: EXTRA.has(it.id) };
      if (open && it.type !== 'text') out.q.left = Math.max(0, (H.opened[it.id] + limitOf(it) * 1000 - Date.now()) / 1000);
      out.ap = Object.keys(H.answers[it.id] || {});
      if (st.v === 'reveal') {
        out.rv = { a: it.a, dist: dist(it), fact: it.fact.replace(/<[^>]+>/g, '') };
        out.me = meMap(it.id);
      }
    }
    if (st.v === 'board' || st.v === 'podium' || st.v === 'fightend') out.me = meMap(null);
    return out;
  }
  function meMap(qid) {
    const ranked = ranking();
    const m = {};
    ranked.forEach((p, idx) => { m[p.pid] = [qid ? (H.gained[qid] || {})[p.pid] || 0 : 0, p.score, idx + 1, p.streak || 0]; });
    return m;
  }
  function broadcast(force) {
    const now = Date.now();
    clearTimeout(sendTimer);
    if (!force && now - lastSent < 350) { sendTimer = setTimeout(() => broadcast(true), 350); return; }
    lastSent = now;
    const st = steps[H.pos], it = item(st);
    const phaseKey = `${st.v}:${H.pos}:${it ? isOpen(it.id) : ''}:${Math.floor(now / 240000)}`;
    live.publishState(stateForPhones(), phaseKey);
  }
  setInterval(() => broadcast(true), 12000);

  // ---------- incoming ----------
  function addPlayer(m) {
    if (!m.p || typeof m.p !== 'string') return null;
    const pid = m.p.slice(0, 8);
    const nm = clean(String(m.nm || 'Player').slice(0, 18)) || 'Player';
    const av = AVATARS.includes(m.av) ? m.av : AVATARS[0];
    const cs = clean(String(m.cs || '').trim().slice(0, 30));
    const p = H.players[pid];
    if (!p) {
      H.players[pid] = { nm, av, cs, score: 0, streak: 0, j: Date.now() };
      onJoinVisual(pid);
      save(); renderCount(); broadcast();
    } else if (p.nm !== nm || p.av !== av || ((p.cs || '') !== cs && !p.csHidden)) {
      p.nm = nm; p.av = av; p.cs = cs; save(); if (steps[H.pos].v === 'lobby') renderCrowd();
    }
    return pid;
  }
  function onUp(m) {
    const pid = addPlayer(m);
    if (!pid) return;
    if (m.k === 'ans') onAnswer(pid, m);
    else if (m.k === 're' && REACTS[m.e] != null) floatReaction(REACTS[m.e]);
    else if (m.k === 'bingo') onBingo(pid);
  }
  function onAnswer(pid, m) {
    const st = steps[H.pos], it = item(st);
    if (!it || it.id !== m.q || !isOpen(it.id)) return;
    const box = (H.answers[it.id] = H.answers[it.id] || {});
    if (it.type === 'text') {
      const txt = clean(String(m.a || '').trim().slice(0, 60));
      if (!txt) return;
      const prev = box[pid] ? box[pid].a : [];
      if (prev.length >= 3 || prev.includes(txt)) return;
      box[pid] = { a: [...prev, txt], ms: Date.now() - H.opened[it.id] };
      save(); renderText(it, true); broadcast();
      return;
    }
    if (box[pid]) return; // first answer counts
    const nOpts = it.type === 'vs' ? 2 : it.opts.length;
    const a = Number(m.a);
    if (!(a >= 0 && a < nOpts)) return;
    box[pid] = { a, ms: Math.max(0, Date.now() - H.opened[it.id]) };
    save();
    renderAnswered(it, pid);
    broadcast();
    const nPlayers = Object.keys(H.players).length;
    if (nPlayers > 0 && Object.keys(box).length >= nPlayers) setTimeout(() => { if (item(steps[H.pos]) === it && isOpen(it.id)) timeUp(it); }, 900);
  }
  function onBingo(pid) {
    if (H.bingo.some(b => b.pid === pid)) return;
    H.bingo.push({ pid, t: Date.now() }); save();
    const p = H.players[pid];
    toast(`<span class="t-big">BINGO!</span> ${p.av} <b>${esc(p.nm)}</b> ${H.bingo.length === 1 ? 'got there first' : 'is #' + H.bingo.length}`, 'bingo');
    sound.play('fanfare'); confetti({ count: 120, y: 0.9 });
  }

  // ---------- question timing ----------
  const limitOf = it => (H.extra && H.extra[it.id] || 0) + (LIMITS[it.type] || 20);
  const isOpen = qid => !!H.opened[qid] && !H.closed[qid];
  let tickTimer = null;
  function openQuestion(it) {
    if (H.opened[it.id]) return;
    H.opened[it.id] = Date.now(); save();
  }
  function timeUp(it) {
    if (H.closed[it.id]) return;
    H.closed[it.id] = Date.now(); save();
    const idx = steps.findIndex(s => s.v === 'reveal' && item(s) === it);
    if (idx > -1 && steps[H.pos].v === 'q' && item(steps[H.pos]) === it) go(idx);
  }
  function runTimer(it, arcId, numId) {
    clearInterval(tickTimer);
    if (it.type === 'text') return;
    const C = 2 * Math.PI * 44;
    const arc = $(arcId), num = $(numId);
    arc.style.strokeDasharray = C;
    let lastSec = -1;
    const f = () => {
      const total = limitOf(it) * 1000;
      const left = Math.max(0, H.opened[it.id] + total - Date.now());
      const sec = Math.ceil(left / 1000);
      num.textContent = sec;
      arc.style.strokeDashoffset = C * (1 - left / total);
      arc.parentNode.parentNode.classList.toggle('urgent', sec <= 5);
      if (sec !== lastSec && sec <= 5 && sec > 0) sound.play(sec % 2 ? 'tick' : 'tock');
      lastSec = sec;
      if (left <= 0 || !isOpen(it.id)) { clearInterval(tickTimer); if (isOpen(it.id)) timeUp(it); }
    };
    f(); tickTimer = setInterval(f, 200);
  }

  // ---------- scoring ----------
  function score(it) {
    if (H.scored[it.id] || (it.type !== 'mc' && it.type !== 'vs') || EXTRA.has(it.id)) return;
    H.scored[it.id] = true;
    const box = H.answers[it.id] || {};
    const g = (H.gained[it.id] = {});
    const lim = limitOf(it) * 1000;
    Object.keys(H.players).forEach(pid => {
      const p = H.players[pid], ans = box[pid];
      if (ans && ans.a === it.a) {
        p.streak = (p.streak || 0) + 1;
        let pts = Math.round(500 + 500 * Math.max(0, 1 - ans.ms / lim));
        if (it.double) pts *= 2;
        if (p.streak >= 3) pts += 100;
        p.score += pts; g[pid] = pts;
      } else if (ans) { p.streak = 0; }
    });
    save();
  }
  function dist(it) {
    const n = it.type === 'vs' ? 2 : (it.opts || []).length;
    const d = Array(n).fill(0);
    Object.values(H.answers[it.id] || {}).forEach(x => { if (d[x.a] != null) d[x.a]++; });
    return d;
  }
  const ranking = () => Object.entries(H.players).map(([pid, p]) => ({ pid, ...p }))
    .sort((a, b) => b.score - a.score || a.j - b.j);

  // ---------- navigation ----------
  function go(i, { silent } = {}) {
    i = Math.max(0, Math.min(steps.length - 1, i));
    const leaving = steps[H.pos];
    const li = item(leaving);
    if (li && li.type === 'text' && isOpen(li.id) && steps[i] !== leaving) { H.closed[li.id] = Date.now(); }
    if (leaving.v === 'board' || leaving.v === 'podium') ranking().forEach((p, idx) => (H.prevRank[p.pid] = idx));
    H.pos = i; save();
    render(silent);
    broadcast(true);
  }
  const next = () => {
    const st = steps[H.pos], it = item(st);
    if (st.v === 'q' && it && it.type !== 'text' && isOpen(it.id)) { timeUp(it); return; }
    go(H.pos + 1);
  };
  const prev = () => {
    let i = H.pos - 1;
    // stepping back over a revealed question lands on its reveal, not on a re-opened question
    if (steps[i] && steps[i].v === 'q' && H.closed[item(steps[i]).id] && steps[i + 1] && steps[i + 1].v === 'reveal') i = i - 1;
    go(i);
  };

  // ---------- rendering ----------
  const views = ['vLobby', 'vTitle', 'vQ', 'vFight', 'vFightEnd', 'vText', 'vBoard', 'vPodium'];
  function show(id) {
    views.forEach(v => $(v).classList.toggle('on', v === id));
    $('miniJoin').classList.toggle('hidden', id === 'vLobby' || id === 'vPodium');
  }
  function render(silent) {
    clearInterval(tickTimer);
    const st = steps[H.pos];
    const it = item(st);
    const seg = st.s != null ? PROGRAM[st.s] : null;
    document.body.style.setProperty('--seg', seg ? seg.color : '#F96302');
    $('hudSeg').textContent = seg ? `${seg.title}: ${seg.sub}` : 'Earnings Unpacked: Live';
    renderSteps(st);
    if (st.v === 'lobby') { show('vLobby'); renderCrowd(); }
    else if (st.v === 'title') renderTitle(seg, st.s, silent);
    else if (st.v === 'q' || st.v === 'reveal') {
      if (st.v === 'q' && !H.closed[it.id]) openQuestion(it);
      if (st.v === 'reveal') { if (!H.closed[it.id]) H.closed[it.id] = Date.now(); score(it); save(); }
      if (it.type === 'vs') renderFight(it, st, silent);
      else if (it.type === 'text') renderText(it);
      else renderQ(it, st, seg, silent);
    }
    else if (st.v === 'fightend') renderFightEnd(seg, silent);
    else if (st.v === 'board') renderBoard(seg, silent);
    else if (st.v === 'podium') renderPodium(silent);
  }
  function renderSteps(st) {
    const el = $('hudSteps');
    if (st.s == null) { el.innerHTML = ''; return; }
    const seg = PROGRAM[st.s];
    el.innerHTML = seg.items.map((it, i) => `<span class="sd ${st.i === i ? 'cur' : ''} ${H.closed[it.id] ? 'done' : ''}"></span>`).join('');
  }
  function renderCount() {
    const ids = Object.keys(H.players), bots = ids.filter(id => id.startsWith('bot')).length;
    $('hudCount').textContent = ids.length + (bots ? ` (incl. ${bots} bots: Menu > Reset)` : '');
  }

  // lobby
  function renderCrowd() {
    const el = $('crowd');
    el.innerHTML = '';
    ranking().slice().sort((a, b) => a.j - b.j).forEach(p => el.appendChild(bubble(p)));
    renderCount();
  }
  function bubble(p) {
    const d = document.createElement('div');
    d.className = 'bubble';
    d.style.setProperty('--d', (Math.random() * 3).toFixed(2) + 's');
    const cs = p.cs && !p.csHidden ? p.cs.replace(/^(A|An|The) /, w => w.toLowerCase()) : '';
    d.dataset.pid = p.pid;
    d.innerHTML = `<span class="b-av">${p.av}</span><span class="b-txt"><span class="b-nm">${esc(p.nm)}</span>${cs ? `<span class="b-cs">as ${esc(cs)}</span>` : ''}</span>`;
    return d;
  }
  $('crowd').addEventListener('click', e => {
    const b = e.target.closest('.bubble'); const p = b && H.players[b.dataset.pid];
    if (!p || !p.cs) return;
    p.csHidden = true; save(); renderCrowd();
  });
  function onJoinVisual(pid) {
    renderCount();
    if (steps[H.pos].v === 'lobby') {
      const b = bubble({ pid, ...H.players[pid] });
      b.classList.add('new');
      $('crowd').appendChild(b);
      sound.play('pop');
    } else {
      const p = H.players[pid];
      toast(`${p.av} <b>${esc(p.nm)}</b> joined${p.cs ? ` (going as ${esc(p.cs)})` : ''}`, 'join');
    }
  }
  const t0 = Date.now();
  setInterval(() => {
    if (steps[H.pos].v !== 'lobby') return;
    const s = (Date.now() - t0) / 1000;
    $('tickSales').textContent = '$' + Math.floor(s * 6087).toLocaleString();
  }, 97);

  // title
  function renderTitle(seg, s, silent) {
    show('vTitle');
    $('tKick').textContent = seg.extra ? 'Bonus round (just for fun, no points)' : `Round ${MAIN.indexOf(seg) + 1} of ${MAIN.length}`;
    $('tTitle').textContent = seg.title;
    $('tSub').textContent = seg.sub;
    $('tBlurb').textContent = seg.blurb;
    $('tQs').innerHTML = seg.items.map((it, i) => `<span style="--i:${i}">${esc(it.tag)}</span>`).join('');
    const card = document.querySelector('#vTitle .title-card');
    card.classList.remove('anim'); void card.offsetWidth; card.classList.add('anim');
    if (!silent) sound.play(seg.id === 'fight' ? 'bell' : 'whoosh');
  }

  // mc / poll
  const LETTERS = ['A', 'B', 'C', 'D'];
  const SHAPES = ['▲', '◆', '●', '■'];
  function renderQ(it, st, seg, silent) {
    show('vQ');
    const n = seg.items.indexOf(it);
    $('qTag').textContent = it.tag + (it.double ? '  ·  DOUBLE POINTS' : '') + (it.type === 'poll' ? '  ·  POLL' : '');
    $('qCount').textContent = it.type === 'poll' ? 'No wrong answers' : `Question ${n + 1} of ${seg.items.length}`;
    $('qText').innerHTML = esc(it.q);
    $('qText').classList.toggle('long', it.q.length > 70);
    const revealed = st.v === 'reveal';
    const d = dist(it);
    const tot = Math.max(1, d.reduce((a, b) => a + b, 0));
    const max = Math.max(1, ...d);
    $('opts').className = 'opts n' + it.opts.length + (revealed ? ' revealed' : '') + (it.type === 'poll' ? ' poll' : '');
    $('opts').innerHTML = it.opts.map((o, i) => {
      const right = revealed && it.type === 'mc' && i === it.a;
      const top = revealed && it.type === 'poll' && d[i] === max && d[i] > 0;
      return `<div class="opt c${i} ${right ? 'right' : ''} ${top ? 'top' : ''}" style="--i:${i}">
        <div class="opt-bar" style="--w:${revealed ? (d[i] / tot) * 100 : 0}%"></div>
        <span class="opt-shape">${SHAPES[i]}</span><span class="opt-l">${LETTERS[i]}</span>
        <span class="opt-t">${esc(o)}</span>
        <span class="opt-n num">${revealed ? `${d[i]} <small>${Math.round((d[i] / tot) * 100)}%</small>` : ''}</span>
      </div>`;
    }).join('');
    $('fact').innerHTML = revealed ? factHTML(it) : '';
    $('fact').classList.toggle('on', revealed);
    $('timer').classList.toggle('hidden', revealed);
    renderAnsweredAll(it);
    if (!revealed) { runTimer(it, 'timerArc', 'timerNum'); if (!silent) sound.play('whoosh'); }
    else if (!silent) revealFx(it, d);
  }
  function factHTML(it) {
    let s = `<div class="fact-txt">${it.fact}${it.icqa ? `<div class="icqa"><span>ICQA link</span>${esc(it.icqa)}</div>` : ''}</div>`;
    if (it.type === 'mc' || it.type === 'vs') {
      const box = H.answers[it.id] || {};
      const fast = Object.entries(box).filter(([, x]) => x.a === it.a).sort((a, b) => a[1].ms - b[1].ms)[0];
      if (fast && H.players[fast[0]]) {
        const p = H.players[fast[0]];
        s += `<div class="fastest"><span class="kicker">Fastest finger</span> ${p.av} <b>${esc(p.nm)}</b> <span class="num">${(fast[1].ms / 1000).toFixed(1)}s</span></div>`;
      }
    }
    return s;
  }
  function revealFx(it, d) {
    if (it.type === 'poll') { sound.play('ding'); return; }
    const tot = d.reduce((a, b) => a + b, 0);
    if (tot === 0) { sound.play('ding'); return; }
    if (d[it.a] / tot >= 0.5) { sound.play('ding'); confetti({ count: 140 }); }
    else { sound.play('trombone'); toast('Most of the room missed that one. No judgment. Okay, a little judgment.', 'info'); }
  }
  function renderAnsweredAll(it) {
    const box = H.answers[it.id] || {};
    $('ansN').textContent = Object.keys(box).length;
    $('ansFaces').innerHTML = Object.keys(box).slice(-14).map(pid => `<span>${H.players[pid] ? H.players[pid].av : ''}</span>`).join('');
    if (it.type === 'vs') { const d = dist(it); $('fcHD').textContent = d[0]; $('fcLOW').textContent = d[1]; }
  }
  function renderAnswered(it, pid) {
    if (it.type === 'vs') { renderAnsweredAll(it); return; }
    renderAnsweredAll(it);
    const f = $('ansFaces').lastElementChild;
    if (f) f.classList.add('pop');
    sound.play('lock');
  }

  // fight night
  function fightTally(seg, upto) {
    let hd = 0, low = 0;
    seg.items.forEach(it => { if (H.closed[it.id] && (!upto || seg.items.indexOf(it) <= seg.items.indexOf(upto))) it.a === 0 ? hd++ : low++; });
    return { hd, low };
  }
  async function renderFight(it, st, silent) {
    show('vFight');
    const seg = PROGRAM[st.s];
    const revealed = st.v === 'reveal';
    $('fTag').textContent = it.tag;
    $('fMetric').textContent = revealed ? it.metric : 'Call it before the bell';
    $('fText').textContent = it.q;
    const before = fightTally(seg, seg.items[seg.items.indexOf(it) - 1]);
    const after = revealed ? fightTally(seg, it) : before;
    const hpOf = lost => Math.max(8, 100 - lost * 20) + '%';
    $('hpHD').style.width = hpOf(before.low);
    $('hpLOW').style.width = hpOf(before.hd);
    ['fHD', 'fLOW'].forEach(id => $(id).classList.remove('win', 'lose', 'punch'));
    $('fvHD').textContent = revealed ? it.hd : '???';
    $('fvLOW').textContent = revealed ? it.low : '???';
    $('fFact').innerHTML = revealed ? factHTML(it) : '';
    $('fFact').classList.toggle('on', revealed);
    $('fTimer').classList.toggle('hidden', revealed);
    renderAnsweredAll(it);
    if (!revealed) { runTimer(it, 'fTimerArc', 'fTimerNum'); if (!silent) sound.play('bell'); return; }
    const win = it.a === 0 ? 'fHD' : 'fLOW', lose = it.a === 0 ? 'fLOW' : 'fHD';
    if (!silent) { sound.play('drumroll', 1.1); await sleep(1150); }
    if (steps[H.pos] !== st) return;
    $(win).classList.add('win', 'punch'); $(lose).classList.add('lose');
    $('hpHD').style.width = hpOf(after.low);
    $('hpLOW').style.width = hpOf(after.hd);
    if (!silent) { sound.play('punch'); setTimeout(() => sound.play('punch'), 180); confetti({ count: 90, x: it.a === 0 ? 0.25 : 0.75, colors: it.a === 0 ? ['#F96302', '#fff', '#ffb37a'] : ['#3b82f6', '#fff', '#93c5fd'] }); }
  }
  function renderFightEnd(seg, silent) {
    show('vFightEnd');
    const t = fightTally(seg);
    $('feHD').textContent = '0'; $('feLOW').textContent = '0';
    if (silent) { $('feHD').textContent = t.hd; $('feLOW').textContent = t.low; return; }
    sound.play('drumroll', 1.4);
    setTimeout(() => {
      countUp($('feHD'), t.hd, { dur: 900 }); countUp($('feLOW'), t.low, { dur: 900 });
      sound.play('bell'); if (t.hd > t.low) confetti({ count: 200, colors: ['#F96302', '#fff', '#ffb37a'] });
    }, 1450);
  }

  // text wall / cloud
  const STOP = new Set(['the', 'a', 'an', 'and', 'of', 'to', 'is', 'it', 'in', 'very', 'so', 'just', 'kinda', 'pretty']);
  function renderText(it, live) {
    if (!live) show('vText');
    if (item(steps[H.pos]) !== it) return;
    $('xTag').textContent = it.tag;
    $('xText').textContent = it.q;
    const box = H.answers[it.id] || {};
    const hidden = new Set(H.hidden[it.id] || []);
    const entries = [];
    Object.entries(box).forEach(([pid, x]) => x.a.forEach(t => entries.push({ pid, t, key: pid + '|' + t })));
    const visible = entries.filter(e => !hidden.has(e.key));
    $('xN').textContent = visible.length;
    $('cloud').classList.toggle('hidden', it.mode !== 'cloud');
    $('wall').classList.toggle('hidden', it.mode === 'cloud');
    if (it.mode === 'cloud') {
      const counts = {};
      visible.forEach(e => {
        const w = e.t.toLowerCase().replace(/[^a-z0-9'\- ]/g, '').trim();
        if (w && !STOP.has(w)) (counts[w] = counts[w] || { n: 0, keys: [] }), counts[w].n++, counts[w].keys.push(e.key);
      });
      const words = Object.entries(counts).sort((a, b) => b[1].n - a[1].n).slice(0, 40);
      const max = words.length ? words[0][1].n : 1;
      $('cloud').innerHTML = words.map(([w, c], i) => {
        const size = 1.4 + 3.6 * Math.sqrt(c.n / max);
        return `<span class="cw c${i % 4}" data-keys="${esc(c.keys.join('\n'))}" style="font-size:${size.toFixed(2)}rem;--r:${((i * 37) % 9) - 4}deg">${esc(w)}${c.n > 1 ? `<sup>${c.n}</sup>` : ''}</span>`;
      }).join('') || '<div class="muted">Type a word on your phone...</div>';
    } else {
      $('wall').innerHTML = visible.slice().reverse().map((e, i) => {
        const p = H.players[e.pid] || { av: '', nm: '' };
        return `<div class="note c${i % 4}" data-keys="${esc(e.key)}"><div class="note-t">${esc(e.t)}</div><div class="note-by">${p.av} ${esc(p.nm)}</div></div>`;
      }).join('') || '<div class="muted">Answers appear here as they come in...</div>';
    }
    if (live) sound.play('pop');
  }
  ['cloud', 'wall'].forEach(id => $(id).addEventListener('click', e => {
    const el = e.target.closest('[data-keys]');
    if (!el) return;
    const it = item(steps[H.pos]);
    H.hidden[it.id] = [...(H.hidden[it.id] || []), ...el.dataset.keys.split('\n')];
    save(); renderText(it);
  }));

  // leaderboard
  function renderBoard(seg, silent) {
    show('vBoard');
    $('bKick').textContent = seg ? `After ${seg.title}` : 'Leaderboard';
    $('bTitle').textContent = 'Who\'s winning?';
    const r = ranking().slice(0, 8);
    $('boardEmpty').classList.toggle('hidden', r.length > 0);
    const max = Math.max(1, ...r.map(p => p.score));
    $('board').innerHTML = r.map((p, i) => {
      const was = H.prevRank[p.pid];
      const moved = was == null ? '' : was > i ? `<span class="up">▲${was - i}</span>` : was < i ? `<span class="down">▼${i - was}</span>` : '';
      return `<li style="--i:${i};--from:${was == null ? 3 : was - i}" class="${i === 0 ? 'lead' : ''}">
        <span class="rk num">${i + 1}</span><span class="av">${p.av}</span>
        <span class="nm">${esc(p.nm)} ${p.streak >= 3 ? `<span class="streak">${p.streak} in a row</span>` : ''}</span>
        <span class="mv">${moved}</span>
        <span class="bar"><span style="--w:${(p.score / max) * 100}%"></span></span>
        <span class="sc num" data-v="${p.score}">${p.score.toLocaleString()}</span></li>`;
    }).join('');
    if (!silent) { sound.play('whoosh'); $('board').querySelectorAll('.sc').forEach(el => countUp(el, +el.dataset.v, { dur: 1100 })); }
  }

  // podium
  async function renderPodium(silent) {
    show('vPodium');
    const r = ranking();
    [1, 2, 3].forEach(n => {
      const p = r[n - 1];
      $('pAv' + n).textContent = p ? p.av : '';
      $('pNm' + n).textContent = p ? p.nm : '';
      $('pSc' + n).textContent = p ? p.score.toLocaleString() : '';
    });
    const pods = document.querySelectorAll('.pod');
    pods.forEach(el => el.classList.remove('up'));
    if (silent) { pods.forEach(el => el.classList.add('up')); return; }
    const order = ['.p3', '.p2', '.p1'];
    for (let k = 0; k < 3; k++) {
      if (k === 2) { sound.play('drumroll', 2); await sleep(2100); } else { await sleep(900); sound.play('boing'); }
      if (steps[H.pos].v !== 'podium') return;
      document.querySelector(order[k]).classList.add('up');
    }
    sound.play('fanfare');
    confetti({ count: 260, spread: 1.6 }); setTimeout(() => confetti({ count: 200, x: 0.2 }), 500); setTimeout(() => confetti({ count: 200, x: 0.8 }), 900);
  }

  // ---------- reactions & toasts ----------
  let reactCount = 0;
  function floatReaction(e) {
    if (reactCount > 40) return;
    reactCount++;
    const d = document.createElement('div');
    d.className = 'react';
    d.textContent = e;
    d.style.left = (8 + Math.random() * 84) + '%';
    d.style.setProperty('--x', (Math.random() * 120 - 60) + 'px');
    d.style.fontSize = (2 + Math.random() * 1.6) + 'rem';
    $('reactions').appendChild(d);
    setTimeout(() => { d.remove(); reactCount--; }, 3200);
  }
  function toast(html, kind) {
    const d = document.createElement('div');
    d.className = 'toast ' + (kind || '');
    d.innerHTML = html;
    $('toasts').appendChild(d);
    setTimeout(() => d.classList.add('out'), kind === 'bingo' ? 6000 : 3500);
    setTimeout(() => d.remove(), kind === 'bingo' ? 6600 : 4100);
  }

  // ---------- menu ----------
  function buildMenu() {
    $('menuList').innerHTML = PROGRAM.map((seg, s) => {
      const ti = steps.findIndex(x => x.v === 'title' && x.s === s);
      const qs = seg.items.map((it, i) => {
        const qi = steps.findIndex(x => x.v === 'q' && x.s === s && x.i === i);
        return `<button class="mq ${H.closed[it.id] ? 'done' : ''}" data-go="${H.closed[it.id] && steps[qi + 1] && steps[qi + 1].v === 'reveal' ? qi + 1 : qi}">${esc(it.tag)}</button>`;
      }).join('');
      return `<div class="mseg" style="--c:${seg.color}"><button class="mt" data-go="${ti}"><span class="num">${s + 1}</span> ${esc(seg.title)}: ${esc(seg.sub)} <small>${esc(seg.deck)}</small></button><div class="mqs">${qs}</div></div>`;
    }).join('') + `<div class="mseg"><button class="mt" data-go="0">Lobby (QR code)</button><button class="mt" data-go="${steps.findIndex(x => x.v === 'podium')}">Podium</button></div>`;
  }
  const toggleMenu = on => { buildMenu(); $('menu').classList.toggle('hidden', on === undefined ? undefined : !on); };
  $('menuList').addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) { $('menu').classList.add('hidden'); go(+b.dataset.go); } });
  $('btnMenu').onclick = () => toggleMenu(true);
  $('menuClose').onclick = () => toggleMenu(false);
  $('btnCopy').onclick = () => {
    const lines = ['Earnings Unpacked: live quiz results', ''];
    ranking().filter(p => !String(p.pid).startsWith('bot')).slice(0, 10).forEach((p, i) => lines.push(`${i + 1}. ${p.nm}: ${p.score.toLocaleString()} pts`));
    PROGRAM.forEach(seg => seg.items.forEach(it => {
      const box = H.answers[it.id]; if (!box || !Object.keys(box).length) return;
      if (it.type === 'poll') { const d = dist(it); lines.push('', `${it.q}`); it.opts.forEach((o, i) => lines.push(`  ${o}: ${d[i]}`)); }
      if (it.type === 'text') { lines.push('', it.q); Object.values(box).forEach(x => x.a.forEach(t => lines.push('  - ' + t))); }
    }));
    if (H.bingo.length) lines.push('', 'Bingo: ' + H.bingo.map(b => (H.players[b.pid] || {}).nm).join(', '));
    navigator.clipboard.writeText(lines.join('\n')).then(() => { $('btnCopy').textContent = 'Copied'; setTimeout(() => ($('btnCopy').textContent = 'Copy results summary'), 1500); });
  };
  $('btnReset').onclick = () => {
    if (!confirm('Reset all players, answers and scores? Phones will need to rejoin.')) return;
    H = fresh(); save(); render(true); broadcast(true); toggleMenu(false);
  };
  const muteLabel = () => ($('btnMute').textContent = sound.muted ? 'Sound off' : 'Sound on');
  $('btnMute').onclick = () => { sound.toggle(); muteLabel(); };
  muteLabel();

  // rehearsal bots (local only, nothing is sent)
  const BOT_NAMES = ['Captain Comp', 'Basis Point Betty', 'Cycle Count Carl', 'SKU Ninja', 'Pallet Picasso', 'Margin Maverick', 'The Cull Whisperer', 'Turns Turner', 'Barcode Bandit', 'Lumber Legend', 'ASN Ace', 'Bucket Boss'];
  let botTimer = null;
  $('btnSim').onclick = () => {
    toggleMenu(false);
    BOT_NAMES.forEach((nm, i) => setTimeout(() => onUp({ k: 'join', p: 'bot' + i, nm, av: AVATARS[i * 2 % AVATARS.length], cs: ['A pirate', 'Inflation', 'Taylor Swift', 'A ghost', '', 'The Fed chair', 'A 3% mortgage', 'Batman', 'An orange bucket', '', 'A vampire', 'Tired parent'][i] }), i * 260));
    clearInterval(botTimer);
    botTimer = setInterval(() => {
      const it = item(steps[H.pos]);
      if (!it || !isOpen(it.id)) { if (Math.random() < 0.15) floatReaction(REACTS[Math.floor(Math.random() * REACTS.length)]); return; }
      BOT_NAMES.forEach((nm, i) => {
        const pid = 'bot' + i;
        if ((H.answers[it.id] || {})[pid] || Math.random() < 0.7) return;
        let a;
        if (it.type === 'text') a = ['Sticky', 'Resilient', 'Expensive', 'Weird', 'Locked', 'Sticky', 'Waiting', 'Resilient', 'Sticky'][i % 9];
        else { const n = it.type === 'vs' ? 2 : it.opts.length; a = Math.random() < 0.65 && it.a != null ? it.a : Math.floor(Math.random() * n); }
        onUp({ k: 'ans', p: pid, nm, av: AVATARS[i * 2 % AVATARS.length], q: it.id, a });
      });
    }, 700);
  };

  // ---------- keys ----------
  addEventListener('keydown', e => {
    if (e.target.closest('input, textarea')) return;
    const k = e.key;
    if (!$('menu').classList.contains('hidden') && k !== 'Escape' && k.toLowerCase() !== 'g') return;
    if (['ArrowRight', ' ', 'PageDown', 'Enter'].includes(k)) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); prev(); }
    else if (k === 'Escape') { $('menu').classList.add('hidden'); $('qrOverlay').classList.add('hidden'); }
    else if (k.toLowerCase() === 'g' || k.toLowerCase() === 'm') toggleMenu();
    else if (k.toLowerCase() === 'q') $('qrOverlay').classList.toggle('hidden');
    else if (k.toLowerCase() === 's') { sound.toggle(); muteLabel(); }
    else if (k.toLowerCase() === 'f') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}); }
    else if (k.toLowerCase() === 'l') go(steps.findIndex((x, i) => i >= H.pos && x.v === 'board') > -1 ? steps.findIndex((x, i) => i >= H.pos && x.v === 'board') : steps.findIndex(x => x.v === 'podium'));
    else if (k.toLowerCase() === 't') {
      const it = item(steps[H.pos]);
      if (it && isOpen(it.id)) { H.extra = H.extra || {}; H.extra[it.id] = (H.extra[it.id] || 0) + 10; save(); broadcast(true); }
    }
    else if (/^[1-9]$/.test(k) && +k <= PROGRAM.length) go(steps.findIndex(x => x.v === 'title' && x.s === +k - 1));
  });
  // click on the stage (not on controls) also advances, for presenters with a mouse
  $('stage').addEventListener('dblclick', next);

  // ---------- helpers ----------
  const BAD = /\b(fuck\w*|shit\w*|bitch\w*|cunt\w*|dick\w*|cock\w*|puss\w*|asshole\w*|bastard\w*|whore\w*|slut\w*|nigg\w*|fag\w*|retard\w*)\b/gi;
  function clean(s) { return s.replace(BAD, m => m[0] + '*'.repeat(m.length - 1)); }

  // ---------- boot ----------
  $('qrBig').innerHTML = qrSVG(JOIN_URL);
  $('qrMini').innerHTML = qrSVG(JOIN_URL);
  $('qrOver').innerHTML = qrSVG(JOIN_URL);
  $('joinText').textContent = Live.test ? JOIN_URL.replace(/^https?:\/\//, '') : SHORT + (ROOM !== 'icqa-pk26' ? '?room=' + ROOM : '');
  window.__host = { steps, get H() { return H; }, go, next, joinUrl: JOIN_URL };
  renderCount();
  render(true);
  const isPresenter = Live.test || new URLSearchParams(location.search).has('presenter') || Live.store.get('ql-presenter', false);
  if (isPresenter) connect();
  else {
    $('gate').classList.remove('hidden');
    $('gateYes').onclick = () => { Live.store.set('ql-presenter', true); $('gate').classList.add('hidden'); connect(); };
  }
})();
