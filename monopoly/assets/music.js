/* Background music for the presenter screen, synthesized live (no audio files).
     lobby: a bouncy warehouse shuffle with a forklift back-up beep as its hook
     think: a ticking, building bed for the 20 seconds a question is open
   MUSIC.play('lobby' | 'think'), MUSIC.stop(). The Music button / B key turns it off;
   the Sound button (FX) mutes it too. */
(function () {
  let ctx = null, master = null, current = null, timer = null, step = 0, nextAt = 0, startedAt = 0;
  let on = true;
  try { on = localStorage.getItem('mono-music') !== '0'; } catch (e) {}
  const VOL = 0.3;
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const audible = () => on && !(window.FX && FX.sound.muted);

  function ac() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
      master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    }
    return ctx;
  }
  ['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, () => { const a = ac(); if (a && a.state === 'suspended') a.resume(); }));

  function note(freq, t, dur, { type = 'triangle', vol = 0.3, lp = 0, attack = 0.005, slide = 0 } = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out = g;
    if (lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; g.connect(f); out = f; }
    o.connect(g); out.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }
  let noiseBuf = null;
  function hat(t, vol = 0.08, dur = 0.04) {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + dur + 0.02);
  }
  const kick = (t, vol = 0.5) => note(120, t, 0.18, { type: 'sine', vol, slide: -80 });

  // ---------- lobby: 8 bars of C, Am, F, G at 104 bpm, in eighth notes ----------
  const L = {
    spb: 60 / 104 / 2, len: 64,
    roots: [48, 45, 41, 43, 48, 45, 41, 43],
    chords: [[60, 64, 67], [57, 60, 64], [57, 60, 65], [59, 62, 67], [60, 64, 67], [57, 60, 64], [57, 60, 65], [59, 62, 67]],
    mel: [
      76, 0, 79, 0, 81, 79, 76, 0,   72, 0, 74, 76, 0, 0, 72, 0,
      77, 0, 76, 74, 72, 0, 69, 0,   71, 0, 74, 0, 79, 0, 0, 0,
      76, 0, 79, 0, 81, 84, 81, 0,   79, 0, 76, 74, 76, 0, 72, 0,
      77, 0, 81, 0, 79, 77, 76, 74,  74, 76, 79, 0, 84, 0, 0, 0],
    play(i, t) {
      const bar = Math.floor(i / 8), s = i % 8, r = this.roots[bar];
      if (s === 0 || s === 4) kick(t, 0.45);
      hat(t, s % 2 ? 0.06 : 0.03);
      const bass = [r, 0, r + 7, 0, r + 12, 0, r + 7, r + 9][s];
      if (bass) note(hz(bass - 12), t, this.spb * 0.9, { type: 'triangle', vol: 0.5 });
      if (s % 2) this.chords[bar].forEach(m => note(hz(m), t, 0.09, { type: 'square', vol: 0.045, lp: 2400 }));
      const m = this.mel[i];
      if (m) note(hz(m), t, this.spb * 1.6, { type: 'triangle', vol: 0.22 });
      // the hook: a forklift reversing (beep... beep) at the end of every 4 bars
      if ((bar === 3 || bar === 7) && (s === 5 || s === 7)) note(1350, t, 0.12, { type: 'square', vol: 0.06, lp: 3000 });
    },
  };

  // ---------- think: A minor at 128 bpm in sixteenths, building over the bars ----------
  const K = {
    spb: 60 / 128 / 4, len: 128,
    roots: [45, 45, 41, 41, 38, 38, 40, 40],
    arps: [[57, 60, 64, 69], [57, 60, 64, 69], [53, 57, 60, 65], [53, 57, 60, 65], [50, 53, 57, 62], [50, 53, 57, 62], [52, 56, 59, 64], [52, 56, 59, 64]],
    play(i, t, bars) {
      const bar = Math.floor(i / 16), s = i % 16, r = this.roots[bar];
      hat(t, s % 4 === 0 ? 0.07 : 0.035, 0.03); // the clock ticking
      if (s % 2 === 0) note(hz(r - 12), t, this.spb * 1.8, { type: 'sawtooth', vol: 0.28, lp: 500 + 120 * Math.min(bars, 8) });
      if (bars >= 2 && s % 4 === 0) kick(t, 0.35);
      const a = this.arps[bar];
      note(hz(a[[0, 1, 2, 3, 2, 1][s % 6]] + (bars >= 4 ? 12 : 0)), t, this.spb * 0.9, { type: 'triangle', vol: 0.15 });
      if (bars >= 6 && s === 8) note(hz(a[3] + 12), t, this.spb * 6, { type: 'square', vol: 0.04, lp: 2000 });
    },
  };

  const TRACKS = { lobby: L, think: K };
  function tick() {
    if (!current || !ctx) return;
    while (nextAt < ctx.currentTime + 0.25) {
      const tr = TRACKS[current];
      tr.play(step % tr.len, nextAt, Math.floor(step / 16));
      step++; nextAt += tr.spb;
    }
  }
  function fade(to, sec) {
    if (!master) return;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(to, t + sec);
  }
  function play(name) {
    if (!TRACKS[name]) return stop();
    if (current === name) { if (audible()) fade(VOL, 0.4); return; }
    if (!ac()) return;
    current = name; step = 0; nextAt = ctx.currentTime + 0.12; startedAt = Date.now();
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(0, ctx.currentTime);
    if (audible()) fade(VOL, 0.8);
    clearInterval(timer); timer = setInterval(tick, 50);
  }
  function stop(sec = 0.6) {
    current = null;
    if (!ctx) return;
    fade(0, sec);
    const t = timer; setTimeout(() => { if (!current) clearInterval(t); }, sec * 1000 + 100);
  }
  function toggle() {
    on = !on;
    try { localStorage.setItem('mono-music', on ? '1' : '0'); } catch (e) {}
    if (current) fade(audible() ? VOL : 0, 0.3);
    return on;
  }
  // follow the FX mute button
  let lastAudible = audible();
  setInterval(() => {
    const a = audible();
    if (a !== lastAudible && current && master) fade(a ? VOL : 0, 0.3);
    lastAudible = a;
  }, 500);

  // A short forklift reversing beep, used when the token moves one space. Follows the Sound button only.
  function beep() {
    if (!ac() || (window.FX && FX.sound.muted)) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o.frequency.value = 1350;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.12);
  }

  window.MUSIC = { play, stop, toggle, beep, get on() { return on; }, get suspended() { return !ctx || ctx.state !== 'running'; }, get track() { return current; } };
})();
