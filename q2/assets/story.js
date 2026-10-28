/* "The Kingdom of Q2": a short, narrated storybook built from the room's one-word answers.
   Runs entirely in the browser (no AI call, works offline). Story.play({ words, storytellers }). */
(function () {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const FALLBACK = ['sticky', 'pricey', 'stuck', 'hooray', 'accurate'];
  const INK = '#3b2a20';

  // ---------- scenes (inline SVG, 800 x 420) ----------
  const sky = (a, b) => `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="800" height="420" fill="url(#sky)"/>`;
  const hills = (c1 = '#9bd27a', c2 = '#7cc061') => `<path d="M0 330 Q200 270 400 320 T800 300 V420 H0Z" fill="${c1}"/><path d="M0 360 Q250 320 500 365 T800 350 V420 H0Z" fill="${c2}"/>`;
  const house = (x, y, c, s = 1, extra = '') => `<g transform="translate(${x} ${y}) scale(${s})" stroke="${INK}" stroke-width="4" stroke-linejoin="round">
    <rect x="-40" y="-50" width="80" height="60" rx="6" fill="${c}"/><path d="M-50 -48 L0 -92 L50 -48Z" fill="#e2553b"/>
    <rect x="-28" y="-36" width="18" height="16" rx="3" fill="#fff6c9"/><rect x="10" y="-36" width="18" height="16" rx="3" fill="#fff6c9"/>
    <path d="M-12 -2 q12 10 24 0" fill="none"/><rect x="-9" y="-12" width="18" height="22" rx="3" fill="#8a5a3c"/>${extra}</g>`;
  const bubble = (x, y, word, d) => `<g transform="translate(${x} ${y})"><g class="pop" style="animation-delay:${d}s"><path d="M-62 -26 h124 a14 14 0 0 1 14 14 v20 a14 14 0 0 1 -14 14 h-96 l-14 14 v-14 h-14 a14 14 0 0 1 -14 -14 v-20 a14 14 0 0 1 14 -14z" fill="#fff" stroke="${INK}" stroke-width="3.5"/><text y="9" text-anchor="middle" class="sv-w">${esc(word)}!</text></g></g>`;
  const coin = (x, y, d = 0, cls = '') => `<g transform="translate(${x} ${y})"><g class="${cls}" style="animation-delay:${d}s"><circle r="15" fill="#f8c537" stroke="${INK}" stroke-width="3.5"/><text y="6" text-anchor="middle" font-size="16" font-weight="900" fill="${INK}">$</text></g></g>`;
  const lock = (x, y) => `<g transform="translate(${x} ${y})" stroke="${INK}" stroke-width="3.5"><path d="M-9 -4 v-8 a9 9 0 0 1 18 0 v8" fill="none"/><rect x="-13" y="-5" width="26" height="20" rx="4" fill="#f8c537"/></g>`;
  const bucket = (cls = '') => `<g class="${cls}" stroke="${INK}" stroke-width="5" stroke-linejoin="round">
    <path d="M-62 -52 Q-120 0 -96 70 L-50 40Z" fill="#e2453b" class="cape"/>
    <path d="M-55 -60 L55 -60 L42 70 L-42 70Z" fill="#F96302"/><ellipse cx="0" cy="-60" rx="55" ry="12" fill="#ff8a3d"/>
    <path d="M-50 -62 Q0 -140 50 -62" fill="none"/>
    <circle cx="-18" cy="-8" r="9" fill="#fff"/><circle cx="18" cy="-8" r="9" fill="#fff"/><circle cx="-16" cy="-6" r="4" fill="${INK}" stroke="none"/><circle cx="20" cy="-6" r="4" fill="${INK}" stroke="none"/>
    <path d="M-20 18 Q0 38 20 18" fill="none"/><text x="0" y="56" text-anchor="middle" font-size="18" font-weight="900" fill="#fff" stroke="none">HD</text></g>`;
  const worker = (x, y, d) => `<g transform="translate(${x} ${y})"><g stroke="${INK}" stroke-width="4" stroke-linecap="round" class="bob" style="animation-delay:${d}s">
    <line x1="0" y1="0" x2="0" y2="38"/><line x1="0" y1="38" x2="-12" y2="62"/><line x1="0" y1="38" x2="12" y2="62"/><line x1="0" y1="14" x2="-16" y2="28"/><line x1="0" y1="14" x2="18" y2="22"/>
    <rect x="16" y="12" width="16" height="22" rx="2" fill="#fff"/><circle cx="0" cy="-14" r="14" fill="#ffd9b0"/><path d="M-16 -18 a16 13 0 0 1 32 0z" fill="#F96302"/></g></g>`;
  const SCENES = [
    // 0 cover: castle and word balloons
    (W) => `${sky('#ffe7c2', '#ffd1a6')}<circle cx="660" cy="90" r="46" fill="#fff3b0"/>${hills()}
      <g stroke="${INK}" stroke-width="5" stroke-linejoin="round" transform="translate(400 300)">
        <rect x="-110" y="-120" width="220" height="130" fill="#F96302"/><rect x="-150" y="-170" width="60" height="180" fill="#ff8a3d"/><rect x="90" y="-170" width="60" height="180" fill="#ff8a3d"/>
        <path d="M-150 -170 l30 -50 l30 50z M90 -170 l30 -50 l30 50z" fill="#e2553b"/><rect x="-30" y="-60" width="60" height="70" rx="30" fill="#8a5a3c"/>
        <path d="M-120 -220 v-40 l30 10 l-30 10" fill="#fff"/><path d="M120 -220 v-40 l30 10 l-30 10" fill="#fff"/>
        <rect x="-80" y="-100" width="26" height="30" rx="8" fill="#fff6c9"/><rect x="54" y="-100" width="26" height="30" rx="8" fill="#fff6c9"/></g>
      ${W.slice(0, 5).map((w, i) => `<g transform="translate(${90 + i * 150} ${120 + (i % 2) * 40})"><g class="float" style="animation-delay:${i * 0.6}s"><line x1="0" y1="34" x2="0" y2="110" stroke="${INK}" stroke-width="2"/><ellipse rx="${Math.max(44, w.w.length * 9)}" ry="34" fill="${['#ff9ecf', '#8fd3ff', '#ffe066', '#b9f18c', '#d4b3ff'][i]}" stroke="${INK}" stroke-width="3.5"/><text y="7" text-anchor="middle" class="sv-w">${esc(w.w)}</text></g></g>`).join('')}`,
    // 1 town: every house says the top word
    (W) => `${sky('#cdeeff', '#e9f8ff')}<circle cx="110" cy="80" r="40" fill="#fff3b0"/>${hills('#a7dd86', '#88c96c')}
      ${house(130, 330, '#ffd166')}${house(310, 345, '#8fd3ff', 1.1)}${house(500, 330, '#ff9ecf')}${house(680, 345, '#b9f18c', 1.1)}
      ${bubble(150, 170, W[0].w, 0.3)}${bubble(330, 120, W[0].w, 0.9)}${bubble(520, 170, W[0].w, 1.5)}${bubble(690, 120, W[0].w, 2.1)}`,
    // 2 the Fed owl pushes rates up
    (W) => `${sky('#e5f3ff', '#fdf6e3')}${hills()}
      <g stroke="${INK}" stroke-width="5" stroke-linejoin="round"><rect x="150" y="160" width="50" height="200" rx="10" fill="#8a5a3c"/><circle cx="175" cy="140" r="110" fill="#7cc061"/><circle cx="110" cy="110" r="50" fill="#8fd16f"/><circle cx="250" cy="120" r="55" fill="#8fd16f"/>
        <rect x="120" y="190" width="120" height="16" rx="8" fill="#a26c4a"/>
        <g transform="translate(180 150)"><ellipse rx="48" ry="56" fill="#b07a4f"/><ellipse cy="16" rx="30" ry="34" fill="#f3dfc0"/><path d="M-40 -46 l12 22 M40 -46 l-12 22" />
          <g class="blink"><circle cx="-18" cy="-14" r="16" fill="#fff"/><circle cx="18" cy="-14" r="16" fill="#fff"/><circle cx="-16" cy="-12" r="7" fill="${INK}" stroke="none"/><circle cx="20" cy="-12" r="7" fill="${INK}" stroke="none"/></g>
          <circle cx="-18" cy="-14" r="19" fill="none" stroke-width="3"/><circle cx="18" cy="-14" r="19" fill="none" stroke-width="3"/><path d="M-6 -6 l6 12 l6 -12z" fill="#F96302"/></g></g>
      <g class="rise" transform="translate(560 320)"><path d="M-40 0 h80 v-150 h40 l-80 -90 l-80 90 h40z" fill="#ef4444" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><text y="-80" text-anchor="middle" font-size="44" font-weight="900" fill="#fff">%</text></g>
      <text x="560" y="380" text-anchor="middle" class="sv-lab">INTEREST RATES</text>${bubble(330, 90, W[1].w, 0.6)}`,
    // 3 the mortgage dragon
    () => `${sky('#e9e1ff', '#fdf6e3')}${hills('#b7d98e', '#9cc874')}
      ${house(560, 330, '#ffd166', 0.8, lock(0, -2))}${house(660, 345, '#8fd3ff', 0.85, lock(0, -2))}${house(745, 330, '#ff9ecf', 0.75, lock(0, -2))}
      <g transform="translate(250 300)"><g stroke="${INK}" stroke-width="5" stroke-linejoin="round" class="breathe">
        <path d="M120 10 q80 0 90 -40 q-30 20 -60 10" fill="#8e6bd6"/><ellipse rx="150" ry="70" fill="#a98ae8"/><path d="M-60 -60 l20 -50 l25 45 M0 -68 l20 -50 l22 48" fill="#8e6bd6"/>
        <ellipse cx="-170" cy="-10" rx="62" ry="46" fill="#a98ae8"/><path d="M-200 -22 q10 8 20 0 M-160 -24 q10 8 20 0" fill="none"/><circle cx="-215" cy="8" r="5" fill="${INK}"/><path d="M-150 22 q-20 10 -45 2" fill="none"/></g></g>
      <g class="zzz"><text x="80" y="160" class="sv-z">z</text><text x="105" y="130" class="sv-z" style="animation-delay:.6s">Z</text><text x="135" y="95" class="sv-z" style="animation-delay:1.2s">Z</text></g>
      <g transform="translate(330 360)">${[[-40, 0], [-10, 0], [20, 0], [50, 0], [-25, -24], [5, -24], [35, -24], [-10, -48], [20, -48]].map(([x, y]) => coin(x, y)).join('')}</g>
      <g transform="translate(345 268)"><rect x="-44" y="-20" width="88" height="34" rx="8" fill="#fff" stroke="${INK}" stroke-width="3.5"/><text y="6" text-anchor="middle" font-size="22" font-weight="900" fill="${INK}">7.4%</text></g>`,
    // 4 Little Bucket saves the day
    (W) => `${sky('#fff1d6', '#ffe0b8')}<g opacity=".9"><circle cx="400" cy="210" r="180" fill="#ffd27a" class="glow"/></g>${hills('#ffcf8a', '#f7b866')}
      <g transform="translate(400 250)"><g class="hop">${bucket()}</g></g>
      ${[120, 210, 590, 690, 300, 510].map((x, i) => coin(x, -30, i * 0.45, 'fall')).join('')}
      <g transform="translate(650 160)"><g class="hop2"><rect x="-80" y="-34" width="160" height="62" rx="12" fill="#fff" stroke="${INK}" stroke-width="5"/><text y="10" text-anchor="middle" font-size="34" font-weight="900" fill="#F96302">$47.9B</text></g></g>
      ${[130, 200, 270].map((x, i) => `<g transform="translate(${x} 360)"><g class="bob" style="animation-delay:${i * 0.3}s" stroke="${INK}" stroke-width="4"><circle r="20" fill="${['#8fd3ff', '#ff9ecf', '#b9f18c'][i]}"/><path d="M-8 4 q8 8 16 0" fill="none"/><line x1="-26" y1="-10" x2="-38" y2="-34"/><line x1="26" y1="-10" x2="38" y2="-34"/></g></g>`).join('')}
      ${bubble(200, 230, W[3].w, 1.2)}`,
    // 5 the Count Keepers (ICQA)
    () => `${sky('#e9f1ff', '#f5f7fb')}<rect y="350" width="800" height="70" fill="#cfd6e0"/>
      ${[0, 1, 2].map(r => `<g transform="translate(${90 + r * 230} 110)" stroke="${INK}" stroke-width="4"><rect x="0" y="0" width="190" height="240" fill="none"/><line x1="0" y1="80" x2="190" y2="80"/><line x1="0" y1="160" x2="190" y2="160"/>
        ${[0, 1, 2].map(s => [0, 1, 2].map(b => `<rect x="${12 + b * 60}" y="${s * 80 + 30}" width="48" height="48" rx="4" fill="${['#d9a066', '#c98d55', '#e3b07a'][(b + s) % 3]}"/><path class="check" style="animation-delay:${0.4 + (r * 9 + s * 3 + b) * 0.12}s" d="M${24 + b * 60} ${s * 80 + 52} l8 9 l16 -18" fill="none" stroke="#16a34a" stroke-width="7" stroke-linecap="round"/>`).join('')).join('')}</g>`).join('')}
      ${worker(70, 300, 0)}${worker(330, 300, 0.4)}${worker(560, 300, 0.8)}${worker(760, 300, 1.2)}`,
    // 6 the end
    () => `<rect width="800" height="420" fill="#1d2440"/>${Array.from({ length: 40 }, (_, i) => `<circle class="twinkle" style="animation-delay:${(i % 7) * 0.3}s" cx="${(i * 97) % 800}" cy="${(i * 53) % 260}" r="${1.5 + (i % 3)}" fill="#fff"/>`).join('')}
      <circle cx="640" cy="90" r="50" fill="#fff3b0"/><circle cx="660" cy="80" r="46" fill="#1d2440"/>
      <g fill="#0f1426" transform="translate(400 330)"><rect x="-110" y="-110" width="220" height="130"/><rect x="-150" y="-160" width="60" height="180"/><rect x="90" y="-160" width="60" height="180"/><path d="M-150 -160 l30 -50 l30 50z M90 -160 l30 -50 l30 50z"/></g>
      <g fill="#ffd166"><rect x="320" y="250" width="22" height="26" rx="6"/><rect x="458" y="250" width="22" height="26" rx="6"/></g>
      <rect y="350" width="800" height="70" fill="#0f1426"/><text x="400" y="400" text-anchor="middle" font-size="44" font-weight="900" fill="#ffd166" class="sv-end">The End</text>`,
  ];

  // ---------- story text ([n] = the room's word in slot n) ----------
  const PAGES = [
    { s: 0, cover: true, t: 'The Kingdom of Q2' },
    { s: 1, t: 'Once upon a time, in the Kingdom of Q2, everybody kept saying the same word. At the bakery, at the bus stop, even in the bathtub: [0]!' },
    { s: 2, t: 'High in the tall Fed Tree lived a Wise Old Owl. She peered at the prices through her tiny glasses and hooted: [1]! Then, whoosh, she pushed interest rates up, up, up.' },
    { s: 3, t: 'Down in the valley snored the Mortgage Dragon, curled around a pile of 7.4% gold. Anyone who wanted a new house had to pay him extra, every single month. The houses sighed: [2]. So everybody stayed right where they were.' },
    { s: 4, t: 'But in a big orange store lived a brave Little Bucket. "If nobody moves, they still fix things!" said the Bucket. So the builders kept building, shoppers bought a little more each trip, and the store sold $47.9 billion. The crowd shouted: [3]!' },
    { s: 5, t: 'And behind the scenes, the Count Keepers (that\'s you!) made sure every hammer, every bucket and every box was exactly where the computer said it was. Not one went missing. The whole kingdom whispered: [4].' },
    { s: 6, end: true, t: 'Is the economy still a little [0]? Maybe. But the Kingdom of Q2 kept calm, counted carefully, and lived happily, and accurately, ever after.' },
  ];

  // ---------- styles ----------
  const css = `
  #story { position: fixed; inset: 0; z-index: 300; background: radial-gradient(1200px 800px at 50% 0%, #fffaf0, #f3e6cc); color: ${INK}; display: flex; flex-direction: column; font-family: 'Fredoka', 'Archivo', system-ui, sans-serif; }
  #story .st-top { display: flex; justify-content: space-between; align-items: center; padding: 1.6vh 2.4vw; }
  #story .st-badge { font-weight: 700; letter-spacing: .12em; text-transform: uppercase; font-size: clamp(.7rem, 1vw, .95rem); color: #b3541e; }
  #story .st-dots { display: flex; gap: 8px; } #story .st-dots i { width: 12px; height: 12px; border-radius: 50%; background: #e2cfa8; } #story .st-dots i.on { background: #F96302; transform: scale(1.25); }
  #story .st-page { flex: 1; display: grid; grid-template-rows: minmax(0, 1fr) auto; gap: 1.6vh; padding: 0 4vw 1vh; min-height: 0; }
  #story .st-art { min-height: 0; display: grid; place-items: center; }
  #story .st-art svg { height: 100%; max-height: 58vh; width: auto; max-width: 100%; border-radius: 26px; border: 6px solid ${INK}; box-shadow: 0 14px 0 rgba(59,42,32,.18); background: #fff; }
  #story .st-text { font-size: clamp(1.15rem, 2.35vw, 2.3rem); line-height: 1.4; font-weight: 500; text-align: center; max-width: 1350px; margin: 0 auto; min-height: 7.5em; }
  #story .st-text .wd { opacity: 0; display: inline-block; animation: stIn .35s forwards; }
  #story .st-title { font-size: clamp(2.6rem, 7vw, 6.4rem); font-weight: 700; line-height: 1; color: #F96302; text-shadow: 4px 4px 0 ${INK}; -webkit-text-stroke: 2px ${INK}; }
  #story .st-sub { display: block; margin-top: 1.2vh; font-size: clamp(1rem, 1.8vw, 1.7rem); }
  #story .chip { display: inline-flex; flex-direction: column; align-items: center; vertical-align: middle; margin: 0 .15em; padding: .05em .45em .1em; border-radius: 14px; background: #ffe066; border: 3px solid ${INK}; box-shadow: 0 4px 0 ${INK}; transform: rotate(-2deg); line-height: 1.05; opacity: 0; animation: stPop .55s cubic-bezier(.3,1.7,.5,1) forwards; }
  #story .chip b { font-weight: 700; font-size: 1.1em; color: ${INK}; }
  #story .chip small { color: ${INK}; }
  #story b, #story strong { color: ${INK}; }
  #story .chip small { font-size: .42em; font-weight: 600; letter-spacing: .02em; white-space: nowrap; }
  #story .chip.np { background: #fff; border-style: dashed; box-shadow: none; }
  #story .st-credits { margin-top: 1.2vh; font-size: clamp(.8rem, 1.2vw, 1.1rem); color: #7a5a40; }
  #story .st-bar { display: flex; justify-content: center; gap: 10px; padding: 0 0 2vh; }
  #story .st-bar button { font: inherit; font-weight: 700; font-size: 1rem; padding: 8px 16px; border-radius: 99px; border: 3px solid ${INK}; background: #fff; color: ${INK}; cursor: pointer; }
  #story .st-bar button.on { background: #ffe066; }
  #story .st-bar button.hidden { display: none; }
  @keyframes stIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  @keyframes stPop { 0% { opacity: 0; transform: scale(.2) rotate(-12deg); } 100% { opacity: 1; transform: scale(1) rotate(-2deg); } }
  #story svg .sv-w { font: 700 22px 'Fredoka', 'Archivo', sans-serif; fill: ${INK}; }
  #story svg .sv-lab { font: 700 20px 'Fredoka', sans-serif; fill: ${INK}; letter-spacing: .08em; }
  #story svg .sv-z { font: 700 34px 'Fredoka', sans-serif; fill: #6b4fc4; animation: zz 2.4s infinite; opacity: 0; }
  #story svg .pop { opacity: 0; animation: svPop .6s cubic-bezier(.3,1.7,.5,1) forwards; transform-box: fill-box; transform-origin: center bottom; }
  #story svg .float { animation: svFloat 3.6s ease-in-out infinite alternate; }
  #story svg .blink { animation: svBlink 3.2s infinite; transform-box: fill-box; transform-origin: center; }
  #story svg .rise { animation: svRise 2.6s cubic-bezier(.2,.8,.2,1) forwards; }
  #story svg .breathe { animation: svBreathe 2.6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
  #story svg .hop { animation: svHop 1.1s ease-in-out infinite; }
  #story svg .hop2 { animation: svHop 1.6s ease-in-out infinite; }
  #story svg .cape { animation: svCape .5s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: right top; }
  #story svg .fall { animation: svFall 2.4s linear infinite; }
  #story svg .bob { animation: svBob 1.4s ease-in-out infinite; }
  #story svg .glow { animation: svGlow 2s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
  #story svg .check { stroke-dasharray: 40; stroke-dashoffset: 40; animation: svCheck .4s forwards; }
  #story svg .twinkle { animation: svTw 1.8s ease-in-out infinite; }
  #story svg .sv-end { animation: svPop .9s cubic-bezier(.3,1.7,.5,1) both; transform-box: fill-box; transform-origin: center; }
  @keyframes svPop { 0% { opacity: 0; transform: scale(.2); } 100% { opacity: 1; transform: scale(1); } }
  @keyframes svFloat { to { transform: translate(var(--x, 0), -18px); } }
  @keyframes svBlink { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(.1); } }
  @keyframes svRise { from { transform: translate(560px, 520px); } to { transform: translate(560px, 320px); } }
  @keyframes svBreathe { 50% { transform: scale(1.04, .97); } }
  @keyframes svHop { 50% { transform: translateY(-26px); } }
  @keyframes svCape { to { transform: rotate(8deg); } }
  @keyframes svFall { from { transform: translateY(-40px); } to { transform: translateY(470px); } }
  @keyframes svBob { 50% { transform: translateY(-8px); } }
  @keyframes svGlow { 50% { transform: scale(1.08); opacity: .7; } }
  @keyframes svCheck { to { stroke-dashoffset: 0; } }
  @keyframes svTw { 50% { opacity: .2; } }
  @keyframes zz { 0% { opacity: 0; transform: translate(0, 10px); } 30% { opacity: 1; } 100% { opacity: 0; transform: translate(20px, -30px); } }
  @media (prefers-reduced-motion: reduce) { #story * { animation-duration: .01ms !important; animation-iteration-count: 1 !important; } }`;

  // ---------- player ----------
  let root = null, page = 0, timer = null, slots = [], meta = {}, narrate = true, voice = null, paused = false;
  const synth = window.speechSynthesis;
  function pickVoice() {
    if (!synth) return null;
    const vs = synth.getVoices().filter(v => /^en(-|_)/i.test(v.lang));
    const pref = [/aria|jenny|samantha|google uk english female|libby|sonia|natasha|female/i, /google us english|zira|en-gb/i];
    for (const re of pref) { const v = vs.find(x => re.test(x.name) || re.test(x.lang)); if (v) return v; }
    return vs[0] || null;
  }
  if (synth) synth.onvoiceschanged = () => (voice = pickVoice());

  function chip(n) {
    const s = slots[n];
    if (s.np) return `<span class="chip np" style="animation-delay:DELAYs"><b>${esc(s.w)}</b><small>narrator's pick</small></span>`;
    const by = s.by[0];
    const more = s.n > 1 ? ` +${s.n - 1}` : '';
    return `<span class="chip" style="animation-delay:DELAYs"><b>${esc(s.w)}</b><small>${by ? esc(by.av + ' ' + by.nm) : ''}${more}</small></span>`;
  }
  function renderText(p) {
    if (p.cover) return `<div class="st-title">${esc(p.t)}</div><span class="st-sub">${meta.tellers ? `A bedtime story, written live by ${meta.tellers} storyteller${meta.tellers === 1 ? '' : 's'} in this room` : 'A bedtime story, told by the narrator'}</span>`;
    let k = 0, out = '';
    p.t.split(/(\[\d\])/).forEach(part => {
      const m = part.match(/^\[(\d)\]$/);
      if (m) { out += chip(+m[1]).replace('DELAY', (k * 0.06 + 0.15).toFixed(2)); k += 3; return; }
      part.split(/(\s+)/).forEach(w => {
        if (!w) return;
        if (/^\s+$/.test(w)) { out += ' '; return; }
        out += `<span class="wd" style="animation-delay:${(k++ * 0.06).toFixed(2)}s">${esc(w)}</span>`;
      });
    });
    if (p.end) {
      const names = slots.filter(s => !s.np).map(s => `${s.w} (${s.by.map(b => b.nm).slice(0, 3).join(', ')}${s.by.length > 3 ? '...' : ''})`);
      out += `<div class="st-credits">Story words by the room: ${esc(names.join(' · ') || 'the narrator, this time')}</div>`;
    }
    return out;
  }
  const plain = p => p.cover ? `${p.t}. A bedtime story, written live by the people in this room.` : p.t.replace(/\[(\d)\]/g, (_, n) => slots[+n].w);

  function show(i) {
    clearTimeout(timer);
    if (synth) synth.cancel();
    page = Math.max(0, Math.min(PAGES.length - 1, i));
    const p = PAGES[page];
    root.querySelector('.st-art').innerHTML = `<svg viewBox="0 0 800 420" role="img" aria-label="Story illustration">${SCENES[p.s](slots)}</svg>`;
    root.querySelector('.st-text').innerHTML = renderText(p);
    root.querySelector('.st-dots').innerHTML = PAGES.map((_, k) => `<i class="${k === page ? 'on' : ''}"></i>`).join('');
    root.querySelector('[data-a=next]').textContent = page === PAGES.length - 1 ? 'Back to the quiz' : 'Next';
    root.querySelector('[data-a=close]').classList.toggle('hidden', page === PAGES.length - 1);
    if (window.FX) { FX.sound.play('whoosh'); if (p.end) setTimeout(() => { FX.sound.play('fanfare'); FX.confetti({ count: 220 }); }, 1200); }
    if (!paused) schedule(p);
  }
  function schedule(p) {
    const text = plain(p);
    const next = () => { if (page < PAGES.length - 1) timer = setTimeout(() => show(page + 1), 1300); };
    const muted = window.FX && FX.sound.muted;
    if (narrate && synth && !muted) {
      const parts = text.match(/[^.!?]+[.!?]+["']?|[^.!?]+$/g) || [text];
      parts.forEach((t, k) => {
        const u = new SpeechSynthesisUtterance(t.trim());
        if (voice) u.voice = voice;
        u.rate = 0.95; u.pitch = 1.08;
        if (k === parts.length - 1) u.onend = () => { if (!paused && root) next(); };
        synth.speak(u);
      });
      // safety net in case the speech engine never reports the end
      timer = setTimeout(() => show(page + 1 < PAGES.length ? page + 1 : page), 4000 + text.length * 95);
    } else {
      timer = setTimeout(() => { if (page < PAGES.length - 1) show(page + 1); }, 3500 + text.length * 55);
    }
  }
  function close() {
    clearTimeout(timer); if (synth) synth.cancel();
    if (root) root.remove(); root = null;
    removeEventListener('keydown', onKey, true);
  }
  function onKey(e) {
    e.stopPropagation();
    if (['ArrowRight', ' ', 'PageDown', 'Enter'].includes(e.key)) { e.preventDefault(); page === PAGES.length - 1 ? close() : show(page + 1); }
    else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); show(page - 1); }
    else if (e.key === 'Escape') close();
    else if (e.key.toLowerCase() === 'n') toggleNarr();
    else if (e.key.toLowerCase() === 'p') togglePause();
  }
  function toggleNarr() { narrate = !narrate; root.querySelector('[data-a=narr]').classList.toggle('on', narrate); show(page); }
  function togglePause() { paused = !paused; root.querySelector('[data-a=pause]').textContent = paused ? 'Play' : 'Pause'; if (paused) { clearTimeout(timer); if (synth) synth.cancel(); } else show(page); }

  function play({ words = [], storytellers = 0 } = {}) {
    if (!document.getElementById('story-css')) { const st = document.createElement('style'); st.id = 'story-css'; st.textContent = css; document.head.appendChild(st); }
    // top words first; fill any gaps with narrator's picks (clearly marked as such)
    slots = words.slice(0, 5).map(w => ({ w: w.w, n: w.n, by: w.by || [] }));
    const used = new Set(slots.map(s => s.w));
    FALLBACK.filter(w => !used.has(w)).forEach(w => { if (slots.length < 5) slots.push({ w, np: true, by: [], n: 0 }); });
    meta = { tellers: storytellers || new Set(words.flatMap(w => (w.by || []).map(b => b.nm))).size };
    voice = voice || pickVoice();
    paused = false;
    close();
    root = document.createElement('div');
    root.id = 'story';
    root.innerHTML = `<div class="st-top"><span class="st-badge">Story time &middot; written by the room</span><span class="st-dots"></span><span class="st-badge">Press N for narration</span></div>
      <div class="st-page"><div class="st-art"></div><div class="st-text"></div></div>
      <div class="st-bar"><button data-a="prev">Back</button><button data-a="pause">Pause</button><button data-a="narr" class="${narrate ? 'on' : ''}">Narrator</button><button data-a="next">Next</button><button data-a="close">Close</button></div>`;
    root.querySelector('.st-bar').onclick = e => {
      const a = e.target.dataset.a; if (!a) return;
      if (a === 'prev') show(page - 1); else if (a === 'next') (page === PAGES.length - 1 ? close() : show(page + 1));
      else if (a === 'close') close(); else if (a === 'narr') toggleNarr(); else if (a === 'pause') togglePause();
    };
    document.body.appendChild(root);
    addEventListener('keydown', onKey, true);
    show(0);
  }
  window.Story = { play, close, get open() { return !!root; } };
})();
