// shared browser setup: local fonts, placeholder YouTube thumbs, static server
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const font = f => require.resolve(f);
const FONT = {
  archivo: font('@fontsource-variable/archivo/files/archivo-latin-standard-normal.woff2'),
  inst: font('@fontsource-variable/instrument-sans/files/instrument-sans-latin-standard-normal.woff2'),
  m4: font('@fontsource/space-mono/files/space-mono-latin-400-normal.woff2'),
  m7: font('@fontsource/space-mono/files/space-mono-latin-700-normal.woff2'),
};
const CSS = `
@font-face{font-family:'Archivo';font-weight:100 900;font-stretch:62% 125%;src:url(https://fonts.gstatic.com/l/archivo) format('woff2')}
@font-face{font-family:'Instrument Sans';font-weight:400 700;src:url(https://fonts.gstatic.com/l/inst) format('woff2')}
@font-face{font-family:'Space Mono';font-weight:400;src:url(https://fonts.gstatic.com/l/m4) format('woff2')}
@font-face{font-family:'Space Mono';font-weight:700;src:url(https://fonts.gstatic.com/l/m7) format('woff2')}`;
const MIME = { '.html':'text/html', '.svg':'image/svg+xml', '.webp':'image/webp', '.jpg':'image/jpeg', '.png':'image/png', '.js':'text/javascript', '.css':'text/css', '.xml':'text/xml', '.txt':'text/plain' };
function serve(root, port){
  return new Promise(res => {
    const s = http.createServer((q, r) => {
      let p = decodeURIComponent(q.url.split('?')[0]);
      /* the three Netlify rewrites from _redirects: served as home, address kept */
      if (/^\/(contact|faq|about)\/?$/.test(p)) p = '/index.html';
      let f = path.join(root, p);
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
      if (!fs.existsSync(f)){ r.writeHead(404, {'content-type':'text/html'}); return r.end(fs.readFileSync(path.join(root,'404.html'))); }
      r.writeHead(200, {'content-type': MIME[path.extname(f)] || 'application/octet-stream'}); r.end(fs.readFileSync(f));
    }).listen(port, () => res(s));
  });
}
const HUES = ['#0015FF','#FF1245','#E9F500','#8B8B92'];
async function wire(ctx, { theme } = {}){
  if (theme) await ctx.addInitScript(t => { try{ localStorage.setItem('hd-theme', t); }catch(e){} }, theme);
  await ctx.route(/fonts\.googleapis\.com/, r => r.fulfill({ contentType:'text/css', body: CSS }));
  await ctx.route(/fonts\.gstatic\.com\/l\/(\w+)/, r => { const k = r.request().url().split('/l/')[1]; r.fulfill({ contentType:'font/woff2', body: fs.readFileSync(FONT[k]) }); });
  await ctx.route(/i\.ytimg\.com\/vi\/([^/]+)\//, r => {
    const id = r.request().url().match(/vi\/([^/]+)\//)[1];
    const h = HUES[[...id].reduce((a,c)=>a+c.charCodeAt(0),0) % HUES.length];
    r.fulfill({ contentType:'image/svg+xml', body:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="${h}"/><rect x="60" y="60" width="1160" height="600" fill="none" stroke="#06070F" stroke-width="14"/><text x="640" y="400" font-family="Arial" font-weight="900" font-size="110" text-anchor="middle" fill="#06070F">${id}</text></svg>` });
  });
  await ctx.route(/plausible\.io|youtube(-nocookie)?\.com/, r => r.abort());
}
module.exports = { chromium, serve, wire };
