/* Phone (player). Shows whatever the host's latest state says. */
(function () {
  const { sound, confetti, esc } = FX;
  const M = window.MONO;
  const $ = id => document.getElementById(id);
  const ROOM = Live.room;
  const store = Live.store;
  const REACTS = ['👏', '😂', '🤯', '🔥', '💸', '😱'];
  const NAMES = ['Rich Uncle Pete', 'Boardwalk Boss', 'Free Parking Fan', 'Hotel Tycoon', 'Railroad Baron', 'Chance Taker', 'Mortgage Master', 'Dice Royalty', 'Get Out of Jail Free', 'Park Place Pro', 'Utility Mogul', 'Rent Collector'];
  const RIGHT = ['Collect your rent.', 'Bank error in your favour!', 'Pass GO. Collect cash.', 'Hotel-level answer.', 'Monopoly money, real smugness.'];
  const WRONG = ['Go directly to Jail.', 'Do not pass GO.', 'Mortgaged that one.', 'Shrink happens.', 'Pay the Overstock Tax.'];
  const LETTERS = ['A', 'B', 'C', 'D'];
  const MONEY = ['#cfe8c4', '#ffffff', '#f6c544', '#e2231a'];
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const fmt = v => '$' + Math.round(v).toLocaleString();

  let pid = store.get('ql-pid', null);
  if (!pid) { pid = Live.rid(6); store.set('ql-pid', pid); }
  let me = store.get('mono-me', null); // {nm, av}
  let deed = store.get('mono-deed', null);
  let deedAns = store.get('mono-dans', {});
  let deedSkipped = store.get('mono-dskip', false);
  const ansKey = 'mono-ans-' + ROOM, bidKey = 'mono-bids-' + ROOM;
  let myAns = store.get(ansKey, {});
  let myBids = store.get(bidKey, {});
  let S = null, joined = false, tab = 'play', printing = false, editingDeed = false, celebrated = {};

  // ---------- relay ----------
  const live = Live.create({
    room: ROOM, role: 'player',
    onMsg: (k, m) => { if (k === 'state') onState(m); },
    onStatus: st => {
      const v = Object.values(st);
      $('conn').className = 'conn ' + (v.includes('up') ? 'up' : v.every(s => s === 'down' || s === 'off') ? 'down' : '');
    },
  });
  const send = (payload, opts) => live.publishUp({ p: pid, nm: me && me.nm, av: me && me.av, ...payload }, opts);
  let joinTries = 0;
  const sendJoin = () => { joinTries++; send({ k: 'join' }); };
  const sendDeed = () => { if (deed) send({ k: 'deed', d: deed }); };
  setInterval(() => {
    if (!me) return;
    if (!joined) { if (live.mqttUp() || joinTries < 3) sendJoin(); return; }
    if (deed && S && Array.isArray(S.dd) && !S.dd.includes(pid) && live.mqttUp()) sendDeed();
  }, 4000);

  // ---------- join ----------
  let selAv = (me && me.av) || pick(M.tokens);
  $('toks').innerHTML = M.tokens.map(a => `<button data-av="${a}" class="${a === selAv ? 'sel' : ''}" aria-label="token ${a}">${a}</button>`).join('');
  $('toks').onclick = e => {
    const b = e.target.closest('[data-av]'); if (!b) return;
    selAv = b.dataset.av;
    $('toks').querySelectorAll('button').forEach(x => x.classList.toggle('sel', x === b));
    sound.play('pop');
  };
  $('nm').value = me ? me.nm : '';
  $('dice').onclick = () => { $('nm').value = pick(NAMES); sound.play('boing'); };
  $('goBtn').onclick = () => {
    me = { nm: ($('nm').value.trim() || pick(NAMES)).slice(0, 18), av: selAv };
    store.set('mono-me', me);
    joined = false; sendJoin();
    if (deed) sendDeed();
    sound.play('cash'); if (navigator.vibrate) navigator.vibrate(30);
    render();
  };
  $('editMe').onclick = () => { me = null; render(); };

  // ---------- deed ----------
  $('dq').innerHTML = M.deedQs.map(d => `<label for="dq_${d.k}">${esc(d.q)}</label>
    <div class="row" style="margin:6px 0 12px"><input type="text" id="dq_${d.k}" maxlength="60" autocomplete="off" placeholder="${esc(d.ph)}"><button class="sq" data-fill="${d.k}" aria-label="Random answer">🎲</button></div>`).join('');
  M.deedQs.forEach(d => { $('dq_' + d.k).value = deedAns[d.k] || ''; });
  $('dq').onclick = e => {
    const b = e.target.closest('[data-fill]'); if (!b) return;
    $('dq_' + b.dataset.fill).value = pick(M.deedIdeas[b.dataset.fill]); sound.play('boing');
  };
  $('printBtn').onclick = async () => {
    deedAns = {}; M.deedQs.forEach(d => (deedAns[d.k] = $('dq_' + d.k).value.trim()));
    store.set('mono-dans', deedAns);
    printing = true; editingDeed = false; render();
    const d = await DEED.make(me.nm, me.av, deedAns);
    printing = false;
    deed = d; store.set('mono-deed', deed);
    sendDeed();
    sound.play('fanfare'); confetti({ count: 100, colors: MONEY });
    tab = 'deed'; render();
  };
  $('skipDeed').onclick = () => { deedSkipped = true; store.set('mono-dskip', true); editingDeed = false; tab = 'play'; render(); };
  $('deedOk').onclick = () => { tab = 'play'; render(); };
  $('redoDeed').onclick = () => { editingDeed = true; render(); };

  // ---------- state ----------
  function onState(m) {
    if (S && m.t < S.t) return;
    if (S && S.sid !== m.sid) { myAns = {}; myBids = {}; if (card) { card.called = false; store.set(cardKey, card); } store.set(ansKey, myAns); store.set(bidKey, myBids); celebrated = {}; }
    S = m;
    const mine = m.me && m.me[pid];
    if (me && mine) joined = true;
    else if (me && joined) { joined = false; sendJoin(); if (deed) setTimeout(sendDeed, 800); } // host was reset
    if (m.q && m.q.left != null) S._deadline = Date.now() + m.q.left * 1000;
    if (m.lot && m.lot.left != null) S._lotDeadline = Date.now() + m.lot.left * 1000;
    $('meCash').textContent = fmt(mine ? mine[0] : M.start);
    render();
  }

  // ---------- rendering ----------
  const showScreen = id => {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    $('dock').classList.toggle('hidden', ['sJoin', 'sDeedQ', 'sPrint'].includes(id));
  };
  function render() {
    if (!me) return showScreen('sJoin');
    $('meAv').textContent = me.av; $('meNm').textContent = me.nm;
    ['Play', 'Bingo', 'Deed'].forEach(t => $('tab' + t).classList.toggle('on', tab === t.toLowerCase()));
    if (printing) return showScreen('sPrint');
    const early = !S || S.ph === 'lobby' || S.ph === 'rules';
    if (editingDeed || (tab === 'deed' && !deed) || (!deed && !deedSkipped && early)) return showScreen('sDeedQ');
    if (tab === 'bingo') return bingoScreen();
    if (tab === 'deed') { $('myDeed').innerHTML = `<div class="flip-in" style="width:100%;display:flex;flex-direction:column;align-items:center;gap:12px">${DEED.html(deed, { owner: me.nm, tok: me.av })}${DEED.chanceHTML(deed)}</div>`; return showScreen('sDeed'); }
    if (!S) return wait('Connecting to the board...', 'Hang tight. If this takes more than a few seconds, check your internet.');
    const mine = (S.me || {})[pid];
    if (S.ph === 'lobby' || S.ph === 'rules') return wait(joined ? 'You\'re in!' : 'Joining...', `${fmt(mine ? mine[0] : M.start)} in the bank. Eyes on the big screen.`);
    const q = S.q;
    if (S.ph === 'roll' && q) return wait('Rolling the dice...', `Question ${q.i + 1} of ${q.of}. Watch where the token lands.`);
    if (S.ph === 'q' && q) {
      if (myAns[q.id] != null) return locked(q);
      if (q.open) return question(q);
      return wait('Time\'s up!', 'Reveal coming...');
    }
    if (S.ph === 'reveal' && q) return result(q, mine);
    if (S.ph === 'board' || S.ph === 'podium') return rank(mine, S.ph === 'podium');
    if (S.ph === 'auction') return wait('Prize Auction', `You have ${fmt(mine ? mine[0] : M.start)} to spend. Prizes: ${(S.prizes || []).map(esc).join(', ')}. Highest sealed bid wins.`);
    if (S.ph === 'lot' && S.lot) return bid(S.lot, mine);
    if (S.ph === 'sold' && S.lot) return sold(S.lot);
    if (S.ph === 'chest') return chest();
    if (S.ph === 'end') return end(mine);
    wait('Stand by', '');
  }
  function wait(h, sub) {
    $('wAv').textContent = me.av; $('wHead').textContent = h; $('wSub').innerHTML = sub;
    $('editMe').classList.toggle('hidden', !!S && S.ph !== 'lobby' && S.ph !== 'rules');
    showScreen('sWait');
  }

  // question
  let barTimer = null;
  function question(q) {
    showScreen('sQ');
    $('qTag').textContent = `${q.sp.toUpperCase()}${q.dbl ? ' · DOUBLE RENT' : ''}`;
    $('qTag').className = 'ptag' + (q.dbl ? ' dbl' : '');
    if (q.c) $('qTag').style.background = q.dbl ? '' : q.c;
    $('qText').textContent = q.q;
    $('answers').innerHTML = q.opts.map((o, i) => `<button class="ans c${i}" data-a="${i}"><span class="l">${LETTERS[i]}</span><span>${esc(o)}</span></button>`).join('');
    clearInterval(barTimer);
    const total = M.limit * 1000;
    barTimer = setInterval(() => {
      const left = Math.max(0, (S._deadline || 0) - Date.now());
      $('qBar').style.transform = `scaleX(${Math.min(1, left / total)})`;
      if (left <= 0) clearInterval(barTimer);
    }, 150);
  }
  $('answers').onclick = e => {
    const b = e.target.closest('[data-a]'); if (!b || !S || !S.q) return;
    const a = +b.dataset.a;
    myAns[S.q.id] = a; store.set(ansKey, myAns);
    send({ k: 'ans', q: S.q.id, a });
    sound.play('lock'); if (navigator.vibrate) navigator.vibrate(25);
    render();
  };
  function locked(q) {
    showScreen('sLocked');
    const a = myAns[q.id];
    $('lockL').textContent = LETTERS[a]; $('lockT').textContent = q.opts[a];
    $('lockAck').innerHTML = (S.ap || []).includes(pid) ? '<span class="cash">Received by the Bank</span>' : 'Sending...';
  }
  function result(q, mine) {
    showScreen('sResult');
    const a = myAns[q.id], right = a === S.rv.a, gain = mine ? mine[2] : 0;
    const el = $('res');
    el.className = 'result ' + (a == null ? '' : right ? 'good' : 'bad');
    el.innerHTML = `<div class="r-head">${a == null ? 'No answer' : right ? 'Right!' : 'Not quite'}</div>
      ${right ? `<div class="r-pts">+${fmt(gain)}</div>` : ''}
      <div class="r-line">${a == null ? 'Too slow for the Bank this time.' : right ? pick(RIGHT) : `${pick(WRONG)} It was ${esc(q.opts[S.rv.a])}.`}</div>
      ${mine ? `<div style="margin-top:12px;font-weight:800">Cash ${fmt(mine[0])} &middot; #${mine[1]} of ${S.n}</div>` : ''}
      <div class="r-fact">${esc(S.rv.fact)}</div>`;
    if (right && !celebrated[q.id]) { celebrated[q.id] = 1; sound.play('cash'); confetti({ count: 80, colors: MONEY }); if (navigator.vibrate) navigator.vibrate([30, 40, 30]); }
  }
  function rank(mine, final) {
    showScreen('sRank');
    $('rkLead').textContent = final ? 'Final standing' : 'You are';
    $('rkN').textContent = mine ? '#' + mine[1] : '-';
    $('rkOf').textContent = mine ? `of ${S.n} tycoons` : 'Not on the board yet';
    $('rkLine').textContent = mine ? `${fmt(mine[0])} in cash. ${final ? 'Spend it at the Prize Auction next.' : ''}` : '';
  }

  // auction
  let lotTimer = null;
  function bid(lot, mine) {
    showScreen('sBid');
    const cash = mine ? mine[0] : 0, won = mine && mine[3];
    $('bKick').textContent = `Lot ${lot.k + 1} of ${(S.prizes || []).length}`;
    $('bName').textContent = (S.prizes || [])[lot.k] || 'Mystery prize';
    $('bCash').textContent = fmt(cash);
    const mineBid = myBids[lot.k];
    const acked = (lot.bp || []).includes(pid);
    $('bidBox').classList.toggle('hidden', !!won || !lot.open);
    if (won) $('bidMsg').innerHTML = 'You already won a prize. Sit back and enjoy the bidding war.';
    else if (!lot.open) $('bidMsg').innerHTML = mineBid ? `Bidding closed. Your bid: <b>${fmt(mineBid)}</b>` : 'Bidding closed.';
    else $('bidMsg').innerHTML = mineBid ? `Your sealed bid: <b>${fmt(mineBid)}</b> ${acked ? '<span class="cash">(received)</span>' : '(sending...)'}<br><span class="muted small">You can change it until time runs out.</span>` : '<span class="muted">Nobody can see your bid until the reveal.</span>';
    if (document.activeElement !== $('bidIn')) $('bidIn').value = mineBid || '';
    $('bidIn').max = cash;
    clearInterval(lotTimer);
    const total = M.bidSeconds * 1000;
    lotTimer = setInterval(() => {
      const left = Math.max(0, (S._lotDeadline || 0) - Date.now());
      $('bBar').style.transform = `scaleX(${lot.open ? Math.min(1, left / total) : 0})`;
      $('bLeft').textContent = lot.open ? `${Math.ceil(left / 1000)}s left` : 'Closed';
      if (left <= 0) clearInterval(lotTimer);
    }, 200);
  }
  $('quick').onclick = e => {
    const b = e.target.closest('[data-f]'); if (!b || !S) return;
    const mine = (S.me || {})[pid];
    $('bidIn').value = Math.max(10, Math.floor(((mine ? mine[0] : 0) * +b.dataset.f) / 10) * 10);
    sound.play('pop');
  };
  $('bidBtn').onclick = () => {
    if (!S || !S.lot) return;
    const mine = (S.me || {})[pid], cash = mine ? mine[0] : 0;
    const amt = Math.floor(+$('bidIn').value);
    if (!(amt >= 10)) { $('bidMsg').textContent = 'Minimum bid is $10.'; return; }
    if (amt > cash) { $('bidMsg').textContent = `You only have ${fmt(cash)}.`; return; }
    myBids[S.lot.k] = amt; store.set(bidKey, myBids);
    send({ k: 'bid', lot: S.lot.k, amt });
    $('bidIn').blur();
    sound.play('cash'); if (navigator.vibrate) navigator.vibrate(30);
    render();
  };
  function sold(lot) {
    const s = lot.sold, mineBid = myBids[lot.k];
    const name = (S.prizes || [])[lot.k] || 'the prize';
    const key = 'sold' + lot.k;
    // let the big screen do its drumroll first
    if (!celebrated[key]) { celebrated[key] = Date.now(); setTimeout(render, 6500); }
    if (Date.now() - celebrated[key] < 6000) return wait('Going once... going twice...', 'Watch the big screen.');
    if (!s) return wait('No bids', `The Bank keeps ${esc(name)}.`);
    if (s.pid === pid) {
      if (!celebrated[key + 'w']) { celebrated[key + 'w'] = 1; sound.play('fanfare'); confetti({ count: 200, colors: MONEY }); if (navigator.vibrate) navigator.vibrate([60, 60, 60]); }
      return wait('SOLD to you!', `You won <b>${esc(name)}</b> for ${fmt(s.amt)}. See the host after the meeting.`);
    }
    wait(`Sold to ${esc(s.av || '')} ${esc(s.nm || '')}`, `${esc(name)} went for ${fmt(s.amt)}.${mineBid ? ` Your bid was ${fmt(mineBid)}.` : ''}`);
  }
  function chest() {
    const list = S.chest || [];
    const k = list.length - 1, w = list[k];
    const key = 'chest' + k;
    if (!celebrated[key]) { celebrated[key] = Date.now(); setTimeout(render, 4800); }
    if (Date.now() - celebrated[key] < 4500) return wait('Shuffling the Community Chest...', 'Fingers crossed.');
    if (!w) return wait('Community Chest', 'No one left to draw.');
    if (w.pid === pid) {
      if (!celebrated[key + 'w']) { celebrated[key + 'w'] = 1; sound.play('fanfare'); confetti({ count: 200, colors: MONEY }); if (navigator.vibrate) navigator.vibrate([60, 60, 60]); }
      return wait('Community Chest: YOU!', 'You collect a prize. See the host after the meeting.');
    }
    wait(`${esc(w.av || '')} ${esc(w.nm || '')} wins!`, 'Advance to the prize table. (Not you this time.)');
  }
  function end(mine) {
    const prizes = S.prizes || [];
    const wonLot = mine && mine[3];
    const chestWin = (S.chest || []).some(c => c && c.pid === pid);
    wait('Game over', wonLot || chestWin ? 'You won a prize! See the host after the meeting.' : `Thanks for playing. You finished with ${fmt(mine ? mine[0] : 0)} in Monopoly money, which is worth exactly nothing.${prizes.length ? '' : ''}`);
  }

  // ---------- bingo ----------
  // One card per player per room, built the first time it is opened and then kept.
  const cardKey = 'mono-card-' + ROOM;
  let card = store.get(cardKey, null); // {sq: [25 strings], on: [25 bools], called}
  function seeded(str) {
    let h = 2166136261;
    for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  }
  function buildCard() {
    const rnd = seeded(pid + ROOM);
    const own = [];
    if (deedAns.phrase) own.push(`Someone says ${deedAns.phrase.slice(0, 34)}`);
    if (deedAns.snack) own.push(`Someone mentions ${deedAns.snack.slice(0, 30)}`);
    const pool = M.bingo.slice();
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const sq = [...own, ...pool].slice(0, 24);
    for (let i = sq.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [sq[i], sq[j]] = [sq[j], sq[i]]; }
    sq.splice(12, 0, 'FREE PARKING');
    const on = sq.map((_, i) => i === 12);
    card = { sq, on, own, called: false };
    store.set(cardKey, card);
  }
  const LINES = [];
  for (let i = 0; i < 5; i++) { LINES.push([0, 1, 2, 3, 4].map(j => i * 5 + j)); LINES.push([0, 1, 2, 3, 4].map(j => j * 5 + i)); }
  LINES.push([0, 6, 12, 18, 24], [4, 8, 12, 16, 20]);
  const doneLines = () => LINES.filter(l => l.every(i => card.on[i]));
  function bingoScreen() {
    if (!card) buildCard();
    showScreen('sBingo');
    const lit = new Set(doneLines().flat());
    $('bingo').innerHTML = card.sq.map((t, i) => `<button data-b="${i}" class="${i === 12 ? 'free' : ''} ${card.on[i] ? 'on' : ''} ${lit.has(i) ? 'line' : ''} ${card.own.includes(t) ? 'mine' : ''}">${esc(t)}</button>`).join('');
    const hit = lit.size > 0;
    const rankIdx = S && Array.isArray(S.bg) ? S.bg.indexOf(pid) : -1;
    $('bingoBtn').classList.toggle('hidden', !hit || card.called);
    $('bingoMsg').innerHTML = card.called
      ? (rankIdx > -1 ? `<b>BINGO #${rankIdx + 1}!</b> You have a second Community Chest ticket.` : 'BINGO sent. Waiting for the Bank...')
      : hit ? '' : '<span class="muted small">Squares in light yellow came from your own deed answers.</span>';
  }
  $('bingo').onclick = e => {
    const b = e.target.closest('[data-b]'); if (!b) return;
    const i = +b.dataset.b; if (i === 12) return;
    card.on[i] = !card.on[i]; store.set(cardKey, card);
    sound.play(card.on[i] ? 'pop' : 'tick');
    if (card.on[i] && navigator.vibrate) navigator.vibrate(15);
    render();
  };
  $('bingoBtn').onclick = () => {
    card.called = true; store.set(cardKey, card);
    send({ k: 'bingo' });
    sound.play('fanfare'); confetti({ count: 160, colors: MONEY });
    render();
  };
  setInterval(() => { if (card && card.called && S && Array.isArray(S.bg) && !S.bg.includes(pid) && live.mqttUp()) send({ k: 'bingo' }); }, 5000);

  // ---------- dock ----------
  $('reacts').innerHTML = REACTS.map((r, i) => `<button data-e="${i}" aria-label="react ${r}">${r}</button>`).join('');
  let lastReact = 0;
  $('reacts').onclick = e => {
    const b = e.target.closest('[data-e]'); if (!b || Date.now() - lastReact < 700) return;
    lastReact = Date.now();
    send({ k: 're', e: +b.dataset.e }, { important: false });
  };
  $('tabPlay').onclick = () => { tab = 'play'; editingDeed = false; render(); };
  $('tabDeed').onclick = () => { tab = 'deed'; render(); };
  $('tabBingo').onclick = () => { tab = 'bingo'; editingDeed = false; render(); };

  if (me) { sendJoin(); if (deed) setTimeout(sendDeed, 1500); }
  render();
})();
