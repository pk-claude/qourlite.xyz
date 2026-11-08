/* The 2027 film: a full-screen, narrated documentary built from the team's answers.
   Film.open({ title, chapters: [{ heading, text, src }], closing, frags, themes: [{ name, n }], answers, people, qr, url, onLive, onEnd }) */
(function () {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
  const say = n => (n < WORDS.length ? WORDS[n] : String(n));
  const STOP = { stop: true };
  let root = null, D = null, run = 0, paused = false, ctl = null, captionsOnly = false, hideT = 0;

  // ---------- quiet ambient bed (synthesized, no files) ----------
  const Music = (() => {
    let ac = null, master = null, on = true, timer = 0, step = 0;
    // I, V, vi, IV in C: the warm, hopeful progression. Plucks rise in brightness as the world blooms.
    const CH = [[130.81, 196.0, 261.63, 329.63], [98.0, 196.0, 246.94, 293.66], [110.0, 164.81, 261.63, 329.63], [87.31, 174.61, 220.0, 261.63]];
    let lift = 0, plT = 0, pk = 0;
    function pluck(f, t, v) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      o.connect(g).connect(bright); o.start(t); o.stop(t + 1.7);
    }
    let bright = null;
    function plucks() {
      if (!ac || lift <= 0.05) return;
      const notes = CH[(step + 3) % CH.length], t = ac.currentTime;
      const f = notes[1 + (pk++ % 3)] * (lift > 0.6 && pk % 4 === 0 ? 4 : 2);
      pluck(f, t, 0.12 * lift);
    }
    function chord() {
      if (!ac) return;
      const t = ac.currentTime, notes = CH[step++ % CH.length];
      notes.forEach((f, i) => [-4, 4].forEach(dt => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = i === 0 ? 'sine' : 'triangle'; o.frequency.value = f; o.detune.value = dt;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(i === 0 ? 0.5 : 0.22, t + 3.5);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 11);
        o.connect(g).connect(master); o.start(t); o.stop(t + 11.2);
      }));
    }
    return {
      start() {
        if (!ac) {
          try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
          const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
          master = ac.createGain(); master.gain.value = 0.0001;
          master.connect(lp).connect(ac.destination);
          bright = ac.createGain(); bright.gain.value = 0.35; bright.connect(ac.destination);
        }
        ac.resume();
        clearInterval(timer); clearInterval(plT); chord(); timer = setInterval(chord, 4800); plT = setInterval(plucks, 600);
        this.level(on ? 0.05 : 0.0001, 3);
      },
      level(v, s = 1.5) { if (!ac) return; const t = ac.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), t); master.gain.exponentialRampToValueAtTime(Math.max(0.0001, v), t + s); },
      fade(s = 6) { this.level(0.0001, s); lift = 0; setTimeout(() => clearInterval(timer), s * 1000); },
      stop() { clearInterval(timer); clearInterval(plT); lift = 0; this.level(0.0001, 0.6); },
      lift(v) { lift = v; },
      toggle() { on = !on; this.level(on ? 0.05 : 0.0001, 1); if (bright) bright.gain.value = on ? 0.35 : 0; return on; },
      get on() { return on; },
    };
  })();

  // ---------- timing that respects pause and stop ----------
  const check = tok => { if (tok !== run) throw STOP; };
  function wait(ms, tok) {
    return new Promise((res, rej) => {
      let left = ms, last = performance.now();
      (function f(now) {
        if (tok !== run) return rej(STOP);
        if (!paused) left -= now - last;
        last = now;
        if (left <= 0) return res();
        requestAnimationFrame(f);
      })(last);
    });
  }
  const layer = html => { const el = document.createElement('div'); el.className = 'layer'; el.innerHTML = html; root.querySelector('.scene').appendChild(el); requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on'))); return el; };
  async function clear(tok, ms = 1400) {
    root.querySelectorAll('.scene > *').forEach(el => el.classList.remove('on'));
    await wait(ms, tok);
    root.querySelector('.scene').innerHTML = '';
  }

  // ---------- narration with live captions ----------
  async function narrate(text, tok, capEl) {
    const parts = Voice.sentences(text);
    const starts = []; parts.reduce((o, s, i) => (starts[i] = o, o + s.length), 0);
    let shown = -1, spans = [], wordEnds = [];
    const show = i => {
      shown = i;
      const s = parts[i].trim();
      const ws = s.split(/\s+/);
      let o = starts[i] + (parts[i].length - parts[i].trimStart().length);
      wordEnds = ws.map(w => { const at = text.indexOf(w, o); o = (at < 0 ? o : at) + w.length; return o; });
      capEl.style.opacity = 0;
      setTimeout(() => {
        capEl.innerHTML = ws.map(w => `<span class="w">${esc(w)}</span>`).join(' ');
        spans = [...capEl.querySelectorAll('.w')];
        capEl.style.opacity = 1;
      }, shown === 0 ? 0 : 160);
    };
    const onProgress = c => {
      let i = parts.length - 1; while (i > 0 && starts[i] > c) i--;
      if (i !== shown) show(i);
      spans.forEach((sp, k) => sp.classList.toggle('said', wordEnds[k] <= c + 1));
    };
    onProgress(0);
    ctl = Voice.say(text, onProgress, captionsOnly ? 'none' : undefined);
    if (paused) ctl.pause();
    await ctl.done;
    ctl = null;
    check(tok);
    spans.forEach(sp => sp.classList.add('said'));
  }

  // ---------- the film ----------
  async function play(tok) {
    const total = D.answers;
    Music.start();
    D.onLive && D.onLive(true);
    World.set({ dawn: 0.06, grass: 0, bloom: 0, trees: 0, path: 0, build: 0, people: 0, links: 0, gather: 0, lanterns: 0, dim: 0 });
    // 1. the question
    let L = layer(`<div><div class="kick">Workforce Operations &nbsp;|&nbsp; November 9, 2026</div><p class="lede" style="margin-top:3vh">Today, ${D.people ? `${say(D.people).toLowerCase()} of you wrote ${total}` : `this team wrote ${total}`} answers to one question.</p></div>`);
    await wait(3600, tok);
    L.innerHTML = `<div><div class="kick">The question</div><p class="ttl" style="font-size:clamp(2rem,4.2vw,3.8rem)">It is December 2027, and we are looking back on our best year.</p><p class="lede">What did this team do that you are proudest of?</p></div>`;
    await wait(6200, tok);
    await clear(tok);

    // 2. reading the answers
    const scene = root.querySelector('.scene');
    const cells = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) if (!(r > 0 && r < 3 && c === 1)) cells.push([c, r]);
    cells.sort(() => Math.random() - 0.5);
    const frags = D.frags.slice(0, cells.length).map((t, i) => {
      const el = document.createElement('div');
      el.className = 'frag';
      const [c, r] = cells[i];
      el.style.left = (4 + c * 32 + Math.random() * 4) + 'vw';
      el.style.top = (8 + r * 21 + Math.random() * 5) + 'vh';
      el.textContent = '“' + t + '”';
      scene.appendChild(el);
      return el;
    });
    L = layer(`<div><p class="lede" id="fl">Claude read every answer.</p><div class="tchips"></div></div>`);
    for (const el of frags) { await wait(420, tok); el.classList.add('on'); el.style.transform = `translate(${(Math.random() - 0.5) * 30}px, ${-10 - Math.random() * 20}px)`; }
    await wait(3800, tok);
    frags.forEach(el => el.classList.remove('on'));
    World.seeds(total); World.set({ dawn: 0.16, grass: 0.22 });
    const fl = L.querySelector('#fl');
    fl.style.transition = 'opacity .6s'; fl.style.opacity = 0;
    await wait(700, tok);
    fl.textContent = 'Every answer is a seed.';
    fl.style.opacity = 1;
    await wait(2600, tok);
    fl.style.opacity = 0;
    await wait(700, tok);
    fl.textContent = D.themes.length > 1 ? `Together they grow into ${say(D.themes.length).toLowerCase()} hopes for this team.` : 'Together they grow into one hope for this team.';
    fl.style.opacity = 1;
    const tc = L.querySelector('.tchips');
    tc.innerHTML = D.themes.map(t => `<span class="tchip">${esc(t.name)}<b>${t.n}</b></span>`).join('');
    for (const el of tc.children) { await wait(650, tok); el.classList.add('on'); }
    await wait(4200, tok);
    await clear(tok, 1800);

    // 3. title: first light
    World.set({ dawn: 0.3, grass: 0.45, trees: 0.12 }); Music.lift(0.15);
    L = layer(`<div><div class="kick">Looking back from 2028</div><div class="ttl">${esc(D.title)}</div></div>`);
    await wait(1600, tok);
    if (!captionsOnly && Voice.kind !== 'none') { ctl = Voice.say(D.title + '.', () => {}); await ctl.done; ctl = null; check(tok); }
    await wait(2400, tok);
    await clear(tok, 1600);

    // 4. chapters
    for (let i = 0; i < D.chapters.length; i++) {
      const ch = D.chapters[i];
      // each chapter moves the world forward: more light, more growth, more people, more connection
      const f = (i + 1) / D.chapters.length;
      World.set({ dawn: 0.3 + 0.62 * f, grass: 0.5 + 0.5 * f, trees: 0.2 + 0.8 * f, bloom: 0.85 * f, path: f, build: Math.min(1, f * 1.15),
        people: Math.min(1, 0.25 + f), links: Math.max(0, (f - 0.3) / 0.7) });
      Music.lift(0.2 + 0.6 * f);
      const el = layer(`<div class="chap"><div class="kick">${ch.heading ? `Chapter ${i + 1}` : ''}</div><div class="h">${esc(ch.heading || '')}</div></div><div class="cap"></div><div class="src">${esc(ch.src || '')}</div>`);
      await wait(1500, tok);
      if (ch.src) el.querySelector('.src').classList.add('on');
      await narrate(ch.text, tok, el.querySelector('.cap'));
      await wait(1400, tok);
      await clear(tok, 1300);
    }
    // 5. closing
    World.set({ dawn: 1, bloom: 1, trees: 1, path: 1, build: 1, people: 1, links: 1, gather: 1, lanterns: 1 }); Music.lift(1);
    if (D.closing) {
      const el = layer(`<div class="cap"></div>`);
      await wait(900, tok);
      await narrate(D.closing, tok, el.querySelector('.cap'));
      await wait(2600, tok);
      await clear(tok, 2000);
    }
    // 6. the ask
    World.set({ dim: 0.5 });
    Music.fade(14);
    D.onLive && D.onLive(false);
    D.onEnd && D.onEnd();
    layer(`<div><div class="kick">Written by Workforce Operations &nbsp;|&nbsp; Told by Claude</div><div class="ttl" style="font-size:clamp(2.2rem,4.6vw,4.4rem)">Which part do we make real first?</div>
      <div class="endq"><div class="qrb">${D.qr}</div><div><ol>${D.themes.map(t => `<li>${esc(t.name)}</li>`).join('')}</ol><p class="kick" style="margin-top:2vh">Vote on your phone &nbsp;|&nbsp; ${esc(D.url)}</p></div></div></div>`);
  }

  function start() {
    const tok = ++run;
    paused = false;
    setBtn();
    root.querySelector('.scene').innerHTML = '';
    play(tok).catch(e => { if (e !== STOP) console.error(e); });
  }
  function stopAll() { run++; if (ctl) { ctl.stop(); ctl = null; } }
  function togglePause() {
    if (!root.querySelector('.begin')) {
      paused = !paused;
      if (ctl) paused ? ctl.pause() : ctl.resume();
      paused ? Music.level(0.02) : Music.level(Music.on ? 0.05 : 0.0001);
      setBtn();
    } else begin();
  }
  function begin() { root.querySelector('.scene').innerHTML = ''; start(); }
  function setBtn() {
    if (!root) return;
    root.querySelector('[data-a=pause]').textContent = paused ? 'Resume' : 'Pause';
    root.querySelector('[data-a=cap]').classList.toggle('on', captionsOnly);
    root.querySelector('[data-a=music]').classList.toggle('on', Music.on);
  }
  function close() {
    stopAll(); Music.stop(); World.stop();
    if (D && D.onLive) D.onLive(false);
    removeEventListener('keydown', onKey, true);
    if (root) { root.classList.add('hidden'); root.innerHTML = ''; }
    root = null;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }
  function onKey(e) {
    const k = e.key.toLowerCase();
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (k === ' ' || k === 'enter') { e.preventDefault(); togglePause(); }
    else if (k === 'r') { stopAll(); start(); }
    else if (k === 'c') { captionsOnly = !captionsOnly; if (ctl && captionsOnly) { /* takes effect from the next part */ } setBtn(); }
    else if (k === 'm') { Music.toggle(); setBtn(); }
    else return;
    e.stopPropagation();
  }

  function open(data) {
    D = data;
    root = document.getElementById('film');
    root.classList.remove('hidden');
    root.innerHTML = `<canvas class="world"></canvas><div class="vign"></div><div class="scene"></div>
      <div class="ctrl"><button data-a="pause">Pause</button><button data-a="restart">Restart</button><button data-a="cap">Captions only</button><button data-a="music">Music</button><button data-a="close">Close (Esc)</button></div>`;
    const b = document.createElement('div');
    b.className = 'layer on';
    b.innerHTML = `<div class="begin"><div class="kick">Workforce Operations</div><div class="ttl">Our 2027 Story</div><button>Begin</button><p id="fvoice">${esc(data.voiceNote || '')}</p></div>`;
    root.querySelector('.scene').appendChild(b);
    World.start(root.querySelector('canvas.world'), { flowers: data.answers, people: data.people || Math.ceil(data.answers / 2) });
    b.querySelector('button').onclick = begin;
    root.querySelector('.ctrl').onclick = e => {
      const a = e.target.dataset.a; if (!a) return;
      if (a === 'pause') togglePause(); else if (a === 'restart') { stopAll(); start(); }
      else if (a === 'cap') { captionsOnly = !captionsOnly; setBtn(); } else if (a === 'music') { Music.toggle(); setBtn(); } else if (a === 'close') close();
    };
    root.onmousemove = () => { root.classList.add('cur'); clearTimeout(hideT); hideT = setTimeout(() => root && root.classList.remove('cur'), 2500); };
    addEventListener('keydown', onKey, true);
    setBtn();
    if (root.requestFullscreen) root.requestFullscreen().catch(() => {});
  }
  window.Film = { open, close, note(t) { const p = document.getElementById('fvoice'); if (p) p.textContent = t; }, get open_() { return !!root; } };
})();
