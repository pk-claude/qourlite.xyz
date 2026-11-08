/* The living landscape behind the 2027 film. It starts small and keeps growing:
   one seedling and one person in the dark, close up; then growth spreads outward from that spot
   while the camera pulls back: a garden, a meadow with trees and a path to the sun, a building
   that lights up, people who arrive and connect, and finally a whole valley of distribution
   centres lighting up and joining one network as lanterns rise.
   World.start(canvas, { flowers, people }); World.set({ ...targets }); World.seeds(n); World.stop().
   Targets ease smoothly: the film says where the world should be, never how to animate it. */
(function () {
  const PAL = ['#F96303', '#ffb347', '#ff7aa2', '#ffd166', '#c9a7ff', '#ffffff', '#ff9a6b', '#9be7c4'];
  const SKIN = ['#f3c9a0', '#d9a37a', '#b07a52', '#8a5a3c', '#e8b98f', '#6e4630'];
  const SHIRT = ['#F96303', '#2f6bff', '#18b26b', '#9b5cff', '#ff3d7f', '#ffcf3f', '#4fc3f7', '#ff8a65'];
  const FX = 0.5, FY = 0.86; // the first seed: everything grows out from here, and the camera centres on it
  const HZ = 0.62;           // horizon
  let cv, cx, W, H, DPR, raf = 0, t0 = 0, last = 0, rnd;
  const T = { zoom: 3.2, dawn: 0, grass: 0, bloom: 0, trees: 0, path: 0, build: 0, people: 0, links: 0, gather: 0, network: 0, lanterns: 0, dim: 0 };
  const C = { ...T };
  let flowers = [], blades = [], trees = [], people = [], stars = [], seeds = [], lanterns = [], fireflies = [], stones = [], dcs = [], birds = [], bursts = [];

  const seeded = s => () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = t => t * t * (3 - 2 * t);
  const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const mix = (c1, c2, t) => { const a = hex(c1), b = hex(c2); return '#' + a.map((v, i) => Math.round(lerp(v, b[i], clamp(t))).toString(16).padStart(2, '0')).join(''); };
  const sky3 = (stops, t) => { for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) return mix(stops[i - 1][1], stops[i][1], (t - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0])); return stops[stops.length - 1][1]; };
  const groundY = x => HZ + 0.02 + 0.03 * Math.sin(x * 5.2 + 1) + 0.015 * Math.sin(x * 13);
  // distance from the first seed, stretched so the meadow spreads wide rather than deep
  const ring = (x, y) => Math.hypot((x - FX) * 0.9, (y - FY) * 2.4);
  // how far growth has spread for a given 0..1 progress value
  const reach = v => v * 1.35;

  function build(nFlowers, nPeople) {
    rnd = seeded(20271109);
    flowers = Array.from({ length: nFlowers }, (_, i) => {
      const depth = rnd(), x = i === 0 ? FX : -0.6 + rnd() * 2.2;
      const y = i === 0 ? FY + 0.02 : lerp(HZ + 0.06, 0.98, depth);
      return { x, y, depth: i === 0 ? 0.8 : depth, col: PAL[i % PAL.length], col2: PAL[(i + 3) % PAL.length], petals: 5 + (i % 3), sway: rnd() * 6.28 };
    }).map(f => ({ ...f, r: ring(f.x, f.y) })).sort((a, b) => a.y - b.y);
    blades = Array.from({ length: 900 }, () => { const d = rnd(), x = -0.7 + rnd() * 2.4, y = lerp(HZ + 0.04, 1.0, d); return { x, y, d, h: 0.4 + rnd() * 0.6, ph: rnd() * 6.28, r: ring(x, y) }; }).sort((a, b) => a.y - b.y);
    trees = [[0.36, 0.8, 0.6], [0.64, 0.79, 0.65], [0.2, 0.74, 0.9], [0.82, 0.75, 1.0], [0.08, 0.77, 1.2], [0.93, 0.78, 1.15], [-0.15, 0.72, 1.1], [1.15, 0.72, 1.0], [-0.4, 0.7, 0.9], [1.4, 0.71, 0.95], [0.3, 0.67, 0.45], [0.72, 0.67, 0.5]]
      .map(([x, y, s], i) => ({ x, y, s, r: ring(x, y), col: ['#2f8f5b', '#3fa36a', '#4cae74', '#2b7d50'][i % 4] }));
    stars = Array.from({ length: 160 }, () => ({ x: rnd(), y: rnd() * HZ * 0.9, r: 0.4 + rnd() * 1.3, tw: rnd() * 6.28 }));
    stones = Array.from({ length: 18 }, (_, i) => i / 17);
    people = Array.from({ length: nPeople }, (_, i) => {
      const a = i / nPeople * Math.PI * 2;
      // the first person tends the first seed; the rest arrive from further and further away
      const spread = i === 0 ? 0 : 0.12 + 0.55 * (i / nPeople);
      const mx = i === 0 ? FX - 0.05 : FX + Math.cos(a * 2.3) * spread, my = i === 0 ? FY + 0.03 : clamp(FY + Math.sin(a * 1.7) * 0.06 + (rnd() - 0.5) * 0.05, 0.76, 0.96);
      return {
        sx: mx + (mx < FX ? -0.5 : 0.5), sy: my, mx, my, r: i === 0 ? 0 : ring(mx, my),
        gx: FX + Math.cos(a) * 0.22, gy: FY + Math.sin(a) * 0.06,
        skin: SKIN[i % SKIN.length], shirt: SHIRT[i % SHIRT.length], h: 0.85 + rnd() * 0.3, ph: rnd() * 6.28, x: 0, y: 0,
      };
    });
    people.forEach((p, i) => { p.links = people.map((q, j) => [Math.hypot(p.mx - q.mx, (p.my - q.my) * 2), j]).filter(([, j]) => j !== i).sort((a, b) => a[0] - b[0]).slice(0, 2).map(([, j]) => j); });
    // the wider network: distribution centres across the valley, joined by roads to the centre
    dcs = [-0.55, -0.3, -0.08, 0.16, 0.84, 1.08, 1.3, 1.55].map((x, i) => ({ x, y: groundY(x) + 0.004 + (i % 2) * 0.008, s: 0.6 + rnd() * 0.5, at: Math.abs(x - 0.5) }));
    dcs.sort((a, b) => a.at - b.at);
    fireflies = Array.from({ length: 90 }, () => ({ x: -0.4 + rnd() * 1.8, y: lerp(HZ - 0.1, 0.95, rnd()), ph: rnd() * 6.28, sp: 0.3 + rnd() * 0.7 }));
    birds = Array.from({ length: 9 }, (_, i) => ({ dx: (i % 3) * 0.025 + Math.floor(i / 3) * 0.012, dy: Math.floor(i / 3) * 0.018 + (i % 3) * 0.01, ph: rnd() * 6 }));
    lanterns = []; seeds = []; bursts = [];
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 1.75);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * DPR; cv.height = H * DPR;
  }
  const base = () => cx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const cam = () => { const z = C.zoom; cx.setTransform(DPR * z, 0, 0, DPR * z, DPR * (FX * W * (1 - z)), DPR * (FY * H * (1 - z))); };
  // the visible ground range at the current zoom, in world units
  const view = () => { const z = C.zoom; return [FX - FX / z - 0.05, FX + (1 - FX) / z + 0.05]; };

  // ---------- sky (not zoomed: the sky is always the whole sky) ----------
  function drawSky(time) {
    const d = C.dawn;
    const g = cx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, sky3([[0, '#070b1c'], [0.35, '#1b1a3f'], [0.6, '#3b2a5e'], [0.85, '#5a3a6e'], [1, '#4a5a96']], d));
    g.addColorStop(0.45, sky3([[0, '#101633'], [0.35, '#4a2b52'], [0.6, '#c2566a'], [0.85, '#f08a5d'], [1, '#f6a96a']], d));
    g.addColorStop(0.75, sky3([[0, '#1a2140'], [0.35, '#8a4256'], [0.6, '#ff8c5a'], [0.85, '#ffc77a'], [1, '#ffe2a0']], d));
    cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    const sa = clamp(1 - d * 1.6);
    if (sa > 0) { cx.fillStyle = '#fff'; stars.forEach(s => { cx.globalAlpha = sa * (0.5 + 0.5 * Math.sin(time * 1.5 + s.tw)); cx.beginPath(); cx.arc(s.x * W, s.y * H, s.r, 0, 7); cx.fill(); }); cx.globalAlpha = 1; }
  }
  function drawSun(time) {
    const d = C.dawn, z = C.zoom;
    const hz = FY * H + (HZ - FY) * H * z; // where the horizon sits on screen at this zoom
    const sy = hz + lerp(0.1, -0.24, ease(clamp(d * 1.05))) * H, sx = FX * W, sr = Math.min(W, H) * 0.075;
    const halo = cx.createRadialGradient(sx, sy, sr * 0.3, sx, sy, sr * 6);
    halo.addColorStop(0, `rgba(255,214,140,${0.55 * d})`); halo.addColorStop(0.35, `rgba(255,150,80,${0.22 * d})`); halo.addColorStop(1, 'rgba(255,120,60,0)');
    cx.fillStyle = halo; cx.fillRect(0, 0, W, H);
    if (d > 0.4) {
      cx.save(); cx.translate(sx, sy); cx.rotate(time * 0.02);
      for (let i = 0; i < 14; i++) { cx.rotate(Math.PI / 7); cx.fillStyle = `rgba(255,220,160,${0.05 * (d - 0.4)})`; cx.beginPath(); cx.moveTo(0, 0); cx.lineTo(W * 1.5, -70); cx.lineTo(W * 1.5, 70); cx.fill(); }
      cx.restore();
    }
    cx.fillStyle = mix('#ff9a5a', '#fff2c8', d); cx.beginPath(); cx.arc(sx, sy, sr, 0, 7); cx.fill();
  }
  // a flock crossing the sky once the day has come: the team heading somewhere together
  function drawBirds(time) {
    if (C.dawn < 0.65) return;
    const a = clamp((C.dawn - 0.65) / 0.2), p = (time * 0.025) % 1.4 - 0.2;
    cx.strokeStyle = `rgba(60,40,60,${0.6 * a})`; cx.lineWidth = 2; cx.lineCap = 'round';
    birds.forEach(b => {
      const x = (p + b.dx) * W, y = (0.2 + b.dy + 0.02 * Math.sin(time + b.ph)) * H, f = Math.sin(time * 7 + b.ph) * 5;
      cx.beginPath(); cx.moveTo(x - 9, y - f); cx.quadraticCurveTo(x - 4, y - 3, x, y); cx.quadraticCurveTo(x + 4, y - 3, x + 9, y - f); cx.stroke();
    });
  }

  // ---------- the land (zoomed: the camera pulls back as the world grows) ----------
  function drawLand() {
    const d = C.dawn, [x0, x1] = view(), step = 0.01;
    const hill = (b, amp, freq, ph, col) => {
      cx.fillStyle = col; cx.beginPath(); cx.moveTo(x0 * W, 2 * H);
      for (let x = x0; x <= x1; x += step) cx.lineTo(x * W, (b + amp * Math.sin(x * freq + ph) + amp * 0.4 * Math.sin(x * freq * 2.7 + ph * 2)) * H);
      cx.lineTo(x1 * W, 2 * H); cx.fill();
    };
    hill(HZ - 0.05, 0.035, 5, 0.5, sky3([[0, '#141a33'], [0.5, '#5b3b5e'], [1, '#c98a7a']], d));
    hill(HZ - 0.015, 0.025, 7, 2.1, sky3([[0, '#10162a'], [0.5, '#46334f'], [1, '#a07a6a']], d));
    // bare earth everywhere...
    cx.fillStyle = mix('#1c1712', '#5a4632', d); cx.beginPath(); cx.moveTo(x0 * W, 2 * H);
    for (let x = x0; x <= x1; x += step) cx.lineTo(x * W, groundY(x) * H);
    cx.lineTo(x1 * W, 2 * H); cx.fill();
    // ...and a meadow spreading out from the first seed
    const R = reach(C.grass);
    if (R > 0.005) {
      cx.save();
      cx.beginPath(); cx.moveTo(x0 * W, 2 * H); for (let x = x0; x <= x1; x += step) cx.lineTo(x * W, groundY(x) * H); cx.lineTo(x1 * W, 2 * H); cx.clip();
      cx.translate(FX * W, FY * H); cx.scale(1 / 0.9, 1 / 2.4);
      const g = cx.createRadialGradient(0, 0, 0, 0, 0, R * W);
      const green = mix(mix('#24402c', '#3d7a3f', d), mix('#4f9a4c', '#86c96a', d), 0.6);
      g.addColorStop(0, green); g.addColorStop(0.82, green); g.addColorStop(1, 'rgba(0,0,0,0)');
      cx.fillStyle = g; cx.beginPath(); cx.arc(0, 0, R * W, 0, 7); cx.fill();
      cx.restore();
    }
    const sh = cx.createLinearGradient(0, HZ * H, 0, 1.4 * H); sh.addColorStop(0, 'rgba(255,200,120,0.10)'); sh.addColorStop(1, 'rgba(0,0,0,0.4)');
    cx.fillStyle = sh; cx.fillRect(x0 * W, HZ * H, (x1 - x0) * W, H);
  }
  // The wider network: distribution centres across the valley light up and join by roads.
  function drawNetwork(time) {
    const n = C.network; if (n <= 0.01) return;
    const hub = [0.66 * W + Math.min(W * 0.12, 220) / 2, (HZ + 0.045) * H];
    dcs.forEach((dc, i) => {
      const on = clamp(n * dcs.length * 1.2 - i), x = dc.x * W, y = dc.y * H, w = 120 * dc.s, h = 38 * dc.s;
      if (on <= 0) return;
      // road from the hub, drawn out toward each building
      const mx = (hub[0] + x) / 2, my = Math.max(hub[1], y) + 18;
      cx.strokeStyle = `rgba(255,226,170,${0.6 * on})`; cx.lineWidth = 5; cx.setLineDash([]);
      cx.beginPath(); cx.moveTo(hub[0], hub[1]);
      const steps = 30, k = Math.floor(steps * on);
      for (let s = 1; s <= k; s++) { const t = s / steps; cx.lineTo((1 - t) * (1 - t) * hub[0] + 2 * (1 - t) * t * mx + t * t * x, (1 - t) * (1 - t) * hub[1] + 2 * (1 - t) * t * my + t * t * y); }
      cx.stroke();
      if (on >= 1) { const t = (time * 0.3 + i * 0.17) % 1; cx.fillStyle = '#fff3d0'; cx.beginPath(); cx.arc((1 - t) * (1 - t) * hub[0] + 2 * (1 - t) * t * mx + t * t * x, (1 - t) * (1 - t) * hub[1] + 2 * (1 - t) * t * my + t * t * y, 3, 0, 7); cx.fill(); }
      cx.globalAlpha = on;
      cx.fillStyle = mix('#5b4a5e', '#e9dccb', C.dawn); cx.fillRect(x - w / 2, y - h, w, h);
      cx.fillStyle = mix('#7a3a20', '#F96303', C.dawn); cx.fillRect(x - w / 2 - 3, y - h - 4, w + 6, 5);
      for (let j = 0; j < 4; j++) { cx.fillStyle = `rgba(255,210,120,${0.5 + 0.5 * on})`; cx.fillRect(x - w / 2 + 6 + j * (w - 12) / 4, y - h * 0.65, (w - 12) / 6, h * 0.3); }
      const g = cx.createRadialGradient(x, y - h / 2, 2, x, y - h / 2, w); g.addColorStop(0, `rgba(255,200,110,${0.25 * on})`); g.addColorStop(1, 'rgba(255,200,110,0)'); cx.fillStyle = g; cx.fillRect(x - w, y - h * 2, w * 2, h * 3);
      cx.globalAlpha = 1;
    });
  }
  function drawPath() {
    if (C.path <= 0.001) return;
    const n = Math.floor(C.path * stones.length + 0.0001);
    const pt = s => { const y = lerp(FY + 0.06, HZ + 0.035, s); const x = FX + 0.1 * Math.sin(s * 5) * (1 - s); return [x * W, y * H, lerp(1, 0.18, s)]; };
    cx.strokeStyle = `rgba(255,230,190,${0.25 * C.path})`; cx.lineWidth = 2; cx.beginPath();
    for (let s = 0; s <= C.path; s += 0.01) { const [x, y] = pt(s); s === 0 ? cx.moveTo(x, y) : cx.lineTo(x, y); }
    cx.stroke();
    for (let i = 0; i < n; i++) {
      const [x, y, k] = pt(stones[i]);
      cx.fillStyle = mix('#d9c3a3', '#fff1d6', C.dawn); cx.beginPath(); cx.ellipse(x, y, 30 * k, 9 * k, 0, 0, 7); cx.fill();
      cx.fillStyle = 'rgba(0,0,0,.18)'; cx.beginPath(); cx.ellipse(x, y + 4 * k, 30 * k, 5 * k, 0, 0, 7); cx.fill();
    }
  }
  function drawBuilding() {
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
    const g = ease(clamp((reach(C.trees) - tr.r) / 0.25)); if (g <= 0) return;
    const x = tr.x * W, y = tr.y * H, s = tr.s * Math.min(W, H) * 0.22 * g;
    cx.save(); cx.translate(x, y); cx.rotate(Math.sin(time * 0.6 + tr.x * 9) * 0.03);
    cx.fillStyle = mix('#3a2a20', '#6b4a32', C.dawn); cx.fillRect(-s * 0.05, -s * 0.55, s * 0.1, s * 0.55);
    const leaf = mix(mix('#173a2a', tr.col, C.dawn), '#7fd18b', C.dawn * 0.25);
    [[0, -0.75, 0.32], [-0.2, -0.6, 0.24], [0.2, -0.6, 0.24], [0, -0.95, 0.22]].forEach(([dx, dy, r]) => { cx.fillStyle = leaf; cx.beginPath(); cx.arc(dx * s, dy * s, r * s, 0, 7); cx.fill(); });
    const bl = clamp((reach(C.bloom) - tr.r) / 0.4);
    if (bl > 0) { const n = Math.floor(bl * 22); for (let i = 0; i < n; i++) { const a = i * 2.4, rr = (0.12 + (i % 5) * 0.04) * s; cx.fillStyle = PAL[(i + 2) % PAL.length]; cx.beginPath(); cx.arc(Math.cos(a) * rr, -0.75 * s + Math.sin(a) * rr, 2.6 * tr.s, 0, 7); cx.fill(); } }
    cx.restore();
  }
  function drawGrass(time) {
    const R = reach(C.grass); if (R <= 0.01) return;
    const [x0, x1] = view();
    cx.lineCap = 'round';
    blades.forEach(b => {
      if (b.x < x0 || b.x > x1) return;
      const g = clamp((R - b.r) / 0.12); if (g <= 0) return;
      const gy = Math.max(b.y, groundY(b.x) + 0.004);
      const k = lerp(0.35, 1.1, b.d), h = 16 * k * b.h * g, x = b.x * W, y = gy * H;
      const sw = Math.sin(time * 1.4 + b.ph + b.x * 6) * 3 * k;
      cx.strokeStyle = mix(mix('#24402c', '#3d7a3f', C.dawn), mix('#5fae5a', '#9ad46c', C.dawn), b.d * 0.6);
      cx.lineWidth = 1.4 * k; cx.beginPath(); cx.moveTo(x, y); cx.quadraticCurveTo(x + sw * 0.3, y - h * 0.6, x + sw, y - h); cx.stroke();
    });
  }
  function drawFlower(f, time) {
    const local = clamp((reach(C.bloom) - f.r) / 0.18); if (local <= 0) return;
    const k = lerp(0.6, 1.7, f.depth) * Math.min(W, H) / 800, x = f.x * W, y = Math.max(f.y, groundY(f.x) + 0.01) * H;
    const stem = ease(clamp(local * 2)) * 34 * k, open = ease(clamp(local * 2 - 0.8));
    const sw = Math.sin(time * 1.2 + f.sway) * 4 * k;
    cx.strokeStyle = '#3f8a46'; cx.lineWidth = 2 * k; cx.beginPath(); cx.moveTo(x, y); cx.quadraticCurveTo(x + sw * 0.4, y - stem * 0.6, x + sw, y - stem); cx.stroke();
    if (stem > 10 * k) { cx.fillStyle = '#4c9a4f'; cx.beginPath(); cx.ellipse(x + sw * 0.3 + 5 * k, y - stem * 0.45, 6 * k, 2.5 * k, -0.6, 0, 7); cx.fill(); }
    const hx = x + sw, hy = y - stem, r = 9 * k * open;
    if (open <= 0) { cx.fillStyle = '#5aa35a'; cx.beginPath(); cx.arc(hx, hy, 3 * k, 0, 7); cx.fill(); return; }
    for (let p = 0; p < f.petals; p++) { const a = p / f.petals * 6.283 + time * 0.08 + f.sway; cx.fillStyle = f.col; cx.beginPath(); cx.ellipse(hx + Math.cos(a) * r * 0.75, hy + Math.sin(a) * r * 0.75, r * 0.7, r * 0.38, a, 0, 7); cx.fill(); }
    cx.fillStyle = f.col2 === '#ffffff' ? '#ffd166' : f.col2; cx.beginPath(); cx.arc(hx, hy, r * 0.38, 0, 7); cx.fill();
    if (open < 1) { cx.fillStyle = `rgba(255,240,200,${0.5 * (1 - open)})`; cx.beginPath(); cx.arc(hx, hy, r * 2.2, 0, 7); cx.fill(); }
  }
  function personPos(p) {
    const arrive = p.r === 0 ? ease(clamp(C.people * 20)) : ease(clamp((reach(C.people) - p.r) / 0.25));
    let x = lerp(p.sx, p.mx, arrive), y = lerp(p.sy, p.my, arrive);
    const gth = ease(C.gather);
    x = lerp(x, p.gx, gth); y = lerp(y, p.gy, gth);
    p.x = x; p.y = y; p.on = arrive > 0.02; p.walking = (arrive > 0 && arrive < 1) || (gth > 0 && gth < 1);
  }
  function drawPerson(p, time) {
    if (!p.on) return;
    const k = lerp(0.75, 1.3, (p.y - 0.75) / 0.2) * p.h * Math.min(W, H) / 640;
    const x = p.x * W, y = p.y * H, bob = p.walking ? Math.abs(Math.sin(time * 6 + p.ph)) * 3 * k : Math.sin(time * 1.5 + p.ph) * 0.8 * k;
    cx.fillStyle = 'rgba(0,0,0,.22)'; cx.beginPath(); cx.ellipse(x, y + 2, 13 * k, 4 * k, 0, 0, 7); cx.fill();
    cx.fillStyle = p.shirt; cx.beginPath(); cx.moveTo(x - 10 * k, y - bob); cx.quadraticCurveTo(x - 11 * k, y - 34 * k - bob, x, y - 36 * k - bob); cx.quadraticCurveTo(x + 11 * k, y - 34 * k - bob, x + 10 * k, y - bob); cx.fill();
    cx.fillStyle = p.skin; cx.beginPath(); cx.arc(x, y - 44 * k - bob, 8.5 * k, 0, 7); cx.fill();
  }
  function drawLinks(time) {
    if (C.links <= 0.01) return;
    cx.lineCap = 'round';
    people.forEach((p, i) => p.links.forEach((j, n) => {
      const q = people[j]; if (!p.on || !q.on || (j < i && q.links.includes(i))) return;
      const grow = clamp(C.links * 2.2 - ((i * 7 + n * 3) % 11) / 11); if (grow <= 0) return;
      const x1 = p.x * W, y1 = (p.y - 0.035) * H, x2 = q.x * W, y2 = (q.y - 0.035) * H;
      const mx = (x1 + x2) / 2, my = Math.min(y1, y2) - 40 - 20 * Math.sin(time + i);
      cx.strokeStyle = `rgba(255,214,140,${0.35 + 0.25 * Math.sin(time * 2 + i)})`; cx.lineWidth = 2.2;
      cx.shadowColor = 'rgba(255,190,90,.9)'; cx.shadowBlur = 12;
      cx.beginPath(); cx.moveTo(x1, y1); cx.quadraticCurveTo(lerp(x1, mx, grow), lerp(y1, my, grow), lerp(x1, x2, grow), lerp(y1, y2, grow)); cx.stroke();
      cx.shadowBlur = 0;
      if (grow >= 1) { const s = (time * 0.35 + i * 0.13) % 1; cx.fillStyle = '#fff3d0'; cx.beginPath(); cx.arc((1 - s) * (1 - s) * x1 + 2 * (1 - s) * s * mx + s * s * x2, (1 - s) * (1 - s) * y1 + 2 * (1 - s) * s * my + s * s * y2, 2.4, 0, 7); cx.fill(); }
    }));
  }
  function drawSeeds(dt) {
    seeds = seeds.filter(s => s.y < s.ty);
    seeds.forEach(s => {
      s.vy += 0.00018 * dt; s.y += s.vy * dt / 16; s.x += Math.sin(s.y * 30 + s.ph) * 0.0006;
      cx.fillStyle = '#ffe2a8'; cx.shadowColor = '#ffcf7a'; cx.shadowBlur = 10; cx.beginPath(); cx.arc(s.x * W, s.y * H, 3, 0, 7); cx.fill(); cx.shadowBlur = 0;
      if (s.y >= s.ty) bursts.push({ x: s.x, y: s.ty, t: 0 });
    });
    bursts = bursts.filter(b => (b.t += dt) < 900);
    bursts.forEach(b => { const k = b.t / 900; cx.strokeStyle = `rgba(160,240,150,${1 - k})`; cx.lineWidth = 2; cx.beginPath(); cx.arc(b.x * W, b.y * H, 4 + k * 26, 0, 7); cx.stroke(); });
  }
  function drawAir(time, dt) {
    const ff = clamp(reach(C.bloom) - 0.25) * (1 - C.dawn * 0.5);
    if (ff > 0) { fireflies.forEach(f => { if (ring(f.x, f.y) > reach(C.grass)) return; const a = ff * (0.5 + 0.5 * Math.sin(time * 2 * f.sp + f.ph)); cx.fillStyle = `rgba(255,236,150,${a})`; cx.shadowColor = '#ffe08a'; cx.shadowBlur = 8; cx.beginPath(); cx.arc((f.x + Math.sin(time * 0.3 * f.sp + f.ph) * 0.02) * W, (f.y + Math.cos(time * 0.4 * f.sp + f.ph) * 0.015) * H, 2, 0, 7); cx.fill(); }); cx.shadowBlur = 0; }
    if (C.lanterns > 0.01 && Math.random() < C.lanterns * dt / 120 && lanterns.length < 90) {
      const src = Math.random() < 0.7 ? people[Math.floor(Math.random() * people.length)] : null;
      const dc = !src && C.network > 0.5 ? dcs[Math.floor(Math.random() * dcs.length)] : null;
      lanterns.push({ x: src ? src.x : dc ? dc.x : FX, y: src ? src.y - 0.06 : dc ? dc.y - 0.03 : FY, vy: 0.00006 + Math.random() * 0.00006, ph: Math.random() * 6, c: PAL[Math.floor(Math.random() * 4)] });
    }
    lanterns = lanterns.filter(l => l.y > HZ - 1.2);
    lanterns.forEach(l => {
      l.y -= l.vy * dt; l.x += Math.sin(time * 0.6 + l.ph) * 0.00025 * dt / 16;
      const x = l.x * W, y = l.y * H, a = clamp((l.y - (HZ - 1.2)) / 0.4);
      const g = cx.createRadialGradient(x, y, 1, x, y, 26); g.addColorStop(0, `rgba(255,220,140,${0.55 * a})`); g.addColorStop(1, 'rgba(255,180,90,0)');
      cx.fillStyle = g; cx.fillRect(x - 26, y - 26, 52, 52);
      cx.fillStyle = l.c; cx.globalAlpha = a; cx.beginPath(); cx.roundRect(x - 5, y - 7, 10, 13, 3); cx.fill(); cx.globalAlpha = 1;
    });
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(64, now - (last || now)); last = now;
    const time = (now - t0) / 1000;
    for (const k in T) C[k] += (T[k] - C[k]) * (1 - Math.pow(0.5, dt / (k === 'zoom' ? 3200 : k === 'dawn' ? 2400 : k === 'gather' ? 2600 : 1600)));
    base(); cx.clearRect(0, 0, W, H);
    drawSky(time); drawSun(time); drawBirds(time);
    cam();
    drawLand(); drawNetwork(time); drawBuilding(); drawPath();
    const items = [...trees.map(t => [t.y, () => drawTree(t, time)]), ...flowers.map(f => [f.y, () => drawFlower(f, time)])];
    people.forEach(p => { personPos(p); items.push([p.y, () => drawPerson(p, time)]); });
    drawGrass(time);
    items.sort((a, b) => a[0] - b[0]).forEach(([, fn]) => fn());
    drawLinks(time); drawSeeds(dt); drawAir(time, dt);
    base();
    if (C.dim > 0.01) { cx.fillStyle = `rgba(5,6,10,${C.dim})`; cx.fillRect(0, 0, W, H); }
  }

  window.World = {
    start(canvas, { flowers: nf = 24, people: np = 12 } = {}) {
      cv = canvas; cx = cv.getContext('2d');
      build(Math.max(70, Math.min(140, nf * 3)), Math.max(12, Math.min(32, np)));
      Object.keys(T).forEach(k => (T[k] = C[k] = k === 'zoom' ? 3.2 : 0));
      resize(); addEventListener('resize', resize);
      t0 = performance.now(); last = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    },
    set(o) { Object.assign(T, o); },
    // Answers fall as seeds into the ground nearest the first seed, where growth starts.
    seeds(n) { flowers.slice().sort((a, b) => a.r - b.r).slice(0, Math.max(6, Math.min(n, 30))).forEach((f, i) => setTimeout(() => seeds.push({ x: f.x, y: f.y - 0.45 - Math.random() * 0.1, vy: 0, ty: Math.max(f.y, groundY(f.x) + 0.01), ph: Math.random() * 6 }), i * 110)); },
    stop() { cancelAnimationFrame(raf); raf = 0; removeEventListener('resize', resize); },
  };
})();
