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
    if (m.k !== 'me' || typeof m.p !== 'string' || !/^[a-z0-9]{1,12}$/.test(m.p)) return;
    const old = H.phones[m.p];
    if (old && !(m.v > old.v)) return;
    const vt = m.votes || {};
    const d = Array.isArray(vt.debate) ? vt.debate : [];
    H.phones[m.p] = {
      v: +m.v || Date.now(), at: (old && old.at) || Date.now(),
      votes: { debate: [0, 1, 2].map(i => idx(d[i], 4)), voa: idx(vt.voa, 3), hh: idx(vt.hh, 3), real: idx(vt.real, H.realOpts.length) },
      vis: (Array.isArray(m.vis) ? m.vis : []).slice(0, 3).map(x => ({ t: clean(x && x.t).slice(0, 300), c: ACTS.vision.cats.includes(x && x.c) ? x.c : '' })).filter(x => x.t),
    };
    save(); broadcast(); renderSoon();
  }

  // ---------- counts ----------
  const optsOf = id => (id === 'real' ? H.realOpts : ACTS[id].opts);
  function manualOf(id) {
    const want = id === 'debate' ? [4, 4, 4] : [optsOf(id).length];
    let m = H.manual[id];
    if (!Array.isArray(m) || (id === 'real' && m[0].length !== want[0])) m = H.manual[id] = want.map(n => Array(n).fill(0));
    return m;
  }
  function tallies() {
    const T = { debate: manualOf('debate').map(r => r.slice()) };
    ['voa', 'hh', 'real'].forEach(id => (T[id] = manualOf(id)[0].slice()));
    for (const r of Object.values(H.phones)) {
      r.votes.debate.forEach((v, q) => { if (v != null) T.debate[q][v]++; });
      ['voa', 'hh', 'real'].forEach(id => { const v = r.votes[id]; if (v != null && v < T[id].length) T[id][v]++; });
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

  function renderRun() {
    $('acts').innerHTML = WFO.acts.map(a => {
      const open = H.order.includes(a.id);
      const can = a.id !== 'real' || H.realOpts.length;
      return `<div class="act ${H.show === a.id ? 'show' : ''}" data-show="${a.id}"><b>${esc(a.label)}</b>
        <div class="st ${open ? 'open' : ''}"><span>${open ? 'Open on phones' : can ? 'Closed' : 'After the story'}</span>${can ? `<button class="tg" data-tg="${a.id}">${open ? 'Close' : 'Open'}</button>` : ''}</div></div>`;
    }).join('') + `<p class="note">Click a card to show it here. Open puts it on every phone. The 2027 answer can stay open while other votes run.</p>`;
    const a = ACTS[H.show], T = tallies(), open = H.order.includes(a.id);
    const head = `<p class="kick">${esc(a.label)}<span class="state ${open ? 'open' : ''}">${open ? 'Open' : 'Closed'}</span></p>`;
    const bars = (opts, t, id, q) => {
      const tot = t.reduce((s, n) => s + n, 0), max = Math.max(...t);
      return `<div class="bars">${opts.map((o, i) => `<div class="brow ${tot && t[i] === max ? 'lead' : ''}"><span class="lb">${esc(o)}</span>
        <span class="vl"><span class="man"><button data-m="${id}" data-q="${q}" data-i="${i}" data-d="-1">-</button><button data-m="${id}" data-q="${q}" data-i="${i}" data-d="1">+</button></span> ${t[i]}${tot ? ` | ${Math.round(100 * t[i] / tot)}%` : ''}</span>
        <span class="tr"><i style="width:${tot ? (100 * t[i] / tot).toFixed(1) : 0}%"></i></span></div>`).join('')}</div>`;
    };
    let html;
    if (a.kind === 'multi') {
      const voters = Object.values(H.phones).filter(r => r.votes.debate.some(v => v != null)).length;
      html = `${head}<h1>${esc(a.title)}</h1><p class="sub">${esc(a.sub)}</p><div class="qcols">${a.qs.map((q, qi) => `<div class="qcol"><h2>${esc(q.q)}</h2>${bars(q.opts, T.debate[qi], 'debate', qi)}</div>`).join('')}</div><p class="total">${voters} people voted</p>`;
    } else if (a.kind === 'single') {
      const t = T[a.id], tot = t.reduce((s, n) => s + n, 0);
      html = a.id === 'real' && !H.realOpts.length
        ? `${head}<h1>${esc(a.title)}</h1><p class="sub">The options come from the themes. Run the Story tab first, then press "Send themes to the room".</p>`
        : `${head}<div class="single"><h1>${esc(a.title)}</h1><p class="sub">${esc(a.sub)}</p>${bars(optsOf(a.id), t, a.id, 0)}<p class="total">${tot} votes</p></div>`;
    } else {
      const all = answers(), people = new Set(all.filter(x => x.p).map(x => x.p)).size;
      const byCat = a.cats.map(c => [c, all.filter(x => x.c === c).length]);
      html = `${head}<div class="visbig"><div><div class="num">${all.length}</div><div class="lbl">answers${people ? ` from ${people} ${people === 1 ? 'person' : 'people'}` : ''}</div>
        <p class="q">${esc(a.title)} ${esc(a.q)}</p><div class="catrow">${byCat.map(([c, n]) => `<span>${esc(c)}<b>${n}</b></span>`).join('')}</div>
        <p class="muted" style="margin-top:18px">Anonymous. Stays open until the story at the end.</p></div></div>`;
    }
    $('stage').innerHTML = html;
    $('stage').classList.toggle('manual', $('manualOn').checked);
  }
  $('acts').onclick = e => {
    const tg = e.target.closest('[data-tg]');
    if (tg) {
      const id = tg.dataset.tg;
      H.order = H.order.includes(id) ? H.order.filter(x => x !== id) : [id, ...H.order];
      H.show = id;
    } else { const c = e.target.closest('[data-show]'); if (!c) return; H.show = c.dataset.show; }
    save(); broadcast(true); render();
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
    H = fresh(Date.now()); save(); broadcast(true); render(); renderStory();
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
    $('themesOut').innerHTML = (H.themes || []).map(t => `<div class="theme"><b>${esc(t.name)}</b><span class="c">${t.n} answer${t.n === 1 ? '' : 's'}</span><p>${esc(t.summary)}</p>${t.quote ? `<q>${esc(t.quote)}</q>` : ''}</div>`).join('');
  }
  function renderStory() { renderStatus(); renderStoryCounts(); renderThemes(); $('storyText').value = H.storyText || ''; fillVoices(); }

  async function post(body) {
    const r = await fetch('/api/story', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'error ' + r.status);
    return j;
  }
  function busy(btn, msgEl, txt) { btn.disabled = true; msgEl.className = 'msg'; let s = 0; msgEl.textContent = txt; const iv = setInterval(() => (msgEl.textContent = `${txt} ${++s}s`), 1000); return () => { clearInterval(iv); btn.disabled = false; }; }
  $('themesBtn').onclick = async () => {
    const v = visible();
    if (!v.length) { $('themesMsg').className = 'msg err'; $('themesMsg').textContent = 'No answers yet.'; return; }
    const done = busy($('themesBtn'), $('themesMsg'), `Claude is reading ${v.length} answers...`);
    try {
      const snap = v.map(a => ({ t: a.t, c: a.c, p: a.p }));
      const j = await post({ step: 'themes', answers: snap });
      H.snap = snap; H.themes = j.themes; save();
      $('themesMsg').className = 'msg ok'; $('themesMsg').textContent = `${j.themes.length} themes${j.skipped && j.skipped.length ? `. ${j.skipped.length} left out (off topic or identifying).` : '.'}`;
      renderThemes(); renderStoryCounts();
    } catch (e) { $('themesMsg').className = 'msg err'; $('themesMsg').textContent = `Claude did not answer (${e.message}). Try again.`; }
    done();
  };
  $('storyBtn').onclick = async () => {
    const snap = H.snap || visible().map(a => ({ t: a.t, c: a.c, p: a.p }));
    if (!snap.length) { $('storyMsg').className = 'msg err'; $('storyMsg').textContent = 'No answers yet.'; return; }
    const done = busy($('storyBtn'), $('storyMsg'), 'Claude is writing...');
    try {
      const j = await post({ step: 'story', answers: snap, themes: H.themes || [] });
      H.story = j;
      H.storyText = `# ${j.title}\n\n` + j.chapters.map(c => `## ${c.heading}\n${c.text}`).join('\n\n') + (j.closing ? `\n\n${j.closing}` : '');
      save();
      $('storyText').value = H.storyText;
      $('storyMsg').className = 'msg ok'; $('storyMsg').textContent = `Done: about ${H.storyText.split(/\s+/).length} words. Read it, edit if needed.`;
      prepareVoice();
    } catch (e) { $('storyMsg').className = 'msg err'; $('storyMsg').textContent = `Claude did not answer (${e.message}). Try again, or paste a story into the box.`; }
    done();
  };
  let editT = 0;
  $('storyText').oninput = () => { H.storyText = $('storyText').value; save(); clearTimeout(editT); editT = setTimeout(prepareVoice, 2000); };

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
  $('stageBtn').onclick = () => {
    const P = parse(H.storyText || '');
    if (!P.chapters.length) { $('voiceMsg').className = 'msg err'; $('voiceMsg').textContent = 'Write or paste the story first.'; return; }
    const themes = (H.themes || []).map(t => ({ name: t.name, n: t.n }));
    const snap = H.snap || visible();
    const inThemes = new Set((H.themes || []).flatMap(t => t.ids || []));
    const pool = snap.filter((a, i) => !inThemes.size || inThemes.has(i + 1));
    const frags = pool.map(a => a.t.length > 95 ? a.t.slice(0, 92).replace(/\s+\S*$/, '') + '...' : a.t).sort(() => Math.random() - 0.5);
    const chapThemes = (H.story && H.story.chapters) || [];
    P.chapters.forEach((c, i) => {
      const ti = chapThemes[i] ? chapThemes[i].theme : -1;
      const t = (H.themes || [])[ti];
      c.src = t ? `From ${t.n} answer${t.n === 1 ? '' : 's'} about: ${t.name}` : '';
    });
    Film.open({
      title: P.title || 'Our 2027', chapters: P.chapters, closing: P.closing, frags, themes,
      answers: pool.length, people: new Set(pool.map(a => a.p).filter(Boolean)).size,
      qr: FX.qrSVG(JOIN), url: SHORT, voiceNote: voiceNote(),
      onLive: on => { film = on; broadcast(true); },
      onEnd: () => sendThemes(),
    });
    if (Voice.kind === 'tts' && voiceReady !== 'ready') prepareVoice();
  };

  // ---------- start ----------
  $('shortUrl').textContent = SHORT;
  $('jurl').textContent = SHORT;
  $('qr').innerHTML = FX.qrSVG(JOIN);
  Voice.init().then(() => { renderStatus(); fillVoices(); if (H.storyText) prepareVoice(); });
  connect();
  render();
})();
