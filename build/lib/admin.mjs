// Builds the admin at /admin/: the page, its styles and script, and the content it opens with.
// The admin is plain files with no dependencies. Its working copy of the content is made here by
// the same adapter the admin uses to write changes back, so the two can never disagree.
import fs from 'node:fs';
import path from 'node:path';
import { SECTIONS } from './content.mjs';
import { imageSize } from './images.mjs';
import { THUMB } from './html.mjs';
import { toAdmin } from '../../admin/adapter.mjs';

const webPath = p => encodeURI(p).replace(/'/g, '%27');
const PARTS = ['schema.js', 'core.js', 'ui.js', 'publish.js', 'github.js', 'import.js'];
export const REPO = (process.env.SITE_REPO || 'hmd2300/Houston-Portfolio-Site-2026').split('/');
/* the adapter is a module for the build and the tests; in the admin it runs as a plain script under one name */
const adapterScript = ROOT => 'const ADAPTER = (() => {\n' + fs.readFileSync(path.join(ROOT, 'admin/adapter.mjs'), 'utf8').replace(/^export\s+/gm, '') + '\nreturn { toAdmin, toFiles, changed, serialize };\n})();\n';
const TOP = `<header class="top">
  <span class="mark">HD<b>.</b></span>
  <button class="switch" id="switch" aria-haspopup="dialog"><span id="switch-label">Home</span><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button>
  <span class="grow saved mono" id="saved">Draft saved on this device</span>
  <button class="iconbtn" id="acct" aria-label="Account"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg></button>
  <button class="iconbtn" id="undo" aria-label="Undo" disabled><svg viewBox="0 0 24 24"><path d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3"/></svg></button>
  <button class="chipbtn mono" id="count">No changes</button>
  <button class="btn primary" id="review" disabled><span class="long">Review and publish</span><span class="short">Publish</span></button>
</header>
<div class="shell"><nav class="rail" id="rail" aria-label="Sections"></nav><main id="main"></main></div>
<div id="layer"></div><div id="layer2"></div><div style="position:fixed;left:0;top:0;width:0;height:0;overflow:hidden" aria-hidden="true"><span id="ruler"></span></div>`;
const FONTS = 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=Instrument+Sans:wght@400;500;600&family=Space+Mono:wght@400;700&display=swap';

/* every image the site holds, with its size and the small copy to show in grids */
function mediaIndex(ROOT) {
  const out = {}, walk = d => { for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
    const p = `${d}/${e.name}`; if (e.isDirectory()) walk(p); else if (/\.(jpe?g|png|webp)$/i.test(e.name)) {
      const f = path.join(ROOT, p), s = imageSize(f), t = THUMB('/' + p), small = t !== '/' + p && fs.existsSync(path.join(ROOT, t));
      if (s) out['/' + p] = { t: webPath(small ? t : '/' + p), w: s.w, h: s.h, kb: Math.max(1, Math.round(fs.statSync(f).size / 1024)) }; } } };
  walk('ASSETS/IMAGES/PAGES'); if (fs.existsSync(path.join(ROOT, 'ASSETS/Social Share'))) walk('ASSETS/Social Share');
  return out;
}
export function contentFiles(ROOT) {
  const json = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  const F = Object.fromEntries(['home', 'design', 'photo', 'video', 'navigation', 'pages', 'site', 'redirects'].map(n => [n, json(`content/${n}.json`)]));
  F.studies = json('content/case-studies.json').order.map(s => { const d = json(`content/studies/${s}.json`); return { id: d.id, title: d.card.title, path: d.path }; });
  return F;
}
/* the admin as files to write into dist/admin/. With single: true, one self-contained page instead (for previews). */
export function adminFiles(ROOT, { single = false, mode = 'site', media, content } = {}) {
  const src = f => fs.readFileSync(path.join(ROOT, 'admin/src', f), 'utf8'), has = p => fs.existsSync(path.join(ROOT, p));
  const build = process.env.COMMIT_REF || null, site = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/site.json'), 'utf8')).url;
  const data = JSON.stringify({ mode, build, siteUrl: site, repo: single ? null : { owner: REPO[0], name: REPO[1], base: process.env.CONTEXT === 'production' || !process.env.HEAD ? 'main' : process.env.HEAD }, content: content || toAdmin(contentFiles(ROOT), has), media: media || mediaIndex(ROOT) });
  const js = adapterScript(ROOT) + PARTS.map(src).join('\n'), css = src('styles.css');
  if (single) return { 'index.html': `<title>Site Admin Prototype</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n<link rel="stylesheet" href="${FONTS}">\n<style>\n${css}\n</style>\n\n${TOP}\n\n<script>\nconst SAMPLE = ${data};\n${js}\n</script>\n` };
  return {
    'index.html': `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<meta name="robots" content="noindex,nofollow">\n<title>Site admin</title>\n<link rel="icon" type="image/png" sizes="180x180" href="/ASSETS/Social%20Share/Houston%20Dragna%202026%20Favicon%20180.png">\n<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="${FONTS}">\n<link rel="stylesheet" href="app.css">\n</head>\n<body>\n${TOP}\n<script src="data.js"></script>\n<script src="app.js"></script>\n</body>\n</html>\n`,
    'app.css': `[hidden]{display:none!important}body{margin:0}img{max-width:100%}\n${css}`,
    'data.js': `window.ADMIN_DATA = ${data};\n`,
    'app.js': `const SAMPLE = window.ADMIN_DATA;\n${js}`,
    'build.json': JSON.stringify({ build }) + '\n',                /* the admin polls this to see when a publish is live */
    'vendor/webp_enc.js': fs.readFileSync(path.join(ROOT, 'admin/vendor/webp_enc.js'), 'utf8'),
    'vendor/webp_enc.wasm': fs.readFileSync(path.join(ROOT, 'admin/vendor/webp_enc.wasm')),
    'vendor/LICENSE-jsquash-webp.txt': fs.readFileSync(path.join(ROOT, 'admin/vendor/LICENSE-jsquash-webp.txt'), 'utf8'),
  };
}

/* ---------- security headers ---------- */
export function headersFile(c, routes) {
  const SITE = "default-src 'self'; script-src 'self' 'unsafe-inline' https://plausible.io; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://i.ytimg.com; frame-src https://www.youtube.com https://www.youtube-nocookie.com; connect-src 'self' https://plausible.io; form-action 'self'; base-uri 'self'; object-src 'none'";
  const ADMIN = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' blob: data: https://i.ytimg.com; connect-src 'self' https://api.github.com " + c.site.url + "; form-action 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'";
  const paths = new Set(['/', '/index.html', '/404.html', ...SECTIONS.map(s => '/' + s)]);
  for (const p of [...routes.map(r => r.page.path), ...c.staticDirs.filter(d => d !== '/admin/')]) if (p !== '/') { paths.add(p.replace(/\/$/, '')); paths.add(p + '*'); }
  return `# Generated by the build. The page policy lists the only places a page may load from.\n# The admin page has its own, because it talks to GitHub and nothing else does.\n` +
    [...paths].map(p => `${p}\n  Content-Security-Policy: ${SITE}\n`).join('') +
    `/admin/*\n  Content-Security-Policy: ${ADMIN}\n  X-Robots-Tag: noindex\n` +
    `/admin/build.json\n  Access-Control-Allow-Origin: *\n  Cache-Control: no-store\n`;
}
