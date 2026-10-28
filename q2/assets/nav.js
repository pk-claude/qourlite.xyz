/* Shared top bar for the explainer pages, plus click-or-key stepping (Space, arrows, clicker). */
(function () {
  const PAGES = [
    ['ripple.html', 'Ripple Map'],
    ['money.html', 'Where $100 Goes'],
    ['lockin.html', 'Lock-In Machine'],
    ['comp.html', 'Comp Machine'],
    ['turns.html', 'Turns Race'],
  ];
  const here = location.pathname.split('/').pop() || 'index.html';
  const bar = document.createElement('div');
  bar.className = 'topbar';
  bar.innerHTML = `<a class="brand" href="./"><span class="dot">Q2</span>Earnings Unpacked</a>
    <nav class="navlinks">${PAGES.map(([h, t]) => `<a class="pill ${h === here ? 'cur' : ''}" href="${h}">${t}</a>`).join('')}
    <a class="pill live" href="live.html">Live quiz</a></nav>`;
  const shell = document.querySelector('.shell');
  shell.prepend(bar);
  const foot = document.createElement('div');
  foot.className = 'disclaimer';
  foot.textContent = 'Independent, educational recap built from public information (company releases and filings, BEA, Freddie Mac, NAR). Not an official Home Depot page. Figures rounded.';
  shell.appendChild(foot);
  const st = document.createElement('style');
  st.textContent = `.navlinks{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.navlinks .pill{padding:6px 12px;font-size:.82rem}.navlinks .pill.cur{border-color:var(--orange);color:#fff;background:rgba(249,99,2,.15)}.navlinks .pill.live{background:var(--orange);border-color:var(--orange);color:#fff}@media(max-width:860px){.topbar{flex-direction:column;align-items:flex-start}.navlinks{justify-content:flex-start}}`;
  document.head.appendChild(st);

  // Pages register steps with Steps.on(fn); Space / Right / PageDown advance, Left / PageUp go back.
  const handlers = [];
  window.Steps = { on: (next, prev) => handlers.push({ next, prev }) };
  addEventListener('keydown', e => {
    if (e.target.closest('input, textarea, select')) return;
    const h = handlers[0]; if (!h) return;
    if ([' ', 'ArrowRight', 'PageDown'].includes(e.key)) { e.preventDefault(); h.next && h.next(); }
    if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); h.prev && h.prev(); }
  });
})();
