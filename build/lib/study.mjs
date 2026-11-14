// Builds the body of a case study page for the page you land on.
// The block between the two markers follows buildStudy() in the page script
// block for block, written the way a browser stores it, so a page you land on
// and a page you click through to end up as the same document.
import { esc, THUMB, VIEW, FALLBACK, tiles, bakeDims } from './html.mjs';

const rich = t => String(t).replace(/&(?!amp;)/g, '&amp;');
const PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>';

export function studyBody(s, c) {
  const key = s.id, st = s, dimOf = c.dimOf;
  const CS_ORDER = c.studies.map(x => x.id), hrefFor = id => c.page(id).path;
  /* ---- begin: same logic as buildStudy() in the page script ---- */
  let out = '', gal = 0, band = 0, open = false;
  const openBand = (extra) => { const alt = (band++ % 2) ? ' alt' : '';
    return `<section class="cs-band${alt}"${extra||''}><div class="cs-inner">`; };
  const closeBand = () => `</div></section>`;

  st.blocks.forEach(b => {
    if (b.t === 'sec'){
      if (open) out += closeBand();
      out += openBand(b.id ? ` id="cs-${key}-${b.id}"` : '');
      open = true;
      out += `<div class="cs-head"><div class="cs-num">${b.n ? esc(b.n)+' · ' : ''}${esc(b.kicker||'')}</div>` +
             `<div><h2 class="cs-h">${rich(b.h)}</h2>` +
             (b.p ? `<div class="cs-p">${b.p.map(p=>`<p>${esc(p)}</p>`).join('')}</div>` : '') +
             `</div></div>`;
      return;
    }
    if (!open){ out += openBand(); open = true; }

    if (b.t === 'owned'){
      out += `<h3 class="cs-sub">${esc(b.h)}</h3><div class="owned-grid">` +
        b.cards.map(([a,c,p])=>`<div class="owned-card"><b>${esc(a)}</b><b>${esc(c)}</b><p>${esc(p)}</p></div>`).join('') + `</div>`;
    } else if (b.t === 'stats'){
      out += (b.h ? `<h3 class="cs-sub">${esc(b.h)}</h3>` : '') +
        `<div class="stat-grid" style="--sc:${b.items.length}">` +
        b.items.map(([n,l])=>`<div class="stat"><b>${esc(n)}</b><span>${esc(l)}</span></div>`).join('') + `</div>` +
        (b.note ? `<div class="cs-note">${esc(b.note)}</div>` : '');
    } else if (b.t === 'bleed'){
      out += closeBand();
      const copy = b.h ? `<div class="overlay"><span class="cs-kicker">${esc(b.kicker||'')}</span>` +
        `<h2 class="cs-h">${rich(b.h)}</h2><p>${esc(b.p||'')}</p></div>` : '';
      out += `<figure class="cs-bleed${b.h ? ' withcopy' : ''}">` +
        `<img loading="lazy" decoding="async" src="${VIEW(b.img)}" onerror="${FALLBACK(b.img)}" alt="${esc(b.alt)}">${copy}` +
        (b.cap ? `<figcaption class="cap">${esc(b.cap)}</figcaption>` : '') + `</figure>`;
      out += openBand();
    } else if (b.t === 'video'){
      out += `<a class="cs-video" data-csvid="${b.yt}" href="https://www.youtube.com/watch?v=${b.yt}" target="_blank" rel="noopener" aria-label="Watch ${esc(b.title)}">` +
        `<img loading="lazy" decoding="async" src="https://i.ytimg.com/vi/${b.yt}/maxresdefault.jpg" ` +
        `onerror="this.onerror=null;this.src='https://i.ytimg.com/vi/${b.yt}/hqdefault.jpg'" alt="${esc(b.title)}">` +
        `<span class="vplay"><span class="vring">${PLAY}</span></span></a>` +
        `<div class="cs-vmeta"><h3>${esc(b.title)}</h3><span>${esc(b.sub)}</span></div>` +
        `<div class="cs-chips">${b.chips.map(([a,c])=>`<div class="cs-chip"><b>${esc(a)}</b><span>${esc(c)}</span></div>`).join('')}</div>`;
    } else if (b.t === 'videos'){
      out += `<h3 class="cs-sub">${esc(b.h)}</h3>` +
        (b.lede ? `<p class="cs-lede">${esc(b.lede)}</p>` : '') +
        `<div class="cs-vgrid">` + b.items.map(v => {
          const inner = `<div class="shot"><img loading="lazy" decoding="async" src="${v.thumb}" alt="${esc(v.title)}">` +
            `<span class="vplay"><span class="vring">${PLAY}</span></span></div>` +
            `<h4>${esc(v.title)}</h4><span class="sub">${esc(v.sub)}</span><p>${esc(v.desc)}</p>`;
          return v.yt
            ? `<a class="cs-vcard" href="https://www.youtube.com/watch?v=${v.yt}" target="_blank" rel="noopener">${inner}</a>`
            : `<div class="cs-vcard">${inner}</div>`;
        }).join('') + `</div>`;
    } else if (b.t === 'compare'){
      const cap = t => { const i = t.indexOf(' · ');
        return i < 0 ? esc(t) : `<b>${esc(t.slice(0,i))}</b> · ${esc(t.slice(i+3))}`; };
      out += `<div class="cs-compare">` + b.pairs.map(p =>
        `<div class="cs-pair">` +
          `<figure class="cs-pane"><div class="shot">` +
            `<img loading="lazy" decoding="async" src="${VIEW(p.a)}" onerror="${FALLBACK(p.a)}" alt="${esc(p.aAlt)}">` +
          `</div><figcaption class="cs-cap">${cap(p.aCap)}</figcaption></figure>` +
          `<div class="cs-built">Built ↓</div>` +
          `<figure class="cs-pane"><div class="shot">` +
            `<img loading="lazy" decoding="async" src="${VIEW(p.b)}" onerror="${FALLBACK(p.b)}" alt="${esc(p.bAlt)}">` +
          `</div><figcaption class="cs-cap">${cap(p.bCap)}</figcaption></figure>` +
        `</div>`).join('') + `</div>`;
    } else if (b.t === 'duo'){
      out += `<div class="cs-duo">` + b.items.map(([src,alt,cap]) =>
        `<figure><img loading="lazy" decoding="async" src="${VIEW(src)}" onerror="${FALLBACK(src)}" alt="${esc(alt)}"><figcaption>${esc(cap)}</figcaption></figure>`).join('') + `</div>`;
    } else if (b.t === 'duocard'){
      out += `<div class="cs-duo">` + b.items.map(([a,c,p]) =>
        `<div class="owned-card" style="border:1px solid var(--line)"><b>${esc(a)}</b><b>${esc(c)}</b><p>${esc(p)}</p></div>`).join('') + `</div>`;
    } else if (b.t === 'steps'){
      out += `<h3 class="cs-sub">${esc(b.h)}</h3>` + (b.sub ? `<p class="cs-p"></p><p>${esc(b.sub)}</p><p></p>` : '') +
        `<div class="cs-steps">` + b.items.map(([n,h,p]) =>
        `<div class="cs-step"><b>${esc(n)}</b><h4>${esc(h)}</h4><p>${esc(p)}</p></div>`).join('') + `</div>`;
    } else if (b.t === 'people'){
      out += `<div class="cs-people">` + b.items.map(([a,c,role,p,img]) =>
        `<div class="cs-person"><div class="pic"><img loading="lazy" decoding="async" src="${THUMB(img)}" onerror="${FALLBACK(img)}" alt="${esc(a+' '+c)}"></div>` +
        `<div class="body"><b>${esc(a)}</b>${c ? `<b class="two">${esc(c)}</b>` : ''}` +
        `<span class="role">${esc(role)}</span><p>${esc(p)}</p></div></div>`).join('') + `</div>`;
    } else if (b.t === 'reel'){
      out += closeBand();
      out += `<section class="cs-pin" data-pin="">` +
        `<div class="cs-pin-label"><b>${esc(b.h)}</b>${b.sub ? ' · '+esc(b.sub) : ''} · ` +
        `<span class="d">keep scrolling</span><span class="m">swipe sideways</span></div>` +
        `<div class="cs-pin-stick"><div class="cs-pin-track">` +
        b.items.map(([src,cap], i) => {
          /* A DEADLOCK LIVED HERE. These images had no width/height, so an
             un-loaded reel had a track only ~95px wide. sizePins() then gave
             the section a runway of `innerHeight + 0`, so the reel could
             never travel sideways; and because the frames are lazy AND sit
             off-screen horizontally, they were never scrolled into view, so
             they never loaded, so the track never gained width. The reel was
             simply dead on any study reached by clicking through from the
             index. It only worked on a page you LANDED on, where the markup
             is pre-rendered with dimensions already baked in.
             Intrinsic dimensions break the cycle: the track has its true
             width before a single byte of image arrives. */
          const pri = ' loading="lazy"', wh = '';
          return `<figure><img${pri} decoding="async"${wh} src="${VIEW(src)}" onerror="${FALLBACK(src)}" alt="${esc(cap)}"><figcaption>${esc(cap)}</figcaption></figure>`;
        }).join('') +
        `</div></div></section>`;
      out += openBand();
    } else if (b.t === 'boards'){
      out += (b.h ? `<h3 class="cs-sub">${esc(b.h)}</h3>` : '') +
        (b.sub ? `<p class="cs-lede" style="text-align:left;margin-left:0">${esc(b.sub)}</p>` : '');
      out += closeBand();
      out += `<div class="cs-boards">` + b.items.map(([src,cap]) =>
        `<figure><img loading="lazy" decoding="async" src="${VIEW(src)}" onerror="${FALLBACK(src)}" alt="${esc(cap)}"><figcaption>${esc(cap)}</figcaption></figure>`).join('') + `</div>`;
      out += openBand();
    } else if (b.t === 'gallery'){
      out += (b.h ? `<h3 class="cs-sub">${esc(b.h)}</h3>` : '') +
        (b.sub ? `<p class="cs-lede" style="text-align:left;margin-left:0">${esc(b.sub)}</p>` : '') +
        `<div class="grid grid-design" data-grid="${gal++}"></div>`;
    } else if (b.t === 'credits'){
      out += `<h3 class="cs-sub">${esc(b.h)}</h3><div class="credit-grid">` +
        `<div class="credit-col"><h4>Owned</h4><ul>${b.owned.map(l=>`<li>${esc(l)}</li>`).join('')}</ul></div>` +
        `<div class="credit-col collab"><h4>${esc(b.collabTitle||'Collaborative')}</h4><ul>${b.collab.map(l=>`<li>${esc(l)}</li>`).join('')}</ul></div>` +
        `</div>`;
    } else if (b.t === 'note'){
      out += `<div class="cs-note">${esc(b.p)}</div>`;
    }
  });
  if (open) out += closeBand();
  const i = CS_ORDER.indexOf(key), nxt = CS_ORDER[(i+1) % CS_ORDER.length];
  out += `<section class="cs-band"><div class="cs-inner">` +
    `<a class="cta" href="${hrefFor(nxt)}" data-view="${nxt}" aria-label="Next case study">` +
    `<span class="cta-chip start"><svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="square"></path></svg></span><span class="cta-label">Next case study</span><span class="cta-chip end"><svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="square"></path></svg></span></a></div></section>`;
  /* ---- end ---- */
  const galleries = st.blocks.filter(b => b.t === 'gallery');
  out = bakeDims(out, c);
  return out.replace(/<div class="grid grid-design" data-grid="(\d+)"><\/div>/g, (m, n) =>
    `<div class="grid grid-design in" data-grid="${n}">` +
    tiles(galleries[+n].items.map(([image, alt]) => ({ image, alt })), c) + `</div>`);
}
