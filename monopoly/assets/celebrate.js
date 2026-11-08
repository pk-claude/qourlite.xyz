/* Winner celebrations on the big screen: fireworks, Monopoly money raining down, a sweeping spotlight.
   CELEBRATE.fireworks(seconds), CELEBRATE.money(count), CELEBRATE.spotlight(on). */
(function () {
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let cv = null, cx = null, sparks = [], rockets = [], raf = 0, until = 0;
  const COLORS = ['#f96302', '#ffcf73', '#ffffff', '#c8102e', '#1fb25a', '#2d6aa3', '#fef200'];

  function canvas() {
    if (cv) return;
    cv = document.createElement('canvas');
    cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9998';
    document.body.appendChild(cv); cx = cv.getContext('2d');
  }
  function launch() {
    const W = cv.width, H = cv.height;
    rockets.push({ x: W * (0.15 + Math.random() * 0.7), y: H, vx: (Math.random() - 0.5) * 2, vy: -(H * 0.016 + Math.random() * H * 0.006), c: COLORS[Math.floor(Math.random() * COLORS.length)] });
  }
  function explode(r) {
    const n = 70 + Math.floor(Math.random() * 40), speed = cv.height * (0.004 + Math.random() * 0.003);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, v = speed * (0.6 + Math.random() * 0.6);
      sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 60 + Math.random() * 40, c: Math.random() < 0.8 ? r.c : '#fff' });
    }
  }
  function frame() {
    const W = cv.width, H = cv.height;
    cx.globalCompositeOperation = 'destination-out';
    cx.fillStyle = 'rgba(0,0,0,.22)'; cx.fillRect(0, 0, W, H); // trails fade out
    cx.globalCompositeOperation = 'lighter';
    if (Date.now() < until && Math.random() < 0.08) launch();
    rockets = rockets.filter(r => {
      r.x += r.vx; r.y += r.vy; r.vy += H * 0.00018;
      cx.fillStyle = r.c; cx.fillRect(r.x - 2, r.y - 2, 4, 6);
      if (r.vy > -H * 0.002) { explode(r); return false; }
      return true;
    });
    sparks = sparks.filter(p => {
      p.life++; p.x += p.vx; p.y += p.vy; p.vy += H * 0.00008; p.vx *= 0.985; p.vy *= 0.985;
      cx.globalAlpha = Math.max(0, 1 - p.life / p.max);
      cx.fillStyle = p.c; cx.beginPath(); cx.arc(p.x, p.y, 2.4 * devicePixelRatio, 0, 6.3); cx.fill();
      return p.life < p.max;
    });
    cx.globalAlpha = 1;
    if (rockets.length || sparks.length || Date.now() < until) raf = requestAnimationFrame(frame);
    else { raf = 0; cx.clearRect(0, 0, W, H); }
  }
  function fireworks(sec = 6) {
    if (reduced()) return;
    canvas();
    cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio;
    until = Date.now() + sec * 1000;
    for (let i = 0; i < 3; i++) setTimeout(launch, i * 250);
    if (!raf) raf = requestAnimationFrame(frame);
  }

  // Monopoly bills fluttering down
  const BILLS = [['500', '#f2d27a'], ['100', '#e9d8a6'], ['50', '#b9d7f0'], ['20', '#cfe8c4'], ['10', '#f3c4d2']];
  function money(count = 60) {
    if (reduced()) return;
    for (let i = 0; i < count; i++) {
      const [v, c] = BILLS[i % BILLS.length];
      const b = document.createElement('div');
      b.className = 'bill-fall';
      b.textContent = v;
      b.style.cssText = `left:${Math.random() * 100}%;background:${c};animation-duration:${3 + Math.random() * 2.5}s;animation-delay:${Math.random() * 1.8}s;--sx:${(Math.random() - 0.5) * 240}px;--r:${(Math.random() - 0.5) * 720}deg`;
      document.body.appendChild(b);
      setTimeout(() => b.remove(), 8500);
    }
  }

  // a stage spotlight sweeping in and settling on the winner
  function spotlight(on) {
    let el = document.getElementById('spotlight');
    if (!el) { el = document.createElement('div'); el.id = 'spotlight'; document.body.appendChild(el); }
    el.classList.toggle('on', !!on && !reduced());
  }

  window.CELEBRATE = { fireworks, money, spotlight };
})();
