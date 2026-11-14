const { chromium, serve, wire } = require('./harness.js');
const fs = require('fs'), path = require('path'); const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const REPO = path.resolve(__dirname, '../..'); const ROOT = process.argv[2] || path.join(REPO, 'dist'); const PORT = 8811, O = 'http://localhost:' + PORT;
const C = require('./content.js')(REPO);
const bare = p => p.replace(/\/$/, ''); const SUBPATHS = C.all.filter(p => p.path !== '/').map(p => C.rx(bare(p.path)));
const SEG = [...new Set(C.all.filter(p => p.path !== '/').map(p => C.rx(p.path.split('/')[1])))].join('|');
const S1 = C.studies[Math.min(1, C.studies.length - 1)], S2 = C.studies[C.studies.length - 1];
const FILMS = C.video.films, FEAT = C.video.featured, NPH = C.photo.items.length, YT = id => 'https://www.youtube.com/watch?v=' + id;
let pass = 0, fail = 0; const fails = []; const ok = (c, m) => { if (c) pass++; else { fail++; fails.push(m); } };
const ALL = Object.fromEntries(C.all.map(p => [p.path, p.id])); const SUB = Object.fromEntries(C.all.filter(p => p.id !== 'home').map(p => [p.path, p.id])); const SUBV = Object.values(SUB); const fileOf = r => ROOT + r + 'index.html';
(async () => {
  // ---------- static: URLs, schema, copy ----------
  const sm = fs.readFileSync(ROOT + '/sitemap.xml', 'utf8'); const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  for (const [r, v] of Object.entries(ALL)){
    const s = fs.readFileSync(fileOf(r), 'utf8'); const want = C.site.url + r;
    const can = (s.match(/<link rel="canonical" href="([^"]+)"/) || [])[1]; const og = (s.match(/<meta property="og:url" content="([^"]+)"/) || [])[1];
    ok(can === want, r + ' canonical is the slashed address (' + can + ')'); ok(og === want, r + ' og:url matches canonical');
    ok(locs.includes(want), r + ' sitemap lists the canonical address');
    ok(!new RegExp('href="(' + SUBPATHS.join('|') + ')"').test(s), r + ' no internal link points at a redirecting address');
    let ld = null; try { ld = JSON.parse(s.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]); } catch(e){}
    ok(!!ld, r + ' structured data parses');
    const urls = JSON.stringify(ld).match(new RegExp(C.rx(C.site.url) + '/(' + SEG + ')[^"]*', 'g')) || [];
    ok(urls.every(u => /\/(#[a-z]+)?$/.test(u)), r + ' structured data uses slashed addresses ' + urls.filter(u => !/\/(#[a-z]+)?$/.test(u)).slice(0,2));
    ok(C.home.faq.items.every(it => s.includes('<summary><span>' + C.html(it.question) + '</span>')), r + ' carries every FAQ question from the content');
    ok(!/aria-posinset|aria-setsize="/.test(s.replace(/<script[\s\S]*?<\/script>/g, '')), r + ' no position attributes in the markup');
    ok(new RegExp('<noscript><style>[\\s\\S]*#view-' + v + '\\{display:block').test(s), r + ' no-script fallback targets its own page');
  }
  { const s = fs.readFileSync(ROOT + '/index.html', 'utf8'); const ld = JSON.parse(s.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]); const P = ld['@graph'].find(x => x['@type'] === 'Person'); const F = ld['@graph'].find(x => x['@type'] === 'FAQPage');
    ok(P.jobTitle === C.site.jobTitle, 'profile data carries the current title'); ok(!/specialising/.test(JSON.stringify(P)), 'profile data uses US spelling');
    const plain = C.home.faq.items.find(it => !it.html && !/\n/.test(it.answer)); const q = F.mainEntity.find(x => x.name === plain.question); const html = s.slice(s.indexOf('class="faq-list')).match(new RegExp(C.rx(C.html(plain.question)) + '[\\s\\S]*?<p[^>]*>([\\s\\S]*?)<\\/p>')); const strip = t => t.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
    ok(q && html && strip(q.acceptedAnswer.text) === strip(html[1]), 'FAQ answer matches between the page and its structured data'); }
  ok(!/raw\.githubusercontent/.test(fs.readFileSync(path.join(ROOT, '_headers'), 'utf8')), 'security policy no longer allows the unused image host');
  ok(/November 2026/.test(fs.readFileSync(ROOT + '/privacy/index.html', 'utf8')) && /embedded players are loaded from YouTube/.test(fs.readFileSync(ROOT + '/privacy/index.html', 'utf8')), 'privacy page dated and describes YouTube players');
  ok(!/2026-08-07/.test(sm), 'sitemap dates refreshed');
  const red = fs.readFileSync(ROOT + '/_redirects', 'utf8'); { const rules = red.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')).map(l => l.split(/\s+/)); const from = new Set(rules.map(x => x[0]));
    const lands = t => from.has(t) || fs.existsSync(path.join(ROOT, t.endsWith('/') ? t + 'index.html' : t));
    const dead = rules.filter(x => x[2] === '301' && !lands(x[1])).map(x => x[0] + ' to ' + x[1]);
    ok(dead.length === 0 && /^\/contact\s+\/index\.html\s+200$/m.test(red), 'every redirect lands on a real address; scroll routes untouched ' + dead.slice(0, 3)); }

  const lum = c => { const [r,g,bb] = c.match(/[\d.]+/g).slice(0,3).map(v => { v/=255; return v<=.03928? v/12.92 : Math.pow((v+.055)/1.055,2.4); }); return .2126*r+.7152*g+.0722*bb; };
  const cr = (a,b2) => { const A = lum(a), B = lum(b2); return (Math.max(A,B)+.05)/(Math.min(A,B)+.05); };
  const srv = await serve(ROOT, PORT); const b = await chromium.launch(); const errs = [];
  const open = async (opts, theme) => { const ctx = await b.newContext(opts); await wire(ctx, theme === null ? {} : { theme: theme || 'dark' }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); return [ctx, p]; };

  // ---------- 1. images: only the landing page's own ----------
  for (const [label, vp, dpr] of [['mobile', { width:390, height:844 }, 3], ['desktop', { width:1440, height:900 }, 1]]) for (const r of Object.keys(ALL)){
    const [ctx, p] = await open({ viewport: vp, deviceScaleFactor: dpr, isMobile: label === 'mobile' }); const sz = {};
    p.on('response', async rs => { if (rs.request().resourceType() === 'image' && rs.url().startsWith(O)) { try { sz[rs.url()] = (await rs.body()).length; } catch(e){} } });
    const t0 = Date.now(); await p.goto(O + r, { waitUntil:'commit' }); await p.waitForFunction(() => document.body && document.body.classList.contains('ready'), null, { timeout: 15000 }).catch(() => {}); const tReady = Date.now() - t0;
    await p.waitForTimeout(5200);   // past the idle warm-up window
    const m = await p.evaluate(() => { const act = document.querySelector('.view.on'); const s = new Set(); act.querySelectorAll('img').forEach(i => s.add(i.currentSrc || i.src)); document.querySelectorAll('header img, .brand img, #corner img, .fmenu img').forEach(i => s.add(i.currentSrc || i.src)); act.querySelectorAll('.slide').forEach(e => { const m = getComputedStyle(e).backgroundImage.match(/url\("([^"]+)"\)/); if (m) s.add(m[1]); }); return { used: [...s], view: act.id, slidesGot: document.querySelectorAll('.slide[data-got]').length, slides: document.querySelectorAll('.slide').length, eagerAct: act.querySelectorAll('img[loading=eager]').length }; });
    const U = new Set(m.used); let off = 0, offN = 0, on = 0; const offList = []; for (const [u, n] of Object.entries(sz)){ if (U.has(u)) on += n; else if (!/\/Logos\//.test(u) && !(r === '/video/' && /\/PAGES\/Video\//.test(u))) { off += n; offN++; offList.push(decodeURIComponent(u.split('/').slice(-2).join('/'))); } }
    ok(m.view === 'view-' + ALL[r], `${label} ${r} lands on its own page`);
    ok(tReady < 4000, `${label} ${r} preloader clears (${tReady}ms)`);
    if (r === '/'){ ok(m.slidesGot === m.slides && m.slides >= 4, `${label} home still loads every hero slide (${m.slidesGot}/${m.slides})`); ok(m.eagerAct >= 12, `${label} home highlight rows stay eager (${m.eagerAct})`); }
    else { ok(offN === 0, `${label} ${r} loads no images for other pages (${offN}, ${Math.round(off/1024)}KB) ${offList.slice(0,3)}`); ok(m.slidesGot === 0, `${label} ${r} fetches no hero slides`); }
    await ctx.close();
  }
  // ---------- going home from a subpage still works ----------
  for (const [label, vp] of [['mobile', { width:390, height:844 }], ['desktop', { width:1440, height:900 }]]){
    const [ctx, p] = await open({ viewport: vp }); await p.goto(O + '/video/', { waitUntil:'load' }); await p.waitForTimeout(2500);
    await p.click('#fmenuBar'); await p.waitForTimeout(900);
    ok(await p.evaluate(() => !!document.querySelector('.slide[data-got]')), `${label} opening the menu warms the first hero slide`);
    await p.click('.m-item[data-view="home"]'); await p.waitForTimeout(1500);
    const h = await p.evaluate(() => ({ path: location.pathname, view: document.querySelector('.view.on').id, bg: getComputedStyle(document.querySelector('.slide.active')).backgroundImage.slice(0, 5) }));
    ok(h.path === '/' && h.view === 'view-home', `${label} menu returns home`); ok(h.bg === 'url("', `${label} hero is painted on arrival`);
    await p.waitForTimeout(4500); ok(await p.evaluate(() => document.querySelectorAll('.slide[data-got]').length === document.querySelectorAll('.slide').length), `${label} remaining slides load once home is open`);
    await p.evaluate(async () => { const g = document.querySelector('#design [data-grid]'); g.scrollIntoView({ block:'center' }); await new Promise(r => setTimeout(r, 1800)); });
    ok(await p.evaluate(() => [...document.querySelectorAll('#design [data-grid] img')].slice(0, 4).every(i => i.complete && i.naturalWidth > 0)), `${label} home highlight images load when scrolled to`);
    await p.evaluate(async () => { document.querySelector('#view-home .portrait').scrollIntoView({ block:'center' }); await new Promise(r => setTimeout(r, 1500)); });
    ok(await p.evaluate(() => { const i = document.querySelector('#view-home .portrait img'); return !i.hasAttribute('data-src') && i.complete && i.naturalWidth > 0; }), `${label} About photo loads once home is open`);
    ok(await p.evaluate(() => document.querySelectorAll('#view-home img[data-src]').length === 0), `${label} no home image is left without a source`);
    await ctx.close();
  }
  // ---------- 3. addresses in the browser ----------
  { const [ctx, p] = await open({ viewport:{ width:1440, height:900 } }); await p.goto(O + '/', { waitUntil:'load' }); await p.waitForTimeout(2500);
    for (const [r, v] of Object.entries(SUB)){
      await p.evaluate(v => document.querySelector('a[data-view="' + v + '"]').click(), v); await p.waitForTimeout(350);
      ok(await p.evaluate(() => location.pathname) === r, `in-site navigation to ${v} uses ${r}`);
      ok(await p.evaluate(v => [...document.querySelectorAll('a[data-view="' + v + '"]')].every(a => a.getAttribute('href').endsWith('/')), v), `links to ${v} carry the slash`);
    }
    await p.goBack(); await p.waitForTimeout(500); ok(await p.evaluate(() => document.querySelector('.view.on').id) === 'view-' + SUBV[SUBV.length - 2], 'back button steps through history');
    for (const [url, want] of [[bare(C.path('design')), 'view-design'], [bare(S1.path), 'view-' + S1.id], ['/contact', 'view-home'], ['/faq', 'view-home'], ['/about', 'view-home'], ['/#/' + S2.id, 'view-' + S2.id], ['/#/video', 'view-video']]){
      await p.goto(O + url, { waitUntil:'load' }); await p.waitForTimeout(1900); ok(await p.evaluate(() => document.querySelector('.view.on').id) === want, `${url} opens ${want}`); }
    await p.goto(O + '/contact', { waitUntil:'load' }); await p.waitForTimeout(3500); ok(await p.evaluate(() => { const r = document.getElementById('contact').getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0 && location.pathname === '/contact'; }), '/contact scrolls to the form and keeps its address');
    await ctx.close(); }
  // ---------- 2 + 7. viewer focus and grid names ----------
  for (const how of ['direct', 'in-site']){
    const [ctx, p] = await open({ viewport:{ width:1440, height:900 } });
    if (how === 'direct') await p.goto(O + '/photo/', { waitUntil:'load' }); else { await p.goto(O + '/', { waitUntil:'load' }); await p.waitForTimeout(2500); await p.evaluate(() => document.querySelector('a[data-view="photo"]').click()); }
    await p.waitForTimeout(2500);
    const g = await p.evaluate(() => { const t = [...document.querySelectorAll('#view-photo .tile')]; return { n: t.length, pos: t.filter(x => x.hasAttribute('aria-posinset') || x.hasAttribute('aria-setsize')).length, first: t[0].getAttribute('aria-label'), last: t[t.length-1].getAttribute('aria-label'), twice: t.filter(x => /of \d+, \d+ of/.test(x.getAttribute('aria-label'))).length }; });
    ok(g.n === NPH && g.pos === 0, `${how}: photo tiles carry no invalid attributes`); ok(new RegExp('^View .+, 1 of ' + NPH + '$').test(g.first) && g.last.endsWith(', ' + NPH + ' of ' + NPH) && g.twice === 0, `${how}: tiles announce their position (${g.first.slice(-12)})`);
    const tile = p.locator('#view-photo .tile').nth(2); await tile.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(800);
    const o = await p.evaluate(() => { const lb = document.getElementById('lb'), lbImg = document.getElementById('lbImg'); return ({ on: lb.classList.contains('on'), focusIn: lb.contains(document.activeElement), inert: [...document.body.children].filter(n => n !== lb && !/^(SCRIPT|STYLE|LINK|NOSCRIPT)$/.test(n.tagName)).every(n => n.inert), lbInert: lb.inert || !!lb.closest('[inert]'), img: lbImg.complete && lbImg.naturalWidth > 0 }); });
    ok(o.on && o.focusIn && o.img, `${how}: viewer opens with focus inside and its image loaded`); ok(o.inert && !o.lbInert, `${how}: page behind the viewer is inert`);
    const seq = []; for (let i = 0; i < 7; i++){ await p.keyboard.press('Tab'); seq.push(await p.evaluate(() => document.getElementById('lb').contains(document.activeElement) ? document.activeElement.id : 'OUT')); }
    ok(seq.every(x => x !== 'OUT') && new Set(seq).size === 3, `${how}: Tab cycles the three viewer buttons (${seq.slice(0,4)})`);
    await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Shift+Tab'); ok(await p.evaluate(() => document.getElementById('lb').contains(document.activeElement)), `${how}: Shift+Tab stays inside too`);
    const src0 = await p.evaluate(() => document.getElementById('lbImg').src); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(400); ok(await p.evaluate(s0 => document.getElementById('lbImg').src !== s0, src0), `${how}: arrow keys still step the viewer`);
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    const c = await p.evaluate(() => ({ on: document.getElementById('lb').classList.contains('on'), inert: document.querySelectorAll('[inert]').length, back: document.activeElement.classList.contains('tile'), locked: document.body.classList.contains('locked') }));
    ok(!c.on && c.inert === 0 && c.back && !c.locked, `${how}: Escape closes, frees the page, and returns focus to the tile`);
    await p.locator('#view-photo .tile').nth(5).click(); await p.waitForTimeout(600); await p.click('#lbClose'); await p.waitForTimeout(400); ok(await p.evaluate(() => !document.getElementById('lb').classList.contains('on') && document.querySelectorAll('[inert]').length === 0), `${how}: close button frees the page`);
    await p.evaluate(() => { document.querySelector('a[data-view="design"]').click(); document.querySelector('a[data-view="photo"]').click(); }); await p.waitForTimeout(500); ok(await p.evaluate(() => [...document.querySelectorAll('#view-photo .tile')].every(t => !/of \d+, \d+ of/.test(t.getAttribute('aria-label')))), `${how}: position text never doubles up`);
    await ctx.close();
  }
  // ---------- 6. without JavaScript ----------
  for (const [r, v] of Object.entries(ALL)){
    const ctx = await b.newContext({ viewport:{ width:390, height:844 }, javaScriptEnabled:false }); await wire(ctx, {}); const p = await ctx.newPage(); await p.goto(O + r, { waitUntil:'load' }); await p.waitForTimeout(400);
    const m = await p.evaluate(v => { const pre = document.getElementById('preloader'); const act = document.getElementById('view-' + v); const h1 = act.querySelector('h1') || document.querySelector('h1'); const hr = h1.getBoundingClientRect(); return { pre: getComputedStyle(pre).display, shown: getComputedStyle(act).display, others: [...document.querySelectorAll('.view')].filter(x => x !== act && getComputedStyle(x).display !== 'none').length, h1: hr.height > 0 && +getComputedStyle(h1).opacity > 0, text: act.innerText.length, scroll: getComputedStyle(document.body).overflowY, hidden: [...act.querySelectorAll('.reveal')].filter(e => +getComputedStyle(e).opacity < 1).length }; }, v);
    ok(m.pre === 'none' && m.scroll !== 'hidden', `no-JS ${r}: preloader gone and page scrolls`); ok(m.shown === 'block' && m.others === 0, `no-JS ${r}: its own page is the one showing`); ok(m.h1 && m.text > 150 && m.hidden === 0, `no-JS ${r}: heading and copy are visible (${m.text} chars)`);
    await ctx.close();
  }
  // ---------- targets, headings, axe ----------
  { const [ctx, p] = await open({ viewport:{ width:390, height:844 }, hasTouch:true });
    await p.goto(O + '/video/', { waitUntil:'load' }); await p.waitForTimeout(1500); ok(await p.evaluate(() => document.querySelector('.series-body h3 a').getBoundingClientRect().height >= 24), 'series title link clears the 24px target minimum');
    for (const r of ['/privacy/', '/accessibility/']){ await p.goto(O + r, { waitUntil:'load' }); await p.waitForTimeout(300); const t = await p.evaluate(() => [...document.querySelectorAll('a')].filter(a => { const r = a.getBoundingClientRect(); return r.width > 0 && getComputedStyle(a).display !== 'inline' && (r.height < 24); }).map(a => a.textContent.trim().slice(0,20) + ' ' + Math.round(a.getBoundingClientRect().height))); ok(t.length === 0, `${r} standalone links clear 24px ${t}`);
      ok(await p.evaluate(() => { const s = document.querySelector('footer .social-btn').getBoundingClientRect(); return s.width === 44 && s.height === 44; }), `${r} footer icons unchanged at 44px`); ok(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${r} no sideways scroll after the padding change`); }
    for (const r of Object.keys(ALL)){ await p.goto(O + r, { waitUntil:'load' }); await p.waitForTimeout(2000); const h = await p.evaluate(() => { const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }; const hs = [...document.querySelectorAll('h1,h2,h3,h4')].filter(vis).map(h => +h.tagName[1]); let skip = 0, prev = 0; hs.forEach(l => { if (prev && l > prev + 1) skip++; prev = l; }); return { h1: hs.filter(l => l === 1).length, skip }; }); ok(h.h1 === 1 && h.skip === 0, `${r} one main heading, no skipped levels`); }
    await ctx.close(); }
  const KNOWN = new Set(['color-contrast', 'region', 'scrollable-region-focusable']);
  for (const theme of ['dark', 'light']) for (const [label, vp] of [['m', { width:390, height:844 }], ['d', { width:1440, height:900 }]]){
    const [ctx, p] = await open({ viewport: vp }, theme);
    for (const r of [...Object.keys(ALL), '/privacy/', '/accessibility/']){
      await p.goto(O + r, { waitUntil:'load' }); await p.waitForTimeout(2000); await p.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += innerHeight){ scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } scrollTo(0, 0); }); await p.waitForTimeout(1800); await p.evaluate(AXE);
      const v = await p.evaluate(async () => (await axe.run(document, { runOnly:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice'] })).violations.map(v => ({ id: v.id, n: v.nodes.length, t: v.nodes.slice(0,3).map(n => n.target.join(' ').slice(0,140)) })));
      const fresh = v.filter(x => !KNOWN.has(x.id)); ok(fresh.length === 0, `axe ${theme} ${label} ${r}: ${fresh.map(x => x.id + ' x' + x.n + ' ' + x.t).join('; ')}`);
      const cc = v.find(x => x.id === 'color-contrast'); ok(!cc || cc.t.every(t => /foot-coord|foot-std/.test(t)), `axe ${theme} ${label} ${r}: only the two declared footer labels miss contrast ${cc ? cc.t : ''}`);
    }
    await ctx.close();
  }
  { const [ctx, p] = await open({ viewport:{ width:1440, height:900 }, reducedMotion:'reduce' }); await p.goto(O + '/photo/', { waitUntil:'load' }); await p.waitForTimeout(2600); await p.mouse.wheel(0, 500); await p.waitForTimeout(1200); ok(await p.evaluate(() => document.body.classList.contains('ready') && +getComputedStyle(document.querySelector('#view-photo .tile img')).opacity === 1), 'reduced motion: page ready and tiles visible'); await ctx.close(); }
  { const [ctx, p] = await open({ viewport:{ width:1440, height:900 } }, null); await p.goto(O + '/', { waitUntil:'load' }); await p.waitForTimeout(800); ok(await p.evaluate(() => document.documentElement.getAttribute('data-theme') !== 'light'), 'dark is still the default theme'); await ctx.close(); }
  // ---------- featured pair on the Video page ----------
  { const WANT = FEAT.map(f => ({ yt: f.youtube, t: f.title, roles: f.roles, flag: f.flag || '' })); const LAST = FILMS[FILMS.length - 1];
    for (const r of Object.keys(ALL)){ const s = fs.readFileSync(fileOf(r), 'utf8'); ok((s.match(/class="film-feat"/g) || []).length === WANT.length && FILMS.every(f => !s.includes('<figure class="tile video-wrap reveal" data-yt="' + f.youtube + '">') || WANT.some(x => x.yt === f.youtube)), r + ' carries the featured films and no grid film as a hero'); ok(s.includes('const FILMS = [\n {"yt":"' + FILMS[0].youtube + '"'), r + ' film list leads with the first film in the content'); ok(FILMS.every(f => s.split('{"yt":"' + f.youtube + '"').length === 2) && !FILMS.some(f => /\u2014/.test(f.title)), r + ' every film listed once, no em dash in a title'); }
    for (const theme of ['dark', 'light']) for (const [w, h] of [[320, 640], [390, 844], [768, 900], [1024, 800], [1440, 900], [1920, 1080]]){
      const [ctx, p] = await open({ viewport:{ width:w, height:h } }, theme); await p.goto(O + '/video/', { waitUntil:'load' }); await p.waitForTimeout(2600);
      await p.evaluate(async () => { document.querySelector('#view-video .film-pair').scrollIntoView({ block:'start' }); await new Promise(r => setTimeout(r, 1500)); });
      const m = await p.evaluate(() => { const R = e => e.getBoundingClientRect(); const f = [...document.querySelectorAll('#view-video .film-feat')]; const bg = getComputedStyle(document.body).backgroundColor;
        return { n: f.length, figs: f.map(x => { const r = R(x.querySelector('figure')); return [r.left, r.top, r.width, r.height]; }), yt: f.map(x => x.querySelector('figure').dataset.yt), mounted: f.map(x => !!x.querySelector('figure').dataset.mounted),
          titles: f.map(x => x.querySelector('h2 a').textContent), hrefs: f.map(x => [x.querySelector('h2 a').href, x.querySelector('.video-open') ? x.querySelector('.video-open').href : x.querySelector('h2 a').href]), blank: f.every(x => [...x.querySelectorAll('a')].every(a => a.target === '_blank' && /noopener/.test(a.rel))),
          roles: f.map(x => [...x.querySelectorAll('.role')].map(e => e.textContent)), flags: f.map(x => (x.querySelector('.flag') || { textContent: '' }).textContent), h2h: f.map(x => R(x.querySelector('h2 a')).height), h2c: getComputedStyle(f[0].querySelector('h2 a')).color, bg,
          rolesIn: f.every(x => [...x.querySelectorAll('.role')].every(e => R(e).right <= R(x).right + .5)), capBelow: f.every(x => R(x.querySelector('.hero-film-cap')).top >= R(x.querySelector('figure')).bottom),
          sub: R(document.querySelector('#view-video .sub-head')).top, pairBottom: R(document.querySelector('#view-video .film-pair')).bottom, grid: R(document.getElementById('filmGrid')), cards: [...document.querySelectorAll('#filmGrid .vcard')].map(c => c.querySelector('.thumb').dataset.yt),
          lastCard: (() => { const c = [...document.querySelectorAll('#filmGrid .vcard')].pop(); return c && { t: c.querySelector('h3').textContent, href: c.querySelector('h3 a').href, roles: [...c.querySelectorAll('.role')].map(e => e.textContent).join(','), label: c.querySelector('.thumb').getAttribute('aria-label'), blank: [...c.querySelectorAll('a')].every(a => a.target === '_blank' && /noopener/.test(a.rel)) }; })(),
          firstCard: { t: document.querySelector('#filmGrid .vcard h3').textContent, href: document.querySelector('#filmGrid .vcard h3 a').href, roles: [...document.querySelector('#filmGrid .vcard').querySelectorAll('.role')].map(e => e.textContent) },
          heroes: document.querySelectorAll('#view-video .video-wrap').length, over: document.documentElement.scrollWidth - document.documentElement.clientWidth, h: (() => { const hs = [...document.querySelectorAll('#view-video h1, #view-video h2, #view-video h3')].map(x => +x.tagName[1]); let sk = 0, pv = 0; hs.forEach(l => { if (pv && l > pv + 1) sk++; pv = l; }); return sk; })() }; });
      const T = `${theme} ${w}`;
      ok(m.n === WANT.length && m.heroes === WANT.length && m.yt.join() === WANT.map(x => x.yt).join(), `${T} the featured films, in order, and nothing else at the top`);
      ok(WANT.every((x, i) => x.t === m.titles[i] && m.hrefs[i].every(h => h === YT(x.yt))) && m.blank, `${T} featured titles and links are right and open in a new tab`);
      ok(WANT.every((x, i) => JSON.stringify(m.roles[i]) === JSON.stringify(x.roles)), `${T} credits match what was given (${m.roles[1].slice(-2)})`);
      ok(m.roles.flat().every(x => !/edit|cam op|artist/i.test(x)), `${T} no editing, camera, or artist relations credit on the pair`);
      ok(m.mounted.every(Boolean), `${T} both featured players mount when in view`);
      if (w >= 760){ ok(Math.abs(m.figs[0][1] - m.figs[1][1]) < 1 && Math.abs(m.figs[0][2] - m.figs[1][2]) < 1 && m.figs[1][0] > m.figs[0][0] + m.figs[0][2], `${T} pair sits side by side at equal size`); ok(Math.abs(m.figs[0][0] - m.grid.left) < 1 && Math.abs(m.figs[1][0] + m.figs[1][2] - m.grid.right) < 1, `${T} pair spans the same edges as the film grid`); }
      else { ok(m.figs[1][1] > m.figs[0][1] + m.figs[0][3] && Math.abs(m.figs[0][2] - m.figs[1][2]) < 1, `${T} pair stacks on a phone, performance first`); }
      ok(m.figs.every(f => Math.abs(f[2] / f[3] - 16 / 9) < .02), `${T} featured frames hold 16:9`);
      ok(m.capBelow && m.rolesIn && m.sub >= m.pairBottom + 20, `${T} captions sit under their films and clear the next heading`);
      ok(m.h2h.every(x => x >= 24) && cr(m.h2c, m.bg) >= 4.5, `${T} featured titles are tappable and readable (${cr(m.h2c, m.bg).toFixed(1)})`);
      ok(m.flags.every((x, i) => x === WANT[i].flag), `${T} each carries its flag from the content`);
      ok(m.cards.join() === FILMS.map(f => f.youtube).join() && new Set(m.cards).size === FILMS.length, `${T} the film grid follows the content order, one card each`);
      ok(m.lastCard && m.lastCard.t === LAST.title && m.lastCard.href === YT(LAST.youtube) && m.lastCard.roles === LAST.roles.join(',') && m.lastCard.label === 'Watch ' + LAST.title && m.lastCard.blank, `${T} last card: title, link, credits, new tab`);
      ok(m.firstCard.t === FILMS[0].title && m.firstCard.href === YT(FILMS[0].youtube) && m.firstCard.roles.join() === FILMS[0].roles.join(), `${T} first card keeps its title, link, and credits`);
      ok(m.over <= 0 && m.h === 0, `${T} no sideways scroll and no skipped heading level`);
      await ctx.close();
    }
    { const [ctx, p] = await open({ viewport:{ width:1440, height:900 } }); await p.goto(O + '/', { waitUntil:'load' }); await p.waitForTimeout(2500); await p.evaluate(() => document.querySelector('a[data-view="video"]').click()); await p.waitForTimeout(2200);
      ok(await p.evaluate(([ids, n]) => [...document.querySelectorAll('#filmGrid .vcard .thumb')].map(t => t.dataset.yt).join() === ids && document.querySelectorAll('#view-video .film-feat figure[data-mounted]').length === n, [FILMS.map(f => f.youtube).join(), WANT.length]), 'arriving from home builds the same film grid and mounts the featured films'); await ctx.close(); }
  }
  ok(errs.length === 0, 'no script errors: ' + [...new Set(errs)].slice(0,3).join(' | '));
  await b.close(); srv.close();
  console.log(`\n${pass} passed, ${fail} failed`); fails.forEach(f => console.log('  FAIL ' + f));
  process.exit(fail ? 1 : 0);
})();
