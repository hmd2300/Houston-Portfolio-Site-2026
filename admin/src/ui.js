/* ---------- drawing ---------- */
const fid = (path, k) => `f-${path}-${k}`.replace(/[^\w-]/g, '_');
const gid = path => 'g-' + path.replace(/[^\w-]/g, '_');
const drop = t => `data-drop="${esc(JSON.stringify(t))}"`;
const AREA = { long: 3, lines: 2, paras: 6, list: 4 };
const toText = (f, v) => f.type === 'paras' ? (v || []).join('\n\n') : f.type === 'list' ? (v || []).join('\n') : v == null ? '' : v;
const fromText = (f, t) => f.type === 'paras' ? t.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean) : f.type === 'list' ? t.split('\n').map(s => s.trim()).filter(Boolean) : t;
function imgBox(f, v, path) { const t = { mode: 'replace', path, k: f.k };
  return `<div class="imgbox" ${drop(t)}>${v ? `<img class="${f.logo ? 'logo' : ''}" src="${thumb(v)}" alt=""><div class="meta"><strong>${esc(fileName(v))}</strong><span>${metaLine(v)}</span></div>` : `<div class="meta"><strong>No image yet</strong><span>${f.logo ? 'A logo file with a clear background' : 'JPG, PNG, or WebP'}</span></div>`}<button type="button" class="btn small line" data-pick="${esc(JSON.stringify(t))}">${v ? 'Replace' : 'Choose'}</button></div>`; }
function focusBox(f, it, path, imgKey) { const v = it[f.k] == null ? 50 : it[f.k], x = it[f.k2] == null ? 50 : it[f.k2], src = full(it[imgKey]), id = fid(path, f.k), id2 = fid(path, f.k2);
  return `<div class="field wide" data-f="${id}"><div class="lab"><span class="l mono">${esc(f.label)}</span></div>
    <div class="crops"><figure><div class="crop wide" style="background-image:url('${src}');background-position:center ${v}%"></div><figcaption class="mono">Wide screens</figcaption></figure><figure><div class="crop tall" style="background-image:url('${src}');background-position:${x}% center"></div><figcaption class="mono">Phones</figcaption></figure></div>
    <div class="range mono"><label for="${id}">Wide: up or down</label><input type="range" id="${id}" min="0" max="100" step="1" value="${v}" data-path="${path}" data-k="${f.k}" data-axis="y"></div>
    <div class="range mono"><label for="${id2}">Phones: left or right</label><input type="range" id="${id2}" min="0" max="100" step="1" value="${x}" data-path="${path}" data-k="${f.k2}" data-axis="x"></div>
    <p class="hint">Wide screens crop the top and bottom. Phones get their own tall crop, cut from the same picture.</p></div>`; }
function fieldHTML(f, it, path, imgKey) {
  if (f.part) return '';
  if (f.type === 'focus') return focusBox(f, it, path, imgKey);
  const v = it[f.k], id = fid(path, f.k), err = ruleOf(f, v), a = `data-path="${path}" data-k="${f.k}"`, wide = ['long', 'lines', 'paras', 'list', 'chips', 'image'].includes(f.type); let c;
  if (f.type === 'bool') return `<div class="field wide" data-f="${id}"><label class="check"><input type="checkbox" id="${id}" ${a} ${v ? 'checked' : ''}>${esc(f.label)}</label>${f.hint ? `<p class="hint">${esc(f.hint)}</p>` : ''}</div>`;
  if (f.type === 'select') c = `<select id="${id}" ${a}><option value="">Choose…</option>${opts(f).map(([val, l]) => `<option value="${esc(val)}" ${v === val ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  else if (f.type === 'chips') c = `<div class="chips" ${a}><input type="text" id="${id}" data-chipin aria-label="${esc(f.label)}: type to find or add one" placeholder="${f.suggest ? 'Or start typing' : 'Add one'}" enterkeyhint="done" ${f.suggest ? `role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${id}-sug"` : ''}><button type="button" class="btn small line" data-chipadd>Add</button>${f.suggest ? `<div class="sugs" id="${id}-sug" role="listbox" aria-label="Closest matches" hidden></div>` : ''}${(v || []).map((r, i) => `<span class="chip">${esc(r)}<button type="button" data-chip="${i}" aria-label="Remove ${esc(r)}">${I.x}</button></span>`).join('')}</div>`;
  else if (f.type === 'image') c = imgBox(f, v, path);
  else if (AREA[f.type]) c = `<textarea id="${id}" ${a} rows="${AREA[f.type]}" autocomplete="off">${esc(toText(f, v))}</textarea>`;
  else c = `<input type="${f.type === 'number' ? 'number' : 'text'}" id="${id}" ${a} value="${esc(v)}" autocomplete="off" autocapitalize="${['youtube', 'path', 'url'].includes(f.type) || f.rule ? 'none' : 'sentences'}" ${f.type === 'number' ? 'inputmode="numeric"' : f.type === 'url' ? 'inputmode="url"' : ''}>`;
  if (f.type === 'chips' && f.suggest) { const have = new Set((v || []).map(x => x.toLowerCase())), left = f.suggest().filter(x => !have.has(x.toLowerCase()));
    if (left.length) c = `<select id="${id}-pick" data-chipsel aria-label="Pick a ${f.one} you have used before"><option value="">Pick a ${f.one}…</option>${left.map(x => `<option>${esc(x)}</option>`).join('')}</select>` + c; }
  const n = String(toText(f, v)).length, ok = f.type === 'youtube' && !err;
  return `<div class="field${err ? ' bad' : ''}${wide ? ' wide' : ''}" data-f="${id}"><div class="lab">${f.type === 'image' || f.type === 'chips' ? `<span class="l mono">${esc(f.label)}</span>` : `<label class="mono" for="${id}">${esc(f.label)}</label>`}${f.max ? `<span class="ct${n > f.max ? ' over' : ''}">${n}/${f.max}</span>` : ''}</div>${c}<p class="msg" ${err ? '' : 'hidden'}>${esc(err)}</p>${f.type === 'youtube' ? `<p class="ok" ${ok ? '' : 'hidden'}>${ok ? 'Video ID ' + ytId(v) : ''}</p>` : ''}${f.hint ? `<p class="hint">${esc(f.hint)}</p>` : ''}</div>`;
}
const cardHTML = (fields, data, path, cols) => fields.length ? `<div class="card${cols ? ' cols' : ''}">${fields.map(f => fieldHTML(f, data, path)).join('')}</div>` : '';
function itemHTML(def, it, i, lp, list) {
  const bad = S.bad.get(it._id), nm = esc(nameOf(it, def)), p = `${lp}/#${it._id}`, num = `<span class="num">${i + 1}</span>`;
  const grip = list.length > 1 ? `<span class="grip" data-grip role="button" tabindex="0" aria-label="Reorder ${nm}. Use the arrow keys.">${I.grip}</span>` : def.view === 'rows' ? '<span class="nogrip"></span>' : '';
  const st = def.sub ? def.sub(it) : '', sub = bad ? `<span class="warn">${esc(bad)}</span>` : st ? `<span>${esc(st)}</span>` : '';
  const cls = `item${bad ? ' err' : S.changed.has(it._id) ? ' changed' : ''}`, a = `data-id="${it._id}" data-path="${p}"`;
  if (def.view === 'rows') { const tg = def.tag ? def.tag(it, list) : '', th = def.thumb ? `<img class="thumb${def.logo ? ' logo' : ''}" src="${thumb(def.thumb(it))}" alt="">` : '', sp = def.strip && def.strip(it);
    return `<li class="${cls}" ${a}>${grip}<button class="hit" data-open>${def.tag || def.thumb ? '' : num}${th}<span class="cap">${tg ? `<em>${esc(tg)}</em>` : ''}<strong>${nm}</strong>${sub}</span>${sp && sp.length ? `<span class="strip">${sp.filter(Boolean).slice(0, 3).map(s => `<img src="${thumb(s)}" alt="">`).join('')}</span>` : ''}${I.go}</button></li>`; }
  const im = it[def.img || 'image'], yt = LIVE && def.view === 'film' && ytId(it.youtube), pic = def.view === 'image' ? `<img class="pic" src="${thumb(im)}" alt="" draggable="false" loading="lazy">` : `<span class="pic video">${I.play}${yt ? `<img data-yt src="https://i.ytimg.com/vi/${yt}/mqdefault.jpg" alt="" loading="lazy" draggable="false">` : ''}</span>`;
  const title = def.view === 'film' ? nm : def.cap ? esc(def.cap(it) || '') : '', flag = it._new ? 'New' : it.flag;
  return `<li class="${cls}" ${a}><button class="hit" data-open aria-label="Edit ${nm}"><span class="picwrap">${pic}${num}${flag ? `<span class="flag">${esc(flag)}</span>` : ''}</span>${title || sub ? `<span class="cap">${title ? `<strong>${title}</strong>` : ''}${sub}</span>` : ''}</button>${grip}</li>`;
}
function listHTML(def, list, lp) {
  const grid = def.view !== 'rows', full_ = def.max && list.length >= def.max, many = def.add === 'images';
  const limit = def.max ? (def.min === def.max ? `Always ${def.max}.` : `Up to ${def.max}.`) : '';
  const add = def.fixed || full_ ? '' : `<li><button class="addcard" data-add="${lp}">${many ? I.up : I.plus}${many ? `Add ${def.one}s` : `Add ${def.one}`}</button></li>`;
  return `<section class="group" id="${gid(lp)}"><div class="group-head"><h2>${def.label}</h2><span class="n">${list.length}</span><span class="note">${[def.note, limit].filter(Boolean).join(' ')}</span></div>
    <ol class="${grid ? 'grid' + (def.view === 'film' ? ' film' : def.two ? ' two' : '') : 'rows'}" data-list="${lp}" ${many && !full_ ? drop({ mode: 'add', list: lp }) : ''}>${list.map((it, i) => itemHTML(def, it, i, lp, list)).join('')}${add}</ol></section>`;
}
const partsHTML = (node, data, path) => node.parts.map(p => { const pp = `${path}/${p.key}`;
  if (p.kind === 'list') return listHTML(p, data[p.key], pp);
  const d = p.key[0] === '~' ? data : data[p.key];
  return `<section class="group" id="${gid(pp)}"><div class="group-head"><h2>${p.label}</h2>${p.note ? `<span class="note">${p.note}</span>` : ''}</div>${cardHTML(p.fields, d, pp, p.cols)}${partsHTML(p, d, pp)}</section>`; }).join('');
document.addEventListener('error', e => { const el = e.target; if (el.tagName === 'IMG' && el.dataset.yt !== undefined) el.remove(); }, true);
const grow = el => { el.style.height = 'auto'; el.style.height = el.scrollHeight + 2 + 'px'; };
const growAll = root => root.querySelectorAll('textarea').forEach(grow);

function render() {
  refresh(); let r = resolve(view); while (!r) { view = parentScreen(view) || 'home'; r = resolve(view); }
  const sec = secOf(view), up = parentScreen(view), title = r.trail[r.trail.length - 1], isItem = view.includes('#');
  $('switch-label').textContent = sec.short || sec.label;
  const tg = isItem && r.def.tag ? r.def.tag(r.data, r.list) : '', lede = isItem ? (r.node.desc || r.node.lede || '') : sec.lede;
  let h = up ? `<button class="back" data-go="${up}">${I.go}<span>${esc(resolve(up).trail.slice(-1)[0])}</span></button>` : '';
  const tl = !isItem && sec.top, tdef = tl && resolve(`${sec.key}/${sec.top.list}`).def;
  h += `<div class="sec-head"><h1>${esc(title)}</h1>${tl ? `<button class="btn small solid topadd" data-add="${sec.key}/${sec.top.list}" data-start>${tdef.add === 'images' ? I.up : I.plus}${sec.top.label}</button>` : ''}<p>${tg && r.node.desc && tg.toLowerCase() !== String(title).toLowerCase() ? `<span class="mono">${esc(tg)}</span> ` : ''}${esc(lede)}</p></div>`;
  const labelled = r.node.parts.filter(p => p.label);
  if (labelled.length > 3 && !sec.two) h += `<nav class="jump" aria-label="On this screen">${labelled.map(p => `<button data-jump="${gid(view + '/' + p.key)}">${p.label.replace(/ row$/, '')}</button>`).join('')}</nav>`;
  h += cardHTML(r.node.fields, r.data, view) + (sec.two && !isItem ? `<div class="twocol">${partsHTML(r.node, r.data, view)}</div>` : partsHTML(r.node, r.data, view));
  h += `<p class="note-box">${LIVE ? 'This is your real content, read from the site. Publishing is not connected yet, so nothing you change here reaches the site.' : 'Prototype on a copy of your real content. Nothing here is connected to your site.'} <button id="reset">Start over with the original content</button></p>`;
  $('main').innerHTML = h; growAll($('main')); bar(true);
}
let saveT;
function bar(fresh) {
  if (!fresh) refresh();
  const c = S.ch.filter(x => !x.note), p = S.pr, el = $('count'), by = {}, bad = {}, sm = innerWidth < 900;
  c.forEach(x => by[x.s.key] = (by[x.s.key] || 0) + 1); p.forEach(x => bad[x.s.key] = (bad[x.s.key] || 0) + 1);
  if (pub && pub.running) { el.className = 'chipbtn mono on'; el.innerHTML = '<i></i>' + (sm ? 'Sending' : 'Publishing'); }
  else if (pub && pub.failed) { el.className = 'chipbtn mono bad'; el.textContent = sm ? 'Failed' : 'Not published'; }
  else { el.className = 'chipbtn mono' + (p.length ? ' bad' : c.length ? ' on' : ''); el.textContent = p.length ? `${p.length} to fix` : c.length ? `${c.length} ${sm ? 'edit' : 'change'}${c.length > 1 ? 's' : ''}` : sm ? 'No edits' : 'No changes'; }
  $('review').disabled = !c.length || !!p.length || !!(pub && pub.running); $('undo').disabled = !hist.length;
  const sk = secOf(view).key;
  $('rail').innerHTML = railHTML(by, bad, sk);
  document.querySelectorAll('#main .item').forEach(r => { const id = r.dataset.id, b = S.bad.has(id); r.classList.toggle('err', b); r.classList.toggle('changed', !b && S.changed.has(id)); });
  clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(cur)); localStorage.setItem(KEY + '-view', view); } catch (e) {} }, 250);
}
const railHTML = (by, bad, sk) => SECTIONS.map(s => `${s.rule ? '<hr>' : ''}<button data-go="${s.key}" aria-current="${s.key === sk}">${s.label}${bad[s.key] ? `<span class="badge bad" aria-label="${bad[s.key]} to fix">${bad[s.key]}</span>` : by[s.key] ? `<span class="badge" aria-label="${plural(by[s.key], 'change')}">${by[s.key]}</span>` : ''}</button>`).join('');
function go(path, keep) { scrollMem.set(view, scrollY); closeAll(true); view = path; render(); scrollTo(0, keep ? (scrollMem.get(path) || 0) : 0); }

/* ---------- typing ---------- */
function fieldAt(path, k) { const r = resolve(path); return r && { it: r.data, f: r.node.fields.find(f => f.k === k), r }; }
function check(el) { const x = fieldAt(el.dataset.path, el.dataset.k); if (!x || !x.f) return; const { it, f } = x, err = ruleOf(f, it[f.k]), box = el.closest('.field'); if (!box) return;
  box.classList.toggle('bad', !!err); const m = box.querySelector('.msg'); if (m) { m.textContent = err; m.hidden = !err; }
  const ok = box.querySelector('.ok'); if (ok) { ok.hidden = !!err; ok.textContent = err ? '' : 'Video ID ' + ytId(it[f.k]); }
  const ct = box.querySelector('.ct'); if (ct) { const n = String(toText(f, it[f.k])).length; ct.textContent = `${n}/${f.max}`; ct.classList.toggle('over', n > f.max); } }
document.addEventListener('focusin', e => { const d = e.target.dataset; if (d && (d.path || d.chipin !== undefined) && e.target.type !== 'file') snap(); });
document.addEventListener('input', e => { const el = e.target; if (el.dataset && el.dataset.chipin !== undefined) return drawSug(el); if (!el.dataset || !el.dataset.path) return; const x = fieldAt(el.dataset.path, el.dataset.k); if (!x || !x.f) return;
  const { it, f } = x; it[f.k] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? '' : +el.value) : el.type === 'range' ? +el.value : fromText(f, el.value);
  if (el.tagName === 'TEXTAREA') grow(el);
  if (el.type === 'range') { const c = el.closest('.field').querySelector(el.dataset.axis === 'x' ? '.crop.tall' : '.crop.wide'); c.style.backgroundPosition = el.dataset.axis === 'x' ? `${el.value}% center` : `center ${el.value}%`; }
  if (el.type !== 'range') check(el); bar();
  if (editing) { const h = $('ed-title'); if (h) h.textContent = nameOf(x.r.data, x.r.def); } });
/* Closest match while typing. Order of trust: the start of a credit, the start of any word in it, anywhere inside it,
   then a near miss (a typo or two). Anything looser is not offered, so a new credit is never bent into an old one. */
const low = s => s.toLowerCase();
function lev(a, b) { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; }
function closest(q, pool) { const s = low(q.trim()); if (!s) return []; const qs = s.split(/\s+/);
  return pool.map(o => { const t = low(o), ws = t.split(/[\s/&-]+/).filter(Boolean); let sc = 0;
    if (t === s) sc = 100; else if (t.startsWith(s)) sc = 90 - (t.length - s.length) / 100; else if (qs.every(x => ws.some(w => w.startsWith(x)))) sc = 75 - ws.length / 100; else if (t.includes(s)) sc = 60;
    else if (s.length >= 4) { const full = 1 - lev(s, t) / Math.max(s.length, t.length), head = lev(s, t.slice(0, s.length)); if (full >= .75) sc = 50 * full; else if (head <= (s.length >= 7 ? 2 : 1)) sc = 40 - head; }
    return [o, sc]; }).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 4).map(x => x[0]); }
let sug = null;
function hideSug(inp) { sug = null; const el = inp && $(inp.id + '-sug'); if (el) { el.hidden = true; el.innerHTML = ''; inp.setAttribute('aria-expanded', 'false'); inp.removeAttribute('aria-activedescendant'); } }
function markSug(inp) { $(inp.id + '-sug').querySelectorAll('[role=option]').forEach((o, i) => o.setAttribute('aria-selected', i === sug.i)); inp.setAttribute('aria-activedescendant', `${inp.id}-o${sug.i}`); }
function drawSug(inp) { const box = inp.closest('.chips'), x = fieldAt(box.dataset.path, box.dataset.k); if (!x || !x.f.suggest) return; const q = inp.value.trim().replace(/,$/, ''), have = new Set((x.it[x.f.k] || []).map(low));
  if (!q || have.has(low(q))) return hideSug(inp);
  const m = closest(q, x.f.suggest().filter(o => !have.has(low(o)))), items = [...m.map(v => ({ v })), ...(m.some(o => low(o) === low(q)) ? [] : [{ v: q, fresh: true }])], el = $(inp.id + '-sug');
  sug = { id: inp.id, items, i: 0 }; el.hidden = false; inp.setAttribute('aria-expanded', 'true');
  el.innerHTML = items.map((it, i) => `<button type="button" role="option" id="${inp.id}-o${i}" data-sug="${i}" class="${it.fresh ? 'fresh' : ''}">${it.fresh ? `Add “${esc(it.v)}” as new` : esc(it.v)}</button>`).join(''); markSug(inp); el.scrollIntoView({ block: 'nearest' }); }
function addChip(box, picked) { const inp = box.querySelector('[data-chipin]'), on = !picked && sug && sug.id === inp.id && sug.items[sug.i], val = (picked || (on ? on.v : inp.value)).trim().replace(/,$/, ''); if (!val) return; sug = null; const x = fieldAt(box.dataset.path, box.dataset.k), now = x.it[x.f.k] || [];
  if (now.some(c => c.toLowerCase() === val.toLowerCase())) { inp.value = ''; return toast(`“${val}” is already on this one.`); }
  if (picked) snap(); x.it[x.f.k] = [...now, val]; redrawField(box.dataset.path, box.dataset.k, picked ? 'pick' : true); }
function redrawField(path, k, focus) { const x = fieldAt(path, k), old = document.querySelector(`[data-f="${fid(path, k)}"]`); if (!x || !old) return;
  const t = document.createElement('div'); t.innerHTML = fieldHTML(x.f, x.it, path); old.replaceWith(t.firstElementChild); bar(); if (focus) { const i = (focus === 'pick' && $(fid(path, k) + '-pick')) || $(fid(path, k)); if (i) i.focus({ preventScroll: true }); } if (editing) { const h = $('ed-title'); if (h) h.textContent = nameOf(x.r.data, x.r.def); } }
document.addEventListener('keydown', e => { const el = e.target; if (!el.matches) return;
  if (el.matches('[data-chipin]') && sug && sug.id === el.id) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sug.i = (sug.i + (e.key === 'ArrowDown' ? 1 : sug.items.length - 1)) % sug.items.length; return markSug(el); }
    if (e.key === 'Escape') { e.preventDefault(); return hideSug(el); } }
  if (el.matches('[data-chipin]') && (e.key === 'Enter' || e.key === ',')) { e.preventDefault(); addChip(el.closest('.chips')); }
  if (el.matches('[data-grip]') && ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(e.key)) { e.preventDefault(); const item = el.closest('.item'), list = resolve(item.dataset.path).list, i = list.findIndex(x => x._id === item.dataset.id), j = i + (e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 1);
    if (j >= 0 && j < list.length) { snap(); list.splice(j, 0, list.splice(i, 1)[0]); render(); document.querySelector(`.item[data-id="${item.dataset.id}"] [data-grip]`).focus(); } }
  if (e.key === 'Escape') { if (layer2.firstChild) closeTop(); else if (layer.firstChild) closeLayer(); } });

/* ---------- drag to reorder: works with a finger, a mouse, or a pen ---------- */
let drag = null;
$('main').addEventListener('pointerdown', e => { const grip = e.target.closest('[data-grip]'); if (!grip) return; e.preventDefault(); const item = grip.closest('.item');
  drag = { item, list: item.parentNode, y: e.clientY }; grip.setPointerCapture(e.pointerId); item.classList.add('drag'); snap();
  const loop = () => { if (!drag) return; if (drag.y < 120) scrollBy(0, -14); else if (drag.y > innerHeight - 90) scrollBy(0, 14); requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
$('main').addEventListener('pointermove', e => { if (!drag) return; drag.y = e.clientY; const over = document.elementFromPoint(e.clientX, e.clientY), t = over && over.closest('.item');
  if (!t || t === drag.item || t.parentNode !== drag.list) return; const kids = [...drag.list.children], from = kids.indexOf(drag.item), to = kids.indexOf(t); drag.list.insertBefore(drag.item, from < to ? t.nextSibling : t); });
const dropItem = () => { if (!drag) return; const ids = [...drag.list.querySelectorAll('.item')].map(x => x.dataset.id), list = resolve(drag.list.dataset.list).data;
  const before = list.map(x => x._id).join(); list.sort((a, b) => ids.indexOf(a._id) - ids.indexOf(b._id)); if (before === list.map(x => x._id).join()) hist.pop(); drag = null; render(); };
$('main').addEventListener('pointerup', dropItem); $('main').addEventListener('pointercancel', dropItem);

/* ---------- the editor panel ---------- */
const layer = $('layer'), layer2 = $('layer2');
function closeEditor() { layer.innerHTML = ''; editing = null; document.body.classList.remove('editing'); }
function closeLayer() { const id = editing && editing.split('#').pop(); closeEditor(); render(); const again = id && document.querySelector(`.item[data-id="${id}"] [data-open]`); if (again) again.focus({ preventScroll: true }); }
function closeTop() { layer2.innerHTML = ''; imp = null; }
function closeAll(quiet) { closeTop(); closeEditor(); if (!quiet) render(); }
function redrawEditor(focusFirst) { const r = editing && resolve(editing); if (!r) return closeLayer();
  const def = r.def, list = r.list, it = r.data, i = list.indexOf(it), imgK = def.view === 'image' ? (def.img || 'image') : null, im = imgK && it[imgK], t = { mode: 'replace', path: editing, k: imgK };
  const keepScroll = layer.querySelector('.sheet-body') ? layer.querySelector('.sheet-body').scrollTop : 0;
  layer.innerHTML = `<div class="scrim side" id="scrim"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="ed-title">
    <div class="sheet-head"><h2 id="ed-title">${esc(nameOf(it, def))}</h2><button class="iconbtn" id="ed-close" aria-label="Close">${I.x}</button></div><div class="sheet-body">
    ${imgK ? `<div class="preview" ${drop(t)}><img src="${full(im)}" alt=""><div class="meta"><span>${esc(fileName(im))}<br>${metaLine(im)}</span><button class="btn small line" data-pick="${esc(JSON.stringify(t))}">Replace</button></div></div>` : ''}
    ${def.fields.map(f => fieldHTML(f, it, editing, imgK)).join('')}
    ${list.length > 1 ? `<div class="field"><div class="lab"><label class="mono" for="ed-pos">Position in ${esc(def.label)}</label></div><div class="posrow"><button class="btn small line" data-pos="first" ${i === 0 ? 'disabled' : ''}>First</button><input type="number" id="ed-pos" inputmode="numeric" min="1" max="${list.length}" value="${i + 1}"><span class="hint">of ${list.length}</span><button class="btn small line" data-pos="last" ${i === list.length - 1 ? 'disabled' : ''}>Last</button></div></div>` : ''}
    </div><div class="sheet-foot"><button class="btn small danger" id="ed-remove" ${def.fixed || list.length <= (def.min || 0) ? 'disabled' : ''}>Remove</button>${def.min && list.length <= def.min ? `<span class="fine">Needs at least ${def.min}.</span>` : ''}<button class="btn small primary" id="ed-done">Done</button></div></div></div>`;
  document.body.classList.add('editing'); growAll(layer); layer.querySelector('.sheet-body').scrollTop = keepScroll;
  if (focusFirst) { const f = layer.querySelector('.field.bad input, .field.bad textarea, .field.bad select') || (innerWidth >= 900 && layer.querySelector('input[type=text]:not([data-chipin]), textarea, select')); (f || $('ed-close')).focus({ preventScroll: true }); } bar(); }
function openEditor(path) { editing = path; redrawEditor(true); markEditing(true); }
function markEditing(scroll) { document.querySelectorAll('#main .item.editing').forEach(x => x.classList.remove('editing')); const el = editing && document.querySelector(`#main .item[data-id="${editing.split('#').pop()}"]`); if (!el) return; el.classList.add('editing'); if (scroll && innerWidth >= 900) el.scrollIntoView({ block: 'nearest' }); }
function moveTo(n) { const r = resolve(editing), list = r.list, i = list.indexOf(r.data), j = Math.max(0, Math.min(list.length - 1, n)); if (i === j) return; snap(); list.splice(j, 0, list.splice(i, 1)[0]); const y = scrollY; render(); scrollTo(0, y); redrawEditor(); markEditing(true); }
function removeItem(path) { const r = resolve(path), nm = nameOf(r.data, r.def); snap(); r.list.splice(r.list.indexOf(r.data), 1); closeEditor(); render(); toast(`Removed “${nm}”`, true); }
function addTo(lp, atStart) { const r = resolve(lp), def = r.def;
  if (def.max && r.data.length >= def.max) return toast(`${def.label} is full. Remove one first.`);
  if (def.add === 'images') return openImport({ mode: 'add', list: lp }, null, atStart ? 'start' : 'end');
  const it = { ...clone(typeof def.blank === 'function' ? def.blank() : def.blank), _id: 'i' + (++uid) };
  tag(itemNode(def, it), it); snap(); if (atStart) r.data.unshift(it); else r.data.push(it); closeTop();
  if (def.node) go(`${lp}/#${it._id}`); else { render(); openEditor(`${lp}/#${it._id}`); const el = document.querySelector(`.item[data-id="${it._id}"]`); if (el) el.scrollIntoView({ block: 'center' }); } }
function shared(b) {
  if (b.dataset.pick) { openImport(JSON.parse(b.dataset.pick)); return true; }
  if (b.dataset.sug !== undefined) { const box = b.closest('.chips'), it = sug && sug.items[+b.dataset.sug]; if (it) { sug = null; addChip(box, it.v); const i = box.isConnected ? null : $(fid(box.dataset.path, box.dataset.k)); if (i) i.focus({ preventScroll: true }); } return true; }
  if (b.dataset.chipadd !== undefined) { addChip(b.closest('.chips')); return true; }
  if (b.dataset.chip !== undefined) { const box = b.closest('.chips'), x = fieldAt(box.dataset.path, box.dataset.k); snap(); x.it[x.f.k].splice(+b.dataset.chip, 1); redrawField(box.dataset.path, box.dataset.k); return true; }
  return false; }
$('main').addEventListener('click', e => { const t = e.target, b = t.closest('button'); if (!b) return;
  if (b.dataset.add) return addTo(b.dataset.add, b.dataset.start !== undefined);
  if (b.dataset.go) return go(b.dataset.go, true);
  if (b.dataset.jump) { const el = $(b.dataset.jump); return el && el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }
  if (shared(b)) return;
  if (b.id === 'reset') { snap(); cur = clone(orig); closeAll(true); render(); return toast('Back to the original content', true); }
  if (b.dataset.open !== undefined) { const p = b.closest('.item').dataset.path, def = resolve(p).def; return def.node ? go(p) : openEditor(p); } });
layer.addEventListener('change', e => { if (e.target.id === 'ed-pos') moveTo((+e.target.value || 1) - 1); });
document.addEventListener('change', e => { const el = e.target; if (el.tagName !== 'SELECT') return; if (el.dataset.chipsel !== undefined) { if (el.value) addChip(el.closest('.field').querySelector('.chips'), el.value); } else if (el.dataset.path) check(el); });
