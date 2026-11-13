// Guardrails. Everything here runs before a single page is written, so a
// mistake in a content file stops the build and the live site stays as it was.
// Messages are written for the person editing content, not for a programmer.
import fs from 'node:fs';
import path from 'node:path';
import { THUMB, VIEW } from './html.mjs';

const SECTIONS = ['about', 'contact', 'faq'];
const CORE_PAGES = ['home', 'design', 'photo', 'video', 'case-studies'];
const RESERVED = ['/contact/', '/faq/', '/about/', '/privacy/', '/accessibility/', '/brand-standards/', '/assets/', '/ebay/', '/admin/'];
const BLOCKS = ['sec', 'owned', 'stats', 'video', 'videos', 'bleed', 'people', 'reel', 'gallery', 'note', 'compare', 'duo', 'duocard', 'credits', 'boards', 'steps'];
const YT = /^[A-Za-z0-9_-]{11}$/;
const DASH = String.fromCharCode(0x2014);

export function validate(c, ROOT) {
  const errors = [], warnings = [];
  const err = (where, msg) => errors.push(`${where}: ${msg}`);
  const warn = (where, msg) => warnings.push(`${where}: ${msg}`);
  const has = url => fs.existsSync(path.join(ROOT, decodeURIComponent(url.split('?')[0])));
  const flagged = new Set();
  const text = (where, v, { required = true } = {}) => {
    if (v == null || v === '') { if (required) err(where, 'is empty. It needs some text.'); return; }
    if (typeof v !== 'string') return err(where, 'should be text.');
    if (v.includes(DASH)) { err(where, 'contains an em dash. Use a comma, colon, or period instead.'); flagged.add(v); }
    if (/ {2,}/.test(v)) err(where, 'has two spaces in a row.');
    if (v !== v.trim()) err(where, 'starts or ends with a space.');
  };
  const youtube = (where, id) => { if (!YT.test(id || '')) err(where, `"${id}" is not a YouTube video ID. It is the 11 characters after "v=" or "youtu.be/" in the link.`); };
  const image = (where, src, { variants = ['THUMBS'] } = {}) => {
    if (!src || typeof src !== 'string') return err(where, 'has no image.');
    if (!src.startsWith('/ASSETS/')) return err(where, `image "${src}" must live in the ASSETS folder.`);
    if (!has(src)) return err(where, `image file not found: ${decodeURIComponent(src)}`);
    for (const v of variants) { const f = v === 'THUMBS' ? THUMB(src) : VIEW(src); if (f !== src && !has(f)) warn(where, `no ${v === 'THUMBS' ? 'small' : 'large'} web copy yet for ${decodeURIComponent(src).split('/').pop()}. The full-size file is used until one is made.`); }
  };
  const alt = (where, v) => { text(where, v); if (typeof v === 'string' && /["<>]/.test(v)) err(where, 'cannot contain quote marks or angle brackets.'); };
  const roles = (where, list) => { if (!Array.isArray(list) || !list.length) return err(where, 'needs at least one credit.'); list.forEach((r, i) => text(`${where} ${i + 1}`, r)); };
  const galleryItems = (where, list, variants) => {
    if (!Array.isArray(list) || !list.length) return err(where, 'is empty.');
    const seen = new Set();
    list.forEach((it, i) => { const w = `${where}, image ${i + 1}`; image(w, it.image, { variants }); alt(`${w} description`, it.alt);
      if (seen.has(it.image)) err(w, 'is listed twice.'); seen.add(it.image); });
  };
  /* every piece of text anywhere in the content gets the house rules */
  const sweep = (where, v) => {
    if (typeof v === 'string') { if (!/^(\/|https?:|mailto:)/.test(v)) { if (v.includes(DASH) && !flagged.has(v)) err(where, 'contains an em dash. Use a comma, colon, or period instead.'); } }
    else if (Array.isArray(v)) v.forEach((x, i) => sweep(`${where} [${i + 1}]`, x));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) sweep(`${where} > ${k}`, x);
  };

  /* ---------- pages ---------- */
  const all = [...c.pages, ...c.studies];
  for (const id of CORE_PAGES) if (!c.pages.some(p => p.id === id)) err('content/pages.json', `the "${id}" page is missing. The site needs it.`);
  const ids = new Set(), paths = new Map();
  for (const p of all) {
    const w = `Page "${p.id}"`;
    if (!/^[a-z][a-z0-9-]*$/.test(p.id || '')) err(w, 'has an invalid id.');
    if (ids.has(p.id)) err(w, 'id is used twice.'); ids.add(p.id);
    if (p.id === 'home' ? p.path !== '/' : !/^\/([a-z0-9]+(-[a-z0-9]+)*\/)+$/.test(p.path || ''))
      err(w, `address "${p.path}" is not valid. Use lowercase letters, numbers, and hyphens, starting and ending with a slash, like /my-page/.`);
    if (RESERVED.some(r => (p.path || '').toLowerCase().startsWith(r))) err(w, `address "${p.path}" is reserved for another part of the site.`);
    if (paths.has(p.path)) err(w, `uses the same address as "${paths.get(p.path)}".`); paths.set(p.path, p.id);
    text(`${w} search title`, p.seoTitle); text(`${w} search description`, p.seoDescription); text(`${w} short description`, p.shortDescription);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.lastmod || '')) err(w, 'last-changed date should look like 2026-11-12.');
    if (p.id !== 'home' && !p.blocks) { text(`${w} heading`, p.heading); text(`${w} intro`, p.lede); }
  }
  for (const p of c.staticPages) if (!has(path.join('src/static', p.path, 'index.html'))) err('content/pages.json', `static page ${p.path} has no file.`);

  /* ---------- navigation ---------- */
  const navLink = (where, l) => {
    text(`${where} label`, l.label);
    if (l.page) { if (!ids.has(l.page)) err(where, `points to a page called "${l.page}", which does not exist.`); }
    else if (l.section) { if (!SECTIONS.includes(l.section)) err(where, `points to a home section called "${l.section}". Choose about, contact, or faq.`); }
    else if (!['email', 'instagram', 'linkedin', 'latestFilm'].includes(l.link)) err(where, 'is not a page, a home section, or a known link.');
  };
  if (!c.nav.menu.length) err('Menu', 'is empty.');
  c.nav.menu.forEach((m, i) => { const w = `Menu item ${i + 1}`; navLink(w, m); if (m.link) err(w, 'the menu can hold pages and home sections only.'); });
  c.nav.footer.forEach((col, i) => { text(`Footer column ${i + 1} heading`, col.heading); col.links.forEach((l, k) => navLink(`Footer column ${i + 1}, link ${k + 1}`, l)); });

  /* ---------- site ---------- */
  for (const k of ['name', 'email', 'footerLine', 'footerCta', 'jobTitle', 'bio']) text(`Site settings > ${k}`, c.site[k]);
  for (const k of ['url', 'instagram', 'linkedin']) if (!/^https:\/\/[^\s"]+$/.test(c.site[k] || '')) err(`Site settings > ${k}`, 'should be a full https:// address.');
  if (c.site.url.endsWith('/')) err('Site settings > url', 'should not end with a slash.');
  if (!/^mailto:[^\s"]+$/.test(c.site.emailLink || '')) err('Site settings > emailLink', 'should start with mailto:');
  youtube('Site settings > latest film', c.site.latestFilm);
  if (!has(c.site.shareImage)) err('Site settings > share image', 'file not found.');

  /* ---------- home ---------- */
  const h = c.home;
  if (!h.slides.length) err('Home > header images', 'needs at least one.');
  h.slides.forEach((s, i) => { const w = `Home > header image ${i + 1}`;
    if (!s.image || !has(s.image)) err(w, `file not found: ${decodeURIComponent(s.image || '')}`);
    if (s.focusY && !/^\d{1,3}%$/.test(s.focusY)) err(w, 'focus point should be a percentage like 21%.'); });
  for (const k of ['location', 'mark', 'since']) text(`Home > hero line "${k}"`, h.heroMeta[k]);
  for (const k of ['design', 'photo', 'video']) for (const f of ['eyebrow', 'title', 'more']) text(`Home > ${k} section > ${f}`, h[k][f]);
  galleryItems('Home > design highlights', h.design.picks, ['THUMBS']);
  galleryItems('Home > photo highlights', h.photo.picks, ['THUMBS']);
  youtube('Home > featured video', h.video.feature.youtube); alt('Home > featured video description', h.video.feature.alt);
  text('Home > about > title', h.about.title); text('Home > about > eyebrow', h.about.eyebrow); text('Home > about > button', h.about.cta);
  if (!h.about.paragraphs.length) err('Home > about', 'needs at least one paragraph.');
  h.about.paragraphs.forEach((p, i) => text(`Home > about > paragraph ${i + 1}`, p));
  image('Home > about > portrait', h.about.portrait.image, { variants: ['VIEW'] }); alt('Home > about > portrait description', h.about.portrait.alt);
  text('Home > contact > heading', h.contact.heading);
  if (!h.faq.items.length) err('Home > FAQ', 'needs at least one question.');
  h.faq.items.forEach((it, i) => { text(`FAQ ${i + 1} question`, it.question); text(`FAQ ${i + 1} answer`, it.answer);
    if (it.html && !it.html.startsWith('<p>')) err(`FAQ ${i + 1} custom layout`, 'should start with <p>.'); });

  /* ---------- galleries ---------- */
  galleryItems('Design page', c.design.items, ['THUMBS']);
  galleryItems('Photo page', c.photo.items, ['THUMBS']);

  /* ---------- video ---------- */
  const v = c.video, seenFilm = new Set();
  v.featured.forEach((f, i) => { const w = `Video > featured film ${i + 1}`; youtube(w, f.youtube); text(`${w} title`, f.title); alt(`${w} description`, f.alt); roles(`${w} credit`, f.roles); if (f.flag) text(`${w} flag`, f.flag); });
  if (!v.films.length) err('Video > films', 'the grid is empty.');
  v.films.forEach((f, i) => { const w = `Video > film ${i + 1}`; youtube(w, f.youtube); text(`${w} title`, f.title); roles(`${w} credit`, f.roles);
    if (/["<>]/.test(f.title || '')) err(`${w} title`, 'cannot contain straight double quotes or angle brackets. Curly quotes are fine.');
    if (seenFilm.has(f.youtube)) err(w, 'is in the grid twice.'); seenFilm.add(f.youtube); if (f.thumb) image(`${w} custom thumbnail`, f.thumb); });
  text('Video > films heading', v.filmsHeading); text('Video > series heading', v.seriesHeading);
  const sid = new Set();
  v.series.forEach((s, i) => { const w = `Video > series ${i + 1}`; text(`${w} title`, s.title); text(`${w} blurb`, s.blurb); text(`${w} brand`, s.brand); roles(`${w} credit`, s.roles);
    if (!/^[A-Za-z][\w-]*$/.test(s.id || '') || sid.has(s.id)) err(w, 'needs its own id.'); sid.add(s.id);
    if (!/^https:\/\/(www\.)?youtube\.com\/playlist\?list=[\w-]+$/.test(s.url || '')) err(`${w} link`, 'should be a YouTube playlist link, like https://www.youtube.com/playlist?list=...');
    if (!Number.isInteger(s.count) || s.count < 1) err(`${w} video count`, 'should be a whole number.');
    if (!Array.isArray(s.thumbs) || s.thumbs.length !== 4) err(`${w} thumbnails`, 'the stack shows exactly four videos.'); else s.thumbs.forEach((id, k) => youtube(`${w} thumbnail ${k + 1}`, id)); });

  /* ---------- case studies ---------- */
  if (!c.studies.length) err('Case studies', 'there are none.');
  c.studies.forEach(s => { const w = `Case study "${s.card ? s.card.title : s.id}"`;
    if (!/^\d{4}-\d{2}(-\d{2})?$/.test(s.datePublished || '')) err(w, 'publish date should look like 2026-01-13 or 2026-01.');
    text(`${w} card title`, s.card.title); text(`${w} card line`, s.card.line); image(`${w} card image`, s.card.image);
    text(`${w} kicker`, s.kicker); text(`${w} title`, s.title); text(`${w} tagline`, s.tagline); text(`${w} subject`, s.about);
    image(`${w} header image`, s.hero, { variants: ['VIEW'] }); alt(`${w} header image description`, s.heroAlt);
    if (!['chart', 'blue', 'fuch'].includes(s.accent)) err(`${w} accent`, 'should be chart, blue, or fuch.');
    (s.lockups || []).forEach(([src, a], i) => { image(`${w} logo ${i + 1}`, src); alt(`${w} logo ${i + 1} description`, a); });
    if (!Array.isArray(s.facts) || s.facts.length < 3) err(`${w} facts`, 'needs at least three.');
    (s.blocks || []).forEach((b, i) => { const bw = `${w}, block ${i + 1}`;
      if (!BLOCKS.includes(b.t)) return err(bw, `"${b.t}" is not a known block type.`);
      if (b.yt) youtube(bw, b.yt);
      if (b.t === 'bleed') image(bw, b.img, { variants: ['VIEW'] });
      if (['reel', 'boards', 'gallery'].includes(b.t)) (b.items || []).forEach(([src], k) => image(`${bw}, image ${k + 1}`, src, { variants: b.t === 'gallery' ? ['THUMBS'] : ['VIEW'] }));
      if (b.t === 'duo') (b.items || []).forEach(([src], k) => image(`${bw}, image ${k + 1}`, src, { variants: ['VIEW'] }));
      if (b.t === 'compare') (b.pairs || []).forEach((p, k) => { image(`${bw}, pair ${k + 1} first image`, p.a, { variants: ['VIEW'] }); image(`${bw}, pair ${k + 1} second image`, p.b, { variants: ['VIEW'] }); });
      if (b.t === 'people') (b.items || []).forEach((it, k) => image(`${bw}, person ${k + 1}`, it[4]));
      if (b.t === 'videos') (b.items || []).forEach((it, k) => { if (it.yt) youtube(`${bw}, video ${k + 1}`, it.yt); if (it.thumb && it.thumb.startsWith('/') && !has(it.thumb)) err(`${bw}, video ${k + 1}`, 'thumbnail file not found.'); });
    });
  });
  for (const [name, part] of Object.entries({ 'Site settings': c.site, Home: c.home, Video: c.video, Navigation: c.nav, Pages: c.pages, 'Case studies': c.studies })) sweep(name, part);

  /* ---------- redirects, and the promise that no published address ever dies ---------- */
  const live = new Set([...all.map(p => p.path), ...c.staticPages.map(p => p.path)]);
  for (const d of fs.readdirSync(path.join(ROOT, 'src/static'), { withFileTypes: true })) if (d.isDirectory()) live.add(`/${d.name}/`);
  const from = new Map();
  c.redirects.forEach((r, i) => { const w = `Redirect ${i + 1}`;
    if (!/^\/[^\s]*$/.test(r.from || '') || !/^\/[^\s]*$/.test(r.to || '')) return err(w, 'both addresses should start with a slash and contain no spaces.');
    if (live.has(r.from)) err(w, `"${r.from}" is a real page, so it cannot also be a redirect.`);
    if (from.has(r.from)) err(w, `"${r.from}" is redirected twice.`); from.set(r.from, r.to); });
  const resolve = p => { const seen = new Set(); while (from.has(p)) { if (seen.has(p)) return null; seen.add(p); p = from.get(p); } return p; };
  for (const [a] of from) { const end = resolve(a);
    if (end === null) err('Redirects', `"${a}" goes round in a circle.`);
    else if (!live.has(end) && !['/contact', '/faq', '/about'].includes(end)) err('Redirects', `"${a}" ends at "${end}", which is not a page.`); }
  for (const p of c.published) { const end = resolve(p);
    if (end === null || !live.has(end)) err('Addresses', `"${p}" has been live and people may have the link. It no longer exists and nothing redirects it. Add a redirect from "${p}" to the page that replaced it.`); }

  return { errors, warnings };
}

/* After the pages are written: every internal link and file reference must land. */
export function checkLinks(DIST, redirectsText) {
  const errors = [];
  const rules = redirectsText.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')).map(l => l.split(/\s+/)[0]);
  const sources = new Set(rules);
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? (['ASSETS', 'ebay'].includes(e.name) ? [] : walk(path.join(d, e.name))) : e.name.endsWith('.html') ? [path.join(d, e.name)] : []);
  const exists = url => { let p; try { p = decodeURIComponent(url.split(/[?#]/)[0]); } catch (e) { return false; }
    if (sources.has(p) || sources.has(p + '/') || sources.has(p.replace(/\/$/, ''))) return true;
    const f = path.join(DIST, p);
    return fs.existsSync(f) && (fs.statSync(f).isFile() || fs.existsSync(path.join(f, 'index.html'))); };
  for (const file of walk(DIST)) {
    const html = fs.readFileSync(file, 'utf8').replace(/<script\b(?![^>]*ld\+json)[\s\S]*?<\/script>/g, '');
    const seen = new Set();
    for (const m of html.matchAll(/\s(?:href|src|data-src|data-bg|content)="(\/[^"\/][^"]*|\/)"/g)) {
      const url = m[1]; if (seen.has(url)) continue; seen.add(url);
      if (!exists(url)) errors.push(`${path.relative(DIST, file)}: links to ${url}, which does not exist.`);
    }
  }
  return errors;
}
