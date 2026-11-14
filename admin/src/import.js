/* ---------- adding and replacing images ----------
   Three ways in: files from this device (library, camera, drop, paste), or an image the site already has.
   Every new file is read, turned upright, resized and re-saved here in the browser, so what gets sent is
   already web-sized and carries no location data. Nothing joins the page until you press the button. */
let imp = null;
const MAXEDGE = 2500, ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif';
const slug = n => String(n).replace(/\.\w+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'image';
const folderOf = p => { const m = p.match(/\/PAGES\/(.+)\/[^/]+$/); return m ? m[1].split('/').pop() : p.split('/').slice(-2, -1)[0] || 'Other'; };
const allImages = () => [...Object.keys(cur._up || {}), ...Object.keys(MEDIA)];
function targetOf(t) {
  if (t.mode === 'add') { const r = resolve(t.list); return r && { def: r.def, list: r.data, label: r.def.label, one: r.def.one, room: r.def.max ? r.def.max - r.data.length : 99, tf: r.def.fields.find(f => f.k === 'alt' || f.k === 'caption') }; }
  const r = resolve(t.path); if (!r) return null;
  const f = r.node.fields.find(f => f.k === t.k) || { label: 'Image', folder: r.def.folder, logo: r.def.logo, hero: r.def.hero, minEdge: r.def.minEdge };
  return { def: f, obj: r.data, label: f.label, one: 'image', room: 1 };
}
function openImport(t, files, place) { const T = targetOf(t); if (!T) return; if (T.room < 1) return toast(`${T.label} is full. Remove one first.`);
  imp = { t, T, single: t.mode === 'replace', stage: 'source', rows: [], place: place || 'end', sel: new Set(), q: '', folder: 'All', back: document.activeElement };
  if (files && files.length) addFiles(files); else drawImport(true); }
const impTitle = () => imp.single ? (imp.T.obj[imp.t.k] ? `Replace ${imp.T.label.toLowerCase()}` : `Choose ${imp.T.label.toLowerCase()}`) : `Add to ${imp.T.label}`;
const fileInput = (multi, cam) => `<input class="vh" type="file" accept="${cam ? 'image/*' : ACCEPT}" ${multi ? 'multiple' : ''} ${cam ? 'capture="environment"' : ''} data-files>`;

function drawImport(focus) { const s = imp.single, n = allImages().length;
  if (imp.stage === 'source') sheet(layer2, 'imp-h', impTitle(), `
    <label class="dropzone mouse-only">${I.up}<b>Drop ${s ? 'an image' : 'images'} here</b><span class="btn small line">Browse files</span><span class="fine">or paste from the clipboard</span>${fileInput(!s)}</label>
    <div class="srcs">
      <label class="src touch-only">${I.pics}<span><b>Photo library</b><small>${s ? 'Choose a photo' : 'Choose one or many at once'}</small></span>${I.go}${fileInput(!s)}</label>
      <label class="src touch-only">${I.cam}<span><b>Take a photo</b><small>Opens the camera</small></span>${I.go}${fileInput(false, true)}</label>
      <button class="src" data-lib>${I.site}<span><b>Already on your site</b><small>${n} images. No second copy is made.</small></span>${I.go}</button>
    </div>
    <p class="fine">JPG, PNG, or WebP at any size. Each one is cut to every size the site uses, right here on this device, and location data is stripped out.${imp.T.def.share ? ' Share images work best at 1200 by 630.' : imp.T.def.logo ? ' For a logo, use a PNG or WebP with a clear background.' : ''}</p>`);
  else if (imp.stage === 'tray') { sheet(layer2, 'imp-h', impTitle(), `<div><p class="fine" id="imp-prog-t" role="status"></p><div class="prog" id="imp-prog"><i></i></div></div>
    <ul class="trows" id="imp-rows">${imp.rows.map(rowHTML).join('')}</ul><p class="fine" id="imp-note"></p>
    ${s ? `<p class="fine">The description stays as it is. Update it if the new picture shows something different.</p>` : `<label class="btn small line" style="justify-self:start">${I.plus}Add more${fileInput(true)}</label>`}`,
    `${!s && imp.T.list.length ? `<div class="footl"><span>Put at the</span><div class="seg" role="group" aria-label="Where to put them"><button data-place="start" aria-pressed="${imp.place === 'start'}">Start</button><button data-place="end" aria-pressed="${imp.place === 'end'}">End</button></div></div>` : `<button class="btn small line" data-src>Back</button>`}<button class="btn primary" id="imp-go" disabled></button>`, true); trayChrome(); }
  else { const fs = ['All', ...(Object.keys(cur._up || {}).length ? ['New'] : []), ...[...new Set(Object.keys(MEDIA).map(folderOf))].sort()];
    sheet(layer2, 'imp-h', 'Your site images', `<div class="field"><label class="vh" for="lib-q">Search by name</label><input type="search" id="lib-q" placeholder="Search by name" value="${esc(imp.q)}" autocomplete="off"></div>
      <div class="folders" id="lib-f">${fs.map(f => `<button data-folder="${esc(f)}" aria-pressed="${f === imp.folder}">${esc(f)}</button>`).join('')}</div><ul class="lib" id="lib-grid"></ul>`,
      `<button class="btn small line" data-src>Back</button><button class="btn primary" id="lib-go" disabled></button>`, true); libGrid(); }
  if (focus) { const c = imp.stage === 'source' ? [...layer2.querySelectorAll('.dropzone input, .src input, button.src')].find(e => e.closest('.dropzone, .src').offsetParent) : imp.stage === 'library' && innerWidth >= 900 ? $('lib-q') : null; (c || layer2.querySelector('[data-close2]')).focus({ preventScroll: true }); } }

/* ---------- the tray: one row per file, each with its own state ---------- */
function statHTML(r) { const o = r.out;
  if (r.status === 'err') return `<div class="terr">${esc(r.msg)}</div>`;
  if (r.status !== 'ok') return `<div class="tmeta">${r.status === 'work' ? 'Resizing' : 'Waiting'}</div>`;
  return `<div class="tmeta">${o.ow} × ${o.oh}, ${size(o.obytes)} <span aria-hidden="true">→</span><span class="vh"> becomes </span> <b>${o.sizes.length > 1 ? `${o.sizes.length} web sizes` : '1 web size'}, ${size(o.bytes)}</b></div><div class="tmeta">${o.sizes.map(s => `${s.label} ${s.w} × ${s.h}`).join(' · ')}</div>${(r.warn || []).map(w => `<div class="twarn">${esc(w)}</div>`).join('')}`; }
const picHTML = r => r.status === 'ok' ? `<img class="tpic" src="${r.out.t}" alt="">` : `<div class="tpic">${r.status === 'err' ? I.x : '<i></i>'}</div>`;
function rowHTML(r) { const tf = !imp.single && imp.T.tf;
  return `<li class="trow${r.status === 'err' ? ' err' : ''}" id="tr-${r.id}"><div class="tpw">${picHTML(r)}</div><div class="tbody"><strong>${esc(r.name)}</strong><div class="tstat">${statHTML(r)}</div>
    </div><button class="iconbtn" data-rm="${r.id}" aria-label="Remove ${esc(r.name)}">${I.x}</button>
    ${tf ? `<div class="field talt" ${r.status === 'err' ? 'hidden' : ''}><label class="vh" for="ta-${r.id}">${esc(tf.label)} for ${esc(r.name)}</label><input type="text" id="ta-${r.id}" data-alt="${r.id}" value="${esc(r.alt)}" placeholder="${tf.k === 'alt' ? 'Describe what this image shows' : 'Caption'}" autocomplete="off"></div>` : ''}</li>`; }
function updateRow(r) { const li = $('tr-' + r.id); if (!li) return; li.classList.toggle('err', r.status === 'err'); li.querySelector('.tpw').innerHTML = picHTML(r); li.querySelector('.tstat').innerHTML = statHTML(r); const a = li.querySelector('.talt'); if (a) a.hidden = r.status === 'err'; trayChrome(); }
function trayChrome() { if (!imp || imp.stage !== 'tray' || !$('imp-go')) return; const rs = imp.rows, done = rs.filter(r => r.status === 'ok' || r.status === 'err').length, ok = rs.filter(r => r.status === 'ok'), use = Math.min(ok.length, imp.T.room), busy = done < rs.length;
  $('imp-prog-t').textContent = busy ? `Preparing ${done + 1} of ${rs.length}. This happens on your device.` : ok.length ? `Ready. ${size(ok.reduce((a, r) => a + r.out.obytes, 0))} in, ${size(ok.reduce((a, r) => a + r.out.bytes, 0))} to send.` : 'Nothing to add yet.';
  $('imp-prog').firstElementChild.style.width = (rs.length ? done / rs.length * 100 : 0) + '%';
  $('imp-note').textContent = ok.length > imp.T.room ? `${imp.T.label} holds ${imp.T.def.max}. Only the first ${use} will be added.` : imp.T.tf && imp.T.tf.k === 'alt' && !imp.single && ok.length ? 'Descriptions can wait, but publishing is held until every image has one.' : '';
  const b = $('imp-go'); b.disabled = busy || !use; b.textContent = imp.single ? 'Use this image' : `Add ${plural(use, imp.T.one)}`; }
function addFiles(files) { const list = [...files]; if (!list.length || !imp) return; if (imp.single) { imp.rows = []; list.length = 1; }
  for (const file of list) { if (imp.rows.length >= 30) { toast('30 at a time. Add the rest after these.'); break; }
    if (imp.rows.some(r => r.file.name === file.name && r.file.size === file.size)) continue;
    imp.rows.push({ id: 'r' + (++uid), file, name: file.name && file.name !== 'image.png' ? file.name : 'pasted-image.png', status: 'wait', alt: '' }); }
  imp.stage = 'tray'; drawImport(); pump(); }
async function pump() { const me = imp; if (me.busy) return; me.busy = true; let r;
  while (imp === me && (r = me.rows.find(x => x.status === 'wait'))) { r.status = 'work'; updateRow(r); await new Promise(requestAnimationFrame);
    try { r.out = await prepare(r.file, me.T.def); r.warn = warnings(r, me); r.path = uniquePath(me.T.def.folder || 'Uploads', slug(r.name), r.out.ext, me); r.status = 'ok'; } catch (e) { r.status = 'err'; r.msg = e && e.message || 'This file could not be read.'; }
    if (imp === me) updateRow(r); }
  me.busy = false; }
/* A new image never takes a name that was used before: files under /ASSETS are cached for a year, so a reused name would show
   the old picture to returning visitors. Every size of the image is checked, not just the full one. */
function uniquePath(folder, base, ext, me) { const taken = new Set([...allImages(), ...me.rows.map(r => r.path).filter(Boolean)].flatMap(p => [p, ...Object.values(variantPaths(p, true))]).map(p => p.toLowerCase())); let n = 1, p;
  const root = me.T.def.share ? '/ASSETS/Social Share/' : `/ASSETS/IMAGES/PAGES/${folder}/`;
  do { p = `${root}${base}${n > 1 ? '-' + n : ''}.${ext}`; n++; } while ([p, ...Object.values(variantPaths(p, true))].some(x => taken.has(x.toLowerCase()))); return p; }
function warnings(r, me) { const o = r.out, d = me.T.def, w = [], need = d.minEdge != null ? d.minEdge : d.logo ? 0 : 1200, s = slug(r.name);
  if (Math.max(o.ow, o.oh) < need) w.push(`Small for this spot at ${o.ow} × ${o.oh}. It may look soft on large screens. ${need} or more on the long side is safer.`);
  if (d.hero && o.oh > o.ow) w.push('Tall image. This spot is wide, so the top and bottom will be cropped. You can set what stays in frame after adding it.');
  if (d.share && (o.ow / o.oh < 1.6 || o.ow / o.oh > 2.1)) w.push('Share images are shown wide, about 1200 by 630. This shape will be cropped by the apps that show it.');
  if (Object.keys(MEDIA).some(p => slug(fileName(p).replace(/ /g, '-')) === s)) w.push('An image with this name is already on your site. If it is the same picture, use Already on your site and skip the second copy.');
  return w; }

/* ---------- read, turn upright, resize, re-save ---------- */
const blobOf = (c, type, q) => new Promise(res => c.toBlob(res, type, q));
function steps(src, w, h) { let sw = src.width, sh = src.height, s = src;                 /* halve in steps: sharper than one big jump */
  while (sw / 2 > w) { sw = Math.round(sw / 2); sh = Math.round(sh / 2); const c = document.createElement('canvas'); c.width = sw; c.height = sh; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(s, 0, 0, sw, sh); s = c; }
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(s, 0, 0, w, h); return c; }
/* Every size the site uses, made in one go. Grids load the small copy, full-screen views the middle one, the lightbox the
   full one. Hero slides also get a tall crop for phones. The share image stays a JPG: some apps cannot read WebP previews.
   Browsers that cannot write WebP themselves (Safari) use a small built-in encoder, so every device gives the same files. */
const TALL = 0.462, WEBP_Q = .82;
const WEBP_OPTS = { quality: 82, target_size: 0, target_PSNR: 0, method: 4, sns_strength: 50, filter_strength: 60, filter_sharpness: 0, filter_type: 1, partitions: 0, segments: 4, pass: 1, show_compressed: 0,
  preprocessing: 0, autofilter: 0, partition_limit: 0, alpha_compression: 1, alpha_filtering: 1, alpha_quality: 100, lossless: 0, exact: 0, image_hint: 0, emulate_jpeg_size: 0, thread_level: 0, low_memory: 0, near_lossless: 100, use_delta_palette: 0, use_sharp_yuv: 0 };
let encoder = null;
const here = () => location.href.replace(/[?#].*$/, '').replace(/[^/]*$/, '');
async function webp(c) {
  const b = await blobOf(c, 'image/webp', WEBP_Q); if (b && b.type === 'image/webp') return b;
  if (!encoder) encoder = import(here() + 'vendor/webp_enc.js').then(m => m.default({ noInitialRun: true, locateFile: f => here() + 'vendor/' + f })).catch(e => { encoder = null; throw e; });
  let m; try { m = await encoder; } catch (e) { throw new Error('This browser could not make web images. Try again, or add this one from a computer.'); }
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height), out = m.encode(d.data, c.width, c.height, WEBP_OPTS);
  if (!out) throw new Error('This image could not be converted. Try exporting it again.'); return new Blob([out], { type: 'image/webp' }); }
function heroCrop(c, x) { const w = c.width, h = c.height, ch = Math.min(h, 2338), k = ch / h, cw = Math.min(Math.round(w * k), Math.round(ch * TALL)), sw = cw / k, t = document.createElement('canvas'); t.width = cw; t.height = ch;
  const g = t.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(c, (w - sw) * (x == null ? 50 : x) / 100, 0, sw, h, 0, 0, cw, ch); return t; }
async function prepare(file, def) {
  const nt = (file.type || '') + ' ' + file.name;
  if (!/^image\/(jpeg|png|webp|avif|heic|heif)$/i.test(file.type) && !/\.(jpe?g|png|webp|avif|heic|heif)$/i.test(file.name)) throw new Error(/svg|gif/i.test(nt) ? 'GIF and SVG files are not used for pictures here. Use JPG, PNG, or WebP.' : /pdf|psd|tiff?|raw|cr2|arw|nef|dng/i.test(nt) ? 'This is a working file, not a web image. Export a JPG and add that.' : 'This is not an image file. Use JPG, PNG, or WebP.');
  if (file.size > 80 * 1048576) throw new Error(`This file is ${size(file.size)}. Export a copy under 80 MB and add that.`);
  let src = null; try { src = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) {
    src = await new Promise(res => { const im = new Image(), u = URL.createObjectURL(file); im.onload = () => { URL.revokeObjectURL(u); im.width = im.naturalWidth; im.height = im.naturalHeight; res(im); }; im.onerror = () => { URL.revokeObjectURL(u); res(null); }; im.src = u; }); }
  if (!src || !src.width) throw new Error(/hei[cf]/i.test(nt) ? 'This browser cannot open HEIC photos. Choose it from the phone photo library, which converts it, or export a JPG.' : 'This file could not be opened. It may be damaged. Export it again and retry.');
  const ow = src.width, oh = src.height, long = Math.max(ow, oh), jpg = !!def.share;
  const fitTo = edge => { const k = Math.min(1, edge / long); return [Math.max(1, Math.round(ow * k)), Math.max(1, Math.round(oh * k))]; };
  const save = async c => { const b = jpg ? await blobOf(c, 'image/jpeg', .86) : await webp(c); if (!b) throw new Error('This device ran out of room while resizing. Try this one on its own.'); return b; };
  const [w, h] = fitTo(jpg ? 1920 : MAXEDGE);
  let small = null; if ((w < ow) && src.close) try { small = await createImageBitmap(src, { resizeWidth: w, resizeHeight: h, resizeQuality: 'high' }); if (small.width !== w || small.height !== h) { small.close(); small = null; } } catch (e) { small = null; }
  const c = steps(small || src, w, h), files = { full: { blob: await save(c), w, h } }, sizes = [{ label: jpg ? 'Share' : 'Full', w, h, bytes: files.full.blob.size }];
  if (!jpg) for (const [kind, label, edge] of [['view', 'Viewing', def.hero ? 2400 : 1800], ['thumb', 'Grid', 800]]) {
    if (edge >= Math.max(w, h)) { files[kind] = files.full; continue; }                 /* already small enough: the same file serves */
    const [vw, vh] = fitTo(edge); files[kind] = { blob: await save(steps(c, vw, vh)), w: vw, h: vh }; sizes.push({ label, w: vw, h: vh, bytes: files[kind].blob.size }); }
  if (def.hero) { const t = heroCrop(c, 50); files.hero = { blob: await save(t), w: t.width, h: t.height }; sizes.push({ label: 'Phone crop', w: t.width, h: t.height, bytes: files.hero.blob.size }); }
  const tk = Math.min(1, 360 / Math.max(w, h)), tc = steps(c, Math.max(1, Math.round(w * tk)), Math.max(1, Math.round(h * tk)));
  let t = tc.toDataURL('image/webp', .7); if (!t.startsWith('data:image/webp')) t = tc.toDataURL('image/jpeg', .75);
  if (src.close) src.close(); if (small) small.close();
  return { files, ext: jpg ? 'jpg' : 'webp', w, h, ow, oh, sizes, bytes: sizes.reduce((a, s) => a + s.bytes, 0), obytes: file.size, t };
}

/* ---------- putting them on the page ---------- */
function knownAlt(p) { let found = ''; (function look(o) { if (found || !o || typeof o !== 'object') return; if (Array.isArray(o)) return o.forEach(look);
  if (o.image === p && o.alt) found = o.alt; else if (o.img === p && o.alt) found = o.alt; else if (o.hero === p && o.heroAlt) found = o.heroAlt; Object.values(o).forEach(look); })(cur); return found; }
function commit(picks) {                                   /* picks: [{path, alt, out}] */
  const me = imp, T = me.T; if (!picks.length) return; snap(); cur._up = cur._up || {};
  picks.forEach(p => { if (p.out) { cur._up[p.path] = { t: p.out.t, w: p.out.w, h: p.out.h, kb: Math.max(1, Math.round(p.out.bytes / 1024)), n: p.out.sizes.length, hero: !!p.out.files.hero, files: {} }; BLOBS.set(p.path, { url: URL.createObjectURL(p.out.files.full.blob), files: p.out.files }); } });
  if (me.single) { T.obj[me.t.k] = picks[0].path; closeTop(); const y = scrollY; render(); scrollTo(0, y); if (editing) { redrawEditor(); markEditing(); } return toast('Image replaced', true); }
  const def = T.def, ik = def.img || 'image', items = picks.slice(0, T.room).map(p => { const it = { ...clone(typeof def.blank === 'function' ? def.blank() : def.blank || {}), [ik]: p.path, _id: 'i' + (++uid), _new: 1 }; if (T.tf) it[T.tf.k] = (p.alt || '').trim(); tag(itemNode(def, it), it); return it; });
  if (me.place === 'start') T.list.unshift(...items); else T.list.push(...items);
  closeTop(); render(); const need = items.filter(it => S.bad.has(it._id)).length;
  toast(`Added ${plural(items.length, def.one)}.${need ? (items.length === 1 ? ' It still needs' : need === 1 ? ' 1 still needs' : ` ${need} still need`) + ' details.' : ''}`, true);
  const el = document.querySelector(`.item[data-id="${items[0]._id}"]`); if (el) { el.scrollIntoView({ block: 'center' }); const b = el.querySelector('[data-open]'); if (b) b.focus({ preventScroll: true }); } }

/* ---------- images the site already has ---------- */
function libGrid() { const q = imp.q.trim().toLowerCase(), here = new Set(imp.single ? [] : imp.T.list.map(it => it[imp.T.def.img || 'image'])), up = cur._up || {};
  const list = allImages().filter(p => (imp.folder === 'All' || (imp.folder === 'New' ? up[p] : !up[p] && folderOf(p) === imp.folder)) && (!q || fileName(p).toLowerCase().includes(q)) && !(imp.T.def.logo ? false : /logo/i.test(p) && !q));
  $('lib-grid').innerHTML = list.map(p => `<li><button data-libp="${esc(p)}" aria-pressed="${imp.sel.has(p)}" aria-label="${esc(fileName(p))}"><img src="${thumb(p)}" alt="" loading="lazy">${here.has(p) ? '<span class="used">In use here</span>' : ''}<span class="tick">${I.tick}</span><span>${esc(fileName(p))}</span></button></li>`).join('') || '<li class="fine" style="grid-column:1/-1">Nothing matches.</li>';
  const n = Math.min(imp.sel.size, imp.T.room), b = $('lib-go'); b.disabled = !n; b.textContent = imp.single ? 'Use this image' : n ? `Add ${plural(n, imp.T.one)}` : 'Choose images'; }

layer2.addEventListener('click', e => { const t = e.target, b = t.closest('button'); if (t.id === 'scrim2' || (b && b.dataset.close2 !== undefined)) { const back = imp && imp.back; closeTop(); return back && back.isConnected && back.focus({ preventScroll: true }); }
  if (!b) return;
  if (!imp) return;
  if (b.dataset.lib !== undefined) { imp.stage = 'library'; return drawImport(true); }
  if (b.dataset.src !== undefined) { imp.stage = imp.rows.length ? 'tray' : 'source'; imp.sel.clear(); return drawImport(true); }
  if (b.dataset.rm) { imp.rows = imp.rows.filter(r => r.id !== b.dataset.rm); if (!imp.rows.length) { imp.stage = 'source'; return drawImport(true); } $('tr-' + b.dataset.rm).remove(); return trayChrome(); }
  if (b.dataset.place) { imp.place = b.dataset.place; return b.parentNode.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); }
  if (b.dataset.folder) { imp.folder = b.dataset.folder; b.parentNode.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); return libGrid(); }
  if (b.dataset.libp) { const p = b.dataset.libp; if (imp.single) { imp.sel.clear(); imp.sel.add(p); } else if (imp.sel.has(p)) imp.sel.delete(p); else if (imp.sel.size < imp.T.room) imp.sel.add(p); else return toast(`${imp.T.label} has room for ${imp.T.room} more.`);
    const y = layer2.querySelector('.sheet-body').scrollTop; libGrid(); layer2.querySelector('.sheet-body').scrollTop = y; const again = layer2.querySelector(`[data-libp="${CSS.escape(p)}"]`); return again && again.focus({ preventScroll: true }); }
  if (b.id === 'lib-go') return commit([...imp.sel].map(p => ({ path: p, alt: imp.T.tf && imp.T.tf.k === 'alt' ? knownAlt(p) : '' })));
  if (b.id === 'imp-go') return commit(imp.rows.filter(r => r.status === 'ok').map(r => ({ path: r.path, alt: r.alt, out: r.out }))); });
layer2.addEventListener('change', e => { const el = e.target; if (el.matches('[data-files]')) { const f = [...el.files]; el.value = ''; addFiles(f); } });
layer2.addEventListener('input', e => { const el = e.target; if (el.dataset.alt) { const r = imp.rows.find(x => x.id === el.dataset.alt); if (r) r.alt = el.value; } if (el.id === 'lib-q') { imp.q = el.value; libGrid(); } });

/* ---------- dragging files in from the desktop, and pasting ---------- */
document.addEventListener('dragstart', e => e.preventDefault());
let dragN = 0; const hasFiles = e => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
const dropMsg = on => { document.querySelectorAll('.dropmsg').forEach(x => x.remove()); document.body.classList.toggle('filedrag', on && !layer2.firstChild); document.querySelectorAll('[data-drop].over').forEach(x => x.classList.remove('over'));
  if (on) { const d = document.createElement('div'); d.className = 'dropmsg'; d.textContent = imp && imp.stage !== 'library' ? 'Drop to add to this batch' : 'Drop onto a highlighted area'; document.body.appendChild(d); } };
addEventListener('dragenter', e => { if (!hasFiles(e)) return; e.preventDefault(); if (!dragN++) dropMsg(true); });
addEventListener('dragover', e => { if (!hasFiles(e)) return; e.preventDefault(); const t = e.target.closest && e.target.closest('[data-drop]'); document.querySelectorAll('[data-drop].over').forEach(x => x !== t && x.classList.remove('over')); if (t) t.classList.add('over');
  e.dataTransfer.dropEffect = t || (imp && imp.stage !== 'library') || document.querySelectorAll('#main [data-drop]').length === 1 ? 'copy' : 'none'; });
addEventListener('dragleave', e => { if (!hasFiles(e)) return; if (!--dragN) dropMsg(false); });
addEventListener('drop', e => { if (!hasFiles(e)) return; e.preventDefault(); dragN = 0; dropMsg(false); const files = [...e.dataTransfer.files];
  if (imp && imp.stage !== 'library') return addFiles(files); if (layer2.firstChild) return;
  const t = e.target.closest && e.target.closest('[data-drop]'), only = document.querySelectorAll('#main [data-drop]');
  if (t) return openImport(JSON.parse(t.dataset.drop), files); if (only.length === 1 && !editing) return openImport(JSON.parse(only[0].dataset.drop), files);
  toast('Drop onto one of the highlighted areas.'); });
addEventListener('paste', e => { const files = [...((e.clipboardData && e.clipboardData.files) || [])].filter(f => f.type.startsWith('image/')); if (!files.length) return;
  if (imp && imp.stage !== 'library') { e.preventDefault(); return addFiles(files); }
  const typing = e.target.matches && e.target.matches('input,textarea'), only = document.querySelectorAll('#main [data-drop]'), ed = layer.querySelector('.preview[data-drop]');
  if (typing || layer2.firstChild) return; const t = ed || (only.length === 1 && only[0]); if (t) { e.preventDefault(); openImport(JSON.parse(t.dataset.drop), files); } });

(document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(render); render(); addEventListener('resize', () => bar());
