/* Race to Peak: the racers. Flat race liveries in side profile, facing right, viewBox 0 0 120 60.
   Racers.svg(i) -> SVG markup. Racers.name(i), Racers.color(i), Racers.num(i), Racers.team(i). */
(function () {
  const COLORS = ['#F96303', '#2f6bff', '#18b26b', '#9b5cff', '#ff3d7f'];
  const DARK = ['#b84500', '#1d46b8', '#0d7a48', '#6a35c4', '#b81f55'];
  const NAMES = ['Forklift', 'Pallet Jack', 'Reach Truck', 'The Robot', 'Tugger'];
  const TEAMS = ['Scuderia Sit-Down', 'Low Rider Racing', 'Team High Bay', 'Autonomous GP', 'Tow Motion'];
  const T = '#111317', HUB = '#c9ccd2';
  const wheel = (x, y, r) => `<g class="wh"><circle cx="${x}" cy="${y}" r="${r}" fill="${T}"/><circle cx="${x}" cy="${y}" r="${r * 0.5}" fill="${HUB}"/><path d="M${x - r * 0.5} ${y}h${r}M${x} ${y - r * 0.5}v${r}" stroke="${T}" stroke-width="${r * 0.18}"/></g>`;
  const roundel = (x, y, n) => `<circle cx="${x}" cy="${y}" r="6.5" fill="#fff"/><text x="${x}" y="${y + 3.6}" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" font-size="10" fill="${T}">${n}</text>`;
  const load = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" fill="#c99a62"/><rect x="${x}" y="${y + h * 0.42}" width="${w}" height="${h * 0.14}" fill="#e7c494" opacity=".8"/>`;
  const ART = [
    // forklift
    (c, d) => `<path d="M10 44 L12 30 Q14 24 20 24 L40 24 L46 16 L58 16 L60 44 Z" fill="${c}"/><path d="M10 44 L12 36 L60 36 L60 44 Z" fill="${d}"/>
      <path d="M44 16 L50 4 L60 4 L60 16" fill="none" stroke="#8a919c" stroke-width="2.6"/><rect x="4" y="30" width="9" height="12" rx="2" fill="#3a3f47"/>
      <rect x="14" y="27" width="26" height="3" fill="#fff" opacity=".9"/>${roundel(28, 33, 1)}
      <rect x="62" y="2" width="4" height="44" fill="#5a616c"/><rect x="66" y="2" width="2" height="44" fill="#5b616b"/>
      <rect x="66" y="42" width="36" height="3" fill="#5a616c"/><rect x="70" y="38" width="30" height="4" fill="#7a4b1e"/>${load(72, 20, 26, 18)}
      ${wheel(22, 48, 9)}${wheel(52, 48, 8)}`,
    // pallet jack (rider)
    (c, d) => `<path d="M14 14 L20 14 L26 40 L22 40 Z" fill="#8a919c"/><rect x="8" y="10" width="14" height="6" rx="3" fill="${c}"/>
      <path d="M18 30 Q18 22 26 22 L42 22 L44 46 L18 46 Z" fill="${c}"/><path d="M18 40 L44 40 L44 46 L18 46 Z" fill="${d}"/>${roundel(31, 32, 2)}
      <rect x="44" y="42" width="66" height="4" fill="#5a616c"/><rect x="48" y="38" width="58" height="4" fill="#7a4b1e"/>${load(50, 20, 26, 18)}${load(78, 22, 26, 16)}
      ${wheel(28, 50, 6)}${wheel(104, 50, 4)}`,
    // reach truck
    (c, d) => `<path d="M8 46 L8 26 Q8 20 14 20 L36 20 L38 46 Z" fill="${c}"/><path d="M8 38 L38 38 L38 46 L8 46 Z" fill="${d}"/>
      <path d="M12 20 L12 6 L34 6 L36 20" fill="none" stroke="#8a919c" stroke-width="2.6"/><rect x="10" y="24" width="26" height="3" fill="#fff" opacity=".9"/>${roundel(23, 32, 3)}
      <rect x="40" y="0" width="4" height="48" fill="#5a616c"/><rect x="44" y="0" width="3" height="48" fill="#5b616b"/>
      <rect x="38" y="46" width="62" height="3" fill="#5a616c"/><rect x="47" y="18" width="32" height="3" fill="#5a616c"/><rect x="49" y="14" width="28" height="4" fill="#7a4b1e"/>${load(51, -2, 24, 16)}
      ${wheel(18, 50, 7)}${wheel(94, 51, 4)}`,
    // the robot (AMR with a shelf pod)
    (c, d) => `<rect x="18" y="0" width="70" height="3" fill="#5a616c"/><rect x="18" y="15" width="70" height="3" fill="#5a616c"/><rect x="18" y="30" width="70" height="3" fill="#5a616c"/>
      <rect x="18" y="0" width="3" height="34" fill="#5a616c"/><rect x="85" y="0" width="3" height="34" fill="#5a616c"/>
      ${load(24, 4, 18, 11)}${load(56, 5, 24, 10)}${load(30, 19, 26, 11)}${load(62, 20, 18, 10)}
      <rect x="8" y="34" width="92" height="14" rx="7" fill="${c}"/><rect x="8" y="42" width="92" height="6" rx="3" fill="${d}"/>
      <rect x="16" y="37" width="34" height="3" rx="1.5" fill="#fff" opacity=".9"/><circle cx="90" cy="40" r="2.6" fill="#b6ffda" class="led"/>${roundel(64, 41, 4)}
      ${wheel(22, 50, 5)}${wheel(86, 50, 5)}`,
    // tugger with a cart
    (c, d) => `<rect x="2" y="36" width="44" height="6" fill="#5a616c"/>${load(6, 18, 18, 18)}${load(26, 22, 18, 14)}<rect x="46" y="38" width="10" height="3" fill="#5a616c"/>
      <path d="M56 46 L56 30 Q56 24 62 24 L82 24 L88 16 L100 16 L102 46 Z" fill="${c}"/><path d="M56 38 L102 38 L102 46 L56 46 Z" fill="${d}"/>
      <path d="M86 16 L92 4 L102 4 L102 16" fill="none" stroke="#8a919c" stroke-width="2.6"/>${roundel(72, 33, 5)}
      ${wheel(12, 46, 5)}${wheel(36, 46, 5)}${wheel(66, 49, 8)}${wheel(94, 49, 8)}`,
  ];
  const svg = (i, cls = '') => `<svg class="racer ${cls}" viewBox="0 -4 112 64" role="img" aria-label="${NAMES[i % 5]}">${ART[i % 5](COLORS[i % 5], DARK[i % 5])}</svg>`;
  window.Racers = { svg, name: i => NAMES[i % 5], team: i => TEAMS[i % 5], color: i => COLORS[i % 5], num: i => (i % 5) + 1, n: 5 };
})();
