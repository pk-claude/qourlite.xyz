/* WFO All Hands, presenter screen. The single source of truth: it keeps every phone's votes and
   answers (in this browser's storage, so a reload loses nothing) and broadcasts a small state to the phones. */
(function () {
  const $ = id => document.getElementById(id);
  const esc = FX.esc;
  const ACTS = Object.fromEntries(WFO.acts.map(a => [a.id, a]));
  const ROOM = Live.room;
  const KEY = 'wfo-host-' + ROOM;
  const JOIN = location.origin + '/wfo/' + (ROOM !== Live.defRoom ? '?room=' + ROOM : Live.test ? '?test=' + Live.test : '');
  const SHORT = location.host === 'qourlite.xyz' || location.host === 'www.qourlite.xyz' ? WFO.short : JOIN.replace(/^https?:\/\//, '');

  // ---------- state ----------
  const fresh = ep => ({ sid: Live.rid(6), ep: ep || 0, order: [], show: 'debate', phones: {}, hidden: {}, manual: {}, pasted: [], snap: null, themes: null, story: null, storyText: '', realOpts: [], voice: '' });
  let H = Object.assign(fresh(), Live.store.get(KEY, {}) || {});
  // activities removed from the program (e.g. the old VOA poll) drop out of saved state
  H.order = (H.order || []).filter(id => WFO.acts.some(a => a.id === id));
  if (!WFO.acts.some(a => a.id === H.show)) H.show = 'debate';
  const save = () => { if (!passive) Live.store.set(KEY, H); };
  const HID = Live.rid(6);
  let ST = 0, passive = false, film = false;

  // ---------- relay ----------
  let live = { publishState() {}, status: () => ({}), channels: [] };
  let lastSent = 0, sendT = 0;
  function connect() {
    ST = Date.now();
    live = Live.create({
      room: ROOM, role: 'host',
      onMsg: (k, m) => {
        if (passive) return;
        if (k === 'up') onUp(m);
        else if (k === 'state' && m.hid !== HID && !m._stale && m.st > ST) { passive = true; $('takenOver').classList.remove('hidden'); }
      },
      onStatus: st => { relays(st); if (Object.values(st).includes('up')) broadcast(true); },
    });
    relays(live.status());
    broadcast(true);
  }
  function relays(st) {
    const names = { web: 'This site', emqx: 'Relay A', eclipse: 'Relay B', ntfy: 'Relay C' };
    $('relays').innerHTML = live.channels.map(id => `<i class="${st[id] || 'connecting'}" title="${names[id] || id}: ${st[id] || 'connecting'}"></i>`).join('');
    const up = Object.values(st).filter(s => s === 'up').length;
    $('relayDetail').textContent = up ? `Live: ${up} of ${live.channels.length} connections up.` : 'Not connected yet. If this stays red, try another network (a phone hotspot) or take votes by hand.';
  }
  function stateForPhones() {
    const ack = {};
    for (const [p, r] of Object.entries(H.phones)) ack[p] = r.v;
    return { t: Date.now(), sid: H.sid, ep: H.ep, hid: HID, st: ST, open: H.order, real: H.realOpts, film: film || undefined, tally: tallies(), ack };
  }
  function broadcast(force) {
    if (passive || !ST) return;
    clearTimeout(sendT);
    const now = Date.now();
    if (!force && now - lastSent < 400) { sendT = setTimeout(() => broadcast(true), 400); return; }
    lastSent = now;
    live.publishState(stateForPhones(), `${H.order.join(',')}|${film}|${H.realOpts.length}|${Math.floor(now / 60000)}`);
  }
  setInterval(() => broadcast(true), 10000);

  // ---------- incoming ----------
  const clean = s => String(s || '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  const idx = (v, n) => (Number.isInteger(v) && v >= 0 && v < n ? v : null);
  function onUp(m) {
    if (typeof m.p !== 'string' || !/^[a-z0-9]{1,12}$/.test(m.p)) return;
    if (m.k === 'boost') return onBoost(m);
    if (m.k !== 'me') return;
    const old = H.phones[m.p];
    if (old && !(m.v > old.v)) return;
    const vt = m.votes || {};

    H.phones[m.p] = {
      v: +m.v || Date.now(), at: (old && old.at) || Date.now(),
      votes: Object.fromEntries(WFO.acts.filter(a => a.kind !== 'text').map(a => [a.id, a.kind === 'multi'
        ? a.qs.map((q, i) => idx((Array.isArray(vt[a.id]) ? vt[a.id] : [])[i], q.opts.length))
        : idx(vt[a.id], optsOf(a.id).length)])),
      vis: (Array.isArray(m.vis) ? m.vis : []).slice(0, 3).map(x => ({ t: clean(x && x.t).slice(0, 300), c: ACTS.vision.cats.includes(x && x.c) ? x.c : '' })).filter(x => x.t),
    };
    save(); broadcast(); renderSoon();
  }

  // ---------- counts ----------
  const optsOf = id => (id === 'real' ? H.realOpts : ACTS[id].opts);
  function manualOf(id) {
    const a = ACTS[id], want = a.kind === 'multi' ? a.qs.map(q => q.opts.length) : [optsOf(id).length];
    let m = H.manual[id];
    if (!Array.isArray(m) || m.length !== want.length || m.some((r, i) => !Array.isArray(r) || r.length !== want[i])) m = H.manual[id] = want.map(n => Array(n).fill(0));
    return m;
  }
  function tallies() {
    const T = {};
    WFO.acts.forEach(a => { if (a.kind === 'multi') T[a.id] = manualOf(a.id).map(r => r.slice()); else if (a.kind === 'single') T[a.id] = manualOf(a.id)[0].slice(); });
    for (const r of Object.values(H.phones)) {
      WFO.acts.forEach(a => {
        const v = r.votes[a.id];
        if (a.kind === 'multi') (Array.isArray(v) ? v : []).forEach((x, q) => { if (x != null && T[a.id][q] && x < T[a.id][q].length) T[a.id][q][x]++; });
        else if (a.kind === 'single' && v != null && v < T[a.id].length) T[a.id][v]++;
      });
    }
    return T;
  }
  const hkey = (src, t) => src + '|' + t;
  function answers() {
    const out = [];
    Object.entries(H.phones).sort((a, b) => a[1].at - b[1].at).forEach(([p, r]) => r.vis.forEach(x => out.push({ t: x.t, c: x.c, p, key: hkey(p, x.t) })));
    H.pasted.forEach((x, i) => out.push({ t: x.t, c: '', p: '', key: hkey('h' + i, x.t) }));
    return out.map(a => ({ ...a, off: !!H.hidden[a.key] }));
  }

  // ---------- rendering ----------
  let view = 'run', rT = 0;
  const renderSoon = () => { clearTimeout(rT); rT = setTimeout(render, 120); };
  function render() {
    $('nPhones').textContent = `${Object.keys(H.phones).length} phone${Object.keys(H.phones).length === 1 ? '' : 's'}`;
    if (view === 'run') renderRun();
    if (view === 'vis') renderVis();
    if (view === 'story') renderStoryCounts();
  }
  $('tabs').onclick = e => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    view = b.dataset.v;
    $('tabs').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    ['run', 'vis', 'story'].forEach(v => $('v' + v[0].toUpperCase() + v.slice(1)).classList.toggle('on', v === view));
    if (view === 'story') renderStory();
    render();
  };

  // ---------- Run: Race to Peak, as a TV race broadcast ----------
  let trackKey = '', prevLead = {}, prevTot = {}, ticker = [], beats = [], leadChanges = 0, boosts = 0, primed = false, lastQuip = Date.now(), lastBoostSay = 0;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);
  const LINES = {
    first: ['Lights out and away we go! {a} gets the jump off the line.', 'And they are off. {a} leaves the dock door first.', '{a} takes the first vote. Bold strategy, early in the shift.'],
    over: ['{a} dives down the inside of {b} at the dock door!', '{a} passes {b}. {b} is blaming the WMS.', 'Huge move by {a}. {b} has asked for a recount.', '{a} slipstreams past {b} down the main aisle.', '{b} took the long way round the cross-dock. {a} says thank you.'],
    tie: ['{a} and {b}, side by side. Nobody blinks.', 'Photo finish territory: {a} and {b}.', '{a} and {b} are tied. Somebody call Finance for a tiebreaker.'],
    mile: ['{n} votes in. That beats our forecast.', '{n} votes. Labor standard exceeded.', '{n} votes and not one merged cell.'],
    idle: ['{last} is in the pits for a cold brew refill.', 'Yellow flag: someone opened a spreadsheet with merged cells.', 'Race control is reviewing {last} for driving without a spotter.', 'Team radio, {last}: "Box, box." "Which box? We have four million."', '{leader} is holding position. Tribal knowledge says do not overthink it.', 'Weather update: 100 percent chance of peak volume.', '{last} reports a slow puncture on aisle 14.', 'Still time to vote. The phone in your pocket is a performance part.', '{last} asks for a labor plan refresh. It went stale 30 minutes ago.', 'Fun fact: {leader} has never once been late to a 6 AM start.'],
    boost: ['{a} gets a boost from the crowd!', 'Boost button pressed. {a} feels the love.', 'The grandstand is fired up for {a}.'],
  };
  const LAPS = { debate: [1, 'Formation lap'], vision: [1, 'Formation lap'], voa: [3, 'Pit wall'], hh: [5, 'Race calendar'], real: [6, 'Final lap'] };
  function tracksOf(a, T) {
    if (a.kind === 'multi') return a.qs.map((q, qi) => ({ key: a.id + '.' + qi, q: q.q, opts: q.opts, t: T[a.id][qi], mq: qi, n: qi + 1 }));
    if (a.kind === 'single') return [{ key: a.id, q: a.title, opts: optsOf(a.id), t: T[a.id], mq: 0, n: 1 }];
    return [];
  }
  let sayAct = '';
  function say(msg, racer, big) {
    ticker.unshift({ msg, racer, act: sayAct, at: Date.now() }); ticker = ticker.slice(0, 30);
    if (big && view === 'run' && sayAct === H.show) banner(big, msg, racer);
  }
  // Commentary: compare every race with what it showed last time.
  function commentate() {
    const T = tallies();
    const quiet = !primed; primed = true; // the first pass only records where everyone stands
    WFO.acts.forEach(a => tracksOf(a, T).forEach(tr => {
      sayAct = a.id;
      const tot = tr.t.reduce((s, n) => s + n, 0), was = prevTot[tr.key] || 0;
      if (tot > was && !quiet) { for (let k = was; k < tot; k++) beats.push(Date.now()); if (a.id === H.show) FX.sound.play('tick'); }
      const max = Math.max(...tr.t), leaders = tr.t.map((v, i) => (v === max && max > 0 ? i : -1)).filter(i => i >= 0);
      const lead = leaders.length === 1 ? leaders[0] : null, old = prevLead[tr.key];
      const live = H.order.includes(a.id) && !quiet;
      if (live && was === 0 && tot > 0) { const f = tr.t.findIndex(v => v > 0); say(fill(pick(LINES.first), { a: tr.opts[f] }), f, 'LIGHTS OUT'); }
      else if (live && lead != null && old != null && old !== 'tie' && lead !== old) { say(fill(pick(LINES.over), { a: tr.opts[lead], b: tr.opts[old] }), lead, 'OVERTAKE'); leadChanges++; }
      else if (live && lead == null && leaders.length > 1 && old !== 'tie' && tot > 1) say(fill(pick(LINES.tie), { a: tr.opts[leaders[0]], b: tr.opts[leaders[1]] }), leaders[0], 'SIDE BY SIDE');
      if (live && tot > was && [10, 20, 30, 40, 50, 75, 100].some(m => was < m && tot >= m)) say(fill(pick(LINES.mile), { n: tot }), lead == null ? 0 : lead);
      if (tot > was) lastQuip = Date.now();
      prevLead[tr.key] = lead != null ? lead : leaders.length ? 'tie' : null;
      prevTot[tr.key] = tot;
    }));
    beats = beats.filter(t => Date.now() - t < 600000);
  }
  // When the shown race goes quiet, the commentator fills the air.
  setInterval(() => {
    const a = ACTS[H.show];
    if (view !== 'run' || !H.order.includes(a.id) || Date.now() - lastQuip < 22000) return;
    const tr = tracksOf(a, tallies())[Math.floor(Math.random() * Math.max(1, tracksOf(a, tallies()).length))];
    if (!tr) return;
    const order = tr.t.map((v, i) => [v, i]).sort((x, y) => y[0] - x[0]);
    sayAct = a.id; lastQuip = Date.now();
    say(fill(pick(LINES.idle), { last: tr.opts[order[order.length - 1][1]], leader: tr.opts[order[0][1]] }), order[order.length - 1][1]);
    renderTicker(a);
  }, 4000);

  let bannerT = 0;
  function banner(kind, msg, racer) {
    const b = $('banner');
    b.innerHTML = `<div class="bn-in" style="--c:${Racers.color(racer || 0)}"><b>${esc(kind)}</b><span>${esc(msg)}</span></div>`;
    b.classList.remove('go'); void b.offsetWidth; b.classList.add('go');
    FX.sound.play(kind === 'OVERTAKE' ? 'whoosh' : 'ding');
    clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove('go'), 3400);
  }

  // A phone pressed Boost for the racer it backs.
  const lastBoost = {};
  function onBoost(m) {
    const a = ACTS[m.a]; if (!a || a.kind === 'text' || !H.order.includes(a.id)) return;
    if (Date.now() - (lastBoost[m.p] || 0) < 2500) return;
    lastBoost[m.p] = Date.now(); boosts++;
    const key = a.kind === 'multi' ? a.id + '.' + (+m.q || 0) : a.id;
    const tr = tracksOf(a, tallies()).find(t => t.key === key); if (!tr || tr.opts[+m.i] == null) return;
    const car = $('stage').querySelector(`.race[data-k="${key}"] .lane[data-i="${+m.i}"] .car`);
    if (car) { car.classList.remove('boost'); void car.offsetWidth; car.classList.add('boost'); }
    if (Date.now() - lastBoostSay > 9000) { lastBoostSay = Date.now(); sayAct = a.id; say(fill(pick(LINES.boost), { a: tr.opts[+m.i] }), +m.i); renderTicker(a); }
  }

  function renderRun() {
    commentate();
    $('acts').innerHTML = WFO.acts.map(a => {
      const open = H.order.includes(a.id);
      const can = a.id !== 'real' || H.realOpts.length;
      return `<div class="act ${H.show === a.id ? 'show' : ''}" data-show="${a.id}"><b>${esc(a.label)}</b>
        <div class="st ${open ? 'open' : ''}"><span>${open ? 'Open on phones' : can ? 'Closed' : 'After the story'}</span>${can ? `<button class="tg" data-tg="${a.id}">${open ? 'Close' : 'Open'}</button>` : ''}</div></div>`;
    }).join('') + storyCard() + `<p class="note">Click a card to show it. Open puts it on every phone. P hides these controls for the room.</p>`;
    const a = ACTS[H.show], T = tallies(), open = H.order.includes(a.id);
    const nPh = Object.keys(H.phones).length;
    const trs = tracksOf(a, T);
    const lap = LAPS[a.id] || [1, ''];
    $('lap').innerHTML = `<b>LAP ${lap[0]}</b>/7 <span>${esc(lap[1])}</span>`;
    const key = H.show + '|' + trs.map(t => t.opts.join(',')).join('/');
    if (key !== trackKey) {
      trackKey = key;
      const head = `<div class="bc-head"><span class="bc-live ${open ? 'on' : ''}" id="stState"></span><span class="bc-kick">${esc(a.label)}</span><h1>${esc(a.kind === 'multi' ? a.title : a.kind === 'text' ? 'Fuel for the final lap' : 'The ' + a.label.toLowerCase())}</h1></div>`;
      if (a.kind === 'text') $('stage').innerHTML = head + `<div class="fuel"><div class="tank"><div class="liq" id="fuelLiq"><i></i><i></i><i></i></div><div class="ticks">${[100, 75, 50, 25].map(p => `<span style="bottom:${p}%">${p === 100 ? 'F' : ''}</span>`).join('')}<span style="bottom:0">E</span></div></div>
        <div class="fuel-r"><div class="num" id="visNum">0</div><div class="lbl" id="visLbl">answers in the tank</div><p class="q">${esc(a.title)} <b>${esc(a.q)}</b></p>
        <div class="catrow" id="visCats"></div><p class="hint">Every anonymous answer is fuel. At the end, Claude turns the whole tank into our 2027 story.</p></div></div>`;
      else if (a.id === 'real' && !H.realOpts.length) $('stage').innerHTML = head + `<p class="hint">The racers come from the themes. Run the Story tab first, then press "Send themes to the room".</p>`;
      else $('stage').innerHTML = head + `<div class="races ${trs.length > 1 ? 'multi' : 'single'}" style="grid-template-rows:repeat(${trs.length}, minmax(0, 1fr))">${trs.map(tr => `<div class="race" data-k="${tr.key}">
          <div class="tower"><div class="tw-h"><span>RACE ${tr.n}</span>${esc(tr.q)}</div><div class="tw-rows">${tr.opts.map((o, i) => `<div class="tw" data-i="${i}" style="--c:${Racers.color(i)}"><b class="p"></b><i></i><span class="o">${esc(o)}<small>#${Racers.num(i)} ${esc(Racers.name(i))} | ${esc(Racers.team(i))}</small></span><span class="g"></span>
            <span class="man"><button data-m="${a.id}" data-q="${tr.mq}" data-i="${i}" data-d="-1">-</button><button data-m="${a.id}" data-q="${tr.mq}" data-i="${i}" data-d="1">+</button></span></div>`).join('')}</div></div>
          <div class="track"><div class="tilt">${tr.opts.map((o, i) => `<div class="lane" data-i="${i}"><div class="kerb"></div><div class="car" style="left:0%"><div class="trail"></div><div class="flame"></div>${Racers.svg(i)}</div></div>`).join('')}<div class="fin"></div><div class="startl"></div></div></div>
        </div>`).join('')}</div>`;
    }
    const st = $('stState'); if (st) { st.textContent = open ? 'LIVE' : 'CLOSED'; st.className = 'bc-live ' + (open ? 'on' : ''); }
    if (a.kind === 'text') {
      const all = answers(), people = new Set(all.filter(x => x.p).map(x => x.p)).size;
      const goal = Math.max(10, Math.round(nPh * 1.5));
      $('visNum').textContent = all.length;
      $('visLbl').textContent = `answers in the tank${people ? `, from ${people} ${people === 1 ? 'person' : 'people'}` : ''}`;
      $('fuelLiq').style.height = Math.min(100, 100 * all.length / goal) + '%';
      $('visCats').innerHTML = a.cats.map(c => `<span>${esc(c)}<b>${all.filter(x => x.c === c).length}</b></span>`).join('');
    }
    trs.forEach(tr => {
      const el = $('stage').querySelector(`.race[data-k="${tr.key}"]`); if (!el) return;
      const max = Math.max(...tr.t);
      const finish = Math.max(max, Math.ceil(nPh * 0.6), 4);
      const order = tr.t.map((v, i) => [v, i]).sort((x, y) => y[0] - x[0] || x[1] - y[1]);
      const rowH = 100 / tr.opts.length;
      el.querySelectorAll('.tw').forEach(row => {
        const i = +row.dataset.i, v = tr.t[i] || 0, rank = order.findIndex(o => o[1] === i);
        row.style.top = (rank * rowH) + '%'; row.style.height = rowH + '%';
        row.classList.toggle('lead', v > 0 && v === max);
        row.querySelector('.p').textContent = v > 0 ? rank + 1 : '-';
        row.querySelector('.g').innerHTML = v === 0 ? '<em>PIT</em>' : v === max ? `<b>${v}</b> ${v === 1 ? 'vote' : 'votes'}` : `<b>${v}</b> +${max - v}`;
      });
      el.querySelectorAll('.lane').forEach(lane => {
        const i = +lane.dataset.i, v = tr.t[i] || 0;
        const car = lane.querySelector('.car'), left = 84 * v / finish;
        if (car.dataset.left && +car.dataset.left < left) { car.classList.remove('surge'); void car.offsetWidth; car.classList.add('surge'); }
        car.dataset.left = left; car.style.left = left.toFixed(1) + '%';
        lane.classList.toggle('lead', v > 0 && v === max);
        lane.classList.toggle('moving', v > 0);
      });
    });
    renderTicker(a);
    renderPit(a, T, nPh);
    $('stage').classList.toggle('manual', $('manualOn').checked);
  }
  function renderTicker(a) {
    const mine = ticker.filter(m => m.act === a.id).slice(0, 6);
    const items = mine.length ? mine : [{ msg: 'Engines warming up. Scan the code, pick a racer, then smash the Boost button.', racer: 0 }];
    const html = items.map((m, k) => `<span class="ti ${k === 0 ? 'new' : ''}" style="--c:${Racers.color(m.racer || 0)}"><i></i>${esc(m.msg)}</span>`).join('');
    const tk = $('ticker'); if (tk.dataset.h === html) return;
    tk.dataset.h = html;
    tk.innerHTML = `<div class="tk-lab">RACE CONTROL</div><div class="tk-run"><div class="tk-in">${html}${html}</div></div>`;
  }
  // Pit wall: the numbers beside the QR code.
  function renderPit(a, T, nPh) {
    let voted = 0;
    if (a.kind === 'multi') voted = Object.values(H.phones).filter(r => (r.votes[a.id] || []).some(v => v != null)).length;
    else if (a.kind === 'single') voted = Object.values(H.phones).filter(r => r.votes[a.id] != null).length;
    else voted = Object.values(H.phones).filter(r => r.vis.length).length;
    const pct = nPh ? Math.round(100 * voted / nPh) : 0;
    const now = Date.now(), B = 10, W = 30000;
    const buckets = Array.from({ length: B }, (_, k) => beats.filter(t => t > now - (B - k) * W && t <= now - (B - k - 1) * W).length);
    const bmax = Math.max(1, ...buckets);
    const lastMin = beats.filter(t => now - t < 60000).length;
    let close = '';
    if (a.kind === 'multi') {
      const gaps = T[a.id].map((t, qi) => { const s = t.slice().sort((x, y) => y - x); return [s[0] - s[1], qi, s[0]]; }).filter(g => g[2] > 0).sort((x, y) => x[0] - y[0]);
      if (gaps.length) close = `Race ${gaps[0][1] + 1}: ${gaps[0][0] === 0 ? 'dead heat' : `+${gaps[0][0]}`}`;
    }
    $('pit').innerHTML = `<div class="pitrow"><div class="ring" style="--p:${pct}"><b>${pct}%</b></div><div><b>${voted} of ${nPh}</b><span>phones on the grid</span></div></div>
      <div class="pitrow col"><span>Votes per 30 seconds</span><div class="spark">${buckets.map(n => `<i style="height:${Math.max(4, 100 * n / bmax)}%"></i>`).join('')}</div><span><b>${lastMin}</b> in the last minute</span></div>
      <div class="pitgrid"><div><b>${leadChanges}</b><span>overtakes</span></div><div><b>${boosts}</b><span>boosts fired</span></div><div class="w2"><b>${close || 'no contest yet'}</b><span>closest race</span></div></div>`;
  }
  setInterval(() => { if (view === 'run') renderPit(ACTS[H.show], tallies(), Object.keys(H.phones).length); }, 5000);
  // Present mode: P hides the controls so the room sees only the broadcast.
  function present(on) { document.body.classList.toggle('present', on); }
  addEventListener('keydown', e => {
    if (e.target.closest('input, textarea, select') || document.getElementById('film').innerHTML) return;
    const k = e.key.toLowerCase();
    if (k === 'p') present(!document.body.classList.contains('present'));
    if (k === 's') { $('sndBtn').textContent = FX.sound.toggle() ? 'Sound off' : 'Sound on'; }
  });
  $('presBtn').onclick = () => present(!document.body.classList.contains('present'));
  $('sndBtn').onclick = () => { $('sndBtn').textContent = FX.sound.toggle() ? 'Sound off' : 'Sound on'; };
  $('sndBtn').textContent = FX.sound.muted ? 'Sound off' : 'Sound on';
  $('acts').onclick = e => {
    if (e.target.closest('[data-play]')) return playStory();
    const tg = e.target.closest('[data-tg]');
    const wasOpen = H.order.includes('vision'), wasShow = H.show;
    if (tg) {
      const id = tg.dataset.tg;
      H.order = H.order.includes(id) ? H.order.filter(x => x !== id) : [id, ...H.order];
      H.show = id;
    } else { const c = e.target.closest('[data-show]'); if (!c) return; H.show = c.dataset.show; }
    save(); broadcast(true); render();
    if (wasOpen && !H.order.includes('vision')) autoStory('question closed');
    else if (wasShow === 'vision' && H.show !== 'vision') autoStory('moved on');
  };
  $('stage').onclick = e => {
    const b = e.target.closest('[data-m]'); if (!b) return;
    const m = manualOf(b.dataset.m), q = +b.dataset.q, i = +b.dataset.i;
    m[q][i] = Math.max(0, m[q][i] + +b.dataset.d);
    save(); broadcast(); render();
  };
  $('manualOn').onchange = () => $('stage').classList.toggle('manual', $('manualOn').checked);
  $('resetBtn').onclick = () => {
    if (!confirm('Clear every vote, every 2027 answer, the themes and the story? Phones are cleared too. Use this after a rehearsal.')) return;
    H = fresh(Date.now()); trackKey = ''; ticker = []; beats = []; leadChanges = 0; boosts = 0; save(); broadcast(true); render(); renderStory();
  };

  // ---------- visions ----------
  function renderVis() {
    const all = answers();
    $('visCount').textContent = `(${all.filter(a => !a.off).length} shown, ${all.filter(a => a.off).length} hidden)`;
    $('visList').innerHTML = all.map(a => `<li class="${a.off ? 'off' : ''}">${esc(a.t)}<div class="r"><span>${esc(a.c || (a.p ? '' : 'added by hand'))}</span><button data-h="${esc(a.key)}">${a.off ? 'Show' : 'Hide'}</button></div></li>`).join('') || '<p class="muted">No answers yet.</p>';
  }
  $('visList').onclick = e => { const b = e.target.closest('[data-h]'); if (!b) return; const k = b.dataset.h; if (H.hidden[k]) delete H.hidden[k]; else H.hidden[k] = 1; save(); render(); };
  $('pasteBtn').onclick = () => {
    const lines = $('pasteBox').value.split(/\n+/).map(clean).filter(t => t.length > 2).map(t => ({ t: t.slice(0, 300) }));
    H.pasted.push(...lines); $('pasteBox').value = ''; save(); render();
  };
  $('copyBtn').onclick = () => {
    const txt = answers().filter(a => !a.off).map(a => `${a.t}${a.c ? ` [${a.c}]` : ''}`).join('\n');
    navigator.clipboard.writeText(txt).then(() => ($('copyMsg').textContent = 'Copied.'), () => ($('copyMsg').textContent = 'Copy failed: select the list and copy it.'));
  };

  // ---------- story ----------
  let aiOn = null;
  fetch('/api/story', { cache: 'no-store' }).then(r => r.json()).then(j => (aiOn = !!j.ai), () => (aiOn = false)).finally(renderStatus);
  function renderStatus() {
    $('aiStatus').innerHTML = `<span class="${aiOn ? 'ok' : 'no'}">${aiOn == null ? 'Checking Claude...' : aiOn ? 'Claude: connected' : 'Claude: not connected (paste a story instead)'}</span>` +
      `<span class="${Voice.tts ? 'ok' : 'no'}">${Voice.tts ? 'AI voice: on' : 'AI voice: off (computer voice)'}</span>`;
  }
  const visible = () => answers().filter(a => !a.off);
  function renderStoryCounts() {
    const v = visible();
    const newer = H.snap ? v.length - H.snap.length : 0;
    $('ansReady').textContent = `${v.length} answers ready.` + (H.snap && newer > 0 ? ` ${newer} arrived after the themes were found: press Find themes again to include them.` : '');
  }
  function renderThemes() {
    $('themesOut').innerHTML = (H.themes || []).map(t => `<div class="theme"><b>${esc(t.name)}</b><span class="c">${t.n ? `${t.n} answer${t.n === 1 ? '' : 's'}` : ''}${t.n && t.g ? ' + ' : ''}${t.g ? `${t.g} team goal${t.g === 1 ? '' : 's'}` : ''}</span><p>${esc(t.summary)}</p>${t.quote ? `<q>${esc(t.quote)}</q>` : ''}</div>`).join('');
  }
  function renderStory() { renderStatus(); renderStoryCounts(); renderThemes(); $('storyText').value = H.storyText || ''; fillVoices(); }

  async function post(body) {
    const r = await fetch('/api/story', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'error ' + r.status);
    return j;
  }
  function busy(btn, msgEl, txt) { btn.disabled = true; msgEl.className = 'msg'; let s = 0; msgEl.textContent = txt; const iv = setInterval(() => (msgEl.textContent = `${txt} ${++s}s`), 1000); return () => { clearInterval(iv); btn.disabled = false; }; }
  // Themes and story: one pipeline, run by the buttons or on its own in the background.
  const snapOf = v => v.map(a => ({ t: a.t, c: a.c, p: a.p }));
  // Prepared team goals join in when few answers arrive, or always if the box is ticked.
  const goalsFor = v => ($('goalsAlways').checked || v.length < WFO.goalsBelow ? WFO.goals : []);
  $('goalsAlways').checked = !!H.goalsAlways;
  $('goalsAlways').onchange = () => { H.goalsAlways = $('goalsAlways').checked; save(); autoStory('team goals setting'); };
  async function runThemes(v) {
    const snap = snapOf(v), goals = goalsFor(v);
    const j = await post({ step: 'themes', answers: snap, goals });
    H.snap = snap; H.goals = goals; H.themes = j.themes; save();
    renderThemes(); renderStoryCounts();
    return j;
  }
  async function runStory() {
    const snap = H.snap || snapOf(visible());
    const j = await post({ step: 'story', answers: snap, goals: H.goals || [], themes: H.themes || [] });
    H.story = j; H.edited = false; H.backup = false;
    H.storyText = `# ${j.title}\n\n` + j.chapters.map(c => `## ${c.heading}\n${c.text}`).join('\n\n') + (j.closing ? `\n\n${j.closing}` : '');
    save();
    $('storyText').value = H.storyText;
    prepareVoice();
    return j;
  }
  $('themesBtn').onclick = async () => {
    const v = visible();
    const done = busy($('themesBtn'), $('themesMsg'), `Claude is reading ${v.length} answers${goalsFor(v).length ? ' and the team goals' : ''}...`);
    try {
      const j = await runThemes(v);
      $('themesMsg').className = 'msg ok'; $('themesMsg').textContent = `${j.themes.length} themes${j.skipped && j.skipped.length ? `. ${j.skipped.length} left out (off topic or identifying).` : '.'}`;
    } catch (e) { $('themesMsg').className = 'msg err'; $('themesMsg').textContent = `Claude did not answer (${e.message}). Try again.`; }
    done();
  };
  $('storyBtn').onclick = async () => {
    const done = busy($('storyBtn'), $('storyMsg'), 'Claude is writing...');
    try {
      await runStory();
      $('storyMsg').className = 'msg ok'; $('storyMsg').textContent = `Done: about ${H.storyText.split(/\s+/).length} words. Read it, edit if needed.`;
    } catch (e) { $('storyMsg').className = 'msg err'; $('storyMsg').textContent = `Claude did not answer (${e.message}). Try again, or paste a story into the box.`; }
    done();
  };

  // ---------- automatic: themes and story write themselves ----------
  // Runs when the 2027 question is closed or the presenter moves on from it, and refreshes every
  // few minutes while new answers keep arriving. A story you edited by hand is never overwritten.
  let autoBusy = false, autoAgain = false, autoLast = 0;
  const sameAnswers = v => H.snap && H.storyText && !H.backup && H.snap.length === v.length && H.snap.every((a, i) => a.t === v[i].t);
  function autoPill(txt, cls) { const el = $('autoPill'); el.textContent = txt; el.className = 'autopill ' + (cls || ''); el.classList.toggle('hidden', !txt); if (view === 'run') renderSoon(); }
  async function autoStory(why) {
    if (passive || aiOn === false) return;
    const v = visible();
    if (!v.length) { if (pendingPlay) { pendingPlay = false; openStage(); } return; } // nothing from the team yet: the prepared story covers this
    if (sameAnswers(v) && (H.goals || []).length === goalsFor(v).length) { if (pendingPlay) { pendingPlay = false; openStage(); } return; }
    if (H.edited) { autoPill('Story edited by hand: auto-update paused', 'warn'); if (pendingPlay) { pendingPlay = false; openStage(); } return; }
    if (autoBusy) { autoAgain = true; return; }
    autoBusy = true; autoLast = Date.now();
    try {
      autoPill(`Claude is reading ${v.length} answers...`, 'busy');
      $('themesMsg').className = 'msg'; $('themesMsg').textContent = `Running on its own (${why})...`;
      const j = await runThemes(v);
      $('themesMsg').className = 'msg ok'; $('themesMsg').textContent = `${j.themes.length} themes, found automatically.`;
      autoPill('Claude is writing the story...', 'busy');
      await runStory();
      $('storyMsg').className = 'msg ok'; $('storyMsg').textContent = `Written automatically from ${v.length} answers at ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`;
      autoPill(`Story ready: ${v.length} answer${v.length === 1 ? '' : 's'}`, 'ok');
    } catch (e) {
      autoPill('Story: Claude did not answer, retrying soon', 'warn');
      autoLast = Date.now() - 120000; // try again in about a minute
    }
    autoBusy = false;
    if (autoAgain && !pendingPlay) { autoAgain = false; autoStory('new answers'); }
    if (pendingPlay) { pendingPlay = false; autoAgain = false; render(); openStage(); }
  }
  // Background refresh while answers keep coming in.
  setInterval(() => { if (H.order.includes('vision') || H.show !== 'vision') if (Date.now() - autoLast > 180000) autoStory('refresh'); }, 20000);
  if (H.storyText) autoPill(`Story ready: ${(H.snap || []).length} answer${(H.snap || []).length === 1 ? '' : 's'}`, 'ok');
  let editT = 0;
  $('storyText').oninput = () => { H.storyText = $('storyText').value; H.edited = true; save(); clearTimeout(editT); editT = setTimeout(prepareVoice, 2000); };

  // The box format: "# Title", "## Chapter heading" then its narration; text after a blank line with no heading is the closing.
  function parse(txt) {
    const out = { title: '', chapters: [], closing: '' };
    let cur = null, gap = false;
    txt.split('\n').forEach(raw => {
      const l = raw.trim();
      if (!l) { gap = true; return; }
      if (/^#\s/.test(l)) { out.title = l.slice(2).trim(); return; }
      if (/^##\s/.test(l)) { cur = { heading: l.slice(3).trim(), text: '' }; out.chapters.push(cur); gap = false; return; }
      if (!cur || (gap && cur.text)) { cur = { heading: '', text: '' }; out.chapters.push(cur); }
      cur.text += (cur.text ? ' ' : '') + l; gap = false;
    });
    const last = out.chapters[out.chapters.length - 1];
    if (out.chapters.length > 1 && last && !last.heading) { out.closing = last.text; out.chapters.pop(); }
    out.chapters = out.chapters.filter(c => c.text);
    return out;
  }
  const voiceParts = P => [P.title ? P.title + '.' : '', ...P.chapters.map(c => c.text), P.closing].filter(Boolean);

  // ---------- voice ----------
  function fillVoices() {
    const sel = $('voiceSel'), opts = Voice.options();
    if (!opts.some(o => o.value === H.voice)) H.voice = Voice.best();
    Voice.choice = H.voice;
    sel.innerHTML = opts.map(o => `<option value="${esc(o.value)}" ${o.value === H.voice ? 'selected' : ''}>${esc(o.label)}</option>`).join('');
    $('voiceHint').textContent = Voice.hint();
  }
  Voice.onlist = () => { if (view === 'story') fillVoices(); };
  $('voiceSel').onchange = () => { H.voice = Voice.choice = $('voiceSel').value; save(); $('voiceHint').textContent = Voice.hint(); prepareVoice(); };
  let prepRun = 0, voiceReady = '';
  async function prepareVoice() {
    const P = parse(H.storyText || '');
    const parts = voiceParts(P);
    if (!parts.length) return;
    const my = ++prepRun;
    if (Voice.kind !== 'tts') { voiceReady = 'ready'; $('voiceMsg').className = 'msg ok'; $('voiceMsg').textContent = ''; return; }
    voiceReady = 'preparing';
    $('voiceMsg').className = 'msg'; $('voiceMsg').textContent = 'Preparing the voice...';
    const r = await Voice.prepare(parts, (n, of) => { if (my === prepRun) { $('voiceMsg').textContent = `Preparing the voice: ${n} of ${of}`; Film.note(`Preparing the voice: ${n} of ${of}`); } });
    if (my !== prepRun) return;
    voiceReady = r.ok === r.of ? 'ready' : 'partial';
    $('voiceMsg').className = 'msg ' + (r.ok === r.of ? 'ok' : 'err');
    $('voiceMsg').textContent = r.ok === r.of ? 'Voice ready.' : `Voice ready for ${r.ok} of ${r.of} parts. The rest will show captions only. Press Test voice, or pick a computer voice.`;
    Film.note(voiceNote());
  }
  const voiceNote = () => {
    const o = Voice.options().find(x => x.value === Voice.choice);
    const name = o ? o.label : 'Captions only';
    return Voice.kind === 'tts' ? `${name} | ${voiceReady === 'ready' ? 'voice ready' : voiceReady === 'preparing' ? 'preparing voice...' : 'some parts captions only'}` : name;
  };
  $('testVoice').onclick = async () => {
    $('voiceMsg').className = 'msg'; $('voiceMsg').textContent = 'Playing...';
    Voice.lastError = '';
    const c = Voice.say('Looking back from 2028, this is the story of Workforce Operations, and the year we wrote together.', () => {});
    await c.done;
    $('voiceMsg').className = 'msg ' + (Voice.lastError ? 'err' : 'ok');
    $('voiceMsg').textContent = Voice.lastError || 'Did that sound right? If not, pick another voice.';
  };

  // ---------- stage ----------
  function sendThemes() {
    const names = (H.themes || []).map(t => t.name).filter(Boolean).slice(0, 5);
    if (!names.length) return false;
    if (names.join('|') !== H.realOpts.join('|')) { H.realOpts = names; H.manual.real = null; for (const r of Object.values(H.phones)) r.votes.real = null; }
    H.order = ['real', ...H.order.filter(x => x !== 'real' && x !== 'vision')];
    H.show = 'real';
    save(); broadcast(true); render();
    return true;
  }
  $('sendThemes').onclick = () => {
    const ok = sendThemes();
    $('sendMsg').className = 'msg ' + (ok ? 'ok' : 'err');
    $('sendMsg').textContent = ok ? 'Sent. The vote is open on every phone. The 2027 question is now closed.' : 'Find themes first.';
  };
  $('stageBtn').onclick = () => openStage();
  function openStage() {
    let P = parse(H.storyText || '');
    if (!P.chapters.length) {
      // Nothing written (no answers, or Claude could not be reached): play the prepared story.
      H.storyText = WFO.backup.storyText; H.themes = WFO.backup.themes; H.story = null; H.snap = H.snap || []; H.goals = WFO.goals; H.backup = true; save();
      $('storyText').value = H.storyText; renderThemes();
      P = parse(H.storyText); prepareVoice();
      $('voiceMsg').className = 'msg'; $('voiceMsg').textContent = 'No story yet, so the prepared story is playing.';
    }
    const themes = (H.themes || []).map(t => ({ name: t.name, n: t.n }));
    const snap = H.snap || visible();
    const inThemes = new Set((H.themes || []).flatMap(t => t.ids || []));
    const pool = snap.filter((a, i) => !inThemes.size || inThemes.has(i + 1));
    const goals = H.goals || [];
    const short = t => (t.length > 95 ? t.slice(0, 92).replace(/\s+\S*$/, '') + '...' : t);
    const frags = [...pool.map(a => short(a.t)), ...(pool.length < 10 ? goals.slice(0, 10 - pool.length).map(short) : [])].sort(() => Math.random() - 0.5);
    const chapThemes = (H.story && H.story.chapters) || [];
    P.chapters.forEach((c, i) => {
      const ti = chapThemes[i] ? chapThemes[i].theme : -1;
      const t = (H.themes || [])[ti];
      c.src = !t ? '' : t.n ? `From ${t.n} answer${t.n === 1 ? '' : 's'} about: ${t.name}` : `From our 2027 goals: ${t.name}`;
    });
    Film.open({
      title: P.title || 'Our 2027', chapters: P.chapters, closing: P.closing, frags, themes,
      answers: pool.length, people: new Set(pool.map(a => a.p).filter(Boolean)).size, withGoals: goals.length > 0,
      qr: FX.qrSVG(JOIN), url: SHORT, voiceNote: voiceNote(),
      onLive: on => { film = on; broadcast(true); },
      onEnd: () => sendThemes(),
    });
    if (Voice.kind === 'tts' && voiceReady !== 'ready') prepareVoice();
  }

  // ---------- the Play button on the Run tab ----------
  // One button: closes the 2027 question if it is still open, makes sure the story is written
  // from the latest answers, then opens the stage. Nothing else to remember.
  let pendingPlay = false;
  function storyCard() {
    const v = visible();
    let st, cls = '';
    if (pendingPlay || autoBusy) { st = 'Claude is writing the story. It opens on its own when ready.'; cls = 'busy'; }
    else if (H.storyText && !H.backup && !needsUpdate(v)) { st = `Ready: written from ${(H.snap || []).length} answer${(H.snap || []).length === 1 ? '' : 's'}${(H.goals || []).length ? ' and our 2027 goals' : ''}.`; cls = 'ok'; }
    else if (aiOn === false || !v.length) st = 'No story from the team yet. Press Play and the prepared story runs.';
    else st = `${v.length} answer${v.length === 1 ? '' : 's'} in. Press Play: Claude writes the story first (about 30 seconds).`;
    return `<div class="act story ${cls}"><b>Our 2027 story</b><span class="sst">${esc(st)}</span><button class="play" data-play ${pendingPlay || autoBusy ? 'disabled' : ''}>${pendingPlay || autoBusy ? 'Writing...' : 'Play our 2027 story'}</button></div>`;
  }
  const needsUpdate = v => !(sameAnswers(v) && (H.goals || []).length === goalsFor(v).length);
  function playStory() {
    if (H.order.includes('vision')) { H.order = H.order.filter(x => x !== 'vision'); save(); broadcast(true); }
    const v = visible();
    if (aiOn !== false && v.length && !H.edited && (needsUpdate(v) || autoBusy)) { pendingPlay = true; render(); autoStory('play'); return; }
    openStage();
  }

  // ---------- start ----------
  $('shortUrl').textContent = SHORT;
  $('jurl').textContent = SHORT;
  $('qr').innerHTML = FX.qrSVG(JOIN);
  Voice.init().then(() => { renderStatus(); fillVoices(); if (H.storyText) prepareVoice(); });
  // Someone may already be presenting (another tab, or a teammate who tapped "Presenter" on the phone page).
  // Listen first; take over only when the person at this screen says so.
  function probe() {
    let found = null;
    Live.create({ room: ROOM, role: 'player', onMsg: (k, m) => { if (k === 'state' && m.hid && !m._stale) found = m; } });
    setTimeout(() => {
      if (!found) return connect();
      $('guard').classList.remove('hidden');
      $('guardWhen').textContent = new Date(found.st || found.t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }, 4500);
  }
  $('guardGo').onclick = () => { $('guard').classList.add('hidden'); connect(); };
  $('guardNo').onclick = () => { location.href = '/wfo/'; };
  probe();
  render();
})();
