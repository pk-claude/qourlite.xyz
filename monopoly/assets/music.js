/* Background music for the presenter screen, synthesized live (no audio files).
     lobby: an original, Home Depot ad-style groove: a syncopated, reggae-tinged rock guitar riff
            over a driving beat, with a power-drill rev as the hook (not the actual Home Depot jingle)
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

  // ---------- shared instruments for the lobby groove ----------
  let shaper = null;
  function guitarBus() {
    if (shaper) return shaper;
    // overdriven electric guitar: soft clipping into a cabinet-like low-pass
    shaper = ctx.createWaveShaper();
    const n = 1024, curve = new Float32Array(n);
    for (let k = 0; k < n; k++) { const x = (k / n) * 2 - 1; curve[k] = Math.tanh(x * 6); }
    shaper.curve = curve; shaper.oversample = '2x';
    const cab = ctx.createBiquadFilter(); cab.type = 'lowpass'; cab.frequency.value = 2600; cab.Q.value = 0.7;
    const out = ctx.createGain(); out.gain.value = 0.16;
    shaper.connect(cab).connect(out).connect(master);
    return shaper;
  }
  function guitar(midis, t, dur, vol = 0.5) {
    const bus = guitarBus();
    midis.forEach(m => {
      [0, 4].forEach(cents => { // two slightly detuned strings per note
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(hz(m), t); o.detune.value = cents;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.05);
      });
    });
  }
  function snare(t, vol = 0.22) {
    hat(t, vol, 0.14);
    if (!noiseBuf) return;
    const s2 = ctx.createBufferSource(); s2.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.8;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol * 1.4, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    s2.connect(f).connect(g).connect(master); s2.start(t); s2.stop(t + 0.2);
    note(190, t, 0.08, { type: 'triangle', vol: vol * 0.9, slide: -60 });
  }
  // a cordless drill revving up and down: the hook at the end of every 4 bars
  function drill(t, dur) {
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(420, t + dur * 0.55); o.frequency.exponentialRampToValueAtTime(140, t + dur);
    f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 1.2;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.1, t + 0.05); g.gain.setValueAtTime(0.1, t + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
  }

  // ---------- lobby: 8 bars at 112 bpm in sixteenths (E, E, A, B / E, E, G-A, B) ----------
  const L = {
    spb: 60 / 112 / 4, len: 128,
    roots: [40, 40, 45, 47, 40, 40, 43, 47],
    // where the guitar hits within each bar of 16: pushed, off-beat stabs give the bounce
    hits: [0, 3, 6, 8, 10, 11, 14],
    play(i, t) {
      const bar = Math.floor(i / 16), s = i % 16;
      let r = this.roots[bar];
      if (bar === 6 && s >= 8) r = 45; // G then A in bar 7
      // drums: kick on 1, the 'and' of 2 and 3; snare with a clap on 2 and 4; driving eighth hats
      if (s === 0 || s === 6 || s === 8) kick(t, 0.55);
      if (s === 4 || s === 12) { snare(t); hat(t + 0.012, 0.08, 0.05); }
      if (s % 2 === 0) hat(t, s % 4 === 2 ? 0.07 : 0.035);
      if (s === 14) hat(t, 0.06, 0.22); // open hat into the next bar
      // bass locks to the kick and walks up to the next chord
      const bass = { 0: r, 3: r, 6: r, 8: r + 7, 10: r + 12, 14: r + 10 }[s];
      if (bass != null) note(hz(bass - 12), t, this.spb * 1.8, { type: 'triangle', vol: 0.55, lp: 900 });
      // guitar: power chords (root, fifth, octave) on the syncopated hits; short and palm-muted except the last
      if (this.hits.includes(s) && !(bar % 4 === 3 && s >= 8)) guitar([r + 12, r + 19, r + 24], t, s === 14 ? this.spb * 3 : this.spb * 1.2);
      // a little lead lick answering the riff in bars 2 and 6
      if (bar % 4 === 1) { const lick = { 8: 76, 9: 79, 10: 81, 12: 79, 13: 76, 14: 74 }[s]; if (lick) note(hz(lick), t, this.spb * 1.5, { type: 'square', vol: 0.05, lp: 2800 }); }
      // the hook: the drill revs over the last half of every 4th bar
      if (bar % 4 === 3 && s === 8) drill(t, this.spb * 8);
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

  // ---------- sound effects (follow the Sound button, not the Music button) ----------
  let sfxOut = null;
  function sfxBus() {
    if (!ac() || (window.FX && FX.sound.muted)) return null;
    if (!sfxOut) { sfxOut = ctx.createGain(); sfxOut.gain.value = 0.9; sfxOut.connect(ctx.destination); }
    if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    return sfxOut;
  }
  function burst(bus, t, { dur = 0.03, vol = 0.3, type = 'bandpass', f = 2500, q = 1.2 } = {}) {
    const n = ctx.createBufferSource(); n.buffer = noiseBuf; n.playbackRate.value = 0.8 + Math.random() * 0.5;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(fl).connect(g).connect(bus); n.start(t, Math.random() * 0.1); n.stop(t + dur + 0.02);
  }
  function tone(bus, freq, t, dur, { type = 'sine', vol = 0.2, attack = 0.004, slide = 0, lp = 0 } = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out = g; if (lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; g.connect(f); out = f; }
    o.connect(g); out.connect(bus); o.start(t); o.stop(t + dur + 0.05);
  }
  // one die hitting the table: a sharp plastic click with a short woody knock under it
  function clack(bus, t, vol) {
    burst(bus, t, { dur: 0.025, vol: vol, f: 3200 + Math.random() * 1500, q: 2 });
    tone(bus, 700 + Math.random() * 500, t, 0.05, { type: 'triangle', vol: vol * 0.5 });
  }
  const sfx = {
    // shaken in a hand, thrown, tumbling, two dice settling
    dice() {
      const bus = sfxBus(); if (!bus) return;
      const t0 = ctx.currentTime;
      for (let i = 0; i < 14; i++) burst(bus, t0 + i * 0.035 + Math.random() * 0.012, { dur: 0.02, vol: 0.12, f: 2200 + Math.random() * 1800, q: 3 });
      let t = t0 + 0.55, gap = 0.07, v = 0.5;
      for (let i = 0; i < 9; i++) { clack(bus, t, v); clack(bus, t + 0.012 + Math.random() * 0.02, v * 0.7); t += gap; gap *= 1.18; v *= 0.86; }
      clack(bus, t + 0.05, 0.22); clack(bus, t + 0.13, 0.16);
    },
    // an electric forklift pulling away, cruising, braking: motor whine plus tyre rumble, hydraulic hiss at the stop
    forklift(sec) {
      const bus = sfxBus(); if (!bus) return;
      const t = ctx.currentTime, end = t + sec;
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = 'sawtooth'; o2.type = 'square';
      o.frequency.setValueAtTime(60, t); o.frequency.exponentialRampToValueAtTime(190, t + 0.5); o.frequency.setValueAtTime(190, end - 0.35); o.frequency.exponentialRampToValueAtTime(70, end);
      o2.frequency.setValueAtTime(121, t); o2.frequency.exponentialRampToValueAtTime(381, t + 0.5); o2.frequency.setValueAtTime(381, end - 0.35); o2.frequency.exponentialRampToValueAtTime(141, end);
      f.type = 'lowpass'; f.frequency.value = 900; f.Q.value = 4;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.25); g.gain.setValueAtTime(0.09, end - 0.3); g.gain.exponentialRampToValueAtTime(0.0001, end + 0.05);
      o.connect(f); o2.connect(f); f.connect(g).connect(bus); o.start(t); o2.start(t); o.stop(end + 0.1); o2.stop(end + 0.1);
      // tyres on the concrete floor: a soft, steady rumble ticking over the board's spaces
      for (let x = t; x < end - 0.1; x += 0.19) burst(bus, x, { dur: 0.06, vol: 0.05, type: 'lowpass', f: 300, q: 0.7 });
      burst(bus, end, { dur: 0.35, vol: 0.08, type: 'highpass', f: 4000, q: 0.5 });
    },
    // two toots of a forklift horn
    horn() {
      const bus = sfxBus(); if (!bus) return;
      const t = ctx.currentTime;
      [0, 0.22].forEach(d => { tone(bus, 415, t + d, 0.16, { type: 'square', vol: 0.09, lp: 1800 }); tone(bus, 523, t + d, 0.16, { type: 'square', vol: 0.06, lp: 1800 }); });
    },
    // a brass fanfare with timpani and a crash on the last chord
    fanfare() {
      const bus = sfxBus(); if (!bus) return;
      const t0 = ctx.currentTime;
      const chords = [[60, 64, 67], [60, 64, 67], [65, 69, 72], [67, 71, 74], [72, 76, 79, 84]];
      const at = [0, 0.18, 0.36, 0.72, 1.08], len = [0.15, 0.15, 0.32, 0.32, 1.9];
      chords.forEach((c, k) => {
        c.forEach(m => [0, 6].forEach(cents => {
          const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(), t = t0 + at[k];
          o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = cents;
          f.type = 'lowpass'; f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(3200, t + 0.06); f.frequency.exponentialRampToValueAtTime(1400, t + len[k]);
          g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.035, t + 0.03); g.gain.setValueAtTime(0.035, t + len[k] * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + len[k]);
          o.connect(f).connect(g).connect(bus); o.start(t); o.stop(t + len[k] + 0.05);
        }));
        tone(bus, k === 4 ? 98 : 131, t0 + at[k], 0.5, { vol: 0.35, slide: -30 });
      });
      for (let i = 0; i < 6; i++) burst(bus, t0 + 1.08 + i * 0.02, { dur: 1.6 - i * 0.2, vol: 0.06, type: 'highpass', f: 5000, q: 0.4 });
    },
    // a cheering crowd: hundreds of claps thinning out, with a rising "whoo"
    applause(sec = 4) {
      const bus = sfxBus(); if (!bus) return;
      const t0 = ctx.currentTime;
      for (let i = 0; i < 260; i++) {
        const x = Math.random() * sec, dens = x < 0.4 ? x / 0.4 : 1 - Math.max(0, (x - sec * 0.6) / (sec * 0.4));
        if (Math.random() > dens) continue;
        burst(bus, t0 + x, { dur: 0.03, vol: 0.07 + Math.random() * 0.05, f: 1200 + Math.random() * 2200, q: 1.5 });
      }
      const n = ctx.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3;
      f.frequency.setValueAtTime(450, t0); f.frequency.exponentialRampToValueAtTime(900, t0 + 0.8); f.frequency.exponentialRampToValueAtTime(600, t0 + 2);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.2);
      n.connect(f).connect(g).connect(bus); n.start(t0); n.stop(t0 + 2.3);
    },
    // coins spilling out of the Community Chest
    coins(sec = 1.4) {
      const bus = sfxBus(); if (!bus) return;
      const t0 = ctx.currentTime;
      for (let i = 0; i < 34; i++) { const t = t0 + Math.pow(Math.random(), 0.7) * sec, f = 2600 + Math.random() * 2600; tone(bus, f, t, 0.18, { vol: 0.05 }); tone(bus, f * 1.5, t + 0.01, 0.12, { vol: 0.025 }); }
    },
  };

  window.MUSIC = { play, stop, toggle, beep, sfx, get on() { return on; }, get suspended() { return !ctx || ctx.state !== 'running'; }, get track() { return current; } };
})();
