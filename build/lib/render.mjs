// Every piece of generated markup lives here. Each function returns a string.
// The output is byte-for-byte what the hand-built pages contained, so a change
// in a content file is the only thing that can change a page.
import { studyBody } from './study.mjs';
import { SECTIONS } from './content.mjs';

import { esc, attr, dash, THUMB, VIEW, FALLBACK, YT_THUMB, YT_FALLBACK, YT_WATCH, CTA_CHIP, CTA_CHIP_DOM, roles, tiles, grid, bakeDims } from './html.mjs';

/* ---------- home ---------- */
export const home = {
  slides: c => c.home.slides.map((s, i) =>
    `          <div class="slide${i === 0 ? ' active' : ''}"${s.focusY ? ` style="--fy:${s.focusY}"` : ''} data-bg="${s.image}"></div>`).join('\n'),
  heroName: (c, r) => {
    const [a, ...b] = c.site.name.split(' ');
    const inner = `class="hero-name display" id="heroName"><span>${esc(a)}</span><span>${esc(b.join(' '))}</span>`;
    return r.view === 'home' ? `        <h1 ${inner}</h1>` : `        <div role="heading" aria-level="1" ${inner}</div>`;
  },
  heroMeta: c => `        <span>${esc(c.home.heroMeta.location)}</span>\n        <span class="meta-mark">${esc(c.home.heroMeta.mark)}</span>\n        <span>${esc(c.home.heroMeta.since)}</span>`,
  designGrid: (c, r) => '    ' + grid('grid-design', c.home.design.picks, c, r.view === 'home'),
  photoGrid:  (c, r) => '    ' + grid('grid-photo',  c.home.photo.picks,  c, r.view === 'home'),
  videoFeature: (c, r) => {
    const f = c.home.video.feature, src = r.view === 'home' ? 'src' : 'data-src';
    return `    <figure class="tile video-wrap bleed reveal" data-yt="${f.youtube}">
      <img loading="lazy" decoding="async" ${src}="${YT_THUMB(f.youtube)}" alt="${attr(f.alt)}" width="1280" height="720">
      <a class="video-open" href="${YT_WATCH(f.youtube)}" target="_blank" rel="noopener">
        <span class="lbl">Watch with sound
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17L17 7M9 7h8v8"/></svg></span></a>
    </figure>`;
  },
  aboutCopy: c => {
    const a = c.home.about, d = n => `.${String((n + 1) * 5).padStart(2, '0')}`.replace(/0$/, '') + 's';
    return a.paragraphs.map((p, i) => `      <p class="reveal" style="--d:${d(i)}">${esc(p)}</p>`).join('\n') +
      `\n      <a class="cta reveal" style="--d:${d(a.paragraphs.length)}" href="#contact" data-scroll aria-label="${attr(a.cta)}">${CTA_CHIP('start')}<span class="cta-label">${esc(a.cta)}</span>${CTA_CHIP('end')}</a>`;
  },
  portrait: (c, r) => {
    const p = c.home.about.portrait, s = c.sizeOf(VIEW(p.image)) || c.sizeOf(p.image);
    return `      <img loading="lazy" decoding="async"
           ${r.view === 'home' ? 'src' : 'data-src'}="${VIEW(p.image)}" onerror="${FALLBACK(p.image)}"
           alt="${attr(p.alt)}" width="${s.w}" height="${s.h}">
      <figcaption>${esc(p.caption)}</figcaption>`;
  },
  faqList: c => `    <div class="faq-list reveal" style="--d:.1s">` + c.home.faq.items.map(it =>
    `<details class="faq-item reveal"><summary><span>${esc(it.question)}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></summary>` +
    `<div class="faq-a">${it.html || it.answer.split(/\n\n+/).map(p => `<p>${esc(p)}</p>`).join('') + (it.emailButton ? `<a class="cta" href="${c.site.emailLink}" data-goal="Email Click" data-goal-source="FAQ" aria-label="Email me">${CTA_CHIP('start')}<span class="cta-label">Email me</span>${CTA_CHIP('end')}</a>` : '')}</div></details>`).join('') + `</div>`,
};

/* ---------- portfolio page headers ---------- */
export function pageHeading(p, r) {
  const count = p.showCount ? `<span class="count-tag" data-count="${p.id}"></span>` : '';
  return r.view === p.id
    ? `    <h1 class="page-title display">${esc(p.heading)}${count}</h1>`
    : `    <div role="heading" aria-level="1" class="page-title display">${esc(p.heading)}${count}</div>`;
}
export const pageGrid = (id, c, r) => grid(`grid-${id} mosaic`, c[id].items, c, r.view === id);

/* ---------- video ---------- */
export const video = {
  featured: c => `    <div class="film-pair">\n` + c.video.featured.map(f => `      <div class="film-feat">
        <figure class="tile video-wrap reveal" data-yt="${f.youtube}">
          ${f.flag ? `<span class="flag">${esc(f.flag)}</span>` : ''}
          <img loading="lazy" decoding="async" src="${YT_THUMB(f.youtube)}" onerror="this.onerror=null;this.src='${YT_FALLBACK(f.youtube)}'" alt="${attr(f.alt)}" width="1280" height="720">
          <a class="video-open" href="${YT_WATCH(f.youtube)}" target="_blank" rel="noopener" aria-label="Watch with sound: ${attr(f.title)} (opens in a new tab)">
            <span class="lbl">Watch with sound
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17L17 7M9 7h8v8"/></svg></span></a>
        </figure>
        <div class="hero-film-cap reveal">
          <h2><a href="${YT_WATCH(f.youtube)}" target="_blank" rel="noopener">${esc(f.title)}</a></h2>
          ${roles(f.roles)}
        </div>
      </div>`).join('\n') + `\n    </div>`,
  films: (c, r) => {
    if (r.view !== 'video') return `    <div class="vgrid" id="filmGrid"></div>`;
    return `    <div class="vgrid" id="filmGrid">` + bakeDims(c.video.films.map(f => {
      const t = dash(attr(f.title)), tx = dash(esc(f.title));
      return `
  <article class="vcard live reveal in">
    <a class="thumb" data-yt="${f.youtube}" href="${YT_WATCH(f.youtube)}" target="_blank" rel="noopener" aria-label="Watch ${t}">
      <img loading="lazy" decoding="async" src="${f.thumb ? THUMB(f.thumb) : YT_THUMB(f.youtube)}" onerror="this.onerror=null;this.src='${f.thumb ? f.thumb : YT_FALLBACK(f.youtube)}'" alt="${t}">
      ${f.flag ? `<span class="flag">${esc(f.flag)}</span>` : ''}
    </a>
    <h3><a href="${YT_WATCH(f.youtube)}" target="_blank" rel="noopener">${tx}</a></h3>
    ${roles(f.roles)}
  </article>`; }).join(''), c) + `</div>`;
  },
  series: c => c.video.series.map((s, n) => `    <div class="sub-head reveal">
      <h2>${esc(n === 0 ? c.video.seriesHeading : s.heading || '')}</h2><span class="mono" style="color:var(--ink-dim)">${esc(c.video.seriesNote)}</span>
    </div>
    <article class="series reveal" id="${s.id}">
      <a class="series-stack" href="${s.url}" target="_blank" rel="noopener" aria-label="Watch the ${attr(s.title)} playlist on YouTube, ${s.count} videos (opens in a new tab)" data-goal="Playlist Click" data-goal-source="Video">
${s.thumbs.map((id, i) => [i, id]).reverse().map(([i, id]) => `        <img class="card c${i + 1}" loading="lazy" decoding="async" src="${YT_THUMB(id)}" onerror="this.onerror=null;this.src='${YT_FALLBACK(id)}'" alt="" width="1280" height="720">`).join('\n')}
        <span class="flag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square" aria-hidden="true"><path d="M3 6h13M3 12h13M3 18h8"/><path d="M17 14.5v6l5-3z" fill="currentColor" stroke="none"/></svg>${s.count} videos</span>
      </a>
      <div class="series-body">
        <p class="mono series-kicker">${esc(s.brand)} <span aria-hidden="true">&middot;</span> Playlist of ${s.count}</p>
        <h3><a href="${s.url}" target="_blank" rel="noopener" data-goal="Playlist Click" data-goal-source="Video">${esc(s.title)}</a></h3>
        <p>${esc(s.blurb)}</p>
        ${roles(s.roles)}
      </div>
    </article>`).join('\n'),
};

/* ---------- case studies ---------- */
export const studies = {
  cards: (c, r) => {
    if (r.view !== 'case-studies') return `    <div class="cs-grid" id="csGrid"></div>`;
    return `    <div class="cs-grid" id="csGrid">` + c.studies.map(s => {
      const d = c.dimOf(THUMB(s.card.image)), wh = d ? ` width="${d.split('x')[0]}" height="${d.split('x')[1]}"` : '';
      return `
  <article class="cs-card reveal in">
    <a class="thumb" href="${s.path}" data-view="${s.id}" aria-label="Open case study: ${attr(s.card.title)}">
      <span class="flag">Case study</span>
      <img loading="lazy" decoding="async" src="${THUMB(s.card.image)}" onerror="${FALLBACK(s.card.image)}" alt="${attr(s.card.title)}"${wh}>
    </a>
    <h2 class="cs-card-h">${esc(s.card.title)}</h2>
    <p>${esc(s.card.line)}</p>
    <a class="cta" href="${s.path}" data-view="${s.id}" aria-label="Read the full study">${CTA_CHIP_DOM('start')}<span class="cta-label">Read the full study</span>${CTA_CHIP_DOM('end')}</a>
  </article>`; }).join('') + `</div>`;
  },
  views: (c, r) => c.studies.map(s => {
    const landed = r.view === s.id, hs = c.sizeOf(VIEW(s.hero)) || c.sizeOf(s.hero);
    const index = c.page('case-studies');
    return `<div class="view" id="view-${s.id}" data-c="${s.accent}">
  <header class="cs-top">
    <img class="cs-bg" loading="lazy" decoding="async" src="${VIEW(s.hero)}" onerror="${FALLBACK(s.hero)}" alt="${attr(s.heroAlt)}" width="${hs.w}" height="${hs.h}">
    <div class="cs-top-inner">
      <a class="back" href="${index.path}" data-view="case-studies"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M11 19l-7-7 7-7"/></svg>All case studies</a>
      <div class="cs-lockups">${s.lockups.map(([src, alt]) => { const z = c.sizeOf(THUMB(src)) || c.sizeOf(src);
        return `<img loading="lazy" decoding="async" src="${THUMB(src)}" onerror="${FALLBACK(src)}" alt="${attr(alt)}" width="${z.w}" height="${z.h}">`; }).join('')}</div>
      <span class="cs-kicker">${esc(s.kicker)}</span>
      ${landed ? `<h1 class="cs-title display">${s.title}</h1>` : `<div role="heading" aria-level="1" class="cs-title display">${s.title}</div>`}
      <p class="cs-tag">${esc(s.tagline)}</p>
      <dl class="cs-facts">${s.facts.slice(0, 3).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
    </div>
  </header>
  <div class="cs-body" data-study="${s.id}">${landed ? studyBody(s, c) : ''}</div>
  <div class="cs-band"><div class="cs-inner"></div></div>
{{footer}}
</div>

`; }).join(''),
};

/* ---------- menu and footer ---------- */
export function menuItems(c) {
  return c.nav.menu.map((m, i) => SECTIONS.includes(m.to)
    ? `      <a class="m-item" style="--i:${i}" href="#${m.to}" data-scroll>${esc(m.label)}</a>`
    : `      <a class="m-item" style="--i:${i}" href="${c.page(m.to).path}" data-view="${m.to}">${esc(m.label)}</a>`).join('\n');
}
export function footerNav(c) {
  const link = l => {
    if (SECTIONS.includes(l.to)) return `<a data-view="${l.to}" href="/${l.to}">${esc(l.label)}</a>`;
    if (l.to === 'email')      return `<a href="${c.site.emailLink}" data-goal="Email Click" data-goal-source="Footer">${esc(l.label)}</a>`;
    if (l.to === 'instagram')  return `<a href="${c.site.instagram}" target="_blank" rel="noopener" data-goal="Instagram Click">${esc(l.label)}</a>`;
    if (l.to === 'linkedin')   return `<a href="${c.site.linkedin}" target="_blank" rel="noopener" data-goal="LinkedIn Click" data-goal-source="Footer">${esc(l.label)}</a>`;
    if (l.to === 'latestFilm') return `<a href="${YT_WATCH(c.site.latestFilm)}" target="_blank" rel="noopener">${esc(l.label)}</a>`;
    return `<a data-view="${l.to}" href="${c.page(l.to).path}">${esc(l.label)}</a>`;
  };
  return c.nav.footer.map(col => `    <div class="foot-col">\n      <p class="foot-h">${esc(col.heading)}</p>\n` +
    col.links.map(l => '      ' + link(l)).join('\n') + `\n    </div>`).join('\n');
}

/* ---------- search-engine data ---------- */
export function jsonLd(c, r) {
  const base = c.site.url, me = { '@id': base + '/#houston' }, web = { '@id': base + '/#website' };
  const p = r.page, url = base + p.path, share = base + c.site.shareImage;
  const crumb = t => t.replace(new RegExp('\\s*\\|\\s*' + c.site.name + '$'), '');
  const g = [
    { '@type': 'WebSite', '@id': web['@id'], url: base, name: c.site.name, publisher: me, inLanguage: 'en-US' },
    { '@type': 'WebPage', '@id': url + '#page', url, name: p.seoTitle, description: p.seoDescription, isPartOf: web, about: me,
      primaryImageOfPage: { '@type': 'ImageObject', url: share }, inLanguage: 'en-US' },
  ];
  if (r.view === 'home') {
    g.push({ '@type': 'Person', '@id': me['@id'], name: c.site.name, url: base, image: share, jobTitle: c.site.jobTitle, description: c.site.bio,
      address: { '@type': 'PostalAddress', addressLocality: c.site.locality, addressRegion: c.site.region, addressCountry: c.site.country },
      knowsAbout: c.site.knowsAbout, sameAs: [c.site.instagram, c.site.linkedin], areaServed: { '@type': 'Place', name: 'Worldwide' }, availableLanguage: 'en' });
    g.push({ '@type': 'FAQPage', '@id': base + '/#faq', mainEntity: c.home.faq.items.map(it => ({ '@type': 'Question', name: it.question,
      acceptedAnswer: { '@type': 'Answer', text: it.searchAnswer || it.answer.replace(/\n\n+/g, ' ') } })) });
  } else {
    g.push({ '@id': me['@id'], '@type': 'Person', name: c.site.name });
    const items = [['Home', base + '/']];
    if (r.study) items.push([c.page('case-studies').heading, base + c.page('case-studies').path]);
    items.push([crumb(p.seoTitle), url]);
    g.push({ '@type': 'BreadcrumbList', itemListElement: items.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })) });
    if (r.view === 'design' || r.view === 'photo')
      g.push({ '@type': 'ImageGallery', '@id': url + '#gallery', name: crumb(p.seoTitle), description: p.seoDescription, url, creator: me });
    if (r.study)
      g.push({ '@type': 'CreativeWork', '@id': url + '#work', name: crumb(p.seoTitle), headline: crumb(p.seoTitle), description: p.seoDescription, url,
        image: share, datePublished: p.datePublished, inLanguage: 'en-US', creator: me, author: me, about: { '@type': 'Thing', name: p.about }, isPartOf: web });
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': g });
}

/* ---------- the data the page script reads ---------- */
export function jsData(c) {
  const safe = v => JSON.stringify(v).replace(/<\//g, '<\\/').replace(/[\u2028\u2029]/g, ch => '\\u' + ch.charCodeAt(0).toString(16));
  const rows = (name, list) => `const ${name} = [\n` + list.map(v => ' ' + safe(v)).join(',\n') + `\n];`;
  const pair = it => [it.image, it.alt];
  const film = f => { const o = { yt: f.youtube, title: f.title, roles: f.roles }; if (f.thumb) o.thumb = f.thumb; if (f.flag) o.flag = f.flag; return o; };
  const STUDY_KEYS = ['accent', 'kicker', 'title', 'hero', 'heroAlt', 'lockups', 'tagline', 'facts', 'blocks'];
  const all = [...c.pages, ...c.studies];
  const stem = it => decodeURIComponent(it.image).split('/').pop().replace(/\+/g, ' ').replace(/\.[a-z0-9]+$/i, '');
  const spec = [...new Set([...c.design.items, ...c.photo.items, ...c.home.design.picks, ...c.home.photo.picks].filter(i => i.spec).map(stem))];
  const paths = Object.fromEntries(all.map(p => [p.id, p.path]));
  for (const s of ['contact', 'faq', 'about']) paths[s] = '/' + s;
  return [
    `/* ---------- content ----------`,
    `   Everything from here to the matching END line is written by the build`,
    `   from the files in /content. Change the content there, never here. */`,
    rows('DESIGN', c.design.items.map(pair)),
    rows('PHOTO', c.photo.items.map(pair)),
    rows('HOME_DESIGN', c.home.design.picks.map(pair)),
    rows('HOME_PHOTO', c.home.photo.picks.map(pair)),
    rows('FILMS', c.video.films.map(film)),
    `const STUDY_PAGES = {\n` + c.studies.map(s => ' ' + JSON.stringify(s.id) + ': ' + safe(Object.fromEntries(STUDY_KEYS.map(k => [k, s[k]])))).join(',\n') + `\n};`,
    rows('STUDIES', c.studies.map(s => ({ view: s.id, data: s.card.image, title: s.card.title, line: s.card.line }))),
    `const CS_ORDER = ${safe(c.studies.map(s => s.id))};`,
    `const DIMS = ${safe(c.dims)};`,
    `const SPEC = ${safe(spec)};`,
    `const VIEWS = ${safe(all.map(p => p.id))};`,
    `const PATHS = ${safe(paths)};`,
    `const META = {\n` + all.map(p => ' ' + JSON.stringify(p.id) + ': ' + safe([p.seoTitle, p.shortDescription])).join(',\n') + `\n};`,
    `/* ---------- END content ---------- */`,
  ].join('\n');
}
