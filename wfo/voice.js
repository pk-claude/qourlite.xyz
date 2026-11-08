/* Narrator voice for the WFO 2027 film.
   Three ways to speak, best first:
     tts:<name>  a natural AI voice from /api/voice (needs OPENAI_API_KEY on the server), prepared ahead as MP3
     web:<uri>   a voice installed on this computer (Microsoft Edge has natural "Online (Natural)" voices)
     none        captions only, timed to a calm reading pace
   Voice.say(text, onProgress) -> { done, pause(), resume(), stop() }; onProgress(charIndex) drives the captions. */
(function () {
  const synth = window.speechSynthesis;
  let tts = false, ttsVoices = [], choice = 'none';
  const cache = new Map(); // voice|text -> Promise<objectURL>
  const LABEL = { cedar: 'Cedar', marin: 'Marin', ash: 'Ash', ballad: 'Ballad', onyx: 'Onyx', sage: 'Sage', coral: 'Coral', verse: 'Verse' };

  const webVoices = () => (synth ? synth.getVoices() : []).filter(v => /^en[-_]/i.test(v.lang));
  const natural = v => /natural|neural|premium|enhanced/i.test(v.name);
  const rank = v => {
    const order = [/Andrew.*Natural/i, /Brian.*Natural/i, /Ava.*Natural/i, /Emma.*Natural/i, /Christopher.*Natural/i, /Guy.*Natural/i, /Jenny.*Natural/i, /Aria.*Natural/i, /Ryan.*Natural/i, /Sonia.*Natural/i, /natural/i, /Google UK English Male/i, /Google US English/i, /Daniel/i, /Samantha/i];
    const i = order.findIndex(re => re.test(v.name));
    return i < 0 ? 99 : i;
  };

  function options() {
    const out = [];
    if (tts) ttsVoices.forEach((n, i) => out.push({ value: 'tts:' + n, label: `AI narrator: ${LABEL[n] || n}${i === 0 ? ' (recommended)' : ''}` }));
    webVoices().sort((a, b) => rank(a) - rank(b)).forEach(v => out.push({ value: 'web:' + v.voiceURI, label: `This computer: ${v.name}` }));
    out.push({ value: 'none', label: 'No voice: captions only (you read it aloud)' });
    return out;
  }
  function best() { const o = options(); return o.length ? o[0].value : 'none'; }
  const kind = () => choice.split(':')[0];
  function hint() {
    if (kind() === 'tts') return 'Natural AI voice. The audio is prepared before the film starts.';
    if (kind() === 'web') {
      const v = webVoice();
      if (v && natural(v)) return 'Natural voice from this computer. Good.';
      return 'This voice may sound robotic. For a natural voice, open this page in Microsoft Edge and pick one marked "Online (Natural)", such as Andrew or Ava.';
    }
    return 'No voice. Captions only, so read the story aloud yourself.';
  }
  const webVoice = () => webVoices().find(v => 'web:' + v.voiceURI === choice) || null;

  async function init() {
    try { const r = await fetch('/api/voice', { cache: 'no-store' }); const j = await r.json(); tts = !!j.tts; ttsVoices = j.voices || []; } catch (e) { tts = false; }
    // Voices load late in some browsers.
    if (synth && !synth.getVoices().length) await new Promise(res => { synth.onvoiceschanged = res; setTimeout(res, 1500); });
    if (synth) synth.onvoiceschanged = () => Voice.onlist && Voice.onlist();
    return { tts };
  }

  function audioFor(text, voice = choice) {
    const name = voice.slice(4);
    const key = name + '|' + text;
    if (!cache.has(key)) {
      const p = fetch('/api/voice', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, voice: name }) })
        .then(r => { if (!r.ok) throw new Error('voice ' + r.status); return r.blob(); })
        .then(b => URL.createObjectURL(b));
      p.catch(() => cache.delete(key)); // let a later try fetch it again
      cache.set(key, p);
    }
    return cache.get(key);
  }
  // Prepare every part ahead of time so the film never waits on the network.
  async function prepare(texts, onStep) {
    if (kind() !== 'tts') return { ok: texts.length, of: texts.length };
    let ok = 0, n = 0;
    await Promise.all(texts.map(t => audioFor(t).then(() => ok++, () => {}).finally(() => onStep && onStep(++n, texts.length, ok))));
    return { ok, of: texts.length };
  }

  // Character weights so captions follow a recorded voice: punctuation is where a narrator pauses.
  function timeline(text) {
    const w = [0];
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      w.push(w[i] + 1 + (c === ',' || c === ';' || c === ':' ? 5 : c === '.' || c === '?' || c === '!' ? 11 : 0));
    }
    return f => { const target = f * w[w.length - 1]; let lo = 0, hi = w.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (w[m] < target) lo = m + 1; else hi = m; } return lo; };
  }
  const sentences = text => (text.match(/[^.!?]+[.!?]+["')”]*\s*|[^.!?]+$/g) || [text]).map(s => s);

  // Timed captions: a calm pace, longer pauses at sentence ends.
  function sayTimed(text, onProgress, startAt = 0) {
    const at = timeline(text);
    const total = (text.length / 13.5 + (text.match(/[.!?]/g) || []).length * 0.55 + (text.match(/,/g) || []).length * 0.2) * 1000;
    let t0 = performance.now() - startAt * total, paused = 0, pauseAt = 0, stopped = false, raf = 0, resolve;
    const done = new Promise(r => (resolve = r));
    const tick = now => {
      if (stopped) return;
      if (pauseAt) { raf = requestAnimationFrame(tick); return; }
      const f = Math.min(1, (now - t0 - paused) / total);
      onProgress(at(f));
      if (f >= 1) return resolve();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return { done, pause() { if (!pauseAt) pauseAt = performance.now(); }, resume() { if (pauseAt) { paused += performance.now() - pauseAt; pauseAt = 0; } }, stop() { stopped = true; cancelAnimationFrame(raf); resolve(); } };
  }

  function sayAudio(text, onProgress) {
    let a = null, stopped = false, raf = 0, resolve, fallback = null, pausedReq = false;
    const done = new Promise(r => (resolve = r));
    const at = timeline(text);
    audioFor(text).then(url => {
      if (stopped) return;
      a = new Audio(url);
      a.onended = () => { onProgress(text.length); resolve(); };
      a.onerror = () => toTimed();
      const tick = () => { if (stopped || !a) return; if (a.duration) onProgress(at(Math.min(1, a.currentTime / a.duration))); raf = requestAnimationFrame(tick); };
      a.play().then(() => { raf = requestAnimationFrame(tick); if (pausedReq) a.pause(); }, () => toTimed());
    }, () => toTimed());
    function toTimed() { if (stopped || fallback) return; Voice.lastError = 'The AI voice did not load. Captions only for this part.'; fallback = sayTimed(text, onProgress); if (pausedReq) fallback.pause(); fallback.done.then(resolve); }
    return {
      done,
      pause() { pausedReq = true; if (fallback) fallback.pause(); else if (a) a.pause(); },
      resume() { pausedReq = false; if (fallback) fallback.resume(); else if (a) a.play().catch(() => {}); },
      stop() { stopped = true; cancelAnimationFrame(raf); if (a) a.pause(); if (fallback) fallback.stop(); resolve(); },
    };
  }

  function sayWeb(text, onProgress) {
    const parts = sentences(text);
    const starts = []; parts.reduce((o, s, i) => (starts[i] = o, o + s.length), 0);
    const v = webVoice();
    let i = 0, stopped = false, paused = false, resolve, timed = null, est = 0;
    const done = new Promise(r => (resolve = r));
    function next() {
      if (stopped || paused) return;
      if (i >= parts.length) { onProgress(text.length); return resolve(); }
      const s = parts[i], base = starts[i];
      const u = new SpeechSynthesisUtterance(s.trim());
      if (v) { u.voice = v; u.lang = v.lang; }
      u.rate = v && natural(v) ? 0.96 : 0.9; u.pitch = 1;
      let started = false, gotBoundary = false;
      const lead = s.length - s.trimStart().length;
      u.onstart = () => { started = true; const t0 = performance.now(); clearInterval(est); est = setInterval(() => { if (!gotBoundary) onProgress(base + Math.min(s.length, Math.round((performance.now() - t0) / 1000 * 14 * u.rate))); }, 80); };
      u.onboundary = e => { gotBoundary = true; if (e.name === 'word' || e.charIndex) onProgress(base + lead + e.charIndex + (e.charLength || 0)); };
      u.onend = () => { if (u._dead) return; clearInterval(est); onProgress(base + s.length); i++; setTimeout(next, /[.!?]["')”]*\s*$/.test(s) ? 380 : 120); };
      u.onerror = () => { if (u._dead) return; clearInterval(est); toTimed(); };
      cur = u;
      synth.speak(u);
      // Some engines never start (or never say why): fall back to timed captions.
      setTimeout(() => { if (!started && !stopped && !paused && cur === u) { u._dead = true; synth.cancel(); Voice.lastError = 'The computer voice did not start. Captions only.'; toTimed(); } }, 3000);
    }
    let cur = null;
    function toTimed() { if (timed || stopped) return; const rest = text.slice(starts[i] || 0); const off = starts[i] || 0; timed = sayTimed(rest, c => onProgress(off + c)); timed.done.then(resolve); }
    if (synth) synth.cancel();
    next();
    return {
      done,
      pause() { paused = true; if (timed) return timed.pause(); if (cur) cur._dead = true; clearInterval(est); synth.cancel(); },
      resume() { if (!paused) return; paused = false; if (timed) return timed.resume(); next(); }, // repeats the current sentence from its start
      stop() { stopped = true; if (cur) cur._dead = true; clearInterval(est); if (timed) timed.stop(); if (synth) synth.cancel(); resolve(); },
    };
  }

  function say(text, onProgress, mode) {
    const k = mode || kind();
    if (k === 'tts') return sayAudio(text, onProgress);
    if (k === 'web' && synth) return sayWeb(text, onProgress);
    return sayTimed(text, onProgress);
  }

  window.Voice = {
    init, options, best, prepare, say, sentences, hint,
    get choice() { return choice; }, set choice(v) { choice = v; },
    get kind() { return kind(); },
    get tts() { return tts; },
    lastError: '', onlist: null,
  };
})();
