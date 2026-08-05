/* qa_theme.js
   Both-themes guard for houstondragna.com. Run with:
     node qa_theme.js [baseURL]
   Default baseURL http://localhost:8000. Requires playwright.
   Every check runs twice: dark (no data-theme attribute) and light
   (data-theme="light"), because the Aug 5 2026 incident shipped a build
   that passed every existing harness in one scheme and was broken in the
   other. Keep this in the QA set; do NOT publish it to the live site. */

const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8000';

let pass = 0, fail = 0;
const ok = (cond, label) => {
  if (cond) { pass++; }
  else { fail++; console.log('  FAIL  ' + label); }
};

async function checkTheme(browser, scheme) {
  const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));

  /* ---- home ---- */
  await page.goto(BASE + '/index.html');
  await page.waitForTimeout(3800);

  const r = await page.evaluate(() => {
    const de = document.documentElement, cs = getComputedStyle(de);
    const box = document.querySelector('#fmenuBox');
    const br = box ? box.getBoundingClientRect() : null;
    const x = document.querySelector('.xfield .x');
    const xcs = x ? getComputedStyle(x, '::before') : null;
    const dark = de.getAttribute('data-theme') !== 'light';
    const vis = el => el && getComputedStyle(el).display !== 'none';
    const olive = [];
    document.querySelectorAll('body *').forEach(el => {
      const c = getComputedStyle(el).color;
      if (c === 'rgb(90, 94, 0)') olive.push(el.className);
    });
    return {
      theme: de.getAttribute('data-theme'),
      fontVar: cs.getPropertyValue('--font-display').trim(),
      padVar: cs.getPropertyValue('--pad').trim(),
      chromeTop: cs.getPropertyValue('--chrome-top').trim(),
      crossVar: cs.getPropertyValue('--cross').trim(),
      crossBg: xcs ? xcs.backgroundColor : null,
      crossOpacity: x ? getComputedStyle(x).opacity : null,
      boxY: br ? Math.round(br.y) : -1,
      logoDarkShown: vis(document.querySelector('.lg-d')),
      logoLightShown: vis(document.querySelector('.lg-l')),
      prePct: (() => { const p = document.querySelector('.pre-pct'); return p ? getComputedStyle(p).color : null; })(),
      ink: cs.getPropertyValue('--ink').trim(),
      oliveCount: olive.length
    };
  });

  const light = scheme === 'light';
  ok(r.theme === (light ? 'light' : null), `${scheme}: boot theme attribute`);
  ok(r.fontVar.includes('Archivo'), `${scheme}: --font-display resolves on :root (seam-bug guard)`);
  ok(r.padVar.includes('clamp'), `${scheme}: --pad resolves`);
  ok(r.chromeTop !== '', `${scheme}: --chrome-top resolves`);
  ok(r.boxY === 12, `${scheme}: nav pill pinned in the chrome band (got y=${r.boxY})`);
  ok(light ? r.crossBg === 'rgb(0, 21, 255)' : r.crossBg === 'rgb(233, 245, 0)',
     `${scheme}: cross colour (got ${r.crossBg})`);
  ok(light ? r.crossOpacity === '0.5' : r.crossOpacity === '0.21',
     `${scheme}: cross opacity (got ${r.crossOpacity})`);
  ok(light ? (!r.logoDarkShown && r.logoLightShown) : (r.logoDarkShown && !r.logoLightShown),
     `${scheme}: theme logo swap (dark shown=${r.logoDarkShown}, light shown=${r.logoLightShown})`);
  ok(r.oliveCount === 0, `${scheme}: no olive #5A5E00 text anywhere (found ${r.oliveCount})`);

  /* preloader percentage must use page ink, not hardcoded snow */
  if (r.prePct) {
    const inkRGB = light ? 'rgb(21, 22, 28)' : 'rgb(247, 249, 250)';
    ok(r.prePct === inkRGB, `${scheme}: preloader % uses --ink (got ${r.prePct})`);
  }

  /* morph colour must come from the theme palette */
  const morph = await page.evaluate(() => {
    const m = document.querySelector('.morph b, .morph span, .morph');
    return m ? getComputedStyle(m).color : null;
  });
  const paletteD = ['rgb(233, 245, 0)', 'rgb(255, 18, 69)', 'rgb(247, 249, 250)', 'rgb(0, 21, 255)'];
  const paletteL = ['rgb(0, 17, 204)', 'rgb(179, 0, 42)', 'rgb(21, 22, 28)', 'rgb(0, 21, 255)'];
  if (morph) ok((light ? paletteL : paletteD).includes(morph),
     `${scheme}: morph colour in theme palette (got ${morph})`);

  /* ---- toggle interaction (home, once per scheme) ---- */
  const box = await page.$('#fmenuBox');
  const bb = await box.boundingBox();
  await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.waitForTimeout(800);
  const sw = await page.$('.theme-switch');
  ok(!!sw, `${scheme}: theme switch present in open menu`);
  if (sw) {
    const knob = await page.evaluate(() => {
      const k = document.querySelector('.theme-knob');
      const img = k ? k.querySelector('img:not([style*="display: none"])') : null;
      const shown = k ? [...k.querySelectorAll('img')].filter(i => getComputedStyle(i).display !== 'none') : [];
      return { bg: k ? getComputedStyle(k).backgroundColor : null, shown: shown.map(i => i.className) };
    });
    ok(knob.bg === 'rgb(247, 249, 250)', `${scheme}: knob is snow (got ${knob.bg})`);
    ok(knob.shown.length === 1 && knob.shown[0].includes(light ? 'tk-d' : 'tk-l'),
       `${scheme}: knob shows the OPPOSITE theme logo (shown=${knob.shown})`);
    const sb = await sw.boundingBox();
    await page.mouse.click(sb.x + sb.width / 2, sb.y + sb.height / 2);
    await page.waitForTimeout(700);
    const flipped = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    ok(flipped === (light ? null : 'light'), `${scheme}: toggle flips theme (now ${flipped})`);
    await page.mouse.click(sb.x + sb.width / 2, sb.y + sb.height / 2);
    await page.waitForTimeout(500);
  }

  /* ---- case study hero: on-image exception ---- */
  await page.goto(BASE + '/case-studies/studiolive-se/index.html');
  await page.waitForTimeout(3200);
  const hero = await page.evaluate(() => {
    const h = document.querySelector('.cs-top .cs-title');
    const k = document.querySelector('.cs-top .cs-kicker');
    const b = document.querySelector('.cs-top .back');
    const own = document.querySelector('.owned-card b');
    const tag = document.querySelector('.cs-top .cs-tag');
    const dt = document.querySelector('.cs-top .cs-facts dt');
    const c = el => el ? getComputedStyle(el).color : null;
    return { h: c(h), k: c(k), b: c(b), own: c(own), tag: c(tag), dt: c(dt) };
  });
  ok(hero.h === 'rgb(247, 249, 250)', `${scheme}: hero title snow over imagery (got ${hero.h})`);
  ok(hero.k === 'rgb(233, 245, 0)', `${scheme}: hero kicker chartreuse over imagery (got ${hero.k})`);
  ok(hero.tag === 'rgb(247, 249, 250)', `${scheme}: hero standfirst snow (got ${hero.tag})`);
  ok(hero.dt === 'rgba(247, 249, 250, 0.6)', `${scheme}: hero facts labels legible (got ${hero.dt})`);
  ok(light ? hero.own === 'rgb(0, 17, 204)' : hero.own === 'rgb(233, 245, 0)',
     `${scheme}: unified study accent on owned-card (got ${hero.own})`);

  ok(errs.length === 0, `${scheme}: zero page errors (${errs.slice(0, 2)})`);
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  await checkTheme(browser, 'dark');
  await checkTheme(browser, 'light');
  await browser.close();
  console.log(`\nqa_theme: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
