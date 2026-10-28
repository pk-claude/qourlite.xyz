/* Title deed cards: shared by the phone and the big screen.
   DEED.make() asks /api/deed (Claude) for a personal deed and falls back to a
   house-made one if the API is missing, slow or refuses. */
(function () {
  const C = () => window.MONO.colors;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const GROUPS = ['brown', 'lightblue', 'pink', 'orange', 'red', 'yellow', 'green', 'darkblue'];
  const cap = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

  // Keep whatever comes back (from the API or a phone) inside safe limits.
  function tidy(d, by) {
    if (!d || typeof d !== 'object') return null;
    const rent = Array.isArray(d.rent) ? d.rent.slice(0, 4).map(r => cap(r, 70)) : [];
    if (!d.prop || rent.length < 2) return null;
    return {
      prop: cap(d.prop, 34),
      color: GROUPS.includes(d.color) ? d.color : 'orange',
      price: Math.max(20, Math.min(990, Math.round(+d.price || 200))),
      tag: cap(d.tag, 90),
      rent,
      chance: cap(d.chance, 140),
      by: by || (d.by === 'ai' ? 'ai' : 'bank'),
    };
  }

  function local(nm, ans) {
    const I = window.MONO.deedIdeas;
    const power = cap(ans.power, 40) || pick(I.power);
    const snack = cap(ans.snack, 30) || pick(I.snack);
    const phrase = cap(ans.phrase, 40) || pick(I.phrase);
    const word = (power.match(/[A-Za-z]{4,}/g) || ['Hustle']).sort((a, b) => b.length - a.length)[0];
    const street = word[0].toUpperCase() + word.slice(1).toLowerCase() + ' ' + pick(['Place', 'Avenue', 'Boulevard', 'Lane', 'Terrace', 'Heights', 'Parkway']);
    return {
      prop: street, color: pick(GROUPS), price: 100 + 20 * Math.floor(Math.random() * 15),
      tag: `Home of ${cap(nm, 18)}, known for: ${power.toLowerCase()}.`,
      rent: [`Rent: one ${snack}`, `With 1 house: two ${snack}`, `With 4 houses: someone says ${phrase}`, `With a hotel: ${power.toLowerCase()}, on demand`],
      chance: `Advance to the break room. Collect one ${snack}. If anyone says ${phrase}, collect $50 from each player.`,
      by: 'bank',
    };
  }

  async function make(nm, tok, ans, { timeout = 14000 } = {}) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), timeout);
      const r = await fetch('/api/deed', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl.signal,
        body: JSON.stringify({ nm, tok, ...ans }),
      });
      clearTimeout(timer);
      if (r.ok) {
        const d = tidy(await r.json(), 'ai');
        if (d) return d;
      }
    } catch (e) {}
    return tidy(local(nm, ans), 'bank');
  }

  function html(d, { owner, tok } = {}) {
    if (!d) return '';
    const col = C()[d.color] || '#f7941d';
    const dark = ['yellow', 'lightblue'].includes(d.color);
    return `<div class="deed" style="--dc:${col};--dt:${dark ? '#111' : '#fff'}">
      <div class="deed-head"><div class="deed-k">Title deed</div><div class="deed-n">${esc(d.prop)}</div></div>
      <div class="deed-body">
        ${d.rent.map((r, i) => `<div class="deed-r ${i === 0 ? 'first' : ''}">${esc(r)}</div>`).join('')}
        <div class="deed-line"></div>
        <div class="deed-price">Price <b>$${d.price}</b> &middot; Mortgage value: one strongly worded email</div>
        ${d.tag ? `<div class="deed-tag">${esc(d.tag)}</div>` : ''}
        ${owner ? `<div class="deed-own">${tok ? esc(tok) + ' ' : ''}Owner: <b>${esc(owner)}</b></div>` : ''}
      </div>
      <div class="deed-by">${d.by === 'ai' ? 'Written live by Claude' : 'Printed by the Bank'}</div>
    </div>`;
  }

  function chanceHTML(d) {
    if (!d || !d.chance) return '';
    return `<div class="chance-card"><div class="cc-q">?</div><div><div class="cc-k">Chance</div><div class="cc-t">${esc(d.chance)}</div></div></div>`;
  }

  window.DEED = { make, html, chanceHTML, tidy, local };
})();
