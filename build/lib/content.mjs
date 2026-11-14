// Loads every content file into one object the renderers can read.
import fs from 'node:fs';
import path from 'node:path';
import { imageSize } from './images.mjs';
import { THUMB } from './html.mjs';

export function loadContent(ROOT) {
  const json = f => {
    try { return JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')); }
    catch (e) { throw new Error(`${f} could not be read: ${e.message}`); }
  };
  const c = {
    site: json('content/site.json'),
    home: json('content/home.json'),
    design: json('content/design.json'),
    photo: json('content/photo.json'),
    video: json('content/video.json'),
    nav: json('content/navigation.json'),
    redirects: json('content/redirects.json').redirects,
    dims: json('build/dims.json'),
    published: fs.existsSync(path.join(ROOT, 'build/published-paths.json')) ? json('build/published-paths.json') : [],
    dimsAdded: [],
  };
  const pages = json('content/pages.json');
  c.pages = pages.pages; c.staticPages = pages.staticPages || [];
  c.studies = json('content/case-studies.json').order.map(slug => json(`content/studies/${slug}.json`));
  c.page = id => {
    const p = c.pages.find(x => x.id === id) || c.studies.find(x => x.id === id);
    if (!p) throw new Error(`Something links to a page called "${id}", which does not exist.`);
    return p;
  };
  /* pixel size of a file under the site root, given its public address */
  c.fileOf = url => path.join(ROOT, decodeURIComponent(url.split('?')[0]));
  c.sizeOf = url => { const f = c.fileOf(url); return fs.existsSync(f) ? imageSize(f) : null; };
  /* grid sizes are remembered in build/dims.json so the page can reserve
     space; an image that is not in there yet is measured and added */
  c.dimOf = src => {
    let f; try { f = decodeURIComponent(src).split('/').pop(); } catch (e) { return null; }
    const hit = c.dims[f] || c.dims[f.replace(/\+/g, ' ')] || c.dims[f.replace(/ /g, '+')];
    if (hit) return hit;
    const s = c.sizeOf(src);
    if (!s) return null;
    c.dims[f] = `${s.w}x${s.h}`; c.dimsAdded.push(f);
    return c.dims[f];
  };
  return c;
}
