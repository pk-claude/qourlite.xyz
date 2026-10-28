/* Phone (player) logic. Shows whatever the host's latest state says. */
(function () {
  const { sound, confetti, esc } = FX;
  const $ = id => document.getElementById(id);
  const ROOM = Live.room;
  const store = Live.store;
  const AVATARS = ['🦊','🐻','🐼','🦁','🐯','🐸','🐙','🦄','🐝','🦉','🐢','🦖','🐧','🦈','🐨','🦝','🔨','🪚','🧰','🪣','🚜','📦','🏠','🌵'];
  const REACTS = ['👏','😂','🤯','🔥','🧡','😱'];
  const NAMES = ['Captain Comp', 'Basis Point Boss', 'Cycle Count Champ', 'SKU Ninja', 'Pallet Picasso', 'Margin Maverick', 'The Cull Whisperer', 'Turns Turner', 'Barcode Bandit', 'Lumber Legend', 'ASN Ace', 'Bucket Boss', 'Shrink Slayer', 'Ticket Titan', 'Comp Crusher', 'Sir Count-a-lot', 'Inventory Ninja', 'The Bin Wizard', 'Reject Rejector', 'Forklift Phenom'];
  const RIGHT = ['Nailed it.', 'Beat consensus!', 'Inventory: accurate.', 'That is a comp win.', 'Cha-ching.', 'Put this person on the earnings call.', 'Wall Street is impressed.', 'Zero variance.'];
  const WRONG = ['Bold choice. Wrong, but bold.', 'The market disagrees.', 'That one is a write-off.', 'Re-count that one.', 'Even analysts miss sometimes.', 'Close! (It was not close.)', 'Shrink happens.', 'Filed under "lessons learned".'];
  const SHAPES = ['▲', '◆', '●', '■'];
  const LETTERS = ['A', 'B', 'C', 'D'];
  const pick = a => a[Math.floor(Math.random() * a.length)];

  let pid = store.get('ql-pid', null);
  if (!pid) { pid = Live.rid(6); store.set('ql-pid', pid); }
  let me = store.get('ql-me', null); // {nm, av}
  const ansKey = 'ql-ans-' + ROOM;
  let myAns = store.get(ansKey, {}); // qid -> idx or [texts]
  let S = null; // latest host state
  let lastStateAt = 0, lastStateVia = '';
  let joined = false;
  let tab = 'play';
  let pulledFor = null;
  let shownResultFor = null;

  // ---------- relay ----------
  const live = Live.create({
    room: ROOM, role: 'player',
    onMsg: (k, m, ch) => { if (k === 'state') onState(m, ch); },
    onStatus: st => {
      const v = Object.values(st);
      $('conn').className = 'conn ' + (v.includes('up') ? 'up' : v.every(s => s === 'down' || s === 'off') ? 'down' : '');
      if (!S && me) render();
    },
  });
  const send = (payload, opts) => live.publishUp({ p: pid, nm: me && me.nm, av: me && me.av, cs: me && me.cs, ...payload }, opts);

  // ---------- join screen ----------
  let selAv = (me && me.av) || pick(AVATARS);
  $('avs').innerHTML = AVATARS.map(a => `<button data-av="${a}" class="${a === selAv ? 'sel' : ''}" aria-label="avatar ${a}">${a}</button>`).join('');
  $('avs').onclick = e => {
    const b = e.target.closest('[data-av]'); if (!b) return;
    selAv = b.dataset.av;
    $('avs').querySelectorAll('button').forEach(x => x.classList.toggle('sel', x === b));
    sound.play('pop');
  };
  $('nm').value = me ? me.nm : '';
  $('cs').value = me && me.cs ? me.cs : '';
  $('dice').onclick = () => { $('nm').value = pick(NAMES); sound.play('boing'); };
  $('goBtn').onclick = () => {
    const nm = $('nm').value.trim() || pick(NAMES);
    me = { nm: nm.slice(0, 18), av: selAv, cs: $('cs').value.trim().slice(0, 30) };
    store.set('ql-me', me);
    joined = false;
    renderMe(); sendJoin(); render();
    if (navigator.vibrate) navigator.vibrate(30);
  };
  $('editMe').onclick = () => { me = null; render(); };

  let joinTries = 0;
  function sendJoin() { joinTries++; send({ k: 'join' }); }
  setInterval(() => {
    if (!me || joined) return;
    if (!live.mqttUp() && joinTries >= 3) return; // ntfy only: do not spam it
    sendJoin();
  }, 4000);

  function renderMe() {
    $('meAv').textContent = me ? me.av : '';
    $('meNm').textContent = me ? me.nm : 'Q2 Live';
  }

  // ---------- state ----------
  function onState(m, ch) {
    if (m._old || !m.hid) return; // an older presenter screen, or one still running old code
    if (S && !S._stale && m.hid !== S.hid && (m.st || 0) < (S.st || 0)) return;
    if (S && m.hid === S.hid && m.t < S.t) return;
    if (S && !m.hid && S.hid && !S._stale) return;
    if (S && S.sid !== m.sid) { myAns = {}; store.set(ansKey, myAns); shownResultFor = null; }
    S = m; lastStateAt = Date.now(); lastStateVia = ch;
    if (!m._stale && me && Array.isArray(m.pl) && m.pl.includes(pid)) joined = true;
    else if (!m._stale && me && Array.isArray(m.pl) && joined) { joined = false; sendJoin(); } // host was reset
    if (m.q && m.q.left != null) S._deadline = Date.now() + m.q.left * 1000;
    const mine = m.me && m.me[pid];
    if (mine) $('meScore').textContent = mine[1].toLocaleString() + ' pts';
    else if (m.ph === 'lobby' && !(m.pl || []).includes(pid)) $('meScore').textContent = '';
    // A new question pulls players off the bingo card once, so nobody misses it.
    if (m.ph === 'q' && m.q && m.q.open && m.q.id !== pulledFor) {
      pulledFor = m.q.id;
      if (tab === 'bingo' && myAns[m.q.id] == null) { setTab('play'); if (navigator.vibrate) navigator.vibrate(60); }
    }
    render();
  }

  // ---------- rendering ----------
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
  }
  function render() {
    if (!me) { showScreen('sJoin'); $('dock').classList.add('hidden'); return; }
    $('dock').classList.remove('hidden');
    renderMe();
    if (tab === 'bingo') { showScreen('sBingo'); return; }
    if (!S) {
      if (live.anyUp()) waitScreen(`You're in, ${me.nm}!`, 'Nothing to tap yet. The first question pops up here on its own. Keep this page open.', 'Waiting for the presenter to start');
      else waitScreen('Connecting to the room...', 'Hang tight. If this takes more than a few seconds, check you have internet.', 'Connecting');
      return;
    }
    if (S.seg) document.body.style.setProperty('--seg', S.seg.color);
    const q = S.q;
    if (S._stale) return waitScreen(`You're in, ${me.nm}!`, 'Nothing to tap yet. The first question pops up here on its own. Keep this page open.', 'Waiting for the presenter to start');
    if (S.ph === 'lobby') return waitScreen(joined ? `You're in, ${me.nm}!` : 'Joining...', 'Nothing to tap yet. The first question pops up here on its own. Meanwhile, try Jargon Bingo below.', 'Waiting for the presenter to start');
    if (S.ph === 'title') return waitScreen(S.seg.title, S.seg.sub + '. The first question is coming up.', 'Get ready');
    if ((S.ph === 'q' || S.ph === 'reveal') && q) {
      if (q.type === 'text') return textScreen(q);
      if (S.ph === 'q') {
        if (myAns[q.id] != null) return lockedScreen(q);
        if (q.open) return questionScreen(q);
        return waitScreen('Time\'s up!', 'Eyes on the big screen.', 'Reveal coming');
      }
      return resultScreen(q);
    }
    if (S.ph === 'board' || S.ph === 'fightend' || S.ph === 'podium') return rankScreen(S.ph === 'podium');
    waitScreen('Stand by', '');
  }
  function waitScreen(h, p, status) {
    showScreen('sWait');
    $('wAv').textContent = me.av;
    $('wHead').textContent = h;
    $('wSub').textContent = p;
    $('wStatus').classList.toggle('hidden', !status);
    $('wStatusT').textContent = status || '';
    $('wNet').textContent = S ? (S.n ? `${S.n} player${S.n === 1 ? '' : 's'} in the room` : '') : '';
  }

  let barRaf = 0;
  function questionScreen(q) {
    const already = $('sQ').classList.contains('on') && $('sQ').dataset.q === q.id;
    showScreen('sQ');
    $('sQ').dataset.q = q.id;
    if (already) return;
    sound.play('whoosh');
    $('qTag').textContent = q.tag + (q.double ? ' · DOUBLE POINTS' : '') + (q.type === 'poll' ? ' · POLL' : '');
    $('qText').textContent = q.q;
    if (q.type === 'vs') {
      $('answers').innerHTML = `<button class="ans vs-hd" data-a="0">HOME DEPOT</button><button class="ans vs-low" data-a="1">LOWE'S</button>`;
    } else {
      $('answers').innerHTML = q.opts.map((o, i) => `<button class="ans c${i}" data-a="${i}"><span class="sh">${SHAPES[i]}</span><span>${esc(o)}</span></button>`).join('');
    }
    cancelAnimationFrame(barRaf);
    const total = (S._deadline - Date.now());
    const bar = $('qBar');
    (function f() {
      const left = Math.max(0, S._deadline - Date.now());
      bar.style.transform = `scaleX(${total > 0 ? left / Math.max(total, 1) : 0})`;
      bar.style.background = left < 5000 ? 'var(--red)' : 'var(--orange)';
      if (left > 0 && $('sQ').classList.contains('on')) barRaf = requestAnimationFrame(f);
    })();
  }
  $('answers').onclick = e => {
    const b = e.target.closest('[data-a]');
    if (!b || !S || !S.q || !S.q.open) return;
    const q = S.q, a = +b.dataset.a;
    if (myAns[q.id] != null) return;
    myAns[q.id] = a; store.set(ansKey, myAns);
    if (navigator.vibrate) navigator.vibrate(40);
    sound.play('lock');
    sendAnswer(q.id, a, 0);
    render();
  };
  function sendAnswer(qid, a, attempt) {
    send({ k: 'ans', q: qid, a }).then(ok => {
      if (S && S.q && S.q.id === qid && $('lockAck')) $('lockAck').innerHTML = ok ? 'Sent' : 'Retrying...';
    });
    // re-send until the host lists us as answered (only over MQTT, which has no strict limits)
    setTimeout(() => {
      if (!S || !S.q || S.q.id !== qid || !S.q.open) return;
      if ((S.ap || []).includes(pid)) return;
      if (attempt < 3 && lastStateVia !== 'ntfy' && lastStateVia !== 'nt') sendAnswer(qid, a, attempt + 1);
    }, 3500);
  }
  function lockedScreen(q) {
    showScreen('sLocked');
    const a = myAns[q.id];
    $('lockL').textContent = q.type === 'vs' ? (a === 0 ? 'HD' : 'LOW') : LETTERS[a];
    $('lockT').textContent = q.type === 'vs' ? (a === 0 ? 'Home Depot' : 'Lowe\'s') : q.opts[a];
    if ((S.ap || []).includes(pid)) $('lockAck').innerHTML = '<span class="ack">Received by the host</span>';
  }
  function resultScreen(q) {
    showScreen('sResult');
    if (shownResultFor === q.id) return;
    shownResultFor = q.id;
    const a = myAns[q.id];
    const rv = S.rv || {};
    const mine = (S.me || {})[pid];
    const el = $('res');
    if (q.type === 'poll') {
      const tot = Math.max(1, (rv.dist || []).reduce((x, y) => x + y, 0));
      el.className = 'result neutral';
      el.innerHTML = `<div class="r-head">The room says...</div><div class="pollbars">${q.opts.map((o, i) =>
        `<div class="pb ${a === i ? 'mine' : ''}"><i style="width:${((rv.dist || [])[i] || 0) / tot * 100}%"></i><span>${esc(o)}: ${Math.round(((rv.dist || [])[i] || 0) / tot * 100)}%</span></div>`).join('')}</div>
        <div class="r-line" style="margin-top:12px">${a == null ? 'You sat this one out.' : 'Your pick is outlined.'}</div>${rv.fact ? `<div class="r-line" style="margin-top:10px;font-size:.92rem">${esc(rv.fact)}</div>` : ''}`;
      sound.play('ding');
      return;
    }
    const answerText = q.type === 'vs' ? (rv.a === 0 ? 'Home Depot' : 'Lowe\'s') : `${LETTERS[rv.a]}: ${q.opts[rv.a]}`;
    const factLine = rv.fact ? `<div class="r-line" style="margin-top:14px;font-size:.92rem">${esc(rv.fact)}</div>` : '';
    const rankLine = mine ? `You're <b>#${mine[2]}</b> of ${S.n} with <b>${mine[1].toLocaleString()}</b> pts${mine[3] >= 3 ? ` · ${mine[3]} in a row!` : ''}` : '';
    if (a == null) {
      el.className = 'result neutral';
      el.innerHTML = `<div class="r-head">Too slow!</div><div class="r-line">The answer was <b>${esc(answerText)}</b>.</div><div class="r-rank">${rankLine}</div>${factLine}`;
      sound.play('boing');
    } else if (a === rv.a) {
      el.className = 'result good';
      el.innerHTML = `<div class="r-head">Correct!</div>${q.fun ? '<div class="r-line">Bragging rights only. No points this round.</div>' : `<div class="r-pts">+${mine ? mine[0].toLocaleString() : ''}</div>`}<div class="r-line">${pick(RIGHT)}</div><div class="r-rank">${rankLine}</div>${factLine}`;
      sound.play('ding'); confetti({ count: 90 });
      if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
    } else {
      el.className = 'result bad';
      el.innerHTML = `<div class="r-head">Nope.</div><div class="r-line">${pick(WRONG)}</div><div class="r-line" style="margin-top:8px">Answer: <b>${esc(answerText)}</b></div><div class="r-rank">${rankLine}</div>${factLine}`;
      sound.play('buzz');
      if (navigator.vibrate) navigator.vibrate(200);
    }
  }
  function rankScreen(final) {
    showScreen('sRank');
    const mine = (S.me || {})[pid];
    if (!mine) { $('rkLead').textContent = ''; $('rkN').textContent = '--'; $('rkOf').textContent = 'No points yet'; $('rkLine').textContent = 'Answer the next question to get on the board.'; return; }
    const [, total, rank] = mine;
    $('rkLead').textContent = final ? 'Final result' : 'You are';
    $('rkN').textContent = '#' + rank;
    $('rkOf').textContent = `of ${S.n} with ${total.toLocaleString()} pts`;
    $('rkLine').textContent = rank === 1 ? (final ? 'Earnings champion. Frame this screen.' : 'Leading the pack. Don\'t get comfortable.')
      : rank <= 3 ? 'On the podium. Keep it up.'
      : rank <= Math.ceil(S.n / 2) ? 'Top half. Solid beat.' : 'Plenty of quarters left to turn it around.';
    if (final && rank <= 3 && $('sRank').dataset.done !== S.sid) { $('sRank').dataset.done = S.sid; confetti({ count: 200 }); sound.play('fanfare'); }
  }
  function textScreen(q) {
    const already = $('sText').classList.contains('on') && $('sText').dataset.q === q.id;
    showScreen('sText');
    $('sText').dataset.q = q.id;
    $('tTag').textContent = q.tag;
    $('tText').textContent = q.q;
    const sent = Array.isArray(myAns[q.id]) ? myAns[q.id] : [];
    $('tSent').innerHTML = sent.map(t => `<span>${esc(t)}</span>`).join('');
    const can = q.open && sent.length < 3;
    $('tIn').disabled = !can; $('tSend').disabled = !can;
    $('tLeft').textContent = !q.open ? 'Closed. Thanks!' : sent.length >= 3 ? 'That\'s 3. Thanks!' : `Up to ${3 - sent.length} more. Keep it work-friendly: it goes on the big screen.`;
    if (!already && can) setTimeout(() => $('tIn').focus(), 200);
  }
  function sendText() {
    const q = S && S.q;
    const v = $('tIn').value.trim().slice(0, 40);
    if (!q || q.type !== 'text' || !q.open || !v) return;
    const sent = Array.isArray(myAns[q.id]) ? myAns[q.id] : [];
    if (sent.length >= 3 || sent.includes(v)) return;
    myAns[q.id] = [...sent, v]; store.set(ansKey, myAns);
    $('tIn').value = '';
    send({ k: 'ans', q: q.id, a: v });
    sound.play('pop');
    render();
  }
  $('tSend').onclick = sendText;
  $('tIn').addEventListener('keydown', e => { if (e.key === 'Enter') sendText(); });

  // ---------- reactions ----------
  let lastReact = 0;
  $('reacts').innerHTML = REACTS.map((r, i) => `<button data-e="${i}" aria-label="react ${r}">${r}</button>`).join('');
  $('reacts').onclick = e => {
    const b = e.target.closest('[data-e]'); if (!b) return;
    if (Date.now() - lastReact < 600) return;
    lastReact = Date.now();
    send({ k: 're', e: +b.dataset.e }, { important: false });
    if (navigator.vibrate) navigator.vibrate(15);
  };

  // ---------- tabs ----------
  function setTab(t) {
    tab = t;
    $('tabPlay').classList.toggle('on', t === 'play'); $('tabBingo').classList.toggle('on', t === 'bingo');
    if (t === 'play') shownResultFor = null;
  }
  $('tabPlay').onclick = () => { setTab('play'); render(); };
  $('tabBingo').onclick = () => { setTab('bingo'); render(); };

  // ---------- bingo ----------
  const WORDS = ['Comp sales', 'Basis point', 'Average ticket', 'Transactions', 'The Pro', 'DIY', 'Mortgage rate', 'Lock-in', 'Gross margin', 'SG&A', 'EPS', 'Lowe\'s', 'GMS', 'Tariffs', 'Inventory turns', 'The Fed', 'Inflation', 'Consensus', '"Beat"', 'Guidance', 'Online', 'Housing turnover', 'ROIC', 'Wall Street', 'Big-ticket', 'Express delivery', 'Interest rates', 'Operating margin', 'Year over year', 'Headwind', 'Tailwind', 'Market share', 'GDP', 'Real (inflation-adjusted)', 'Shrink', 'In-stock'];
  const bKey = 'ql-bingo-' + ROOM;
  let card = store.get(bKey, null);
  function newCard() {
    const w = WORDS.slice().sort(() => Math.random() - 0.5).slice(0, 24);
    w.splice(12, 0, 'FREE');
    card = { w, on: Array(25).fill(false).map((_, i) => i === 12), called: false };
    store.set(bKey, card);
  }
  if (!card || !card.w || card.w.length !== 25) newCard();
  const LINES = [];
  for (let i = 0; i < 5; i++) { LINES.push([0, 1, 2, 3, 4].map(j => i * 5 + j)); LINES.push([0, 1, 2, 3, 4].map(j => j * 5 + i)); }
  LINES.push([0, 6, 12, 18, 24], [4, 8, 12, 16, 20]);
  function renderBingo() {
    const win = LINES.filter(l => l.every(i => card.on[i]));
    const inLine = new Set(win.flat());
    $('bingo').innerHTML = card.w.map((w, i) => `<button data-i="${i}" class="${card.on[i] ? 'on' : ''} ${i === 12 ? 'free' : ''} ${inLine.has(i) ? 'line' : ''}">${esc(w)}</button>`).join('');
    $('bingoBtn').classList.toggle('hidden', !win.length || card.called);
    return win.length;
  }
  $('bingo').onclick = e => {
    const b = e.target.closest('[data-i]'); if (!b) return;
    const i = +b.dataset.i; if (i === 12) return;
    const before = LINES.filter(l => l.every(k => card.on[k])).length;
    card.on[i] = !card.on[i]; store.set(bKey, card);
    const after = renderBingo();
    sound.play(card.on[i] ? 'pop' : 'tock');
    if (after > before && !card.called) { sound.play('fanfare'); if (navigator.vibrate) navigator.vibrate([50, 50, 50]); }
  };
  $('bingoBtn').onclick = () => {
    card.called = true; store.set(bKey, card);
    send({ k: 'bingo' });
    confetti({ count: 220 }); sound.play('fanfare');
    renderBingo();
  };
  $('bingoNew').onclick = () => { if (confirm('Start a fresh bingo card?')) { newCard(); renderBingo(); } };
  renderBingo();

  // ---------- boot ----------
  if (me) sendJoin();
  render();
  setInterval(() => { if (me && S && Date.now() - lastStateAt > 45000) $('wNet') && ($('wNet').textContent = 'Lost the host for a moment. Reconnecting...'); }, 5000);
})();
