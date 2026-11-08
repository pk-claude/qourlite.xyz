/* Peak Season Grand Prix: the racers. One per answer option, side view facing right, viewBox 0 0 120 72.
   Racers.svg(i) -> SVG markup. Racers.name(i), Racers.color(i). */
(function () {
  const INK = '#1d1d1f';
  const COLORS = ['#F96303', '#2563eb', '#16a34a', '#7c3aed', '#db2777'];
  const NAMES = ['Forklift', 'Pallet jack', 'Reach truck', 'Robot', 'Tugger'];
  const wheel = (x, y, r) => `<g class="wh" style="transform-origin:${x}px ${y}px"><circle cx="${x}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${x}" cy="${y}" r="${r * 0.42}" fill="#9ca3af"/><rect x="${x - 0.8}" y="${y - r * 0.8}" width="1.6" height="${r * 1.6}" fill="${INK}"/></g>`;
  const box = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="#d6a46a" stroke="${INK}" stroke-width="1.6"/><path d="M${x + w / 2 - 3} ${y} v${h * 0.35} h6 v-${h * 0.35}" fill="#f2d3a6" stroke="${INK}" stroke-width="1.2"/>`;
  const pallet = (x, y, w) => `<rect x="${x}" y="${y}" width="${w}" height="3" fill="#a16207" stroke="${INK}" stroke-width="1.2"/><rect x="${x + 2}" y="${y + 3}" width="4" height="3" fill="#a16207"/><rect x="${x + w / 2 - 2}" y="${y + 3}" width="4" height="3" fill="#a16207"/><rect x="${x + w - 6}" y="${y + 3}" width="4" height="3" fill="#a16207"/>`;
  const hat = (x, y, c) => `<circle cx="${x}" cy="${y + 3}" r="5" fill="#f3c9a0" stroke="${INK}" stroke-width="1.4"/><path d="M${x - 6.5} ${y + 1.5} a6.5 5.5 0 0 1 13 0 z" fill="${c}" stroke="${INK}" stroke-width="1.4"/><rect x="${x - 7.5}" y="${y + 0.8}" width="15" height="2" rx="1" fill="${c}" stroke="${INK}" stroke-width="1"/>`;
  const ART = [
    // forklift: cab with cage, mast in front, forks with a pallet and a box
    c => `<rect x="14" y="34" width="46" height="22" rx="4" fill="${c}" stroke="${INK}" stroke-width="2"/>
      <rect x="8" y="38" width="10" height="16" rx="2" fill="#4b5563" stroke="${INK}" stroke-width="2"/>
      <path d="M22 34 V14 H52 L56 34" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      ${hat(37, 19, '#facc15')}<rect x="30" y="28" width="12" height="6" rx="2" fill="#374151"/>
      <rect x="64" y="8" width="5" height="50" fill="#6b7280" stroke="${INK}" stroke-width="1.6"/>
      <rect x="69" y="51" width="30" height="3.5" fill="#6b7280" stroke="${INK}" stroke-width="1.2"/>
      ${pallet(70, 45, 28)}${box(74, 27, 20, 18)}
      ${wheel(24, 58, 9)}${wheel(54, 58, 9)}`,
    // pallet jack: operator walking behind, handle, low forks under a stacked pallet
    c => `<path d="M30 58 L22 26" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
      <rect x="15" y="21" width="12" height="7" rx="3" fill="${c}" stroke="${INK}" stroke-width="1.8"/>
      <g stroke="${INK}" stroke-width="3" stroke-linecap="round" fill="none"><path d="M8 26 L18 24"/><path d="M8 40 L4 58 M8 40 L13 58"/><path d="M8 24 L8 40"/></g>
      ${hat(8, 11, '#facc15')}
      <rect x="26" y="52" width="76" height="6" rx="2" fill="${c}" stroke="${INK}" stroke-width="2"/>
      ${pallet(40, 45, 56)}${box(44, 27, 22, 18)}${box(68, 27, 24, 18)}${box(55, 10, 24, 17)}
      ${wheel(32, 62, 5)}${wheel(96, 62, 4)}`,
    // reach truck: compact stand-up body, tall mast, load raised high
    c => `<rect x="10" y="30" width="36" height="26" rx="4" fill="${c}" stroke="${INK}" stroke-width="2"/>
      <rect x="18" y="12" width="20" height="18" rx="2" fill="none" stroke="${INK}" stroke-width="2.2"/>
      ${hat(28, 15, '#facc15')}
      <rect x="48" y="2" width="5" height="56" fill="#6b7280" stroke="${INK}" stroke-width="1.6"/>
      <rect x="53" y="2" width="5" height="56" fill="#9ca3af" stroke="${INK}" stroke-width="1.6"/>
      <rect x="44" y="56" width="56" height="4" fill="#6b7280" stroke="${INK}" stroke-width="1.2"/>
      <rect x="58" y="24" width="30" height="3" fill="#6b7280" stroke="${INK}" stroke-width="1.2"/>
      ${pallet(59, 18, 28)}${box(63, 1, 20, 17)}
      ${wheel(20, 60, 7)}${wheel(92, 62, 4)}`,
    // AMR robot: low drive unit carrying a shelving pod, with a lidar dome and status light
    c => `<rect x="22" y="2" width="58" height="40" rx="2" fill="none" stroke="${INK}" stroke-width="2"/>
      <path d="M22 16 H80 M22 29 H80" stroke="${INK}" stroke-width="2"/>
      ${box(27, 5, 16, 10)}${box(56, 5, 18, 10)}${box(30, 18, 22, 10)}${box(36, 31, 18, 10)}${box(58, 31, 16, 10)}
      <rect x="12" y="42" width="78" height="14" rx="7" fill="${c}" stroke="${INK}" stroke-width="2"/>
      <circle cx="84" cy="49" r="3" fill="#fff" class="blink"/><circle cx="74" cy="49" r="3" fill="#fff" class="blink"/>
      <rect x="18" y="47" width="30" height="4" rx="2" fill="#bbf7d0"/>
      ${wheel(26, 60, 5)}${wheel(76, 60, 5)}`,
    // tugger: small tractor towing a cart
    c => `<rect x="4" y="44" width="40" height="8" rx="2" fill="#6b7280" stroke="${INK}" stroke-width="1.6"/>${box(8, 28, 15, 16)}${box(25, 30, 16, 14)}
      <path d="M44 50 H56" stroke="${INK}" stroke-width="2.4"/>
      <rect x="56" y="34" width="40" height="20" rx="5" fill="${c}" stroke="${INK}" stroke-width="2"/>
      <path d="M66 34 V18 H86 L90 34" fill="none" stroke="${INK}" stroke-width="2.2"/>${hat(76, 22, '#facc15')}
      ${wheel(14, 58, 5)}${wheel(36, 58, 5)}${wheel(66, 58, 8)}${wheel(90, 58, 8)}`,
  ];
  const svg = (i, cls = '') => `<svg class="racer ${cls}" viewBox="0 0 104 72" role="img" aria-label="${NAMES[i % 5]}">${ART[i % 5](COLORS[i % 5])}</svg>`;
  window.Racers = { svg, name: i => NAMES[i % 5], color: i => COLORS[i % 5], n: 5 };
})();
