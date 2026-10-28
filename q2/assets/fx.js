/* Shared effects: synthesized sounds (no audio files), confetti, count-up numbers, QR codes. */
(function () {
  // ---------- Sound ----------
  let ctx = null;
  let muted = false;
  try { muted = localStorage.getItem('ql-muted') === '1'; } catch (e) {}
  const ac = () => {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  ['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, () => ac(), { once: true }));

  function tone(freq, dur, { type = 'sine', vol = 0.18, at = 0, slide = 0, attack = 0.005 } = {}) {
    const a = ac(); if (!a || muted) return;
    const t = a.currentTime + at;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, { vol = 0.2, at = 0, hp = 800, lp = 8000 } = {}) {
    const a = ac(); if (!a || muted) return;
    const t = a.currentTime + at;
    const buf = a.createBuffer(1, Math.max(1, a.sampleRate * dur), a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = a.createBufferSource(); s.buffer = buf;
    const f1 = a.createBiquadFilter(); f1.type = 'highpass'; f1.frequency.value = hp;
    const f2 = a.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = lp;
    const g = a.createGain(); g.gain.value = vol;
    s.connect(f1).connect(f2).connect(g).connect(a.destination); s.start(t);
  }
  const sfx = {
    tick: () => tone(1200, 0.05, { type: 'square', vol: 0.05 }),
    tock: () => tone(800, 0.05, { type: 'square', vol: 0.05 }),
    pop: () => tone(520, 0.12, { type: 'triangle', vol: 0.15, slide: 500 }),
    whoosh: () => noise(0.35, { vol: 0.12, hp: 400, lp: 3000 }),
    ding: () => { tone(880, 0.5, { vol: 0.2 }); tone(1320, 0.6, { vol: 0.12, at: 0.08 }); },
    buzz: () => tone(140, 0.45, { type: 'sawtooth', vol: 0.12 }),
    lock: () => tone(660, 0.08, { type: 'triangle', vol: 0.15 }),
    cash: () => { tone(1500, 0.08, { type: 'square', vol: 0.06 }); tone(2000, 0.3, { type: 'triangle', vol: 0.15, at: 0.08 }); noise(0.15, { vol: 0.08, hp: 3000, at: 0.05 }); },
    bell: () => { [0, 0.35, 0.7].forEach(at => { tone(1046, 0.9, { vol: 0.16, at }); tone(1568, 0.7, { vol: 0.08, at }); }); },
    punch: () => { noise(0.18, { vol: 0.35, hp: 60, lp: 900 }); tone(90, 0.2, { type: 'sine', vol: 0.3, slide: -50 }); },
    fanfare: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, i === 3 ? 0.8 : 0.18, { type: 'triangle', vol: 0.16, at: i * 0.13 })),
    trombone: () => [392, 370, 349, 294].forEach((f, i) => tone(f, i === 3 ? 0.9 : 0.35, { type: 'sawtooth', vol: 0.08, at: i * 0.38, slide: i === 3 ? -40 : 0 })),
    drumroll: (sec = 2) => { for (let t = 0; t < sec; t += 0.045) noise(0.04, { vol: 0.05 + 0.1 * (t / sec), at: t, hp: 200, lp: 2500 }); noise(0.5, { vol: 0.3, at: sec, hp: 100, lp: 6000 }); },
    boing: () => tone(200, 0.4, { type: 'triangle', vol: 0.15, slide: 600 }),
  };
  const sound = {
    play(name, ...args) { if (sfx[name]) sfx[name](...args); },
    get muted() { return muted; },
    toggle() { muted = !muted; try { localStorage.setItem('ql-muted', muted ? '1' : '0'); } catch (e) {} return muted; },
  };

  // ---------- Confetti ----------
  let cv = null, cx = null, parts = [], raf = 0;
  const COLORS = ['#F96302', '#ffffff', '#ffb37a', '#facc15', '#22c55e', '#3b82f6'];
  function confetti({ count = 160, x = 0.5, y = 0.35, spread = 1, colors = COLORS } = {}) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!cv) {
      cv = document.createElement('canvas');
      cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999';
      document.body.appendChild(cv); cx = cv.getContext('2d');
    }
    cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio;
    for (let i = 0; i < count; i++) {
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * spread;
      const v = 8 + Math.random() * 12;
      parts.push({
        x: x * cv.width, y: y * cv.height, vx: Math.cos(ang) * v * devicePixelRatio, vy: Math.sin(ang) * v * devicePixelRatio,
        w: (6 + Math.random() * 8) * devicePixelRatio, h: (4 + Math.random() * 6) * devicePixelRatio,
        r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: colors[i % colors.length], life: 0,
      });
    }
    if (!raf) raf = requestAnimationFrame(step);
  }
  function step() {
    cx.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter(p => p.life < 260 && p.y < cv.height + 40);
    for (const p of parts) {
      p.life++; p.vy += 0.35 * devicePixelRatio; p.vx *= 0.985; p.vy *= 0.985;
      p.x += p.vx; p.y += p.vy; p.r += p.vr;
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c;
      cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.life / 8))); cx.restore();
    }
    raf = parts.length ? requestAnimationFrame(step) : 0;
    if (!raf) cx.clearRect(0, 0, cv.width, cv.height);
  }

  // ---------- Numbers ----------
  function countUp(el, to, { from = 0, dur = 1200, fmt = v => Math.round(v).toLocaleString() } = {}) {
    const t0 = performance.now();
    const ease = t => 1 - Math.pow(1 - t, 3);
    return new Promise(res => {
      (function f(now) {
        const t = Math.min(1, (now - t0) / dur);
        el.textContent = fmt(from + (to - from) * ease(t));
        if (t < 1) requestAnimationFrame(f); else res();
      })(t0);
    });
  }
  const money = (v, d = 0) => '$' + v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

  // ---------- QR ----------
  function qrSVG(text, { dark = '#111214', light = '#ffffff' } = {}) {
    const q = window.qrcode(0, 'M'); q.addData(text); q.make();
    const n = q.getModuleCount(), m = 4, size = n + m * 2;
    let path = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) path += `M${c + m} ${r + m}h1v1h-1z`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="QR code for ${text}"><rect width="${size}" height="${size}" fill="${light}"/><path d="${path}" fill="${dark}"/></svg>`;
  }

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  window.FX = { sound, confetti, countUp, money, qrSVG, esc, sleep };
})();
