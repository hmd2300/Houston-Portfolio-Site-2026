/* ---------- helpers ---------- */
const I = { grip: '<svg viewBox="0 0 24 24"><path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" stroke-width="3"/></svg>', x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  play: '<svg viewBox="0 0 24 24" style="width:26px;height:26px"><path d="M8 5v14l11-7z"/></svg>', plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>', go: '<svg class="go" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M12 16V4M6 10l6-6 6 6M4 20h16"/></svg>', cam: '<svg viewBox="0 0 24 24"><path d="M3 7h4l2-3h6l2 3h4v13H3z"/><circle cx="12" cy="13" r="4"/></svg>',
  pics: '<svg viewBox="0 0 24 24"><path d="M3 5h14v14H3zM7 3h14v14"/><path d="M3 15l4-4 4 4 2-2 4 4"/></svg>', site: '<svg viewBox="0 0 24 24"><path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z"/></svg>', tick: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>' };
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const clone = o => JSON.parse(JSON.stringify(o));
const $ = id => document.getElementById(id);
const ytId = v => { const t = String(v || '').trim(), m = t.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/); return m ? m[1] : (/^[A-Za-z0-9_-]{11}$/.test(t) ? t : null); };
const fileName = p => { try { p = decodeURIComponent(p); } catch (e) {} return String(p || '').split('/').pop().replace(/\.\w+$/, '').replace(/[+_]/g, ' '); };
const size = b => b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const MEDIA = SAMPLE.media, LIVE = SAMPLE.mode === 'site';
const media = p => (cur._up && cur._up[p]) || MEDIA[p] || null;
const BLOBS = new Map();                                  /* full-size copies of images added in this visit */
const BLANK = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3"/>');
const thumb = p => (media(p) || {}).t || BLANK;
const full = p => (BLOBS.get(p) || {}).url || thumb(p);
/* where each size of an image lives on the site, worked out the same way the site's build does */
function variantPaths(p, hero) { const m = String(p).match(/^\/ASSETS\/IMAGES\/PAGES\/(.+)\.(jpe?g|png|webp)$/i); if (!m) return {};
  const v = { view: `/ASSETS/IMAGES/IMAGE-VARIANTS/VIEW/${m[1]}.webp`, thumb: `/ASSETS/IMAGES/IMAGE-VARIANTS/THUMBS/${m[1]}.webp` };
  if (hero) v.hero = `/ASSETS/IMAGES/IMAGE-VARIANTS/HERO/${m[1].split('/').pop()}.webp`; return v; }
const metaLine = p => { const m = media(p); return m ? `${m.w} × ${m.h} · ${size(m.kb * 1024)}${m.n > 1 ? ` in ${m.n} sizes` : ''}` : ''; };

/* Does a page heading fit? Measured with the site's own type at the site's own sizes, not by counting letters. */
function fit(text) {
  const r = $('ruler'); let worst = 0, at = 0;
  for (const w of [390, 768, 1024, 1280, 1440, 1920]) { const fs = Math.min(220, Math.max(58, .17 * w)), pad = Math.min(64, Math.max(18, .045 * w));
    for (const word of String(text).split(/\s+/)) { r.textContent = word; const over = pad + r.offsetWidth * fs / 100 - w; if (over > worst) { worst = over; at = w; } } }
  return worst > 1 ? `Too wide for the page. On a ${at}px screen it would run about ${Math.round(worst)}px past the edge. Use a shorter word.` : '';
}
const RESERVED = ['/contact/', '/faq/', '/about/', '/privacy/', '/accessibility/', '/brand-standards/', '/assets/', '/ebay/', '/admin/'];
const NEED = 'This needs some text.';
const plain = (v, f) => { v = String(v == null ? '' : v); return !v.trim() ? (f.optional ? '' : NEED) : v.includes(DASH) ? 'No em dashes. Use a comma, colon, or period.' : / {2,}/.test(v) ? 'There are two spaces in a row.' : /[<>]/.test(v) ? 'No angle brackets.' : f.max && v.length > f.max ? `Keep this to ${f.max} characters. It is ${v.length}.` : f.rule === 'email' && !/^\S+@\S+\.\S+$/.test(v) ? 'That does not look like an email address.' : ''; };
const each = (v, f) => !(v && v.length) ? (f.optional ? '' : NEED) : f.rule === 'yt4' ? (v.length !== 4 ? `The stack shows exactly four videos. This has ${v.length}.` : v.every(ytId) ? '' : 'One of these is not a YouTube link or video ID.') : (v.map(p => plain(p, {})).find(Boolean) || '');
const opts = f => typeof f.options === 'function' ? f.options() : f.options;
const RULES = { text: plain, long: plain, lines: (v, f) => plain(v, f) || (/\n\s*\n/.test(v) ? 'Remove the empty line.' : ''), paras: each, list: each,
  heading: (v, f) => plain(v, f) || fit(v), alt: (v, f) => plain(v, f) || (/"/.test(v) ? 'No double quote marks.' : ''),
  youtube: (v, f) => ytId(v) || (!v && f.optional) ? '' : 'That does not look like a YouTube link or video ID.', chips: v => (v && v.length) ? '' : 'Add at least one.',
  path: v => !/^\/([a-z0-9]+(-[a-z0-9]+)*\/)+$/.test(v || '') ? 'Use lowercase letters, numbers, and hyphens with a slash at each end, like /my-page/.' : RESERVED.includes(v) ? 'That address is already used by another part of the site.' : '',
  number: v => Number.isInteger(+v) && +v > 0 ? '' : 'Use a whole number.', bool: () => '', focus: () => '',
  select: (v, f) => !v ? 'Choose one.' : opts(f).some(o => o[0] === v) ? '' : 'This points at something that is no longer there. Choose again.',
  url: v => /^https:\/\/\S+$/.test(v || '') ? '' : 'Use a full link starting with https://', image: (v, f) => v || f.optional ? '' : 'Choose an image.' };
const ruleOf = (f, v) => RULES[f.type](v, f);

/* ---------- state ---------- */
let uid = 0, cur, S = { ch: [], pr: [], changed: new Set(), bad: new Map() };
const itemNode = (def, it) => def.node ? def.node(it) : def.leaf;
function tag(node, data) { for (const p of node.parts) { if (p.kind === 'group') tag(p, p.key[0] === '~' ? data : data[p.key]); else data[p.key].forEach(it => { if (!it._id) it._id = 'i' + (++uid); tag(itemNode(p, it), it); }); } return data; }
let orig = tag(ROOT, clone(SAMPLE.content)); cur = clone(orig);
const KEY = 'hd-admin-draft-4';
try { const sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv && sv.home && sv.home.slides && sv.settings && sv.studies) { uid = 1e6; cur = tag(ROOT, sv); } } catch (e) { cur = clone(orig); }
let view = 'home', editing = null, pub = null; const hist = [], scrollMem = new Map();
try { const v = localStorage.getItem(KEY + '-view'); if (v) view = v; } catch (e) {}
const snap = () => { const j = JSON.stringify(cur); if (hist[hist.length - 1] !== j) { hist.push(j); if (hist.length > 40) hist.shift(); } };
function nameOf(it, def) { if (def && def.name) { const n = def.name(it); if (n) return n; } const im = it[(def && def.img) || 'image'];
  return first(it.title || it.label || it.question || it.heading || it.caption) || (im ? fileName(im) : it.alt) || `New ${def ? def.one : 'item'}`; }

/* A path names one thing: "navigation/footer/#i12/links/#i40". Keys step into the content, #ids pick a list item. */
function resolve(path, root) {
  let data = root || cur, node = ROOT, def = null, list = null; const trail = [];
  for (const st of path.split('/')) {
    if (st[0] === '#') { list = data; data = list.find(x => x._id === st.slice(1)); if (!data) return null; node = itemNode(def, data); trail.push(nameOf(data, def)); }
    else { def = node.parts.find(p => p.key === st); if (!def) return null; if (st[0] !== '~') data = data[st]; if (data == null) return null; if (def.kind === 'group') { node = def; trail.push(def.label); } }
  }
  return { data, node, def, list, trail };
}
const parentScreen = path => { const s = path.split('/'); if (s.length < 2) return null; s.pop(); while (s.length > 1 && s[s.length - 1][0] !== '#') s.pop(); return s.join('/'); };
const secOf = path => SECTIONS.find(s => s.key === path.split('/')[0]);

/* ---------- what changed, in plain words ---------- */
const same = (f, x, y) => f.type === 'bool' ? !!x === !!y : JSON.stringify(x == null ? '' : x) === JSON.stringify(y == null ? '' : y);
const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);
function say(f, x, y) { const l = f.label.toLowerCase(), short = v => typeof v === 'string' && v.length <= 44 && !v.includes('\n');
  if (f.type === 'bool') return y ? (f.yes || `${l} turned on`) : (f.no || `${l} turned off`);
  if (f.type === 'image') return x ? `${l} replaced` : `${l} added`;
  if (f.type === 'focus') return f.say || 'framing moved';
  if (f.type === 'chips') return `${l} are now ${y.join(', ') || 'empty'}`;
  if (f.type === 'select') { const o = opts(f); return `${l} changed to “${destName(y, o)}”`; }
  if (f.type === 'number') return `${l} changed from ${x} to ${y}`;
  if (!short(x || '') || !short(y || '')) return `${l} edited`;
  return !x ? `${l} set to “${y}”` : !y ? `${l} cleared` : `${l} changed from “${x}” to “${y}”`; }
function diff(node, a, b, ctx, ids, out, s) {
  const pre = ctx.length ? ctx.join(', ') + ': ' : '', put = (t, id, note) => out.push({ s, t: pre ? pre + t : cap1(t), ids: id ? [...ids, id] : ids, note });
  for (const f of node.fields) if (!same(f, a[f.k], b[f.k])) { put(say(f, a[f.k], b[f.k]));
    if (f.type === 'path' && a[f.k]) out.push({ s, ids, note: true, t: `The old address ${a[f.k]} will redirect to ${b[f.k]}. Menu and footer links update on their own.` }); }
  for (const p of node.parts) {
    if (p.kind === 'group') { const v = p.key[0] === '~'; diff(p, v ? a : a[p.key], v ? b : b[p.key], [...ctx, p.label], ids, out, s); continue; }
    const la = a[p.key], lb = b[p.key], A = new Map(la.map(x => [x._id, x])), B = new Map(lb.map(x => [x._id, x])), lp = (ctx.length ? ctx.join(', ') + ', ' : '') + p.label + ': ', q = x => `${p.one} “${nameOf(x, p)}”`;
    lb.filter(x => !A.has(x._id)).forEach(x => out.push({ s, ids: [...ids, x._id], t: lp + `added ${q(x)}` }));
    la.filter(x => !B.has(x._id)).forEach(x => { out.push({ s, ids, t: lp + `removed ${q(x)}` }); if (x.path) out.push({ s, ids, note: true, t: `The address ${x.path} will redirect to the Case Studies page.` }); });
    lb.filter(x => A.has(x._id)).forEach(x => { const o = A.get(x._id), ik = p.img || 'image', who = p.node ? `“${nameOf(x, p)}”` : `${ctx.length ? p.one : cap1(p.one)} “${nameOf(x, p)}”`;
      if (p.view === 'image' && o[ik] !== x[ik]) out.push({ s, ids: [...ids, x._id], t: (ctx.length ? ctx.join(', ') + ', ' : '') + who + ': image replaced' });
      diff(itemNode(p, x), o, x, [...ctx, who], [...ids, x._id], out, s); });
    const ca = la.filter(x => B.has(x._id)).map(x => x._id), cb = lb.filter(x => A.has(x._id)).map(x => x._id);
    if (ca.join() !== cb.join()) { const pos = new Map(ca.map((id, i) => [id, i])), seq = cb.map(id => pos.get(id)), n = seq.length, len = Array(n).fill(1), prev = Array(n).fill(-1); let best = 0;
      for (let i = 0; i < n; i++) { for (let j = 0; j < i; j++) if (seq[j] < seq[i] && len[j] + 1 > len[i]) { len[i] = len[j] + 1; prev[i] = j; } if (len[i] > len[best]) best = i; }
      const stay = new Set(); for (let i = best; i >= 0; i = prev[i]) stay.add(cb[i]);
      const moved = cb.filter(id => !stay.has(id));
      if (moved.length > 4) out.push({ s, ids, t: lp + `reordered ${moved.length} of ${lb.length}` });
      else moved.forEach(id => out.push({ s, ids: [...ids, id], t: lp + `moved “${nameOf(B.get(id), p)}” to position ${lb.findIndex(x => x._id === id) + 1}` })); }
  }
}
/* ---------- what still needs fixing ---------- */
function probe(node, data, path, ctx, ids, out, s, screen, open) {
  for (const f of node.fields) { const e = ruleOf(f, data[f.k]); if (e) out.push({ s, t: [...ctx, f.label.toLowerCase()].join(', ').replace(/^./, c => c.toUpperCase()) + ': ' + e, msg: e === NEED || e === 'Choose an image.' ? `Needs ${f.type === 'image' ? 'an image' : f.label.toLowerCase()}` : e, ids, screen, open, at: path, k: f.k }); }
  for (const p of node.parts) {
    if (p.kind === 'group') { const v = p.key[0] === '~'; probe(p, v ? data : data[p.key], `${path}/${p.key}`, [...ctx, p.label], ids, out, s, screen, open); continue; }
    const list = data[p.key], lp = `${path}/${p.key}`;
    if (p.view === 'image' && p.add === 'images') list.forEach(it => { if (!it[p.img || 'image']) out.push({ s, t: `${p.label}: an item has no image.`, msg: 'Choose an image.', ids: [...ids, it._id], screen, open: `${lp}/#${it._id}` }); });
    if (p.min && list.length < p.min) out.push({ s, t: `${[...ctx, p.label].join(', ')}: needs at least ${p.min}.`, msg: `Needs at least ${p.min}.`, ids, screen, open, at: lp });
    list.forEach(it => { const ip = `${lp}/#${it._id}`; probe(itemNode(p, it), it, ip, [...ctx, p.node ? `“${nameOf(it, p)}”` : `${p.one} “${nameOf(it, p)}”`], [...ids, it._id], out, s, p.node ? ip : screen, p.node ? null : ip); });
  }
}
function refresh() {
  const ch = [], pr = [];
  for (const s of SECTIONS) { diff(s, orig[s.key], cur[s.key], [], [], ch, s); probe(s, cur[s.key], s.key, [], [], pr, s, s.key, null); }
  const seen = new Map(); [...Object.entries(cur.pages).map(([k, p]) => [p.path, 'pages']), ...cur.studies.items.filter(x => !x.hidden).map(x => [x.path, 'studies'])].forEach(([p, sk]) => { if (!p) return;
    if (seen.has(p)) pr.push({ s: SECTIONS.find(x => x.key === sk), t: `Two pages share the address ${p}. Each page needs its own.`, msg: 'Another page already uses this address.', ids: [], screen: sk }); seen.set(p, 1); });
  const changed = new Set(), bad = new Map();
  ch.forEach(c => c.ids.forEach(id => changed.add(id)));
  pr.forEach(p => p.ids.forEach((id, i) => { if (i === p.ids.length - 1) bad.set(id, p.msg); else if (!bad.has(id)) bad.set(id, 'Something inside needs fixing.'); }));
  S = { ch, pr, changed, bad };
}
/* images added in this visit that the content still uses */
const newImages = () => { const j = JSON.stringify({ ...cur, _up: 0 }); return Object.keys(cur._up || {}).filter(p => !(orig._up && orig._up[p]) && j.includes(JSON.stringify(p))); };
