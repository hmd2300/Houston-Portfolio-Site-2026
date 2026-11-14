// The bridge between the site's content files and the shape the admin edits.
//
// toAdmin  reads the files and returns the admin's working copy.
// toFiles  takes an edited working copy and returns the files, changed only where the edit reached.
//
// The promise: open the admin, change nothing, save, and every file comes back byte for byte the same.
// Each list item carries _k, its position in the file it came from, so an item that was only moved or
// edited is written back from its original (keeping key order and anything the admin does not show).

export const serialize = o => JSON.stringify(o, null, 2) + '\n';
const clone = o => JSON.parse(JSON.stringify(o));
const br = s => typeof s === 'string' ? s.replace(/<br>/g, '\n') : s;
const unbr = s => String(s).replace(/\n/g, '<br>');
export const ytId = v => { const t = String(v || '').trim(), m = t.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/); return m ? m[1] : t; };
const VIEW_HOME = '/ASSETS/IMAGES/IMAGE-VARIANTS/VIEW/Home/', PAGES = '/ASSETS/IMAGES/PAGES/';
const origOf = (p, has) => { if (!p.startsWith(VIEW_HOME)) return p; const o = PAGES + 'Home/' + p.slice(VIEW_HOME.length); return has(o) ? o : p; };
const viewOf = p => p.startsWith(PAGES) ? '/ASSETS/IMAGES/IMAGE-VARIANTS/VIEW/' + p.slice(PAGES.length).replace(/\.(jpe?g|png|webp)$/i, '.webp') : p;
const keyed = (list, f) => list.map((x, i) => ({ ...f(x), _k: i }));
const pick = (o, keys) => Object.fromEntries(keys.map(k => [k, o[k]]));
const PAGE_KEYS = { design: 'design', photo: 'photo', video: 'video' };

/* F: { home, design, photo, video, navigation, pages, site, redirects, studies: [{id, title, path}] }
   has(path): is this image on the site? Used to show hero slides by their full-size original. */
export function toAdmin(F, has = () => true) {
  const P = F.pages.pages, h = F.home, v = F.video, s = F.site, page = k => pick(P[k], ['heading', 'lede']);
  const pic = x => ({ image: x.image, alt: x.alt, spec: !!x.spec });
  const row = k => ({ ...pick(h[k], ['eyebrow', 'title', 'more']), picks: keyed(h[k].picks, pic) });
  return {
    home: {
      slides: keyed(h.slides, x => ({ image: origOf(x.image, has), focus: parseInt(x.focusY || '50', 10), phone: 50 })),
      heroMeta: clone(h.heroMeta), design: row('design'), photo: row('photo'),
      video: { ...pick(h.video, ['eyebrow', 'title', 'more']), feature: clone(h.video.feature) },
      about: { ...pick(h.about, ['eyebrow', 'title', 'cta']), paragraphs: [...h.about.paragraphs], portrait: clone(h.about.portrait) },
      contact: clone(h.contact),
      faq: { eyebrow: h.faq.eyebrow, title: br(h.faq.title), items: keyed(h.faq.items, q => ({ question: q.question, answer: q.answer, emailButton: !!q.emailButton })) },
    },
    design: { page: page('design'), items: keyed(F.design.items, pic) },
    photo: { page: page('photo'), items: keyed(F.photo.items, pic) },
    video: { page: page('video'),
      featured: keyed(v.featured, x => ({ youtube: x.youtube, title: x.title, alt: x.alt, flag: x.flag || '', roles: [...x.roles] })),
      filmsHead: { heading: v.filmsHeading, note: v.filmsNote }, films: keyed(v.films, x => ({ youtube: x.youtube, title: x.title, roles: [...x.roles] })),
      seriesHead: { heading: v.seriesHeading, note: v.seriesNote },
      series: keyed(v.series, x => ({ ...pick(x, ['title', 'url', 'brand', 'count', 'blurb']), thumbs: [...x.thumbs], roles: [...x.roles] })) },
    studies: { items: F.studies.map(x => ({ id: x.id, card: { title: x.title }, path: x.path })) },
    navigation: { menu: keyed(F.navigation.menu, x => pick(x, ['to', 'label'])), footer: keyed(F.navigation.footer, c => ({ heading: c.heading, links: keyed(c.links, x => pick(x, ['to', 'label'])) })) },
    pages: Object.fromEntries(['home', 'design', 'photo', 'video', 'case-studies'].map(k => [k, pick(P[k], k === 'home' ? ['seoTitle', 'seoDescription'] : ['path', 'seoTitle', 'seoDescription'])])),
    settings: { you: pick(s, ['name', 'jobTitle', 'bio']), links: pick(s, ['email', 'instagram', 'instagramHandle', 'linkedin']), footer: pick(s, ['footerLine', 'footerCta']),
      share: pick(s, ['shareImage', 'latestFilm']), search: { knowsAbout: [...s.knowsAbout], locality: s.locality, region: s.region } },
  };
}

/* M: the edited working copy. F0: the files it was loaded from. Returns new file objects; F0 is not touched. */
export function toFiles(M, F0, { today = new Date().toISOString().slice(0, 10), has = () => true } = {}) {
  const F = clone({ home: F0.home, design: F0.design, photo: F0.photo, video: F0.video, navigation: F0.navigation, pages: F0.pages, site: F0.site, redirects: F0.redirects });
  const put = (o, k, v) => { o[k] = v; }, opt = (o, k, v, empty) => { if (v === empty && !(k in o)) return; if (v === empty && o[k] !== empty) delete o[k]; else o[k] = v; };
  /* rebuild a list: every kept item starts from its original, new items start empty */
  const relist = (src, items, write) => items.map(m => { const o = m._k != null && src[m._k] ? clone(src[m._k]) : {}; write(o, m, m._k != null ? src[m._k] : null); return o; });
  const pic = (o, m) => { put(o, 'image', m.image); put(o, 'alt', m.alt); put(o, 'spec', !!m.spec); };
  const h = F.home, mh = M.home, P = F.pages.pages;

  h.slides = relist(F0.home.slides, mh.slides, (o, m, src) => {
    if (!src || origOf(src.image, has) !== m.image) put(o, 'image', viewOf(m.image));
    if (!(src && src.focusY && parseInt(src.focusY, 10) === m.focus)) opt(o, 'focusY', m.focus === 50 ? undefined : `${m.focus}%`, undefined); });
  /* the phone framing is not stored: it is baked into the slide's phone crop when a new slide is published */
  Object.assign(h.heroMeta, mh.heroMeta);
  for (const k of ['design', 'photo']) { Object.assign(h[k], pick(mh[k], ['eyebrow', 'title', 'more'])); h[k].picks = relist(F0.home[k].picks, mh[k].picks, pic); }
  Object.assign(h.video, pick(mh.video, ['eyebrow', 'title', 'more'])); Object.assign(h.video.feature, { youtube: ytId(mh.video.feature.youtube), alt: mh.video.feature.alt });
  Object.assign(h.about, pick(mh.about, ['eyebrow', 'title', 'cta'])); h.about.paragraphs = [...mh.about.paragraphs]; Object.assign(h.about.portrait, mh.about.portrait);
  Object.assign(h.contact, mh.contact);
  h.faq.eyebrow = mh.faq.eyebrow; h.faq.title = unbr(mh.faq.title);
  h.faq.items = relist(F0.home.faq.items, mh.faq.items, (o, m) => { put(o, 'question', m.question); put(o, 'answer', m.answer); opt(o, 'emailButton', m.emailButton ? true : undefined, undefined); });

  F.design.items = relist(F0.design.items, M.design.items, pic);
  F.photo.items = relist(F0.photo.items, M.photo.items, pic);
  const v = F.video, mv = M.video;
  v.featured = relist(F0.video.featured, mv.featured, (o, m) => { put(o, 'youtube', ytId(m.youtube)); put(o, 'title', m.title); put(o, 'alt', m.alt); opt(o, 'flag', m.flag || undefined, undefined); put(o, 'roles', [...m.roles]); });
  v.filmsHeading = mv.filmsHead.heading; v.filmsNote = mv.filmsHead.note; v.seriesHeading = mv.seriesHead.heading; v.seriesNote = mv.seriesHead.note;
  v.films = relist(F0.video.films, mv.films, (o, m) => { put(o, 'youtube', ytId(m.youtube)); put(o, 'title', m.title); put(o, 'roles', [...m.roles]); });
  const ids = new Set(F0.video.series.map(x => x.id));
  v.series = relist(F0.video.series, mv.series, (o, m) => {
    if (!o.id) { const base = 'series' + String(m.title).replace(/[^A-Za-z0-9]+/g, ' ').trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(''); let id = base, n = 2; while (ids.has(id)) id = base + n++; ids.add(id); o.id = id; }
    for (const k of ['title', 'url', 'brand', 'count', 'blurb']) put(o, k, m[k]); put(o, 'thumbs', m.thumbs.map(ytId)); put(o, 'roles', [...m.roles]); });

  F.navigation.menu = relist(F0.navigation.menu, M.navigation.menu, (o, m) => Object.assign(o, pick(m, ['to', 'label'])));
  F.navigation.footer = relist(F0.navigation.footer, M.navigation.footer, (o, m, src) => { o.heading = m.heading; o.links = relist(src ? src.links : [], m.links, (l, x) => Object.assign(l, pick(x, ['to', 'label']))); });

  for (const [k, sec] of Object.entries(PAGE_KEYS)) Object.assign(P[k], M[sec].page);
  for (const k of Object.keys(M.pages)) {
    const was = P[k].path, now = M.pages[k].path;
    Object.assign(P[k], M.pages[k]);
    if (now && was && now !== was) {                       /* the old address must keep working */
      const r = F.redirects.redirects.filter(x => x.from !== now); r.forEach(x => { if (x.to === was) x.to = now; }); r.push({ from: was, to: now }); F.redirects.redirects = r; }
  }
  const s = F.site, ms = M.settings, wasEmail = s.email;
  Object.assign(s, ms.you, ms.links, ms.footer, ms.share, { latestFilm: ytId(ms.share.latestFilm) }, ms.search);
  if (s.email !== wasEmail) s.emailLink = `mailto:${s.email}?subject=Inquiry%20via%20houstondragna.com`;

  /* a page that changed gets today's date in the sitemap */
  const body = f => serialize({ ...f, pages: undefined }), touched = (k, ...pairs) => { const a = clone(F0.pages.pages[k]), b = clone(P[k]); delete a.lastmod; delete b.lastmod;
    if (serialize(a) !== serialize(b) || pairs.some(([x, y]) => serialize(x) !== serialize(y))) P[k].lastmod = today; };
  touched('home', [F0.home, F.home]); touched('design', [F0.design, F.design]); touched('photo', [F0.photo, F.photo]); touched('video', [F0.video, F.video]); touched('case-studies');
  return F;
}
/* which files differ, as { 'content/home.json': text } */
export function changed(F, F0) { const out = {};
  for (const k of ['home', 'design', 'photo', 'video', 'navigation', 'pages', 'site', 'redirects']) { const t = serialize(F[k]); if (t !== serialize(F0[k])) out[`content/${k}.json`] = t; }
  return out; }
