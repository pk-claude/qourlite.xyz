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
  const ansKey = 'mono-ans-' + ROOM;
  const myMs = {};
  let myAns = store.get(ansKey, {});
  let S = null, joined = false, tab = 'play', celebrated = {};
  const shownAt = {}; // when each question first appeared on this phone: speed is timed from here, so slower connections are not penalised

  // ---------- relay ----------
  const live = Live.create({
    room: ROOM, role: 'player',
    onMsg: (k, m) => { if (k === 'state') onState(m); },
    onStatus: st => {
      const v = Object.values(st);
      $('conn').className = 'conn ' + (v.includes('up') ? 'up' : v.every(s => s === 'down' || s === 'off') ? 'down' : '');
      if (!S) render();
    },
  });
  const send = (payload, opts) => live.publishUp({ p: pid, nm: me && me.nm, av: me && me.av, ...payload }, opts);
  let joinTries = 0;
  const sendJoin = () => { joinTries++; send({ k: 'join' }); };
  const mine = () => (S && !S._stale && S.me && S.me[pid]) || null; // [cash/10, rank, gain/10, flags]
  // My dealt properties: the big screen deals the same hand from the same player id.
  const HAND = M.handFor(pid);
  const ownsQ = q => q && HAND.includes(q.at);
  function handHTML(hot, big) {
    return `<div class="props ${big ? 'big' : ''}">${HAND.map(i => {
      const sp = M.board[i];
      return `<div class="pc ${i === hot ? 'hot' : ''}" style="--c:${sp.c ? M.colors[sp.c] : '#ddd'}"><i></i><span>${esc(sp.n)}</span>${big ? `<small>$${sp.p}</small>` : ''}</div>`;
    }).join('')}</div>`;
  }
  setInterval(() => {
    if (!me) return;
    if (!joined && (live.anyUp() || joinTries < 3)) sendJoin();
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
    sound.play('cash'); if (navigator.vibrate) navigator.vibrate(30);
    render();
  };
  $('editMe').onclick = () => { me = null; render(); };

  // ---------- state ----------
  function onState(m) {
    if (m._old || !m.hid) return; // an older presenter screen, or one still running old code
    if (S && !S._stale && m.hid !== S.hid && (m.st || 0) < (S.st || 0)) return;
    if (S && m.hid === S.hid && m.t < S.t) return;
    if (S && S.sid !== m.sid && !m._stale) { myAns = {}; store.set(ansKey, myAns); celebrated = {}; }
    S = m;
    const my = mine();
    if (me && my) joined = true;
    else if (me && joined && !m._stale) { joined = false; sendJoin(); } // host was reset
    if (m.q && m.q.left != null) S._deadline = Date.now() + m.q.left * 1000;
    $('meCash').textContent = fmt(my ? my[0] * 10 : M.start);
    // A new question pulls players back to the Play tab once, so nobody misses it.
    if (!m._stale && m.ph === 'q' && m.q && m.q.open && tab !== 'play' && !celebrated['pull' + m.q.id] && myAns[m.q.id] == null) {
      celebrated['pull' + m.q.id] = 1; tab = 'play'; if (navigator.vibrate) navigator.vibrate(60);
    }
    render();
  }

  // ---------- rendering ----------
  const showScreen = id => {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    $('dock').classList.toggle('hidden', id === 'sJoin');
    // questions and answers must fit on one screen: no dock, compact layout
    document.body.classList.toggle('fit', ['sQ', 'sLocked', 'sResult'].includes(id));
  };
  function render() {
    if (!me) return showScreen('sJoin');
    $('meAv').textContent = me.av; $('meNm').textContent = me.nm;
    $('tabPlay').classList.toggle('on', tab === 'play'); $('tabDeed').classList.toggle('on', tab === 'deed');
    if (tab === 'deed') {
      $('myDeed').innerHTML = `<div class="kicker" style="align-self:flex-start">Your ${HAND.length} Home Depot DCs</div>${handHTML(null, true)}
        <p class="muted" style="margin:0;text-align:center">When the forklift lands on one of yours, your right answer pays <b>double rent</b>.</p>`;
      return showScreen('sDeed');
    }
    if (!S || S._stale) {
      if (live.anyUp()) return wait(`You're in, ${esc(me.nm)}!`, 'Waiting for the presenter to start. Questions pop up here on their own, so keep this page open.');
      return wait('Connecting to the board...', 'Hang tight. On work wifi and stuck here? Switch your phone to cellular data.');
    }
    const my = mine();
    if (S.ph === 'lobby' || S.ph === 'rules') return wait(joined ? `You're in, ${esc(me.nm)}!` : 'Joining...', `${fmt(my ? my[0] * 10 : M.start)} in the bank, and you own these ${HAND.length} properties:`, `${handHTML()}<p class="muted small">If the token lands on one, your right answer pays double rent. Questions pop up here on their own.</p>`);
    const q = S.q;
    if (S.ph === 'roll' && q) {
      // wait for the token to finish walking on the big screen before saying where it landed
      const key = 'roll' + q.id;
      if (!celebrated[key]) { celebrated[key] = Date.now(); setTimeout(render, 4000); }
      if (Date.now() - celebrated[key] < 3800) return wait('Rolling the dice...', `Roll ${q.i + 1} of ${q.of}. Watch the big screen.`, handHTML());
      if (ownsQ(q)) {
        if (!celebrated[key + 'own']) { celebrated[key + 'own'] = 1; sound.play('fanfare'); if (navigator.vibrate) navigator.vibrate([80, 60, 80]); }
        return wait('It landed on YOUR property!', `<b>${esc(q.sp)}</b> is yours. Get this question right for <b>double rent</b>.`, handHTML(q.at));
      }
      return wait(`Landed on ${esc(q.sp)}`, 'Not one of yours this time. The question pops up here in a moment.', handHTML());
    }
    if (S.ph === 'q' && q) {
      if (myAns[q.id] != null) return locked(q, my);
      if (q.open) return question(q);
      return wait('Time\'s up!', 'Answer coming...');
    }
    if (S.ph === 'reveal' && q) return result(q, my);
    if (S.ph === 'board') return rank(my);
    if (S.ph === 'podium' || S.ph === 'chest' || S.ph === 'end') return prizes(my);
    wait('Stand by', '');
  }
  function wait(h, sub, extra) {
    $('wAv').textContent = me.av; $('wHead').innerHTML = h; $('wSub').innerHTML = sub;
    $('wExtra').innerHTML = extra || '';
    $('editMe').classList.toggle('hidden', !!S && !S._stale && S.ph !== 'lobby' && S.ph !== 'rules');
    showScreen('sWait');
  }

  // question
  let barTimer = null;
  function question(q) {
    showScreen('sQ');
    if (!shownAt[q.id]) shownAt[q.id] = Date.now();
    $('qTag').textContent = `${q.sp.toUpperCase()}${q.dbl ? ' · DOUBLE RENT' : ''}`;
    $('qTag').className = 'ptag' + (q.dbl ? ' dbl' : '');
    $('qTag').style.background = !q.dbl && q.c ? q.c : '';
    $('qText').textContent = q.q;
    $('qOwn').classList.toggle('hidden', !ownsQ(q));
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
    myMs[S.q.id] = Date.now() - (shownAt[S.q.id] || Date.now());
    send({ k: 'ans', q: S.q.id, a, ms: myMs[S.q.id] });
    sound.play('lock'); if (navigator.vibrate) navigator.vibrate(25);
    render();
  };
  // Re-send an answer the host has not confirmed yet (a dropped message on a shaky connection).
  setInterval(() => {
    if (!S || S._stale || S.ph !== 'q' || !S.q || !S.q.open) return;
    const a = myAns[S.q.id], my = mine();
    if (a != null && !(my && my[3] & 1)) send({ k: 'ans', q: S.q.id, a, ms: myMs[S.q.id] });
  }, 3000);
  function locked(q, my) {
    showScreen('sLocked');
    const a = myAns[q.id];
    $('lockL').textContent = LETTERS[a]; $('lockT').textContent = q.opts[a];
    $('lockAck').innerHTML = my && my[3] & 1 ? '<span class="cash">Received by the Bank</span>' : 'Sending...';
  }
  function result(q, my) {
    showScreen('sResult');
    let a = myAns[q.id];
    const late = a != null && !(my && my[3] & 1); // the Bank closed before this answer arrived
    if (late) a = null;
    const right = a === S.rv.a, gain = my ? my[2] * 10 : 0;
    const el = $('res');
    el.className = 'result ' + (a == null ? '' : right ? 'good' : 'bad');
    el.innerHTML = `<div class="r-head">${a == null ? 'No answer' : right ? 'Right!' : 'Not quite'}</div>
      ${right ? `<div class="r-pts">+${fmt(gain)}</div>${ownsQ(q) ? '<div class="r-line"><b>Double rent: you own this property!</b></div>' : ''}` : ''}
      <div class="r-line">${late ? 'Your answer reached the Bank after time was up.' : a == null ? 'Too slow for the Bank this time.' : right ? pick(RIGHT) : `${pick(WRONG)} It was ${esc(q.opts[S.rv.a])}.`}</div>
      ${my ? `<div style="margin-top:12px;font-weight:800">Cash ${fmt(my[0] * 10)} &middot; #${my[1]} of ${S.n}</div>` : ''}
      <div class="r-fact">${esc(S.rv.fact)}</div>`;
    if (right && !celebrated[q.id]) { celebrated[q.id] = 1; sound.play('cash'); confetti({ count: 80, colors: MONEY }); if (navigator.vibrate) navigator.vibrate([30, 40, 30]); }
  }
  function rank(my) {
    showScreen('sRank');
    $('rkLead').textContent = 'Final standing';
    $('rkN').textContent = my ? '#' + my[1] : '-';
    $('rkOf').textContent = my ? `of ${S.n} tycoons` : 'Not on the board yet';
    $('rkLine').textContent = my ? `${fmt(my[0] * 10)} in cash. Ties go to whoever answered faster in total.` : '';
  }
  // podium, Community Chest and game over: where am I in the prize pick order?
  function prizes(my) {
    const pk = S.pk || [];
    const n = pk.findIndex(x => x.pid === pid);
    // let the big screen finish its drumroll before the phones give it away
    if (S.ph === 'chest' || S.ph === 'podium') {
      const key = S.ph + S.pos;
      if (!celebrated[key]) { celebrated[key] = Date.now(); setTimeout(render, 4800); }
      if (Date.now() - celebrated[key] < 4500) return wait(S.ph === 'chest' ? 'Shuffling the Community Chest...' : 'And the winners are...', 'Watch the big screen. Fingers crossed.');
    }
    if (n > -1) {
      const key = 'won' + n;
      if (!celebrated[key]) { celebrated[key] = 1; sound.play('fanfare'); confetti({ count: 200, colors: MONEY }); if (navigator.vibrate) navigator.vibrate([60, 60, 60]); }
      return wait(pk[n].why === '1st place' ? 'You are the Monopoly Champion!' : 'Community Chest: you won!', 'You won a prize. See the host after the meeting.');
    }
    if (S.ph === 'podium') return wait('And the champion is...', `You finished #${my ? my[1] : '-'} with ${fmt(my ? my[0] * 10 : 0)}. Next: one Community Chest draw. Everyone except 1st place is in.`);
    if (S.ph === 'chest') {
      const w = pk.find(x => x.pid === S.cw);
      return w ? wait(`${esc(w.av)} ${esc(w.nm)} wins!`, 'Advance to the prize table. (Not you this time.)') : wait('Community Chest', 'No one left to draw.');
    }
    wait('Game over', `Thanks for playing. You finished #${my ? my[1] : '-'} with ${fmt(my ? my[0] * 10 : 0)} in Monopoly money, which is worth exactly nothing.`);
  }

  // ---------- dock ----------
  $('reacts').innerHTML = REACTS.map((r, i) => `<button data-e="${i}" aria-label="react ${r}">${r}</button>`).join('');
  let lastReact = 0;
  $('reacts').onclick = e => {
    const b = e.target.closest('[data-e]'); if (!b || Date.now() - lastReact < 700) return;
    lastReact = Date.now();
    send({ k: 're', e: +b.dataset.e }, { important: false });
  };
  $('tabPlay').onclick = () => { tab = 'play'; render(); };
  $('tabDeed').onclick = () => { tab = 'deed'; render(); };

  if (me) sendJoin();
  render();
})();
