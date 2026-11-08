/* The living landscape behind the 2027 film. A canvas scene that grows as the story is told:
   night to sunrise, seeds (one per answer) to flowers, saplings to trees, a path built step by step
   toward the sun, a community building that lights up, and people who arrive, help each other and
   become connected. World.start(canvas, { flowers, people }); World.set({ ...targets }); World.seeds(n); World.stop().
   Targets ease smoothly, so the film only says where the world should be, never how to animate it. */
(function () {
  const PAL = ['#F96303', '#ffb347', '#ff7aa2', '#ffd166', '#c9a7ff', '#ffffff', '#ff9a6b', '#9be7c4'];
  const SKIN = ['#f3c9a0', '#d9a37a', '#b07a52', '#8a5a3c', '#e8b98f', '#6e4630'];
  const SHIRT = ['#F96303', '#2f6bff', '#18b26b', '#9b5cff', '#ff3d7f', '#ffcf3f', '#4fc3f7', '#ff8a65'];
  let cv, cx, W, H, DPR, raf = 0, t0 = 0, last = 0;
  let rnd;
  const T = { dawn: 0, grass: 0, bloom: 0, trees: 0, path: 0, build: 0, people: 0, links: 0, gather: 0, lanterns: 0, dim: 0 };
  const C = { ...T };
  let flowers = [], blades = [], trees = [], people = [], stars = [], seeds = [], lanterns = [], fireflies = [], stones = [];

  const seeded = s => () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = t => t * t * (3 - 2 * t);
  const mix = (c1, c2, t) => {
    const p = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
    const a = p(c1), b = p(c2);
    return '#' + a.map((v, i) => Math.round(lerp(v, b[i], clamp(t))).toString(16).padStart(2, '0')).join('');
  };
  const sky3 = (stops, t) => { // stops: [[t, color]...]
    for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) return mix(stops[i - 1][1], stops[i][1], (t - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]));
    return stops[stops.length - 1][1];
  };

  // Ground geometry, in 0..1 units of the screen.
  const HZ = 0.62; // horizon
  const groundY = x => HZ + 0.02 + 0.03 * Math.sin(x * 5.2 + 1) + 0.015 * Math.sin(x * 13);

  function build(nFlowers, nPeople) {
    rnd = seeded(20271109);
    flowers = Array.from({ length: nFlowers }, (_, i) => {
      const depth = rnd(); // 0 far, 1 near
      const x = 0.04 + rnd() * 0.92;
      return { x, y: lerp(HZ + 0.06, 0.97, depth), depth, at: (i + rnd() * 0.8) / nFlowers, col: PAL[i % PAL.length], col2: PAL[(i + 3) % PAL.length], petals: 5 + (i % 3), sway: rnd() * 6.28 };
    }).sort((a, b) => a.y - b.y);
    blades = Array.from({ length: 420 }, () => { const d = rnd(); return { x: rnd(), y: lerp(HZ + 0.04, 1.0, d), d, h: 0.4 + rnd() * 0.6, ph: rnd() * 6.28 }; }).sort((a, b) => a.y - b.y);
    trees = [[0.09, 0.74, 1.15], [0.22, 0.69, 0.75], [0.8, 0.7, 0.85], [0.93, 0.76, 1.2], [0.35, 0.665, 0.5], [0.67, 0.665, 0.55]].map(([x, y, s], i) => ({ x, y, s, at: i / 6, col: ['#2f8f5b', '#3fa36a', '#4cae74', '#2b7d50'][i % 4] }));
    stars = Array.from({ length: 140 }, () => ({ x: rnd(), y: rnd() * HZ * 0.9, r: 0.4 + rnd() * 1.3, tw: rnd() * 6.28 }));
    stones = Array.from({ length: 16 }, (_, i) => i / 15);
    people = Array.from({ length: nPeople }, (_, i) => {
      const fromLeft = i % 2 === 0;
      const ring = i / nPeople * Math.PI * 2;
      return {
        sx: fromLeft ? -0.05 - rnd() * 0.1 : 1.05 + rnd() * 0.1, sy: lerp(0.8, 0.94, rnd()),
        // first a mingling spot, then a place in the gathering circle around the path
        mx: 0.12 + rnd() * 0.76, my: lerp(0.78, 0.94, rnd()),
        gx: 0.5 + Math.cos(ring) * 0.2, gy: 0.86 + Math.sin(ring) * 0.055,
        at: i / nPeople * 0.85, skin: SKIN[i % SKIN.length], shirt: SHIRT[i % SHIRT.length], h: 0.85 + rnd() * 0.3, ph: rnd() * 6.28, x: 0, y: 0,
      };
    });
    // Friendships: each person links to the two people closest to their mingling spot.
    people.forEach((p, i) => {
      p.links = people.map((q, j) => [Math.hypot(p.mx - q.mx, p.my - q.my), j]).filter(([, j]) => j !== i).sort((a, b) => a[0] - b[0]).slice(0, 2).map(([, j]) => j);
    });
    fireflies = Array.from({ length: 60 }, () => ({ x: rnd(), y: lerp(HZ - 0.1, 0.95, rnd()), ph: rnd() * 6.28, sp: 0.3 + rnd() * 0.7 }));
    lanterns = [];
    seeds = [];
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 1.75);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  // ---------- drawing ----------
  function drawSky(time) {
    const d = C.dawn;
    const top = sky3([[0, '#070b1c'], [0.35, '#1b1a3f'], [0.6, '#3b2a5e'], [0.85, '#5a3a6e'], [1, '#4a4e86']], d);
    const mid = sky3([[0, '#101633'], [0.35, '#4a2b52'], [0.6, '#c2566a'], [0.85, '#f08a5d'], [1, '#f6a96a']], d);
    const low = sky3([[0, '#1a2140'], [0.35, '#8a4256'], [0.6, '#ff8c5a'], [0.85, '#ffc77a'], [1, '#ffe2a0']], d);
    const g = cx.createLinearGradient(0, 0, 0, H * HZ);
    g.addColorStop(0, top); g.addColorStop(0.6, mid); g.addColorStop(1, low);
    cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    // stars fade as the sun comes up
    const sa = clamp(1 - d * 1.6);
    if (sa > 0) { cx.fillStyle = '#fff'; stars.forEach(s => { cx.globalAlpha = sa * (0.5 + 0.5 * Math.sin(time * 1.5 + s.tw)); cx.beginPath(); cx.arc(s.x * W, s.y * H, s.r, 0, 7); cx.fill(); }); cx.globalAlpha = 1; }
    // the sun rises over the end of the path: the future
    const sy = lerp(HZ + 0.12, HZ - 0.2, ease(clamp(d * 1.05))) * H, sx = 0.5 * W, sr = Math.min(W, H) * 0.075;
    const halo = cx.createRadialGradient(sx, sy, sr * 0.3, sx, sy, sr * 6);
    halo.addColorStop(0, `rgba(255,214,140,${0.55 * d})`); halo.addColorStop(0.35, `rgba(255,150,80,${0.22 * d})`); halo.addColorStop(1, 'rgba(255,120,60,0)');
    cx.fillStyle = halo; cx.fillRect(0, 0, W, H * HZ + sr);
    // rays
    if (d > 0.4) {
      cx.save(); cx.translate(sx, sy); cx.rotate(time * 0.02);
      for (let i = 0; i < 14; i++) { cx.rotate(Math.PI / 7); cx.fillStyle = `rgba(255,220,160,${0.05 * (d - 0.4)})`; cx.beginPath(); cx.moveTo(0, 0); cx.lineTo(W, -60); cx.lineTo(W, 60); cx.fill(); }
      cx.restore();
    }
    cx.fillStyle = mix('#ff9a5a', '#fff2c8', d); cx.beginPath(); cx.arc(sx, sy, sr, 0, 7); cx.fill();
  }
  function hill(base, amp, freq, phase, col) {
    cx.fillStyle = col; cx.beginPath(); cx.moveTo(0, H);
    for (let x = 0; x <= W + 10; x += 10) cx.lineTo(x, (base + amp * Math.sin(x / W * freq + phase) + amp * 0.4 * Math.sin(x / W * freq * 2.7 + phase * 2)) * H);
    cx.lineTo(W, H); cx.fill();
  }
  function drawLand(time) {
    const d = C.dawn;
    hill(HZ - 0.04, 0.03, 5, 0.5, sky3([[0, '#141a33'], [0.5, '#5b3b5e'], [1, '#c98a7a']], d));
    hill(HZ - 0.01, 0.025, 7, 2.1, sky3([[0, '#10162a'], [0.5, '#46334f'], [1, '#a07a6a']], d));
    // the plot: from bare earth to green meadow
    const gr = C.grass;
    cx.fillStyle = mix(mix('#1c1712', '#4a3a2a', d), mix('#2f6b3f', '#6fbf6a', d), gr);
    cx.beginPath(); cx.moveTo(0, H);
    for (let x = 0; x <= W + 10; x += 10) cx.lineTo(x, groundY(x / W) * H);
    cx.lineTo(W, H); cx.fill();
    const sh = cx.createLinearGradient(0, HZ * H, 0, H); sh.addColorStop(0, 'rgba(255,200,120,0.12)'); sh.addColorStop(1, 'rgba(0,0,0,0.35)');
    cx.fillStyle = sh; cx.fillRect(0, HZ * H, W, H);
  }
  // The path: built stone by stone toward the sun.
  function drawPath() {
    const n = Math.floor(C.path * stones.length + 0.0001);
    if (C.path <= 0.001) return;
    const pt = s => { const y = lerp(0.99, HZ + 0.035, s); const x = 0.5 + 0.12 * Math.sin(s * 5) * (1 - s); return [x * W, y * H, lerp(1, 0.15, s)]; };
    cx.strokeStyle = `rgba(255,230,190,${0.25 * C.path})`; cx.lineWidth = 2; cx.beginPath();
    for (let s = 0; s <= C.path; s += 0.01) { const [x, y] = pt(s); s === 0 ? cx.moveTo(x, y) : cx.lineTo(x, y); }
    cx.stroke();
    for (let i = 0; i < n; i++) {
      const [x, y, k] = pt(stones[i]);
      cx.fillStyle = mix('#d9c3a3', '#fff1d6', C.dawn); cx.beginPath(); cx.ellipse(x, y, 34 * k, 10 * k, 0, 0, 7); cx.fill();
      cx.fillStyle = 'rgba(0,0,0,.18)'; cx.beginPath(); cx.ellipse(x, y + 4 * k, 34 * k, 6 * k, 0, 0, 7); cx.fill();
    }
  }
  // The community building: raised wall by wall, then the lights come on.
  function drawBuilding(time) {
    const b = C.build; if (b <= 0.001) return;
    const x = 0.66 * W, base = (HZ + 0.045) * H, w = Math.min(W * 0.12, 220), h = w * 0.55;
    const up = ease(clamp(b * 1.6));
    cx.save(); cx.beginPath(); cx.rect(x - 10, base - h * up - w * 0.3, w + 20, h * up + w * 0.3 + 2); cx.clip();
    cx.fillStyle = mix('#5b4a5e', '#e9dccb', C.dawn); cx.fillRect(x, base - h, w, h);
    cx.fillStyle = mix('#7a3a20', '#F96303', C.dawn); cx.beginPath(); cx.moveTo(x - 8, base - h); cx.lineTo(x + w / 2, base - h - w * 0.22); cx.lineTo(x + w + 8, base - h); cx.fill();
    cx.restore();
    const lit = clamp((b - 0.55) / 0.45);
    for (let i = 0; i < 4; i++) {
      const on = clamp(lit * 4 - i);
      cx.fillStyle = on > 0 ? `rgba(255,210,120,${0.4 + 0.6 * on})` : 'rgba(40,40,60,.6)';
      cx.fillRect(x + w * (0.1 + i * 0.22), base - h * 0.75, w * 0.14, h * 0.25);
      if (on > 0.5) { const g = cx.createRadialGradient(x + w * (0.17 + i * 0.22), base - h * 0.62, 2, x + w * (0.17 + i * 0.22), base - h * 0.62, w * 0.25); g.addColorStop(0, `rgba(255,200,110,${0.25 * on})`); g.addColorStop(1, 'rgba(255,200,110,0)'); cx.fillStyle = g; cx.fillRect(x - w * 0.2, base - h * 1.3, w * 1.4, h * 1.4); }
    }
    cx.fillStyle = mix('#3a2a2a', '#8a4a2a', C.dawn); cx.fillRect(x + w * 0.44, base - h * 0.42, w * 0.12, h * 0.42);
  }
  function drawTree(tr, time) {
    const g = ease(clamp((C.trees - tr.at * 0.6) / 0.4)); if (g <= 0) return;
    const x = tr.x * W, y = tr.y * H, s = tr.s * Math.min(W, H) * 0.22 * g;
    const sway = Math.sin(time * 0.6 + tr.x * 9) * 0.03;
    cx.save(); cx.translate(x, y); cx.rotate(sway);
    cx.fillStyle = mix('#3a2a20', '#6b4a32', C.dawn); cx.fillRect(-s * 0.05, -s * 0.55, s * 0.1, s * 0.55);
    const leaf = mix(mix('#173a2a', tr.col, C.dawn), '#7fd18b', C.dawn * 0.25);
    [[0, -0.75, 0.32], [-0.2, -0.6, 0.24], [0.2, -0.6, 0.24], [0, -0.95, 0.22]].forEach(([dx, dy, r]) => { cx.fillStyle = leaf; cx.beginPath(); cx.arc(dx * s, dy * s, r * s, 0, 7); cx.fill(); });
    // blossoms on the trees once spring arrives
    if (C.bloom > 0.5) { const n = Math.floor((C.bloom - 0.5) * 24); for (let i = 0; i < n; i++) { const a = i * 2.4, rr = (0.12 + (i % 5) * 0.04) * s; cx.fillStyle = PAL[(i + 2) % PAL.length]; cx.beginPath(); cx.arc(Math.cos(a) * rr, -0.75 * s + Math.sin(a) * rr, 2.6 * tr.s, 0, 7); cx.fill(); } }
    cx.restore();
  }
  function drawGrass(time) {
    if (C.grass <= 0.01) return;
    cx.lineCap = 'round';
    blades.forEach(b => {
      const gy = Math.max(b.y, groundY(b.x) + 0.004);
      const k = lerp(0.35, 1.1, b.d), h = 16 * k * b.h * C.grass, x = b.x * W, y = gy * H;
      const sw = Math.sin(time * 1.4 + b.ph + b.x * 6) * 3 * k;
      cx.strokeStyle = mix(mix('#24402c', '#3d7a3f', C.dawn), mix('#5fae5a', '#9ad46c', C.dawn), b.d * 0.6);
      cx.lineWidth = 1.4 * k; cx.beginPath(); cx.moveTo(x, y); cx.quadraticCurveTo(x + sw * 0.3, y - h * 0.6, x + sw, y - h); cx.stroke();
    });
  }
  function drawFlower(f, time) {
    const local = clamp((C.bloom * 1.25 - f.at * 0.95) / 0.3); if (local <= 0) return;
    const k = lerp(0.6, 1.7, f.depth) * Math.min(W, H) / 800, x = f.x * W, y = Math.max(f.y, groundY(f.x) + 0.01) * H;
    const stem = ease(clamp(local * 2)) * 34 * k, open = ease(clamp(local * 2 - 0.8));
    const sw = Math.sin(time * 1.2 + f.sway) * 4 * k;
    cx.strokeStyle = '#3f8a46'; cx.lineWidth = 2 * k; cx.beginPath(); cx.moveTo(x, y); cx.quadraticCurveTo(x + sw * 0.4, y - stem * 0.6, x + sw, y - stem); cx.stroke();
    if (stem > 10 * k) { cx.fillStyle = '#4c9a4f'; cx.beginPath(); cx.ellipse(x + sw * 0.3 + 5 * k, y - stem * 0.45, 6 * k, 2.5 * k, -0.6, 0, 7); cx.fill(); }
    const hx = x + sw, hy = y - stem, r = 9 * k * open;
    if (open <= 0) { cx.fillStyle = '#5aa35a'; cx.beginPath(); cx.arc(hx, hy, 3 * k, 0, 7); cx.fill(); return; }
    for (let p = 0; p < f.petals; p++) {
      const a = p / f.petals * 6.283 + time * 0.08 + f.sway;
      cx.fillStyle = f.col; cx.beginPath(); cx.ellipse(hx + Math.cos(a) * r * 0.75, hy + Math.sin(a) * r * 0.75, r * 0.7, r * 0.38, a, 0, 7); cx.fill();
    }
    cx.fillStyle = f.col2 === '#ffffff' ? '#ffd166' : f.col2; cx.beginPath(); cx.arc(hx, hy, r * 0.38, 0, 7); cx.fill();
    // a soft glow when it first opens
    if (open < 1) { cx.fillStyle = `rgba(255,240,200,${0.5 * (1 - open)})`; cx.beginPath(); cx.arc(hx, hy, r * 2.2, 0, 7); cx.fill(); }
  }
  function personPos(p, time, i) {
    const arrive = ease(clamp((C.people - p.at) / 0.18));
    let x = lerp(p.sx, p.mx, arrive), y = lerp(p.sy, p.my, arrive);
    const gth = ease(C.gather);
    x = lerp(x, p.gx, gth); y = lerp(y, p.gy, gth);
    p.x = x; p.y = y; p.on = arrive > 0.02; p.walking = (arrive > 0 && arrive < 1) || (gth > 0 && gth < 1);
    return arrive;
  }
  function drawPerson(p, time) {
    if (!p.on) return;
    const k = lerp(0.75, 1.3, (p.y - 0.75) / 0.2) * p.h * Math.min(W, H) / 640;
    const x = p.x * W, y = p.y * H, bob = p.walking ? Math.abs(Math.sin(time * 6 + p.ph)) * 3 * k : Math.sin(time * 1.5 + p.ph) * 0.8 * k;
    cx.fillStyle = 'rgba(0,0,0,.22)'; cx.beginPath(); cx.ellipse(x, y + 2, 13 * k, 4 * k, 0, 0, 7); cx.fill();
    cx.fillStyle = p.shirt; cx.beginPath(); cx.moveTo(x - 10 * k, y - bob); cx.quadraticCurveTo(x - 11 * k, y - 34 * k - bob, x, y - 36 * k - bob); cx.quadraticCurveTo(x + 11 * k, y - 34 * k - bob, x + 10 * k, y - bob); cx.fill();
    cx.fillStyle = p.skin; cx.beginPath(); cx.arc(x, y - 44 * k - bob, 8.5 * k, 0, 7); cx.fill();
  }
  // Friendships: warm threads of light between people who found each other.
  function drawLinks(time) {
    if (C.links <= 0.01) return;
    cx.lineCap = 'round';
    people.forEach((p, i) => p.links.forEach((j, n) => {
      const q = people[j]; if (!p.on || !q.on || j < i && q.links.includes(i)) return;
      const grow = clamp(C.links * 2.2 - ((i * 7 + n * 3) % 11) / 11); if (grow <= 0) return;
      const x1 = p.x * W, y1 = (p.y - 0.035) * H, x2 = q.x * W, y2 = (q.y - 0.035) * H;
      const mx = (x1 + x2) / 2, my = Math.min(y1, y2) - 40 - 20 * Math.sin(time + i);
      const ex = lerp(x1, x2, grow), ey = lerp(y1, y2, grow);
      cx.strokeStyle = `rgba(255,214,140,${0.35 + 0.25 * Math.sin(time * 2 + i)})`; cx.lineWidth = 2.2;
      cx.shadowColor = 'rgba(255,190,90,.9)'; cx.shadowBlur = 12;
      cx.beginPath(); cx.moveTo(x1, y1); cx.quadraticCurveTo(lerp(x1, mx, grow), lerp(y1, my, grow), ex, ey); cx.stroke();
      cx.shadowBlur = 0;
      // a little spark travels along each finished thread
      if (grow >= 1) { const s = (time * 0.35 + i * 0.13) % 1; const bx = (1 - s) * (1 - s) * x1 + 2 * (1 - s) * s * mx + s * s * x2, by = (1 - s) * (1 - s) * y1 + 2 * (1 - s) * s * my + s * s * y2; cx.fillStyle = '#fff3d0'; cx.beginPath(); cx.arc(bx, by, 2.4, 0, 7); cx.fill(); }
    }));
  }
  function drawSeeds(dt) {
    seeds = seeds.filter(s => s.y < s.ty);
    seeds.forEach(s => {
      s.vy += 0.00018 * dt; s.y += s.vy * dt / 16; s.x += Math.sin(s.y * 30 + s.ph) * 0.0006;
      cx.fillStyle = '#ffe2a8'; cx.shadowColor = '#ffcf7a'; cx.shadowBlur = 10; cx.beginPath(); cx.arc(s.x * W, s.y * H, 3, 0, 7); cx.fill(); cx.shadowBlur = 0;
      if (s.y >= s.ty) bursts.push({ x: s.x, y: s.ty, t: 0 });
    });
  }
  let bursts = [];
  function drawBursts(dt) {
    bursts = bursts.filter(b => (b.t += dt) < 900);
    bursts.forEach(b => { const k = b.t / 900; cx.strokeStyle = `rgba(160,240,150,${1 - k})`; cx.lineWidth = 2; cx.beginPath(); cx.arc(b.x * W, b.y * H, 4 + k * 26, 0, 7); cx.stroke(); });
  }
  function drawAir(time, dt) {
    // fireflies in the meadow
    const ff = clamp(C.bloom * 1.5 - 0.3) * (1 - C.dawn * 0.5);
    if (ff > 0) fireflies.forEach(f => { const a = ff * (0.5 + 0.5 * Math.sin(time * 2 * f.sp + f.ph)); cx.fillStyle = `rgba(255,236,150,${a})`; cx.shadowColor = '#ffe08a'; cx.shadowBlur = 8; cx.beginPath(); cx.arc((f.x + Math.sin(time * 0.3 * f.sp + f.ph) * 0.02) * W, (f.y + Math.cos(time * 0.4 * f.sp + f.ph) * 0.015) * H, 2, 0, 7); cx.fill(); });
    cx.shadowBlur = 0;
    // lanterns released by the group, drifting up toward the sun
    if (C.lanterns > 0.01 && Math.random() < C.lanterns * dt / 140 && lanterns.length < 70) {
      const p = people[Math.floor(Math.random() * people.length)];
      lanterns.push({ x: p ? p.x : Math.random(), y: p ? p.y - 0.06 : 0.9, vy: 0.00006 + Math.random() * 0.00006, ph: Math.random() * 6, c: PAL[Math.floor(Math.random() * 4)] });
    }
    lanterns = lanterns.filter(l => l.y > -0.05);
    lanterns.forEach(l => {
      l.y -= l.vy * dt; l.x += Math.sin(time * 0.6 + l.ph) * 0.00025 * dt / 16;
      const x = l.x * W, y = l.y * H, a = clamp(l.y / 0.3);
      const g = cx.createRadialGradient(x, y, 1, x, y, 26); g.addColorStop(0, `rgba(255,220,140,${0.55 * a})`); g.addColorStop(1, 'rgba(255,180,90,0)');
      cx.fillStyle = g; cx.fillRect(x - 26, y - 26, 52, 52);
      cx.fillStyle = l.c; cx.globalAlpha = a; cx.beginPath(); cx.roundRect(x - 5, y - 7, 10, 13, 3); cx.fill(); cx.globalAlpha = 1;
    });
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(64, now - (last || now)); last = now;
    const time = (now - t0) / 1000;
    for (const k in T) C[k] += (T[k] - C[k]) * (1 - Math.pow(0.5, dt / (k === 'dawn' ? 2400 : k === 'gather' ? 2600 : 1500)));
    cx.clearRect(0, 0, W, H);
    drawSky(time); drawLand(time); drawBuilding(time); drawPath();
    // draw everything on the ground back to front
    const items = [...trees.map(t => [t.y, () => drawTree(t, time)]), ...flowers.map(f => [f.y, () => drawFlower(f, time)])];
    people.forEach((p, i) => { personPos(p, time, i); items.push([p.y, () => drawPerson(p, time)]); });
    drawGrass(time);
    items.sort((a, b) => a[0] - b[0]).forEach(([, fn]) => fn());
    drawLinks(time); drawSeeds(dt); drawBursts(dt); drawAir(time, dt);
    if (C.dim > 0.01) { cx.fillStyle = `rgba(5,6,10,${C.dim})`; cx.fillRect(0, 0, W, H); }
  }

  window.World = {
    start(canvas, { flowers: nf = 24, people: np = 12 } = {}) {
      cv = canvas; cx = cv.getContext('2d');
      build(Math.max(44, Math.min(90, nf * 2)), Math.max(10, Math.min(28, np)));
      Object.keys(T).forEach(k => (T[k] = C[k] = 0));
      resize(); addEventListener('resize', resize);
      t0 = performance.now(); last = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    },
    set(o) { Object.assign(T, o); },
    // Answers fall as seeds into the ground, where the flowers will grow.
    seeds(n) { flowers.slice(0, n).forEach((f, i) => setTimeout(() => seeds.push({ x: f.x, y: -0.02 - Math.random() * 0.1, vy: 0, ty: Math.max(f.y, groundY(f.x) + 0.01), ph: Math.random() * 6 }), i * 90)); },
    stop() { cancelAnimationFrame(raf); raf = 0; removeEventListener('resize', resize); },
  };
})();
