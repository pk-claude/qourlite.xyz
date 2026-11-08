/* WFO All Hands, phone page. Shows whatever the presenter has opened. No name, no sign-in.
   The phone keeps its own votes and answers, and sends all of them each time something changes
   (and again every few seconds until the presenter screen confirms it has them). */
(function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ACTS = Object.fromEntries(WFO.acts.map(a => [a.id, a]));
  const LTR = 'ABCDE';
  const store = Live.store;
  const KEY = 'wfo-me-' + Live.room;

  let pid = store.get('wfo-pid', null);
  if (!pid) { pid = Live.rid(6); store.set('wfo-pid', pid); }
  const blank = () => ({ ep: 0, v: 0, votes: { debate: [null, null, null], voa: null, hh: null, real: null }, realKey: '', vis: [] });
  let me = store.get(KEY, null) || blank();
  me.votes = Object.assign(blank().votes, me.votes || {});
  me.vis = Array.isArray(me.vis) ? me.vis : [];
  const save = () => store.set(KEY, me);
  let S = null;           // latest presenter state
  let draft = '', cat = '';
  const cards = new Map(); // activity id -> element

  const live = Live.create({
    room: Live.room, role: 'player',
    onMsg: (k, m) => { if (k === 'state') onState(m); },
    onStatus: st => {
      const v = Object.values(st);
      const up = v.includes('up');
      $('conn').className = 'dot ' + (up ? 'up' : v.every(s => s === 'down' || s === 'off') ? 'down' : '');
      $('connT').textContent = up ? 'Live' : 'Connecting';
    },
  });

  function send() {
    if (!me.v) return;
    live.publishUp({ p: pid, k: 'me', v: me.v, votes: me.votes, vis: me.vis });
  }
  const acked = () => !!(S && S.ack && S.ack[pid] >= me.v);
  function change() { me.v = Date.now(); save(); send(); paintAll(); }
  setInterval(() => { if (me.v && S && !S._stale && !acked()) send(); }, 4000);

  function onState(m) {
    if (m._old || !m.hid) return;
    if (S && m.hid === S.hid && m.t < S.t) return;
    const first = !S || S.sid !== m.sid;
    if ((m.ep || 0) > (me.ep || 0)) { const ep = m.ep; me = blank(); me.ep = ep; save(); } // presenter cleared everything
    const rk = (m.real || []).join('|');
    if (rk !== me.realKey) { me.realKey = rk; me.votes.real = null; save(); }
    S = m;
    if (first && me.v && !m._stale && !acked()) send();
    render();
  }

  // ---------- rendering ----------
  function render() {
    const main = $('main');
    if (!S || S._stale) return idle(main, S ? 'Waiting for the presenter' : 'Connecting to the room', 'Keep this page open. Activities appear here on their own.');
    if (S.film) return idle(main, 'Eyes on the big screen', 'Your 2027 story is playing. The vote opens here right after.', true);
    const open = (S.open || []).filter(id => ACTS[id] && (id !== 'real' || (S.real || []).length));
    if (!open.length) return idle(main, 'Nothing to answer right now', 'Keep this page open. The next activity appears here on its own.');
    main.querySelectorAll('.idle, .film').forEach(n => n.remove());
    for (const [id, el] of cards) if (!open.includes(id) || (id === 'real' && el.dataset.k !== (S.real || []).join('|'))) { el.remove(); cards.delete(id); }
    open.forEach((id, i) => {
      let el = cards.get(id);
      if (!el) { el = build(ACTS[id]); cards.set(id, el); }
      if (main.children[i] !== el) main.insertBefore(el, main.children[i] || null);
    });
    paintAll();
  }
  function idle(main, big, sub, film) {
    cards.forEach(el => el.remove()); cards.clear();
    main.innerHTML = `<div class="card ${film ? 'film' : 'idle'}">${film ? '' : '<div class="lights"><i></i><i></i><i></i><i></i><i></i></div>'}<p class="big">${esc(big)}</p><p class="sub" ${film ? 'style="color:#bbb"' : ''}>${esc(sub)}</p></div>`;
  }
  const optBtn = (txt, i, data) => `<button class="opt" ${data} style="--c:${Racers.color(i)}"><span class="fill" style="width:0"></span><span class="ltr">${LTR[i]}</span><span class="txt">${esc(txt)}<br><span class="place"></span></span><span class="pct"></span><span class="rc">${Racers.svg(i)}</span></button>`;

  // Boost: fires flames behind your racer on the big screen. It never changes a vote.
  const boostRow = q => `<div class="boostrow" data-bq="${q}"><button class="boost" data-bq="${q}">Boost my racer</button><span class="bcount"></span></div>`;
  let myBoosts = 0;
  function boost(a, q, btn) {
    if (btn.classList.contains('cool')) return;
    const i = a.kind === 'multi' ? me.votes.debate[q] : me.votes[a.id];
    if (i == null) return;
    live.publishUp({ p: pid, k: 'boost', a: a.id, q, i }, { important: false });
    myBoosts++;
    btn.classList.remove('fire', 'cool'); void btn.offsetWidth; btn.classList.add('fire', 'cool');
    setTimeout(() => btn.classList.remove('cool'), 2500);
    if (navigator.vibrate) navigator.vibrate([30, 40, 60]);
    document.querySelectorAll('.bcount').forEach(n => (n.textContent = `${myBoosts} boost${myBoosts === 1 ? '' : 's'} fired`));
  }
  function build(a) {
    const el = document.createElement('section');
    el.className = 'card';
    el.dataset.id = a.id;
    if (a.kind === 'multi') {
      el.innerHTML = `<p class="kick">${esc(a.label)}</p><h1>${esc(a.title)}</h1><p class="sub">${esc(a.sub)}</p>` +
        a.qs.map((q, qi) => `<h2><span class="rn">RACE ${qi + 1}</span>${esc(q.q)}</h2><div class="opts">${q.opts.map((o, i) => optBtn(o, i, `data-q="${qi}" data-i="${i}"`)).join('')}</div>${boostRow(qi)}`).join('') +
        `<div class="saved"></div>`;
    } else if (a.kind === 'single') {
      const opts = a.id === 'real' ? S.real || [] : a.opts;
      el.dataset.k = a.id === 'real' ? opts.join('|') : '';
      el.innerHTML = `<p class="kick">${esc(a.label)}</p><h1>${esc(a.title)}</h1><p class="sub">${esc(a.sub)}</p><h2></h2><div class="opts">${opts.map((o, i) => optBtn(o, i, `data-i="${i}"`)).join('')}</div>${boostRow(0)}<div class="saved"></div>`;
    } else {
      el.innerHTML = `<p class="kick">${esc(a.label)}</p><h1>${esc(a.title)}</h1><h2 style="margin-top:4px">${esc(a.q)}</h2><p class="sub">${esc(a.sub)}</p>
        <div class="chips">${a.cats.map(c => `<button class="chip" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>
        <textarea maxlength="300" placeholder="In December 2027 we..."></textarea>
        <div class="row"><span class="count"></span><button class="go">Send</button></div>
        <ul class="mine"></ul><div class="saved"></div>`;
      const ta = el.querySelector('textarea');
      ta.value = draft;
      ta.oninput = () => { draft = ta.value; paint(el); };
      el.querySelector('.go').onclick = () => {
        const t = ta.value.replace(/\s+/g, ' ').trim().slice(0, 300);
        if (t.length < 3 || me.vis.length >= 3) return;
        me.vis.push({ t, c: cat });
        draft = ''; ta.value = ''; cat = '';
        change();
      };
      el.querySelector('.chips').onclick = e => { const b = e.target.closest('.chip'); if (!b) return; cat = cat === b.dataset.c ? '' : b.dataset.c; paint(el); };
      el.querySelector('.mine').onclick = e => { const b = e.target.closest('[data-del]'); if (!b) return; me.vis.splice(+b.dataset.del, 1); change(); };
    }
    if (a.kind !== 'text') el.onclick = e => {
      const bb = e.target.closest('.boost'); if (bb) return boost(a, +bb.dataset.bq, bb);
      const b = e.target.closest('.opt'); if (!b) return;
      const i = +b.dataset.i;
      if (a.kind === 'multi') me.votes.debate[+b.dataset.q] = i; else me.votes[a.id] = i;
      if (navigator.vibrate) navigator.vibrate(20);
      change();
    };
    return el;
  }

  const paintAll = () => cards.forEach(paint);
  function bars(btns, mine, tally) {
    const tot = (tally || []).reduce((s, n) => s + n, 0);
    btns.forEach((b, i) => {
      b.classList.toggle('sel', mine === i);
      const show = mine != null && tot > 0;
      const p = show ? Math.round(100 * (tally[i] || 0) / tot) : 0;
      b.querySelector('.fill').style.width = p + '%';
      b.querySelector('.pct').textContent = show ? p + '%' : '';
      // Race position of your pick
      const t = tally || [], v = t[i] || 0, ahead = t.filter(n => n > v).length, tie = t.filter(n => n === v).length > 1, gap = Math.max(...t, 0) - v;
      const who = `#${Racers.num(i)} ${Racers.name(i)}`;
      b.querySelector('.place').textContent = mine === i && show ? (ahead === 0 ? (tie ? `${who}: tied for P1. Boost it!` : `${who}: P1. Defend the lead!`) : `${who}: P${ahead + 1}, ${gap} behind. Boost it!`) : '';
    });
  }
  function paint(el) {
    const id = el.dataset.id, a = ACTS[id], T = (S && S.tally) || {};
    const ok = acked();
    const sv = el.querySelector('.saved');
    if (a.kind === 'multi') {
      a.qs.forEach((q, qi) => bars([...el.querySelectorAll(`.opt[data-q="${qi}"]`)], me.votes.debate[qi], (T.debate || [])[qi]));
      a.qs.forEach((q, qi) => el.querySelector(`.boostrow[data-bq="${qi}"]`).classList.toggle('on', me.votes.debate[qi] != null));
      const n = me.votes.debate.filter(v => v != null).length;
      sv.textContent = n ? (ok ? `Saved (${n} of 3). Change your pick any time.` : 'Sending...') : '';
    } else if (a.kind === 'single') {
      bars([...el.querySelectorAll('.opt')], me.votes[id], T[id]);
      el.querySelector('.boostrow').classList.toggle('on', me.votes[id] != null);
      sv.textContent = me.votes[id] != null ? (ok ? 'Saved. You can change your vote.' : 'Sending...') : '';
    } else {
      const ta = el.querySelector('textarea');
      const full = me.vis.length >= 3;
      ta.disabled = full;
      ta.placeholder = full ? 'Thank you. That is the maximum of three.' : 'In December 2027 we...';
      el.querySelector('.count').textContent = full ? '' : `${300 - ta.value.length} characters left`;
      el.querySelector('.go').disabled = full || ta.value.trim().length < 3;
      el.querySelectorAll('.chip').forEach(c => c.classList.toggle('sel', c.dataset.c === cat));
      el.querySelector('.mine').innerHTML = me.vis.map((v, i) => `<li>${esc(v.t)}<small><span>${esc(v.c || '')}</span><button class="linkish" data-del="${i}">Remove</button></small></li>`).join('');
      sv.textContent = me.vis.length ? (ok ? `Received: ${me.vis.length} of 3. Not linked to you.` : 'Sending...') : '';
    }
    sv.classList.toggle('ok', ok);
  }
  render();
})();
