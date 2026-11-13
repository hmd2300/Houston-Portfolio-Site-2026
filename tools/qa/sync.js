// Build guard. Each page is built twice in practice: once ahead of time for the
// page a visitor lands on, and once by the page script for a page they click
// through to. This compares the two, region by region, so the build-time
// markup and the page script can never drift apart unnoticed.
const { chromium, serve, wire } = require('./harness.js');
const path = require('path');
const REPO = path.resolve(__dirname, '../..'); const ROOT = process.argv[2] || path.join(REPO, 'dist'); const PORT = 8833, O = 'http://localhost:' + PORT;
const C = require('./content.js')(REPO);
let pass = 0, fail = 0; const fails = []; const ok = (c, m) => { if (c) pass++; else { fail++; fails.push(m); } };

/* runs in the page: a region's markup with everything that legitimately differs removed */
const snapshot = ([sel, asSet]) => {
  const host = document.querySelector(sel); if (!host) return null;
  const el = host.cloneNode(true);
  el.querySelectorAll('*').forEach(n => {
    ['width', 'height', 'loading', 'fetchpriority', 'style', 'data-label', 'data-built', 'data-filled', 'data-mounted', 'data-got', 'data-src-set'].forEach(a => n.removeAttribute(a));
    n.classList.remove('in'); if (!n.getAttribute('class')) n.removeAttribute('class');
    if (n.classList.contains('tile') && n.hasAttribute('aria-label')) n.setAttribute('aria-label', n.getAttribute('aria-label').replace(/, \d+ of \d+$/, ''));
    if (n.classList.contains('idx')) n.textContent = '';
    if (n.tagName === 'IFRAME') n.remove();
  });
  const html = n => n.outerHTML.replace(/\s+/g, ' ').replace(/> </g, '><').trim();
  return asSet ? [...el.children].map(html).sort() : [...el.children].map(html);
};

(async () => {
  const srv = await serve(ROOT, PORT); const b = await chromium.launch();
  const regions = [
    ['video', '#filmGrid', false, 'film grid'],
    ['case-studies', '#csGrid', false, 'case study cards'],
    ['design', '#view-design [data-grid]', true, 'design grid'],
    ['photo', '#view-photo [data-grid]', true, 'photo grid'],
    ...C.studies.map(s => [s.id, `[data-study="${s.id}"]`, false, `${s.card.title} body`]),
  ];
  for (const [view, sel, asSet, name] of regions) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); await wire(ctx, { theme: 'dark' });
    const landed = await ctx.newPage(); await landed.goto(O + C.path(view), { waitUntil: 'load' }); await landed.waitForTimeout(1500);
    const A = await landed.evaluate(snapshot, [sel, asSet]);
    const via = await ctx.newPage(); await via.goto(O + '/', { waitUntil: 'load' }); await via.waitForTimeout(1500);
    if (C.studies.some(s => s.id === view)) { await via.evaluate(() => document.querySelector('a[data-view="case-studies"]').click()); await via.waitForTimeout(600); }
    await via.evaluate(v => document.querySelector('a[data-view="' + v + '"]').click(), view); await via.waitForTimeout(1500);
    const B = await via.evaluate(snapshot, [sel, asSet]);
    const same = A && B && A.length === B.length && A.every((x, i) => x === B[i]);
    let where = '';
    if (!same && A && B) { const i = A.findIndex((x, k) => x !== B[k]); let j = 0; const a = A[i] || '', c = B[i] || ''; while (j < a.length && a[j] === c[j]) j++;
      where = ` (item ${i + 1} of ${A.length}/${B.length}: built "${a.slice(Math.max(0, j - 60), j + 80)}" vs script "${c.slice(Math.max(0, j - 60), j + 80)}")`; }
    ok(same, `${name}: the pre-built page and the page script produce the same markup${where}`);
    await ctx.close();
  }
  await b.close(); srv.close();
  console.log(`\n${pass} passed, ${fail} failed`); fails.forEach(f => console.log('  FAIL ' + f));
  process.exit(fail ? 1 : 0);
})();
