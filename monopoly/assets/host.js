/* Big screen. The host is the single source of truth: it keeps players,
   answers and cash, and broadcasts a small state object to the phones.
   It can be driven from its own keyboard or from a phone (remote.html, PIN-protected). */
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
  const REMOTE_URL = location.origin + '/monopoly/remote.html' + (joinQs.toString() ? '?' + joinQs : '');
  const REACTS = ['👏', '😂', '🤯', '🔥', '💸', '😱'];
  const LETTERS = ['A', 'B', 'C', 'D'];
  const MONEY = ['#cfe8c4', '#ffffff', '#f6c544', '#e2231a', '#9fd4f2'];
  const CHEST_DRAWS = M.chestDraws;

  // ---------- steps ----------
  const steps = [{ v: 'lobby' }, { v: 'rules' }];
  M.quiz.forEach((it, i) => steps.push({ v: 'roll', i }, { v: 'q', i }, { v: 'reveal', i }));
  steps.push({ v: 'board' }, { v: 'podium' });
  for (let k = 0; k < CHEST_DRAWS; k++) steps.push({ v: 'chest', k });
  steps.push({ v: 'end' });
  const qOf = st => (st && st.i != null ? M.quiz[st.i] : null);

  // ---------- persistent host state ----------
  const fresh = () => ({
    sid: Live.rid(6), pos: 0, players: {}, answers: {}, opened: {}, closed: {}, scored: {}, gained: {},
    prevRank: {}, chest: [], extra: {}, pin: String(1000 + Math.floor(Math.random() * 9000)),
  });
  let H = Live.store.get(KEY, null) || fresh();
  const F = fresh();
  Object.keys(F).forEach(k => { if (H[k] == null) H[k] = F[k]; });
  // Each open presenter screen has its own id and start time; if a newer one appears, this one steps aside.
  const HID = Live.rid(6);
  let ST = 0, passive = false;
  const save = () => { if (!passive) Live.store.set(KEY, H); };

  // ---------- live relay ----------
  let live = { publishState() {}, status: () => ({}), channels: [] };
  function onOtherHost(m) {
    if (m.hid === HID || m._stale || !(m.st > ST)) return;
    passive = true;
    $('takenOver').classList.remove('hidden');
  }
  function connect() {
    ST = Date.now();
    live = Live.create({
      room: ROOM, role: 'host',
      onMsg: (k, m) => { if (passive) return; if (k === 'up') onUp(m); else if (k === 'state') onOtherHost(m); },
      onStatus: st => { renderRelays(st); if (Object.values(st).includes('up')) broadcast(true); },
    });
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

  // Kept small: one update must stay under the site relay's size limit with 150 players.
  // me[pid] = [cash / 10, rank, rent this question / 10, flags, Community Chest tickets]; flags: 1 = answered this question.
  function stateForPhones() {
    const st = steps[H.pos];
    const out = { t: Date.now(), sid: H.sid, hid: HID, st: ST, ph: st.v, pos: H.pos, n: Object.keys(H.players).length, lbl: LABEL(st), nx: steps[H.pos + 1] ? LABEL(steps[H.pos + 1]) : '' };
    const it = qOf(st);
    const box = it ? H.answers[it.id] || {} : {};
    out.me = {};
    ranking().forEach((p, idx) => {
      out.me[p.pid] = [p.cash / 10, idx + 1, it ? ((H.gained[it.id] || {})[p.pid] || 0) / 10 : 0, box[p.pid] ? 1 : 0, tickets(p.pid)];
    });
    if (it) {
      const sp = M.board[it.at];
      out.q = { id: it.id, i: st.i, of: M.quiz.length, at: it.at, tag: it.tag, sp: sp.n, c: sp.c ? M.colors[sp.c] : '', dbl: !!it.double };
      if (st.v !== 'roll') {
        const open = isOpen(it.id);
        Object.assign(out.q, { q: it.q, opts: it.opts, open });
        if (open) out.q.left = Math.max(0, (H.opened[it.id] + limitOf(it) * 1000 - Date.now()) / 1000);
        out.na = Object.keys(box).length;
      }
      if (st.v === 'reveal') out.rv = { a: it.a, fact: it.fact };
    }
    if (st.v === 'chest') out.cw = H.chest[st.k] || null;
    if (['podium', 'chest', 'end'].includes(st.v)) out.pk = picks().map(x => ({ pid: x.pid, nm: H.players[x.pid].nm, av: H.players[x.pid].av, why: x.why }));
    return out;
  }
  let lastSent = 0, sendTimer = null;
  function broadcast(force) {
    const now = Date.now();
    clearTimeout(sendTimer);
    if (!force && now - lastSent < 350) { sendTimer = setTimeout(() => broadcast(true), 350); return; }
    lastSent = now;
    const st = steps[H.pos], it = qOf(st);
    const phaseKey = `${st.v}:${H.pos}:${it ? isOpen(it.id) : ''}:${Math.floor(now / 240000)}`;
    live.publishState(stateForPhones(), phaseKey);
  }
  setInterval(() => { checkDeadline(); broadcast(true); }, 10000);

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
    } else if ((p.nm !== nm && !p.lock) || p.av !== av) {
      if (!p.lock) p.nm = nm;
      p.av = av; save(); if (steps[H.pos].v === 'lobby') renderCrowd();
    }
    return pid;
  }
  function onUp(m) {
    checkDeadline();
    if (m.k === 'ctl') { onRemote(m); return; } // the phone remote is not a player
    const pid = addPlayer(m);
    if (!pid) return;
    if (m.k === 'ans') onAnswer(pid, m);
    else if (m.k === 're' && REACTS[m.e] != null) floatReaction(REACTS[m.e]);
  }
  // Remote commands name the step they were pressed on, so a repeated or late copy never skips ahead twice.
  function onRemote(m) {
    if (String(m.pin) !== H.pin) return;
    if (m.a === 'time') { addTime(); return; }
    if (m.at !== H.pos) return;
    if (m.a === 'next') next();
    else if (m.a === 'prev') prev();
  }
  function onAnswer(pid, m) {
    const it = qOf(steps[H.pos]);
    if (!it || it.id !== m.q || !isOpen(it.id) || steps[H.pos].v !== 'q') return;
    const box = (H.answers[it.id] = H.answers[it.id] || {});
    if (box[pid]) return; // first answer counts
    const a = Number(m.a);
    if (!(a >= 0 && a < it.opts.length)) return;
    // Speed is timed on the phone, from when the question appeared there, so a slower connection costs nothing.
    // The host's own clock caps it: nobody can claim to be faster than the message that arrived.
    const hostMs = Math.max(0, Date.now() - H.opened[it.id]);
    const phoneMs = Number(m.ms);
    box[pid] = { a, ms: phoneMs >= 0 && phoneMs < hostMs ? Math.round(phoneMs) : hostMs };
    save(); renderAnswered(it, true); broadcast();
    const n = Object.keys(H.players).length;
    if (n > 0 && Object.keys(box).length >= n) setTimeout(() => { if (qOf(steps[H.pos]) === it && isOpen(it.id)) timeUp(it); }, 900);
  }
  // ---------- timing ----------
  const limitOf = it => M.limit + (H.extra[it.id] || 0);
  const isOpen = qid => !!H.opened[qid] && !H.closed[qid];
  let tickTimer = null;
  // The question timer also closes here, on any incoming message: a browser slows the timers of a window it hides.
  function checkDeadline() {
    const st = steps[H.pos], it = qOf(st);
    if (st.v === 'q' && it && isOpen(it.id) && Date.now() > H.opened[it.id] + limitOf(it) * 1000) timeUp(it);
  }
  function addTime() {
    const st = steps[H.pos], it = qOf(st);
    if (st.v === 'q' && it && isOpen(it.id)) { H.extra[it.id] = (H.extra[it.id] || 0) + 10; save(); broadcast(true); }
  }
  function timeUp(it) {
    if (H.closed[it.id]) return;
    H.closed[it.id] = Date.now(); save();
    const idx = steps.findIndex(s => s.v === 'reveal' && qOf(s) === it);
    if (steps[H.pos].v === 'q' && qOf(steps[H.pos]) === it) go(idx);
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
      document.body.classList.toggle('urgent', sec <= 5 && left > 0);
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
      if (owns(pid, it)) pts *= 2; // the token landed on a property this player owns
      H.players[pid].cash += pts; g[pid] = pts;
      H.players[pid].tms = (H.players[pid].tms || 0) + ans.ms; // total time on right answers: the tie-breaker
    });
    save();
  }
  const hands = {};
  const owns = (pid, it) => (hands[pid] = hands[pid] || M.handFor(pid)).includes(it.at);
  const ownersOf = it => Object.keys(H.players).filter(pid => owns(pid, it));
  // Ties on cash go to whoever was faster in total on their right answers, then to whoever joined first.
  const ranking = () => Object.entries(H.players).map(([pid, p]) => ({ pid, ...p }))
    .sort((a, b) => b.cash - a.cash || (a.tms || 0) - (b.tms || 0) || a.j - b.j);
  // The winners: 1st place, then each Community Chest draw.
  function picks() {
    const r = ranking().slice(0, 1).map(p => ({ pid: p.pid, why: '1st place' }));
    H.chest.forEach((pid, k) => { if (pid && H.players[pid]) r.push({ pid, why: CHEST_DRAWS > 1 ? `Community Chest draw ${k + 1}` : "Community Chest draw" }); });
    return r;
  }
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
  // A double press, a bouncing clicker or a repeated remote tap moves one step, never two;
  // and a question that only just opened cannot be shut by a stray second press.
  let lastNext = 0;
  function next() {
    const now = Date.now();
    if (now - lastNext < 450) return;
    const st = steps[H.pos], it = qOf(st);
    if (st.v === 'q' && it && isOpen(it.id)) {
      const n = Object.keys(H.players).length, a = Object.keys(H.answers[it.id] || {}).length;
      if (now - H.opened[it.id] < 3000 && !(n && a >= n)) return;
      lastNext = now; timeUp(it); return;
    }
    lastNext = now;
    go(H.pos + 1);
  }
  function prev() {
    let i = H.pos - 1;
    const s = steps[i];
    if (s && s.v === 'q' && H.closed[qOf(s).id]) i--; // do not re-open a closed question
    go(i, { silent: true });
  }

  // ---------- board ----------
  // Board icons, distribution-center style. Rails are conveyors; utilities are chargers.
  const CONVEYOR = '<svg viewBox="0 0 40 20" width="2.2em" aria-hidden="true"><rect x="1" y="5" width="38" height="7" rx="3.5" fill="#555"/><g fill="#bbb"><circle cx="6" cy="8.5" r="2.4"/><circle cx="14" cy="8.5" r="2.4"/><circle cx="22" cy="8.5" r="2.4"/><circle cx="30" cy="8.5" r="2.4"/><circle cx="35" cy="8.5" r="2.4"/></g><rect x="10" y="0" width="9" height="5" fill="#c8955a" stroke="#7a5230" stroke-width=".8"/><rect x="5" y="12" width="3" height="7" fill="#777"/><rect x="32" y="12" width="3" height="7" fill="#777"/></svg>';
  // Clean line icons, drawn in the board's ink colour, instead of emoji.
  const svgI = (body, w = '2em') => `<svg viewBox="0 0 24 24" width="${w}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const ICON = {
    chest: svgI('<path d="M3 8l9-4 9 4v9l-9 4-9-4z" stroke="#2d6aa3"/><path d="M3 8l9 4 9-4M12 12v9" stroke="#2d6aa3"/><path d="M7.5 6l9 4" stroke="#2d6aa3" opacity=".6"/>'),
    chance: '<span class="ic-q">?</span>',
    rail: CONVEYOR,
    tax: svgI('<circle cx="12" cy="12" r="9" stroke="#1f6b1a"/><path d="M15 9.2c-.6-1-1.7-1.6-3-1.6-1.8 0-3 .9-3 2.2 0 3 6 1.400 6 4.400 0 1.300-1.300 2.200-3 2.200-1.400 0-2.600-.6-3.200-1.700M12 6v12" stroke="#1f6b1a"/>'),
  };
  const SPACE_ICON = {
    12: svgI('<rect x="3" y="8" width="16" height="9" rx="2"/><path d="M21 11v3M12 9.500l-2.500 3.500h4l-2.500 3.500" stroke="#f96302"/>'),
    28: svgI('<rect x="5" y="9" width="14" height="9" rx="3"/><path d="M12 9V5M9 5h6"/><circle cx="9.500" cy="13.500" r="1.200" fill="#f96302" stroke="none"/><circle cx="14.500" cy="13.500" r="1.200" fill="#f96302" stroke="none"/><path d="M7 20.500h2M15 20.500h2"/>'),
  };
  const CORNER_ICON = [
    svgI('<path d="M3 12h15M12 5l7 7-7 7" stroke="#c8102e" stroke-width="2.6"/>', '2.4em'),
    svgI('<rect x="4" y="4" width="16" height="16" rx="1.500"/><path d="M8 4v16M12 4v16M16 4v16" stroke="#f96302"/>', '2.1em'),
    svgI('<path d="M5 10h11v4a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 11h1.500a2.500 2.500 0 0 1 0 5H16M8 4.500c0 1 1 1 1 2s-1 1-1 2M12 4.500c0 1 1 1 1 2s-1 1-1 2" /><path d="M4 21h13" stroke="#f96302"/>', '2.1em'),
    svgI('<path d="M4 16a8 8 0 0 1 16 0z" stroke="#f96302"/><path d="M2.500 16h19M12 8V5.500M9 9.500V7M15 9.500V7"/>', '2.1em'),
  ];
  // The token: an orange forklift carrying a pallet. Drawn facing left; flipped on the top row.
  const FORKLIFT = '<svg viewBox="0 0 64 48" aria-hidden="true"><rect x="2" y="12" width="18" height="16" fill="#c8955a" stroke="#7a5230" stroke-width="1"/><path d="M2 18h18" stroke="#e8d3a8" stroke-width="2"/><rect x="0" y="29" width="22" height="4" fill="#8b5a2b"/><rect x="0" y="33" width="25" height="2.6" fill="#333"/><rect x="22" y="3" width="4" height="35" fill="#444"/><path d="M30 20V6h19v14" fill="none" stroke="#333" stroke-width="2.2"/><rect x="26" y="20" width="27" height="16" rx="3" fill="#F96302"/><rect x="50" y="17" width="11" height="19" rx="2" fill="#c24e00"/><circle cx="40" cy="14" r="3.6" fill="#f2c9a0"/><path d="M36 13a4 4 0 0 1 8 0z" fill="#fdd835"/><circle cx="33" cy="39" r="6.5" fill="#222"/><circle cx="33" cy="39" r="2.5" fill="#999"/><circle cx="53" cy="40" r="5.5" fill="#222"/><circle cx="53" cy="40" r="2.2" fill="#999"/></svg>';
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
      const longWord = Math.max(...s.n.split(' ').map(w => w.length)) >= 10; // e.g. BREINIGSVILLE: shrink rather than split the word
      d.className = `sp side-${g.side} ${s.t === 'corner' ? 'corner' : ''} ${longWord && s.t !== 'corner' ? 'lw' : ''}`;
      d.id = 'sp' + p;
      d.style.gridRow = g.r; d.style.gridColumn = g.c;
      if (s.c) d.style.setProperty('--c', M.colors[s.c]);
      const icon = s.t === 'corner' ? CORNER_ICON[p / 10] : SPACE_ICON[p] || ICON[s.t] || '';
      d.innerHTML = `${s.c ? '<span class="band"></span>' : ''}<span class="lbl">${icon ? `<span class="ic">${icon}</span>` : ''}<span>${esc(s.n)}</span>${s.sub ? `<span class="pr">${esc(s.sub)}</span>` : s.p ? `<span class="pr">$${s.p}</span>` : ''}</span>`;
      b.appendChild(d);
    });
  }
  function placeWalker(p) {
    const el = $('sp' + p), w = $('walker');
    if (!el) return;
    w.classList.toggle('flip', p > 20 && p <= 30); // drive forks-first along the top row too
    w.style.left = (el.offsetLeft + el.offsetWidth / 2 + 3) + 'px';
    w.style.top = (el.offsetTop + el.offsetHeight / 2 + 3) + 'px';
  }
  const tokenAt = i => (i > 0 ? M.quiz[i - 1].at : 0); // where the token sits before roll i
  function markDone() {
    M.quiz.forEach(it => $('sp' + it.at).classList.toggle('done', !!H.scored[it.id]));
    document.querySelectorAll('.sp.hit, .sp.trail').forEach(e => e.classList.remove('hit', 'trail'));
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
  // ---------- rendering ----------
  const views = ['vStage', 'vQ', 'vBoard', 'vPodium', 'vChest', 'vEnd'];
  function show(id) {
    views.forEach(v => $(v).classList.toggle('on', v === id));
    $('miniJoin').classList.toggle('hidden', id === 'vPodium' || (id === 'vStage' && steps[H.pos].v === 'lobby'));
  }
  function pane(group, id) { document.querySelectorAll(group).forEach(e => e.classList.toggle('on', e.id === id)); }
  // Lobby music between questions; a ticking bed while a question is open; quiet for dice and reveals.
  function music(st, it) {
    clearTimeout(musicTimer);
    if (st.v === 'q' && it && !H.closed[it.id]) MUSIC.play('think');
    else if (st.v === 'roll' || st.v === 'podium' || st.v === 'chest') MUSIC.stop(0.4);
    else if (st.v === 'reveal') { MUSIC.stop(0.3); musicTimer = setTimeout(() => MUSIC.play('lobby'), 4500); }
    else MUSIC.play('lobby');
  }
  let musicTimer = null;
  function render(silent) {
    clearInterval(tickTimer);
    if (steps[H.pos].v !== 'podium') { CELEBRATE.spotlight(false); $('champTake').classList.remove('on', 'out', 'reveal'); }
    clearInterval(tagTimer);
    document.body.classList.remove('urgent');
    tilt(false);
    const st = steps[H.pos];
    const it = qOf(st);
    music(st, it);
    renderProg(st);
    $('hudSeg').textContent = it ? `Roll ${st.i + 1} of ${M.quiz.length} · ${it.section}: ${M.board[it.at].n}` : 'Monopoly: All-Hands Edition';
    if (st.v === 'lobby' || st.v === 'rules' || st.v === 'roll') {
      show('vStage'); markDone();
      if (st.v === 'lobby') { pane('.center-pane', 'cLobby'); pane('.side-pane', 'sLobby'); placeWalker(0); renderCrowd(); startTaglines(); }
      else if (st.v === 'rules') { pane('.center-pane', 'cRules'); pane('.side-pane', 'sLobby'); placeWalker(0); renderCrowd(); startTaglines(); if (!silent) sound.play('whoosh'); }
      else renderRoll(st, silent);
    }
    else if (st.v === 'q' || st.v === 'reveal') {
      if (st.v === 'q' && !H.opened[it.id]) { H.opened[it.id] = Date.now(); save(); }
      if (st.v === 'reveal') { if (!H.closed[it.id]) H.closed[it.id] = Date.now(); score(it); }
      renderQ(it, st, silent);
    }
    else if (st.v === 'board') renderBoardView(silent);
    else if (st.v === 'podium') renderPodium(silent);
    else if (st.v === 'chest') renderChest(st.k, silent);
    else if (st.v === 'end') renderEnd(silent);
    if (silent || st.v !== 'reveal') renderLeaders(); // on a live reveal the scoreboard moves with the answer, not before it
  }
  // Six pips in the top bar: which roll we are on, and which are done.
  function renderProg(st) {
    const started = !['lobby', 'rules'].includes(st.v);
    $('prog').innerHTML = M.quiz.map((q, i) => `<i class="${H.scored[q.id] ? 'done' : ''} ${st.i === i ? 'cur' : ''}" title="${esc(q.section)}"></i>`).join('');
    $('prog').classList.toggle('hidden', !started);
  }
  // The board leans back like a table while the forklift drives, then stands up again for the landing.
  const TILT = !new URLSearchParams(location.search).has('flat') && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  function tilt(on) {
    const wrap = $('board').parentNode, scene = document.querySelector('.dc-scene');
    wrap.classList.toggle('tilt', !!on && TILT);
    if (!on) { wrap.classList.remove('orbit', 'rolling'); $('dice3d').classList.remove('on'); }
  }
  // Two real 3D dice thrown across the tilted board: they arc in from the near corner, bounce, tumble and settle on the roll.
  const BOUNCES = [0.40, 0.72, 0.96, 1.13, 1.25]; // seconds at which a die hits the board; the sound uses the same times
  function throwDice(d1, d2) {
    const box = $('dice3d'), W = box.offsetWidth, sz = W * 0.11, D = 1450;
    box.style.setProperty('--s', sz + 'px');
    box.innerHTML = ''; box.classList.add('on');
    [d1, d2].forEach((n, k) => {
      const el = document.createElement('div'); el.className = 'd3';
      el.innerHTML = `<div class="d3s"></div><div class="d3b"><div class="d3i">${[1, 2, 3, 4, 5, 6].map(f => `<div class="face f${f}">${Array.from({ length: 9 }, (_, q) => PIPS[f].includes(q) ? '<i></i>' : '<span></span>').join('')}</div>`).join('')}</div></div>`;
      const tx = W * (k ? 0.585 : 0.415) + (Math.random() - 0.5) * W * 0.03, ty = W * (k ? 0.53 : 0.47) + (Math.random() - 0.5) * W * 0.03;
      const sx = W * (k ? 0.02 : -0.12), sy = W * (k ? 1.12 : 1.0);
      el.style.left = tx + 'px'; el.style.top = ty + 'px';
      box.appendChild(el);
      el.animate([{ transform: `translate(${sx - tx}px, ${sy - ty}px)` }, { transform: 'translate(0, 0)' }], { duration: D, easing: 'cubic-bezier(.15,.6,.3,1)', fill: 'both' });
      // height: a fall to the first impact, then arcs that get lower each bounce
      const hit = BOUNCES.map(x => (x * 1000) / D), peak = [1.5, 0.85, 0.45, 0.2].map(h => h * sz), z = v => `translateZ(${v + sz / 2}px)`;
      const kf = [{ offset: 0, transform: z(sz * 2.1), easing: 'ease-in' }];
      hit.forEach((h, i) => {
        kf.push({ offset: h, transform: z(0), easing: 'ease-out' });
        if (i < hit.length - 1) kf.push({ offset: (h + hit[i + 1]) / 2, transform: z(peak[i]), easing: 'ease-in' });
      });
      kf.push({ offset: 1, transform: z(0) });
      el.querySelector('.d3b').animate(kf, { duration: D, fill: 'both' });
      const [rx, ry] = FACE_ROT[n], yaw = (Math.random() - 0.5) * 50, dir = k ? -1 : 1;
      el.querySelector('.d3i').animate([
        { transform: `rotateZ(${yaw + dir * 260}deg) rotateX(${rx + dir * 900}deg) rotateY(${ry - dir * 720}deg)` },
        { transform: `rotateZ(${yaw}deg) rotateX(${rx}deg) rotateY(${ry}deg)` },
      ], { duration: D * 0.93, easing: 'cubic-bezier(.2,.55,.35,1)', fill: 'both' });
      el.querySelector('.d3s').animate([{ opacity: 0.1, transform: 'scale(1.9)' }, { opacity: 0.5, transform: 'scale(1)' }], { duration: D * 0.3, fill: 'both' });
    });
    MUSIC.sfx.dice(BOUNCES);
  }
  function renderCount() {
    const ids = Object.keys(H.players), bots = ids.filter(id => id.startsWith('bot')).length;
    $('hudCount').textContent = ids.length + (bots ? ` (${bots} bots)` : '');
    $('stPlayers').textContent = ids.length;
    renderLeaders();
  }
  // Always-visible scoreboard while the game runs: how many are playing, and the top 5.
  function renderLeaders() {
    const v = steps[H.pos].v;
    const on = v === 'roll' || v === 'q' || v === 'reveal';
    $('leaders').classList.toggle('hidden', !on);
    if (!on) return;
    const el = $('leaders'), st = steps[H.pos];
    const before = {};
    el.querySelectorAll('[data-pid]').forEach(e => (before[e.dataset.pid] = e.getBoundingClientRect().left));
    const r = ranking();
    const g = v === 'reveal' ? H.gained[qOf(st).id] || {} : {};
    el.innerHTML = `<div class="ld-n"><b class="num">${r.length}</b><span>playing</span></div>` +
      r.slice(0, 5).map((p, i) => `<div class="ld-p ${i === 0 ? 'first' : ''}" data-pid="${esc(p.pid)}"><span class="ld-r">${i + 1}</span><span class="ld-av">${p.av}</span><span class="ld-nm">${esc(p.nm)}</span><span class="ld-c num">${fmt(p.cash)}</span>${g[p.pid] ? `<span class="ld-g num">+${fmt(g[p.pid])}</span>` : ''}</div>`).join('');
    if (!el.animate || !Object.keys(before).length) return;
    el.querySelectorAll('[data-pid]').forEach(e => {
      const was = before[e.dataset.pid], now = e.getBoundingClientRect().left;
      if (was == null) e.animate([{ transform: 'translateY(130%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 550, easing: 'cubic-bezier(.2,1.3,.4,1)' });
      else if (Math.abs(was - now) > 2) e.animate([{ transform: `translateX(${was - now}px)` }, { transform: 'none' }], { duration: 700, easing: 'cubic-bezier(.2,1,.3,1)' });
    });
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
  // Home Depot taglines rotate on the lobby side panel.
  let tagTimer = null, tagIdx = 0;
  function startTaglines() {
    clearInterval(tagTimer);
    const show1 = () => { const el = $('tagline'); el.textContent = M.taglines[tagIdx++ % M.taglines.length]; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); };
    show1(); tagTimer = setInterval(show1, 5000);
  }

  // roll
  async function renderRoll(st, silent) {
    show('vStage'); pane('.center-pane', 'cRoll'); pane('.side-pane', 'sRoll');
    const it = qOf(st), sp = M.board[it.at];
    const from = tokenAt(st.i), dist = (it.at - from + 40) % 40;
    const [d1, d2] = it.dice;
    $('rollTitle').textContent = `Roll ${st.i + 1} of ${M.quiz.length}: ${it.section}`;
    $('landCard').innerHTML = '';
    const land = () => {
      $('rollSum').textContent = `${d1} + ${d2} = ${dist}`;
      $('rollLand').textContent = it.at === 0 ? 'Back on GO! Lap complete.' : `Landed on ${sp.n}!`;
      $('sp' + it.at).classList.add('hit');
      $('landCard').innerHTML = landCard(it);
    };
    if (silent) { showDie($('die1'), d1); showDie($('die2'), d2); placeWalker(it.at); land(); return; }
    const me = busy;
    placeWalker(from);
    $('rollSum').innerHTML = '&nbsp;'; $('rollLand').innerHTML = '&nbsp;';
    const stamp = $('letsDo'); stamp.classList.remove('on'); void stamp.offsetWidth; stamp.classList.add('on');
    tilt(true);
    showDie($('die1'), d1); showDie($('die2'), d2);
    if (TILT) {
      $('board').parentNode.classList.add('rolling'); // the card steps aside: the dice are thrown on the board itself
      throwDice(d1, d2);
      await sleep(1650);
      if (me !== busy) return;
      const chip = document.createElement('div'); chip.className = 'd3-sum'; chip.textContent = `${d1} + ${d2} = ${dist}`;
      $('dice3d').appendChild(chip); MUSIC.sfx.chime();
      await sleep(750);
      if (me !== busy) return;
      $('board').parentNode.classList.add('orbit'); // the camera drifts round the table while the forklift drives
    } else {
      MUSIC.sfx.dice(BOUNCES);
      showDie($('die1'), d1, true); showDie($('die2'), d2, true);
      await sleep(1400);
      if (me !== busy) return;
    }
    $('rollSum').textContent = `${d1} + ${d2} = ${dist}`;
    const w = $('walker');
    MUSIC.sfx.forklift(dist * 0.19 + 0.1);
    for (let s = 1; s <= dist; s++) {
      MUSIC.sfx.step(s, dist);
      if (me !== busy) return;
      placeWalker((from + s) % 40);
      w.classList.remove('hop'); void w.offsetWidth; w.classList.add('hop');
      const cell = $('sp' + ((from + s) % 40)); cell.classList.remove('trail'); void cell.offsetWidth; cell.classList.add('trail');
      await sleep(190);
    }
    if (me !== busy) return;
    tilt(false);
    land();
    MUSIC.sfx.horn();
    setTimeout(() => { if (me === busy) landBurst(it); }, 950); // once the board has stood back up
    if (sp.t === 'chance' || it.at === 0) { sound.play('fanfare'); confetti({ count: 120, colors: ['#f96302', '#ffe35a', '#fff'] }); }
    else sound.play('ding');
  }
  // A shock ring on the landed space, and the tokens of everyone who owns it flying out of it.
  function landBurst(it) {
    const r = $('sp' + it.at).getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const add = (cls, txt, css) => { const d = document.createElement('div'); d.className = cls; d.textContent = txt; d.style.cssText = `left:${cx}px;top:${cy}px;${css || ''}`; document.body.appendChild(d); setTimeout(() => d.remove(), 2400); };
    add('land-ring', ''); add('land-ring', '', 'animation-delay:.18s');
    const own = M.ownable.includes(it.at) ? ownersOf(it).slice(0, 36) : [];
    own.forEach((pid, k) => {
      const a = Math.random() * 6.283, d = 110 + Math.random() * 240;
      add('own-fly', H.players[pid].av, `--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 70}px;animation-delay:${k * 22}ms`);
    });
    if (own.length) sound.play('pop');
  }
  function landCard(it) {
    const sp = M.board[it.at];
    if (it.at === 0) return `<div class="prop-card special"><div class="ph">GO</div><div class="pb">You made it all the way around the board.<br><b>Final question pays DOUBLE</b></div></div>`;
    if (sp.t === 'chance') return `<div class="chance-card" style="max-width:320px"><div class="cc-q">?</div><div><div class="cc-k">Chance</div><div class="cc-t">Bank error in your favour. This question pays DOUBLE rent.</div></div></div>`;
    const own = ownersOf(it);
    const col = sp.c ? M.colors[sp.c] : '#fff', dark = !sp.c || ['yellow', 'lightblue'].includes(sp.c);
    return `<div class="prop-card" style="--c:${col};--t:${dark ? '#111' : '#fff'}"><div class="ph">${esc(sp.n)}</div><div class="pb">Price $${sp.p}<br><span>Rent up to $${M.pay.base + M.pay.speed}</span></div></div>
      <div class="owners"><b class="num">${own.length}</b> ${own.length === 1 ? 'player owns' : 'players own'} this property<br><span>Their right answer pays <b>DOUBLE</b></span>
      <div class="own-faces">${own.slice(0, 40).map(pid => `<span title="${esc(H.players[pid].nm)}">${H.players[pid].av}</span>`).join('')}</div></div>`;
  }

  // question
  // Shrinks the question screen's type until everything fits above the scoreboard, on any laptop or projector.
  function fitQ() {
    // measured from layout boxes, which entrance animations and scaling do not disturb
    const v = $('vQ'), pad = parseFloat(getComputedStyle(v).paddingBottom) || 0;
    const fits = () => { const kids = [...v.children].filter(e => e.offsetHeight), last = kids[kids.length - 1]; return !last || last.offsetTop + last.offsetHeight <= v.clientHeight - pad + 1; };
    // the question itself gives way first (on the answer screen it has already been read), then everything else
    let t = 1, k = 1;
    v.style.setProperty('--qs', 1); v.style.setProperty('--qt', 1);
    while (t > 0.56 && !fits()) { t -= 0.04; v.style.setProperty('--qt', t.toFixed(2)); }
    while (k > 0.5 && !fits()) { k -= 0.04; v.style.setProperty('--qs', k.toFixed(2)); }
  }
  async function renderQ(it, st, silent) {
    show('vQ');
    const sp = M.board[it.at];
    $('qSpace').style.setProperty('--c', sp.c ? M.colors[sp.c] : '#fff');
    $('qSpace').querySelector('.qs-n').textContent = sp.n;
    const nOwn = M.ownable.includes(it.at) ? ownersOf(it).length : 0;
    $('qTag').textContent = it.double ? `${it.tag}: DOUBLE RENT` : nOwn ? `${it.tag} · ${nOwn} ${nOwn === 1 ? 'OWNER' : 'OWNERS'}: DOUBLE RENT` : it.tag;
    $('qTag').className = 'q-tag' + (it.double ? ' dbl' : '');
    $('qCount').textContent = `${it.section} · Question ${st.i + 1} of ${M.quiz.length}`;
    $('qText').textContent = it.q;
    const revealed = st.v === 'reveal';
    const suspense = revealed && !silent; // the bars grow first; the right answer lands a beat later
    $('vQ').classList.toggle('rv', revealed);
    const d = it.opts.map(() => 0);
    Object.values(H.answers[it.id] || {}).forEach(x => d[x.a]++);
    const tot = Math.max(1, d.reduce((a, b) => a + b, 0));
    $('opts').className = 'opts' + (revealed ? ' revealed' : '') + (suspense ? ' pending' : '');
    $('opts').innerHTML = it.opts.map((o, i) => `<div class="opt c${i} ${revealed && i === it.a ? 'right' : ''}" style="--i:${i}">
      <div class="opt-bar" style="--w:${revealed ? (d[i] / tot) * 100 : 0}%"></div>
      <span class="opt-l"><span>${LETTERS[i]}</span></span><span class="opt-t">${esc(o)}</span>
      <span class="opt-n num">${revealed ? `${d[i]} <small>${Math.round((d[i] / tot) * 100)}%</small>` : ''}</span></div>`).join('');
    $('timer').classList.toggle('hidden', revealed);
    $('fact').classList.toggle('on', revealed);
    $('fact').classList.toggle('held', suspense);
    $('particip').classList.toggle('hidden', !revealed);
    renderAnswered(it);
    if (!revealed) {
      fitQ();
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
      ${M.ownable.includes(it.at) ? `<div class="fast"><div class="kicker" style="color:#8a6d00">Owners cashed in</div>${Object.keys(g).filter(pid => owns(pid, it)).length} of ${ownersOf(it).length}</div>` : ''}
      <div class="rent"><span class="kicker" style="color:#555">Rent paid out</span><span class="num" id="paid">$0</span>${Object.keys(g).length} players</div>`;
    fitQ();
    if (silent) { $('paid').textContent = fmt(paid); return; }
    const me = busy;
    MUSIC.sfx.riser(1.25);
    await sleep(1300);
    if (me !== busy) return;
    $('opts').classList.remove('pending'); $('fact').classList.remove('held');
    MUSIC.sfx.hit();
    renderLeaders();
    countUp($('paid'), paid, { dur: 1400, fmt });
    if (tot > 0 && d[it.a] / tot >= 0.5) { sound.play('cash'); confetti({ count: 150, colors: MONEY }); }
    else if (d.some(x => x > 0)) { sound.play('trombone'); toast('Most of the room missed that one. Go directly to Jail. Do not pass GO.'); }
    else sound.play('ding');
  }
  function renderAnswered(it, popNew) {
    const box = H.answers[it.id] || {};
    const n = Object.keys(box).length, of = Object.keys(H.players).length;
    $('ansN').textContent = n;
    $('ansOf').textContent = `of ${of} answered`;
    $('particip').innerHTML = `<b class="num">${n}</b> of <b class="num">${of}</b> players answered <span>${of ? Math.round((n / of) * 100) : 0}%</span>`;
    $('ansFaces').innerHTML = Object.keys(box).slice(-30).map(pid => `<span>${H.players[pid] ? H.players[pid].av : ''}</span>`).join('');
    if (popNew) { const f = $('ansFaces').lastElementChild; if (f) f.classList.add('pop'); sound.play('lock'); }
  }

  // leaderboard
  function renderBoardView(silent) {
    show('vBoard');
    $('bKick').textContent = 'Final standings';
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
    $('tieNote').innerHTML = tieNote(r);
    const pods = document.querySelectorAll('.pod');
    pods.forEach(el => el.classList.remove('up'));
    $('champBanner').classList.remove('on');
    $('champTake').classList.remove('on', 'out');
    CELEBRATE.spotlight(false);
    if (silent) { pods.forEach(el => el.classList.add('up')); $('champBanner').classList.add('on'); return; }
    const me = busy;
    const order = ['.p3', '.p2'];
    for (let k = 0; k < 2; k++) {
      await sleep(1000); if (me !== busy) return;
      sound.play('boing'); document.querySelector(order[k]).classList.add('up');
    }
    await sleep(900); if (me !== busy) return;
    // the champion takes the whole screen: searchlights and a drumroll, then the name, the anthem, cannons and the crowd
    const champ = r[0];
    if (champ) {
      $('ctAv').textContent = champ.av; $('ctNm').textContent = champ.nm; $('ctSc').textContent = '$0';
      $('champTake').classList.add('on');
      sound.play('drumroll', 2.4); MUSIC.sfx.riser(2.4);
      await sleep(2500); if (me !== busy) return;
      $('champTake').classList.add('reveal');
      MUSIC.sfx.hit(); MUSIC.sfx.victory(); setTimeout(() => MUSIC.sfx.applause(9), 300);
      countUp($('ctSc'), champ.cash, { dur: 2200, fmt });
      CELEBRATE.fireworks(9); CELEBRATE.flashes(7);
      [0, 700, 1500, 2500, 3600, 4800].forEach((t, i) => setTimeout(() => { if (me !== busy) return; confetti({ count: 130, x: i % 2 ? 0.94 : 0.06, y: 0.98, spread: 0.55, colors: ['#ffcf73', '#f96302', '#ffffff', '#c8102e'] }); }, t));
      setTimeout(() => { if (me === busy) CELEBRATE.money(26); }, 1200);
      await sleep(7200); if (me !== busy) return;
      $('champTake').classList.add('out');
      setTimeout(() => { if (me === busy) $('champTake').classList.remove('on', 'out', 'reveal'); }, 700);
    }
    document.querySelector('.p1').classList.add('up');
    // then the podium: spotlight, banner, a last fanfare, fireworks and money raining down
    CELEBRATE.spotlight(true);
    $('champBanner').classList.add('on');
    MUSIC.sfx.fanfare(); setTimeout(() => MUSIC.sfx.applause(5), 900);
    CELEBRATE.fireworks(7); CELEBRATE.money(32);
    confetti({ count: 140, spread: 1.6, colors: MONEY }); setTimeout(() => confetti({ count: 110, x: 0.12, colors: MONEY }), 500); setTimeout(() => confetti({ count: 110, x: 0.88, colors: MONEY }), 900);
  }

  const secs = ms => (ms < 100 ? (ms / 1000).toFixed(3) : (ms / 1000).toFixed(1)) + 's';
  // Says how any cash tie in the top 3 was settled, so nobody has to ask.
  function tieNote(r) {
    const notes = [];
    for (let i = 0; i < Math.min(3, r.length - 1); i++) {
      const a = r[i], b = r[i + 1];
      if (a.cash !== b.cash) continue;
      notes.push((a.tms || 0) !== (b.tms || 0)
        ? `${esc(a.nm)} and ${esc(b.nm)} tied on ${fmt(a.cash)}: ${esc(a.nm)} answered ${secs((b.tms || 0) - (a.tms || 0))} faster in total.`
        : `${esc(a.nm)} and ${esc(b.nm)} tied on cash and speed: ${esc(a.nm)} joined first.`);
    }
    return notes.slice(0, 2).join('<br>');
  }

  // community chest
  // One Community Chest ticket per question answered, right or wrong: taking part is what counts.
  const tickets = pid => M.quiz.filter(it => (H.answers[it.id] || {})[pid]).length;
  function drawChest(k) {
    if (H.chest[k] !== undefined) return;
    const won = new Set([...ranking().slice(0, 1).map(p => p.pid), ...H.chest]);
    const eligible = Object.keys(H.players).filter(pid => !won.has(pid));
    let pool = eligible.flatMap(pid => Array(tickets(pid)).fill(pid));
    if (!pool.length) pool = eligible; // nobody answered on a phone (e.g. a show-of-hands game): one ticket each
    H.chest[k] = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
    save();
  }
  async function renderChest(k, silent) {
    show('vChest');
    drawChest(k); broadcast(true);
    const pid = H.chest[k];
    $('chestPast').innerHTML = H.chest.slice(0, k).filter(Boolean).map(x => `<span class="chip">${H.players[x].av} ${esc(H.players[x].nm)}</span>`).join('');
    const nT = Object.keys(H.players).filter(x => !ranking().slice(0, 1).some(r => r.pid === x)).reduce((a, x) => a + tickets(x), 0);
    $('chestSub').textContent = `One ticket per question answered: ${nT.toLocaleString()} tickets in the chest. Everyone except 1st place is in, remote included.`;
    if (!pid) { $('slotIn').innerHTML = '<div>No one left to draw</div>'; $('slotIn').style.transform = 'none'; $('chestMsg').textContent = ''; return; }
    const w = H.players[pid];
    const others = Object.values(H.players);
    const reel = Array.from({ length: 34 }, () => others[Math.floor(Math.random() * others.length)]).concat([w]);
    $('slotIn').innerHTML = reel.map(p => `<div><span>${p.av}</span><span>${esc(p.nm)}</span></div>`).join('');
    const rowH = $('slotIn').firstElementChild.offsetHeight;
    const end = `translateY(${-(reel.length - 1) * rowH}px)`;
    const win = () => { $('chestMsg').innerHTML = `Advance to the prize table. <b>${w.av} ${esc(w.nm)}</b> collects a prize!${tickets(pid) ? ` (${tickets(pid)} ticket${tickets(pid) === 1 ? '' : 's'})` : ''}`; };
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
    win();
    $('vChest').classList.remove('opened'); void $('vChest').offsetWidth; $('vChest').classList.add('opened');
    MUSIC.sfx.coins(); setTimeout(() => MUSIC.sfx.fanfare(), 250); setTimeout(() => MUSIC.sfx.applause(4), 1100);
    CELEBRATE.fireworks(6); CELEBRATE.money(30); CELEBRATE.flashes(4);
    [200, 1100, 2100].forEach((t, i) => setTimeout(() => { if (me === busy) confetti({ count: 120, x: i % 2 ? 0.94 : 0.06, y: 0.98, spread: 0.55, colors: ['#ffcf73', '#2d6aa3', '#ffffff'] }); }, t));
    confetti({ count: 240, colors: ['#ffcf73', '#f2d27a', '#fff', '#2d6aa3'], spread: 1.5 });
  }

  function renderEnd(silent) {
    show('vEnd');
    const S2 = stats(), att = +H.attendees || 0;
    const avg = S2.asked.length ? S2.asked.reduce((a, q) => a + q.ans, 0) / S2.asked.length : 0;
    $('endStats').innerHTML = `<b class="num">${S2.n}</b> played${att ? ` (${pct(S2.n, att)} of the room)` : ''} · <b class="num">${pct(avg, S2.n)}</b> average answer rate · <b class="num">${S2.allIn}</b> answered every question`;
    $('endLots').innerHTML = picks().map((x, n) => `<div class="lot win-card" style="--i:${n}"><div class="lh" ${x.why.startsWith('Community') ? 'style="background:#2d6aa3"' : ''}>${x.why.startsWith('Community') ? 'Community Chest' : 'Monopoly Champion'}</div><div class="lb"><span class="wc-av">${H.players[x.pid].av}</span>${esc(H.players[x.pid].nm)}<br><span style="font-weight:600">${x.why}${x.why === '1st place' ? ' · ' + fmt(H.players[x.pid].cash) : ''}</span></div></div>`).join('');
    if (!silent) { MUSIC.sfx.fanfare(); setTimeout(() => MUSIC.sfx.applause(3), 900); CELEBRATE.fireworks(4); confetti({ count: 200, colors: MONEY }); }
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
    lobby: () => 'Lobby (QR code)', rules: () => 'How to win', roll: () => `Roll ${st.i + 1}: ${qOf(st).section}`, q: () => `Q${st.i + 1}: question open`, reveal: () => `Q${st.i + 1}: answer`,
    board: () => 'Final standings', podium: () => 'Podium', chest: () => (CHEST_DRAWS > 1 ? `Community Chest draw ${st.k + 1}` : 'Community Chest draw'), end: () => 'Game over (the 2 winners)',
  }[st.v])();
  function buildMenu() {
    $('menuList').innerHTML = steps.map((st, i) => st.v === 'reveal' ? '' : `<button data-go="${i}" class="${i === H.pos ? 'cur' : ''}">${esc(LABEL(st))}</button>`).join('');
    $('remotePin').textContent = H.pin;
    $('attIn').value = H.attendees || '';
    renderPlayerList();
    $('remoteQr').innerHTML = qrSVG(REMOTE_URL);
    $('remoteUrl').textContent = REMOTE_URL.replace(/^https?:\/\//, '');
  }
  const toggleMenu = on => { buildMenu(); $('menu').classList.toggle('hidden', !on); };
  $('menuList').addEventListener('click', e => {
    const b = e.target.closest('[data-go]'); if (!b) return;
    $('menu').classList.add('hidden');
    const i = +b.dataset.go, st = steps[i];
    // jumping to a closed question shows its answer instead of re-opening it
    if (st.v === 'q' && H.closed[qOf(st).id]) go(i + 1, { silent: true });
    else go(i);
  });
  $('attIn').addEventListener('input', () => { H.attendees = Math.max(0, Math.floor(+$('attIn').value || 0)); save(); });
  // players: rename or hide a name from the big screen
  function renderPlayerList() {
    const f = $('plFind').value.trim().toLowerCase();
    const list = Object.entries(H.players).filter(([, p]) => !f || p.nm.toLowerCase().includes(f)).sort((a, b) => b[1].j - a[1].j).slice(0, 40);
    $('plList').innerHTML = list.map(([pid, p]) => `<div class="pl-row"><span>${p.av} ${esc(p.nm)}${p.lock ? ' <small>(edited)</small>' : ''}</span>
      <button data-ren="${pid}">Rename</button><button data-hide="${pid}">Hide name</button></div>`).join('') || '<div class="muted small">No players match.</div>';
  }
  $('plFind').addEventListener('input', renderPlayerList);
  $('plList').addEventListener('click', e => {
    const r = e.target.closest('[data-ren]'), h = e.target.closest('[data-hide]');
    const pid = (r || h) && (r ? r.dataset.ren : h.dataset.hide);
    if (!pid || !H.players[pid]) return;
    const p = H.players[pid];
    const nm = r ? prompt('New name for this player (max 18 characters):', p.nm) : 'Mystery Player';
    if (!nm || !nm.trim()) return;
    p.nm = clean(nm.trim().slice(0, 18)); p.lock = true; save();
    renderPlayerList(); renderCount(); render(true); broadcast(true);
  });
  $('btnMenu').onclick = () => toggleMenu(true);
  $('menuClose').onclick = () => toggleMenu(false);
  // Participation numbers for the follow-up email: who joined, who answered, who stayed to the end.
  function stats() {
    const ids = Object.keys(H.players).filter(x => !x.startsWith('bot')), n = ids.length;
    const per = M.quiz.map(it => {
      const box = H.answers[it.id] || {}, ans = ids.filter(x => box[x]);
      return { it, ans: ans.length, right: ans.filter(x => box[x].a === it.a).length, asked: !!H.opened[it.id] };
    });
    const asked = per.filter(q => q.asked);
    const allIn = ids.filter(x => asked.length && asked.every(q => (H.answers[q.it.id] || {})[x])).length;
    return { n, per, asked, allIn };
  }
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0) + '%';
  $('btnCopy').onclick = () => {
    const S2 = stats(), att = +H.attendees || 0;
    const lines = ['Monopoly: All-Hands Edition results', ''];
    lines.push('Participation:');
    lines.push(`- Players joined: ${S2.n}${att ? ` of ${att} attendees (${pct(S2.n, att)})` : ''}`);
    S2.per.forEach((q, i) => { if (q.asked) lines.push(`- Q${i + 1} ${q.it.section}: ${q.ans} answered (${pct(q.ans, S2.n)} of players), ${pct(q.right, q.ans)} got it right`); });
    if (S2.asked.length > 1) {
      const a = S2.asked[0].ans, b = S2.asked[S2.asked.length - 1].ans;
      lines.push(`- Drop-off from the first to the last question: ${a} to ${b} answering (${a ? (b >= a ? '+' : '-') + Math.abs(Math.round(((b - a) / a) * 100)) + '%' : 'n/a'})`);
      lines.push(`- Answered every question: ${S2.allIn} players (${pct(S2.allIn, S2.n)})`);
    }
    lines.push('', 'Winners:');
    picks().forEach((x, n) => lines.push(`${n + 1}. ${H.players[x.pid].nm} (${x.why})`));
    lines.push('', 'Richest tycoons:');
    ranking().filter(p => !p.pid.startsWith('bot')).slice(0, 10).forEach((p, i) => lines.push(`${i + 1}. ${p.nm}: ${fmt(p.cash)}`));
    navigator.clipboard.writeText(lines.join('\n')).then(() => { $('btnCopy').textContent = 'Copied'; setTimeout(() => ($('btnCopy').textContent = 'Copy results summary'), 1500); });
  };
  $('btnReset').onclick = () => {
    if (!confirm('Reset all players and cash? Phones keep their name and rejoin by themselves. The remote PIN stays the same.')) return;
    const pin = H.pin;
    H = fresh(); H.pin = pin; save(); toggleMenu(false); go(0, { silent: true });
  };
  const muteLabel = () => {
    $('btnMute').textContent = sound.muted ? 'Sound off' : 'Sound on';
    $('btnMusic').textContent = MUSIC.on ? 'Music on' : 'Music off';
  };
  $('btnMute').onclick = () => { sound.toggle(); muteLabel(); };
  $('btnMusic').onclick = () => { MUSIC.toggle(); muteLabel(); };
  muteLabel();
  // Browsers keep sound off until someone clicks the page. Say so, so the room is not silent by accident.
  setInterval(() => $('soundPill').classList.toggle('hidden', !MUSIC.suspended || sound.muted), 700);

  // rehearsal bots (local only, nothing is sent)
  const BOT_NAMES = ['Rich Uncle Pete', 'Boardwalk Betty', 'Free Parking Fran', 'Jail Bird Jim', 'Hotel Hannah', 'Railroad Ray', 'Chance Chaz', 'Utility Ursula', 'Go Gary', 'Mortgage Mo', 'Thimble Tina', 'Dice Dan'];
  let botTimer = null;
  $('btnSim').onclick = () => {
    toggleMenu(false);
    BOT_NAMES.forEach((nm, i) => setTimeout(() => {
      const bot = { p: 'bot' + i, nm, av: M.tokens[i % M.tokens.length] };
      onUp({ k: 'join', ...bot });
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
    else if (kl === 'b') { MUSIC.toggle(); muteLabel(); }
    else if (kl === 'f') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}); }
    else if (kl === 't') addTime();
  });
  $('stage').addEventListener('dblclick', next);
  addEventListener('resize', () => { const st = steps[H.pos]; if (st.v === 'q' || st.v === 'reveal') fitQ(); if (st.v === 'roll') placeWalker(qOf(st).at); else if (st.v === 'lobby' || st.v === 'rules') placeWalker(0); });

  // ---------- boot ----------
  buildBoard();
  $('walker').innerHTML = FORKLIFT;
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
