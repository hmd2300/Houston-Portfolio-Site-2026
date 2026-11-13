#!/usr/bin/env node
// Builds the whole site into /dist from /content and /src.
// No dependencies: runs on any machine with Node 18 or newer.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContent } from './lib/content.mjs';
import { esc } from './lib/html.mjs';
import * as R from './lib/render.mjs';
import { validate, checkLinks } from './lib/validate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const t0 = Date.now();

const stop = (title, list) => {
  console.error(`\n✗ ${title}\n`); list.forEach(e => console.error('  • ' + e));
  console.error(`\nNothing was published. The live site is unchanged.\n`); process.exit(1);
};
let c;
try { c = loadContent(ROOT); } catch (e) { stop('A content file could not be read', [e.message]); }
const { errors, warnings } = validate(c, ROOT);
if (errors.length) stop(`${errors.length} problem${errors.length > 1 ? 's' : ''} found in the content`, errors);

/* ---------- slots ---------- */
const lookup = (obj, dotted) => dotted.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
function slot(name, r) {
  switch (name) {
    case 'view': return r.view;
    case 'head.title': return esc(r.page.seoTitle).replace(/"/g, '&quot;');
    case 'head.description': return esc(r.page.seoDescription).replace(/"/g, '&quot;');
    case 'head.url': return c.site.url + r.page.path;
    case 'head.jsonld': return R.jsonLd(c, r);
    case 'footer': return c.footerHtml;
    case 'footer.nav': return R.footerNav(c);
    case 'menu.items': return R.menuItems(c);
    case 'js.data': return R.jsData(c);
    case 'grid.design': return R.pageGrid('design', c, r);
    case 'grid.photo': return R.pageGrid('photo', c, r);
    case 'home.faq.title': return c.home.faq.title;          /* may hold a <br> */
    case 'site.emailLink': case 'site.instagram': case 'site.linkedin': return c.site[name.slice(5)];
  }
  const [a, b, d] = name.split('.');
  if (a === 'home' && R.home[b] && !d) return R.home[b](c, r);
  if (a === 'video' && R.video[b]) return R.video[b](c, r);
  if (a === 'studies' && R.studies[b]) return R.studies[b](c, r);
  if (a === 'path') return c.page(b).path;
  if (a === 'page' && d === 'heading') return R.pageHeading(c.page(b), r);
  if (a === 'page' && d === 'lede') return esc(c.page(b).lede);
  const v = lookup(c, name);
  if (typeof v === 'string' || typeof v === 'number') return esc(v);
  throw new Error(`The template asks for "${name}" but no content provides it.`);
}
function fill(tpl, r) {
  let out = tpl;
  for (let pass = 0; pass < 4 && out.includes('{{'); pass++)
    out = out.replace(/\{\{([\w.-]+)\}\}/g, (m, name) => slot(name, r));
  if (out.includes('{{')) throw new Error('Unfilled slot left in ' + r.page.path);
  return out;
}

/* ---------- pages ---------- */
const template = read('src/template.html');
c.footerHtml = read('src/footer.html');
const routes = [
  ...c.pages.map(p => ({ view: p.id, page: p, study: false })),
  ...c.studies.map(p => ({ view: p.id, page: p, study: true })),
];
fs.rmSync(DIST, { recursive: true, force: true });
const write = (rel, text) => { const f = path.join(DIST, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
for (const r of routes) write(path.join(r.page.path, 'index.html'), fill(template, r));

/* ---------- sitemap ---------- */
const urls = [...routes.map(r => r.page), ...c.staticPages];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(p => `  <url>\n    <loc>${c.site.url}${p.path}</loc>\n    <lastmod>${p.lastmod}</lastmod>\n    <priority>${p.priority}</priority>\n  </url>\n`).join('') + `</urlset>\n`);

/* ---------- redirects: the hand-written rules, then any added in content ---------- */
let redirects = read('src/redirects.base');
if (c.redirects.length) redirects += `\n# ── Added from the admin ──────────────────────────────────────────────\n` +
  c.redirects.map(x => `${x.from.padEnd(32)} ${x.to.padEnd(32)} 301`).join('\n') + '\n';
write('_redirects', redirects);

/* ---------- files that ship as they are ---------- */
const copyDir = (from, to) => fs.existsSync(from) && fs.cpSync(from, to, { recursive: true, filter: f => path.basename(f) !== '.DS_Store' });
copyDir(path.join(ROOT, 'src/static'), DIST);
copyDir(path.join(ROOT, 'public'), DIST);
for (const d of ['ASSETS', 'ebay']) copyDir(path.join(ROOT, d), path.join(DIST, d));

if (c.dimsAdded.length) {
  fs.writeFileSync(path.join(ROOT, 'build/dims.json'), JSON.stringify(c.dims, null, 0).replace(/","/g, '",\n"') + '\n');
  console.log(`Measured ${c.dimsAdded.length} new image(s): ${c.dimsAdded.join(', ')}`);
}
const broken = checkLinks(DIST, redirects);
if (broken.length) { fs.rmSync(DIST, { recursive: true, force: true }); stop(`${broken.length} broken link${broken.length > 1 ? 's' : ''}`, broken); }

/* remember every address that has ever been published, so none can vanish later */
const known = new Set(c.published); routes.forEach(r => known.add(r.page.path));
for (const d of fs.readdirSync(path.join(ROOT, 'src/static'), { withFileTypes: true })) if (d.isDirectory() && fs.existsSync(path.join(ROOT, 'src/static', d.name, 'index.html'))) known.add(`/${d.name}/`);
if (known.size !== c.published.length) fs.writeFileSync(path.join(ROOT, 'build/published-paths.json'), JSON.stringify([...known].sort(), null, 2) + '\n');

if (warnings.length) { console.log(`\n${warnings.length} note${warnings.length > 1 ? 's' : ''}:`); warnings.slice(0, 12).forEach(w => console.log('  • ' + w)); if (warnings.length > 12) console.log(`  • and ${warnings.length - 12} more`); }
console.log(`✓ Content checked, ${routes.length} pages built, every link lands. ${Date.now() - t0} ms`);
