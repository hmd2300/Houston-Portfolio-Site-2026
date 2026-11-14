// Shared building blocks for the generated markup.
export const esc  = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
export const attr = t => esc(t).replace(/"/g, '&quot;');
/* the en dash is written as an entity in page text, as it always was */
export const dash = t => t.replace(/\u2013/g, '&#8211;');

const PAGES_DIR = '/ASSETS/IMAGES/PAGES/';
const tier = (src, dir) => {
  const i = src.indexOf(PAGES_DIR);
  if (i < 0) return src;
  return src.slice(0, i) + '/ASSETS/IMAGES/IMAGE-VARIANTS/' + dir + '/' +
         src.slice(i + PAGES_DIR.length).replace(/\.(jpe?g|png|webp)$/i, '.webp');
};
export const THUMB = src => tier(src, 'THUMBS');
export const VIEW  = src => tier(src, 'VIEW');
export const FALLBACK = orig => `this.onerror=null;this.src='${orig.replace(/'/g, "\\'")}'`;
export const YT_THUMB = id => `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
export const YT_FALLBACK = id => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
export const YT_WATCH = id => `https://www.youtube.com/watch?v=${id}`;

export const CTA_CHIP = cls => `<span class="cta-chip ${cls}"><svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="square"/></svg></span>`;
export const CTA_CHIP_DOM = cls => CTA_CHIP(cls).replace('/></svg>', '></path></svg>');
export const roles = list => `<div class="roles">${list.map(r => `<span class="role">${esc(r)}</span>`).join('')}</div>`;

/* ---------- image grids ---------- */
export function tiles(items, ctx, live = true) {
  const EAGER = 9;
  return items.map((it, i) => {
    const d = ctx.dimOf(THUMB(it.image));
    const wh = d ? ` width="${d.split('x')[0]}" height="${d.split('x')[1]}"` : '';
    const pri = (i < EAGER && live) ? ' loading="eager" fetchpriority="high"' : ' loading="lazy" fetchpriority="low"';
    return `<figure class="tile" tabindex="0" role="button" aria-label="View ${it.alt}${it.spec ? ', spec work' : ''}">` +
      `<img${pri} decoding="async"${wh} src="${THUMB(it.image)}" onerror="${FALLBACK(it.image)}" alt="${it.alt}">` +
      (it.spec ? `<span class="spec-tag">Spec</span>` : '') +
      `<span class="idx">${String(i + 1).padStart(2, '0')}</span></figure>`;
  }).join('');
}
export const grid = (cls, items, ctx, on) => `<div class="grid ${cls}" data-grid data-bare>${on ? tiles(items, ctx) : ''}</div>`;


/* Every image on a pre-built page states its real pixel size, so the browser
   reserves the right space before the file arrives and nothing jumps. */
export function bakeDims(html, c) {
  return html.replace(/<img\b[^>]*>/g, tag => {
    if (/\swidth="/.test(tag)) return tag;
    const src = (tag.match(/\ssrc="([^"]+)"/) || [])[1];
    if (!src) return tag;
    const s = /^https:\/\/i\.ytimg\.com\/vi\/[^/]+\/maxresdefault\.jpg$/.test(src) ? { w: 1280, h: 720 }
            : src.startsWith('/') ? c.sizeOf(src) : null;
    return s ? tag.slice(0, -1) + ` width="${s.w}" height="${s.h}">` : tag;
  });
}
