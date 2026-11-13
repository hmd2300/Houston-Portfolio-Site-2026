const { chromium, serve, wire } = require('./harness.js');
const fs = require('fs'), path = require('path');
const REPO = path.resolve(__dirname, '../..');
const ROOT = process.argv[2] || path.join(REPO, 'dist');
const C = require('./content.js')(REPO);
const SER = C.video.series[0], NVIEWS = C.all.length;
let pass = 0, fail = 0; const fails = [];
const ok = (c, m) => { if (c) pass++; else { fail++; fails.push(m); } };
const ROUTES = C.all.map(p => p.path);
const SOLO = C.solo;
const fileOf = r => ROOT + (r.endsWith('/') ? r + 'index.html' : r);
const PL = SER.url;
(async () => {
  // ---------- static ----------
  for (const r of ROUTES){
    const s = fs.readFileSync(fileOf(r), 'utf8');
    ok((s.match(/id="i-ig"/g)||[]).length === 1 && (s.match(/id="i-li"/g)||[]).length === 1, r + ' sprite defined once');
    ok(!/clip0_17/.test(s), r + ' no leftover clip ids');
    ok((s.match(/class="social-btn"/g)||[]).length === 2 * NVIEWS + 2, r + ' two social buttons per footer plus the menu pair');
    ok(s.split('id="' + SER.id + '"').length === 2, r + ' series block once');
    ok(s.indexOf('id="' + SER.id + '"') > s.indexOf('id="filmGrid"'), r + ' series sits after the film grid');
    ok(!/—/.test(s.slice(s.indexOf('id="' + SER.id + '"'), s.indexOf('id="' + SER.id + '"') + 3000)), r + ' no em dash in series copy');
    ok(s.split(' data-goal="LinkedIn Click" data-goal-source="Footer">').length - 1 === 2 * NVIEWS, r + ' LinkedIn icon and text link in every footer');
    const ids = (s.match(/\sid="([^"]+)"/g)||[]); ok(new Set(ids).size === ids.length, r + ' no duplicate ids (' + (ids.length - new Set(ids).size) + ')');
  }
  for (const r of SOLO){
    const s = fs.readFileSync(fileOf(r), 'utf8');
    ok((s.match(/id="i-ig"/g)||[]).length === 1, r + ' sprite once');
    ok((s.match(/class="social-btn"/g)||[]).length === 2, r + ' 2 social buttons');
  }
  ok(fs.readFileSync(ROOT + '/index.html','utf8').includes('"sameAs":' + JSON.stringify([C.site.instagram, C.site.linkedin])), 'schema sameAs has both profiles');

  const srv = await serve(ROOT, 8709);
  const b = await chromium.launch();
  const errs = [];
  const lum = c => { const [r,g,bb] = c.match(/[\d.]+/g).slice(0,3).map(v => { v/=255; return v<=.03928? v/12.92 : Math.pow((v+.055)/1.055,2.4); }); return .2126*r+.7152*g+.0722*bb; };
  const cr = (a,b2) => { const A = lum(a), B = lum(b2); return (Math.max(A,B)+.05)/(Math.min(A,B)+.05); };

  // ---------- overflow sweep: every page, both themes ----------
  for (const theme of ['dark','light']) for (const w of [320,360,375,390,414,768,1024,1280,1440,1920]){
    const ctx = await b.newContext({ viewport:{ width:w, height:800 } }); await wire(ctx, { theme });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    for (const r of [...ROUTES, ...SOLO]){
      await p.goto('http://localhost:8709' + r, { waitUntil:'domcontentloaded' }); await p.waitForTimeout(250);
      const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok(o <= 0, `${r} ${theme} ${w}: horizontal overflow ${o}px`);
    }
    await ctx.close();
  }

  // ---------- menu icons ----------
  for (const [w,h] of [[1440,900],[390,844],[320,568]]){
    const ctx = await b.newContext({ viewport:{ width:w, height:h } }); await wire(ctx, { theme:'dark' });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:8709/', { waitUntil:'load' }); await p.waitForTimeout(500);
    const closed = await p.evaluate(() => [...document.querySelectorAll('#fmenuItems a, #fmenuItems button')].filter(e => getComputedStyle(e).visibility !== 'hidden').length);
    ok(closed === 0, `${w} closed menu holds no focusable items (${closed})`);
    await p.click('#fmenuBar'); await p.waitForTimeout(700);
    const m = await p.evaluate(() => {
      const q = s => document.querySelector(s).getBoundingClientRect();
      const ig = q('.m-social-l .social-btn'), li = q('.m-social-r .social-btn'), sw = q('#themeSwitch'), box = q('#fmenuBox');
      const items = [...document.querySelectorAll('.m-item')]; const last = items[items.length-1].getBoundingClientRect();
      const foc = [...document.querySelectorAll('#fmenuItems a, #fmenuItems button')].map(e => e.getAttribute('aria-label') || e.textContent.trim());
      return { ig:[ig.left,ig.top,ig.width,ig.height], li:[li.left,li.top,li.width,li.height], sw:[sw.left,sw.top,sw.width,sw.height], box:[box.left,box.top,box.right,box.bottom], lastBottom:last.bottom, foc };
    });
    const cy = r => r[1] + r[3]/2;
    ok(m.ig[2] === 44 && m.ig[3] === 44 && m.li[2] === 44, `${w} menu icons are 44px`);
    ok(Math.abs(cy(m.ig) - cy(m.sw)) < 1 && Math.abs(cy(m.li) - cy(m.sw)) < 1, `${w} menu icons share the switch centre line`);
    ok(m.ig[0] + 44 <= m.sw[0] - 8 && m.li[0] >= m.sw[0] + m.sw[2] + 8, `${w} icons flank the switch with a gutter`);
    ok(m.ig[0] >= m.box[0] + 12 && m.li[0] + 44 <= m.box[2] - 12 && m.ig[1] + 44 <= m.box[3] - 8, `${w} icons inside the panel`);
    ok(m.ig[1] - m.lastBottom >= 8, `${w} icons clear the last menu link (${Math.round(m.ig[1] - m.lastBottom)}px)`);
    const iIG = m.foc.findIndex(t => /Instagram/.test(t)), iSW = m.foc.findIndex(t => /Switch to/.test(t)), iLI = m.foc.findIndex(t => /LinkedIn/.test(t));
    ok(iIG >= 0 && iIG < iSW && iSW < iLI, `${w} tab order is Instagram, switch, LinkedIn`);
    const hit = await p.evaluate(() => { const r = document.querySelector('.m-social-r .social-btn').getBoundingClientRect(); const e = document.elementFromPoint(r.left + 22, r.top + 22); return !!e.closest('.social-btn'); });
    ok(hit, `${w} LinkedIn icon is the hit target`);
    const glyph = await p.evaluate(() => { const u = document.querySelector('.m-social-l use'); const r = u.getBoundingClientRect(); return [r.width, r.height]; });
    ok(glyph[0] > 10 && glyph[1] > 10, `${w} glyph paints (${glyph})`);
    // escape returns focus to the toggle
    await p.focus('.m-social-l .social-btn'); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.activeElement.id === 'fmenuBar'), `${w} Escape returns focus to the menu toggle`);
    if (w === 1440){
      await p.click('#fmenuBar'); await p.waitForTimeout(600);
      const [pop] = await Promise.all([ ctx.waitForEvent('page', { timeout: 4000 }).catch(() => null), p.click('.m-social-r .social-btn') ]);
      ok(!!pop, 'LinkedIn opens a new tab'); ok(p.url() === 'http://localhost:8709/', 'site tab does not navigate away');
      if (pop) await pop.close();
    }
    await ctx.close();
  }

  // ---------- footer icons ----------
  for (const theme of ['dark','light']) for (const w of [320,390,1440]){
    const ctx = await b.newContext({ viewport:{ width:w, height:800 } }); await wire(ctx, { theme });
    const p = await ctx.newPage();
    for (const r of ['/', '/video/']){
      await p.goto('http://localhost:8709' + r, { waitUntil:'load' }); await p.waitForTimeout(400);
      const f = await p.evaluate(() => {
        const foot = document.querySelector('.view.on footer') || document.querySelector('footer');
        const cta = foot.querySelector('.foot-cta').getBoundingClientRect(); const bs = [...foot.querySelectorAll('.social-btn')];
        const cs = getComputedStyle(bs[0]); const bg = getComputedStyle(document.body).backgroundColor;
        return { n: bs.length, sameRow: bs.every(x => Math.abs((x.getBoundingClientRect().top + 22) - (cta.top + cta.height/2)) < 1.5), sizes: bs.map(x => x.getBoundingClientRect().width), color: cs.color, bg,
          attrs: bs.every(x => x.target === '_blank' && /noopener/.test(x.rel) && /opens in a new tab/.test(x.getAttribute('aria-label')) && x.dataset.goalSource === 'Footer') };
      });
      ok(f.n === 2 && f.sameRow, `${r} ${theme} ${w} footer icons share the CTA row`);
      ok(f.sizes.every(s => s === 44), `${r} ${theme} ${w} footer icons 44px`);
      ok(f.attrs, `${r} ${theme} ${w} footer icons: new tab, rel, label, tracked`);
      ok(cr(f.color, f.bg) >= 3, `${r} ${theme} ${w} glyph contrast ${cr(f.color, f.bg).toFixed(1)}`);
    }
    for (const r of SOLO){
      await p.goto('http://localhost:8709' + r, { waitUntil:'load' }); await p.waitForTimeout(300);
      const f = await p.evaluate(() => { const bs = [...document.querySelectorAll('footer .social-btn')]; return { n: bs.length, vis: bs.every(x => { const r = x.getBoundingClientRect(); return r.width === 44 && r.right <= innerWidth && r.left >= 0; }) }; });
      ok(f.n === 2 && f.vis, `${r} ${theme} ${w} footer icons visible in page`);
    }
    await ctx.close();
  }
  { // hover fill
    const ctx = await b.newContext({ viewport:{ width:1440, height:800 } }); await wire(ctx, { theme:'dark' });
    const p = await ctx.newPage(); await p.goto('http://localhost:8709/video/', { waitUntil:'load' });
    const el = p.locator('.view.on footer .social-btn').first(); await el.scrollIntoViewIfNeeded(); await el.hover(); await p.waitForTimeout(500);
    const c = await el.evaluate(e => [getComputedStyle(e).backgroundColor, getComputedStyle(e).color]);
    ok(c[0] === 'rgb(255, 18, 69)' && c[1] === 'rgb(247, 249, 250)', 'hover fills fuchsia with a snow glyph ' + c);
    await ctx.close();
  }

  // ---------- series stack ----------
  for (const theme of ['dark','light']) for (const [w,h] of [[320,640],[360,740],[390,844],[768,900],[1024,800],[1240,800],[1440,900],[1920,1080]]){
    const ctx = await b.newContext({ viewport:{ width:w, height:h } }); await wire(ctx, { theme });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:8709/video/', { waitUntil:'load' }); await p.waitForTimeout(500);
    const top = await p.evaluate(() => { const v = document.getElementById('view-video'); const s = document.querySelector('#view-video .series'); return { first: v.querySelector('.video-wrap').getBoundingClientRect().top + scrollY, grid: document.getElementById('filmGrid').getBoundingClientRect().bottom + scrollY, ser: s.getBoundingClientRect().top + scrollY }; });
    ok(top.ser > top.grid && top.grid > top.first, `${theme} ${w} series sits below the hero film and the film grid`);
    await p.evaluate(() => document.querySelector('#view-video .series').scrollIntoView({ block:'center' })); await p.waitForTimeout(1300);
    const m = await p.evaluate(() => {
      const s = document.querySelector('#view-video .series'); const R = e => e.getBoundingClientRect();
      const st = s.querySelector('.series-stack'), body = s.querySelector('.series-body'); const cards = [...st.querySelectorAll('.card')].map(R);
      const deck = { l: Math.min(...cards.map(c => c.left)), r: Math.max(...cards.map(c => c.right)), t: Math.min(...cards.map(c => c.top)), b: Math.max(...cards.map(c => c.bottom)) };
      const br = R(body), sec = R(s), flag = st.querySelector('.flag'), fcs = getComputedStyle(flag);
      const grid = R(document.querySelector('#filmGrid .vcard')); const h3a = s.querySelector('h3 a'); const pcs = getComputedStyle(s.querySelector('.series-body p:not(.mono)'));
      const roles = [...s.querySelectorAll('.role')].map(R);
      return { in: s.classList.contains('in'), op: getComputedStyle(s).opacity, deck, body:[br.left,br.top,br.right,br.bottom], sec:[sec.left,sec.top,sec.right,sec.bottom], secH: sec.height,
        cards: cards.length, loaded: [...st.querySelectorAll('img')].every(i => i.complete && i.naturalWidth > 0), flagBg: fcs.backgroundColor, flagFg: fcs.color, flagTxt: flag.textContent.trim(),
        gridL: grid.left, gridW: grid.width, front: [cards[cards.length-1].left, cards[cards.length-1].width], href: st.href, target: st.target, rel: st.rel, label: st.getAttribute('aria-label'),
        h3: [getComputedStyle(h3a).color, h3a.href, h3a.target], pcol: pcs.color, bg: getComputedStyle(document.body).backgroundColor, pfs: pcs.fontSize,
        rolesIn: roles.every(r => r.right <= sec.right + .5), vh: innerHeight, heroH: R(document.querySelector('#view-video .vcard')).height };
    });
    ok(m.in && m.op === '1', `${theme} ${w} series reveals on scroll`);
    ok(m.cards === SER.thumbs.length && m.loaded, `${theme} ${w} deck has all its thumbnails loaded`);
    ok(m.deck.r <= m.sec[2] + .5 && m.deck.l >= m.sec[0] - .5, `${theme} ${w} deck stays inside the section (${Math.round(m.deck.r)} vs ${Math.round(m.sec[2])})`);
    ok(m.deck.t >= m.sec[1] - .5, `${theme} ${w} deck does not climb out of its row`);
    const side = m.body[0] >= m.deck.r - .5; const stacked = m.body[1] >= m.deck.b - .5;
    ok(side || stacked, `${theme} ${w} deck and text never overlap`);
    if (w >= 760) ok(side && m.body[0] - m.deck.r >= 16, `${theme} ${w} text sits beside the deck with a gutter (${Math.round(m.body[0] - m.deck.r)}px)`);
    else ok(stacked && m.body[1] - m.deck.b >= 16, `${theme} ${w} text sits under the deck with a gutter`);
    ok(Math.abs(m.deck.l - m.gridL) < 1, `${theme} ${w} deck left edge lines up with the film grid`);
    if (w >= 760) ok(Math.abs(m.deck.r - (m.gridL + m.gridW)) < 1.5, `${theme} ${w} deck right edge lines up with film column one (${Math.round(m.deck.r)} vs ${Math.round(m.gridL + m.gridW)})`);
    ok(m.href === PL && m.target === '_blank' && /noopener/.test(m.rel) && m.label.includes(SER.count + ' videos') && /new tab/.test(m.label), `${theme} ${w} stack link: playlist, new tab, labelled`);
    ok(m.h3[1] === PL && m.h3[2] === '_blank', `${theme} ${w} title links to the playlist`);
    ok(m.flagTxt.includes(SER.count + ' videos') && cr(m.flagFg, m.flagBg) >= 4.5, `${theme} ${w} count flag readable (${cr(m.flagFg, m.flagBg).toFixed(1)})`);
    ok(cr(m.h3[0], m.bg) >= 4.5, `${theme} ${w} title contrast ${cr(m.h3[0], m.bg).toFixed(1)}`);
    ok(cr(m.pcol, m.bg) >= 4.5, `${theme} ${w} body contrast ${cr(m.pcol, m.bg).toFixed(1)}`);
    ok(m.rolesIn, `${theme} ${w} role chips stay inside`);
    if (w >= 760) ok(m.secH <= m.heroH * 1.15, `${theme} ${w} block is no taller than one film card (${Math.round(m.secH)} vs ${Math.round(m.heroH)})`);
    else ok(m.secH <= m.vh * .95, `${theme} ${w} block fits in one phone screen (${Math.round(m.secH)} of ${m.vh})`);
    if (w === 1440){
      // keyboard: focus ring and fan
      await p.focus('.series-stack'); await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab'); await p.waitForTimeout(700);
      const f = await p.evaluate(() => { const st = document.querySelector('.series-stack'); return { act: document.activeElement === st, out: getComputedStyle(st).outlineStyle, tf: getComputedStyle(st.querySelector('.c4')).transform, fl: getComputedStyle(st.querySelector('.c4')).filter }; });
      ok(f.act && f.out !== 'none', `${theme} keyboard focus shows a ring on the stack`);
      ok(f.fl === 'none', `${theme} focus lifts the dimming on the back cards`);
      const [pop] = await Promise.all([ ctx.waitForEvent('page', { timeout: 4000 }).catch(() => null), p.keyboard.press('Enter') ]);
      ok(!!pop, `${theme} Enter on the stack opens a new tab`); if (pop) await pop.close();
    }
    await ctx.close();
  }
  { // arriving through the menu from home, not by direct load
    const ctx = await b.newContext({ viewport:{ width:1440, height:900 } }); await wire(ctx, { theme:'dark' });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:8709/', { waitUntil:'load' }); await p.waitForTimeout(600);
    await p.click('#fmenuBar'); await p.waitForTimeout(500); await p.click('.m-item[data-view="video"]'); await p.waitForTimeout(1200);
    ok(/\/video\/?$/.test(p.url()), 'menu navigation reaches /video');
    await p.evaluate(() => document.querySelector('#view-video .series').scrollIntoView({ block:'center' })); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => { const s = document.querySelector('#view-video .series'); return { in: s.classList.contains('in'), op: getComputedStyle(s).opacity, w: s.getBoundingClientRect().width, cards: document.querySelectorAll('#filmGrid .vcard').length }; });
    ok(r.in && r.op === '1' && r.w > 300, 'series reveals after in-site navigation from home');
    ok(r.cards === C.video.films.length, 'film grid builds a card for every film');
    await ctx.close();
  }
  { // reduced motion: deck is dealt, nothing hidden
    const ctx = await b.newContext({ viewport:{ width:1440, height:900 }, reducedMotion:'reduce' }); await wire(ctx, { theme:'dark' });
    const p = await ctx.newPage(); await p.goto('http://localhost:8709/video/', { waitUntil:'load' }); await p.waitForTimeout(500);
    await p.evaluate(() => document.querySelector('#view-video .series').scrollIntoView({ block:'center' })); await p.waitForTimeout(900);
    const r = await p.evaluate(() => { const s = document.querySelector('#view-video .series'); return { op: getComputedStyle(s).opacity, tf: getComputedStyle(s.querySelector('.c4')).transform }; });
    ok(r.op === '1' && r.tf !== 'none', 'reduced motion: series visible and deck dealt');
    await ctx.close();
  }
  ok(errs.length === 0, 'no script errors: ' + errs.slice(0,3).join(' | '));
  await b.close(); srv.close();
  console.log(`\n${pass} passed, ${fail} failed`); fails.forEach(f => console.log('  FAIL ' + f));
  process.exit(fail ? 1 : 0);
})();
