/* Race to Peak: the racers, drawn as real warehouse equipment in side profile, facing right.
   Shaded paint, brushed-steel masts with chains, treaded tyres, overhead guards, a warning
   beacon and a stretch-wrapped load. viewBox 0 -4 112 64 (unchanged, so layouts hold).
   Racers.svg(i) -> SVG markup. Racers.name(i), Racers.color(i), Racers.num(i), Racers.team(i). */
(function () {
  const COLORS = ['#F96303', '#2f6bff', '#18b26b', '#9b5cff', '#ff3d7f'];
  const LIGHT = ['#ff9a4d', '#7aa2ff', '#5fe0a0', '#c7a2ff', '#ff86ad'];
  const DARK = ['#9a3a00', '#16328a', '#0b5c37', '#4d2499', '#8f1540'];
  const NAMES = ['Forklift', 'Pallet Jack', 'Reach Truck', 'The Robot', 'Tugger'];
  const TEAMS = ['Scuderia Sit-Down', 'Low Rider Racing', 'Team High Bay', 'Autonomous GP', 'Tow Motion'];
  let uid = 0;

  function defs(u, i) {
    return `<defs>
      <linearGradient id="p${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${LIGHT[i]}"/><stop offset=".45" stop-color="${COLORS[i]}"/><stop offset="1" stop-color="${DARK[i]}"/></linearGradient>
      <linearGradient id="s${u}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5d636c"/><stop offset=".35" stop-color="#d9dde2"/><stop offset=".6" stop-color="#8d939b"/><stop offset="1" stop-color="#4a4f57"/></linearGradient>
      <linearGradient id="h${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9ecef"/><stop offset="1" stop-color="#7d838b"/></linearGradient>
      <linearGradient id="k${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4b4f56"/><stop offset="1" stop-color="#16181c"/></linearGradient>
      <linearGradient id="w${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2b77d"/><stop offset="1" stop-color="#a87a43"/></linearGradient>
      <linearGradient id="f${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="rgba(255,255,255,.55)"/><stop offset=".3" stop-color="rgba(255,255,255,.08)"/><stop offset="1" stop-color="rgba(255,255,255,.25)"/></linearGradient>
      <radialGradient id="r${u}"><stop offset="0" stop-color="#f4f6f8"/><stop offset=".55" stop-color="#9aa0a8"/><stop offset="1" stop-color="#3e434a"/></radialGradient>
      <radialGradient id="b${u}"><stop offset="0" stop-color="#fff3c4"/><stop offset=".4" stop-color="#ffb300"/><stop offset="1" stop-color="rgba(255,140,0,0)"/></radialGradient>
    </defs>`;
  }
  // treaded tyre with a steel rim
  const tyre = (u, x, y, r) => `<g class="wh"><circle cx="${x}" cy="${y}" r="${r}" fill="#121315"/>
    <circle cx="${x}" cy="${y}" r="${r - 0.6}" fill="none" stroke="#2c2f34" stroke-width="${r * 0.28}" stroke-dasharray="${r * 0.32} ${r * 0.22}"/>
    <circle cx="${x}" cy="${y}" r="${r * 0.56}" fill="url(#r${u})"/><circle cx="${x}" cy="${y}" r="${r * 0.2}" fill="#2a2d32"/>
    ${[0, 72, 144, 216, 288].map(a => `<circle cx="${x + Math.cos(a * Math.PI / 180) * r * 0.36}" cy="${y + Math.sin(a * Math.PI / 180) * r * 0.36}" r="${r * 0.06}" fill="#2a2d32"/>`).join('')}</g>`;
  const roundel = (x, y, n) => `<circle cx="${x}" cy="${y}" r="5.6" fill="#fff" stroke="#111" stroke-width=".6"/><text x="${x}" y="${y + 3.1}" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" font-size="8.4" fill="#111">${n}</text>`;
  // a stretch-wrapped pallet load
  const load = (u, x, y, w, h) => `<rect x="${x}" y="${y + h}" width="${w}" height="3.2" fill="url(#w${u})"/><rect x="${x + 1.5}" y="${y + h + 3.2}" width="3" height="2" fill="#7a5530"/><rect x="${x + w / 2 - 1.5}" y="${y + h + 3.2}" width="3" height="2" fill="#7a5530"/><rect x="${x + w - 4.5}" y="${y + h + 3.2}" width="3" height="2" fill="#7a5530"/>
    <rect x="${x + 0.5}" y="${y}" width="${w / 2 - 0.7}" height="${h / 2}" fill="#c99560"/><rect x="${x + w / 2 + 0.2}" y="${y}" width="${w / 2 - 0.7}" height="${h / 2}" fill="#b98653"/>
    <rect x="${x + 0.5}" y="${y + h / 2 + 0.3}" width="${w - 1}" height="${h / 2 - 0.3}" fill="#c28d58"/>
    <rect x="${x + 0.2}" y="${y - 0.2}" width="${w - 0.4}" height="${h + 0.4}" fill="url(#f${u})" opacity=".9"/>
    <path d="M${x + 2} ${y + 2} l${w * 0.3} ${h * 0.6}" stroke="rgba(255,255,255,.5)" stroke-width=".7"/>`;
  const beacon = (u, x, y) => `<rect x="${x - 1.4}" y="${y}" width="2.8" height="2" fill="#333"/><circle class="beacon" cx="${x}" cy="${y - 0.4}" r="2" fill="#ffb300"/><circle class="beacon glow" cx="${x}" cy="${y - 0.4}" r="7" fill="url(#b${u})"/>`;
  const driver = (x, y) => `<path d="M${x - 4} ${y + 13} q0 -9 4 -10 q4 1 4 10 z" fill="#d8e600"/><rect x="${x - 3.8}" y="${y + 6}" width="7.6" height="1.4" fill="#e9eef2"/><rect x="${x - 3.8}" y="${y + 9}" width="7.6" height="1.4" fill="#e9eef2"/>
    <circle cx="${x}" cy="${y}" r="3.6" fill="#c08a64"/><path d="M${x - 4.2} ${y - 0.6} a4.2 3.8 0 0 1 8.4 0 z" fill="#ffd400"/><rect x="${x + 0.6}" y="${y - 0.4}" width="3.4" height="1.6" rx=".6" fill="#0d1117" opacity=".85"/>`;
  const shadow = (x, w) => `<ellipse cx="${x}" cy="57.5" rx="${w}" ry="2.6" fill="rgba(0,0,0,.35)"/>`;

  const ART = [
    // sit-down counterbalance forklift
    (u, i) => `${shadow(52, 50)}
      <rect x="2" y="27" width="13" height="19" rx="3" fill="url(#k${u})"/><rect x="3" y="29" width="11" height="2" fill="#6b7078"/>
      <rect x="4" y="16" width="14" height="7" rx="3.5" fill="url(#s${u})"/><rect x="6" y="16.4" width="1" height="6.2" fill="#c33" opacity=".7"/>
      <path d="M12 46 L13 31 Q14 25 20 25 L40 25 L44 17 L58 17 L60 46 Z" fill="url(#p${u})"/>
      <path d="M13 38 L60 38 L60 46 L12 46 Z" fill="${DARK[i]}" opacity=".55"/><path d="M15 28 h24" stroke="#fff" stroke-width="2" opacity=".85"/>
      <path d="M19 25 L19 4 M54 17 L56 4" stroke="#9aa1ab" stroke-width="2.2"/><path d="M17 4 H58" stroke="#b3b9c2" stroke-width="2.6"/><path d="M21 4.5 V7 M27 4.5 V7 M33 4.5 V7 M39 4.5 V7 M45 4.5 V7 M51 4.5 V7" stroke="#9aa1ab" stroke-width=".8"/>
      ${driver(36, 12)}<path d="M44 20 l4 -4" stroke="#111" stroke-width="1.6"/><ellipse cx="48.5" cy="15.5" rx="2.6" ry="1" fill="#111" transform="rotate(-45 48.5 15.5)"/>
      ${beacon(u, 37, 1)}${roundel(28, 34, 1)}
      <circle cx="58.5" cy="30" r="1.8" fill="#fff7d6"/><path d="M60 30 l7 -3 v6 z" fill="rgba(255,240,180,.35)"/>
      <rect x="61" y="0" width="3.2" height="47" fill="url(#s${u})"/><rect x="65" y="2" width="3.2" height="45" fill="url(#s${u})"/>
      <rect x="64" y="6" width="1.2" height="38" fill="url(#h${u})"/><path d="M66.6 4 V40" stroke="#2b2e33" stroke-width=".9" stroke-dasharray="1.2 .6"/>
      <rect x="68" y="30" width="3" height="14" fill="#3a3e45"/><rect x="68" y="43" width="36" height="2.6" fill="url(#s${u})"/><rect x="102" y="43.6" width="2.5" height="1.4" fill="#4a4f57"/>
      ${load(u, 71, 20, 30, 19)}
      ${tyre(u, 23, 48.5, 8.5)}${tyre(u, 52, 49, 8)}`,
    // rider pallet jack
    (u, i) => `${shadow(62, 52)}
      <rect x="10" y="12" width="4" height="30" rx="1.5" fill="url(#s${u})" transform="rotate(-14 12 27)"/><rect x="5" y="9" width="13" height="5" rx="2.5" fill="#22262c"/><rect x="7" y="9.6" width="5" height="1.6" fill="#e33"/>
      <path d="M16 46 L16 30 Q16 21 25 21 L42 21 L44 46 Z" fill="url(#p${u})"/><path d="M16 39 L44 39 L44 46 L16 46 Z" fill="${DARK[i]}" opacity=".55"/>
      <rect x="18" y="23.5" width="22" height="1.6" fill="#fff" opacity=".85"/>${roundel(30, 31, 2)}${beacon(u, 24, 19)}
      <rect x="18" y="14" width="3" height="7" fill="#2a2d32"/><rect x="16" y="13" width="9" height="2" rx="1" fill="#2a2d32"/>
      <rect x="43" y="40" width="68" height="4.2" fill="url(#s${u})"/><rect x="43" y="44" width="68" height="1.2" fill="#3a3e45"/>
      ${load(u, 47, 18, 29, 18)}${load(u, 78, 20, 28, 16)}
      ${tyre(u, 27, 50, 6.5)}${tyre(u, 106, 50.5, 4)}${tyre(u, 74, 50.5, 4)}`,
    // stand-up reach truck with the load raised high
    (u, i) => `${shadow(56, 50)}
      <path d="M6 46 L6 26 Q6 19 13 19 L37 19 L39 46 Z" fill="url(#p${u})"/><path d="M6 38 L39 38 L39 46 L6 46 Z" fill="${DARK[i]}" opacity=".55"/>
      <rect x="9" y="22.5" width="27" height="1.8" fill="#fff" opacity=".85"/>${roundel(22, 31, 3)}
      <path d="M10 19 V3 M35 19 V3" stroke="#9aa1ab" stroke-width="2.2"/><path d="M8 3 H37" stroke="#b3b9c2" stroke-width="2.6"/>${driver(22, 9)}${beacon(u, 14, 0)}
      <rect x="40" y="-3" width="3.4" height="50" fill="url(#s${u})"/><rect x="44" y="-1" width="3.4" height="48" fill="url(#s${u})"/><rect x="43.4" y="2" width="1.2" height="40" fill="url(#h${u})"/>
      <path d="M45.7 0 V42" stroke="#2b2e33" stroke-width=".9" stroke-dasharray="1.2 .6"/>
      <rect x="38" y="45.5" width="66" height="3" fill="url(#s${u})"/><rect x="47" y="12" width="3" height="10" fill="#3a3e45"/><rect x="47" y="19" width="33" height="2.6" fill="url(#s${u})"/>
      ${load(u, 50, -1, 28, 15)}
      ${tyre(u, 16, 50, 7)}${tyre(u, 98, 51.5, 4)}${tyre(u, 60, 51.5, 4)}`,
    // autonomous mobile robot carrying a shelving pod
    (u, i) => `${shadow(54, 50)}
      ${[0, 15, 30].map(y => `<rect x="18" y="${y}" width="70" height="2.4" fill="url(#s${u})"/>`).join('')}<rect x="18" y="0" width="2.4" height="34" fill="url(#s${u})"/><rect x="85.6" y="0" width="2.4" height="34" fill="url(#s${u})"/>
      <rect x="23" y="3.5" width="17" height="11" fill="#c99560"/><rect x="42" y="5" width="14" height="9.6" fill="#b98653"/><rect x="58" y="4" width="25" height="10.6" fill="#c28d58"/>
      <rect x="22" y="18.5" width="27" height="11" fill="#b98653"/><rect x="52" y="20" width="30" height="9.6" fill="#c99560"/><rect x="18" y="0" width="70" height="34" fill="url(#f${u})" opacity=".35"/>
      <rect x="6" y="34" width="96" height="14" rx="5" fill="url(#p${u})"/><rect x="6" y="42" width="96" height="6" rx="3" fill="${DARK[i]}" opacity=".6"/>
      <rect x="14" y="36.5" width="38" height="2" rx="1" fill="#fff" opacity=".85"/><rect x="88" y="37" width="10" height="4" rx="2" fill="#0e1116"/><circle class="led" cx="93" cy="39" r="1.4" fill="#7dffc4"/>
      <rect x="56" y="31" width="12" height="3" rx="1.5" fill="#1b1e23"/><circle class="beacon" cx="62" cy="31" r="1.4" fill="#3fd1ff"/>${roundel(70, 41, 4)}
      ${tyre(u, 22, 50, 5)}${tyre(u, 86, 50, 5)}`,
    // tugger towing a cart
    (u, i) => `${shadow(56, 54)}
      <rect x="2" y="36" width="44" height="5" fill="url(#s${u})"/>${load(u, 5, 17, 18, 16)}${load(u, 25, 20, 18, 13)}<rect x="46" y="37" width="11" height="2.4" fill="#3a3e45"/>
      <path d="M56 46 L56 31 Q56 25 62 25 L82 25 L86 17 L100 17 L102 46 Z" fill="url(#p${u})"/><path d="M56 39 L102 39 L102 46 L56 46 Z" fill="${DARK[i]}" opacity=".55"/>
      <path d="M62 25 V6 M98 17 V6" stroke="#9aa1ab" stroke-width="2.2"/><path d="M60 6 H100" stroke="#b3b9c2" stroke-width="2.6"/>${driver(80, 13)}${beacon(u, 80, 3)}${roundel(70, 34, 5)}
      ${tyre(u, 12, 45, 4.5)}${tyre(u, 36, 45, 4.5)}${tyre(u, 66, 49, 7.5)}${tyre(u, 94, 49, 7.5)}`,
  ];
  const svg = (i, cls = '') => { const u = 'rc' + (uid++); const k = i % 5; return `<svg class="racer ${cls}" viewBox="0 -4 112 64" role="img" aria-label="${NAMES[k]}">${defs(u, k)}${ART[k](u, k)}</svg>`; };
  window.Racers = { svg, name: i => NAMES[i % 5], team: i => TEAMS[i % 5], color: i => COLORS[i % 5], num: i => (i % 5) + 1, n: 5 };
})();
