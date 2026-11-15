// REPLY ALL sound: every note is synthesized in the browser (WebAudio). No audio files, no libraries.
// All motifs are original. Every call is safe to make when audio is unavailable (it just does nothing).
(function () {
  'use strict';
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, master = null, sfxBus = null, musBus = null, nbuf = null, vol = .8;
  var MUS = .42;   // level of the thinking loop next to the effects
  try { var sv = parseFloat(localStorage.getItem('replyall_vol')); if (sv >= 0 && sv <= 1) vol = sv; } catch (e) {}
  var hz = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };

  // ---------- engine ----------
  function bus(level) { var g = ctx.createGain(); g.gain.value = level; g.connect(master); return g; }
  function dropBus(b) { if (!b) return; try { var t = ctx.currentTime; b.gain.cancelScheduledValues(t); b.gain.setTargetAtTime(0, t, .012); setTimeout(function () { try { b.disconnect(); } catch (e) {} }, 250); } catch (e) {} }
  function init() {
    if (ctx || !AC) return ctx;
    ctx = new AC();
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 8; comp.attack.value = .003; comp.release.value = .2;
    master = ctx.createGain(); master.gain.value = vol; master.connect(comp); comp.connect(ctx.destination);
    sfxBus = bus(1);
    nbuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    var d = nbuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }
  // Run fn(startTime) once the context is running. A sound asked for before any click is dropped, not queued (unless wait is set).
  function play(fn, wait) {
    try {
      if (!init()) return;
      var go = function () { try { fn(ctx.currentTime + .03); } catch (e) {} };
      if (ctx.state === 'running') return go();
      var asked = Date.now();
      ctx.resume().then(function () { if (wait || Date.now() - asked < 600) go(); }).catch(function () {});
    } catch (e) {}
  }
  function unlock() { try { if (init() && ctx.state !== 'running') ctx.resume().catch(function () {}); } catch (e) {} }
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, unlock, true); });

  // ---------- voices ----------
  function env(g, t, a, d, v) { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(v, .0002), t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); }
  // o: {a: attack, to: glide target Hz, glide: seconds, det: cents, lp: lowpass Hz}
  function osc(out, type, f, t, d, v, o) {
    o = o || {}; var a = o.a || .005, n = ctx.createOscillator(), g = ctx.createGain(), last = g;
    n.type = type; n.frequency.setValueAtTime(f, t); if (o.to) n.frequency.exponentialRampToValueAtTime(o.to, t + (o.glide || d));
    if (o.det) n.detune.value = o.det;
    env(g, t, a, d, v); n.connect(g);
    if (o.lp) { last = ctx.createBiquadFilter(); last.type = 'lowpass'; last.frequency.value = o.lp; g.connect(last); }
    last.connect(out); n.start(t); n.stop(t + a + d + .05);
  }
  // o: {a: attack, type: filter type, f: filter Hz, to: sweep target Hz, q}
  function nz(out, t, d, v, o) {
    o = o || {}; var a = o.a || .002, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = nbuf; s.loop = true; fl.type = o.type || 'highpass'; fl.frequency.setValueAtTime(o.f || 6000, t); fl.Q.value = o.q || .8;
    if (o.to) fl.frequency.exponentialRampToValueAtTime(o.to, t + a + d);
    env(g, t, a, d, v); s.connect(fl); fl.connect(g); g.connect(out); s.start(t, Math.random()); s.stop(t + a + d + .05);
  }
  function kick(out, t, v) { osc(out, 'sine', 150, t, .26, v, {to: 42, glide: .12, a: .002}); nz(out, t, .02, v * .3, {type: 'lowpass', f: 2500}); }
  function snare(out, t, v) { nz(out, t, .15, v, {f: 1600}); osc(out, 'triangle', 200, t, .09, v * .7, {to: 140, a: .002}); }
  function hat(out, t, v, open) { nz(out, t, open ? .16 : .035, v, {f: 8500}); }
  function crash(out, t, v) { nz(out, t, 1.5, v, {f: 4500}); nz(out, t, .5, v * .6, {type: 'bandpass', f: 9000}); }
  function brass(out, t, d, m, v) { var f = hz(m); osc(out, 'sawtooth', f, t, d, v, {a: .02, det: -9, lp: 2600}); osc(out, 'sawtooth', f, t, d, v, {a: .02, det: 9, lp: 2600}); }
  function stab(out, t, d, ms, v) { ms.forEach(function (m) { brass(out, t, d, m, v); }); }
  function lead(out, t, d, m, v) { var f = hz(m); osc(out, 'square', f, t, d, v * .6, {lp: 3600}); osc(out, 'sawtooth', f, t, d, v, {det: 7, lp: 4200}); osc(out, 'sine', f * 2, t, d * .6, v * .4); }
  function bell(out, t, m, v, d) { var f = hz(m); d = d || .8; osc(out, 'sine', f, t, d, v, {a: .003}); osc(out, 'sine', f * 2, t, d * .6, v * .4, {a: .003}); osc(out, 'sine', f * 3.01, t, d * .3, v * .18, {a: .003}); }
  function bass(out, t, d, m, v) { var f = hz(m); osc(out, 'triangle', f, t, d, v, {lp: 700}); osc(out, 'sine', f, t, d, v * .8); }
  function keys(out, t, d, ms, v) { ms.forEach(function (m) { var f = hz(m); osc(out, 'sine', f, t, d, v, {a: .008}); osc(out, 'triangle', f, t, d * .5, v * .35, {a: .008, det: 6}); }); }
  function block(out, t, f, v) { osc(out, 'sine', f, t, .05, v, {a: .001}); osc(out, 'triangle', f * 1.5, t, .025, v * .4, {a: .001}); }

  // ---------- thinking loop: 8 bars of office bossa with a ticking clock ----------
  var thinkOn = false, timer = null, step = 0, nextT = 0, S16 = 60 / 104 / 4;
  var BARS = [   // bass root, chord, tune (first pass), tune (second pass); tunes are step:note pairs
    [38, [53, 57, 60, 64], {0: 69, 3: 72, 6: 74, 10: 76}, {2: 74, 4: 77, 6: 81, 10: 79, 12: 76}],
    [43, [53, 57, 59, 64], {0: 74, 4: 71, 10: 69}, {0: 74, 6: 71, 8: 74, 12: 76}],
    [34, [53, 57, 62, 65], {0: 69, 3: 72, 6: 74, 10: 77}, {2: 74, 4: 77, 6: 81, 10: 84, 12: 81}],
    [33, [55, 61, 65], {0: 76, 4: 73, 8: 69, 12: 73, 14: 76}, {0: 79, 3: 77, 6: 76, 10: 73, 14: 69}]
  ];
  function thinkStep(n, t) {
    var o = musBus, s = n % 16, bi = (n >> 4) % 4, b = BARS[bi], root = b[0], nextRoot = BARS[(bi + 1) % 4][0], tune = b[n >= 64 ? 3 : 2];
    if (s === 0 || s === 6 || s === 8 || s === 14) kick(o, t, s === 0 ? .5 : .32);
    if (s === 3 || s === 6 || s === 10 || s === 13) nz(o, t, .03, .16, {type: 'bandpass', f: 1800, q: 3});   // rim click
    nz(o, t, .03, s % 2 ? .035 : .07, {f: 9000});                                                             // shaker
    if (s % 4 === 0) block(o, t, s % 8 ? 880 : 1175, .16);                                                    // tick, tock
    var bn = {0: root, 3: root, 6: root + 7, 8: root + 12, 11: root + 7, 14: nextRoot + (nextRoot > root ? -1 : 1)}[s];
    if (bn !== undefined) bass(o, t, s === 0 ? .4 : .22, bn, .42);
    if (s === 3) keys(o, t, .22, b[1], .075); if (s === 10) keys(o, t, .55, b[1], .075); if (bi === 3 && s === 14) keys(o, t, .18, b[1], .06);
    if (tune[s]) bell(o, t, tune[s], .13, .55);
    if (n >= 124) snare(o, t, .08 + (n - 124) * .03);                                                         // turnaround
  }
  function pump() {
    try {
      if (!thinkOn || !musBus) return;
      if (nextT < ctx.currentTime) nextT = ctx.currentTime + .05;   // the tab was asleep: pick up from now, no burst
      while (nextT < ctx.currentTime + 1.2) { thinkStep(step, nextT + (step % 2 ? S16 * .16 : 0)); nextT += S16; step = (step + 1) % 128; }
    } catch (e) {}
  }
  function think(on) {
    on = !!on; if (on === thinkOn) return; thinkOn = on;
    clearInterval(timer); timer = null;
    if (!on) { var b = musBus; musBus = null; dropBus(b); return; }
    play(function (t) { if (!thinkOn || timer) return; musBus = bus(MUS); step = 0; nextT = t + .05; pump(); timer = setInterval(pump, 100); }, true);
  }
  function duck(t, d) { if (!musBus) return; var g = musBus.gain; g.cancelScheduledValues(t); g.setTargetAtTime(MUS * .22, t, .03); g.setTargetAtTime(MUS, t + d, .3); }
  // An effect: duck the loop for d seconds (or stop it when d is 0) and play on the effects bus.
  function fx(d, fn) { if (!d) think(false); play(function (t) { if (d) duck(t, d); fn(t, sfxBus); }); }

  // ---------- theme: two bars and a big finish; the short version is the second bar ----------
  var Q = 60 / 132 / 4;
  var T_LEAD = {0: 72, 2: 72, 3: 74, 5: 77, 8: 81, 11: 79, 12: 77, 14: 74, 16: 77, 18: 77, 19: 79, 21: 81, 24: 84, 26: 81, 28: 79, 30: 81};
  var T_BASS = {0: 41, 3: 41, 6: 41, 8: 38, 11: 38, 14: 38, 16: 34, 19: 34, 22: 34, 24: 36, 27: 36, 28: 36, 30: 40};
  var T_STAB = {0: [65, 69, 72], 3: [65, 69, 72], 8: [62, 65, 69], 11: [62, 65, 69], 16: [58, 62, 65], 19: [58, 62, 65], 24: [60, 64, 67], 27: [60, 64, 67], 30: [60, 64, 70]};
  function theme(short) {
    fx(0, function (t0, o) {
      var from = short ? 16 : 0;
      nz(o, t0, .35, .12, {type: 'bandpass', f: 500, to: 5000, a: .2});
      for (var s = from; s < 32; s++) {
        var t = t0 + (s - from) * Q;
        if (s % 4 === 0) kick(o, t, .7);
        if (s % 8 === 4) snare(o, t, .4);
        if (s >= 28) snare(o, t, .2 + (s - 28) * .08);
        if (s % 2 === 0) hat(o, t, .12, s % 4 === 2);
        if (T_BASS[s]) bass(o, t, .2, T_BASS[s], .5);
        if (T_STAB[s]) stab(o, t, .16, T_STAB[s], .07);
        if (T_LEAD[s]) lead(o, t, s === 8 || s === 24 ? .32 : .18, T_LEAD[s], .16);
      }
      var e = t0 + (32 - from) * Q;
      kick(o, e, .8); crash(o, e, .22); bass(o, e, 1.1, 29, .55); stab(o, e, 1.1, [65, 69, 72, 77], .075); lead(o, e, .9, 89, .14);
      [84, 89, 93, 96].forEach(function (m, i) { bell(o, e + .12 + i * .09, m, .12, .9); });
    });
  }

  // ---------- effects ----------
  var RANK = [88, 86, 84, 81, 79, 76, 74, 72], tock = false;
  var SFX = {
    theme: theme,
    think: think,
    thinking: function () { return thinkOn; },
    stop: function () { think(false); try { if (ctx) { var b = sfxBus; sfxBus = bus(1); dropBus(b); } } catch (e) {} },
    volume: function (v) { if (v === undefined) return vol; vol = Math.max(0, Math.min(1, Number(v) || 0)); try { localStorage.setItem('replyall_vol', vol); } catch (e) {} try { if (master) master.gain.setTargetAtTime(vol, ctx.currentTime, .02); } catch (e) {} return vol; },
    // Answer tile: a two-note ding, higher for better answers (rank 0 is the top answer).
    reveal: function (rank) { fx(.8, function (t, o) { var m = RANK[Math.max(0, Math.min(7, rank === undefined ? 3 : rank))]; bell(o, t, m - 7, .2, .25); bell(o, t + .07, m, .32, 1); nz(o, t + .07, .25, .05, {f: 9000}); }); },
    top: function () { fx(1.8, function (t, o) {
      [72, 76, 79, 84].forEach(function (m, i) { brass(o, t + i * .07, .14, m, .1); bell(o, t + i * .07, m + 12, .14, .5); });
      var e = t + .3; kick(o, e, .7); crash(o, e, .18); stab(o, e, .9, [72, 76, 79, 84], .07);
      [88, 91, 96, 100].forEach(function (m, i) { bell(o, e + i * .08, m, .16, 1.1); }); }); },
    // Strike: a rubber-stamp bonk, then a short sour office buzzer.
    strike: function () { fx(1.1, function (t, o) {
      nz(o, t, .12, .5, {type: 'lowpass', f: 1800}); osc(o, 'sine', 190, t, .32, .8, {to: 55, glide: .14, a: .002});
      [147, 156, 208].forEach(function (f) { osc(o, 'sawtooth', f, t + .13, .55, .13, {a: .01, lp: 1400}); osc(o, 'square', f / 2, t + .13, .55, .06, {a: .01, lp: 900}); }); }); },
    takeover: function () { fx(0, function (t, o) {
      nz(o, t, 1.5, .22, {type: 'bandpass', f: 300, to: 6000, a: 1.3, q: 2});
      osc(o, 'sawtooth', 98, t, .3, .12, {to: 392, glide: 1.5, a: 1.3, lp: 2200}); osc(o, 'sawtooth', 147, t, .3, .1, {to: 554, glide: 1.5, a: 1.3, lp: 2200});
      [0, .42, .78, 1.06, 1.26, 1.4, 1.5].forEach(function (d, i) { kick(o, t + d, .35 + i * .06); });
      var e = t + 1.62; kick(o, e, .9); osc(o, 'sine', 70, e, 1.2, .6, {to: 38}); crash(o, e, .14); stab(o, e, 1, [50, 53, 57, 60], .08); }); },
    stolen: function () { fx(0, function (t, o) {
      [57, 60, 64, 67, 69].forEach(function (m, i) { brass(o, t + i * .08, .12, m, .11); });
      var e = t + .45; kick(o, e, .7); crash(o, e, .18); stab(o, e, .9, [69, 73, 76, 81], .075); coins(o, e + .25); }); },
    kept: function () { fx(0, function (t, o) {
      [0, .22].forEach(function (d) { kick(o, t + d, .7); snare(o, t + d, .25); stab(o, t + d, .16, [67, 71, 74], .09); });
      var e = t + .44; kick(o, e, .8); crash(o, e, .15); stab(o, e, .9, [67, 72, 76, 79], .075); bell(o, e, 91, .2, 1.2); }); },
    award: function () { fx(0, function (t, o) {
      nz(o, t, .04, .3, {type: 'bandpass', f: 2200, q: 2}); nz(o, t + .07, .05, .35, {type: 'bandpass', f: 1400, q: 2}); osc(o, 'sine', 120, t + .07, .12, .4, {to: 70});
      coins(o, t + .16); }); },
    sweep: function () { fx(2.2, function (t, o) {
      [60, 64, 67, 72, 76, 79, 84, 88].forEach(function (m, i) { lead(o, t + i * .06, .12, m, .12); });
      var e = t + .5; kick(o, e, .8); crash(o, e, .22); stab(o, e, 1.1, [72, 76, 79, 84], .075);
      for (var i = 0; i < 12; i++) bell(o, e + .1 + i * .09, 84 + [0, 4, 7, 12, 16][Math.floor(Math.random() * 5)], .1, .6); }); },
    // Clock: tick, tock. Urgent ticks (the last seconds) are doubled and brighter.
    tick: function (urgent) { fx(.15, function (t, o) { tock = !tock; block(o, t, urgent ? 1760 : tock ? 1175 : 880, urgent ? .4 : .25); if (urgent) block(o, t + .11, 1320, .25); }); },
    timeUp: function () { fx(0, function (t, o) {
      [155, 196, 233].forEach(function (f) { osc(o, 'sawtooth', f, t, 1, .14, {to: f * .94, a: .03, lp: 1800}); osc(o, 'sawtooth', f, t, 1, .1, {to: f * .94, a: .03, det: 14, lp: 1800}); });
      kick(o, t, .7); }); },
    win: function () { fx(0, function (t, o) {
      var b = .16;
      [[0, 72], [1, 72], [2, 72], [3, 76], [5, 79], [7, 84]].forEach(function (x) { brass(o, t + x[0] * b, x[0] === 7 ? .5 : .14, x[1], .12); lead(o, t + x[0] * b, .12, x[1] + 12, .07); });
      [0, 1, 2].forEach(function (i) { snare(o, t + i * b, .3); }); kick(o, t + 3 * b, .7); kick(o, t + 5 * b, .7);
      var c1 = t + 7 * b, c2 = t + 11 * b, c3 = t + 15 * b;
      kick(o, c1, .8); crash(o, c1, .16); stab(o, c1, .55, [60, 64, 67, 72], .07);
      kick(o, c2, .8); snare(o, c2, .3); stab(o, c2, .55, [58, 62, 65, 70], .075); brass(o, c2, .5, 82, .1);
      for (var i = 0; i < 4; i++) snare(o, c3 - (4 - i) * .05, .15 + i * .07);
      kick(o, c3, .9); crash(o, c3, .24); bass(o, c3, 1.6, 36, .55); stab(o, c3, 1.6, [60, 64, 67, 72, 76], .07); lead(o, c3, 1.3, 96, .11);
      for (var k = 0; k < 14; k++) bell(o, c3 + .15 + k * .1, 84 + [0, 4, 7, 12, 16][k % 5], .1, .7); }); },
    // Buzz-in: a phone rattling on a desk, then a bright alert.
    buzz: function () { fx(.9, function (t, o) {
      [0, .1].forEach(function (d) { osc(o, 'square', 155, t + d, .07, .22, {lp: 900}); osc(o, 'square', 158, t + d, .07, .18, {lp: 900}); });
      bell(o, t + .2, 81, .3, .3); bell(o, t + .3, 88, .32, .7); osc(o, 'square', hz(88), t + .3, .2, .05, {lp: 4000}); }); },
    whoosh: function () { fx(.6, function (t, o) { nz(o, t, .3, .28, {type: 'bandpass', f: 300, to: 5000, a: .25, q: 1.2}); osc(o, 'sine', 180, t, .3, .1, {to: 720, a: .2}); }); },
    dup: function () { fx(.6, function (t, o) { [0, .17].forEach(function (d) { osc(o, 'square', 196, t + d, .12, .2, {lp: 1200}); osc(o, 'square', 208, t + d, .12, .15, {lp: 1200}); }); }); },
    // Zero points: a small sad slide.
    zero: function () { fx(.9, function (t, o) { [[0, 233], [.22, 220], [.44, 196]].forEach(function (x, i) { osc(o, 'sawtooth', x[1], t + x[0], i === 2 ? .6 : .2, .16, {to: x[1] * (i === 2 ? .8 : .97), a: .02, lp: 1100}); }); }); },
    drum: function () { fx(0, function (t, o) { for (var i = 0; i < 38; i++) snare(o, t + i * .048, .05 + i * .008); osc(o, 'sine', 55, t, 1.8, .25, {a: 1.6}); }); },
    // Office interruptions: one short stinger per gag (see gags.js). Unknown ids play nothing.
    gag: function (id) { var g = GAG[id]; if (g) fx(g[0], g[1]); }
  };
  function errChime(o, t, v) { [[0, 74], [.13, 70], [.26, 63]].forEach(function (x) { bell(o, t + x[0], x[1], v, .35); osc(o, 'square', hz(x[1]), t + x[0], .1, v * .12, {lp: 1800}); }); }
  var GAG = {
    // Shutdown slide, a struggling fan, an error chime when it sticks at 99, then a cheeky startup chord.
    restart: [5, function (t, o) {
      [79, 74, 71, 67].forEach(function (m, i) { bell(o, t + i * .16, m, .2, .6); });
      nz(o, t + .5, 1.7, .05, {type: 'bandpass', f: 300, to: 1400, a: .8, q: 3});
      [.5, 1, 1.5, 1.9].forEach(function (d, i) { block(o, t + d, 700 + i * 90, .12); });
      errChime(o, t + 2.3, .22); errChime(o, t + 3.3, .14);
      var e = t + 4.3; kick(o, e, .6); keys(o, e, 1.4, [60, 67, 72, 76, 79], .11); [84, 88, 91, 96].forEach(function (m, i) { bell(o, e + .08 + i * .09, m, .13, 1); }); }],
    // A falling "bloop", muffled mumbling nobody can hear, and two flat beeps.
    mute: [4, function (t, o) {
      osc(o, 'sine', 620, t, .2, .5, {to: 240, glide: .16}); osc(o, 'triangle', 310, t, .16, .2, {to: 120, glide: .16});
      for (var i = 0; i < 9; i++) osc(o, 'sawtooth', 110 + Math.random() * 70, t + .5 + i * .13, .09, .16, {to: 100 + Math.random() * 60, a: .02, lp: 320});
      [1.9, 2.15].forEach(function (d) { osc(o, 'square', 330, t + d, .12, .14, {lp: 1500}); }); }],
    // Reader beeps for each swipe, a denied buzz every time, and a two-tone alarm underneath.
    badge: [4.6, function (t, o) {
      for (var i = 0; i < 8; i++) osc(o, 'square', i % 2 ? 620 : 830, t + i * .26, .2, .055, {a: .02, lp: 2200});
      [.45, 1.65, 2.85].forEach(function (d) { block(o, t + d, 1760, .3);
        [140, 148].forEach(function (f) { osc(o, 'sawtooth', f, t + d + .14, .4, .16, {a: .01, lp: 1100}); }); osc(o, 'square', 70, t + d + .14, .4, .1, {lp: 600}); }); }],
    // Two reminder dings rushing closer, a crash, glass tinkle, then the stamp.
    conflict: [3.6, function (t, o) {
      [0, .32, .58, .8, .96, 1.08, 1.16].forEach(function (d, i) { bell(o, t + d, i % 2 ? 81 : 76, .16 + i * .02, .22); });
      nz(o, t + .3, .9, .12, {type: 'bandpass', f: 300, to: 3000, a: .85, q: 1.5});
      var e = t + 1.25; kick(o, e, .9); crash(o, e, .28); nz(o, e, .3, .5, {type: 'lowpass', f: 1400}); osc(o, 'sawtooth', 110, e, .4, .2, {to: 45, lp: 900});
      for (var i = 0; i < 9; i++) bell(o, e + .12 + i * .06 + Math.random() * .03, 96 + rndi(12), .07, .25);
      nz(o, e + .65, .12, .5, {type: 'lowpass', f: 1800}); osc(o, 'sine', 190, e + .65, .3, .7, {to: 55, glide: .14, a: .002}); }],
    // New-mail pings, slow at first and then an avalanche climbing in pitch, ending on a thud.
    storm: [4.6, function (t, o) {
      var d = 0, gap = .34;
      for (var i = 0; i < 46 && d < 3.25; i++) { var m = 79 + [0, 4, 7, 12, 16][i % 5] + Math.min(7, Math.floor(i / 9)); bell(o, t + d, m - 5, .09, .12); bell(o, t + d + .05, m, .13, .3); d += gap; gap = Math.max(.045, gap * .86); }
      nz(o, t + 1.2, 2.1, .1, {type: 'bandpass', f: 500, to: 6000, a: 2, q: 1.2});
      var e = t + 3.3; kick(o, e, .9); crash(o, e, .2); nz(o, e, .12, .5, {type: 'lowpass', f: 1800}); osc(o, 'sine', 190, e, .32, .7, {to: 55, glide: .14, a: .002}); }],
    // Slot machine: a rattling spin that slows, two reel clunks, then a deflating "nothing changed".
    reorg: [5.2, function (t, o) {
      stab(o, t, .18, [62, 66, 69], .07); kick(o, t, .6);
      var d = .35, gap = .05, i = 0;
      while (d < 3.5) { block(o, t + d, [1320, 990, 1175, 880][i++ % 4], d < 2.6 ? .16 : .11); d += gap; gap *= d < 1.6 ? 1.01 : 1.07; }
      osc(o, 'sawtooth', 220, t + .35, 2.2, .04, {to: 330, glide: 2.2, a: .2, lp: 1500});
      [2.65, 3.55].forEach(function (x, k) { kick(o, t + x, .7); bell(o, t + x, 72 + k * 7, .25, .5); nz(o, t + x, .06, .3, {type: 'bandpass', f: 1400, q: 2}); });
      [[4, 70, .2], [4.24, 69, .2], [4.48, 68, .2], [4.72, 67, .7]].forEach(function (x, k) { osc(o, 'sawtooth', hz(x[1] - 12), t + x[0], x[2], .17, {to: hz(x[1] - 12) * (k === 3 ? .82 : .98), a: .02, lp: 1100}); }); }],
    // The blandest corporate training jingle possible, a soft pad, and a quiz ding.
    training: [5, function (t, o) {
      [[0, 72], [.3, 76], [.6, 79], [.9, 76], [1.2, 72], [1.5, 76], [1.8, 79]].forEach(function (x) { bell(o, t + x[0], x[1], .14, .4); });
      keys(o, t, 2.2, [48, 55, 60, 64], .07); keys(o, t + 2.2, 2, [53, 57, 60, 65], .07);
      nz(o, t + 1, .9, .06, {type: 'bandpass', f: 400, to: 1200, a: .8, q: 1}); nz(o, t + 2.1, .9, .06, {type: 'bandpass', f: 1200, to: 400, a: .2, q: 1}); nz(o, t + 3.1, .9, .06, {type: 'bandpass', f: 400, to: 1200, a: .8, q: 1});
      bell(o, t + 4.3, 84, .24, .3); bell(o, t + 4.42, 91, .28, .8); }],
    // Call drops, modem-ish warbling while it hunts for a signal, then a happy reconnect.
    wifi: [4.8, function (t, o) {
      [76, 72, 67].forEach(function (m, i) { bell(o, t + i * .13, m, .2, .3); });
      for (var i = 0; i < 26; i++) osc(o, 'square', [1200, 2100, 980, 1650, 2400, 1400][rndi(6)], t + .7 + i * .085, .07, .028, {a: .004, lp: 3000});
      nz(o, t + .7, 2.3, .035, {type: 'bandpass', f: 1800, q: 4});
      osc(o, 'sine', 400, t + 1.2, .5, .08, {to: 1400, glide: .5, a: .3}); osc(o, 'sine', 1400, t + 2.3, .5, .08, {to: 500, glide: .5, a: .3});
      [3.2, 3.5, 3.8].forEach(function (d) { block(o, t + d, 880, .2); });
      [72, 76, 79, 84].forEach(function (m, i) { bell(o, t + 4.5 + i * .09, m, .2, .7); }); }]
  };
  function rndi(n) { return Math.floor(Math.random() * n); }
  function coins(o, t) { [91, 96, 100].forEach(function (m, i) { bell(o, t + i * .06, m, .26, 1); }); nz(o, t, .3, .07, {f: 9500}); bell(o, t + .3, 103, .14, 1.2); }
  window.SFX = SFX;
})();
